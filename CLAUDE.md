# mdfolio — Claude Code 向けの引き継ぎメモ

ローカルの HTML / JavaScript だけで動く Markdown 文書ビューア。現在の版は 1.3.1（その後の修正は CHANGELOG の Unreleased）。変更の一覧は `CHANGELOG.md`（英語だけ。日本語版は作らない。依頼者の指示）。
詳しい仕様は `docs/SPEC.md`、設計判断の経緯は `docs/REVIEW.md`、テスト結果は `docs/TEST_REPORT.md`。

## 依頼者について・進め方

- 依頼者とのやり取りと、この引き継ぎメモは日本語。言い回しは平易に（専門用語は避けるか説明する）。
- **mdfolio は日本語の利用者に限らず広く使ってもらうもの**（依頼者の方針）。外から見えるもの（README、公開ページ、変更履歴、
  リリースの説明、About）は**英語が先**。仕様書・レビュー記録・テスト報告書とソースコードのコメントも英語で書く。
  アプリの画面の文言と見本・README・使い方は英語と日本語の両方を保つ。依頼者のほかのプロジェクト（自分用）は日本語でよい。
- 依頼者は「仕様作成 → レビュー → 実装 → テスト」の順で進めることを求めている。動作を変える変更では、
  `docs/SPEC.md`（改訂履歴も）、`docs/REVIEW.md`、`docs/TEST_REPORT.md` を合わせて更新する。
- 確認できていないことは、確認できていないとはっきり書く（実機・実環境で未確認の範囲など）。

## 形と見た目の変え方

配布物は単一 HTML の `dist/mdfolio.html` だけ。1 ファイルを開いてフォルダを選ぶ。書き出し（「サイトとして書き出す」）の出力も同じ形の HTML。
**利用者は Node.js を使わない**（依頼者の確認済み）。Node.js はビルド・テストと、開発者向けのコマンドライン書き出し（`tools/build-site.mjs`）だけ。
利用者向けの説明（README の使い方、見本の文書、公開ページ、使い方）とリリースの zip に、Node.js やコマンドを出さないこと。

- **フォルダ版は 1.3.0 で廃止した**（依頼者と合意。理由と経緯は SPEC 8.6、REVIEW 10 章）。`tools/build-folder.mjs`、`tools/folder/`、
  `dist/mdfolio/`、`library` モード、`window.MDV_DATA` はすべて消した。戻さないこと。
- **見た目は、HTML の隣に置く `mdfolio.css` で変える**（SPEC 3.10）。HTML は常に `<link rel="stylesheet" href="mdfolio.css" id="mdv-user-css">` を持ち、
  内蔵の CSS（`#mdv-style`）→ 埋め込んだ利用者の CSS（`#mdv-user-style`。書き出しで選んだもの）→ 隣の `mdfolio.css` の順に効く。
  例は `examples/mdfolio.css`（公開ページの見た目の見本と、リリースの zip にも入る）。
- **ブラウザーの制約**: `file://` のページは、隣のファイルを「使う」（CSS を効かせる）ことはできるが、中身を読めない（`cssRules` は SecurityError、
  `fetch` は失敗。Chromium で確認）。だから隣の CSS は書き出しに自動では入らない。書き出しの画面の「CSS を選ぶ」で、利用者に選んでもらう
  （選んだファイルは読める）。`http(s)://` で開いて同じ配信元なら読めるので、自動で候補にする。
- **隣の CSS があるかの判定**: ファイルがなくても Chromium は空の style sheet を作り、`<link>` の load / error はアプリのスクリプトより前に
  起きていることがある。そこで起動時に同じファイルを `media="not all"` でもう一度読み込み、その load / error で判断する（`probeUserCss`）。
  このため、隣の `mdfolio.css` への読み込みは最大 2 回起きる。
- CSP の `style-src` は `'self' file: 'unsafe-inline'`（隣の CSS のため）。スクリプトはハッシュだけのまま。img / media / font には file: を入れない。
- テストの道具（`tests/helpers/e2e.mjs` の `watch`）は、隣の `mdfolio.css` への読み込みと、その「見つからない」エラーだけを除外する
  （`record.userCss` に入る）。axe-core は `preload: false` で動かす（スタイルシートを取りに行って CSP に止められるため）。

