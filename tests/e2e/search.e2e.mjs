// Search (FR-401 to FR-405)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  launchBrowser, withPage, loadFolder, fixture, hash, heading, waitHeading, waitIndexed, goTo,
  tmpDir, writeTree, mockOptions, openMock
} from '../helpers/e2e.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

async function openSite(page) {
  await loadFolder(page, fixture('site'));
  await waitIndexed(page);
}

async function search(page, q) {
  await page.fill('.mdv-search-input', q);
  await page.waitForFunction((qq) => window.MDV.app.state.search.query === qq && !document.getElementById('mdv-search-panel').hidden, q);
}

const results = (page) => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-search-item')).map((a) => ({
  path: a.querySelector('.mdv-search-item-path').textContent,
  title: a.querySelector('.mdv-search-item-title').textContent,
  snippet: a.querySelector('.mdv-search-item-snippet').textContent,
  marks: Array.from(a.querySelectorAll('mark')).map((m) => m.textContent)
})));
const paths = async (page) => (await results(page)).map((r) => r.path);
const countText = (page) => page.textContent('.mdv-search-foot span >> nth=0');

describe('Full-text search (FR-401, FR-402)', () => {
  test('shows matching documents with title, path and excerpt (matched words highlighted)', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'ベータ');
      const r = await results(page);
      assert.equal(r.length, 1);
      assert.equal(r[0].path, 'guide/intro.md');
      assert.equal(r[0].title, 'イントロダクション');
      assert.ok(r[0].snippet.includes('固有語ベータ'));
      assert.deepEqual(r[0].marks, ['ベータ']);
      assert.equal(await countText(page), '1 件');
      assert.equal(await page.getAttribute('.mdv-search-input', 'aria-expanded'), 'true');
    });
  });

  test('space-separated terms are ANDed (full-width spaces also separate)', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'Markdown 固有語');
      assert.deepEqual((await paths(page)).sort(), ['guide/intro.md', '日本語 フォルダ/仕様書 v1.0.md']);
      await search(page, 'Markdown　ベータ');
      assert.deepEqual(await paths(page), ['guide/intro.md']);
      await search(page, 'Markdown ガンマ');
      assert.deepEqual(await paths(page), []);
    });
  });

  test('ignores case and full-width/half-width differences', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      // xss.md contains "markdown js" as link text
      const expected = ['guide/intro.md', 'xss.md', '日本語 フォルダ/仕様書 v1.0.md'];
      await search(page, 'ｍａｒｋｄｏｗｎ');
      assert.deepEqual((await paths(page)).sort(), expected);
      await search(page, 'MARKDOWN');
      assert.deepEqual((await paths(page)).sort(), expected);
      await search(page, 'ガイド');
      const r = await results(page);
      assert.deepEqual(r.map((x) => x.path).sort(), ['guide/index.md', '日本語 フォルダ/仕様書 v1.0.md']);
      const spec = r.find((x) => x.path.startsWith('日本語'));
      assert.deepEqual(spec.marks, ['ｶﾞｲﾄﾞ'], 'words written in half-width kana also match and are highlighted as originally written');
    });
  });

  test('title matches rank above body matches', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'セットアップ');
      const p = await paths(page);
      assert.equal(p[0], 'guide/Setup.md');
      assert.ok(p.includes('README.md') && p.includes('guide/intro.md'));
    });
  });

  test('words in paths and code are searched; unloaded files and attachments are not', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'intro.md');
      assert.ok((await paths(page)).includes('guide/intro.md'));
      await search(page, 'const x');
      assert.deepEqual(await paths(page), ['syntax.md']);
      await search(page, 'カッパ');
      assert.deepEqual(await paths(page), [], 'documents in folders starting with . or in node_modules do not appear in search');
      await search(page, 'シータ');
      assert.deepEqual(await paths(page), [], 'non-Markdown files do not appear in search');
    });
  });

  test('display when nothing matches', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'zzzzqqqq');
      assert.equal(await page.textContent('.mdv-search-empty'), '「zzzzqqqq」に一致する文書はありません');
      assert.equal(await countText(page), '0 件');
      await page.fill('.mdv-search-input', '');
      await page.waitForSelector('#mdv-search-panel', { state: 'hidden' });
    });
  });

  test('at most 50 results; the total is shown', async () => {
    const files = { 'README.md': '# 件数の確認\n' };
    for (let i = 0; i < 60; i++) files[`docs/d${String(i).padStart(2, '0')}.md`] = `# 文書 ${i}\n\n共通キーワードを含む。\n`;
    const dir = writeTree(tmpDir(), files);
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await waitIndexed(page);
      await search(page, '共通キーワード');
      assert.equal((await results(page)).length, 50);
      assert.equal(await countText(page), '60 件中、上位 50 件を表示');
    });
  });

  test('HTML in a document title is shown as text', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# ホーム\n', 'x.md': '# 危険な <img src=x onerror="window.__xss=1"> タイトル\n\n検索対象の語ラムダ。\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await waitIndexed(page);
      await search(page, 'ラムダ');
      assert.equal(await page.locator('.mdv-search-panel img').count(), 0);
      assert.equal(await page.evaluate(() => typeof window.__xss), 'undefined');
      await search(page, '危険');
      assert.equal((await results(page)).length, 1);
    });
  });
});

