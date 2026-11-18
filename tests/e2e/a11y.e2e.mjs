// Accessibility (NFR-4)
// Items that can be judged mechanically are checked with axe-core (an independent checking engine); keyboard operation, focus and colors are checked individually.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  launchBrowser, openPage, withPage, loadFolder, fixture, heading, waitHeading, waitIndexed, goTo, clickMenu, openMenu, ROOT
} from '../helpers/e2e.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const axeSource = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');

/**
 * Run axe-core and return violations as a list of "rule: targets".
 * Colors set by the document author via style (#user-content-styled) are not app colors, so they are excluded.
 */
async function audit(page) {
  await page.evaluate(axeSource);
  const result = await page.evaluate(async () => {
    // preload: false stops axe-core from fetching stylesheets for the check (it would try to read the neighboring mdfolio.css, be blocked by the CSP connect-src,
    // and that would be recorded as an error. It is not app behavior)
    const r = await window.axe.run({ exclude: [['.mdv-prose [style*="color"]']] }, { resultTypes: ['violations'], preload: false });
    return { violations: r.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | ')), passes: r.passes.length };
  });
  return result;
}

async function openSyntax(page) {
  await loadFolder(page, fixture('site'));
  await waitIndexed(page);
  await goTo(page, '#/syntax.md', '記法');
  await page.waitForSelector('.mdv-mermaid svg');
  await page.waitForSelector('.mdv-mermaid-error');
}

const active = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return 'body';
  return el.getAttribute('data-action') || el.id || (el.className && String(el.className).split(' ').filter((c) => c.indexOf('mdv-') === 0).pop()) || el.nodeName;
});

describe('Automated checks (axe-core)', () => {
  for (const scheme of ['light', 'dark']) {
    test(`no violations on the main screens (${scheme === 'light' ? 'light' : 'dark'})`, async () => {
      const { page, context } = await openPage(browser, { colorScheme: scheme });
      try {
        const checked = [];
        const check = async (label) => {
          const r = await audit(page);
          assert.deepEqual(r.violations, [], `violations in ${label}`);
          assert.ok(r.passes > 15, `${label}: the check ran`);
          checked.push(label);
        };
        await check('start screen');
        await loadFolder(page, fixture('site'));
        await waitIndexed(page);
        await check('document (links, images)');
        await goTo(page, '#/syntax.md', '記法');
        await page.waitForSelector('.mdv-mermaid svg');
        await page.waitForSelector('.mdv-mermaid-error');
        await check('document (tables, code, math, diagrams, task lists, footnotes, alerts)');
        await page.fill('.mdv-search-input', '固有語');
        await page.waitForSelector('.mdv-search-item');
        await check('search results');
        await page.fill('.mdv-search-input', 'どこにもない語zzz');
        await page.waitForSelector('.mdv-search-empty');
        await check('no search results');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await openMenu(page);
        await check('menu');
        await page.keyboard.press('Escape');
        await clickMenu(page, 'menuExport');
        await page.waitForSelector('dialog.mdv-dialog-export[open]');
        await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
        await check('export dialog');
        await page.click('.mdv-export-cancel');
        await clickMenu(page, 'menuExternalImages');
        await page.waitForSelector('dialog.mdv-dialog-external[open]');
        await check('external image confirmation dialog');
        await page.click('.mdv-external-cancel');
        await clickMenu(page, 'menuAbout');
        await page.waitForSelector('dialog.mdv-dialog-about[open]');
        await check('license dialog');
        await page.click('.mdv-about-close');
        await clickMenu(page, 'menuHelp');
        await page.waitForFunction(() => window.MDV.app.state.view === 'help');
        await check('help');
        await goTo(page, '#/nothing.md');
        await page.waitForSelector('.mdv-empty');
        await check('document not found');
        await goTo(page, '#/assets/data.csv');
        await page.waitForSelector('.mdv-download');
        await check('attachment');
        // A document containing every display component (including the placeholder for images that cannot be shown)
        await loadFolder(page, fixture('a11y'));
        await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2);
        await check('all display components');
        // Custom navigation (tabs) and English UI
        await loadFolder(page, fixture('nav'));
        await page.waitForSelector('.mdv-sidenav a');
        await check('custom navigation');
        await clickMenu(page, 'menuLanguage');
        await page.waitForFunction(() => document.documentElement.lang === 'en');
        await check('English UI');
        assert.equal(checked.length, 15);
      } finally {
        await context.close();
      }
    });
  }

  test('no violations on a narrow screen (drawer, collapsible table of contents)', async () => {
    await withPage(browser, { viewport: { width: 390, height: 800 } }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.deepEqual((await audit(page)).violations, []);
      await page.click('.mdv-btn-sidebar');
      await page.waitForSelector('.mdv-app[data-sidebar="open"]');
      await page.waitForTimeout(350);
      assert.deepEqual((await audit(page)).violations, []);
      await page.keyboard.press('Escape');
      await page.click('.mdv-toc-inline summary');
      assert.deepEqual((await audit(page)).violations, []);
    });
  });
});