## コマンド

```
node tools/build.mjs             # dist/mdfolio.html（決定的: 同じソースからは同じバイト列）
npm run build                    # 上と同じ
npm install && npx playwright install chromium   # テストの準備
npm run test:unit                # 単体（node --test）
LANG=C.UTF-8 npm run test:e2e    # Playwright（Chromium）。LANG を付けないと日本語の入力・表示が崩れる
node tools/dev/test-summary.mjs unit|e2e   # 件数・時間・性能値を test-results/ に記録
npm run test:webkit / test:gecko # 別エンジン（WebKitGTK + Xvfb、geckodriver。環境依存。下記）
python3 tools/check-source.py <ファイル…>   # ソースの文字の検査（必ず実行する。下記）
node tools/dev/make-hosted.mjs   # 外部のホスティング環境（Claude のアーティファクト）向けの変換
python3 tools/dev/make-zip.py    # 配布用 zip（日本語のファイル名に UTF-8 の印を付ける。zip コマンドは使わない）
node tools/dev/make-docs-site.mjs  # 説明書（README.md と docs/。英語）を dist/mdfolio-docs.html に書き出す
node tools/dev/make-pages.mjs     # GitHub Pages に置く一式（日本語と英語）を tmp/pages/ に作る。先に npm run build
node tools/dev/make-release.mjs   # リリースの添付（mdfolio.html、zip）と説明を tmp/release/ に作る
```

GitHub: https://github.com/ParticlePudding/mdfolio （公開リポジトリ）。作業は `main`。
公開ページ https://particlepudding.github.io/mdfolio/ は `gh-pages` ブランチから配信する。`main` に送ると
GitHub Actions（`.github/workflows/pages.yml`）が、ビルド → 単体テスト → `make-pages.mjs` → `gh-pages` の置き換えを行う
（手で `gh-pages` に送らない。`.nojekyll` は `make-pages.mjs` が作る）。
版を上げる手順: `package.json`・`package-lock.json`・`src/core.js` の版、README の版、`CHANGELOG.md` に
「## <版> — 日付」の節 → ビルド・テスト → `main` に送る → 依頼者の了承を得て、依頼者が GitHub の Actions の画面で
「Release」→「Run workflow」を押す（この開発環境からはタグを送れない。GitHub が 403 で拒む）。
`.github/workflows/release.yml` がタグ `v<版>` とリリース（`mdfolio.html` と `mdfolio-<版>.zip`、説明は変更履歴から）を作る。
日本語と英語の両対応（SPEC 8.7）: 見本文書は `sample-docs/` と `sample-docs-en/`、README は英語が `README.md`、日本語が `README.ja.md`（GitHub で最初に出る README は英語。依頼者の指示）。
片方を変えたらもう片方も直す（構成とリンクは `tests/unit/samples.test.mjs` が確かめる）。英語の文書で画面の部品を書くときは
`src/i18n.js` の `en` の言葉を使う。仕様書・レビュー記録・テスト報告書は英語だけ。
著作権者名は「Particle Pudding」（`LICENSE`。HTML に埋め込まれるので、変えたら作り直す）。

テストは `dist/` を読むので、`src/` を変えたら必ずビルドし直してから実行する。

## 構成の要点

