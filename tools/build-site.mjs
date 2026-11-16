#!/usr/bin/env node
/**
 * サイト HTML の書き出し（コマンドライン版） / Export a site as one HTML file (command-line version)
 *
 * 表示の言語は、環境変数 MDFOLIO_LANG（ja / en）、LC_ALL・LC_MESSAGES・LANG、OS の言語設定の順で決める。
 * The language of the messages follows MDFOLIO_LANG (ja / en), LC_ALL, LC_MESSAGES, LANG, then the OS.
 * 英語の使い方は --help で表示される / Run with --help for usage in English.
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

/** 表示の言語（tools/folder/update.mjs の detectLang と同じ決め方。SPEC FD-10） */
function detectLang(env = process.env) {
  const pick = [env.MDFOLIO_LANG, env.LC_ALL, env.LC_MESSAGES, env.LANG].find((v) => v && v !== '');
  const value = pick || (() => { try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch (e) { return ''; } })();
  return /^ja/i.test(String(value)) ? 'ja' : 'en';
}
const LANG = detectLang();
const MESSAGES = {
  ja: {
    error: 'エラー: ', needsValue: '{0} には値が必要です', unknownOption: '不明なオプション: {0}',
    oneFolder: '文書フォルダは 1 つだけ指定してください', noFolder: '文書フォルダを指定してください（--help で使い方を表示）',
    badLang: '--lang は auto / ja / en のいずれかです', badTheme: '--theme は auto / light / dark のいずれかです',
    bothImages: '--allow-external-images と --lock-external-images は同時に指定できません',
    noViewer: 'ビューアが見つかりません: {0}（先に node tools/build.mjs を実行してください）',
    notViewer: 'mdfolio のビューアではありません: {0}', viewerLoad: 'ビューアのスクリプトを読み込めませんでした',
    folderMissing: 'フォルダが見つかりません: {0}',
    truncated: 'ファイルとフォルダが {0} 件を超えたため、途中で打ち切りました',
    tooManyDocs: '文書が {0} 件を超えたため、超えた分は含めません',
    noDocs: 'Markdown 文書が見つかりませんでした: {0}', bigAssets: '20MB を超える添付 {0} 件は含めません',
    homeMissing: '--home の文書が見つかりません: {0}',
    wrote: '{0} を書き出しました', counts: '  文書 {0} 件、添付 {1} 件、{2}', home: '  ホーム: {0}',
    libs: '  数式ライブラリ: {0}、図のライブラリ: {1}', included: '含む', excluded: '除外',
    note: '  注意: ', tooBig: 'ファイルサイズが 100MB を超えています'
  },
  en: {
    error: 'Error: ', needsValue: '{0} requires a value', unknownOption: 'Unknown option: {0}',
    oneFolder: 'Specify only one document folder', noFolder: 'Specify a document folder (see --help for usage)',
    badLang: '--lang must be auto, ja or en', badTheme: '--theme must be auto, light or dark',
    bothImages: '--allow-external-images and --lock-external-images cannot be used together',
    noViewer: 'Viewer not found: {0} (run node tools/build.mjs first)',
    notViewer: 'Not an mdfolio viewer: {0}', viewerLoad: "Could not load the viewer's scripts",
    folderMissing: 'Folder not found: {0}',
    truncated: 'Stopped scanning because the number of files and folders exceeds {0}',
    tooManyDocs: 'Only the first {0} documents are included; the rest are skipped',
    noDocs: 'No Markdown documents found in {0}', bigAssets: '{0} attachment(s) larger than 20 MB are left out',
    homeMissing: 'The document given with --home was not found: {0}',
    wrote: 'Wrote {0}', counts: '  {0} document(s), {1} attachment(s), {2}', home: '  Home: {0}',
    libs: '  Math library: {0}, diagram library: {1}', included: 'included', excluded: 'left out',
    note: '  Note: ', tooBig: 'The file is larger than 100 MB'
  }
};
const t = (key, ...args) => MESSAGES[LANG][key].replace(/\{(\d)\}/g, (m, i) => String(args[Number(i)]));
const HELP_EN = `Export a site as one HTML file (command-line version)

  node tools/build-site.mjs <document folder> [options]

  --out <file>                 Output file (default: <folder name>.html)
  --title <title>              Site title (default: the folder name)
  --home <path>                First document to show (default: README.md → index.md → the first document)
  --viewer <file>              Path to the viewer HTML file to use (default: dist/mdfolio.html)
  --lang <auto|ja|en>          Default interface language
  --theme <auto|light|dark>    Default theme
  --allow-external-images      Show external images from the start
  --lock-external-images       Never load external images (users cannot change this)
  --no-downloads               Hide actions that save files (for environments where saving files is not possible)

It produces the same result as "Export as site" in the app, using the scripts inside the viewer HTML
(parsing documents, resolving links, assembling the HTML). It needs only Node.js, with no extra packages.
You can set the message language with the MDFOLIO_LANG environment variable (ja / en).
`;