describe('Color contrast (4.5:1 or higher)', () => {
  // Computed from the actual text and background colors of visible elements. Includes math, diagrams and overlapping elements that axe leaves undecided.
  const measure = () => {
    const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const background = (el) => {
      const layers = [];
      for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
        const c = parse(getComputedStyle(p).backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; }
      }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
      return bg;
    };
    const out = [];
    const add = (label, fg, bg) => { out.push([label, Math.round(ratio(over(fg, bg), bg) * 100) / 100]); };
    const selectors = [
      '.mdv-title', '.mdv-search-kbd', '.mdv-doc-path', '.mdv-doc-date', '.mdv-prose h1', '.mdv-prose h2', '.mdv-prose h3', '.mdv-prose p', '.mdv-prose li',
      '.mdv-prose a', '.mdv-prose a.mdv-missing', '.mdv-prose :not(pre) > code', '.mdv-code pre code', '.mdv-code-lang', '.mdv-copy', '.mdv-prose blockquote p',
      '.mdv-prose th', '.mdv-prose td', '.mdv-prose .footnotes li', '.mdv-prose .footnote-backref', '.mdv-prose .footnote-ref a', '.mdv-prose s', '.mdv-prose kbd', '.mdv-prose h4', '.mdv-prose summary', '.mdv-prose strong', '.mdv-prose em',
      '.markdown-alert-note .markdown-alert-title', '.markdown-alert-tip .markdown-alert-title', '.markdown-alert-important .markdown-alert-title',
      '.markdown-alert-warning .markdown-alert-title', '.markdown-alert-caution .markdown-alert-title', '.markdown-alert p:not(.markdown-alert-title)',
      '.mdv-toc-title', '.mdv-toc-link', '.mdv-toc-link.is-current', '.mdv-side-tree a', '.mdv-side-tree a[aria-current="page"]', '.mdv-side-tree summary',
      '.mdv-ph-text', '.mdv-mermaid-error-title', '.mdv-mermaid-error-msg', '.mdv-mermaid-error pre', '.katex', '.katex-error', '.math-display .katex',
      '.mdv-search-item .mdv-search-item-title', '.mdv-search-item .mdv-search-item-path', '.mdv-search-item .mdv-search-item-snippet', '.mdv-search-item mark', '.mdv-search-foot',
      '.mdv-search-item.is-active .mdv-search-item-title', '.mdv-search-item.is-active .mdv-search-item-path', '.mdv-search-item.is-active .mdv-search-item-snippet',
      '.mdv-search-item:not(.is-active) .mdv-search-item-title', '.mdv-search-item:not(.is-active) .mdv-search-item-path', '.mdv-search-item:not(.is-active) .mdv-search-item-snippet',
      'mark.mdv-hit', '.mdv-menu-item', '.mdv-btn', '.mdv-btn-primary', '.mdv-dialog-title', '.mdv-dialog-lead', '.mdv-field-label', '.mdv-export-summary', '.mdv-input',
      '.mdv-welcome-title', '.mdv-welcome-lead', '.mdv-open-folder', '.mdv-open-files', '.mdv-welcome-foot a', '.mdv-empty-title', '.mdv-empty-body', '.mdv-toast', '.mdv-notice', '.mdv-plain',
      '.mdv-side-tab[aria-selected="true"]', '.mdv-side-tab[aria-selected="false"]', '.mdv-sidenav a', '.mdv-sidenav-label', '.mdv-toc-inline summary'
    ];
    const missing = [];
    selectors.forEach((sel) => {
      const el = Array.from(document.querySelectorAll(sel)).find((e) => e.getClientRects().length > 0);
      if (!el) { missing.push(sel); return; }
      add(sel, parse(getComputedStyle(el).color), background(el));
    });
    // Code highlighting: check every color in use
    const seen = new Set();
    document.querySelectorAll('.mdv-code pre span').forEach((span) => {
      const color = getComputedStyle(span).color;
      const key = span.className + ' ' + color;
      if (seen.has(key)) return;
      seen.add(key);
      add('code ' + span.className, parse(color), background(span));
    });
    // Search box placeholder
    const input = document.querySelector('.mdv-search-input');
    if (input && input.getClientRects().length) add('search placeholder', parse(getComputedStyle(input, '::placeholder').color), background(input));
    // Diagrams: text color and the color of the shape beneath it
    document.querySelectorAll('.mdv-mermaid .nodeLabel').forEach((label, i) => {
      const node = label.closest('.node');
      const shape = node && node.querySelector('rect, polygon, circle, path');
      if (!shape) return;
      const fill = parse(getComputedStyle(shape).fill);
      if (fill) add('diagram node ' + i, parse(getComputedStyle(label).color), over(fill, background(label)));
    });
    document.querySelectorAll('.mdv-mermaid .edgeLabel p, .mdv-mermaid .edgeLabel span').forEach((label, i) => {
      if (label.textContent.trim()) add('diagram edge label ' + i, parse(getComputedStyle(label).color), background(label));
    });
    return { list: out, missing: missing };
  };

  async function collect(page) {
    const all = [];
    const missing = new Set();
    const merge = async (state) => {
      const r = await page.evaluate(measure);
      r.list.forEach((x) => all.push([state + ' / ' + x[0], x[1]]));
      return r.missing;
    };
    const found = new Set();
    const track = (list, miss) => { list.forEach((s) => { if (!miss.includes(s)) found.add(s); }); };
    const states = [];
    const step = async (name) => { const miss = await merge(name); states.push(miss); };
    await step('start screen');
    await loadFolder(page, fixture('site'));
    await waitIndexed(page);
    await step('document');
    await goTo(page, '#/syntax.md', '記法');
    await page.waitForSelector('.mdv-mermaid svg');
    await page.waitForSelector('.mdv-mermaid-error');
    await page.evaluate(() => document.fonts.ready);
    await step('syntax');
    await page.fill('.mdv-search-input', '固有語');
    await page.waitForSelector('.mdv-search-item');
    await step('search');
    await page.click('.mdv-search-item');
    await page.waitForSelector('mark.mdv-hit');
    await step('search term highlight');
    await openMenu(page);
    await step('menu');
    await page.keyboard.press('Escape');
    await clickMenu(page, 'menuExport');
    await page.waitForSelector('dialog.mdv-dialog-export[open]');
    await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
    await step('export');
    await page.click('.mdv-export-run');
    await page.waitForSelector('.mdv-toast');
    await step('notification');
    await goTo(page, '#/nothing.md');
    await page.waitForSelector('.mdv-empty');
    await step('not found');
    await loadFolder(page, fixture('a11y'));
    await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2);
    await page.waitForFunction(() => window.MDV.app.state.pendingCode === null);
    await step('all display components');
    await loadFolder(page, fixture('nav'));
    await page.waitForSelector('.mdv-sidenav a');
    await step('custom navigation');
    // Display of a document that is too large (shown as plain text without conversion, with a notice saying so)
    await page.evaluate(() => { window.MDV.core.LIMITS.maxDocBytes = 10; });
    await loadFolder(page, fixture('single'));
    await page.waitForSelector('.mdv-notice:not([hidden])');
    await step('document too large');
    // Targets not found in any state are treated as missed checks
    const never = states.reduce((acc, miss) => acc.filter((s) => miss.includes(s)), states[0] || []);
    track([], []);
    return { all, never, missing, found };
  }

  for (const scheme of ['light', 'dark']) {
    test(`text-to-background contrast ratio is 4.5:1 or higher (${scheme === 'light' ? 'light' : 'dark'})`, async (t) => {
      const { page, context } = await openPage(browser, { colorScheme: scheme, viewport: { width: 1440, height: 900 } });
      try {
        const r = await collect(page);
        // The collapsible table of contents (for narrow screens) is checked separately
        assert.deepEqual(r.never.filter((s) => s !== '.mdv-toc-inline summary'), [], 'every check target appeared on screen');
        const low = r.all.filter((x) => x[1] < 4.5);
        assert.deepEqual(low, [], 'combinations with a contrast ratio below 4.5:1');
        const min = r.all.reduce((a, b) => (b[1] < a[1] ? b : a));
        t.diagnostic(`Checked ${r.all.length} items. Minimum ${min[1]}:1 (${min[0]})`);
        assert.ok(r.all.length > 120);
        // Math, diagram and code colors that the automated check (axe) leaves undecided are also covered
        for (const key of ['diagram node', 'diagram edge label', 'code hljs-keyword', 'code hljs-comment', 'code hljs-string', '.katex', 'search placeholder']) {
          assert.ok(r.all.some((x) => x[0].includes(key)), `${key} is checked`);
        }
      } finally {
        await context.close();
      }
    });
  }

  test('collapsible table of contents on a narrow screen, and print colors', async () => {
    await withPage(browser, { viewport: { width: 900, height: 800 }, colorScheme: 'dark' }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const r = await page.evaluate(measure);
      const toc = r.list.find((x) => x[0] === '.mdv-toc-inline summary');
      assert.ok(toc && toc[1] >= 4.5, `collapsible table of contents: ${toc && toc[1]}`);
      await page.emulateMedia({ media: 'print' });
      const printed = await page.evaluate(measure);
      const low = printed.list.filter((x) => x[1] < 4.5);
      assert.deepEqual(low, [], 'when printing (always light colors)');
    });
  });
});

