// Display settings (FR-501 to FR-504), external images (FR-210), saving settings (FR-702)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { launchBrowser, withPage, loadFolder, fixture, goTo, waitHeading, heading, clickMenu, openMenu, VIEWER, ROOT, tmpDir, writeTree, startSink } from '../helpers/e2e.mjs';
import { core } from '../helpers/load.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const theme = (page) => page.getAttribute('html', 'data-theme');
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mdv:settings:v1') || '{}'));
const bodyBg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

describe('Theme (FR-501)', () => {
  test('cycles auto -> light -> dark and carries over to the next visit', async () => {
    await withPage(browser, async ({ page }) => {
      assert.equal(await theme(page), 'light');
      assert.equal(await page.getAttribute('.mdv-btn-theme', 'aria-label'), 'テーマ: 自動（OS の設定に合わせる）');
      assert.equal(await bodyBg(page), 'rgb(237, 241, 245)');
      // Auto: follows the OS setting
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
      assert.equal(await bodyBg(page), 'rgb(15, 23, 34)');
      // Fixed to light: light even when the OS is dark
      await page.click('.mdv-btn-theme');
      assert.equal(await theme(page), 'light');
      assert.equal(await page.getAttribute('.mdv-btn-theme', 'aria-label'), 'テーマ: ライト');
      // Fixed to dark
      await page.emulateMedia({ colorScheme: 'light' });
      await page.click('.mdv-btn-theme');
      assert.equal(await theme(page), 'dark');
      assert.equal(await page.getAttribute('.mdv-btn-theme', 'aria-label'), 'テーマ: ダーク');
      assert.equal((await stored(page)).theme, 'dark');
      await page.reload();
      await page.waitForSelector('.mdv-app');
      assert.equal(await theme(page), 'dark', 'carried over after reload');
      await page.click('.mdv-btn-theme');
      assert.equal((await stored(page)).theme, 'auto');
      assert.equal(await theme(page), 'light');
    });
  });

  test('shows dark from the start when the OS is dark', async () => {
    await withPage(browser, { colorScheme: 'dark' }, async ({ page }) => {
      assert.equal(await theme(page), 'dark');
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.mdv-sheet')).backgroundColor), 'rgb(21, 31, 44)');
    });
  });

  test('switching the theme redraws diagrams with matching colors', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/syntax.md', '記法');
      await page.waitForSelector('.mdv-mermaid svg .node rect');
      const fill = () => page.evaluate(() => getComputedStyle(document.querySelector('.mdv-mermaid svg .node rect')).fill);
      assert.equal(await fill(), 'rgb(227, 236, 248)');
      await page.click('.mdv-btn-theme');
      await page.click('.mdv-btn-theme');
      assert.equal(await theme(page), 'dark');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.mdv-mermaid svg .node rect')).fill === 'rgb(29, 45, 66)');
      assert.equal(await page.locator('.mdv-mermaid svg').count(), 1);
      assert.equal(await page.locator('.mdv-mermaid-error').count(), 1, 'a diagram with errors keeps showing the error');
    });
  });
});

describe('UI language (FR-502)', () => {
  test('can be switched from the menu and carries over to the next visit', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.match(await page.textContent('.mdv-doc-date'), /^更新 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
      await clickMenu(page, 'menuLanguage');
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      assert.equal(await page.getAttribute('.mdv-search-input', 'placeholder'), 'Search documents');
      assert.equal(await page.textContent('.mdv-toc-title'), 'On this page');
      await page.waitForFunction(() => /^Updated /.test(document.querySelector('.mdv-doc-date').textContent));
      assert.ok((await page.textContent('.mdv-ph')).startsWith('Image not found'));
      await openMenu(page);
      assert.equal((await page.textContent('.mdv-menu-item[data-action="menuExport"]')).trim(), 'Export as site');
      assert.equal((await page.textContent('.mdv-menu-item[data-action="menuLanguage"]')).trim(), '日本語で表示');
      await page.keyboard.press('Escape');
      assert.equal((await stored(page)).lang, 'en');
      await page.reload();
      await page.waitForSelector('.mdv-welcome-title');
      assert.equal(await page.textContent('.mdv-welcome-title'), 'Browse a folder of Markdown files as a website.');
      await clickMenu(page, 'menuLanguage');
      await page.waitForFunction(() => document.documentElement.lang === 'ja');
      assert.equal((await page.textContent('.mdv-open-folder')).trim(), 'フォルダを開く');
    });
  });
});

