#!/usr/bin/env node
/**
 * mdfolio フォルダ版の更新コマンド / Update command for the mdfolio folder version
 *
 *   node tools/update.mjs --help    使い方 / Usage
 *
 * 表示の言語は、環境変数 MDFOLIO_LANG（ja / en）、LC_ALL・LC_MESSAGES・LANG、OS の言語設定の順で決めます。
 * The language of the messages is taken from MDFOLIO_LANG (ja / en), then LC_ALL, LC_MESSAGES and LANG,
 * then the OS language setting.
 *
 * 以下は日本語の使い方です（英語は --help で表示されます）。
 *
 *   node tools/update.mjs [オプション]
 *
 *   --docs <フォルダ>    文書フォルダ（既定: このフォルダの docs）
 *   --title <タイトル>   画面に表示するタイトル（既定: 前回の指定。なければ index.html の設定か、フォルダ名）
 *                        "" を指定すると、前回の指定を消します。
 *   --home <パス>        最初に表示する文書（既定: 前回の指定。なければ README.md → index.md → 先頭の文書）
 *
 * 次の 2 つのファイルを作り直します。
 *   data/site.js     文書フォルダの内容（Markdown と、文書から参照されている画像などの添付）
 *   data/styles.js   style/ の CSS の写し（「サイトとして書き出す」で使う）
 *
 * ブラウザーは file:// で開いたページから隣のファイルを読めないため、文書を足したり変えたりしたとき、
 * CSS を変えたときは、このコマンドを実行してからページを再読み込みしてください。
 * Node.js の標準機能だけで動きます。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 表示の言語（SPEC FD-10）: MDFOLIO_LANG → LC_ALL → LC_MESSAGES → LANG → OS の設定。ja で始まれば日本語。 */
export function detectLang(env = process.env) {
  const pick = [env.MDFOLIO_LANG, env.LC_ALL, env.LC_MESSAGES, env.LANG].find((v) => v && v !== '');
  const value = pick || (() => { try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch (e) { return ''; } })();
  return /^ja/i.test(String(value)) ? 'ja' : 'en';
}
const LANG = detectLang();

const MESSAGES = {
  ja: {
    error: 'エラー: ', needsValue: '{0} には値が必要です', unknownOption: '不明なオプション: {0}',
    libMissing: 'lib/{0} が見つかりません。mdfolio のフォルダの中の tools/update.mjs を実行してください',
    libLoad: 'lib/ のスクリプトを読み込めませんでした',
    truncated: 'ファイルとフォルダが {0} 件を超えたため、途中で打ち切りました',
    tooManyDocs: '文書が {0} 件を超えたため、超えた分は含めません',
    bigAssets: '20MB を超える添付 {0} 件は含めません',
    homeMissing: '--home の文書が見つかりません: {0}',
    cssMissing: 'style/{0}.css が見つかりません',
    cssStyleTag: 'style/{0}.css に "</style" という文字列があるため、書き出しに使えません',
    notFolder: '文書フォルダではありません: {0}',
    prevHomeGone: '前回指定したホーム（{0}）が見つからないため、自動で選びました',
    docsMissing: '文書フォルダが見つかりません: {0}',
    done: 'data/site.js と data/styles.js を作り直しました',
    counts: '  文書 {0} 件、添付 {1} 件（{2}）', home: '  ホーム: {0}',
    noDocs: '  文書はありません（開始画面を表示します）', note: '  注意: ', reload: 'ブラウザーで index.html を開き直す（再読み込みする）と反映されます。'
  },
  en: {
    error: 'Error: ', needsValue: '{0} needs a value', unknownOption: 'Unknown option: {0}',
    libMissing: 'lib/{0} was not found. Run the copy of tools/update.mjs that is inside the mdfolio folder',
    libLoad: 'Could not load the scripts in lib/',
    truncated: 'Stopped partway because there are more than {0} files and folders',
    tooManyDocs: 'Documents beyond the first {0} are left out',
    bigAssets: '{0} attachment(s) larger than 20 MB are left out',
    homeMissing: 'The document given with --home was not found: {0}',
    cssMissing: 'style/{0}.css was not found',
    cssStyleTag: 'style/{0}.css contains the text "</style", so it cannot be used for export',
    notFolder: 'Not a document folder: {0}',
    prevHomeGone: 'The home document set last time ({0}) was not found, so one was chosen automatically',
    docsMissing: 'The document folder was not found: {0}',
    done: 'Rebuilt data/site.js and data/styles.js',
    counts: '  {0} document(s), {1} attachment(s) ({2})', home: '  Home: {0}',
    noDocs: '  No documents (the start screen will be shown)', note: '  Note: ', reload: 'Reopen (reload) index.html in the browser to see the changes.'
  }
};
const t = (key, ...args) => MESSAGES[LANG][key].replace(/\{(\d)\}/g, (m, i) => String(args[Number(i)]));

