/*!
 * mdfolio i18n — UI text (Japanese and English)
 * MIT License
 */
(function (root) {
  'use strict';

  var ja = {
    skipToContent: '本文へ移動',
    toggleSidebar: 'サイドバーを開閉',
    homeLink: 'ホームへ移動',
    menu: 'メニュー',

    welcomeTitle: 'Markdown のフォルダを、そのままサイトとして読む。',
    welcomeLead: 'フォルダを選ぶか、この画面にドロップしてください。ファイルはこの端末の中だけで処理され、外部には送信されません。',
    welcomeLeadTouch: 'フォルダかファイルを選んでください。ファイルはこの端末の中だけで処理され、外部には送信されません。',
    welcomeLeadHosted: 'フォルダを選ぶか、この画面にドロップしてください。ここは動作確認用の公開ページです。機密の文書は、手元に保存した配布版の HTML ファイルで開いてください。',
    welcomeLeadHostedTouch: 'フォルダかファイルを選んでください。ここは動作確認用の公開ページです。機密の文書は、手元に保存した配布版の HTML ファイルで開いてください。',
    helpHostedNote: 'ここは動作確認用の公開ページです。サイトとしての書き出し、添付ファイルの保存、外部の画像の表示は使えません。すべての機能は、手元に保存した配布版の HTML ファイルで使えます。',
    openFolder: 'フォルダを開く',
    openFiles: 'ファイルを開く',
    reopenLast: '前回のフォルダを開く（{0}）',
    pendingRoute: 'フォルダを開くと「{0}」を表示します。',
    howTo: '使い方を見る',
    dropHere: 'ここにドロップして開く',

    searchLabel: '文書を検索',
    searchPlaceholder: '文書を検索',
    searchCount: '{0} 件',
    searchCountMore: '{0} 件中、上位 {1} 件を表示',
    searchResults: '検索結果',
    searchNone: '「{0}」に一致する文書はありません',
    searchIndexing: '索引を作成中 {0} / {1}',

    themeLight: 'テーマ: ライト（押すとダークに切り替え）',
    themeDark: 'テーマ: ダーク（押すとライトに切り替え）',

    menuOpenFolder: 'フォルダを開く',
    menuOpenFiles: 'ファイルを開く',
    menuReload: '再読み込み',
    menuExport: 'サイトとして書き出す',
    menuExternalImages: '外部の画像を表示する',
    menuLanguage: 'Display in English',
    menuHelp: '使い方',
    menuAbout: 'ライセンスとバージョン',

    sidebarLabel: '文書一覧',
    tabNav: 'ナビ',
    tabFiles: 'ファイル',
    tocTitle: 'このページの目次',

    updated: '更新 {0}',
    anchorLabel: '「{0}」へのリンク',
    copy: 'コピー',
    copied: 'コピーしました',
    copyFailed: 'コピーできませんでした',
    copyLabel: 'コードをコピー',
    codePlain: 'テキスト',
    tableLabel: '表（横にスクロールできます）',
    codeScrollLabel: 'コード（横にスクロールできます）',
    mathScrollLabel: '数式（横にスクロールできます）',
    diagramScrollLabel: '図（横にスクロールできます）',
    taskDone: '完了した項目',
    taskTodo: '未完了の項目',

    imgMissing: '画像が見つかりません: {0}',
    imgMissingSingle: '画像を表示できません: {0}（フォルダとして開くと表示できます）',
    imgBlocked: '外部の画像は表示していません: {0}',
    mediaMissing: 'メディアが見つかりません: {0}',
    mediaBlocked: '外部のメディアは表示していません: {0}',
    linkMissing: 'リンク先が見つかりません: {0}',

    notFoundTitle: 'この文書は見つかりません',
    notFoundBody: '「{0}」は、開いている文書の中にありません。リンク元の記述か、ファイル名を確認してください。',
    goHome: 'ホームへ移動',
    assetTitle: '添付ファイル',
    assetBody: '「{0}」は Markdown 文書ではないため、ここには表示しません。',
    assetNoSave: '「{0}」は添付ファイルです。この表示環境では、ファイルを保存できません。',
    download: 'ダウンロード',
    plainNotice: 'この文書は 10MB を超えるため、変換せずにテキストとして表示しています。',
    mathUnavailable: '数式を表示できません（この HTML には数式ライブラリが含まれていません）',
    mermaidUnavailable: '図を表示できません（この HTML には図のライブラリが含まれていません）',
    mermaidError: '図の記述に誤りがあります',

    scanning: 'フォルダを読み込んでいます… {0} 件',
    noDocs: 'Markdown 文書が見つかりませんでした。名前が .md で終わるファイルの入ったフォルダを選んでください（作り方はメニューの「使い方」にあります）',
    limitDocs: '文書が {0} 件を超えたため、超えた分は読み込んでいません',
    limitEntries: 'ファイルとフォルダが {0} 件を超えたため、途中で読み込みを打ち切りました',
    readFailed: '「{0}」を読み込めませんでした',
    readChanged: 'ファイルが変更されたため再読み込みできません。フォルダを開き直してください',
    permissionDenied: 'フォルダへのアクセスが許可されませんでした',
    lastFolderGone: '前回のフォルダを開けませんでした。フォルダを選び直してください',
    lastFolderFailed: '前回のフォルダを開けませんでした。少し待ってから、もう一度お試しください',
    folderGone: 'フォルダを読み込めませんでした。移動・削除されたか、アクセスが許可されていません。フォルダを開き直してください',
    skippedItems: '読み込めなかったフォルダまたはファイルが {0} 件あります（表示していません）',
    reloaded: '再読み込みしました',
    siteDataError: '埋め込まれた文書データを読み込めませんでした',
    errorGeneric: '処理中にエラーが発生しました: {0}',

    exportTitle: 'サイトとして書き出す',
    exportLead: '開いている文書を 1 つの HTML ファイルにまとめます。受け取った人は、そのファイルを開くだけで読めます。',
    exportSiteTitle: 'サイトのタイトル',
    exportHome: '最初に表示する文書',
    exportCssLabel: '見た目（CSS）',
    exportCssStatus: '埋め込む CSS: {0}',
    exportCssNone: '埋め込む CSS: なし（内蔵の見た目で書き出します）',
    exportCssPicked: '{0}（選んだファイル）',
    exportCssAdjacent: '隣の mdfolio.css',
    exportCssInherited: 'この HTML に埋め込まれている CSS',
    exportCssPick: 'CSS を選ぶ…',
    exportCssClear: '埋め込まない',
    exportCssAdjacentNote: '隣の mdfolio.css は画面に効いていますが、書き出しには入りません（ブラウザーの制約で中身を読めないため）。入れるには「CSS を選ぶ」で同じファイルを選んでください。',
    exportCssTooLarge: '{0} は大きすぎます（1MB まで）',
    exportCssBad: '{0} には「</style」という文字列があるため、埋め込めません',
    exportPreparing: '書き出す内容を確認しています…',
    exportSummary: '文書 {0} 件、添付 {1} 件。ファイルサイズは約 {2} です。',
    exportSkipped: '20MB を超える、または読み込めない添付 {0} 件は含めません。',
    exportUnreadable: '読み込めなかった文書 {0} 件は含めません。',
    exportLarge: 'ファイルサイズが 100MB を超えます。開くのに時間がかかることがあります。',
    exportDo: '書き出す',
    exported: '書き出しました: {0}',
    exportFailed: '書き出せませんでした: {0}',
    cancel: 'キャンセル',
    close: '閉じる',

    externalTitle: '外部の画像を表示しますか',
    externalLead: '表示すると、画像や動画の配信元のサーバーに接続します。設定を切り替えるために、ページを再読み込みします。',
    externalLeadFolder: '再読み込みすると、開いているフォルダは閉じます。再読み込みのあとで、もう一度開いてください。',
    externalDo: '表示して再読み込み',
    externalNoStorage: 'このブラウザーでは設定を保存できないため、外部の画像を表示できません',

    aboutTitle: 'ライセンスとバージョン',
    aboutLead: '{0} バージョン {1}。この HTML ファイルに含まれるソフトウェアのライセンスは次のとおりです。',
    helpTitle: '使い方',

    alertNote: '補足',
    alertTip: 'ヒント',
    alertImportant: '重要',
    alertWarning: '警告',
    alertCaution: '注意'
  };

  var en = {
    skipToContent: 'Skip to content',
    toggleSidebar: 'Toggle sidebar',
    homeLink: 'Go to home page',
    menu: 'Menu',

    welcomeTitle: 'Browse a folder of Markdown files as a website.',
    welcomeLead: 'Choose a folder, or drop one onto this window. Files are processed on this device only and are never sent anywhere.',
    welcomeLeadTouch: 'Choose a folder or files. Files are processed on this device only and are never sent anywhere.',
    welcomeLeadHosted: 'Choose a folder, or drop one onto this window. This is a public page for trying out the viewer. For confidential documents, use a copy of the HTML file saved on your own device.',
    welcomeLeadHostedTouch: 'Choose a folder or files. This is a public page for trying out the viewer. For confidential documents, use a copy of the HTML file saved on your own device.',
    helpHostedNote: 'This is a public page for trying out the viewer. Exporting a site, saving attachments and showing external images are not available here. Every feature works in a copy of the HTML file saved on your own device.',
    openFolder: 'Open folder',
    openFiles: 'Open files',
    reopenLast: 'Reopen last folder ({0})',
    pendingRoute: 'Open the folder to view "{0}".',
    howTo: 'How to use',
    dropHere: 'Drop here to open',

    searchLabel: 'Search documents',
    searchPlaceholder: 'Search documents',
    searchCount: '{0} {0:result|results}',
    searchCountMore: 'Showing top {1} of {0} results',
    searchResults: 'Search results',
    searchNone: 'No documents match "{0}"',
    searchIndexing: 'Indexing {0} / {1}',

    themeLight: 'Theme: light (press for dark)',
    themeDark: 'Theme: dark (press for light)',

    menuOpenFolder: 'Open folder',
    menuOpenFiles: 'Open files',
    menuReload: 'Reload',
    menuExport: 'Export as site',
    menuExternalImages: 'Show external images',
    menuLanguage: '日本語で表示',
    menuHelp: 'How to use',
    menuAbout: 'Licenses and version',

    sidebarLabel: 'Documents',
    tabNav: 'Nav',
    tabFiles: 'Files',
    tocTitle: 'On this page',

    updated: 'Updated {0}',
    anchorLabel: 'Link to "{0}"',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Could not copy',
    copyLabel: 'Copy code',
    codePlain: 'text',
    tableLabel: 'Table (scrolls horizontally)',
    codeScrollLabel: 'Code (scrolls horizontally)',
    mathScrollLabel: 'Formula (scrolls horizontally)',
    diagramScrollLabel: 'Diagram (scrolls horizontally)',
    taskDone: 'Completed item',
    taskTodo: 'Incomplete item',

    imgMissing: 'Image not found: {0}',
    imgMissingSingle: 'Cannot display image: {0} (open the folder to view it)',
    imgBlocked: 'External image blocked: {0}',
    mediaMissing: 'Media not found: {0}',
    mediaBlocked: 'External media blocked: {0}',
    linkMissing: 'Link target not found: {0}',

    notFoundTitle: 'This document was not found',
    notFoundBody: '"{0}" is not among the open documents. Check the link or the file name.',
    goHome: 'Go to home page',
    assetTitle: 'Attachment',
    assetBody: '"{0}" is not a Markdown document, so it is not shown here.',
    assetNoSave: '"{0}" is an attachment. Files cannot be saved in this environment.',
    download: 'Download',
    plainNotice: 'This document is larger than 10 MB, so it is shown as plain text without conversion.',
    mathUnavailable: 'Cannot show math (this HTML does not include the math library)',
    mermaidUnavailable: 'Cannot show the diagram (this HTML does not include the diagram library)',
    mermaidError: 'The diagram has a syntax error',

    scanning: 'Scanning folder… {0} items',
    noDocs: 'No Markdown documents were found. Choose a folder that contains files whose names end in .md ("How to use" in the menu explains how to make one)',
    limitDocs: 'More than {0} documents; the rest were not loaded',
    limitEntries: 'More than {0} files and folders; scanning stopped.',
    readFailed: 'Could not read "{0}"',
    readChanged: 'The file has changed and cannot be reloaded. Open the folder again.',
    permissionDenied: 'Permission to access the folder was denied',
    lastFolderGone: 'Could not reopen the last folder. Please choose it again.',
    lastFolderFailed: 'Could not reopen the last folder. Please wait a moment and try again.',
    folderGone: 'Could not read the folder. It may have been moved or deleted, or access is no longer allowed. Open the folder again.',
    skippedItems: '{0} {0:folder or file|folders or files} could not be read and {0:is|are} not shown',
    reloaded: 'Reloaded',
    siteDataError: 'Could not read the embedded documents',
    errorGeneric: 'Something went wrong: {0}',

    exportTitle: 'Export as site',
    exportLead: 'Packages the open documents into a single HTML file. Recipients only need to open that file to read them.',
    exportSiteTitle: 'Site title',
    exportHome: 'First document to show',
    exportCssLabel: 'Appearance (CSS)',
    exportCssStatus: 'CSS to embed: {0}',
    exportCssNone: 'CSS to embed: none (the built-in look is used)',
    exportCssPicked: '{0} (chosen file)',
    exportCssAdjacent: 'mdfolio.css next to this file',
    exportCssInherited: 'CSS embedded in this HTML file',
    exportCssPick: 'Choose CSS…',
    exportCssClear: 'Do not embed',
    exportCssAdjacentNote: 'mdfolio.css next to this file is applied on screen, but it is not included in the export (the browser does not allow reading its contents). To include it, choose the same file with "Choose CSS".',
    exportCssTooLarge: '{0} is too large (1 MB maximum)',
    exportCssBad: '{0} contains the text "</style", so it cannot be embedded',
    exportPreparing: 'Checking what to export…',
    exportSummary: '{0} {0:document|documents}, {1} {1:attachment|attachments}. File size is about {2}.',
    exportSkipped: '{0} {0:attachment|attachments} will not be included (over 20 MB or unreadable).',
    exportUnreadable: '{0} unreadable {0:document|documents} will not be included.',
    exportLarge: 'The file will be over 100 MB and may take time to open.',
    exportDo: 'Export',
    exported: 'Exported: {0}',
    exportFailed: 'Could not export: {0}',
    cancel: 'Cancel',
    close: 'Close',

    externalTitle: 'Show external images?',
    externalLead: 'The page will contact the servers hosting those images and videos. The page will reload to apply the setting.',
    externalLeadFolder: 'Reloading closes the open folder. Open it again after the page reloads.',
    externalDo: 'Show and reload',
    externalNoStorage: 'Cannot show external images because browser storage is unavailable',

    aboutTitle: 'Licenses and version',
    aboutLead: '{0} version {1}. Licenses for the software included in this HTML file:',
    helpTitle: 'How to use',

    alertNote: 'Note',
    alertTip: 'Tip',
    alertImportant: 'Important',
    alertWarning: 'Warning',
    alertCaution: 'Caution'
  };

  function detect(nav) {
    var langs = (nav && (nav.languages && nav.languages.length ? nav.languages : [nav.language])) || [];
    for (var i = 0; i < langs.length; i++) {
      var l = String(langs[i] || '').toLowerCase();
      if (l.indexOf('ja') === 0) return 'ja';
      if (l.indexOf('en') === 0) return 'en';
    }
    return 'en';
  }

  /** Get a message and replace {0} {1} … with the arguments. */
  function translate(lang, key, args) {
    var table = lang === 'ja' ? ja : en;
    var s = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : (Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key);
    if (args && args.length) {
      // {0:item|items} becomes the first word when {0} is 1 and the second word otherwise (English singular/plural)
      s = s.replace(/\{(\d+):([^|{}]*)\|([^{}]*)\}/g, function (m, n, one, many) { return args[n] === undefined ? m : (Number(args[n]) === 1 ? one : many); });
      s = s.replace(/\{(\d+)\}/g, function (m, n) { return args[n] === undefined ? m : String(args[n]); });
    }
    return s;
  }

  var api = { ja: ja, en: en, detect: detect, translate: translate };
  root.MDV = root.MDV || {};
  root.MDV.i18n = api;
  if (typeof module === 'object' && module && module.exports) { module.exports = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
