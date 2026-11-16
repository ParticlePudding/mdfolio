// ナビゲーション: リンク（FR-211）、サイドバー（FR-301, FR-302）、ルーティング（FR-304〜FR-307）
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

describe('文書間のリンク（FR-211, 仕様 5.3）', () => {
  test('相対リンクでアプリ内を移動し、タイトル・URL・サイドバーが追従する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.equal(await activeTreeItem(page), 'README');
      await link(page, 'イントロ').click();
      await waitHeading(page, 'イントロダクション');
      assert.equal(await hash(page), '#/guide/intro.md');
      assert.equal(await page.title(), 'イントロダクション - site');
      assert.equal(await activeTreeItem(page), 'intro');
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'mdv-main', '本文領域にフォーカスが移る（NFR-4）');
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
    test(`リンクの解決: ${text} → ${route}`, async () => {
      await withPage(browser, async ({ page }) => {
        await loadFolder(page, fixture('site'));
        assert.equal(await link(page, text).getAttribute('href'), route);
        await link(page, text).click();
        await waitHeading(page, title);
        assert.equal(await hash(page), route);
      });
    });
  }

  test('見出し付きのリンクは、その見出しの位置を表示する', async () => {
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

  test('ページ内リンク: 描き直さずに位置だけ移動する。重複した見出し・大文字小文字の違いにも対応', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.evaluate(() => { document.querySelector('.mdv-prose h1').setAttribute('data-test-mark', '1'); });
      const topOf = (id) => page.evaluate((i) => Math.round(document.getElementById(i).getBoundingClientRect().top), id);
      await link(page, '同じ文書の 2 つ目の概要へ').click();
      await page.waitForFunction(() => location.hash === '#/guide/intro.md#' + encodeURIComponent('概要-1'));
      await page.waitForFunction(() => Math.abs(document.getElementById('user-content-概要-1').getBoundingClientRect().top - 68) < 4);
      assert.ok((await topOf('user-content-概要')) < (await topOf('user-content-概要-1')));
      assert.equal(await page.getAttribute('.mdv-prose h1', 'data-test-mark'), '1', '同じ文書の中では描き直さない');
      await page.evaluate(() => window.scrollTo(0, 0));
      await link(page, '大文字で指定した見出しへ').click();
      await page.waitForFunction(() => Math.abs(document.getElementById('user-content-hello-world').getBoundingClientRect().top - 68) < 4);
    });
  });

  test('解決できないリンク: 「見つかりません」を表示し、ホームへ戻れる', async () => {
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
      // ルートより上を指すリンクは、リンクとして機能させない
      assert.equal(await link(page, 'ルートの外').getAttribute('href'), null);
      assert.equal(await link(page, 'ルートの外').getAttribute('class'), 'mdv-missing');
    });
  });

  test('外部リンク: 新しいタブで開き、noopener noreferrer を付ける（SEC-7）', async () => {
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

  test('添付ファイルへのリンクはダウンロードになる（ブラウザ内では開かない、SEC-9）', async () => {
    await withPage(browser, async ({ page, context }) => {
      await loadFolder(page, fixture('site'));
      const csv = await captureDownload(page, () => link(page, '添付 CSV').click());
      assert.equal(csv.name, 'data.csv');
      assert.equal(fs.readFileSync(csv.file, 'utf8'), fs.readFileSync(path.join(fixture('site'), 'assets/data.csv'), 'utf8'));
      assert.equal(await heading(page), 'テスト用サイト', '画面は移動しない');
      // HTML の添付も、開かずにダウンロードする
      const html = await captureDownload(page, () => link(page, '添付 HTML').click());
      assert.equal(html.name, 'evil.html');
      await page.waitForTimeout(300);
      assert.equal(context.pages().length, 1, '新しいタブは開かない');
      assert.equal(await page.evaluate(() => typeof window.__xss), 'undefined');
    });
  });

  test('添付のパスを直接開いた場合は、ダウンロード用の画面を表示する', async () => {
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

describe('ルーティング（FR-304, FR-306）', () => {
  test('ブラウザの「戻る」「進む」で移動できる', async () => {
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

  test('「戻る」「進む」では以前のスクロール位置を復元する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForFunction(() => { const s = window.MDV.app.state; return s.scrollMap.get(s.navIdx) === 900; });
      await goTo(page, '#/guide/Setup.md', 'セットアップ');
      assert.equal(await page.evaluate(() => window.scrollY), 0, '新しく開いた文書は先頭から');
      await page.goBack();
      await waitHeading(page, 'イントロダクション');
      await page.waitForFunction(() => Math.abs(window.scrollY - 900) <= 2);
      await page.goForward();
      await waitHeading(page, 'セットアップ');
      assert.equal(await page.evaluate(() => window.scrollY), 0);
    });
  });

  test('存在しないパスを直接指定した場合も「見つかりません」を表示する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/nothing/here.md');
      await page.waitForSelector('.mdv-empty');
      assert.equal(await page.title(), 'この文書は見つかりません - site');
    });
  });

  test('手入力の URL（エンコードなしの日本語、# だけのハッシュ）も解釈する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/日本語 フォルダ/仕様書 v1.0.md', '仕様書');
      await goTo(page, '#' + encodeURIComponent('見出し括弧つき'));
      await page.waitForFunction(() => location.hash.endsWith('#' + encodeURIComponent('見出し括弧つき')) && location.hash.startsWith('#/'));
      assert.equal(await heading(page), '仕様書', '文書は変わらず、URL が正規の形に直る');
    });
  });

  test('サイトタイトルを押すとホームへ、表示中の文書をもう一度選ぶと先頭へ戻る', async () => {
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

describe('文書の上部の表示（FR-305）', () => {
  test('パスと更新日時を表示する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/sub/deep.md', '深い文書');
      assert.equal(await page.textContent('.mdv-doc-path'), 'guide/sub/deep.md');
      const mtime = fs.statSync(path.join(fixture('site'), 'guide/sub/deep.md')).mtimeMs;
      assert.equal(await page.textContent('.mdv-doc-date'), '更新 ' + core.formatDate(Math.floor(mtime)));
    });
  });
});