describe('External images (FR-210, SEC-5, SEC-10)', () => {
  const ITEM = '.mdv-menu-item[data-action="menuExternalImages"]';
  const extImg = (page) => page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img[alt="外部画像"]'); return i && i.complete && i.naturalWidth === 64; });
  const locked = (page) => page.evaluate(() => window.MDV.app.state.mediaLocked);
  const checked = async (page) => { await openMenu(page); const v = await page.getAttribute(ITEM, 'aria-checked'); await page.keyboard.press('Escape'); return v; };
  /** Load an image without going through a document, to check whether the browser itself blocks it. */
  const probe = (page, url) => page.evaluate((u) => new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve('loaded');
    i.onerror = () => resolve('blocked');
    i.src = u;
  }), url);

  let sink;
  before(async () => { sink = await startSink(); });
  after(async () => { await sink.close(); });

  function docsWithExternalImage() {
    return writeTree(tmpDir(), {
      'README.md': `# 外部画像の確認\n\n![外部画像](${sink.origin}/external.png)\n\n<video src="${sink.origin}/movie.mp4" controls></video>\n\n[別の文書](other.md)\n`,
      'other.md': '# 別の文書\n'
    });
  }

  test('by default, not shown and no requests are made; the browser CSP also blocks them', async () => {
    sink.hits.length = 0;
    await withPage(browser, { allowErrors: true }, async ({ page, record }) => {
      assert.equal(await locked(page), true);
      await loadFolder(page, docsWithExternalImage());
      await page.waitForTimeout(300);
      const text = await page.textContent('.mdv-prose');
      assert.ok(text.includes(`外部の画像は表示していません: ${sink.origin}/external.png`));
      assert.ok(text.includes(`外部のメディアは表示していません: ${sink.origin}/movie.mp4`));
      assert.equal(await page.locator('.mdv-prose img, .mdv-prose video').count(), 0);
      assert.deepEqual(record.requests, []);
      assert.deepEqual(record.errors, [], 'removed at render time, so no CSP violations occur either');
      assert.equal(await checked(page), 'false');
      // Loads that bypass rendering are also blocked by the browser
      assert.equal(await probe(page, sink.origin + '/direct.png'), 'blocked');
      assert.deepEqual(record.blocked, [sink.origin + '/direct.png']);
      assert.deepEqual(sink.paths(), [], 'nothing reached the server');
    });
  });

  test('turning it on asks for confirmation and applies after a reload; turning it off applies immediately', async () => {
    sink.hits.length = 0;
    const dir = docsWithExternalImage();
    await withPage(browser, { allowErrors: true }, async ({ page, record }) => {
      await loadFolder(page, dir);
      await goTo(page, '#/other.md', '別の文書');
      // Confirmation dialog. Cancelling changes nothing
      await clickMenu(page, 'menuExternalImages');
      await page.waitForSelector('dialog.mdv-dialog-external[open]');
      assert.equal(await page.textContent('.mdv-dialog-external .mdv-dialog-title'), '外部の画像を表示しますか');
      assert.equal(await page.textContent('.mdv-dialog-external .mdv-dialog-lead'), '表示すると、画像や動画の配信元のサーバーに接続します。設定を切り替えるために、ページを再読み込みします。');
      assert.equal(await page.textContent('.mdv-dialog-external .mdv-dialog-note'), '再読み込みすると、開いているフォルダは閉じます。再読み込みのあとで、もう一度開いてください。');
      assert.ok(await page.evaluate(() => document.activeElement.classList.contains('mdv-external-cancel')), 'initial focus is on Cancel');
      await page.click('.mdv-external-cancel');
      await page.waitForSelector('dialog.mdv-dialog-external', { state: 'detached' });
      assert.equal((await stored(page)).externalImages, undefined);
      assert.equal(await locked(page), true);
      // Turn on and reload
      await clickMenu(page, 'menuExternalImages');
      await page.waitForSelector('dialog.mdv-dialog-external[open]');
      await Promise.all([page.waitForEvent('load'), page.click('.mdv-external-run')]);
      await page.waitForFunction(() => window.MDV && window.MDV.app && window.MDV.app.state.view === 'welcome');
      assert.equal(await locked(page), false);
      assert.equal((await stored(page)).externalImages, true);
      assert.ok((await page.textContent('.mdv-welcome-pending')).includes('other.md'), 'the location of the document being viewed stays in the URL');
      assert.deepEqual(sink.paths(), []);
      // Reopening the folder returns to the original document and shows the external images
      await loadFolder(page, dir);
      await waitHeading(page, '別の文書');
      await goTo(page, '#/README.md', '外部画像の確認');
      await extImg(page);
      await page.waitForFunction(() => { const v = document.querySelector('.mdv-prose video'); return v && v.getAttribute('src'); });
      assert.equal(await page.getAttribute('.mdv-prose img[alt="外部画像"]', 'referrerpolicy'), 'no-referrer');
      assert.ok(sink.paths().includes('/external.png'));
      assert.ok(sink.paths().includes('/movie.mp4'));
      assert.ok(sink.hits.every((h) => h.referer === undefined && h.cookie === undefined), 'sends neither Referer nor cookies');
      assert.equal(await checked(page), 'true');
      // Turning it off switches immediately (no confirmation, no reload)
      const before = sink.hits.length;
      await clickMenu(page, 'menuExternalImages');
      await page.waitForFunction(() => !document.querySelector('.mdv-prose img[alt="外部画像"]'));
      assert.equal(await page.locator('dialog.mdv-dialog-external').count(), 0);
      assert.equal(await locked(page), true);
      assert.equal((await stored(page)).externalImages, false);
      assert.equal(await checked(page), 'false');
      assert.equal(await probe(page, sink.origin + '/after-off.png'), 'blocked');
      assert.equal(sink.hits.length, before, 'no requests after switching');
      assert.equal(await heading(page), '外部画像の確認', 'the folder stays open');
      assert.deepEqual(record.requests.filter((u) => !u.startsWith(sink.origin)), []);
    });
  });

  test('in site mode, returns to the same document after reload', async () => {
    sink.hits.length = 0;
    const out = path.join(tmpDir(), 'ext-site.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), docsWithExternalImage(), '--out', out, '--title', '外部画像'], { cwd: ROOT });
    await withPage(browser, { url: pathToFileURL(out).href, allowErrors: true }, async ({ page, record }) => {
      await waitHeading(page, '外部画像の確認');
      assert.equal(await locked(page), true);
      await clickMenu(page, 'menuExternalImages');
      await page.waitForSelector('dialog.mdv-dialog-external[open]');
      assert.equal(await page.locator('.mdv-dialog-external .mdv-dialog-note').count(), 0, 'no folder to close, so that note is not shown');
      assert.deepEqual(sink.paths(), []);
      await Promise.all([page.waitForEvent('load'), page.click('.mdv-external-run')]);
      await waitHeading(page, '外部画像の確認');
      await extImg(page);
      assert.equal(await locked(page), false);
      assert.ok(sink.paths().includes('/external.png'));
      assert.deepEqual(record.errors, []);
    });
  });

  test('where settings cannot be saved, says it cannot be switched (no reload)', async () => {
    const init = () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { throw new DOMException('denied', 'SecurityError'); };
      window.__restoreStorage = () => { Storage.prototype.setItem = original; };
    };
    await withPage(browser, { init }, async ({ page }) => {
      await loadFolder(page, fixture('single'));
      await clickMenu(page, 'menuExternalImages');
      await page.waitForSelector('dialog.mdv-dialog-external[open]');
      await page.click('.mdv-external-run');
      await page.waitForSelector('.mdv-toast-error');
      assert.equal(await page.textContent('.mdv-toast-error'), 'このブラウザーでは設定を保存できないため、外部の画像を表示できません');
      await page.waitForSelector('dialog.mdv-dialog-external', { state: 'detached' });
      assert.equal(await locked(page), true);
      assert.equal(await checked(page), 'false');
      assert.equal(await page.getAttribute('.mdv-app', 'data-has-set'), 'true', 'the folder stays open');
      assert.equal(await page.getAttribute('.mdv-app', 'data-view'), 'doc');
    });
  });

  test('the config block can make allowing the default (FR-701); the user can turn it off on the spot', async () => {
    sink.hits.length = 0;
    const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
    core.findBlock(parts, 'mdv-config').text = core.jsonForScript({ allowExternalImages: true });
    const file = path.join(tmpDir(), 'allow.html');
    fs.writeFileSync(file, core.composeHtml(parts));
    await withPage(browser, { url: pathToFileURL(file).href, allowErrors: true }, async ({ page, record }) => {
      assert.equal(await locked(page), false);
      await loadFolder(page, docsWithExternalImage());
      await extImg(page);
      assert.ok(sink.paths().includes('/external.png'));
      assert.deepEqual(record.errors, []);
      assert.equal(await checked(page), 'true');
      await clickMenu(page, 'menuExternalImages');
      await page.waitForFunction(() => !document.querySelector('.mdv-prose img[alt="外部画像"]'));
      assert.equal(await locked(page), true);
      assert.equal(await probe(page, sink.origin + '/after-off.png'), 'blocked');
      assert.ok(!sink.paths().includes('/after-off.png'));
    });
  });
});

