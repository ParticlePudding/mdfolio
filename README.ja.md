[English](README.md) | **日本語**

# mdfolio

ブラウザーで Markdown 文書を閲覧できるビューアです。サーバーの用意やアプリのインストールは不要で、Node.js などのツールも必要ありません。

- バージョン: 1.5.0
- 公開ページ: https://particlepudding.github.io/mdfolio/ja/
- 不具合・要望: [Issues](https://github.com/ParticlePudding/mdfolio/issues)

## 使い方

`mdfolio.html`（`dist/` の中）をブラウザーで開き、「フォルダを開く」で Markdown 文書の入ったフォルダを選びます。動作を試すときは、`sample-docs-ja` フォルダを選んでください。

**見た目を変える**: `mdfolio.html` と同じフォルダに `mdfolio.css` を置きます。書き方の例は `examples/mdfolio.css` にあります。

**文書を共有する**: メニュー（⋯）の「サイトとして書き出す」で、フォルダ内の文書を 1 つの HTML ファイルにまとめます。見た目の CSS を含めるときは、書き出しの画面の「CSS を選ぶ」で選びます。

## できること

- 表、コードの色分け、数式、図（Mermaid）、脚注、アラート
- ファイル一覧、目次、全文検索
- ライト／ダーク、日本語／英語、印刷
- ファイルを保存すると自動で再表示（Chrome / Edge）

## 安全性

- 文書は外部に送信しません。
- Markdown 文書に含まれるスクリプトは実行しません。
- インターネット上の画像は、初期設定では読み込みません。

## 主な制約

- 対応する文字コードは UTF-8、UTF-16（BOM 付き）、Shift_JIS です。
- Mermaid のマインドマップとアーキテクチャ図は使えません。
- Firefox / Safari では、「前回のフォルダを開く」と自動再表示は使えません。
- スマートフォンの実機での動作は未確認です。

## 設定

`mdfolio.html` の中の `id="mdv-config"` の行を書き換えると、タイトル、画面の言語、テーマなどの初期設定を変更できます。詳しくは `sample-docs-ja/reference/設定.md` を参照してください。

## 再配布について

- `dist/mdfolio.html` と、Markdown から書き出した HTML は、そのまま再配布できます。著作権表示と許諾表示は HTML の中に含まれます。

## 開発者向け

ビルドとテストには Node.js 20 以降を使います（利用者には必要ありません）。

```
npm run build        # dist/ を作る
npm install          # テストの準備
npm test             # ビルド → 単体テスト → ブラウザーでのテスト
```

書き出しを自動化したいときは、コマンドでも書き出せます。

```
node tools/build-site.mjs <文書フォルダ> --out site.html --title "手順書" --css mdfolio.css
```

仕様は `docs/SPEC.md`、変更履歴は `CHANGELOG.md` にあります（どちらも英語）。ファイルの読み書きはすべて `src/source.js` を通します（`docs/FILE_IO.md`）。

## ライセンス

MIT（`LICENSE`）。同梱ライブラリは `THIRD-PARTY-NOTICES.txt`。
