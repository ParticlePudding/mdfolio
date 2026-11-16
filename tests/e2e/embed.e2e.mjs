// 保存や外部の読み込みができない環境に置く場合の設定（FR-701: allowDownloads / lockExternalImages）と、
// サンドボックス化されたフレームの中での動作。
// 後半は、ページを別オリジンのフレームに入れて表示するホスティング環境を模している:
//   親ページ → <iframe sandbox>（ダウンロード・ポップアップのダイアログ・最上位の移動は不可）→ ページ
//   ページ側のサーバーは、画像を data: / blob: に限る CSP を付け、<head> の先頭に独自のスクリプトを差し込む。
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  launchBrowser, watch, withPage, loadFolder, fixture, heading, hash, waitHeading, waitIndexed, goTo, clickMenu, openMenu,
  tmpDir, writeTree, startSink, viewerWithConfig, ROOT, VIEWER
} from '../helpers/e2e.mjs';
import { core } from '../helpers/load.mjs';

let browser;
let sink;
before(async () => { browser = await launchBrowser(); sink = await startSink(); });
after(async () => { await browser.close(); await sink.close(); });

const menuActions = (target) => target.evaluate(() => Array.from(document.querySelectorAll('.mdv-menu-item')).filter((b) => !b.hidden).map((b) => b.getAttribute('data-action')));
const SAMPLE_DOCS = path.join(ROOT, 'sample-docs');

describe('保存を使わない設定（allowDownloads: false）', () => {
  test('書き出しを出さない。添付は保存せず、保存できないことを伝える', async () => {
    await withPage(browser, { url: viewerWithConfig({ allowDownloads: false }) }, async ({ page }) => {
      let downloads = 0;
      page.on('download', () => { downloads++; });
      await loadFolder(page, fixture('site'));
      await openMenu(page);
      assert.deepEqual(await menuActions(page), ['menuOpenFolder', 'menuOpenFiles', 'menuReload', 'menuExternalImages', 'menuLanguage', 'menuHelp', 'menuAbout']);
      await page.keyboard.press('Escape');
      // 添付へのリンクは、保存を始めずに説明のページへ移動する
      await page.click('.mdv-prose a:has-text("添付 CSV")');
      await page.waitForSelector('.mdv-empty');
      assert.equal(await hash(page), '#/assets/data.csv');
      assert.equal(await page.textContent('.mdv-empty-body'), '「data.csv」は添付ファイルです。この表示環境では、ファイルを保存できません。');
      assert.equal(await page.locator('.mdv-download').count(), 0, '押しても動かないボタンは出さない');
      await page.waitForTimeout(300);
      assert.equal(downloads, 0);
      // 戻れば元の文書
      await page.goBack();
      await waitHeading(page, 'テスト用サイト');
    });
  });

  test('既定（true）では、これまでどおり保存できる', async () => {
    await withPage(browser, { url: viewerWithConfig({}) }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await openMenu(page);
      assert.ok((await menuActions(page)).includes('menuExport'));
      await page.keyboard.press('Escape');
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('.mdv-prose a:has-text("添付 CSV")')]);
      assert.equal(download.suggestedFilename(), 'data.csv');
    });
  });
});

describe('外部の画像を常に読み込まない設定（lockExternalImages: true）', () => {
  test('切り替えの項目を出さない。保存済みの「表示する」設定や allowExternalImages より優先する', async () => {
    sink.hits.length = 0;
    const dir = writeTree(tmpDir(), { 'README.md': `# 固定の確認\n\n![外部画像](${sink.origin}/external.png)\n` });
    const init = () => { try { localStorage.setItem('mdv:settings:v1', JSON.stringify({ externalImages: true })); } catch (e) { /* 無視 */ } };
    await withPage(browser, { url: viewerWithConfig({ lockExternalImages: true, allowExternalImages: true }), init, allowErrors: true }, async ({ page, record }) => {
      assert.equal(await page.evaluate(() => window.MDV.app.state.mediaLocked), true, '起動時から CSP でも止めている');
      await loadFolder(page, dir);
      assert.ok((await page.textContent('.mdv-prose')).includes('外部の画像は表示していません'));
      assert.equal(await page.locator('.mdv-prose img').count(), 0);
      await openMenu(page);
      assert.deepEqual(await menuActions(page), ['menuOpenFolder', 'menuOpenFiles', 'menuReload', 'menuExport', 'menuLanguage', 'menuHelp', 'menuAbout']);
      // 矢印キーでの移動は、出していない項目を飛ばす
      await page.keyboard.press('End');
      for (const expected of ['menuHelp', 'menuLanguage', 'menuExport']) {
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-action')), expected);
      }
      await page.keyboard.press('Escape');
      assert.deepEqual(sink.paths(), []);
      assert.deepEqual(record.errors, []);
      // 書き出したサイトにも引き継がれる
      await clickMenu(page, 'menuExport');
      await page.waitForSelector('dialog.mdv-dialog-export[open]');
      await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('.mdv-export-run')]);
      const out = path.join(tmpDir(), 'locked-site.html');
      await download.saveAs(out);
      const parts = core.extractParts(fs.readFileSync(out, 'utf8'));
      const config = JSON.parse(core.findBlock(parts, 'mdv-config').text);
      assert.equal(config.lockExternalImages, true);
      assert.equal(config.allowDownloads, true);
    });
  });
});