describe('Fully operable with the keyboard alone', () => {
  test('Tab order: skip link -> header -> sidebar -> body', async () => {
    // The first Tab right after opening the page reaches the skip-to-content link
    await withPage(browser, async ({ page }) => {
      await page.keyboard.press('Tab');
      assert.equal(await active(page), 'mdv-skip');
      assert.ok(await page.isVisible('.mdv-skip'), 'visible when focused');
      assert.equal(await page.textContent('.mdv-skip'), '本文へ移動');
      await page.keyboard.press('Enter');
      assert.equal(await active(page), 'mdv-main');
      await page.keyboard.press('Tab');
      assert.equal(await active(page), 'mdv-open-folder', 'on the start screen, the next stop is "Open folder"');
      await page.keyboard.press('Tab');
      assert.equal(await active(page), 'mdv-open-files');
    });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      // After a document is shown, focus is on the body, so check in order starting from the skip link at the top
      const first = await page.evaluate(() => {
        const el = document.querySelector('a[href], button, input:not([tabindex="-1"]), [tabindex="0"]');
        return el.className;
      });
      assert.equal(first, 'mdv-skip', 'the first focusable element in the document is the skip link');
      await page.focus('.mdv-skip');
      const order = [];
      for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); order.push(await active(page)); }
      assert.deepEqual(order.slice(0, 5), ['mdv-btn-sidebar', 'mdv-title', 'mdv-search-input', 'mdv-btn-theme', 'mdv-btn-menu']);
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.mdv-sidebar')), true, 'after the header comes the sidebar document list');
      // Using the skip link jumps past the sidebar to the body
      await page.focus('.mdv-skip');
      await page.keyboard.press('Enter');
      assert.equal(await active(page), 'mdv-main');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.mdv-main')), true);
    });
  });

  test('menu: opens with Enter or Down, moves with arrows/Home/End, closes with Esc or Tab', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.focus('.mdv-btn-menu');
      await page.keyboard.press('Enter');
      await page.waitForSelector('.mdv-menu:not([hidden])');
      assert.equal(await page.getAttribute('.mdv-btn-menu', 'aria-expanded'), 'true');
      assert.equal(await active(page), 'menuOpenFolder');
      await page.keyboard.press('ArrowDown');
      assert.equal(await active(page), 'menuOpenFiles');
      await page.keyboard.press('End');
      assert.equal(await active(page), 'menuAbout');
      await page.keyboard.press('ArrowDown');
      assert.equal(await active(page), 'menuOpenFolder', 'wraps from last to first');
      await page.keyboard.press('ArrowUp');
      assert.equal(await active(page), 'menuAbout');
      await page.keyboard.press('Home');
      assert.equal(await active(page), 'menuOpenFolder');
      await page.keyboard.press('Escape');
      assert.ok(await page.isHidden('.mdv-menu'));
      assert.equal(await active(page), 'mdv-btn-menu', 'closing returns focus to the button');
      assert.equal(await page.getAttribute('.mdv-btn-menu', 'aria-expanded'), 'false');
      // Down also opens it. Tabbing out closes it
      await page.keyboard.press('ArrowDown');
      await page.waitForSelector('.mdv-menu:not([hidden])');
      await page.keyboard.press('Tab');
      assert.ok(await page.isHidden('.mdv-menu'));
      assert.notEqual(await active(page), 'body');
      // Choose an item (the state of checkable items is exposed)
      await page.focus('.mdv-btn-menu');
      await page.keyboard.press('Enter');
      assert.equal(await page.getAttribute('.mdv-menu-item[data-action="menuExternalImages"]', 'role'), 'menuitemcheckbox');
      assert.equal(await page.getAttribute('.mdv-menu-item[data-action="menuExternalImages"]', 'aria-checked'), 'false');
      for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
      assert.equal(await active(page), 'menuLanguage');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      assert.equal(await active(page), 'mdv-btn-menu', 'focus is not lost after choosing');
      assert.equal(await page.getAttribute('.mdv-btn-menu', 'aria-label'), 'Menu');
    });
  });

  test('dialogs: focus moves inside on open, Tab cycles within, Esc closes and returns to the original button', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.focus('.mdv-btn-menu');
      await page.keyboard.press('Enter');
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog.mdv-dialog-about[open]');
      assert.equal(await active(page), 'mdv-about-close');
      const label = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return document.getElementById(d.getAttribute('aria-labelledby')).textContent; });
      assert.equal(label, 'ライセンスとバージョン');
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        const where = await page.evaluate(() => (document.activeElement === document.body || document.activeElement.closest('dialog') ? 'dialog' : 'page'));
        assert.equal(where, 'dialog', 'focus does not leave the dialog');
      }
      await page.keyboard.press('Escape');
      await page.waitForSelector('dialog.mdv-dialog-about', { state: 'detached' });
      assert.equal(await active(page), 'mdv-btn-menu');
      // Export dialog: starts at the input field, Enter runs it, Cancel is also available
      await page.keyboard.press('Enter');
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
      assert.equal(await active(page), 'menuExport');
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog.mdv-dialog-export[open]');
      assert.equal(await active(page), 'mdv-export-title');
      await page.keyboard.press('Escape');
      await page.waitForSelector('dialog.mdv-dialog-export', { state: 'detached' });
      assert.equal(await active(page), 'mdv-btn-menu');
    });
  });

  test('document list: opening with Enter moves focus to the body; folders toggle with Enter', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.focus('.mdv-side-tree a:has-text("syntax")');
      await page.keyboard.press('Enter');
      await waitHeading(page, '記法');
      assert.equal(await active(page), 'mdv-main', 'switching documents moves focus to the body');
      const summary = page.locator('.mdv-side-tree details[data-path="guide"] > summary');
      await summary.focus();
      const before = await page.evaluate(() => document.querySelector('.mdv-side-tree details[data-path="guide"]').open);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.querySelector('.mdv-side-tree details[data-path="guide"]').open), !before);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.querySelector('.mdv-side-tree details[data-path="guide"]').open), before);
      // Table of contents links also navigate with Enter
      await page.focus('.mdv-toc .mdv-toc-link >> nth=2');
      const target = await page.evaluate(() => document.activeElement.getAttribute('href'));
      await page.keyboard.press('Enter');
      await page.waitForFunction((h) => location.hash === h, target);
    });
  });

  test('body: copy buttons, wide tables and collapsibles are operable', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      await page.focus('.mdv-copy');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.mdv-copy').textContent === 'コピーしました');
      // Tables that overflow horizontally can be focused and scrolled with arrow keys
      const wide = page.locator('.mdv-table-wrap[tabindex="0"]');
      assert.equal(await wide.count(), 1, 'only overflowing tables are focusable');
      assert.equal(await wide.getAttribute('role'), 'group');
      assert.equal(await wide.getAttribute('aria-label'), '表（横にスクロールできます）');
      assert.ok((await page.locator('.mdv-table-wrap').count()) > 1);
      await wide.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.mdv-table-wrap[tabindex="0"]').scrollLeft > 0);
      // <details> in documents also toggle with Enter
      const det = page.locator('.mdv-prose details > summary').first();
      await det.focus();
      const open = () => page.evaluate(() => document.querySelector('.mdv-prose details').open);
      const was = await open();
      await page.keyboard.press('Enter');
      assert.equal(await open(), !was);
      // Task list checkboxes are display-only and their state is conveyed by their name
      const boxes = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-prose input[type="checkbox"]')).map((b) => [b.disabled, b.checked, b.getAttribute('aria-label')]));
      assert.deepEqual(boxes, [[true, false, '未完了の項目'], [true, true, '完了した項目']]);
    });
  });

  test('re-evaluates overflow when the screen width changes', async () => {
    await withPage(browser, { viewport: { width: 390, height: 800 } }, async ({ page }) => {
      await loadFolder(page, fixture('a11y'));
      const focusable = () => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-table-wrap')).map((w) => w.getAttribute('tabindex')));
      assert.deepEqual(await focusable(), [null, '0'], 'on a narrow screen, the medium-sized table overflows');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForFunction(() => document.querySelectorAll('.mdv-table-wrap[tabindex]').length === 0);
      assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-table-wrap')).map((w) => [w.getAttribute('role'), w.getAttribute('aria-label')])), [[null, null], [null, null]]);
      await page.setViewportSize({ width: 390, height: 800 });
      await page.waitForFunction(() => document.querySelectorAll('.mdv-table-wrap[tabindex="0"]').length === 1);
    });
  });

  test('wide code can also be focused and scrolled', async () => {
    await withPage(browser, async ({ page }) => {
      await page.evaluate(() => {
        const dt = new DataTransfer();
        const longLine = 'const veryLongLine = "' + 'あいうえお'.repeat(80) + '";';
        dt.items.add(new File(['# 長い行\n\n```js\n' + longLine + '\n```\n\n```js\nconst short = 1;\n```\n\n$$\n' + 'a + '.repeat(120) + 'b\n$$\n'], 'long.md', { type: 'text/markdown' }));
        const input = document.querySelector('.mdv-input-files');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await waitHeading(page, '長い行');
      await page.waitForSelector('.katex');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-code pre[tabindex="0"]').length === 1);
      const info = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-code pre')).map((p) => [p.getAttribute('tabindex'), p.getAttribute('role'), p.getAttribute('aria-label')]));
      assert.deepEqual(info, [['0', 'group', 'コード（横にスクロールできます）'], [null, null, null]]);
      assert.deepEqual((await audit(page)).violations, []);
    });
  });

  test('sidebar tabs: switch with the left and right arrows', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('nav'));
      await page.waitForSelector('.mdv-sidenav a');
      const tabs = () => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-side-tab')).map((b) => b.getAttribute('aria-selected')));
      assert.equal(await page.getAttribute('.mdv-side-tabs', 'role'), 'tablist');
      assert.equal(await page.getAttribute('#mdv-sidenav', 'role'), 'tabpanel');
      assert.equal(await page.getAttribute('#mdv-sidenav', 'aria-labelledby'), 'mdv-tab-nav');
      assert.equal(await page.getAttribute('#mdv-tab-files', 'aria-controls'), 'mdv-side-tree');
      await page.focus('.mdv-side-tab[data-tab="nav"]');
      await page.keyboard.press('ArrowRight');
      assert.deepEqual(await tabs(), ['false', 'true']);
      assert.equal(await active(page), 'mdv-tab-files');
      assert.ok(await page.isVisible('.mdv-side-tree'));
      await page.keyboard.press('ArrowLeft');
      assert.deepEqual(await tabs(), ['true', 'false']);
      await page.keyboard.press('End');
      assert.deepEqual(await tabs(), ['false', 'true']);
      await page.keyboard.press('Home');
      assert.deepEqual(await tabs(), ['true', 'false']);
    });
    // Without custom navigation, neither tabs nor the tabpanel role are shown
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.ok(await page.isHidden('.mdv-side-tabs'));
      assert.equal(await page.getAttribute('#mdv-side-tree', 'role'), null);
    });
  });

  test('the focus position is visible', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('a11y'));
      await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2);
      await page.focus('.mdv-skip');
      const seen = [];
      // Tab through to the end of the page and check that every stop shows a visible focus ring
      for (let i = 0; i < 80; i++) {
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
          const shadow = !!cs.boxShadow && cs.boxShadow !== 'none';
          const r = el.getBoundingClientRect();
          return { what: el.nodeName.toLowerCase() + '.' + String(el.getAttribute('class') || '').split(' ')[0], visible: ring || shadow, rect: r.width > 0 && r.height > 0 };
        });
        if (!info) break;
        seen.push(info);
        await page.keyboard.press('Tab');
      }
      const hidden = seen.filter((x) => !x.visible || !x.rect).map((x) => x.what);
      assert.deepEqual(hidden, [], 'elements without a visible focus ring');
      const kinds = Array.from(new Set(seen.map((x) => x.what)));
      for (const k of ['a.mdv-skip', 'button.mdv-iconbtn', 'input.mdv-search-input', 'a.mdv-anchor', 'button.mdv-copy', 'summary.', 'a.mdv-toc-link']) {
        assert.ok(kinds.includes(k), `${k} is checked (checked: ${kinds.join(', ')})`);
      }
      assert.ok(seen.length > 30);
    });
  });
});