- `src/core.js` 画面に依存しない処理（パス、リンク解決、設定、サイトデータ、HTML の組み立て `composeHtml` / `extractParts`）
- `src/md.js` Markdown の拡張、`src/i18n.js` 文言（ja / en のキーは一致させる。テストで検査）
- `src/app.js` 画面。`src/app.css` 画面の部品、`src/document.css` 本文と配色（内蔵の見た目。利用者は編集せず、隣の `mdfolio.css` で上書きする）
- 単一 HTML は、スクリプトを CSP のハッシュで限定している。HTML のスクリプト部分を手で書き換えると動かない
- データの受け渡し: `<script type="application/json" id="mdv-…">`（`readJsonBlock`）
- 動作モード: `viewer`（フォルダを選ぶ）/ `site`（書き出した HTML）
- `core.extractParts` は `<head>` の中だけで `#mdv-user-style` を探す（スクリプトの本文にも同じ文字列があるため）
- 設定（`mdv-config`）: `allowDownloads` / `lockExternalImages` / `hosted` は埋め込み・公開ページ用
- 数式（KaTeX）と図（Mermaid）は必要になったときに、埋め込みから同期的に読み込む（`ensureLib`）
- 図の配色は CSS の変数（`--accent` など）から取る

## 利用者評価（2026-11-18）とその対応

- 職種の違う 20 人の評価者（エージェント）に 1.3.1 を使ってもらった。平均 3.85 / 5、致命的な問題なし。
  確認できた指摘は REVIEW 11 章（G-1〜G-14）、仕様は SPEC 3.11（FR-1101〜FR-1113）、テストは `tests/e2e/fixes.e2e.mjs`。
- FR-1106（`**1.8%**の` のような日本語の隣の太字）は、依頼者の了承を得て markdown-it-cjk-friendly（MIT）を同梱して対応した。
  ES モジュールでしか配られていないので、`tools/vendor.mjs` が esbuild（開発用。配布物には入らない）で 1 本のスクリプトにまとめる。
- 機能の要望として見送ったもの（REVIEW 11 章に一覧）: 全文書の印刷、PDF へのリンク、リンク切れの検査、語形変化の検索、図の拡大、
  被リンク、前後の文書へのリンク、書き出す文書の選択、コードの行番号・折り返し、表の見出しの固定、チェックリストの操作、文書ごとの言語、EUC-JP。
- サイトの題名は 設定の title → ホーム文書の題名 → フォルダ名。ファイル一覧のラベルは文書の題名（テストではリンクを `data-path` で探す）。
- 外部画像の許可は HTML ごと（`mdv:external:<ページのパス>`）。`file://` のページは Chromium では保存場所を共有するため。

## はまりどころ

- 編集ツールが `\uXXXX` を実際の文字に変えてしまうことがある。編集のたびに `tools/check-source.py` を実行する。
  置換文字 U+FFFD はソースに直接書かない（公開先が受け付けない。必要なら `String.fromCharCode(0xFFFD)`）
- `file://` のページは、隣のファイルを `fetch()` で読めず、`<link>` の CSS の中身も読めない（上の「ブラウザーの制約」）
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

- Windows / macOS の実機、Edge、製品版の Firefox / Safari（隣の `mdfolio.css` の読み込みを含む）
- スマートフォンの実機
- 公開したページ（Claude のアーティファクト 2 件、1.0.1 のお試し用変換）を、公開先の画面で操作した確認
- GitHub Actions の 2 つの自動実行は、どちらも GitHub 上で成功を確認済み（公開ページの更新、1.2.0 のリリース）。リリースの「Run workflow」は
  1 回だけ押してもらう（2 回押すと、後の方が「もうある」で失敗する。害はない）。
  この開発環境からは動かせないので、結果は GitHub の API（`/repos/ParticlePudding/mdfolio/actions/runs`。認証なしで読める）で確かめる
- 利用者が配色を変えた場合のコントラスト（自動検査は既定の配色だけ）
- 依頼者と相談して行わないと決めたもの: 配色のコントラストの検査（1.2.0）。「書き出す CSS の指定」は 1.2.0 で見送ったが、1.3.0 で
  フォルダ版の廃止にあわせて「CSS を選んで埋め込む」形で入れた。「更新コマンドの Node.js 以外の版」はフォルダ版の廃止で不要になった
- 別エンジン（WebKit / Gecko）の確認（`tests/cross/smoke.mjs`）は、1.3.0 で `mdfolio.css` の項目に書き換えたが、この開発環境では動かしていない
- 編集機能は入れない（依頼者と合意。書くのは別のエディター、mdfolio は読む・配る専用。保存すると自動で再表示する既存の機能で連携する）
