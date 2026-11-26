// Settings for deploying where saving and external loads are unavailable (FR-701: allowDownloads / lockExternalImages),
// and behavior inside a sandboxed frame.
// The second half simulates a hosting environment that shows the page inside a cross-origin frame:
//   parent page -> <iframe sandbox> (no downloads, popup dialogs or top-level navigation) -> page
//   The page's server adds a CSP that limits images to data: / blob:, and injects its own script at the start of <head>.
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
const SAMPLE_DOCS = path.join(ROOT, 'sample-docs-ja');

describe('Setting that disables saving (allowDownloads: false)', () => {
  test('hides export; attachments are not saved and the user is told they cannot be saved', async () => {
    await withPage(browser, { url: viewerWithConfig({ allowDownloads: false }) }, async ({ page }) => {
      let downloads = 0;
      page.on('download', () => { downloads++; });
      await loadFolder(page, fixture('site'));
      await openMenu(page);
      assert.deepEqual(await menuActions(page), ['menuOpenFolder', 'menuOpenFiles', 'menuReload', 'menuExternalImages', 'menuLanguage', 'menuHelp', 'menuAbout']);
      await page.keyboard.press('Escape');
      // A link to an attachment goes to an explanation page instead of starting a download
      await page.click('.mdv-prose a:has-text("添付 CSV")');
      await page.waitForSelector('.mdv-empty');
      assert.equal(await hash(page), '#/assets/data.csv');
      assert.equal(await page.textContent('.mdv-empty-body'), '「data.csv」は添付ファイルです。この表示環境では、ファイルを保存できません。');
      assert.equal(await page.locator('.mdv-download').count(), 0, 'no button that would do nothing when pressed');
      await page.waitForTimeout(300);
      assert.equal(downloads, 0);
      // Going back returns to the original document
      await page.goBack();
      await waitHeading(page, 'テスト用サイト');
    });
  });

  test('by default (true), saving works as before', async () => {
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

describe('Setting that never loads external images (lockExternalImages: true)', () => {
  test('hides the toggle item; takes precedence over a saved "show" setting and allowExternalImages', async () => {
    sink.hits.length = 0;
    const dir = writeTree(tmpDir(), { 'README.md': `# 固定の確認\n\n![外部画像](${sink.origin}/external.png)\n` });
    const init = () => { try { localStorage.setItem('mdv:external:' + location.pathname, '1'); } catch (e) { /* ignore */ } };
    await withPage(browser, { url: viewerWithConfig({ lockExternalImages: true, allowExternalImages: true }), init, allowErrors: true }, async ({ page, record }) => {
      assert.equal(await page.evaluate(() => window.MDV.app.state.mediaLocked), true, 'blocked by the CSP from startup');
      await loadFolder(page, dir);
      assert.ok((await page.textContent('.mdv-prose')).includes('外部の画像は表示していません'));
      assert.equal(await page.locator('.mdv-prose img').count(), 0);
      await openMenu(page);
      assert.deepEqual(await menuActions(page), ['menuOpenFolder', 'menuOpenFiles', 'menuReload', 'menuExport', 'menuLanguage', 'menuHelp', 'menuAbout']);
      // Arrow-key navigation skips hidden items
      await page.keyboard.press('End');
      for (const expected of ['menuHelp', 'menuLanguage', 'menuExport']) {
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-action')), expected);
      }
      await page.keyboard.press('Escape');
      assert.deepEqual(sink.paths(), []);
      assert.deepEqual(record.errors, []);
      // Carried over to the exported site
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

describe('Public trial page display (hosted: true)', () => {
  test('without the setting, the start screen and help are unchanged; it is not carried over to exported HTML', async () => {
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

  test('conveys the same in the English UI', async () => {
    await withPage(browser, { url: viewerWithConfig({ hosted: true }), locale: 'en-US' }, async ({ page }) => {
      assert.equal(await page.textContent('.mdv-welcome-lead'), 'Choose a folder, or drop one onto this window. This is a public page for trying out the viewer. For confidential documents, use a copy of the HTML file saved on your own device.');
      await clickMenu(page, 'menuHelp');
      await page.waitForFunction(() => window.MDV.app.state.view === 'help');
      assert.ok((await page.textContent('.mdv-prose > h1 + .markdown-alert-important')).includes('are not available here'));
    });
  });
});

describe('Behavior inside a sandboxed frame', () => {
  const HOST_CSP = [
    "default-src 'none'", "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'unsafe-inline' https://fonts.googleapis.com", 'font-src data: https://fonts.gstatic.com', 'img-src data: blob:', 'media-src data: blob:',
    "connect-src 'none'", 'worker-src blob:', "frame-src 'none'", "object-src 'none'", "form-action 'none'", "base-uri 'none'"
  ].join('; ');
  // Stand-in for the script the host injects. Checks that the page does not block it
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

  /** Start a parent page and a server (on another origin) serving the page itself, and return the page inside the frame. */
  async function openInFrame(file, options = {}) {
    let html = fs.readFileSync(file, 'utf8').replace('<head>\n', '<head>\n' + RUNTIME + '\n');
    // Stand-in for an environment that serves with nonces: add a nonce to every script / style
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
    // To check results in the test, allow clipboard reads for the parent page only (nothing is granted to the frame)
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

  test('page showing the sample: images, math, diagrams, search and navigation work, and unusable actions are hidden', async () => {
    const { page, frame, record, downloads, close } = await openInFrame(hostedSample);
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      const start = await frame.evaluate(() => ({
        runtime: window.__hostRuntime, claude: typeof window.claude.use, mode: window.MDV.app.state.mode, locked: window.MDV.app.state.mediaLocked,
        ownCsp: document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]:not([data-mdv-dyn])').length,
        top: window.top !== window.self, config: [window.MDV.app.state.config.allowDownloads, window.MDV.app.state.config.lockExternalImages]
      }));
      assert.deepEqual(start, { runtime: 1, claude: 'function', mode: 'site', locked: true, ownCsp: 0, top: true, config: [false, true] });
      // Embedded images (blob:)
      await frame.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return !!i && i.complete && i.naturalWidth > 0; });
      // Menu: no items for saving or external images
      await frame.click('.mdv-btn-menu');
      assert.deepEqual(await menuActions(frame), ['menuLanguage', 'menuHelp', 'menuAbout']);
      await frame.press('.mdv-menu', 'Escape');
      // Navigate by link -> math, diagrams and code highlighting (lazily loaded libraries work too)
      await frame.click('.mdv-prose a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2);
      assert.ok((await frame.locator('.mdv-code pre span[class^="hljs-"]').count()) > 0);
      // Images load once they scroll into view (loading="lazy")
      await frame.locator('.mdv-prose img').first().scrollIntoViewIfNeeded();
      await frame.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return !!i && i.complete && i.naturalWidth > 0; });
      // Search (full-width characters match too)
      await frame.waitForFunction(() => { const s = window.MDV.app.state.set; return !s.indexing && s.indexed === s.docs.length; });
      await frame.fill('.mdv-search-input', 'ｍｅｒｍａｉｄ');
      await frame.waitForSelector('.mdv-search-item');
      await frame.press('.mdv-search-input', 'Escape');
      await frame.press('.mdv-search-input', 'Escape');
      // Back
      await frame.evaluate(() => history.back());
      await frameHeading(frame, 'mdfolio サンプル文書');
      // Attachment: no download starts, and the user is told it cannot be saved
      await frame.click('.mdv-prose a:has-text("サンプルデータ")');
      await frame.waitForSelector('.mdv-empty');
      assert.equal(await frame.textContent('.mdv-empty-body'), '「sample-data.csv」は添付ファイルです。この表示環境では、ファイルを保存できません。');
      assert.equal(await frame.locator('.mdv-download').count(), 0);
      // Theme switching and saving (settings can be saved inside the frame too)
      await frame.click('.mdv-btn-theme');
      assert.equal(await frame.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
      assert.equal(await frame.evaluate(() => JSON.parse(localStorage.getItem('mdv:settings:v1')).theme), 'dark');
      await page.waitForTimeout(300);
      assert.deepEqual(downloads, []);
      assert.deepEqual(record.errors, [], 'no errors or CSP violations');
      assert.equal(page.url().startsWith('http://localhost:'), true, 'the parent page did not navigate');
    } finally {
      await close();
    }
  });

  test('viewer: files can be picked and opened; folder picking falls back to <input>', async () => {
    const { page, frame, record, close } = await openInFrame(hostedViewer);
    try {
      assert.equal(await frame.evaluate(() => window.MDV.app.state.view), 'welcome');
      // Says this is a public trial page (does not claim "nothing is sent externally")
      assert.equal(await frame.textContent('.mdv-welcome-lead'),
        'フォルダを選ぶか、この画面にドロップしてください。ここは動作確認用の公開ページです。機密の文書は、手元に保存した配布版の HTML ファイルで開いてください。');
      await frame.click('.mdv-btn-menu');
      assert.deepEqual(await menuActions(frame), ['menuOpenFolder', 'menuOpenFiles', 'menuLanguage', 'menuHelp', 'menuAbout']);
      // The top of the help also says which features are unavailable
      await frame.click('.mdv-menu-item[data-action="menuHelp"]');
      await frame.waitForFunction(() => window.MDV.app.state.view === 'help');
      const note = frame.locator('.mdv-prose > h1 + .markdown-alert-important');
      assert.equal(await note.count(), 1);
      assert.ok((await note.textContent()).includes('サイトとしての書き出し、添付ファイルの保存、外部の画像の表示は使えません'));
      await frame.evaluate(() => history.back());
      await frame.waitForFunction(() => window.MDV.app.state.view === 'welcome');
      // Single-file sample
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), frame.click('.mdv-open-files')]);
      assert.equal(chooser.isMultiple(), true);
      await chooser.setFiles(path.join(ROOT, 'sample.ja.md'));
      await frameHeading(frame, 'mdfolio サンプル（1 ファイル版）');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2);
      assert.equal(await frame.locator('.mdv-prose .mdv-ph, .mdv-prose .mdv-missing, .mdv-mermaid-error, .katex-error').count(), 0, 'the sample displays completely from a single file');
      // Folder: the folder picker API is unavailable in a cross-origin frame, so it falls back to file picking
      assert.equal(await frame.evaluate(() => typeof window.showDirectoryPicker), 'function');
      const [dirChooser] = await Promise.all([page.waitForEvent('filechooser'), frame.click('.mdv-btn-menu').then(() => frame.click('.mdv-menu-item[data-action="menuOpenFolder"]'))]);
      await dirChooser.setFiles(SAMPLE_DOCS);
      await frameHeading(frame, 'mdfolio サンプル文書');
      const info = await frame.evaluate(() => ({ docs: window.MDV.app.state.set.docs.length, nav: document.querySelectorAll('.mdv-sidenav a').length, source: window.MDV.app.state.set.source }));
      assert.deepEqual(info, { docs: 7, nav: 6, source: 'files' });
      await frame.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return !!i && i.complete && i.naturalWidth > 0; });
      // Export stays hidden after loading too
      await frame.click('.mdv-btn-menu');
      assert.deepEqual(await menuActions(frame), ['menuOpenFolder', 'menuOpenFiles', 'menuReload', 'menuLanguage', 'menuHelp', 'menuAbout']);
      await frame.press('.mdv-menu', 'Escape');
      // Can also open by dropping
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

  test('code copy: works even in a frame where the Clipboard API is not allowed, and reports failure when it fails', async () => {
    const { page, frame, record, close } = await openInFrame(hostedSample, { viewport: { width: 1280, height: 600 } });
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      await frame.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      assert.equal(await frame.evaluate(() => (document.permissionsPolicy || document.featurePolicy).allowsFeature('clipboard-write')), false, 'the async API is unavailable in this frame');
      const button = frame.locator('.mdv-code .mdv-copy').last();
      await button.scrollIntoViewIfNeeded();
      const expected = await frame.evaluate(() => { const all = document.querySelectorAll('.mdv-code pre'); return all[all.length - 1].textContent; });
      const before = await frame.evaluate(() => window.scrollY);
      assert.ok(before > 200, 'scrolled partway down the page');
      // Press with the keyboard
      await button.focus();
      await page.keyboard.press('Enter');
      await frame.waitForFunction(() => { const all = document.querySelectorAll('.mdv-code .mdv-copy'); return all[all.length - 1].textContent === 'コピーしました'; });
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected);
      assert.equal(await frame.evaluate(() => window.scrollY), before, 'copying does not move the view');
      assert.equal(await frame.evaluate(() => { const all = document.querySelectorAll('.mdv-code .mdv-copy'); return document.activeElement === all[all.length - 1]; }), true, 'focus stays on the button');
      assert.equal(await frame.locator('.mdv-copy-buffer').count(), 0, 'no temporary input field is left behind');
      // Where copying is impossible, do not pretend it succeeded
      await frame.evaluate(() => { document.execCommand = () => false; });
      await button.click();
      await frame.waitForFunction(() => { const all = document.querySelectorAll('.mdv-code .mdv-copy'); return all[all.length - 1].textContent === 'コピーできませんでした'; });
      await frame.waitForFunction(() => { const all = document.querySelectorAll('.mdv-code .mdv-copy'); return all[all.length - 1].textContent === 'コピー'; }, null, { timeout: 6000 });
      assert.deepEqual(record.errors, [], 'no errors from calling unavailable APIs');
    } finally {
      await close();
    }
  });

  test('no horizontal overflow even in a narrow (smartphone-sized) frame', async () => {
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
      assert.equal(await drawerOpen(), false, 'choosing a document closes the drawer');
      assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      // Even on a page with tables, code and diagrams, the whole page does not scroll sideways (overflowing parts scroll within themselves)
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

  /** Return a frame with the HTML embedded via srcdoc. The document URL is about:srcdoc and the base URL is the parent page's. */
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

  test('links navigate even in a frame without storage or URL rewriting (srcdoc with sandbox="allow-scripts")', async () => {
    const { frame, record, close } = await openInSrcdoc(hostedSample, 'allow-scripts');
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      const env = await frame.evaluate(() => {
        let storage;
        try { localStorage.setItem('x', '1'); storage = 'ok'; } catch (e) { storage = e.name; }
        return { href: location.href, base: document.baseURI, storage: storage };
      });
      assert.deepEqual(env, { href: 'about:srcdoc', base: 'about:blank', storage: 'SecurityError' }, 'under these conditions storage is unavailable and the base URL for links differs from the document URL');
      // Links in the body (left to the browser, they would navigate to about:blank and the content would vanish)
      await frame.click('.mdv-prose a:has-text("基本操作")');
      await frameHeading(frame, '基本操作');
      assert.equal(await frameUrl(frame), 'about:srcdoc#/guide/' + encodeURIComponent('基本操作') + '.md');
      // Sidebar links
      await frame.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await frameHeading(frame, 'Markdown 記法');
      // Table of contents (headings in the same document)
      const tocLink = frame.locator('.mdv-toc a').nth(3);
      const tocHref = await tocLink.getAttribute('href');
      await tocLink.click();
      assert.equal(await frame.evaluate(() => location.hash), tocHref);
      await frameHeading(frame, 'Markdown 記法');
      assert.ok((await frame.evaluate(() => window.scrollY)) > 0, 'moves to the heading position');
      // Back and forward
      await frame.evaluate(() => history.back());
      await frame.waitForFunction((h) => location.hash !== h, tocHref);
      await frame.evaluate(() => history.back());
      await frameHeading(frame, '基本操作');
      await frame.evaluate(() => history.forward());
      await frameHeading(frame, 'Markdown 記法');
      // Navigate from a search result
      await frame.waitForFunction(() => { const s = window.MDV.app.state.set; return !s.indexing && s.indexed === s.docs.length; });
      await frame.fill('.mdv-search-input', '制限');
      await frame.waitForSelector('.mdv-search-item');
      await frame.press('.mdv-search-input', 'Enter');
      await frame.waitForFunction(() => window.MDV.app.state.current !== 'guide/Markdown記法.md');
      // Title to the first page, menu to the help
      await frame.click('.mdv-title');
      await frameHeading(frame, 'mdfolio サンプル文書');
      await frame.click('.mdv-btn-menu');
      await frame.click('.mdv-menu-item[data-action="menuHelp"]');
      await frame.waitForFunction(() => window.MDV.app.state.view === 'help');
      // Settings switch in place even though they cannot be saved
      await frame.click('.mdv-btn-theme');
      assert.equal(await frame.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'light -> dark');
      assert.equal((await frameUrl(frame)).startsWith('about:srcdoc#'), true, 'the frame did not navigate to another page');
      assert.deepEqual(record.errors, []);
    } finally {
      await close();
    }
  });

  test('the distributed HTML (with its CSP) embedded as-is via srcdoc still displays and navigates by links', async () => {
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

  test('the viewer can open files even in a frame without storage', async () => {
    const { frame, record, close } = await openInSrcdoc(hostedViewer, 'allow-scripts');
    try {
      assert.equal(await frame.evaluate(() => window.MDV.app.state.view), 'welcome');
      assert.equal(await frame.evaluate(() => { try { return typeof indexedDB.open('x'); } catch (e) { return e.name; } }), 'SecurityError', 'IndexedDB is also unavailable under these conditions');
      assert.equal(await frame.isVisible('.mdv-open-files'), true);
      await frame.locator('.mdv-input-files').setInputFiles(path.join(ROOT, 'sample.ja.md'));
      await frameHeading(frame, 'mdfolio サンプル（1 ファイル版）');
      await frame.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2);
      await frame.click('.mdv-toc a >> nth=2');
      assert.equal((await frameUrl(frame)).startsWith('about:srcdoc#/sample.ja.md#'), true);
      assert.deepEqual(record.errors, []);
    } finally {
      await close();
    }
  });

  test('lazily loaded libraries (math, diagrams) work even when served with a nonce-based CSP', async () => {
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

  test('scripts rewritten by the conversion (escaping the replacement character) render invalid input the same way', async () => {
    // markdown-it renders NUL characters and %XX sequences that do not decode as text as the replacement character (U+FFFD).
    // The conversion changes how that character is written inside that code
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
    assert.equal(fs.readFileSync(hostedViewer, 'utf8').includes(R), false, 'the converted HTML contains no literal replacement character');
    assert.equal(hosted, plain);
    assert.ok(plain.split(R).length - 1 >= 6, `replaced with the replacement character (${plain.split(R).length - 1} places)`);
    assert.ok(plain.includes('a' + R + 'b'), 'NUL character');
  });

  test('(comparison) unadapted HTML in this frame has attachment downloads blocked by the browser', async () => {
    const { page, frame, downloads, record, close } = await openInFrame(plainSample);
    try {
      await frameHeading(frame, 'mdfolio サンプル文書');
      // The CSP written in the HTML can block the injected script (it works depending on position; here it is at the start of <head>, so it works)
      await frame.click('.mdv-prose a:has-text("サンプルデータ")');
      await page.waitForTimeout(800);
      assert.deepEqual(downloads, [], 'no download starts');
      assert.ok(record.warnings.concat(record.errors).some((m) => /allow-downloads|sandbox/i.test(m)) || downloads.length === 0);
      await frame.click('.mdv-btn-menu');
      assert.ok((await menuActions(frame)).includes('menuExternalImages'), 'before adaptation, a toggle that does not work is shown');
    } finally {
      await close();
    }
  });
});
