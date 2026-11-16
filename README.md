**日本語** | [English](README.en.md)

# mdfolio

ブラウザーだけで読める Markdown 文書ビューアです。サーバーもインストールも要りません。

- バージョン: 1.2.0
- 公開ページ: https://particlepudding.github.io/mdfolio/
- 不具合・要望: [Issues](https://github.com/ParticlePudding/mdfolio/issues)

## 2 つの形

| 形 | 使い方 |
|---|---|
| 単一 HTML 版（`dist/mdfolio.html`） | 開いて、読みたいフォルダを選ぶ |
| フォルダ版（`dist/mdfolio/`） | 共有フォルダなどに置き、`index.html` を開くと `docs/` の文書が出る。見た目は `style/document.css` で変える |

## 使い方

**単一 HTML 版**: `mdfolio.html` を開き、「フォルダを開く」でフォルダを選びます。試すなら `sample-docs` を開いてください。

**フォルダ版**: `docs/` に文書を置き、`node tools/update.mjs` を実行してから `index.html` を開きます。文書や CSS を変えたら、もう一度実行します（Node.js 20 以降）。

**人に渡す**: メニュー（⋯）の「サイトとして書き出す」で、文書を 1 つの HTML にまとめられます。zip に入れて渡してください。コマンドでも書き出せます。

```
node tools/build-site.mjs <文書フォルダ> --out site.html --title "手順書"
```

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

```
npm run build        # dist/ を作る
npm install          # テストの準備
npm test             # ビルド → 単体テスト → ブラウザーでのテスト
```

仕様は `docs/SPEC.md`、変更履歴は `CHANGELOG.md` にあります。

## ライセンス

MIT（`LICENSE`）。同梱ライブラリは `THIRD-PARTY-NOTICES.txt`。
