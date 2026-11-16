#!/usr/bin/env node
/**
 * ビルド: src/ と vendor/ から dist/mdfolio.html を生成する。
 * Node.js の標準機能だけで動く（npm パッケージは不要）。
 *
 *   node tools/build.mjs [--out dist/mdfolio.html] [--without mermaid,katex]
 *
 * 仕様 8.5 の手順:
 *   1. 部品（CSS・スクリプト・リソース）を組み立てる
 *   2. インラインスクリプト中の <!-- / <script / </script を、意味を変えないエスケープに置換する
 *   3. 各スクリプトの SHA-256 を CSP に埋め込む
 *   4. 出力を検証する
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const core = require(path.join(ROOT, 'src/core.js'));

const MAX_BYTES = 6 * 1024 * 1024; // NFR-3

function fail(message) {
  console.error('ビルド失敗: ' + message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { out: 'dist/mdfolio.html', without: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--without') args.without = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else fail('不明な引数: ' + a);
  }
  for (const w of args.without) if (w !== 'mermaid' && w !== 'katex') fail('--without に指定できるのは mermaid, katex です');
  return args;
}

const args = parseArgs(process.argv.slice(2));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha256Base64 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('base64');
const sha256Hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------- 検証（入力）

const pkg = JSON.parse(read('package.json'));
if (pkg.version !== core.VERSION) fail(`package.json の version (${pkg.version}) と src/core.js の VERSION (${core.VERSION}) が一致しません`);

const manifest = JSON.parse(read('vendor/manifest.json'));
const vendorFiles = new Map();
for (const c of manifest.components) {
  for (const f of c.files) {
    const abs = path.join(ROOT, 'vendor', f.path);
    if (!fs.existsSync(abs)) fail(`vendor/${f.path} がありません`);
    if (sha256Hex(fs.readFileSync(abs)) !== f.sha256) fail(`vendor/${f.path} の内容が manifest.json の SHA-256 と一致しません`);
    vendorFiles.set(f.path, c);
  }
}

/** 自作ソースに、不可視文字や制御文字が紛れ込んでいないことを確かめる。 */
function assertCleanSource(name, text) {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const bad = (c < 0x20 && c !== 0x0A && c !== 0x09) || c === 0x7F || c === 0xA0 || c === 0x2028 || c === 0x2029 ||
      c === 0xFEFF || (c >= 0x200B && c <= 0x200D) || c === 0x2060;
    if (bad) {
      const line = text.slice(0, i).split('\n').length;
      fail(`${name}:${line} に不可視文字 U+${c.toString(16).toUpperCase().padStart(4, '0')} があります`);
    }
  }
}

// ---------------------------------------------------------------- インラインスクリプト

const stats = [];

/**
 * 通常のインラインスクリプトとして HTML に埋め込める形にする。
 * - 末尾の sourceMappingURL コメントを除く
 * - <!-- / <script / </script の < を \x3c に置換する（文字列・正規表現の中では同じ意味になる）
 * - 置換後に構文チェックを行う（演算子として現れていた場合はここで失敗する）
 */
