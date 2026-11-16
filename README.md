**日本語** | [English](README.en.md)

# mdfolio（仮称）

ローカルの HTML と JavaScript だけで動く、Markdown 文書の表示サイトです。サーバー、インストール、ネット接続は要りません。形が 2 つあります。

- **フォルダ版**（`dist/mdfolio/`）: 所定の場所に置き、`docs` の文書を `index.html` を開くだけで読めるようにする形。見た目を CSS（`style/document.css`）で変えられます。
- **単一 HTML 版**（`dist/mdfolio.html`、約 4.1MB）: 1 ファイルを開いてフォルダを選ぶ形。持ち運びや受け渡しに向きます。「サイトとして書き出す」の出力もこの形です。

- バージョン: 1.1.0
- 公開ページ: https://particlepudding.github.io/mdfolio/ （サンプルを読む、ビューアを試す、説明書を読む。英語版は `/en/`）
- ライセンス: MIT（同梱ライブラリのライセンス表記は HTML の中に入っています）

## 使い方

### フォルダ版を置いて使う

1. `dist/mdfolio/` フォルダを、使う場所（共有フォルダなど）に置きます。
2. `docs/` に Markdown と画像を置き、そのフォルダで `node tools/update.mjs` を実行します（Node.js 20 以降）。タイトルは `--title "部の手順書"` で指定できます。
3. `index.html` をブラウザーで開きます。文書を変えたら、2 を実行してから再読み込みします。

見た目は `style/document.css` で変えます。ファイルの先頭に変え方の説明があります。配色の変数（`--accent` など）を変えると、本文・画面・図の色がそろって変わります。本文は `.mdv-prose` の中の普通の HTML（`h1`〜`h6`、`table`、`pre` など）なので、それに対する規則も書けます。

ブラウザーは `file://` で開いたページから隣のファイルを読めないため、`docs/` に置いただけでは表示されず、更新コマンドで `data/site.js` を作る必要があります。CSS を変えたあとに「サイトとして書き出す」場合も、先に更新コマンドを実行してください（書き出しには CSS の写しを使います）。

### 1. 自分のフォルダを読む（単一 HTML 版）

1. `dist/mdfolio.html` をブラウザーで開きます（ダブルクリック）。
2. 「フォルダを開く」で Markdown のあるフォルダを選ぶか、フォルダをウィンドウにドロップします。
3. 左の一覧、文書中のリンク、検索（`Ctrl+K` または `/`）で読み進めます。

試すには、付属の `sample-docs` フォルダを開いてください（英語版は `sample-docs-en`）。ファイル 1 つで試すなら、「ファイルを開く」で付属の `sample.md` を選びます。使い方の全体はメニュー（⋯）の「使い方」にあります。

### 2. 文書をまとめて人に渡す

メニュー（⋯）の「サイトとして書き出す」で、開いている文書と、文書が参照している画像・添付をすべて埋め込んだ HTML を 1 つ保存できます。
受け取った人は、その HTML を開くだけで読めます。メールやチャットに直接添付すると途中で書き換えられて動かなくなることがあるので、zip に入れて渡してください。

### 3. コマンドラインで書き出す

```
node tools/build-site.mjs <文書フォルダ> --out site.html --title "手順書"
```

アプリ内の書き出しと同じ内容の HTML ができます。Node.js 20 以降があれば動き、npm パッケージは要りません。オプションは `--help` で確認できます。

## できること

| 分類 | 内容 |
|---|---|
| 読み込み | フォルダ／ファイルの選択、ドラッグ＆ドロップ、HTML への埋め込み。UTF-8・UTF-16（BOM 付き）・Shift_JIS を自動判定 |
| 表示 | CommonMark と GFM（表・打ち消し線・タスクリスト・自動リンク）、脚注、GitHub 形式のアラート、コードの色分け、数式（KaTeX）、図（Mermaid）、フロントマター |
| 移動 | ファイルツリー、`_sidebar.md` / `SUMMARY.md` によるナビ、ページ内目次、URL（ハッシュ）での位置の共有、戻る／進む |
| 検索 | 全文検索（複数語の AND、全角半角・大文字小文字を区別しない）、一致箇所の強調 |
| 表示設定 | ライト／ダーク／自動、日本語／英語、画面幅に応じたレイアウト、印刷用の体裁 |
| 配布 | 文書を埋め込んだ単一 HTML の書き出し（アプリ内・コマンドライン） |
| 便利機能 | 表示中のファイルが更新されたら自動で再表示、前回のフォルダを開く（どちらも Chrome / Edge） |

コードの色分けに対応する言語（68 種類）:

