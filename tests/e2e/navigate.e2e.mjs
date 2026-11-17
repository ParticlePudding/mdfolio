// Navigation: links (FR-211), sidebar (FR-301, FR-302), routing (FR-304 to FR-307)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  launchBrowser, withPage, loadFolder, fixture, hash, heading, waitHeading, goTo,
  tmpDir, writeTree, captureDownload, mockOptions, openMock
} from '../helpers/e2e.mjs';
import { core } from '../helpers/load.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const link = (page, text) => page.locator('.mdv-prose a', { hasText: text }).first();
const activeTreeItem = (page) => page.evaluate(() => { const a = document.querySelector('.mdv-side-tree a[aria-current="page"]'); return a ? a.textContent : null; });

describe('Links between documents (FR-211, spec 5.3)', () => {
  test('relative links navigate within the app, and the title, URL and sidebar follow', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.equal(await activeTreeItem(page), 'README');
      await link(page, 'イントロ').click();
      await waitHeading(page, 'イントロダクション');
      assert.equal(await hash(page), '#/guide/intro.md');
      assert.equal(await page.title(), 'イントロダクション - site');
      assert.equal(await activeTreeItem(page), 'intro');
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'mdv-main', 'focus moves to the main content area (NFR-4)');
    });
  });

  const cases = [
    ['セットアップ（拡張子なし', 'セットアップ', '#/guide/Setup.md'],
    ['HTML 拡張子', 'イントロダクション', '#/guide/intro.md'],
    ['日本語パス', '仕様書', '#/' + encodeURIComponent('日本語 フォルダ') + '/' + encodeURIComponent('仕様書 v1.0.md')],
    ['フォルダへのリンク', 'ガイドの入口', '#/guide/index.md'],
    ['記法', '記法', '#/syntax.md']
  ];
  for (const [text, title, route] of cases) {
    test(`link resolution: ${text} -> ${route}`, async () => {
      await withPage(browser, async ({ page }) => {
        await loadFolder(page, fixture('site'));
        assert.equal(await link(page, text).getAttribute('href'), route);
        await link(page, text).click();
        await waitHeading(page, title);
        assert.equal(await hash(page), route);
      });
    });
  }

  test('a link with a heading shows the position of that heading', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await link(page, 'ホームの画像へ').click();
      await waitHeading(page, 'テスト用サイト');
      assert.equal(await hash(page), '#/README.md#' + encodeURIComponent('画像'));
      await page.waitForFunction(() => {
        const top = document.getElementById('user-content-画像').getBoundingClientRect().top;
        return top > 40 && top < 120;
      });
    });
  });

  test('in-page links: move position only, without redrawing; handles duplicate headings and case differences', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.evaluate(() => { document.querySelector('.mdv-prose h1').setAttribute('data-test-mark', '1'); });
      const topOf = (id) => page.evaluate((i) => Math.round(document.getElementById(i).getBoundingClientRect().top), id);
      await link(page, '同じ文書の 2 つ目の概要へ').click();
      await page.waitForFunction(() => location.hash === '#/guide/intro.md#' + encodeURIComponent('概要-1'));
      await page.waitForFunction(() => Math.abs(document.getElementById('user-content-概要-1').getBoundingClientRect().top - 68) < 4);
      assert.ok((await topOf('user-content-概要')) < (await topOf('user-content-概要-1')));
      assert.equal(await page.getAttribute('.mdv-prose h1', 'data-test-mark'), '1', 'no redraw within the same document');
      await page.evaluate(() => window.scrollTo(0, 0));
      await link(page, '大文字で指定した見出しへ').click();
      await page.waitForFunction(() => Math.abs(document.getElementById('user-content-hello-world').getBoundingClientRect().top - 68) < 4);
    });
  });

  test('unresolvable links: show "not found" and allow going back home', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const missing = link(page, '存在しない文書');
      assert.equal(await missing.getAttribute('class'), 'mdv-missing');
      assert.equal(await missing.getAttribute('title'), 'リンク先が見つかりません: missing/nothing.md');
      await missing.click();
      await page.waitForSelector('.mdv-empty');
      assert.equal(await page.textContent('.mdv-empty-title'), 'この文書は見つかりません');
      assert.ok((await page.textContent('.mdv-empty-body')).includes('「missing/nothing.md」'));
      assert.equal(await hash(page), '#/missing/nothing.md');
      assert.equal(await activeTreeItem(page), null);
      await page.click('.mdv-empty a.mdv-btn');
      await waitHeading(page, 'テスト用サイト');
      // Links pointing above the root do not work as links
      assert.equal(await link(page, 'ルートの外').getAttribute('href'), null);
      assert.equal(await link(page, 'ルートの外').getAttribute('class'), 'mdv-missing');
    });
  });

  test('external links: open in a new tab with noopener noreferrer (SEC-7)', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const ext = link(page, '外部サイト');
      assert.equal(await ext.getAttribute('href'), 'https://example.com/page');
      assert.equal(await ext.getAttribute('target'), '_blank');
      assert.equal(await ext.getAttribute('rel'), 'noopener noreferrer');
      const mail = link(page, 'メール');
      assert.equal(await mail.getAttribute('href'), 'mailto:someone@example.com');
      assert.equal(await mail.getAttribute('target'), null);
    });
  });

  test('links to attachments become downloads (not opened in the browser, SEC-9)', async () => {
    await withPage(browser, async ({ page, context }) => {
      await loadFolder(page, fixture('site'));
      const csv = await captureDownload(page, () => link(page, '添付 CSV').click());
      assert.equal(csv.name, 'data.csv');
      assert.equal(fs.readFileSync(csv.file, 'utf8'), fs.readFileSync(path.join(fixture('site'), 'assets/data.csv'), 'utf8'));
      assert.equal(await heading(page), 'テスト用サイト', 'the screen does not navigate');
      // HTML attachments are also downloaded, not opened
      const html = await captureDownload(page, () => link(page, '添付 HTML').click());
      assert.equal(html.name, 'evil.html');
      await page.waitForTimeout(300);
      assert.equal(context.pages().length, 1, 'no new tab is opened');
      assert.equal(await page.evaluate(() => typeof window.__xss), 'undefined');
    });
  });

  test('opening an attachment path directly shows the download screen', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/assets/data.csv');
      await page.waitForSelector('.mdv-empty .mdv-download');
      assert.equal(await page.textContent('.mdv-empty-title'), '添付ファイル');
      assert.ok((await page.textContent('.mdv-empty-body')).includes('data.csv'));
      const dl = await captureDownload(page, () => page.click('.mdv-download'));
      assert.equal(dl.name, 'data.csv');
    });
  });
});