const HELP = {
  ja: `mdfolio フォルダ版の更新コマンド

  node tools/update.mjs [オプション]

  --docs <フォルダ>    文書フォルダ（既定: このフォルダの docs）
  --title <タイトル>   画面に表示するタイトル（既定: 前回の指定。なければ index.html の設定か、フォルダ名）
                       "" を指定すると、前回の指定を消します。
  --home <パス>        最初に表示する文書（既定: 前回の指定。なければ README.md → index.md → 先頭の文書）

次の 2 つのファイルを作り直します。
  data/site.js     文書フォルダの内容（Markdown と、文書から参照されている画像などの添付）
  data/styles.js   style/ の CSS の写し（「サイトとして書き出す」で使う）

ブラウザーは file:// で開いたページから隣のファイルを読めないため、文書を足したり変えたりしたとき、
CSS を変えたときは、このコマンドを実行してからページを再読み込みしてください。
Node.js の標準機能だけで動きます。

表示の言語は、環境変数 MDFOLIO_LANG（ja / en）で指定できます。
`,
  en: `Update command for the mdfolio folder version

  node tools/update.mjs [options]

  --docs <folder>     Document folder (default: the docs folder next to tools/)
  --title <title>     Title shown on the screen (default: the previous setting; otherwise the setting
                      in index.html or the folder name). Use "" to clear the previous setting.
  --home <path>       First document to show (default: the previous setting; otherwise
                      README.md → index.md → the first document)

It rebuilds these two files:
  data/site.js     the contents of the document folder (Markdown, and images and other attachments
                   that the documents refer to)
  data/styles.js   a copy of the CSS in style/ (used by "Export as site")

Browsers do not let a page opened from file:// read the files next to it. After you add or change
documents, or change the CSS, run this command and then reload the page.
It needs only Node.js, with no extra packages.

You can set the language of the messages with the environment variable MDFOLIO_LANG (ja / en).
`
};

function fail(message) {
  console.error(t('error') + message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { docs: path.join(ROOT, 'docs'), title: null, home: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) fail(t('needsValue', a));
      return argv[++i];
    };
    if (a === '--docs') args.docs = path.resolve(next());
    else if (a === '--title') args.title = next();
    else if (a === '--home') args.home = next();
    else if (a === '--help' || a === '-h') {
      console.log(HELP[LANG]);
      process.exit(0);
    } else fail(t('unknownOption', a));
  }
  return args;
}

/** lib/ のスクリプトを評価して、core（パス・リンク・データ形式）と md（Markdown の解析）を得る。 */
function loadLib() {
  const context = vm.createContext({ console, TextDecoder, TextEncoder, atob, btoa, setTimeout, clearTimeout });
  for (const name of ['vendor.js', 'mdfolio.js']) {
    const file = path.join(ROOT, 'lib', name);
    if (!fs.existsSync(file)) fail(t('libMissing', name));
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: 'lib/' + name });
  }
  const MDV = context.MDV;
  if (!MDV || !MDV.core || !MDV.md) fail(t('libLoad'));
  return { core: MDV.core, md: MDV.md };
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

