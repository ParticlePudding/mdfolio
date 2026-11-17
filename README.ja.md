[English](README.md) | **日本語**

# mdfolio

ブラウザーだけで読める Markdown 文書ビューアです。サーバーもインストールも、Node.js などのツールも要りません。

- バージョン: 1.3.0
- 公開ページ: https://particlepudding.github.io/mdfolio/ja/
- 不具合・要望: [Issues](https://github.com/ParticlePudding/mdfolio/issues)

## 使い方

`mdfolio.html`（`dist/` の中）を開き、「フォルダを開く」でフォルダを選びます。試すなら `sample-docs` を開いてください。

**見た目を変える**: `mdfolio.html` と同じフォルダに `mdfolio.css` を置きます。例は `examples/mdfolio.css` です。

**人に渡す**: メニュー（⋯）の「サイトとして書き出す」で、文書を 1 つの HTML にまとめられます。見た目の CSS は、書き出しの画面の「CSS を選ぶ」で入れます。zip に入れて渡してください。

## できること

- 表、コードの色分け、数式、図（Mermaid）、脚注、アラート
- ファイル一覧、目次、全文検索
- ライト／ダーク、日本語／英語、印刷
- ファイルを保存すると自動で再表示（Chrome / Edge）

## 安全性

- 文書は外部に送信しません。
- 文書の中のスクリプトは実行しません。
- インターネット上の画像は、初期設定では読み込みません。

## 主な制約

- 文字コードは UTF-8、UTF-16（BOM 付き）、Shift_JIS だけです。
- Mermaid のマインドマップとアーキテクチャ図は使えません。
- Firefox / Safari では、「前回のフォルダを開く」と自動再表示は使えません。
- スマートフォンの実機では確認していません。

## 設定

HTML の中の `id="mdv-config"` の行で、タイトル、言語、テーマなどを変えられます。詳しくは `sample-docs/reference/設定.md` を見てください。

## 再配布について

- `dist/mdfolio.html` と、そこから書き出したサイトの HTML は、そのまま再配布できます。必要な著作権表示と許諾表示は HTML の中に入っています。

## 開発者向け

ビルドとテストには Node.js 20 以降を使います（利用者には要りません）。

```
npm run build        # dist/ を作る
npm install          # テストの準備
npm test             # ビルド → 単体テスト → ブラウザーでのテスト
```

書き出しを自動化したいときは、コマンドでも書き出せます。

```
node tools/build-site.mjs <文書フォルダ> --out site.html --title "手順書" --css mdfolio.css
```

仕様は `docs/SPEC.md`、変更履歴は `CHANGELOG.md` にあります（どちらも英語）。

## ライセンス

MIT（`LICENSE`）。同梱ライブラリは `THIRD-PARTY-NOTICES.txt`。
