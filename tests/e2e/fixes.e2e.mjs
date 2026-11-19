// Fixes from the user evaluation (SPEC 3.11: FR-1101 to FR-1113)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, launchBrowser, withPage, loadFolder, waitHeading, waitIndexed, goTo, heading,
  tmpDir, writeTree, viewerWithConfig
} from '../helpers/e2e.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const PIE = '```mermaid\npie title 内訳\n  "A" : 30\n  "B" : 25\n  "C" : 20\n  "D" : 15\n  "E" : 10\n```\n';
const GANTT = '```mermaid\ngantt\n  title 年間計画\n  dateFormat YYYY-MM-DD\n' +
  Array.from({ length: 12 }, (_, i) => `  作業 ${i + 1} : t${i}, 2026-${String(i + 1).padStart(2, '0')}-01, 25d`).join('\n') + '\n```\n';

const SEQUENCE = '```mermaid\nsequenceDiagram\n' + ['利用者', '画面', 'サーバー', 'データベース', '外部サービス', '管理者'].map((p) => `  participant ${p}`).join('\n') +
  '\n  利用者->>管理者: 長いメッセージの例です\n```\n';
const waitDiagrams = (page, n) => page.waitForFunction((count) => document.querySelectorAll('.mdv-mermaid svg').length >= count, n, { timeout: 20000 });

describe('Diagrams (FR-1101, FR-1102)', () => {
  test('pie slices use distinct --chart-N colors in light and dark, none equal to the background', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 円グラフ\n\n' + PIE });
    for (const colorScheme of ['light', 'dark']) {
      await withPage(browser, { colorScheme }, async ({ page }) => {
        await loadFolder(page, dir);
        await waitDiagrams(page, 1);
        const r = await page.evaluate(() => {
          const css = getComputedStyle(document.documentElement);
          const vars = Array.from({ length: 8 }, (_, i) => css.getPropertyValue('--chart-' + (i + 1)).trim().toLowerCase());
          const fills = Array.from(document.querySelectorAll('.mdv-mermaid svg path.pieCircle')).map((p) => getComputedStyle(p).fill);
          return { vars, sheet: css.getPropertyValue('--sheet').trim().toLowerCase(), fills };
        });
        assert.equal(new Set(r.vars).size, 8, colorScheme + ': eight different chart colors');
        assert.ok(r.vars.every((v) => /^#[0-9a-f]{6}$/.test(v) && v !== r.sheet), colorScheme + ': ' + r.vars.join(' '));
        assert.equal(r.fills.length, 5);
        assert.equal(new Set(r.fills).size, 5, colorScheme + ': every slice has its own color: ' + r.fills.join(' '));
      });
    }
  });

  test('a diagram that would shrink below half its width is shown at natural size and scrolls; a small one still fits', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 図の幅\n\n' + SEQUENCE + '\n' + PIE + '\n' + GANTT });
    await withPage(browser, { viewport: { width: 390, height: 844 } }, async ({ page }) => {
      await loadFolder(page, dir);
      await waitDiagrams(page, 3);
      const r = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-mermaid')).map((c) => {
        const svg = c.querySelector('svg');
        return { wide: c.classList.contains('is-wide'), scrolls: c.scrollWidth > c.clientWidth + 1, svgWidth: svg.getBoundingClientRect().width, box: c.clientWidth };
      }));
      assert.equal(r[0].wide, true, 'the sequence diagram is wide');
      assert.equal(r[0].scrolls, true, 'and can be scrolled sideways');
      assert.ok(r[0].svgWidth > r[0].box * 2, 'shown at natural size: ' + JSON.stringify(r[0]));
      for (const i of [1, 2]) {
        assert.equal(r[i].wide, false, 'the pie chart and the gantt chart (laid out to the column width) still fit');
        assert.ok(r[i].svgWidth <= r[i].box + 1);
      }
      // Scroll cue (FR-1103)
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.mdv-mermaid.is-wide')).backgroundImage);
      assert.ok(bg.includes('radial-gradient'), bg);
    });
  });
});

