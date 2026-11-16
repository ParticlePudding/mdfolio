#!/usr/bin/env node
/**
 * サイト HTML の書き出し（コマンドライン版）
 *
 *   node tools/build-site.mjs <文書フォルダ> [オプション]
 *
 *   --out <ファイル>             出力先（既定: <フォルダ名>.html）
 *   --title <タイトル>           サイトのタイトル（既定: フォルダ名）
 *   --home <パス>                最初に表示する文書（既定: README.md → index.md → 先頭の文書）
 *   --viewer <ファイル>          もとにするビューア（既定: dist/mdfolio.html）
 *   --lang <auto|ja|en>          画面の言語の既定
 *   --theme <auto|light|dark>    テーマの既定
 *   --allow-external-images      外部の画像を最初から表示する
 *   --lock-external-images       外部の画像を常に読み込まない（利用者が切り替えられないようにする）
 *   --no-downloads               ファイルの保存を伴う操作を出さない（保存できない環境に置く場合）
 *
 * アプリ内の「サイトとして書き出す」と同じ結果になるよう、ビューアの HTML に入っているスクリプト
 *（文書の解析・リンクの解決・HTML の組み立て）をそのまま使う。Node.js の標準機能だけで動く。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error('エラー: ' + message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { dir: null, out: null, title: null, home: '', viewer: path.join(ROOT, 'dist/mdfolio.html'), lang: 'auto', theme: 'auto', allowExternalImages: false, allowDownloads: true, lockExternalImages: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) fail(`${a} には値が必要です`);
      return argv[++i];
    };
    if (a === '--out' || a === '-o') args.out = next();
    else if (a === '--title') args.title = next();
    else if (a === '--home') args.home = next();
    else if (a === '--viewer') args.viewer = next();
    else if (a === '--lang') args.lang = next();
    else if (a === '--theme') args.theme = next();
    else if (a === '--allow-external-images') args.allowExternalImages = true;
    else if (a === '--lock-external-images') args.lockExternalImages = true;
    else if (a === '--no-downloads') args.allowDownloads = false;
    else if (a === '--help' || a === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, '')); process.exit(0); }
    else if (a.startsWith('-')) fail('不明なオプション: ' + a);
    else if (args.dir === null) args.dir = a;
    else fail('文書フォルダは 1 つだけ指定してください');
  }
  if (!args.dir) fail('文書フォルダを指定してください（--help で使い方を表示）');
  if (!['auto', 'ja', 'en'].includes(args.lang)) fail('--lang は auto / ja / en のいずれかです');
  if (!['auto', 'light', 'dark'].includes(args.theme)) fail('--theme は auto / light / dark のいずれかです');
  if (args.allowExternalImages && args.lockExternalImages) fail('--allow-external-images と --lock-external-images は同時に指定できません');
  return args;
}

/** ビューアの HTML からスクリプトを取り出して評価し、core / md を得る。 */
function loadViewer(viewerPath) {
  if (!fs.existsSync(viewerPath)) fail(`ビューアが見つかりません: ${viewerPath}（先に node tools/build.mjs を実行してください）`);
  const html = fs.readFileSync(viewerPath, 'utf8');
  const context = vm.createContext({ console, TextDecoder, TextEncoder, atob, btoa, setTimeout, clearTimeout });
  const scripts = [...html.matchAll(/<script id="(mdv-js-[a-z0-9-]+)">([\s\S]*?)<\/script>/g)];
  if (!scripts.length) fail('mdfolio のビューアではありません: ' + viewerPath);
  for (const m of scripts) vm.runInContext(m[2], context, { filename: m[1] });
  const MDV = context.MDV;
  if (!MDV || !MDV.core || !MDV.md) fail('ビューアのスクリプトを読み込めませんでした');
  return { html, core: MDV.core, md: MDV.md };
}

/** フォルダを走査して、ルートからの相対パス（/ 区切り）の一覧を返す。 */
function walk(core, rootDir) {
  const out = [];
  let count = 0;
  let truncated = false;
  const queue = [''];
  while (queue.length && !truncated) {
    const rel = queue.shift();
    const entries = fs.readdirSync(path.join(rootDir, rel), { withFileTypes: true });
    for (const e of entries) {
      if (core.isIgnoredName(e.name)) continue;
      if (++count > core.LIMITS.maxEntries) { truncated = true; break; }
      const p = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) queue.push(p);
      else if (e.isFile()) out.push(p);
    }
  }
  return { files: out, truncated };
}

const args = parseArgs(process.argv.slice(2));
const dir = path.resolve(args.dir);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail('フォルダが見つかりません: ' + dir);

