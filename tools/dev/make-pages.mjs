#!/usr/bin/env node
/**
 * GitHub Pages に置くファイル一式を、日本語と英語で作る（SPEC 8.7）。
 *
 *   node tools/dev/make-pages.mjs [出力フォルダ]      既定: tmp/pages
 *
 * 先に npm run build を実行しておくこと（dist/mdfolio.html を使う）。出力フォルダの中身は毎回消してから作り直す。
 *
 *   index.html            案内（日本語。スクリプトなし。ライセンス表記の全文を含む）
 *   mdfolio.html          ビューア（dist/mdfolio.html。1 つだけ。画面の言語はブラウザーに合わせる）
 *   sample-site.html      書き出しの見本（sample-docs/。画面は日本語に固定）
 *   folder/               フォルダ版の見本（sample-docs/。画面は日本語に固定）
 *   mdfolio-docs.html     説明書（README.md と docs/ の 3 文書）
 *   en/index.html         案内（英語）
 *   en/sample-site.html   書き出しの見本（sample-docs-en/。画面は英語に固定）
 *   en/folder/            フォルダ版の見本（sample-docs-en/。画面は英語に固定）
 *   en/mdfolio-docs.html  説明書（README.en.md）
 *   .nojekyll             GitHub Pages の変換（Jekyll）を止める。止めないと「_」で始まるファイル
 *                         （folder/docs/_sidebar.md）が公開されない
 *
 * 見本の画面の言語を固定するのは公開ページだけで、dist/ の見本（lang: auto）は変えない。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'tmp/pages'));
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const REPO = 'https://github.com/ParticlePudding/mdfolio';
const SITE = 'https://particlepudding.github.io/mdfolio/';
const viewer = path.join(ROOT, 'dist/mdfolio.html');

if (!fs.existsSync(viewer)) {
  console.error('dist/mdfolio.html がありません。先に npm run build を実行してください。');
  process.exit(1);
}
if (out === ROOT || out === path.join(ROOT, 'dist') || ROOT.startsWith(out + path.sep)) {
  console.error('出力先にこのフォルダや dist/ は指定できません: ' + out);
  process.exit(1);
}

const run = (script, args) => execFileSync(process.execPath, [path.join(ROOT, script), ...args], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'en'), { recursive: true });
fs.copyFileSync(viewer, path.join(out, 'mdfolio.html'));
fs.writeFileSync(path.join(out, '.nojekyll'), '');

const LANGS = {
  ja: { dir: '', docs: 'sample-docs', title: 'mdfolio サンプル文書' },
  en: { dir: 'en', docs: 'sample-docs-en', title: 'mdfolio sample documents' }
};
for (const [lang, c] of Object.entries(LANGS)) {
  const at = (p) => path.join(out, c.dir, p);
  run('tools/build-site.mjs', [c.docs, '--out', at('sample-site.html'), '--title', c.title, '--lang', lang]);
  run('tools/dev/make-docs-site.mjs', [at('mdfolio-docs.html'), '--lang', lang]);
  run('tools/build-folder.mjs', ['--out', at('folder'), '--docs', path.join(ROOT, c.docs), '--title', c.title]);
  // フォルダ版の画面の言語を固定する（設定ブロックは利用者が編集してよい部分。SPEC 8.6）
  const index = at('folder/index.html');
  const html = fs.readFileSync(index, 'utf8');
  if (html.split('"lang":"auto"').length !== 2) throw new Error('folder/index.html の設定ブロックに "lang":"auto" が 1 つだけあるはずです');
  fs.writeFileSync(index, html.replace('"lang":"auto"', `"lang":"${lang}"`));
}

const mb = (fs.statSync(viewer).size / 1048576).toFixed(1);

// ライセンス表記の全文（アプリの HTML に埋め込んでいるもの（tools/build.mjs）と同じ並び）
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n?/g, '\n').trim();
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LICENSES = esc([`mdfolio ${version}`, '='.repeat(78), '', readText('LICENSE'), '', '', readText('THIRD-PARTY-NOTICES.txt')].join('\n'));

const TEXT = {
  ja: {
    description: 'サーバーもインストールも要らない、Markdown 文書の表示サイト',
    switchLabel: 'English',
    switchHref: 'en/',
    switchLang: 'en',
    version: 'バージョン',
    lead: 'Markdown で書いた文書を、ブラウザーだけで読めるサイトにします。サーバー、インストール、ネット接続は要りません。HTML のファイルを開くだけで動きます。',
    tryTitle: '試してみる',
    cards: [
      ['sample-site.html', 'サンプル文書を読む', '文書を 1 つの HTML にまとめた「書き出し」の見本です。スマートフォンでも読めます。'],
      ['mdfolio.html', '自分のフォルダを開く', 'ビューア本体です。手元の Markdown のフォルダやファイルを選んで読めます。'],
      ['folder/index.html', 'フォルダ版の見本', '決まった場所の文書を表示する形です。見た目を CSS で変えられます。'],
      ['mdfolio-docs.html', '説明書', '使い方、仕様書、テストの記録です。mdfolio 自身で表示しています。']
    ],
    privacyTitle: '文書は外に送られません',
    privacy: '「自分のフォルダを開く」で選んだ文書は、あなたのブラウザーの中だけで読み込みます。このサイトやほかの場所へ送ることはありません（ページの設定で、外部との通信そのものを止めています）。',
    localTitle: '手元で使う',
    local: [
      `<a href="mdfolio.html" download>mdfolio.html をダウンロード</a>（約 ${mb}MB）して、ダブルクリックで開きます。これ 1 つで動きます。`,
      `フォルダ版やコマンドラインでの書き出しは、<a href="${REPO}">GitHub のリポジトリ</a>の「Code」→「Download ZIP」で一式を入手し、README の手順に従ってください。`
    ],
    licenseTitle: 'ライセンス',
    license: 'mdfolio は MIT ライセンスです。同梱しているライブラリ（markdown-it、DOMPurify、highlight.js、KaTeX、Mermaid など）のライセンス表記を含む全文を、下に載せています。同じものが、各ページのメニュー（⋯）の「ライセンスとバージョン」でも見られます。',
    licenseOpen: 'ライセンス表記の全文を開く（英語）',
    footer: `© 2026 Particle Pudding · MIT ライセンス · <a href="${REPO}">ソースコード</a> · <a href="${REPO}/issues">不具合・要望（Issues）</a>`
  },
  en: {
    description: 'A Markdown document viewer that needs no server and no installation',
    switchLabel: '日本語',
    switchHref: '../',
    switchLang: 'ja',
    version: 'Version',
    lead: 'mdfolio turns Markdown documents into a website you can browse using any modern web browser. It needs no server, no installation and no network connection. Just open the HTML file.',
    tryTitle: 'Try it',
    cards: [
      ['sample-site.html', 'Read the sample documents', 'Try an example of "Export as site": a collection of documents packaged into a single HTML file. It works on smartphones too.'],
      ['../mdfolio.html', 'Open your own folder', 'The viewer itself. Choose Markdown files or a folder on your device and read them.'],
      ['folder/index.html', 'Folder version sample', 'Shows the documents stored in its docs folder. You can change the look with CSS.'],
      ['mdfolio-docs.html', 'Documentation', 'How to use mdfolio, shown by mdfolio itself. The design records are in Japanese only.']
    ],
    privacyTitle: 'Your documents stay with you',
    privacy: 'Documents you open using "Open your own folder" are processed entirely within your browser. They are never sent to this site or anywhere else (the page\'s security settings block all network access).',
    localTitle: 'Use it on your device',
    local: [
      `<a href="../mdfolio.html" download>Download mdfolio.html</a> (about ${mb} MB) and double-click it. That one file is all you need.`,
      `To use the folder version or command-line export, download <a href="${REPO}">the GitHub repository</a> as a ZIP file using "Code" → "Download ZIP", then follow the instructions in README.en.md.`
    ],
    licenseTitle: 'License',
    license: 'mdfolio is released under the MIT License. The full text, including the license notices of the bundled libraries (markdown-it, DOMPurify, highlight.js, KaTeX, Mermaid and others), is below. The same text is under "Licenses and version" in the menu (⋯) of each page.',
    licenseOpen: 'Show the full license text',
    footer: `© 2026 Particle Pudding · MIT License · <a href="${REPO}">Source code</a> · <a href="${REPO}/issues">Report a problem (Issues)</a>`
      + `<br>The English text was written by a non-native English speaker. If you notice any awkward wording, please let us know through <a href="${REPO}/issues">GitHub Issues</a>.`
  }
};

const ICON = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%276%27 fill=%27%231D4F91%27/%3E%3Cpath d=%27M9 6h10l5 5v15H9z%27 fill=%27%23fff%27/%3E%3Cpath d=%27M12 15h9M12 19h9M12 23h5%27 stroke=%27%231D4F91%27 stroke-width=%271.8%27/%3E%3C/svg%3E';

const page = (lang) => {
  const t = TEXT[lang];
  const card = ([href, title, text]) => `  <a class="card" href="${href}"><strong>${title}</strong><span>${text}</span></a>`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<meta name="description" content="${t.description}">
<link rel="alternate" hreflang="ja" href="${SITE}">
<link rel="alternate" hreflang="en" href="${SITE}en/">
<link rel="alternate" hreflang="x-default" href="${SITE}">
<link rel="icon" href="${ICON}">
<title>mdfolio</title>
<style>
:root { --bg: #f7f8fa; --card: #fff; --text: #1d2330; --muted: #5a6474; --line: #dde2ea; --accent: #1d4f91; --accent-bg: #e8eef8; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #14171c; --card: #1c2027; --text: #e6e9ef; --muted: #a3acba; --line: #2e3440; --accent: #8db4ec; --accent-bg: #1f2a3b; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.75 system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif; }
main { max-width: 860px; margin: 0 auto; padding: 32px 20px 64px; }
.lang { text-align: right; margin: 0 0 16px; font-size: .95rem; }
.lang a { display: inline-block; padding: 4px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); text-decoration: none; }
.lang a:hover, .lang a:focus-visible { border-color: var(--accent); }
h1 { font-size: 2rem; margin: 0 0 4px; letter-spacing: .02em; }
.version { color: var(--muted); font-size: .9rem; margin: 0 0 20px; }
.lead { font-size: 1.1rem; margin: 0 0 32px; }
h2 { font-size: 1.15rem; margin: 40px 0 12px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
a.card { display: block; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; color: inherit; text-decoration: none; }
a.card:hover, a.card:focus-visible { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px var(--accent-bg); }
a.card strong { display: block; color: var(--accent); font-size: 1.05rem; margin-bottom: 4px; }
a.card span { color: var(--muted); font-size: .92rem; }
ul { padding-left: 1.3em; margin: 0; }
li { margin: 4px 0; }
a { color: var(--accent); }
.note { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 6px; padding: 12px 16px; font-size: .95rem; }
details { background: var(--card); border: 1px solid var(--line); border-radius: 6px; margin-top: 12px; }
summary { cursor: pointer; padding: 10px 16px; color: var(--accent); }
summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
pre.licenses { margin: 0; padding: 12px 16px; border-top: 1px solid var(--line); max-height: 60vh; overflow: auto; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
footer { margin-top: 48px; color: var(--muted); font-size: .85rem; }
</style>
</head>
<body>
<main>
<p class="lang"><a href="${t.switchHref}" hreflang="${t.switchLang}" lang="${t.switchLang}">${t.switchLabel}</a></p>
<h1>mdfolio</h1>
<p class="version">${t.version} ${version}</p>
<p class="lead">${t.lead}</p>

<h2>${t.tryTitle}</h2>
<div class="cards">
${t.cards.map(card).join('\n')}
</div>

<h2>${t.privacyTitle}</h2>
<p class="note">${t.privacy}</p>

<h2>${t.localTitle}</h2>
<ul>
${t.local.map((li) => `  <li>${li}</li>`).join('\n')}
</ul>

<h2 id="license">${t.licenseTitle}</h2>
<p>${t.license}</p>
<details>
<summary>${t.licenseOpen}</summary>
<pre class="licenses" lang="en" tabindex="0">${LICENSES}</pre>
</details>

<footer>
<p>${t.footer}</p>
</footer>
</main>
</body>
</html>
`;
};
fs.writeFileSync(path.join(out, 'index.html'), page('ja'));
fs.writeFileSync(path.join(out, 'en/index.html'), page('en'));

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`${path.relative(ROOT, out) || out}: ${count(out)} ファイル（日本語と英語）`);
