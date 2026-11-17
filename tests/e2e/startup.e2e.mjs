// Startup, start screen, CSP, config block, help, license display
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser, withPage, loadFolder, fixture, VIEWER, tmpDir, clickMenu, hash, heading, waitHeading } from '../helpers/e2e.mjs';
import { core } from '../helpers/load.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

/** Build a variant of the viewer HTML with some of its parts rewritten. */
function variant(mutate) {
  const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
  mutate(parts);
  const file = path.join(tmpDir(), 'variant.html');
  fs.writeFileSync(file, core.composeHtml(parts));
  return pathToFileURL(file).href;
}

describe('Startup', () => {
  test('shows the start screen with no errors, CSP violations or network requests (FR-901, SEC-5, NFR-1)', async () => {
    await withPage(browser, async ({ page }) => {
      assert.equal(await page.title(), 'mdfolio');
      assert.equal(await page.textContent('.mdv-welcome-title'), 'Markdown のフォルダを、そのままサイトとして読む。');
      assert.ok(await page.isVisible('.mdv-open-folder'));
      assert.ok(await page.isVisible('.mdv-open-files'));
      assert.ok(await page.isHidden('.mdv-search'), 'no search box while no document set is loaded');
      assert.ok(await page.isHidden('.mdv-sidebar'));
      assert.ok(await page.isHidden('.mdv-open-last'));
      assert.equal(await page.getAttribute('.mdv-app', 'data-has-set'), 'false');
      assert.equal(await page.getAttribute('html', 'lang'), 'ja');
      const info = await page.evaluate(() => ({
        externalScripts: document.querySelectorAll('script[src]').length,
        // The only <link>s are the tab icon (a data: URL inside the HTML) and the neighboring mdfolio.css (SPEC 3.10). No external files are referenced
        links: Array.from(document.querySelectorAll('link:not([data-mdv-dyn])')).map((l) => l.rel + ' ' + l.getAttribute('href').slice(0, 19)),
        externalRefs: document.querySelectorAll('link[href^="http"], link[href^="/"], script[src], img[src^="http"], iframe').length,
        version: window.MDV.app.version,
        mode: window.MDV.app.state.mode,
        mediaLocked: window.MDV.app.state.mediaLocked
      }));
      assert.deepEqual(info, { externalScripts: 0, links: ['icon data:image/svg+xml,', 'stylesheet mdfolio.css'], externalRefs: 0, version: core.VERSION, mode: 'viewer', mediaLocked: true });
    });
  });

  test('CSP: scripts allowed by hash only, no network destinations (SEC-4)', async () => {
    await withPage(browser, async ({ page }) => {
      const csp = await page.getAttribute('meta[http-equiv="Content-Security-Policy"]', 'content');
      const directives = Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
        const i = d.indexOf(' ');
        return i < 0 ? [d, ''] : [d.slice(0, i), d.slice(i + 1)];
      }));
      assert.equal(directives['default-src'], "'none'");
      assert.equal(directives['connect-src'], "'none'");
      assert.equal(directives['object-src'], "'none'");
      assert.equal(directives['frame-src'], "'none'");
      assert.equal(directives['base-uri'], "'none'");
      assert.equal(directives['form-action'], "'none'");
      const sources = directives['script-src'].split(/\s+/);
      assert.equal(sources.length, 4, 'four scripts (libraries, app, KaTeX, Mermaid)');
      for (const s of sources) assert.match(s, /^'sha256-[A-Za-z0-9+/]{43}='$/);
      assert.ok(!csp.includes('unsafe-eval'));
      assert.ok(!directives['script-src'].includes('unsafe-inline'));
    });
  });

  test('CSP: injected scripts, event handlers, eval and network requests do not run (SEC-4, SEC-5)', async () => {
    await withPage(browser, { allowErrors: true }, async ({ page, record }) => {
      const r = await page.evaluate(async () => {
        const out = {};
        const s = document.createElement('script');
        s.textContent = 'window.__injected = 1;';
        document.head.appendChild(s);
        out.injected = typeof window.__injected;
        const div = document.createElement('div');
        div.innerHTML = '<img src="https://example.invalid/x.png" onerror="window.__handler = 1"><a id="jsl" href="javascript:window.__jsurl = 1">x</a>';
        document.body.appendChild(div);
        document.getElementById('jsl').click();
        await new Promise((res) => setTimeout(res, 400));
        out.handler = typeof window.__handler;
        out.jsurl = typeof window.__jsurl;
        try { out.fn = new Function('return 1')(); } catch (e) { out.fn = e.name; }
        try { await fetch('https://example.invalid/'); out.fetch = 'ok'; } catch (e) { out.fetch = e.name; }
        try { new WebSocket('wss://example.invalid/'); out.ws = 'created'; } catch (e) { out.ws = e.name; }
        out.beacon = navigator.sendBeacon ? navigator.sendBeacon('https://example.invalid/b', 'x') : false;
        await new Promise((res) => setTimeout(res, 300));
        return out;
      });
      assert.equal(r.injected, 'undefined', 'scripts that do not match a hash do not run');
      assert.equal(r.handler, 'undefined', 'event handler attributes do not run');
      assert.equal(r.jsurl, 'undefined', 'javascript: URLs do not run');
      assert.equal(r.fn, 'EvalError', 'new Function is unavailable');
      assert.equal(r.fetch, 'TypeError', 'fetch is refused by the CSP');
      assert.ok(record.errors.some((e) => /Content Security Policy/.test(e)), 'recorded as a CSP violation');
      const leaked = record.requests.filter((u) => !/example\.invalid\/x\.png$/.test(u));
      assert.deepEqual(leaked, [], 'no requests leave from scripts');
    });
  });

  test('the UI language follows the browser language setting (FR-502)', async () => {
    await withPage(browser, { locale: 'en-US' }, async ({ page }) => {
      assert.equal(await page.getAttribute('html', 'lang'), 'en');
      assert.equal(await page.textContent('.mdv-welcome-title'), 'Browse a folder of Markdown files as a website.');
      assert.equal((await page.textContent('.mdv-open-folder')).trim(), 'Open folder');
    });
    await withPage(browser, { locale: 'fr-FR' }, async ({ page }) => {
      assert.equal(await page.getAttribute('html', 'lang'), 'en', 'English for anything other than Japanese');
    });
  });
});