/** 文書フォルダを読んで、サイトデータ（SPEC 5.5）を作る。文書がなければ null。 */
export function collectSite(core, md, dir, opts) {
  const warnings = [];
  const scan = walk(core, dir);
  if (scan.truncated) warnings.push(t('truncated', core.LIMITS.maxEntries));
  const diskPath = new Map();
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
  if (!docPaths.length) return { site: null, docs: 0, assets: 0, home: '', warnings };

  const renderer = md.createRenderer({});
  const files = [];
  const refs = [];
  const refSet = new Set();
  for (const p of docPaths) {
    const abs = diskPath.get(p);
    const stat = fs.statSync(abs);
    const text = core.detectAndDecode(fs.readFileSync(abs)).text;
    files.push({ path: p, kind: 'doc', text, mtime: Math.floor(stat.mtimeMs) });
    if (stat.size > core.LIMITS.maxDocBytes) continue;
    const r = renderer.collectRefs(core.parseFrontMatter(text).body);
    for (const href of Array.from(r.links).concat(Array.from(r.images))) {
      const res = core.resolveLink(index, p, href);
      if (res.type === 'asset' && !refSet.has(res.path)) { refSet.add(res.path); refs.push(res.path); }
    }
  }
  let skipped = 0;
  let assets = 0;
  for (const p of refs) {
    const abs = diskPath.get(p);
    const stat = fs.statSync(abs);
    if (stat.size > core.LIMITS.maxAssetBytes) { skipped++; continue; }
    files.push({ path: p, kind: 'asset', mime: core.mimeOf(p), base64: fs.readFileSync(abs).toString('base64'), mtime: Math.floor(stat.mtimeMs) });
    assets++;
  }
  if (skipped) warnings.push(t('bigAssets', skipped));

  let home = '';
  if (opts.home) {
    const found = core.lookupPath(index, core.normalizePath(opts.home));
    if (!found || found.kind !== 'doc') throw new Error(t('homeMissing', opts.home));
    home = found.path;
  } else {
    home = core.pickHome(index, docPaths, '');
  }
  return { site: core.buildSiteData(path.basename(dir), files), docs: docPaths.length, assets, home, warnings };
}

const HEADER = '/* mdfolio のデータ。node tools/update.mjs で作り直します。手で編集しないでください。 */\n' +
  'window.MDV_DATA = window.MDV_DATA || {};\n';
const assign = (key, value) => `window.MDV_DATA[${JSON.stringify(key)}] = ${JSON.stringify(value)};\n`;

/** 書き込みは、一時ファイルに書いてから置き換える（途中で止まっても、壊れたファイルを残さない）。 */
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

/** 前回作った data/site.js の指定（タイトル・ホーム）。読めなければ空。 */
function previousMeta() {
  const file = path.join(ROOT, 'data/site.js');
  try {
    const context = vm.createContext({ window: {} });
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: 'data/site.js', timeout: 5000 });
    const meta = context.window.MDV_DATA && context.window.MDV_DATA['mdv-site-meta'];
    return meta && typeof meta === 'object' ? meta : {};
  } catch (e) {
    return {};
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { core, md } = loadLib();
  const prev = previousMeta();

  // CSS の写し（先に読んで確かめる。誤りがあれば、どのファイルも書き換えずに終わる）
  const css = {};
  for (const name of ['app', 'document']) {
    const file = path.join(ROOT, 'style', name + '.css');
    if (!fs.existsSync(file)) fail(t('cssMissing', name));
    css[name] = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
    if (/<\/style/i.test(css[name])) fail(t('cssStyleTag', name));
  }
  // 指定がなければ、前回の指定を引き継ぐ（ホームは、その文書がまだあるときだけ）
  if (args.title === null) args.title = typeof prev.title === 'string' ? prev.title : '';
  let homeFromPrev = false;
  if (args.home === null) {
    args.home = typeof prev.home === 'string' && prev.home && prev.homeSpecified ? prev.home : '';
    homeFromPrev = !!args.home;
  }

  // 文書
  let result = { site: null, docs: 0, assets: 0, home: '', warnings: [] };
  if (fs.existsSync(args.docs)) {
    if (!fs.statSync(args.docs).isDirectory()) fail(t('notFolder', args.docs));
    try {
      result = collectSite(core, md, args.docs, args);
    } catch (e) {
      if (!homeFromPrev) fail(e.message);
      // 前回のホームがなくなった場合は、自動で選び直す
      result = collectSite(core, md, args.docs, Object.assign({}, args, { home: '' }));
      result.warnings.push(t('prevHomeGone', args.home));
      args.home = '';
    }
  } else {
    result.warnings.push(t('docsMissing', args.docs));
  }
  const meta = { title: args.title || '', home: result.home, homeSpecified: !!args.home };
  writeAtomic(path.join(ROOT, 'data/site.js'), HEADER + assign('mdv-site', result.site) + assign('mdv-site-meta', meta));

  writeAtomic(path.join(ROOT, 'data/styles.js'), HEADER + assign('mdv-styles', css));

  console.log(t('done'));
  if (result.site) {
    console.log(t('counts', result.docs, result.assets, path.relative(process.cwd(), args.docs) || '.'));
    console.log(t('home', result.home));
  } else {
    console.log(t('noDocs'));
  }
  for (const w of result.warnings) console.log(t('note') + w);
  console.log(t('reload'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
