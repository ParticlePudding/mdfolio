# mdfolio サンプル文書

mdfolio の動作を確かめるためのサンプルです。左の一覧（狭い画面では、左上の ≡ ボタンで開きます）から文書を選ぶか、次のリンクから読み進めてください。

- [基本操作](guide/基本操作.md): 開く・読む・探す
- [Markdown 記法](guide/Markdown記法.md): 表示できる記法の一覧
- [配布方法](guide/配布方法.md): 1 つの HTML にまとめて渡す
- [設定](reference/設定.md) と [制限事項](reference/制限事項.md)

![フォルダを開いて、読んで、書き出すまでの流れ](images/overview.svg)

## このサンプルで試せること

| 試すこと | 見る場所 |
|---|---|
| 文書間のリンクと「戻る」「進む」 | このページのリンク |
| 全文検索 | 上部の検索欄に「書き出し」や「ｍｅｒｍａｉｄ」と入力する |
| 数式・図・コードの表示 | [Markdown 記法](guide/Markdown記法.md) |
| サイドバーの並びの指定 | このフォルダの `_sidebar.md` |
| 添付ファイルのダウンロード | [サンプルデータ（CSV）](files/sample-data.csv) |

## フォルダの構成

```text
sample-docs/
├── README.md            このページ
├── _sidebar.md          サイドバーの「ナビ」の内容
├── guide/               使い方
├── reference/           設定と制限事項
├── images/              画像
└── files/               添付ファイル
```