describe('Help and licenses', () => {
  test('opens the guide from the start screen and can go back (FR-801)', async () => {
    await withPage(browser, async ({ page }) => {
      await page.click('.mdv-welcome-foot a');
      await waitHeading(page, 'mdfolio の使い方');
      assert.equal(await hash(page), '#!help');
      assert.equal(await page.title(), '使い方 - mdfolio');
      assert.ok(await page.isVisible('.mdv-toc'), 'table of contents is shown');
      assert.ok((await page.locator('.mdv-toc .mdv-toc-link').count()) >= 5);
      // Heading links inside the help navigate within the help
      await page.click('.mdv-toc .mdv-toc-link:has-text("困ったとき")');
      assert.equal(await hash(page), '#!help#' + encodeURIComponent('困ったとき'));
      await page.waitForFunction(() => window.scrollY > 100);
      await page.goBack();
      await page.goBack();
      await page.waitForSelector('.mdv-welcome:not([hidden])');
      assert.equal(await hash(page), '');
    });
  });

  test('shows the English help when the UI is in English', async () => {
    await withPage(browser, { locale: 'en-US', hash: '#!help' }, async ({ page }) => {
      await waitHeading(page, 'How to use mdfolio');
    });
  });

  test('can show licenses and the version (FR-802)', async () => {
    await withPage(browser, async ({ page }) => {
      await clickMenu(page, 'menuAbout');
      await page.waitForSelector('dialog.mdv-dialog-about[open]');
      const lead = await page.textContent('.mdv-dialog-about .mdv-dialog-lead');
      assert.ok(lead.includes('mdfolio') && lead.includes(core.VERSION));
      const text = await page.textContent('.mdv-licenses');
      for (const s of ['MIT License', 'Particle Pudding', 'markdown-it', 'dompurify', 'highlight.js', 'Ivan Sagalaev', 'katex', '@mermaid-js/tiny', 'SIL OPEN FONT LICENSE', 'Apache License', 'd3', 'lodash-es', 'Permission is hereby granted']) {
        assert.ok(text.includes(s), `license text includes "${s}"`);
      }
      assert.ok(!/elkjs|GNU GENERAL PUBLIC|Eclipse Public License/i.test(text), 'no copyleft license text');
      assert.ok(text.length > 50000);
      assert.equal(await page.getAttribute('dialog.mdv-dialog-about', 'aria-labelledby') !== null, true);
      await page.click('.mdv-about-close');
      await page.waitForSelector('dialog.mdv-dialog-about', { state: 'detached' });
    });
  });
});