describe('Scroll cue on wide content (FR-1103)', () => {
  test('tables and display math have the edge shadow', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 横に長い\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n$$\nx = 1\n$$\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await page.waitForSelector('.mdv-prose .math-display');
      const bgs = await page.evaluate(() => ['.mdv-table-wrap', '.math-display'].map((s) => getComputedStyle(document.querySelector('.mdv-prose ' + s)).backgroundImage));
      for (const bg of bgs) assert.ok(bg.includes('radial-gradient') && bg.includes('linear-gradient'), bg);
    });
  });
});

describe('Site title and file list labels (FR-1104, FR-1105)', () => {
  test('the title from the settings comes first; otherwise the home document title; the tab does not repeat it', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '---\ntitle: 前付けのホーム\n---\n\n# 見出しのホーム\n', 'b.md': '# 二番目\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      assert.equal(await page.textContent('.mdv-title'), '前付けのホーム', 'front matter title of the home document');
      assert.equal(await page.title(), '前付けのホーム');
      await goTo(page, '#/b.md', '二番目');
      assert.equal(await page.title(), '二番目 - 前付けのホーム');
    });
    await withPage(browser, { url: viewerWithConfig({ title: '設定の題名' }) }, async ({ page }) => {
      await loadFolder(page, dir);
      assert.equal(await page.textContent('.mdv-title'), '設定の題名');
      assert.equal(await page.title(), '前付けのホーム - 設定の題名');
    });
  });

  test('file list labels are titles, with the path as the tooltip', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# ホーム\n', 'notes/2026-04-01.md': '# 四月の打ち合わせ\n', 'plain.md': '見出しのない文書\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await waitIndexed(page);
      await page.waitForFunction(() => document.querySelector('.mdv-side-tree a[data-path="notes/2026-04-01.md"]').textContent.trim() === '四月の打ち合わせ');
      const items = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-side-tree a[data-path]')).map((a) => [a.getAttribute('data-path'), a.textContent.trim(), a.getAttribute('title')]));
      assert.deepEqual(items, [
        ['README.md', 'ホーム', 'README.md'],
        ['plain.md', 'plain', 'plain.md'],
        ['notes/2026-04-01.md', '四月の打ち合わせ', 'notes/2026-04-01.md']
      ]);
    });
  });
});

describe('External images are allowed per HTML file (FR-1107)', () => {
  test('the choice saved for one file does not apply to another, and the old shared value is dropped', async () => {
    const a = viewerWithConfig({});
    const b = viewerWithConfig({});
    const pathB = new URL(b).pathname;
    await withPage(browser, { url: a }, async ({ page }) => {
      await page.evaluate((p) => {
        localStorage.setItem('mdv:settings:v1', JSON.stringify({ externalImages: true }));
        localStorage.setItem('mdv:external:' + p, '1');
      }, pathB);
      await page.reload();
      await page.waitForSelector('.mdv-app');
      assert.equal(await page.evaluate(() => window.MDV.app.state.mediaLocked), true, 'file A: the old shared value and file B\'s choice are not used');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mdv:settings:v1')).externalImages), undefined, 'the shared value is removed');
      await page.goto(b);
      await page.waitForSelector('.mdv-app');
      assert.equal(await page.evaluate(() => window.MDV.app.state.mediaLocked), false, 'file B uses its own choice');
    });
  });
});