- 標準: bash, c, cpp, csharp, css, diff, go, graphql, ini, java, javascript, json, kotlin, less, lua, makefile, markdown, objectivec, perl, php, php-template, plaintext, python, python-repl, r, ruby, rust, scss, shell, sql, swift, typescript, vbnet, wasm, xml, yaml
- 追加: powershell, dos, dockerfile, nginx, apache, cmake, matlab, latex, protobuf, vbscript, armasm, verilog, vhdl, fortran, scala, dart, haskell, julia, groovy, gradle, properties, http, delphi, erlang, elixir, clojure, lisp, scheme, awk, tcl, vim, glsl

言語を増やすときは `tools/vendor.mjs` の `HLJS_EXTRA` に追記して、`npm run vendor` と `npm run build` を実行します。

## 安全性とプライバシー

他人が作った Markdown を開いても安全なように作っています。

- 開いたファイルはブラウザーの中だけで処理し、どこにも送信しません。通信の機能（fetch など）を使っておらず、ブラウザーの設定（コンテンツセキュリティポリシー）でも通信を禁止しています。
- 文書に書かれたスクリプトやイベント属性は取り除きます。万一すり抜けても、HTML に内蔵したスクリプト以外は実行されません。
- インターネット上の画像・動画は、初期設定では読み込みません（読み込むと、配信元に「開いた」ことが伝わるため）。メニューの「外部の画像を表示する」で切り替えられます。表示する側へ切り替えるときは、ページを再読み込みします。
- 添付ファイルへのリンクは、ブラウザーの中では開かず、ダウンロードとして保存します。

詳しくは `docs/SPEC.md` の 6 章、確認した内容は `docs/TEST_REPORT.md` を見てください。

## 動作環境

| ブラウザー | 状況 |
|---|---|
| Google Chrome / Microsoft Edge（PC、最新版） | 主な対象。Chromium で全項目を自動テスト済み |
| Firefox / Safari（PC、最新版） | 動作する想定。それぞれのエンジン（Gecko 160、WebKitGTK 2.52）で主要機能を自動確認済み。製品版そのものでは未確認 |
| スマートフォン・タブレット | 書き出したサイトを読む用途と、「ファイルを開く」を想定。幅 390px・タッチ操作を模した環境で自動確認済み。**実機では未確認** |
| 別のページの中（`<iframe>`）に埋め込んだ表示 | 閲覧に必要な機能は動く（下の「別のページの中に埋め込む」）。条件を模したフレームで自動確認済み。個々のサービスの実環境では未確認 |

Firefox / Safari では、フォルダはファイル選択の画面で開きます（「アップロードしますか」と表示されることがありますが、送信はされません）。「前回のフォルダを開く」と自動更新は使えません。

## 設定

HTML の中の `<script type="application/json" id="mdv-config">` を書き換えると、既定の動作を変えられます（ここは手で編集してかまいません）。

| キー | 値 | 意味 |
|---|---|---|
| `title` | 文字列 | サイトのタイトル（空ならフォルダ名） |
| `lang` | `auto` / `ja` / `en` | 画面の言語 |
| `theme` | `auto` / `light` / `dark` | テーマ |
| `home` | パス | 最初に表示する文書 |
| `allowExternalImages` | `true` / `false` | 外部の画像を最初から表示するか |
| `allowDownloads` | `true` / `false` | `false` にすると、ファイルの保存を伴う操作（サイトとして書き出す、添付の保存）を出さない |
| `lockExternalImages` | `true` / `false` | `true` にすると、外部の画像を常に読み込まない（利用者は切り替えられない） |
| `hosted` | `true` / `false` | `true` にすると、動作確認用の公開ページであることを開始画面と使い方に表示する |

下の 3 つは、ファイルの保存や外部の読み込みができない場所に置くための設定です。コマンドラインの書き出しでは、`--no-downloads`、`--lock-external-images` で指定できます。

スクリプトの部分（`mdv-js-…`、`mdv-lib-…`）は書き換えないでください。内容の指紋（ハッシュ）を照合しているため、1 文字でも変えると動かなくなります。

## 別のページの中に埋め込む

`mdfolio.html` や書き出したサイトは、別のページの `<iframe>` の中に表示しても読めます。保存領域が使えない、文書の URL とリンクの基準 URL が異なる（`srcdoc`）、クリップボードの API が許可されていない、といった条件でも、閲覧・検索・リンクでの移動ができます。

フレームの制限でファイルの保存が止められる場所に置くときは、設定の `allowDownloads` を `false` にして、押しても動かない操作を画面から外してください。

ページの中へ独自のスクリプトを差し込む種類のホスティングサービス（Claude のアーティファクトなど）には、そのままでは置けません。HTML に書いてあるコンテンツセキュリティポリシーが、差し込まれたスクリプトを止めてしまうためです。次のコマンドで、お試し用の HTML に変換できます。

```
node tools/dev/make-hosted.mjs dist/mdfolio.html hosted-viewer.html --page-title "mdfolio ビューア（お試し用）"
```

