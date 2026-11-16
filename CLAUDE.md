# mdfolio — Claude Code 向けの引き継ぎメモ

ローカルの HTML / JavaScript だけで動く Markdown 文書ビューア。現在の版は 1.2.0。変更の一覧は `CHANGELOG.md`（英語は `CHANGELOG.en.md`）。
詳しい仕様は `docs/SPEC.md`、設計判断の経緯は `docs/REVIEW.md`、テスト結果は `docs/TEST_REPORT.md`。

## 依頼者について・進め方

- やり取り、画面の文言、文書はすべて日本語。言い回しは平易に（専門用語は避けるか説明する）。
- 依頼者は「仕様作成 → レビュー → 実装 → テスト」の順で進めることを求めている。動作を変える変更では、
  `docs/SPEC.md`（改訂履歴も）、`docs/REVIEW.md`、`docs/TEST_REPORT.md` を合わせて更新する。
- 確認できていないことは、確認できていないとはっきり書く（実機・実環境で未確認の範囲など）。

## 2 つの形

| 形 | 出力 | 用途 |
|---|---|---|
| 単一 HTML 版 | `dist/mdfolio.html` | 1 ファイルを開いてフォルダを選ぶ。書き出し（「サイトとして書き出す」）の出力形式でもある |
| フォルダ版（1.1.0〜） | `dist/mdfolio/` | 所定の場所に置き、`docs/` の文書を表示。見た目を `style/document.css` で変える |

どちらも同じソース（`src/`）から作る。フォルダ版のスクリプトは単一 HTML から取り出すので中身は常に同じ。

## コマンド

```
node tools/build.mjs             # dist/mdfolio.html（決定的: 同じソースからは同じバイト列）
node tools/build-folder.mjs      # dist/mdfolio/（先に build.mjs）
npm run build                    # 上の 2 つ
npm install && npx playwright install chromium   # テストの準備
npm run test:unit                # 単体（node --test）
LANG=C.UTF-8 npm run test:e2e    # Playwright（Chromium）。LANG を付けないと日本語の入力・表示が崩れる
node tools/dev/test-summary.mjs unit|e2e   # 件数・時間・性能値を test-results/ に記録
npm run test:webkit / test:gecko # 別エンジン（WebKitGTK + Xvfb、geckodriver。環境依存。下記）
python3 tools/check-source.py <ファイル…>   # ソースの文字の検査（必ず実行する。下記）
node tools/dev/make-hosted.mjs   # 外部のホスティング環境（Claude のアーティファクト）向けの変換
python3 tools/dev/make-zip.py    # 配布用 zip（日本語のファイル名に UTF-8 の印を付ける。zip コマンドは使わない）
node tools/dev/make-docs-site.mjs  # README と docs/ を dist/mdfolio-docs.html に書き出す
node tools/dev/make-pages.mjs     # GitHub Pages に置く一式（日本語と英語）を tmp/pages/ に作る。先に npm run build
node tools/dev/make-release.mjs   # リリースの添付（mdfolio.html、zip）と説明を tmp/release/ に作る
```

GitHub: https://github.com/ParticlePudding/mdfolio （公開リポジトリ）。作業は `main`。
公開ページ https://particlepudding.github.io/mdfolio/ は `gh-pages` ブランチから配信する。`main` に送ると
GitHub Actions（`.github/workflows/pages.yml`）が、ビルド → 単体テスト → `make-pages.mjs` → `gh-pages` の置き換えを行う
（手で `gh-pages` に送らない。`.nojekyll` は `make-pages.mjs` が作る。消すと `_sidebar.md` が公開されない）。
版を上げる手順: `package.json`・`package-lock.json`・`src/core.js` の版、README の版、`CHANGELOG.md` と `CHANGELOG.en.md` に
「## <版> — 日付」の節 → ビルド・テスト → `main` に送る → 依頼者の了承を得て、依頼者が GitHub の Actions の画面で
「Release」→「Run workflow」を押す（この開発環境からはタグを送れない。GitHub が 403 で拒む）。
`.github/workflows/release.yml` がタグ `v<版>` とリリース（`mdfolio.html` と `mdfolio-<版>.zip`、説明は変更履歴から）を作る。
日本語と英語の両対応（SPEC 8.7）: 見本文書は `sample-docs/` と `sample-docs-en/`、README は `README.md` と `README.en.md`。
片方を変えたらもう片方も直す（構成とリンクは `tests/unit/samples.test.mjs` が確かめる）。英語の文書で画面の部品を書くときは
`src/i18n.js` の `en` の言葉を使う。仕様書・レビュー記録・テスト報告書は日本語だけ。
著作権者名は「Particle Pudding」（`LICENSE`。HTML に埋め込まれるので、変えたら作り直す）。

