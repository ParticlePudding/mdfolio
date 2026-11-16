#!/usr/bin/env node
/**
 * フォルダ版のビルド（SPEC 8.6）: dist/mdfolio.html から dist/mdfolio/ を作る。
 *
 *   node tools/build-folder.mjs [--out dist/mdfolio] [--docs sample-docs] [--title "mdfolio サンプル文書"]
 *
 * 先に node tools/build.mjs を実行しておくこと。スクリプトとリソースは単一 HTML から取り出すので、
 * 2 つの形式の中身は常に同じになる。CSS は src/ のものをそのまま置く（利用者が編集する）。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const core = require(path.join(ROOT, 'src/core.js'));

function fail(message) {
  console.error('ビルド失敗: ' + message);
  process.exit(1);
}

const args = { out: path.join(ROOT, 'dist/mdfolio'), docs: path.join(ROOT, 'sample-docs'), title: 'mdfolio サンプル文書' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
  else if (argv[i] === '--docs') args.docs = path.resolve(argv[++i]);
  else if (argv[i] === '--title') args.title = argv[++i];
  else fail('不明な引数: ' + argv[i]);
}

const single = path.join(ROOT, 'dist/mdfolio.html');
if (!fs.existsSync(single)) fail('dist/mdfolio.html がありません（先に node tools/build.mjs を実行してください）');
const parts = core.extractParts(fs.readFileSync(single, 'utf8'));
if (!parts.generator.endsWith(' ' + core.VERSION)) fail('dist/mdfolio.html の版が src/core.js と一致しません。先に node tools/build.mjs を実行してください');
const block = (id) => {
  const b = core.findBlock(parts, id);
  if (!b) fail(`dist/mdfolio.html にブロック ${id} がありません`);
  return b.type === 'application/json' ? JSON.parse(b.text) : b.text;
};

// 出力先を作り直す（docs/ と style/ は、既存の利用者の編集を消さないよう、ビルドの出力先にだけ作る）
fs.rmSync(args.out, { recursive: true, force: true });
const out = (rel, text) => {
  const file = path.join(args.out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n?/g, '\n');
const header = (what) => `/* mdfolio ${core.VERSION} — ${what}。編集しないでください。 */\n`;
const dataHeader = 'window.MDV_DATA = window.MDV_DATA || {};\n';
const assign = (key, value) => `window.MDV_DATA[${JSON.stringify(key)}] = ${JSON.stringify(value)};\n`;

// ---- lib/
out('lib/vendor.js', header('同梱ライブラリ（markdown-it, DOMPurify, highlight.js）') + block('mdv-js-vendor'));
out('lib/mdfolio.js', header('ビューア本体') + block('mdv-js-app'));
const libFiles = { export: 'lib/export.js' };
if (core.findBlock(parts, 'mdv-lib-katex')) {
  out('lib/katex.js', block('mdv-lib-katex'));
  out('lib/katex.css', block('mdv-res-katex-css'));
  libFiles.katex = 'lib/katex.js';
  libFiles['katex-css'] = 'lib/katex.css';
}
if (core.findBlock(parts, 'mdv-lib-mermaid')) {
  out('lib/mermaid.js', block('mdv-lib-mermaid'));
  libFiles.mermaid = 'lib/mermaid.js';
}
out('lib/resources.js', header('使い方・ライセンス表記') + dataHeader +
  assign('mdv-res-help-ja', block('mdv-res-help-ja')) +
  assign('mdv-res-help-en', block('mdv-res-help-en')) +
  assign('mdv-res-licenses', block('mdv-res-licenses')) +
  assign('mdv-lib-files', libFiles));
// 書き出し用の写し（単一 HTML の部品。CSS は data/styles.js で置き換える）
out('lib/export.js', header('「サイトとして書き出す」で使う単一 HTML の部品') + dataHeader +
  assign('mdv-export', { csp: parts.csp, generator: parts.generator, css: parts.css, blocks: parts.blocks }));

// ---- style/
out('style/app.css', read('src/app.css'));
out('style/document.css', read('src/document.css'));

// ---- index.html
const csp = [
  "default-src 'none'",
  "script-src 'self' file:",
  "style-src 'self' file: 'unsafe-inline'",
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
const config = Object.assign({}, core.DEFAULT_CONFIG);
const index = [
  '<!DOCTYPE html>',
  '<html lang="ja">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  `<meta http-equiv="Content-Security-Policy" content="${core.escapeHtml(csp)}">`,
  '<meta name="referrer" content="no-referrer">',
  '<meta name="color-scheme" content="light dark">',
  `<meta name="generator" content="${core.NAME} ${core.VERSION}">`,
  `<link rel="icon" href="${core.FAVICON}">`,
  `<title>${core.NAME}</title>`,
  '<!-- 見た目を変えるときは style/document.css を編集します -->',
  '<link rel="stylesheet" href="style/app.css" data-mdv-style>',
  '<link rel="stylesheet" href="style/document.css" data-mdv-style>',
  '<!-- 設定（SPEC 5.4）: タイトル・言語・テーマ・ホーム文書など。JSON として正しい形で編集します -->',
  `<script type="application/json" id="mdv-config">${core.jsonForScript(config)}</script>`,
  '</head>',
  '<body>',
  core.NOSCRIPT,
  '<div id="mdv-root"></div>',
  '<script src="lib/vendor.js"></script>',
  '<script src="lib/resources.js"></script>',
  '<script src="data/site.js"></script>',
  '<script src="data/styles.js"></script>',
  '<script src="lib/mdfolio.js"></script>',
  '</body>',
  '</html>',
  ''
].join('\n');
out('index.html', index);

// ---- tools/、docs/、説明
out('tools/update.mjs', read('tools/folder/update.mjs'));
out('LICENSE', read('LICENSE'));
out('THIRD-PARTY-NOTICES.txt', read('THIRD-PARTY-NOTICES.txt'));
out('はじめに.txt', read('tools/folder/はじめに.txt'));
if (args.docs) fs.cpSync(args.docs, path.join(args.out, 'docs'), { recursive: true, preserveTimestamps: true });
else fs.mkdirSync(path.join(args.out, 'docs'), { recursive: true });

// ---- data/（更新コマンドで作る）
const updateArgs = [path.join(args.out, 'tools/update.mjs')];
if (args.title) updateArgs.push('--title', args.title);
execFileSync(process.execPath, updateArgs, { stdio: ['ignore', 'ignore', 'inherit'] });

// ---- 検証
for (const rel of ['index.html', 'lib/vendor.js', 'lib/mdfolio.js', 'lib/resources.js', 'lib/export.js', 'data/site.js', 'data/styles.js', 'style/app.css', 'style/document.css']) {
  if (!fs.existsSync(path.join(args.out, rel))) fail(rel + ' がありません');
}
for (const [id, rel] of [['mdv-lib-katex', 'lib/katex.js'], ['mdv-lib-mermaid', 'lib/mermaid.js']]) {
  const b = core.findBlock(parts, id);
  if (!b) continue;
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(args.out, rel))).digest('base64');
  if (!parts.csp.includes(`'sha256-${hash}'`)) fail(`${rel} が単一 HTML のライブラリと一致しません`);
}

let total = 0;
const list = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else { const n = fs.statSync(p).size; total += n; list.push([path.relative(args.out, p), n]); }
  }
})(args.out);
console.log(`${path.relative(ROOT, args.out)}/ を生成しました: ${list.length} ファイル、${(total / 1024 / 1024).toFixed(2)} MB`);
for (const [rel, n] of list.filter(([rel]) => !rel.startsWith('docs/')).sort()) console.log(`  ${rel.padEnd(28)} ${String(n).padStart(9)} バイト`);