describe('ホーム文書（FR-307）', () => {
  test('README がなければ index、どちらもなければツリー順で最初の文書', async () => {
    const withIndex = writeTree(tmpDir(), { 'zzz.md': '# Z\n', 'Index.MD': '# インデックス\n', 'sub/README.md': '# サブの README\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, withIndex);
      assert.equal(await heading(page), 'インデックス');
      assert.equal(await hash(page), '#/Index.MD');
    });
    const none = writeTree(tmpDir(), { 'sub/a.md': '# サブ A\n', 'b10.md': '# B10\n', 'b2.md': '# B2\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, none);
      assert.equal(await heading(page), 'B2', '自然順で b2 が b10 より先');
    });
  });
});

describe('サイドバー（FR-301）', () => {
  test('フォルダの開閉と、表示中の文書の強調', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const open = (name) => page.evaluate((n) => document.querySelector(`.mdv-side-tree details[data-path="${n}"]`).open, name);
      assert.equal(await open('guide'), true, '文書が少ないときはすべて開いておく');
      await page.click('.mdv-side-tree details[data-path="guide"] > summary');
      assert.equal(await open('guide'), false);
      assert.ok(await page.isHidden('.mdv-side-tree a[href="#/guide/intro.md"]'));
      // 閉じたフォルダの中の文書へ移動すると、そのフォルダが開く
      await goTo(page, '#/guide/sub/deep.md', '深い文書');
      assert.equal(await open('guide'), true);
      assert.equal(await open('guide/sub'), true);
      assert.equal(await activeTreeItem(page), 'deep');
      assert.equal(await page.locator('.mdv-side-tree a[aria-current="page"]').count(), 1);
      assert.equal(await page.getAttribute('.mdv-side-tree a[aria-current="page"]', 'title'), 'guide/sub/deep.md');
    });
  });

  test('文書が多いときは、表示中の文書までの道筋だけを開く', async () => {
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

describe('カスタムナビ（FR-302）', () => {
  test('_sidebar.md があれば「ナビ」に表示し、「ファイル」と切り替えられる', async () => {
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
      // 「ファイル」に切り替えると、ナビに載っていない文書にも到達できる
      await page.click('.mdv-side-tab[data-tab="files"]');
      assert.ok(await page.isVisible('.mdv-side-tree'));
      assert.ok(await page.isHidden('.mdv-sidenav'));
      await page.click('.mdv-side-tree a:has-text("unlisted")');
      await waitHeading(page, 'ナビにない文書');
    });
  });

  test('SUMMARY.md でも同じ。ナビのないフォルダではタブを出さない', async () => {
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