const { html, core, md } = loadViewer(path.resolve(args.viewer));
const parts = core.extractParts(html);
const warnings = [];

// 文書と添付を分ける
const scan = walk(core, dir);
if (scan.truncated) warnings.push(`ファイルとフォルダが ${core.LIMITS.maxEntries} 件を超えたため、途中で打ち切りました`);
const diskPath = new Map(); // 正規化したパス → 実際のパス
const entries = [];
let docCount = 0;
for (const rel of scan.files) {
  const p = core.normalizePath(rel);
  if (!p || core.isIgnoredPath(p)) continue;
  const kind = core.isDocPath(p) ? 'doc' : 'asset';
  if (kind === 'doc') {
    if (docCount >= core.LIMITS.maxDocs) { if (docCount === core.LIMITS.maxDocs) warnings.push(`文書が ${core.LIMITS.maxDocs} 件を超えたため、超えた分は含めません`); docCount++; continue; }
    docCount++;
  }
  diskPath.set(p, path.join(dir, rel));
  entries.push({ path: p, kind });
}
const index = core.createIndex(entries);
const docPaths = core.flattenTree(core.buildTree(entries.filter((e) => e.kind === 'doc').map((e) => e.path)));
if (!docPaths.length) fail('Markdown 文書が見つかりませんでした: ' + dir);

// 文書を読み、参照されている添付を集める
const renderer = md.createRenderer({});
const files = [];
const refs = [];
const refSet = new Set();
let hasMath = false;
let hasMermaid = false;
for (const p of docPaths) {
  const abs = diskPath.get(p);
  const stat = fs.statSync(abs);
  const text = core.detectAndDecode(fs.readFileSync(abs)).text;
  files.push({ path: p, kind: 'doc', text, mtime: Math.floor(stat.mtimeMs) });
  if (stat.size > core.LIMITS.maxDocBytes) continue; // ビューアではプレーンテキスト表示になる
  const r = renderer.collectRefs(core.parseFrontMatter(text).body);
  if (r.hasMath) hasMath = true;
  if (r.hasMermaid) hasMermaid = true;
  for (const href of Array.from(r.links).concat(Array.from(r.images))) {
    const res = core.resolveLink(index, p, href);
    if (res.type === 'asset' && !refSet.has(res.path)) { refSet.add(res.path); refs.push(res.path); }
  }
}
let skipped = 0;
let assetCount = 0;
for (const p of refs) {
  const abs = diskPath.get(p);
  const stat = fs.statSync(abs);
  if (stat.size > core.LIMITS.maxAssetBytes) { skipped++; continue; }
  files.push({ path: p, kind: 'asset', mime: core.mimeOf(p), base64: fs.readFileSync(abs).toString('base64'), mtime: Math.floor(stat.mtimeMs) });
  assetCount++;
}
if (skipped) warnings.push(`20MB を超える添付 ${skipped} 件は含めません`);

// ホーム文書
const name = path.basename(dir);
const title = args.title || name;
let home = '';
if (args.home) {
  const found = core.lookupPath(index, core.normalizePath(args.home));
  if (!found || found.kind !== 'doc') fail('--home の文書が見つかりません: ' + args.home);
  home = found.path;
} else {
  home = core.pickHome(index, docPaths, '');
}

const dropLibs = [];
if (!hasMath) dropLibs.push('katex');
if (!hasMermaid) dropLibs.push('mermaid');

const siteData = core.buildSiteData(name, files);
const config = { title, lang: args.lang, theme: args.theme, home, allowExternalImages: args.allowExternalImages, allowDownloads: args.allowDownloads, lockExternalImages: args.lockExternalImages };
const outParts = core.applySite(parts, { config, siteData, title, dropLibs });
if (args.lang !== 'auto') outParts.lang = args.lang;
const outHtml = core.composeHtml(outParts);

const outPath = path.resolve(args.out || core.sanitizeFileName(title, 'site') + '.html');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, outHtml);

const bytes = Buffer.byteLength(outHtml);
console.log(`${outPath} を書き出しました`);
console.log(`  文書 ${docPaths.length} 件、添付 ${assetCount} 件、${core.formatBytes(bytes)}`);
console.log(`  ホーム: ${home}`);
console.log(`  数式ライブラリ: ${hasMath ? '含む' : '除外'}、図のライブラリ: ${hasMermaid ? '含む' : '除外'}`);
for (const w of warnings) console.log('  注意: ' + w);
if (bytes > core.LIMITS.warnTotalBytes) console.log('  注意: ファイルサイズが 100MB を超えています');