describe('Layout by screen width (FR-503)', () => {
  test('wide screen: the sidebar can be toggled and its state is carried over', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.ok(await page.isVisible('.mdv-sidebar'));
      assert.ok(await page.isVisible('.mdv-toc'));
      assert.ok(await page.isHidden('.mdv-toc-inline'));
      await page.click('.mdv-btn-sidebar');
      assert.ok(await page.isHidden('.mdv-sidebar'));
      assert.equal(await page.getAttribute('.mdv-btn-sidebar', 'aria-expanded'), 'false');
      assert.equal((await stored(page)).sidebar, false);
      await page.click('.mdv-btn-sidebar');
      assert.ok(await page.isVisible('.mdv-sidebar'));
      assert.equal(await page.getAttribute('.mdv-btn-sidebar', 'aria-expanded'), 'true');
    });
  });

  test('medium screen: the table of contents moves into a collapsible at the top of the body', async () => {
    await withPage(browser, { viewport: { width: 1000, height: 800 } }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.ok(await page.isVisible('.mdv-sidebar'));
      assert.ok(await page.isHidden('.mdv-toc'));
      assert.ok(await page.isVisible('.mdv-toc-inline'));
      await page.click('.mdv-toc-inline > summary');
      await page.click('.mdv-toc-inline .mdv-toc-link:has-text("画像")');
      await page.waitForFunction(() => location.hash.endsWith('#' + encodeURIComponent('画像')));
    });
  });

  test('narrow screen: the sidebar becomes a drawer that closes on backdrop click, Esc or navigation', async () => {
    await withPage(browser, { viewport: { width: 600, height: 800 } }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const open = () => page.evaluate(() => document.querySelector('.mdv-app').classList.contains('is-drawer-open'));
      assert.ok(await page.isHidden('.mdv-sidebar'));
      assert.equal(await page.getAttribute('.mdv-btn-sidebar', 'aria-expanded'), 'false');
      await page.click('.mdv-btn-sidebar');
      await page.waitForSelector('.mdv-sidebar', { state: 'visible' });
      assert.ok(await page.isVisible('.mdv-scrim'));
      assert.equal(await page.getAttribute('.mdv-btn-sidebar', 'aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await open(), false);
      await page.click('.mdv-btn-sidebar');
      await page.click('.mdv-scrim', { position: { x: 560, y: 400 } });
      assert.equal(await open(), false);
      await page.click('.mdv-btn-sidebar');
      await page.click('.mdv-side-tree a[href="#/syntax.md"]');
      await waitHeading(page, '記法');
      assert.equal(await open(), false, 'closes when a document is chosen');
    });
  });

  test('the page does not overflow horizontally even at smartphone width', async () => {
    await withPage(browser, { viewport: { width: 375, height: 700 } }, async ({ page }) => {
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok((await overflow()) <= 0, 'start screen');
      await loadFolder(page, fixture('site'));
      assert.ok((await overflow()) <= 0, 'home');
      await goTo(page, '#/syntax.md', '記法');
      await page.waitForSelector('.mdv-mermaid svg');
      assert.ok((await overflow()) <= 0, 'document with tables, code and diagrams');
      await page.fill('.mdv-search-input', '固有語');
      await page.waitForSelector('.mdv-search-item');
      const panel = await page.evaluate(() => { const r = document.getElementById('mdv-search-panel').getBoundingClientRect(); return { left: r.left, right: r.right }; });
      assert.ok(panel.left >= 0 && panel.right <= 375, 'the search panel fits within the screen');
    });
  });
});