describe('Handling of custom navigation files', () => {
  test('files used for navigation (_sidebar.md) do not appear in search results; other documents do', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('nav'));
      await waitIndexed(page);
      await page.fill('.mdv-search-input', '文書');
      await page.waitForSelector('.mdv-search-item');
      const found = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-search-item .mdv-search-item-path')).map((e) => e.textContent));
      assert.ok(found.length >= 3);
      assert.ok(!found.includes('_sidebar.md'), `results: ${found.join(', ')}`);
      assert.ok(found.includes('a.md') && found.includes('b/unlisted.md'), 'documents not listed in the navigation can also be searched');
      // Words that exist only in the navigation file find nothing
      await page.fill('.mdv-search-input', '区切り');
      await page.waitForSelector('.mdv-search-empty');
      assert.equal(await page.textContent('.mdv-search-foot [role="status"]'), '0 件');
    });
    // Same when SUMMARY.md is used for navigation
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('summary'));
      await waitIndexed(page);
      assert.equal(await page.evaluate(() => window.MDV.app.state.set.navPath), 'SUMMARY.md');
      await page.fill('.mdv-search-input', 'summary');
      await page.waitForSelector('.mdv-search-empty');
      await page.fill('.mdv-search-input', '第 1 章');
      await page.waitForSelector('.mdv-search-item');
      const found = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-search-item .mdv-search-item-path')).map((e) => e.textContent));
      assert.deepEqual(found, ['ch1.md']);
    });
  });
});

describe('Keyboard operation (FR-402, FR-405)', () => {
  test('Ctrl+K and / move to the search box', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      const focused = () => page.evaluate(() => document.activeElement === document.querySelector('.mdv-search-input'));
      assert.equal(await focused(), false);
      await page.keyboard.press('Control+k');
      assert.equal(await focused(), true);
      await page.keyboard.press('Escape');
      assert.equal(await focused(), false);
      await page.keyboard.press('/');
      assert.equal(await focused(), true);
      assert.equal(await page.inputValue('.mdv-search-input'), '', '/ is not typed');
      await page.keyboard.type('a/b');
      assert.equal(await page.inputValue('.mdv-search-input'), 'a/b', '/ while typing is an ordinary character');
    });
  });

  test('select with Up/Down, open with Enter, close with Esc', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await page.keyboard.press('Control+k');
      await page.keyboard.type('固有語');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-search-item').length >= 5);
      const active = () => page.evaluate(() => { const a = document.querySelector('.mdv-search-item.is-active'); return a ? Number(a.getAttribute('data-index')) : -1; });
      assert.equal(await active(), 0, 'the first result is selected');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      assert.equal(await active(), 2);
      await page.keyboard.press('ArrowUp');
      assert.equal(await active(), 1);
      assert.equal(await page.getAttribute('.mdv-search-input', 'aria-activedescendant'), 'mdv-search-opt-1');
      const target = await page.getAttribute('.mdv-search-item.is-active', 'href');
      await page.keyboard.press('Enter');
      await page.waitForFunction((h) => location.hash === h, target);
      await page.waitForSelector('#mdv-search-panel', { state: 'hidden' });
      // Right after returning to the search box (even before the document finishes displaying), Esc closes it
      await page.keyboard.press('Control+k');
      await page.waitForSelector('#mdv-search-panel:not([hidden])');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#mdv-search-panel', { state: 'hidden' });
      // Focus is not taken from the search box being typed in, even after the document is shown
      await page.keyboard.press('Control+k');
      await page.evaluate(() => { location.hash = '#/guide/Setup.md'; });
      await page.waitForFunction(() => document.title.startsWith('セットアップ'));
      assert.equal(await page.evaluate(() => document.activeElement.className), 'mdv-search-input');
    });
  });

  test('clicking outside the panel closes it; returning to the search box reopens it with the same query', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'ベータ');
      await page.click('.mdv-doc-meta');
      await page.waitForSelector('#mdv-search-panel', { state: 'hidden' });
      await page.focus('.mdv-search-input');
      await page.waitForSelector('#mdv-search-panel:not([hidden])');
      assert.deepEqual(await paths(page), ['guide/intro.md']);
    });
  });
});