この変換は、HTML に書いてあるコンテンツセキュリティポリシーを取り除き、保存を伴う操作と外部の画像の表示を使えなくします（あわせて、公開先に受け付けられない文字 U+FFFD を、同じ意味のエスケープに書き換えます）。安全のための仕組みを 1 つ外すことになるので、変換した HTML は動作確認やサンプルの公開にだけ使い、手元で開く・組織内で配る用途には変換前の HTML を使ってください（`docs/SPEC.md` の 6.1）。

## 主な制約

- 文書 5,000 件、ファイルとフォルダ 50,000 件まで。10MB を超える文書は変換せずにテキストとして表示します。
- 書き出しに含められる添付は 1 つ 20MB まで。
- 文字コードの自動判定は UTF-8 / UTF-16（BOM 付き）/ Shift_JIS のみです。
- Mermaid は軽量版を同梱しているため、Mindmap と Architecture 図は表示できません。
- 絵文字のショートコード（`:smile:`）、Wiki リンク（`[[...]]`）、`[TOC]`、定義リストには対応していません。

そのほかの制約は `docs/SPEC.md` の 11 章にあります。

## 再配布について

- `dist/mdfolio.html` と、そこから書き出したサイトの HTML は、そのまま再配布できます。必要な著作権表示と許諾表示（MIT、BSD、Apache-2.0、ISC、SIL OFL など）は HTML の中に入っており、メニューの「ライセンスとバージョン」で表示できます。
- 同梱しているのは、再配布が認められている寛容なライセンスのライブラリだけです（一覧は `THIRD-PARTY-NOTICES.txt` と `vendor/manifest.json`）。GPL や EPL のコードは含めていません。
- `LICENSE` の著作権者名は「Particle Pudding」です。書き換えた場合は `npm run build` で作り直してください（文章が HTML に埋め込まれるため）。
- これは法的な助言ではありません。社内規程などがある場合は、`THIRD-PARTY-NOTICES.txt` を確認の材料にしてください。

## 開発者向け

```
node tools/build.mjs                       # dist/mdfolio.html を作る（npm パッケージ不要）
node tools/build-folder.mjs                # dist/mdfolio/（フォルダ版）を作る。先に build.mjs を実行しておく
node tools/build.mjs --without mermaid,katex --out lite.html   # 数式・図なしの軽量版（約 0.65MB）
npm install                                 # テストに必要なもの（Playwright など）を入れる
npx playwright install chromium             # テスト用のブラウザー
npm test                                    # ビルド → 単体テスト → ブラウザーでのテスト
npm run test:webkit                         # WebKitGTK での確認（要 webkit2gtk-driver, xvfb）
npm run test:gecko                          # Firefox 系での確認（要 geckodriver。MDFOLIO_GECKO_BINARY で実行ファイルを指定）
npm run vendor                              # 同梱ライブラリの更新とライセンス表記の作り直し
```

| 場所 | 内容 |
|---|---|
| `dist/mdfolio/` | フォルダ版（`index.html`、`style/`、`docs/`、`data/`、`lib/`、`tools/update.mjs`） |
| `dist/mdfolio.html` | 単一 HTML 版 |
| `dist/mdfolio-docs.html` | この説明と `docs/` の 3 文書を、mdfolio 自身で 1 つのサイトに書き出したもの（開くだけで読める） |
| `dist/sample-site.html` | `sample-docs/` を書き出したもの（書き出し結果の見本） |
| `sample-docs/` `sample-docs-en/` | 動作確認用の文書（フォルダ。日本語と英語） |
| `sample.md` | 動作確認用の文書（1 ファイルで完結するもの） |
| `src/` | ソース（`core.js` 画面に依存しない処理、`md.js` Markdown の拡張、`i18n.js` 文言、`app.js` 画面、`app.css` 画面の部品、`document.css` 本文と配色） |
| `vendor/` | 同梱ライブラリ（配布物そのまま）と目録 `manifest.json` |
| `tools/` | ビルド、書き出し、ライブラリ更新。`tools/folder/` はフォルダ版に入れる更新コマンドと説明。`tools/dev/` は、埋め込み用の変換（`make-hosted.mjs`）、zip の作成（`make-zip.py`）、公開ページの組み立て（`make-pages.mjs`）、テスト結果の集計 |
| `tests/` | 単体テスト（`unit/`）、ブラウザーでのテスト（`e2e/`）、別エンジンでの確認（`cross/`）、テスト用の文書（`fixtures/`） |
| `docs/` | 仕様書 `SPEC.md`、仕様レビュー記録 `REVIEW.md`、テスト報告書 `TEST_REPORT.md` |
| `test-results/` | テストの実行記録（件数、性能の計測値、別エンジンでの確認結果と画面） |

## ライセンス

MIT License（`LICENSE`）。同梱ライブラリのライセンスは `THIRD-PARTY-NOTICES.txt` を参照してください。
