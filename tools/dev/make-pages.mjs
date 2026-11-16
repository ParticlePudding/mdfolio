#!/usr/bin/env node
/**
 * GitHub Pages に置くファイル一式を作る。
 *
 *   node tools/dev/make-pages.mjs [出力フォルダ]      既定: tmp/pages
 *
 * dist/ の成果物をそのまま写し、案内のページ（index.html）を加える。先に npm run build と
 * make-docs-site.mjs を実行しておくこと。出力フォルダの中身は毎回消してから作り直す。
 *
 *   index.html          案内のページ（スクリプトなし）
 *   sample-site.html    書き出しの見本（dist/sample-site.html）
 *   mdfolio.html        単一 HTML 版のビューア（dist/mdfolio.html）
 *   mdfolio-docs.html   説明書（dist/mdfolio-docs.html）
 *   folder/             フォルダ版の見本（dist/mdfolio/）
 *   .nojekyll           GitHub Pages の変換（Jekyll）を止める。止めないと「_」で始まるファイル
 *                       （folder/docs/_sidebar.md）が公開されない
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'tmp/pages'));
const dist = (p) => path.join(ROOT, 'dist', p);
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const REPO = 'https://github.com/ParticlePudding/mdfolio';

for (const p of ['mdfolio.html', 'sample-site.html', 'mdfolio-docs.html', 'mdfolio/index.html']) {
  if (!fs.existsSync(dist(p))) {
    console.error(`dist/${p} がありません。先に npm run build と node tools/dev/make-docs-site.mjs を実行してください。`);
    process.exit(1);
  }
}
if (out === ROOT || out === path.join(ROOT, 'dist') || ROOT.startsWith(out + path.sep)) {
  console.error('出力先にこのフォルダや dist/ は指定できません: ' + out);
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of ['mdfolio.html', 'sample-site.html', 'mdfolio-docs.html']) fs.copyFileSync(dist(name), path.join(out, name));
fs.cpSync(dist('mdfolio'), path.join(out, 'folder'), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');

const mb = (name) => (fs.statSync(dist(name)).size / 1048576).toFixed(1);

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<meta name="description" content="サーバーもインストールも要らない、Markdown 文書の表示サイト">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%276%27 fill=%27%231D4F91%27/%3E%3Cpath d=%27M9 6h10l5 5v15H9z%27 fill=%27%23fff%27/%3E%3Cpath d=%27M12 15h9M12 19h9M12 23h5%27 stroke=%27%231D4F91%27 stroke-width=%271.8%27/%3E%3C/svg%3E">
<title>mdfolio</title>
<style>
:root { --bg: #f7f8fa; --card: #fff; --text: #1d2330; --muted: #5a6474; --line: #dde2ea; --accent: #1d4f91; --accent-bg: #e8eef8; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #14171c; --card: #1c2027; --text: #e6e9ef; --muted: #a3acba; --line: #2e3440; --accent: #8db4ec; --accent-bg: #1f2a3b; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.75 system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif; }
main { max-width: 860px; margin: 0 auto; padding: 48px 20px 64px; }
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
footer { margin-top: 48px; color: var(--muted); font-size: .85rem; }
</style>
</head>
<body>
<main>
<h1>mdfolio</h1>
<p class="version">バージョン ${version}</p>
<p class="lead">Markdown で書いた文書を、ブラウザーだけで読めるサイトにします。サーバー、インストール、ネット接続は要りません。HTML のファイルを開くだけで動きます。</p>

<h2>試してみる</h2>
<div class="cards">
  <a class="card" href="sample-site.html"><strong>サンプル文書を読む</strong><span>文書を 1 つの HTML にまとめた「書き出し」の見本です。スマートフォンでも読めます。</span></a>
  <a class="card" href="mdfolio.html"><strong>自分のフォルダを開く</strong><span>ビューア本体です。手元の Markdown のフォルダやファイルを選んで読めます。</span></a>
  <a class="card" href="folder/index.html"><strong>フォルダ版の見本</strong><span>決まった場所の文書を表示する形です。見た目を CSS で変えられます。</span></a>
  <a class="card" href="mdfolio-docs.html"><strong>説明書</strong><span>使い方、仕様書、テストの記録です。mdfolio 自身で表示しています。</span></a>
</div>

<h2>文書は外に送られません</h2>
<p class="note">「自分のフォルダを開く」で選んだ文書は、あなたのブラウザーの中だけで読み込みます。このサイトやほかの場所へ送ることはありません（ページの設定で、外部との通信そのものを止めています）。</p>

<h2>手元で使う</h2>
<ul>
  <li><a href="mdfolio.html" download>mdfolio.html をダウンロード</a>（約 ${mb('mdfolio.html')}MB）して、ダブルクリックで開きます。これ 1 つで動きます。</li>
  <li>フォルダ版やコマンドラインでの書き出しは、<a href="${REPO}">GitHub のリポジトリ</a>の「Code」→「Download ZIP」で一式を入手し、README の手順に従ってください。</li>
</ul>

<footer>
<p>MIT ライセンス。同梱しているライブラリのライセンス表記は、各ページのメニュー（⋯）の「ライセンスとバージョン」で確認できます。 · <a href="${REPO}">ソースコード</a></p>
</footer>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), html);

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`${path.relative(ROOT, out) || out}: ${count(out)} ファイル`);