describe('お試し用の公開ページの表示（hosted: true）', () => {
  test('指定がなければ、開始画面と使い方はこれまでどおり。書き出した HTML には引き継がない', async () => {
    await withPage(browser, async ({ page }) => {
      assert.equal(await page.textContent('.mdv-welcome-lead'), 'フォルダを選ぶか、この画面にドロップしてください。ファイルはこの端末の中だけで処理され、外部には送信されません。');
      await clickMenu(page, 'menuHelp');
      await page.waitForFunction(() => window.MDV.app.state.view === 'help');
      assert.equal(await page.locator('.mdv-prose .markdown-alert-important').count(), 0);
    });
    await withPage(browser, { url: viewerWithConfig({ hosted: true }) }, async ({ page }) => {
      assert.ok((await page.textContent('.mdv-welcome-lead')).includes('ここは動作確認用の公開ページです'));
      await loadFolder(page, fixture('site'));
      await clickMenu(page, 'menuExport');
      await page.waitForSelector('dialog.mdv-dialog-export[open]');
      await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('.mdv-export-run')]);
      const out = path.join(tmpDir(), 'site.html');
      await download.saveAs(out);
      const config = JSON.parse(core.findBlock(core.extractParts(fs.readFileSync(out, 'utf8')), 'mdv-config').text);
      assert.equal(config.hosted, false);
    });
  });

  test('英語の画面でも、同じ内容を伝える', async () => {
    await withPage(browser, { url: viewerWithConfig({ hosted: true }), locale: 'en-US' }, async ({ page }) => {
      assert.equal(await page.textContent('.mdv-welcome-lead'), 'Choose a folder, or drop one onto this window. This is a public page for trying out the viewer. For confidential documents, use a copy of the HTML file saved on your own device.');
      await clickMenu(page, 'menuHelp');
      await page.waitForFunction(() => window.MDV.app.state.view === 'help');
      assert.ok((await page.textContent('.mdv-prose > h1 + .markdown-alert-important')).includes('are not available here'));
    });
  });
});