describe('URLs in viewer mode', () => {
  test('opening with a hash shows the start screen, then moves to that document and position after loading (FR-304)', async () => {
    const target = core.buildRoute('guide/intro.md', '末尾');
    await withPage(browser, { hash: target }, async ({ page }) => {
      assert.ok(await page.isVisible('.mdv-welcome'));
      const note = await page.textContent('.mdv-welcome-pending');
      assert.ok(note.includes('guide/intro.md'));
      await loadFolder(page, fixture('site'));
      await waitHeading(page, 'イントロダクション');
      assert.equal(await hash(page), target);
      assert.ok(await page.evaluate(() => window.scrollY > 300), 'scrolled to the heading position');
      assert.ok(await page.isHidden('.mdv-welcome-pending'));
    });
  });

  test('shows the home document when the hash points to a document not in the loaded folder', async () => {
    await withPage(browser, { hash: '#/no/such.md' }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.equal(await heading(page), 'テスト用サイト');
      assert.equal(await hash(page), '#/README.md');
    });
  });
});

describe('Config block (FR-701)', () => {
  test('can set defaults for title, language, theme and home document', async () => {
    const url = variant((parts) => {
      core.findBlock(parts, 'mdv-config').text = core.jsonForScript({ title: 'カスタム <サイト>', lang: 'en', theme: 'dark', home: 'guide/Setup.md', allowExternalImages: false });
    });
    await withPage(browser, { url }, async ({ page }) => {
      assert.equal(await page.getAttribute('html', 'lang'), 'en');
      assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
      assert.equal(await page.textContent('.mdv-title'), 'カスタム <サイト>');
      assert.equal(await page.title(), 'カスタム <サイト>');
      await loadFolder(page, fixture('site'));
      assert.equal(await heading(page), 'セットアップ');
      assert.equal(await hash(page), '#/guide/Setup.md');
      assert.equal(await page.title(), 'セットアップ - カスタム <サイト>');
    });
  });

  test('works with default values when the config block is broken', async () => {
    const url = variant((parts) => { core.findBlock(parts, 'mdv-config').text = '{ this is not json'; });
    await withPage(browser, { url }, async ({ page }) => {
      assert.equal(await page.textContent('.mdv-title'), 'mdfolio');
      await loadFolder(page, fixture('site'));
      assert.equal(await heading(page), 'テスト用サイト');
    });
  });

  test('site data in an unsupported format is not loaded; shows a notice and starts in viewer mode (spec 5.5)', async () => {
    const url = variant((parts) => { core.findBlock(parts, 'mdv-site').text = core.jsonForScript({ format: 999, files: [] }); });
    await withPage(browser, { url }, async ({ page }) => {
      await page.waitForSelector('.mdv-toast-error');
      assert.ok((await page.textContent('.mdv-toast-error')).includes('埋め込まれた文書データを読み込めませんでした'));
      assert.ok(await page.isVisible('.mdv-welcome'));
      assert.equal(await page.evaluate(() => window.MDV.app.state.mode), 'viewer');
    });
  });
});

describe('Environments where storage is unavailable (FR-702, NFR-7)', () => {
  test('works even when localStorage / IndexedDB throw', async () => {
    const init = () => {
      Storage.prototype.getItem = function () { throw new DOMException('denied', 'SecurityError'); };
      Storage.prototype.setItem = function () { throw new DOMException('denied', 'SecurityError'); };
      IDBFactory.prototype.open = function () { throw new DOMException('denied', 'SecurityError'); };
    };
    await withPage(browser, { init, picker: 'keep' }, async ({ page }) => {
      assert.ok(await page.isVisible('.mdv-welcome'));
      assert.ok(await page.isHidden('.mdv-open-last'));
      await page.click('.mdv-btn-theme');
      await page.click('.mdv-btn-theme');
      assert.equal(await page.getAttribute('html', 'data-theme'), 'dark', 'switching works in place even when it cannot be saved');
      await loadFolder(page, fixture('site'));
      assert.equal(await heading(page), 'テスト用サイト');
    });
  });
});