テストは `dist/` を読むので、`src/` を変えたら必ずビルドし直してから実行する。

## 構成の要点

- `src/core.js` 画面に依存しない処理（パス、リンク解決、設定、サイトデータ、HTML の組み立て `composeHtml` / `extractParts`）
- `src/md.js` Markdown の拡張、`src/i18n.js` 文言（ja / en のキーは一致させる。テストで検査）
- `src/app.js` 画面。`src/app.css` 画面の部品、`src/document.css` 本文と配色（利用者が編集するファイル）
- 単一 HTML は、スクリプトを CSP のハッシュで限定している。HTML のスクリプト部分を手で書き換えると動かない
- データの受け渡し: 単一 HTML は `<script type="application/json" id="mdv-…">`、フォルダ版は `window.MDV_DATA[id]`（`readJsonBlock` が両方を見る）
- 動作モード: `viewer`（フォルダを選ぶ）/ `site`（書き出した HTML）/ `library`（フォルダ版で所定の文書を表示）
- 設定（`mdv-config`）: `allowDownloads` / `lockExternalImages` / `hosted` は埋め込み・公開ページ用
- 数式（KaTeX）と図（Mermaid）は必要になったときに読み込む（単一 HTML は埋め込みから同期、フォルダ版は `lib/` から非同期）
- 図の配色は CSS の変数（`--accent` など）から取る

## はまりどころ

- 編集ツールが `\uXXXX` を実際の文字に変えてしまうことがある。編集のたびに `tools/check-source.py` を実行する。
  置換文字 U+FFFD はソースに直接書かない（公開先が受け付けない。必要なら `String.fromCharCode(0xFFFD)`）
- `file://` のページは、隣のファイルを `fetch()` で読めず、`<link>` の CSS の中身も読めない。
  フォルダ版で `tools/update.mjs` が `data/site.js` と CSS の写し `data/styles.js` を作るのはこのため
- Playwright の `request` イベントは CSP で止められた通信でも発生する。「外部に通信しない」の確認は
  `tests/helpers/e2e.mjs` の `startSink()`（実際に届いたかを見るサーバー）で行う
- ヘッドレスの Chromium はスクロールバーを描かない。画像は `loading="lazy"` なので、画面外の画像は
  スクロールしないと読み込まれない
- Gecko の WebDriver で `execute` したスクリプトは特権のある別環境で動く。ページの環境での評価は `window.eval`
- 別エンジンの確認は、この開発環境では WebKitGTK（`WebKitWebDriver` + MiniBrowser、Xvfb）と
  Gecko（`/opt/gecko/geckodriver` + 同じエンジンの別ブラウザー。`MDFOLIO_GECKO_BINARY` で指定）を使った。
  手元の環境では、パスを合わせる必要がある
- 性能テストの 1MB 文書の表示は目標 3 秒に対して 2〜2.4 秒程度で、負荷があると超えることがある

## 未確認・残っていること

- Windows / macOS の実機、Edge、製品版の Firefox / Safari（特に、共有フォルダに置いたフォルダ版）
- スマートフォンの実機
- 公開したページ（Claude のアーティファクト 2 件、1.0.1 のお試し用変換）を、公開先の画面で操作した確認
- GitHub Actions の 2 つの自動実行は、この開発環境では動かせない。初回の実行結果を GitHub の Actions の画面で確かめる
- 利用者が配色を変えた場合のコントラスト（自動検査は既定の配色だけ）
- 依頼者と相談して行わないと決めたもの（1.2.0）: 更新コマンドの Node.js 以外の版、書き出す CSS の指定、配色のコントラストの検査