describe('Highlighting matched words in the body (FR-403)', () => {
  test('opening a result marks matched words and shows the first match; moving to another document clears them', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, '最初の概要 重複');
      await page.click('.mdv-search-item');
      await waitHeading(page, 'イントロダクション');
      await page.waitForSelector('mark.mdv-hit');
      const r = await page.evaluate(() => {
        const marks = Array.from(document.querySelectorAll('mark.mdv-hit'));
        const rect = marks[0].getBoundingClientRect();
        return { texts: Array.from(new Set(marks.map((m) => m.textContent))).sort(), visible: rect.top > 0 && rect.bottom < window.innerHeight, count: marks.length };
      });
      assert.deepEqual(r.texts, ['最初の概要', '重複']);
      assert.equal(r.count, 2);
      assert.equal(r.visible, true);
      assert.equal(await page.inputValue('.mdv-search-input'), '最初の概要 重複', 'the query is kept');
      await page.click('.mdv-side-tree a:has-text("Setup")');
      await waitHeading(page, 'セットアップ');
      assert.equal(await page.locator('mark.mdv-hit').count(), 0);
    });
  });

  test('searching for a word in the displayed document marks it in place', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'アルファ');
      await page.click('.mdv-search-item');
      await page.waitForSelector('mark.mdv-hit');
      assert.equal(await page.textContent('mark.mdv-hit'), 'アルファ');
      assert.equal(await heading(page), 'テスト用サイト');
      assert.equal(await hash(page), '#/README.md');
    });
  });

  test('matches inside collapsed sections are expanded and shown; full-width/half-width differences are also marked', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'オメガ');
      await page.click('.mdv-search-item');
      await waitHeading(page, '記法');
      await page.waitForSelector('mark.mdv-hit');
      assert.equal(await page.evaluate(() => document.querySelector('.mdv-prose details').open), true);
      await search(page, 'ｶﾞｲﾄﾞの入口');
      await page.click('.mdv-search-item');
      await waitHeading(page, 'ガイドの入口');
      await page.waitForSelector('mark.mdv-hit');
      assert.ok((await page.evaluate(() => Array.from(document.querySelectorAll('mark.mdv-hit')).map((m) => m.textContent))).includes('ガイドの入口'));
    });
  });

  test('clearing the search box and pressing Esc removes the marks', async () => {
    await withPage(browser, async ({ page }) => {
      await openSite(page);
      await search(page, 'アルファ');
      await page.click('.mdv-search-item');
      await page.waitForSelector('mark.mdv-hit');
      await page.focus('.mdv-search-input');
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelectorAll('mark.mdv-hit').length === 0);
      assert.equal(await page.inputValue('.mdv-search-input'), '');
      assert.ok((await page.textContent('.mdv-prose')).includes('アルファ固有語'), 'the body is unchanged');
    });
  });
});

describe('Building the index (FR-404)', () => {
  test('while building, searches work over the indexed part and progress is shown', async () => {
    const spec = { name: 'slow', files: { 'README.md': '# 遅い読み込み\n\n対象語シグマ。\n' }, generate: [{ count: 150, prefix: 'docs/n', text: '# 対象語シグマ の文書' }], slowRead: 15 };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      await page.fill('.mdv-search-input', 'シグマ');
      await page.waitForFunction(() => /索引を作成中 \d+ \/ 151/.test(document.querySelector('.mdv-search-foot').textContent));
      const partial = await page.evaluate(() => window.MDV.app.state.set.indexed);
      assert.ok(partial > 0 && partial < 151, `count partway through: ${partial}`);
      assert.ok((await page.locator('.mdv-search-item').count()) > 0, 'results appear from the indexed part');
      await waitIndexed(page);
      await page.waitForFunction(() => document.querySelector('.mdv-search-foot').textContent.includes('151 件中、上位 50 件を表示'));
      assert.ok(!(await page.textContent('.mdv-search-foot')).includes('索引を作成中'));
    });
  });
});