function fail(message) {
  console.error(t('error') + message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { dir: null, out: null, title: null, home: '', viewer: path.join(ROOT, 'dist/mdfolio.html'), lang: 'auto', theme: 'auto', allowExternalImages: false, allowDownloads: true, lockExternalImages: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) fail(t('needsValue', a));
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
    else if (a === '--help' || a === '-h') { console.log(LANG === 'en' ? HELP_EN : fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, '').replace(/^[\s\S]*?\n\n(?=  node tools)/, 'サイト HTML の書き出し（コマンドライン版）\n\n')); process.exit(0); }
    else if (a.startsWith('-')) fail(t('unknownOption', a));
    else if (args.dir === null) args.dir = a;
    else fail(t('oneFolder'));
  }
  if (!args.dir) fail(t('noFolder'));
  if (!['auto', 'ja', 'en'].includes(args.lang)) fail(t('badLang'));
  if (!['auto', 'light', 'dark'].includes(args.theme)) fail(t('badTheme'));
  if (args.allowExternalImages && args.lockExternalImages) fail(t('bothImages'));
  return args;
}

/** ビューアの HTML からスクリプトを取り出して評価し、core / md を得る。 */
function loadViewer(viewerPath) {
  if (!fs.existsSync(viewerPath)) fail(t('noViewer', viewerPath));
  const html = fs.readFileSync(viewerPath, 'utf8');
  const context = vm.createContext({ console, TextDecoder, TextEncoder, atob, btoa, setTimeout, clearTimeout });
  const scripts = [...html.matchAll(/<script id="(mdv-js-[a-z0-9-]+)">([\s\S]*?)<\/script>/g)];
  if (!scripts.length) fail(t('notViewer', viewerPath));
  for (const m of scripts) vm.runInContext(m[2], context, { filename: m[1] });
  const MDV = context.MDV;
  if (!MDV || !MDV.core || !MDV.md) fail(t('viewerLoad'));
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
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail(t('folderMissing', dir));

const { html, core, md } = loadViewer(path.resolve(args.viewer));
const parts = core.extractParts(html);
const warnings = [];

// 文書と添付を分ける
const scan = walk(core, dir);
if (scan.truncated) warnings.push(t('truncated', core.LIMITS.maxEntries));
const diskPath = new Map(); // 正規化したパス → 実際のパス
const entries = [];
let docCount = 0;
for (const rel of scan.files) {
  const p = core.normalizePath(rel);
  if (!p || core.isIgnoredPath(p)) continue;
  const kind = core.isDocPath(p) ? 'doc' : 'asset';
  if (kind === 'doc') {
    if (docCount >= core.LIMITS.maxDocs) { if (docCount === core.LIMITS.maxDocs) warnings.push(t('tooManyDocs', core.LIMITS.maxDocs)); docCount++; continue; }
    docCount++;
  }
  diskPath.set(p, path.join(dir, rel));
  entries.push({ path: p, kind });
}
const index = core.createIndex(entries);
const docPaths = core.flattenTree(core.buildTree(entries.filter((e) => e.kind === 'doc').map((e) => e.path)));
if (!docPaths.length) fail(t('noDocs', dir));

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
if (skipped) warnings.push(t('bigAssets', skipped));

// ホーム文書
const name = path.basename(dir);
const title = args.title || name;
let home = '';
if (args.home) {
  const found = core.lookupPath(index, core.normalizePath(args.home));
  if (!found || found.kind !== 'doc') fail(t('homeMissing', args.home));
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
console.log(t('wrote', outPath));
console.log(t('counts', docPaths.length, assetCount, core.formatBytes(bytes)));
console.log(t('home', home));
console.log(t('libs', t(hasMath ? 'included' : 'excluded'), t(hasMermaid ? 'included' : 'excluded')));
for (const w of warnings) console.log(t('note') + w);
if (bytes > core.LIMITS.warnTotalBytes) console.log(t('note') + t('tooBig'));