describe('Routing (FR-304, FR-306)', () => {
  test('can navigate with the browser\'s Back and Forward', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await link(page, 'イントロ').click();
      await waitHeading(page, 'イントロダクション');
      await link(page, 'セットアップへ').click();
      await waitHeading(page, 'セットアップ');
      await page.goBack();
      await waitHeading(page, 'イントロダクション');
      assert.equal(await hash(page), '#/guide/intro.md');
      await page.goBack();
      await waitHeading(page, 'テスト用サイト');
      await page.goForward();
      await waitHeading(page, 'イントロダクション');
      await page.goForward();
      await waitHeading(page, 'セットアップ');
    });
  });

  test('Back and Forward restore the previous scroll position', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForFunction(() => { const s = window.MDV.app.state; return s.scrollMap.get(s.navIdx) === 900; });
      await goTo(page, '#/guide/Setup.md', 'セットアップ');
      assert.equal(await page.evaluate(() => window.scrollY), 0, 'a newly opened document starts at the top');
      await page.goBack();
      await waitHeading(page, 'イントロダクション');
      await page.waitForFunction(() => Math.abs(window.scrollY - 900) <= 2);
      await page.goForward();
      await waitHeading(page, 'セットアップ');
      assert.equal(await page.evaluate(() => window.scrollY), 0);
    });
  });

  test('a nonexistent path given directly also shows "not found"', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/nothing/here.md');
      await page.waitForSelector('.mdv-empty');
      assert.equal(await page.title(), 'この文書は見つかりません - site');
    });
  });

  test('also interprets hand-typed URLs (unencoded Japanese, a hash with only #)', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/日本語 フォルダ/仕様書 v1.0.md', '仕様書');
      await goTo(page, '#' + encodeURIComponent('見出し括弧つき'));
      await page.waitForFunction(() => location.hash.endsWith('#' + encodeURIComponent('見出し括弧つき')) && location.hash.startsWith('#/'));
      assert.equal(await heading(page), '仕様書', 'the document stays the same and the URL is corrected to its canonical form');
    });
  });

  test('clicking the site title goes home; selecting the displayed document again goes back to the top', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.evaluate(() => window.scrollTo(0, 700));
      await page.click('.mdv-side-tree a[aria-current="page"]');
      await page.waitForFunction(() => window.scrollY === 0);
      await page.click('.mdv-title');
      await waitHeading(page, 'テスト用サイト');
      assert.equal(await hash(page), '#/');
    });
  });
});

describe('Document header (FR-305)', () => {
  test('shows the path and modification time', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/sub/deep.md', '深い文書');
      assert.equal(await page.textContent('.mdv-doc-path'), 'guide/sub/deep.md');
      const mtime = fs.statSync(path.join(fixture('site'), 'guide/sub/deep.md')).mtimeMs;
      assert.equal(await page.textContent('.mdv-doc-date'), '更新 ' + core.formatDate(Math.floor(mtime)));
    });
  });
});