describe('Touch devices (smartphones and tablets)', () => {
  test('file picking is not filtered by type (some devices cannot pick .md); on desktop it is filtered to Markdown', async () => {
    await withPage(browser, async ({ page }) => {
      const accept = await page.getAttribute('.mdv-input-files', 'accept');
      assert.ok(accept.split(',').includes('.md') && accept.split(',').includes('text/markdown'));
    });
    const context = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, acceptDownloads: true });
    try {
      await withPage(browser, { context, allowErrors: true }, async ({ page, record }) => {
        assert.equal(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches), true);
        assert.equal(await page.getAttribute('.mdv-input-files', 'accept'), null);
        // The start screen text guides the user to pick files rather than drop them
        assert.equal(await page.textContent('.mdv-welcome-lead'), 'フォルダかファイルを選んでください。ファイルはこの端末の中だけで処理され、外部には送信されません。');
        // Picking something other than Markdown changes nothing and shows a notice
        await page.locator('.mdv-input-files').setInputFiles(fixture('site/assets/data.csv'));
        await page.waitForSelector('.mdv-toast');
        assert.ok((await page.textContent('.mdv-toast')).includes('Markdown 文書が見つかりませんでした'));
        assert.equal(await page.evaluate(() => window.MDV.app.state.view), 'welcome');
        // Markdown files can be opened
        await page.locator('.mdv-input-files').setInputFiles(fixture('site/syntax.md'));
        await waitHeading(page, '記法');
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, 'no horizontal overflow');
        assert.deepEqual(record.errors, []);
      });
    } finally {
      await context.close();
    }
  });
});