describe('サンドボックス化されたフレームの中での動作', () => {
  const HOST_CSP = [
    "default-src 'none'", "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'unsafe-inline' https://fonts.googleapis.com", 'font-src data: https://fonts.gstatic.com', 'img-src data: blob:', 'media-src data: blob:',
    "connect-src 'none'", 'worker-src blob:', "frame-src 'none'", "object-src 'none'", "form-action 'none'", "base-uri 'none'"
  ].join('; ');
  // ホスティング側が差し込むスクリプトの代わり。ページがこれを止めてしまわないことを確かめる
  const RUNTIME = '<script>window.__hostRuntime = 1; window.claude = { use: function () { return Promise.resolve(null); } };</script>';
  const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups';

  let dir;
  let hostedSample;
  let hostedViewer;
  let plainSample;
  before(() => {
    dir = tmpDir();
    plainSample = path.join(dir, 'sample-site.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), SAMPLE_DOCS, '--out', plainSample, '--title', 'mdfolio サンプル文書'], { cwd: ROOT });
    hostedSample = path.join(dir, 'hosted-sample.html');
    hostedViewer = path.join(dir, 'hosted-viewer.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/dev/make-hosted.mjs'), plainSample, hostedSample], { cwd: ROOT });
    execFileSync(process.execPath, [path.join(ROOT, 'tools/dev/make-hosted.mjs'), VIEWER, hostedViewer], { cwd: ROOT });
  });

  /** 親ページと、ページ本体を配信するサーバー（別オリジン）を立てて、フレームの中のページを返す。 */
  async function openInFrame(file, options = {}) {
    let html = fs.readFileSync(file, 'utf8').replace('<head>\n', '<head>\n' + RUNTIME + '\n');
    // nonce 方式で配信する環境の代わり: すべての script / style に nonce を付ける
    if (options.nonce) html = html.replace(/<(script|style)\b/g, `<$1 nonce="${options.nonce}"`);
    const inner = http.createServer((req, res) => {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('content-security-policy', options.csp || HOST_CSP);
      res.end(html);
    });
    await new Promise((resolve) => inner.listen(0, '127.0.0.1', resolve));
    const innerUrl = `http://127.0.0.1:${inner.address().port}/page`;
    const outer = http.createServer((req, res) => {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>host</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style></head><body><iframe id="page" sandbox="${options.sandbox || SANDBOX}" src="${innerUrl}"></iframe></body></html>`);
    });
    await new Promise((resolve) => outer.listen(0, 'localhost', resolve));
    const context = await browser.newContext({ locale: 'ja-JP', viewport: options.viewport || { width: 1280, height: 860 }, acceptDownloads: true });
    // テストで結果を確かめるため、親ページにだけクリップボードの読み取りを許可する（フレームには何も許可しない）
    await context.grantPermissions(['clipboard-read'], { origin: `http://localhost:${outer.address().port}` });
    const page = await context.newPage();
    const record = watch(page);
    const downloads = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));
    await page.goto(`http://localhost:${outer.address().port}/`);
    const frame = await (await page.waitForSelector('#page')).contentFrame();
    await frame.waitForSelector('.mdv-app');
    const close = async () => { await context.close(); await new Promise((r) => inner.close(r)); await new Promise((r) => outer.close(r)); };
    return { page, frame, record, downloads, close, innerUrl };
  }

  const frameHeading = (frame, text) => frame.waitForFunction((t) => { const h = document.querySelector('.mdv-doc:not([hidden]) .mdv-prose h1'); return !!h && h.textContent.indexOf(t) >= 0; }, text);

  test('サンプルを表示するページ: 画像・数式・図・検索・移動が使え、動かない操作は出さない', async () => {
    const { page, frame, record, downloads, close } = await openInFrame(hostedSample);
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      const start = await frame.evaluate(() => ({
        runtime: window.__hostRuntime, claude: typeof window.claude.use, mode: window.MDV.app.state.mode, locked: window.MDV.app.state.mediaLocked,
        ownCsp: document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]:not([data-mdv-dyn])').length,
        top: window.top !== window.self, config: [window.MDV.app.state.config.allowDownloads, window.MDV.app.state.config.lockExternalImages]
      }));
      assert.deepEqual(start, { runtime: 1, claude: 'function', mode: 'site', locked: true, ownCsp: 0, top: true, config: [false, true] });
      // 埋め込みの画像（blob:）
      await frame.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return !!i && i.complete && i.naturalWidth > 0; });
      // メニュー: 保存と外部画像の項目がない
      await frame.click('.mdv-btn-menu');
      assert.deepEqual(await menuActions(frame), ['menuLanguage', 'menuHelp', 'menuAbout']);
      await frame.press('.mdv-menu', 'Escape');
      // リンクで移動 → 数式・図・コードの色分け（あとから読み込むライブラリも動く）
      await frame.click('.mdv-prose a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2);
      assert.ok((await frame.locator('.mdv-code pre span[class^="hljs-"]').count()) > 0);
      // 画像は画面に入ってから読み込む（loading="lazy"）
      await frame.locator('.mdv-prose img').first().scrollIntoViewIfNeeded();
      await frame.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return !!i && i.complete && i.naturalWidth > 0; });
      // 検索（全角でも一致）
      await frame.waitForFunction(() => { const s = window.MDV.app.state.set; return !s.indexing && s.indexed === s.docs.length; });
      await frame.fill('.mdv-search-input', 'ｍｅｒｍａｉｄ');
      await frame.waitForSelector('.mdv-search-item');
      await frame.press('.mdv-search-input', 'Escape');
      await frame.press('.mdv-search-input', 'Escape');
      // 戻る
      await frame.evaluate(() => history.back());
      await frameHeading(frame, 'mdfolio サンプル文書');
      // 添付: 保存は始めず、保存できないことを伝える
      await frame.click('.mdv-prose a:has-text("サンプルデータ")');
      await frame.waitForSelector('.mdv-empty');
      assert.equal(await frame.textContent('.mdv-empty-body'), '「sample-data.csv」は添付ファイルです。この表示環境では、ファイルを保存できません。');
      assert.equal(await frame.locator('.mdv-download').count(), 0);
      // テーマの切り替えと保存（フレームの中でも設定を保存できる）
      await frame.click('.mdv-btn-theme');
      await frame.click('.mdv-btn-theme');
      assert.equal(await frame.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
      assert.equal(await frame.evaluate(() => JSON.parse(localStorage.getItem('mdv:settings:v1')).theme), 'dark');
      await page.waitForTimeout(300);
      assert.deepEqual(downloads, []);
      assert.deepEqual(record.errors, [], 'エラー・CSP 違反がない');
      assert.equal(page.url().startsWith('http://localhost:'), true, '親ページは移動していない');
    } finally {
      await close();
    }
  });

  test('ビューア: ファイルを選んで開ける。フォルダの選択は <input> 方式に切り替わる', async () => {
    const { page, frame, record, close } = await openInFrame(hostedViewer);
    try {
      assert.equal(await frame.evaluate(() => window.MDV.app.state.view), 'welcome');
      // お試し用の公開ページであることを伝える（「外部には送信されません」とは書かない）
      assert.equal(await frame.textContent('.mdv-welcome-lead'),
        'フォルダを選ぶか、この画面にドロップしてください。ここは動作確認用の公開ページです。機密の文書は、手元に保存した配布版の HTML ファイルで開いてください。');
      await frame.click('.mdv-btn-menu');
      assert.deepEqual(await menuActions(frame), ['menuOpenFolder', 'menuOpenFiles', 'menuLanguage', 'menuHelp', 'menuAbout']);
      // 使い方の先頭にも、使えない機能があることを書く
      await frame.click('.mdv-menu-item[data-action="menuHelp"]');
      await frame.waitForFunction(() => window.MDV.app.state.view === 'help');
      const note = frame.locator('.mdv-prose > h1 + .markdown-alert-important');
      assert.equal(await note.count(), 1);
      assert.ok((await note.textContent()).includes('サイトとしての書き出し、添付ファイルの保存、外部の画像の表示は使えません'));
      await frame.evaluate(() => history.back());
      await frame.waitForFunction(() => window.MDV.app.state.view === 'welcome');
      // 1 ファイルのサンプル
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), frame.click('.mdv-open-files')]);
      assert.equal(chooser.isMultiple(), true);
      await chooser.setFiles(path.join(ROOT, 'sample.md'));
      await frameHeading(frame, 'mdfolio サンプル（1 ファイル版）');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2);
      assert.equal(await frame.locator('.mdv-prose .mdv-ph, .mdv-prose .mdv-missing, .mdv-mermaid-error, .katex-error').count(), 0, 'サンプルは 1 ファイルだけで欠けなく表示できる');
      // フォルダ: 別オリジンのフレームではフォルダ選択の API が使えないので、ファイル選択の方式に切り替わる
      assert.equal(await frame.evaluate(() => typeof window.showDirectoryPicker), 'function');
      const [dirChooser] = await Promise.all([page.waitForEvent('filechooser'), frame.click('.mdv-btn-menu').then(() => frame.click('.mdv-menu-item[data-action="menuOpenFolder"]'))]);
      await dirChooser.setFiles(SAMPLE_DOCS);
      await frameHeading(frame, 'mdfolio サンプル文書');
      const info = await frame.evaluate(() => ({ docs: window.MDV.app.state.set.docs.length, nav: document.querySelectorAll('.mdv-sidenav a').length, source: window.MDV.app.state.set.source }));
      assert.deepEqual(info, { docs: 7, nav: 6, source: 'files' });
      await frame.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return !!i && i.complete && i.naturalWidth > 0; });
      // 読み込んだあとも、書き出しは出さない
      await frame.click('.mdv-btn-menu');
      assert.deepEqual(await menuActions(frame), ['menuOpenFolder', 'menuOpenFiles', 'menuReload', 'menuLanguage', 'menuHelp', 'menuAbout']);
      await frame.press('.mdv-menu', 'Escape');
      // ドロップでも開ける
      await frame.evaluate(() => {
        const dt = new DataTransfer();
        dt.items.add(new File(['# ドロップした文書\n'], 'dropped.md', { type: 'text/markdown' }));
        window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
        window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      });
      await frameHeading(frame, 'ドロップした文書');
      assert.deepEqual(record.errors, []);
    } finally {
      await close();
    }
  });

  test('コードのコピー: クリップボード API が許可されていないフレームでも、コピーできる。失敗したときは失敗と伝える', async () => {
    const { page, frame, record, close } = await openInFrame(hostedSample, { viewport: { width: 1280, height: 600 } });
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      await frame.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      assert.equal(await frame.evaluate(() => (document.permissionsPolicy || document.featurePolicy).allowsFeature('clipboard-write')), false, 'このフレームでは非同期の API が使えない');
      const button = frame.locator('.mdv-code .mdv-copy').last();
      await button.scrollIntoViewIfNeeded();
      const expected = await frame.evaluate(() => { const all = document.querySelectorAll('.mdv-code pre'); return all[all.length - 1].textContent; });
      const before = await frame.evaluate(() => window.scrollY);
      assert.ok(before > 200, 'ページの途中までスクロールしている');
      // キーボードで押す
      await button.focus();
      await page.keyboard.press('Enter');
      await frame.waitForFunction(() => { const all = document.querySelectorAll('.mdv-code .mdv-copy'); return all[all.length - 1].textContent === 'コピーしました'; });
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected);
      assert.equal(await frame.evaluate(() => window.scrollY), before, 'コピーしても画面は動かない');
      assert.equal(await frame.evaluate(() => { const all = document.querySelectorAll('.mdv-code .mdv-copy'); return document.activeElement === all[all.length - 1]; }), true, 'フォーカスはボタンに残る');
      assert.equal(await frame.locator('.mdv-copy-buffer').count(), 0, '一時的な入力欄は残さない');
      // コピーできない環境では、できたことにしない
      await frame.evaluate(() => { document.execCommand = () => false; });
      await button.click();
      await frame.waitForFunction(() => { const all = document.querySelectorAll('.mdv-code .mdv-copy'); return all[all.length - 1].textContent === 'コピーできませんでした'; });
      await frame.waitForFunction(() => { const all = document.querySelectorAll('.mdv-code .mdv-copy'); return all[all.length - 1].textContent === 'コピー'; }, null, { timeout: 6000 });
      assert.deepEqual(record.errors, [], '使えない API を呼んでエラーを出さない');
    } finally {
      await close();
    }
  });

  test('狭い画面（スマートフォン相当）のフレームでも、横にはみ出さない', async () => {
    const { frame, record, close } = await openInFrame(hostedSample, { viewport: { width: 390, height: 780 } });
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      const drawerOpen = () => frame.evaluate(() => document.querySelector('.mdv-app').classList.contains('is-drawer-open'));
      assert.equal(await drawerOpen(), false);
      assert.ok(await frame.isHidden('.mdv-sidebar'));
      await frame.click('.mdv-btn-sidebar');
      await frame.waitForSelector('.mdv-sidebar', { state: 'visible' });
      assert.equal(await drawerOpen(), true);
      await frame.click('.mdv-sidenav a:has-text("基本操作")');
      await frameHeading(frame, '基本操作');
      assert.equal(await drawerOpen(), false, '文書を選ぶとドロワーが閉じる');
      assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      // 表・コード・図のあるページでも、ページ全体は横に動かない（はみ出す部分はその中でスクロールする）
      await frame.click('.mdv-btn-sidebar');
      await frame.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2);
      assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      assert.deepEqual(record.errors, []);
    } finally {
      await close();
    }
  });

  /** HTML を srcdoc で埋め込んだフレームを返す。文書の URL は about:srcdoc、基準 URL は親ページのものになる。 */
  async function openInSrcdoc(file, sandbox) {
    const context = await browser.newContext({ locale: 'ja-JP', viewport: { width: 1280, height: 860 } });
    const page = await context.newPage();
    const record = watch(page);
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0"><iframe id="page" sandbox="${sandbox}" style="border:0;width:100vw;height:100vh"></iframe></body></html>`);
    await page.evaluate((html) => { document.getElementById('page').srcdoc = html; }, fs.readFileSync(file, 'utf8'));
    const frame = await (await page.waitForSelector('#page')).contentFrame();
    await frame.waitForSelector('.mdv-app');
    return { page, frame, record, close: () => context.close() };
  }
  const frameUrl = (frame) => frame.evaluate(() => location.href);

  test('保存領域も URL の書き換えも使えないフレーム（sandbox="allow-scripts" の srcdoc）でも、リンクで移動できる', async () => {
    const { frame, record, close } = await openInSrcdoc(hostedSample, 'allow-scripts');
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      const env = await frame.evaluate(() => {
        let storage;
        try { localStorage.setItem('x', '1'); storage = 'ok'; } catch (e) { storage = e.name; }
        return { href: location.href, base: document.baseURI, storage: storage };
      });
      assert.deepEqual(env, { href: 'about:srcdoc', base: 'about:blank', storage: 'SecurityError' }, 'この条件では保存領域が使えず、リンクの基準 URL も文書の URL と異なる');
      // 本文のリンク（ブラウザーに任せると about:blank への移動になり、表示が消える）
      await frame.click('.mdv-prose a:has-text("基本操作")');
      await frameHeading(frame, '基本操作');
      assert.equal(await frameUrl(frame), 'about:srcdoc#/guide/' + encodeURIComponent('基本操作') + '.md');
      // サイドバーのリンク
      await frame.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      // 目次（同じ文書の見出し）
      const tocLink = frame.locator('.mdv-toc a').nth(3);
      const tocHref = await tocLink.getAttribute('href');
      await tocLink.click();
      assert.equal(await frame.evaluate(() => location.hash), tocHref);
      await frameHeading(frame, 'Markdown 記法');
      assert.ok((await frame.evaluate(() => window.scrollY)) > 0, '見出しの位置へ動く');
      // 戻る・進む
      await frame.evaluate(() => history.back());
      await frame.waitForFunction((h) => location.hash !== h, tocHref);
      await frame.evaluate(() => history.back());
      await frameHeading(frame, '基本操作');
      await frame.evaluate(() => history.forward());
      await frameHeading(frame, 'Markdown 記法');
      // 検索の結果から移動
      await frame.waitForFunction(() => { const s = window.MDV.app.state.set; return !s.indexing && s.indexed === s.docs.length; });
      await frame.fill('.mdv-search-input', '制限');
      await frame.waitForSelector('.mdv-search-item');
      await frame.press('.mdv-search-input', 'Enter');
      await frame.waitForFunction(() => window.MDV.app.state.current !== 'guide/Markdown記法.md');
      // タイトルで先頭のページへ、メニューから使い方へ
      await frame.click('.mdv-title');
      await frameHeading(frame, 'mdfolio サンプル文書');
      await frame.click('.mdv-btn-menu');
      await frame.click('.mdv-menu-item[data-action="menuHelp"]');
      await frame.waitForFunction(() => window.MDV.app.state.view === 'help');
      // 設定は保存できなくても、その場では切り替わる
      await frame.click('.mdv-btn-theme');
      await frame.click('.mdv-btn-theme');
      assert.equal(await frame.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', '自動 → ライト → ダーク');
      assert.equal((await frameUrl(frame)).startsWith('about:srcdoc#'), true, 'フレームは別のページへ移動していない');
      assert.deepEqual(record.errors, []);
    } finally {
      await close();
    }
  });

  test('配布用の HTML（CSP 付き）をそのまま srcdoc で埋め込んでも、表示とリンクでの移動ができる', async () => {
    const { frame, record, close } = await openInSrcdoc(plainSample, 'allow-scripts allow-same-origin');
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      assert.equal(await frame.evaluate(() => document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]:not([data-mdv-dyn])').length), 1);
      await frame.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2);
      await frame.click('.mdv-title');
      await frameHeading(frame, 'mdfolio サンプル文書');
      await frame.click('.mdv-prose a:has-text("制限事項")');
      await frameHeading(frame, '制限事項');
      assert.equal((await frameUrl(frame)).startsWith('about:srcdoc#/reference/'), true);
      assert.deepEqual(record.errors, []);
    } finally {
      await close();
    }
  });

  test('保存領域が使えないフレームでも、ビューアでファイルを開ける', async () => {
    const { frame, record, close } = await openInSrcdoc(hostedViewer, 'allow-scripts');
    try {
      assert.equal(await frame.evaluate(() => window.MDV.app.state.view), 'welcome');
      assert.equal(await frame.evaluate(() => { try { return typeof indexedDB.open('x'); } catch (e) { return e.name; } }), 'SecurityError', 'この条件では IndexedDB も使えない');
      assert.equal(await frame.isVisible('.mdv-open-files'), true);
      await frame.locator('.mdv-input-files').setInputFiles(path.join(ROOT, 'sample.md'));
      await frameHeading(frame, 'mdfolio サンプル（1 ファイル版）');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2);
      await frame.click('.mdv-toc a >> nth=2');
      assert.equal((await frameUrl(frame)).startsWith('about:srcdoc#/sample.md#'), true);
      assert.deepEqual(record.errors, []);
    } finally {
      await close();
    }
  });

  test('nonce 方式の CSP で配信する環境でも、あとから読み込むライブラリ（数式・図）が動く', async () => {
    const csp = ["default-src 'none'", "script-src 'nonce-t3stNonce'", "style-src 'unsafe-inline'", 'font-src data:', 'img-src data: blob:', "connect-src 'none'", "base-uri 'none'"].join('; ');
    const { frame, record, close } = await openInFrame(hostedSample, { csp, nonce: 't3stNonce' });
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      await frame.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2);
      const dyn = await frame.evaluate(() => Array.from(document.querySelectorAll('script[data-mdv-dyn], style[data-mdv-dyn]')).map((el) => [el.getAttribute('data-mdv-dyn'), el.nonce]));
      assert.deepEqual(dyn.sort(), [['katex', 't3stNonce'], ['katex-css', 't3stNonce'], ['mermaid', 't3stNonce']]);
      assert.deepEqual(record.errors, []);
    } finally {
      await close();
    }
  });

  test('変換で書き換えたスクリプト（置換文字のエスケープ）でも、不正な入力の表示結果は変わらない', async () => {
    // markdown-it は、NUL 文字と、文字として読めない %XX の並びを、置換文字（U+FFFD）に置き換えて表示する。
    // 変換では、その処理の中の文字の書き方を変えている
    const R = String.fromCharCode(0xFFFD);
    const dir = writeTree(tmpDir(), {
      'README.md': '# 置換文字の確認\n\nNUL: a\u0000b\n\n自動リンク: <http://example.com/%C3%28/%E3%81/%F0%9F%98/%FF>\n\n[リンク](http://example.com/%C3%28)\n\n本文の ' + R + ' はそのまま。\n'
    });
    const render = async (url) => {
      let html = '';
      await withPage(browser, { url }, async ({ page }) => {
        await loadFolder(page, dir);
        await waitHeading(page, '置換文字の確認');
        html = await page.evaluate(() => document.querySelector('.mdv-prose').innerHTML);
      });
      return html;
    };
    const plain = await render(pathToFileURL(VIEWER).href);
    const hosted = await render(pathToFileURL(hostedViewer).href);
    assert.equal(fs.readFileSync(hostedViewer, 'utf8').includes(R), false, '変換後の HTML には、置換文字そのものがない');
    assert.equal(hosted, plain);
    assert.ok(plain.split(R).length - 1 >= 6, `置換文字に置き換わっている（${plain.split(R).length - 1} か所）`);
    assert.ok(plain.includes('a' + R + 'b'), 'NUL 文字');
  });

  test('（比較）調整していない HTML をこのフレームに入れると、添付の保存はブラウザーに止められる', async () => {
    const { page, frame, downloads, record, close } = await openInFrame(plainSample);
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      // HTML に書いた CSP が、差し込まれたスクリプトを止めてしまう（位置によっては動く。ここでは <head> の先頭なので動く）
      await frame.click('.mdv-prose a:has-text("サンプルデータ")');
      await page.waitForTimeout(800);
      assert.deepEqual(downloads, [], '保存は始まらない');
      assert.ok(record.warnings.concat(record.errors).some((m) => /allow-downloads|sandbox/i.test(m)) || downloads.length === 0);
      await frame.click('.mdv-btn-menu');
      assert.ok((await menuActions(frame)).includes('menuExternalImages'), '調整前は、動かない切り替えが出てしまう');
    } finally {
      await close();
    }
  });
});