function forInline(name, text) {
  let s = text.replace(/\r\n?/g, '\n');
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  s = s.replace(/\n?\/\/# sourceMappingURL=[^\n]*\s*$/, '\n');
  let count = 0;
  s = s.replace(/(\\*)<(?=!--|\/?script)/gi, (m, bs) => {
    count++;
    return (bs.length % 2 === 1 ? bs.slice(0, -1) : bs) + '\\x3c';
  });
  try {
    new vm.Script(s, { filename: name });
  } catch (e) {
    fail(`${name}: エスケープ後の構文チェックに失敗しました: ${e.message}`);
  }
  if (/<\/script/i.test(s) || s.includes('<!--')) fail(`${name}: 埋め込めない文字列が残っています`);
  stats.push({ name, bytes: Buffer.byteLength(s), escapes: count });
  return s.endsWith('\n') ? s : s + '\n';
}

const hljsExtra = (manifest.hljsExtraLanguages || []).map((l) => `highlightjs/languages/${l}.min.js`);
const vendorOrder = [
  'markdown-it/markdown-it.umd.min.js',
  'markdown-it-footnote/markdown-it-footnote.min.js',
  'dompurify/purify.min.js',
  'highlightjs/highlight.min.js',
  ...hljsExtra
];
for (const f of vendorOrder) if (!vendorFiles.has(f)) fail(`vendor/manifest.json に ${f} がありません`);

const vendorJs = vendorOrder.map((f) => forInline('vendor/' + f, read('vendor/' + f))).join(';\n');

const appSources = ['src/core.js', 'src/md.js', 'src/i18n.js', 'src/app.js'];
const appJs = appSources.map((f) => {
  const text = read(f);
  assertCleanSource(f, text);
  return forInline(f, text);
}).join(';\n');

// ---------------------------------------------------------------- 遅延読み込みライブラリ・リソース

const useKatex = !args.without.includes('katex');
const useMermaid = !args.without.includes('mermaid');

const katexJs = useKatex ? read('vendor/katex/katex.min.js') : null;
const mermaidJs = useMermaid ? read('vendor/mermaid/mermaid.tiny.js') : null;

/** KaTeX の CSS が参照するフォント（woff2）を data: URI として埋め込む。 */
function inlineKatexCss() {
  let css = read('vendor/katex/katex.min.css');
  let fonts = 0;
  css = css.replace(/src:url\(fonts\/([A-Za-z0-9_-]+)\.woff2\) format\("woff2"\),url\(fonts\/[A-Za-z0-9_-]+\.woff\) format\("woff"\),url\(fonts\/[A-Za-z0-9_-]+\.ttf\) format\("truetype"\)/g, (m, name) => {
    const file = path.join(ROOT, 'vendor/katex/fonts', name + '.woff2');
    if (!fs.existsSync(file)) fail(`KaTeX のフォントがありません: ${name}.woff2`);
    fonts++;
    return `src:url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format("woff2")`;
  });
  if (!fonts || /url\((?!data:)/.test(css)) fail('KaTeX の CSS に、埋め込めていない url() が残っています');
  return css;
}

// 画面の部品（app.css）のあとに、本文と配色（document.css）を置く。フォルダ版と同じ順序
const cssParts = ['src/app.css', 'src/document.css'].map((f) => {
  const text = read(f).replace(/\r\n?/g, '\n');
  assertCleanSource(f, text);
  return text.endsWith('\n') ? text : text + '\n';
});
const css = cssParts.join('\n');

const helpJa = read('src/help.ja.md').replace(/\r\n?/g, '\n');
const helpEn = read('src/help.en.md').replace(/\r\n?/g, '\n');
const licenses = [
  `${core.NAME} ${core.VERSION}`,
  '='.repeat(78),
  '',
  read('LICENSE').replace(/\r\n?/g, '\n').trim(),
  '',
  '',
  read('THIRD-PARTY-NOTICES.txt').replace(/\r\n?/g, '\n').trim(),
  ''
].join('\n');

// ---------------------------------------------------------------- CSP

const scriptHashes = [
  { id: 'mdv-js-vendor', hash: sha256Base64(vendorJs) },
  { id: 'mdv-js-app', hash: sha256Base64(appJs) }
];
if (useKatex) scriptHashes.push({ id: 'mdv-lib-katex', hash: sha256Base64(katexJs) });
if (useMermaid) scriptHashes.push({ id: 'mdv-lib-mermaid', hash: sha256Base64(mermaidJs) });

const csp = [
  "default-src 'none'",
  'script-src ' + scriptHashes.map((h) => `'sha256-${h.hash}'`).join(' '),
  "style-src 'unsafe-inline'",
  'img-src data: blob: http: https:',
  'media-src data: blob: http: https:',
  'font-src data:',
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "form-action 'none'",
  "base-uri 'none'"
].join('; ');

// ---------------------------------------------------------------- 組み立て

const JSON_TYPE = 'application/json';
const blocks = [
  { id: 'mdv-config', type: JSON_TYPE, text: core.jsonForScript(core.DEFAULT_CONFIG) },
  { id: 'mdv-site', type: JSON_TYPE, text: 'null' },
  { id: 'mdv-res-help-ja', type: JSON_TYPE, text: core.jsonForScript(helpJa) },
  { id: 'mdv-res-help-en', type: JSON_TYPE, text: core.jsonForScript(helpEn) },
  { id: 'mdv-res-licenses', type: JSON_TYPE, text: core.jsonForScript(licenses) }
];
if (useKatex) {
  blocks.push({ id: 'mdv-res-katex-css', type: JSON_TYPE, text: core.jsonForScript(inlineKatexCss()) });
  blocks.push({ id: 'mdv-lib-katex', type: JSON_TYPE, text: core.jsonForScript(katexJs) });
}
if (useMermaid) blocks.push({ id: 'mdv-lib-mermaid', type: JSON_TYPE, text: core.jsonForScript(mermaidJs) });
blocks.push({ id: 'mdv-js-vendor', type: '', text: vendorJs });
blocks.push({ id: 'mdv-js-app', type: '', text: appJs });

const parts = { lang: 'ja', title: core.NAME, csp, generator: `${core.NAME} ${core.VERSION}`, css, blocks };
const html = core.composeHtml(parts);

// ---------------------------------------------------------------- 検証（出力）

if (html.includes('\r')) fail('出力に CR が含まれています（改行は LF のみ）');
const back = core.extractParts(html);
if (core.composeHtml(back) !== html) fail('分解 → 再組み立ての結果が一致しません');
for (const h of scriptHashes) {
  const b = core.findBlock(back, h.id);
  if (!b) fail(`ブロック ${h.id} がありません`);
  const actual = b.type === JSON_TYPE ? sha256Base64(JSON.parse(b.text)) : sha256Base64(b.text);
  if (actual !== h.hash) fail(`ブロック ${h.id} のハッシュが CSP と一致しません`);
  if (!back.csp.includes(`'sha256-${h.hash}'`)) fail(`CSP に ${h.id} のハッシュがありません`);
}
// 遅延ライブラリのハッシュは、vendor/ の配布ファイルそのものの SHA-256 と一致する
for (const [id, file] of [['mdv-lib-katex', 'vendor/katex/katex.min.js'], ['mdv-lib-mermaid', 'vendor/mermaid/mermaid.tiny.js']]) {
  const h = scriptHashes.find((x) => x.id === id);
  if (!h) continue;
  const raw = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('base64');
  if (raw !== h.hash) fail(`${id} のハッシュが ${file} の SHA-256 と一致しません`);
}
const bytes = Buffer.byteLength(html);
if (bytes > MAX_BYTES) fail(`出力が ${MAX_BYTES} バイトを超えています（${bytes} バイト）`);

// ---------------------------------------------------------------- 書き出し

const outPath = path.resolve(ROOT, args.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);

const buildManifest = {
  name: core.NAME,
  version: core.VERSION,
  file: path.basename(outPath),
  bytes,
  sha256: sha256Hex(Buffer.from(html, 'utf8')),
  without: args.without,
  csp,
  blocks: back.blocks.map((b) => ({ id: b.id, type: b.type || 'text/javascript', bytes: Buffer.byteLength(b.text) })),
  scripts: scriptHashes.map((h) => ({ id: h.id, sha256Base64: h.hash })),
  inlineSources: stats,
  vendor: manifest.components.map((c) => ({ package: c.package, version: c.version, license: c.license }))
};
fs.writeFileSync(outPath.replace(/\.html$/, '') + '.manifest.json', JSON.stringify(buildManifest, null, 2) + '\n');

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log(`${path.relative(ROOT, outPath)} を生成しました: ${mb(bytes)}（${bytes} バイト）`);
for (const b of buildManifest.blocks) console.log(`  ${b.id.padEnd(20)} ${String(b.bytes).padStart(9)} バイト`);
console.log(`  CSS                  ${String(Buffer.byteLength(css)).padStart(9)} バイト`);