describe('Reduced motion and screen reader information', () => {
  test('with the "reduce motion" setting, no animations or smooth scrolling are used', async () => {
    const durations = () => Array.from(document.querySelectorAll('.mdv-app, .mdv-app *')).reduce((acc, el) => {
      const cs = getComputedStyle(el);
      const active = (v) => v.split(',').some((x) => parseFloat(x) > 0);
      if (active(cs.transitionDuration)) acc.transitions++;
      if (cs.animationName !== 'none' && active(cs.animationDuration)) acc.animations++;
      return acc;
    }, { transitions: 0, animations: 0, scroll: getComputedStyle(document.documentElement).scrollBehavior });
    const run = async (reducedMotion) => {
      const context = await browser.newContext({ reducedMotion, locale: 'ja-JP', viewport: { width: 390, height: 800 } });
      try {
        const page = await context.newPage();
        await page.addInitScript(() => { Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true, writable: true }); });
        await page.goto((await import('../helpers/e2e.mjs')).VIEWER_URL);
        await page.waitForSelector('.mdv-app');
        await loadFolder(page, fixture('site'));
        await page.click('.mdv-btn-sidebar');
        return await page.evaluate(durations);
      } finally {
        await context.close();
      }
    };
    const normal = await run('no-preference');
    const reduced = await run('reduce');
    assert.ok(normal.transitions > 0, 'transitions exist normally (so the check is meaningful)');
    assert.deepEqual(reduced, { transitions: 0, animations: 0, scroll: 'auto' });
  });

  test('page regions (landmarks) and names', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const r = await page.evaluate(() => ({
        banner: document.querySelectorAll('header.mdv-header').length,
        main: document.querySelectorAll('main').length,
        navs: Array.from(document.querySelectorAll('nav')).map((n) => n.getAttribute('aria-label')),
        h1: Array.from(document.querySelectorAll('main h1')).filter((h) => h.getClientRects().length > 0).length, // exactly one visible h1
        lang: document.documentElement.lang,
        title: document.title,
        live: document.querySelector('.mdv-toasts').getAttribute('aria-live'),
        search: ['role', 'aria-label', 'aria-controls', 'aria-expanded', 'aria-autocomplete'].map((a) => document.querySelector('.mdv-search-input').getAttribute(a)),
        current: Array.from(document.querySelectorAll('[aria-current]')).map((e) => e.getAttribute('aria-current')).sort(),
        hiddenInputs: Array.from(document.querySelectorAll('input[type="file"]')).every((i) => i.getAttribute('tabindex') === '-1' && i.getAttribute('aria-hidden') === 'true'),
        icons: Array.from(document.querySelectorAll('.mdv-header svg, .mdv-sidebar svg')).every((s) => s.getAttribute('aria-hidden') === 'true')
      }));
      assert.deepEqual(r, {
        banner: 1, main: 1, navs: ['文書一覧', 'このページの目次'], h1: 1, lang: 'ja', title: 'テスト用サイト', live: 'polite',
        search: ['combobox', '文書を検索', 'mdv-search-list', 'false', 'list'],
        current: ['location', 'page'], hiddenInputs: true, icons: true
      });
      // The search result count is announced to screen readers
      await page.fill('.mdv-search-input', '固有語');
      await page.waitForSelector('.mdv-search-item');
      assert.equal(await page.getAttribute('.mdv-search-foot [role="status"]', 'role'), 'status');
      assert.match(await page.textContent('.mdv-search-foot [role="status"]'), /^\d+ 件$/);
      assert.equal(await page.getAttribute('#mdv-search-list', 'aria-label'), '検索結果');
      assert.equal(await page.getAttribute('.mdv-search-input', 'aria-expanded'), 'true');
      const options = await page.evaluate(() => Array.from(document.querySelectorAll('#mdv-search-list > *')).map((o) => [o.getAttribute('role'), o.id, o.getAttribute('aria-selected')]));
      assert.ok(options.length >= 5 && options.every((o) => o[0] === 'option' && /^mdv-search-opt-\d+$/.test(o[1])));
      assert.equal(options[0][2], 'true');
      assert.equal(await heading(page), 'テスト用サイト');
    });
  });
});