describe('Home document (FR-307)', () => {
  test('without README, index; without either, the first document in tree order', async () => {
    const withIndex = writeTree(tmpDir(), { 'zzz.md': '# Z\n', 'Index.MD': '# インデックス\n', 'sub/README.md': '# サブの README\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, withIndex);
      assert.equal(await heading(page), 'インデックス');
      assert.equal(await hash(page), '#/Index.MD');
    });
    const none = writeTree(tmpDir(), { 'sub/a.md': '# サブ A\n', 'b10.md': '# B10\n', 'b2.md': '# B2\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, none);
      assert.equal(await heading(page), 'B2', 'natural order puts b2 before b10');
    });
  });
});

describe('Sidebar (FR-301)', () => {
  test('opening and closing folders, and highlighting the displayed document', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const open = (name) => page.evaluate((n) => document.querySelector(`.mdv-side-tree details[data-path="${n}"]`).open, name);
      assert.equal(await open('guide'), true, 'with few documents, all folders are open');
      await page.click('.mdv-side-tree details[data-path="guide"] > summary');
      assert.equal(await open('guide'), false);
      assert.ok(await page.isHidden('.mdv-side-tree a[href="#/guide/intro.md"]'));
      // Navigating to a document inside a closed folder opens that folder
      await goTo(page, '#/guide/sub/deep.md', '深い文書');
      assert.equal(await open('guide'), true);
      assert.equal(await open('guide/sub'), true);
      assert.equal(await activeTreeItem(page), 'deep');
      assert.equal(await page.locator('.mdv-side-tree a[aria-current="page"]').count(), 1);
      assert.equal(await page.getAttribute('.mdv-side-tree a[aria-current="page"]', 'title'), 'guide/sub/deep.md');
    });
  });

  test('with many documents, only the path to the displayed document is opened', async () => {
    const spec = { name: 'many', files: { 'README.md': '# 多数\n' }, generate: [{ count: 40, prefix: 'alpha/doc' }, { count: 40, prefix: 'beta/doc' }] };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      const state = () => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-side-tree details')).map((d) => [d.getAttribute('data-path'), d.open]));
      assert.deepEqual(await state(), [['alpha', false], ['beta', false]]);
      await goTo(page, '#/beta/doc000003.md', 'doc 3');
      assert.deepEqual(await state(), [['alpha', false], ['beta', true]]);
    });
  });
});

describe('Custom navigation (FR-302)', () => {
  test('if _sidebar.md exists, it is shown under "Nav" and can be switched with "Files"', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('nav'));
      await page.waitForSelector('.mdv-sidenav a');
      assert.ok(await page.isVisible('.mdv-side-tabs'));
      assert.equal(await page.getAttribute('.mdv-side-tab[data-tab="nav"]', 'aria-selected'), 'true');
      assert.ok(await page.isHidden('.mdv-side-tree'));
      const items = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-sidenav a')).map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current'), a.getAttribute('target')]));
      assert.deepEqual(items, [
        ['ホーム', '#/README.md', 'page', null],
        ['A の文書', '#/a.md', null, null],
        ['C の文書', '#/b/c.md#' + encodeURIComponent('節'), null, null],
        ['外部', 'https://example.com/', null, '_blank']
      ]);
      assert.equal(await page.textContent('.mdv-sidenav .mdv-sidenav-label'), '区切り');
      await page.click('.mdv-sidenav a:has-text("A の文書")');
      await waitHeading(page, '文書 A');
      assert.equal(await page.getAttribute('.mdv-sidenav a:has-text("A の文書")', 'aria-current'), 'page');
      await page.click('.mdv-sidenav a:has-text("C の文書")');
      await waitHeading(page, '文書 C');
      // Switching to "Files" reaches documents not listed in the navigation
      await page.click('.mdv-side-tab[data-tab="files"]');
      assert.ok(await page.isVisible('.mdv-side-tree'));
      assert.ok(await page.isHidden('.mdv-sidenav'));
      await page.click('.mdv-side-tree a:has-text("unlisted")');
      await waitHeading(page, 'ナビにない文書');
    });
  });

  test('same for SUMMARY.md; folders without navigation show no tabs', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('summary'));
      await page.waitForSelector('.mdv-sidenav a');
      assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-sidenav a')).map((a) => a.textContent)), ['はじめに', '第 1 章']);
      await page.locator('.mdv-input-dir').setInputFiles(fixture('site'));
      await waitHeading(page, 'テスト用サイト');
      assert.ok(await page.isHidden('.mdv-side-tabs'));
      assert.ok(await page.isVisible('.mdv-side-tree'));
      assert.ok(await page.isHidden('.mdv-sidenav'));
    });
  });
});