describe('Narrow screens: drawer and sidebar position (FR-1108, FR-1109)', () => {
  test('while the drawer is open the page behind is inert; Esc returns focus to the sidebar button', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# ホーム\n\n[次へ](b.md)\n', 'b.md': '# 二番目\n' });
    await withPage(browser, { viewport: { width: 390, height: 844 } }, async ({ page }) => {
      await loadFolder(page, dir);
      const inert = () => page.evaluate(() => document.querySelector('.mdv-sheet').hasAttribute('inert'));
      assert.equal(await inert(), false);
      await page.click('.mdv-btn-sidebar');
      await page.waitForSelector('.mdv-app.is-drawer-open');
      assert.equal(await inert(), true);
      await page.focus('.mdv-side-tree a[data-path="b.md"]');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.mdv-app').classList.contains('is-drawer-open'));
      assert.equal(await inert(), false);
      assert.ok(await page.evaluate(() => document.activeElement.classList.contains('mdv-btn-sidebar')), 'focus is on the sidebar button');
      // Choosing a document in the drawer closes it, and focus goes to the document
      await page.click('.mdv-btn-sidebar');
      await page.waitForSelector('.mdv-app.is-drawer-open');
      await page.click('.mdv-side-tree a[data-path="b.md"]');
      await waitHeading(page, '二番目');
      assert.equal(await inert(), false);
      assert.ok(await page.evaluate(() => !document.querySelector('.mdv-sidebar').contains(document.activeElement)), 'focus left the closed drawer');
    });
  });

  test('after moving to another document, the active item in a long list is scrolled into view', async () => {
    const files = { 'README.md': '# ホーム\n' };
    for (let i = 1; i <= 80; i++) files[`doc${String(i).padStart(2, '0')}.md`] = `# 文書 ${i}\n`;
    const dir = writeTree(tmpDir(), files);
    await withPage(browser, { viewport: { width: 1280, height: 600 } }, async ({ page }) => {
      await loadFolder(page, dir);
      await goTo(page, '#/doc80.md', '文書 80');
      await page.waitForFunction(() => {
        const a = document.querySelector('.mdv-side-tree a[aria-current="page"]');
        const box = document.querySelector('.mdv-sidebar').getBoundingClientRect();
        const r = a && a.getBoundingClientRect();
        return r && r.top >= box.top - 1 && r.bottom <= Math.min(box.bottom, window.innerHeight) + 1;
      }, null, { timeout: 5000 });
    });
  });
});

describe('Emphasis next to CJK text (FR-1106)', () => {
  test('bold next to Japanese text works in the app', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 太字\n\n改善は**1.8%**の向上で、これは**「重要」**です。\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      const strong = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-prose strong')).map((e) => e.textContent));
      assert.deepEqual(strong, ['1.8%', '「重要」']);
      assert.ok(!(await page.textContent('.mdv-prose')).includes('**'));
    });
  });
});

describe('Math, search, help and fonts (FR-1110 to FR-1113)', () => {
  test('\\label in math is ignored instead of showing an error', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 数式\n\n$$\nE = mc^2 \\label{eq:energy}\n$$\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await page.waitForSelector('.mdv-prose .math-display .katex');
      assert.equal(await page.locator('.mdv-prose .katex-error').count(), 0);
      assert.ok(!(await page.textContent('.mdv-prose .math-display')).includes('label'));
    });
  });

  test('Enter right after typing opens the top result', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# ホーム\n', 'target.md': '# 目的の文書\n\n合言葉ゼータ。\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await waitIndexed(page);
      await page.fill('.mdv-search-input', 'ゼータ');
      await page.keyboard.press('Enter');
      await waitHeading(page, '目的の文書');
      assert.equal(await heading(page), '目的の文書');
    });
  });

  test('the help starts with a section for people new to Markdown', () => {
    for (const [file, title] of [['src/help.en.md', '## New to Markdown?'], ['src/help.ja.md', '## Markdown がはじめての方へ']]) {
      const first = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n').find((l) => l.startsWith('## '));
      assert.equal(first, title, file);
    }
  });

  test('the code font lists Latin monospace fonts before Japanese fonts', async () => {
    await withPage(browser, async ({ page }) => {
      const fonts = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-mono'))).split(',').map((s) => s.trim().replace(/"/g, ''));
      const latin = ['DejaVu Sans Mono', 'Liberation Mono', 'Courier New'].map((f) => fonts.indexOf(f));
      const japanese = ['BIZ UDGothic', 'MS Gothic', 'Noto Sans Mono CJK JP'].map((f) => fonts.indexOf(f));
      assert.ok(latin.every((i) => i >= 0) && Math.max(...latin) < Math.min(...japanese), fonts.join(', '));
    });
  });
});