describe('Appearance where scrollbars are always shown (Windows, etc.)', () => {
  // The test browser hides scrollbars, so check for overflow numerically
  const overflowing = () => Array.from(document.querySelectorAll('.mdv-app, .mdv-app *')).filter((el) => {
    if (el.closest('.mdv-prose')) return false; // Tables and code in the body scroll horizontally on purpose
    const cs = getComputedStyle(el);
    if (!/(auto|scroll)/.test(cs.overflowX) && !/(auto|scroll)/.test(cs.overflowY)) return false;
    return el.scrollWidth > el.clientWidth;
  }).map((el) => el.nodeName.toLowerCase() + '.' + String(el.getAttribute('class') || '').split(' ')[0] + ` ${el.scrollWidth}>${el.clientWidth}`);

  test('no horizontal scrollbars in the sidebar, table of contents, search results or menu', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.deepEqual(await page.evaluate(overflowing), [], 'home (with the tab for the current document)');
      await goTo(page, '#/guide/sub/deep.md', '深い文書');
      assert.deepEqual(await page.evaluate(overflowing), [], 'deep nesting');
      await page.fill('.mdv-search-input', '固有語');
      await page.waitForSelector('.mdv-search-item');
      assert.deepEqual(await page.evaluate(overflowing), [], 'search results');
      await page.keyboard.press('Escape');
      await openMenu(page);
      assert.deepEqual(await page.evaluate(overflowing), [], 'menu');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'whole page');
      await loadFolder(page, fixture('nav'));
      await page.waitForSelector('.mdv-sidenav a');
      assert.deepEqual(await page.evaluate(overflowing), [], 'custom navigation');
    });
    await withPage(browser, { viewport: { width: 390, height: 800 } }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.click('.mdv-btn-sidebar');
      await page.waitForSelector('.mdv-app[data-sidebar="open"]');
      await page.waitForTimeout(300);
      assert.deepEqual(await page.evaluate(overflowing), [], 'drawer on a narrow screen');
    });
  });
});

describe('Printing (FR-504)', () => {
  test('prints only the body, always in light colors', async () => {
    await withPage(browser, { colorScheme: 'dark' }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/syntax.md', '記法');
      await page.waitForSelector('.mdv-mermaid svg');
      assert.equal(await theme(page), 'dark');
      await page.emulateMedia({ media: 'print' });
      const r = await page.evaluate(() => {
        const display = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).display : 'absent'; };
        return {
          hidden: ['.mdv-header', '.mdv-sidebar', '.mdv-toc', '.mdv-toc-inline', '.mdv-doc-meta', '.mdv-copy', '.mdv-anchor', '.mdv-toasts'].map(display),
          prose: display('.mdv-prose'),
          bg: getComputedStyle(document.body).backgroundColor,
          sheet: getComputedStyle(document.querySelector('.mdv-sheet')).backgroundColor,
          color: getComputedStyle(document.querySelector('.mdv-prose li')).color,
          alertTitle: getComputedStyle(document.querySelector('.markdown-alert-title')).color,
          codeWrap: getComputedStyle(document.querySelector('.mdv-prose pre')).whiteSpace
        };
      });
      assert.deepEqual(r.hidden, ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none']);
      assert.equal(r.prose, 'block');
      assert.equal(r.bg, 'rgb(255, 255, 255)');
      assert.equal(r.sheet, 'rgb(255, 255, 255)');
      assert.equal(r.color, 'rgb(0, 0, 0)');
      assert.equal(r.alertTitle, 'rgb(138, 90, 0)', 'alert colors are also light');
      assert.equal(r.codeWrap, 'pre-wrap', 'long code wraps when printed');
      const pdf = await page.pdf({ format: 'A4' });
      assert.ok(pdf.length > 5000, 'can be output as PDF');
    });
  });
});
