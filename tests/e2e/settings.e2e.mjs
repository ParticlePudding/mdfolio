// 表示設定（FR-501〜FR-504）、外部画像（FR-210）、設定の保存（FR-702）
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

describe('テーマ（FR-501）', () => {
  test('自動 → ライト → ダーク と切り替わり、次回に引き継ぐ', async () => {
    await withPage(browser, async ({ page }) => {
      assert.equal(await theme(page), 'light');
      assert.equal(await page.getAttribute('.mdv-btn-theme', 'aria-label'), 'テーマ: 自動（OS の設定に合わせる）');
      assert.equal(await bodyBg(page), 'rgb(237, 241, 245)');
      // 自動: OS の設定に追従する
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
      assert.equal(await bodyBg(page), 'rgb(15, 23, 34)');
      // ライトに固定: OS がダークでもライト
      await page.click('.mdv-btn-theme');
      assert.equal(await theme(page), 'light');
      assert.equal(await page.getAttribute('.mdv-btn-theme', 'aria-label'), 'テーマ: ライト');
      // ダークに固定
      await page.emulateMedia({ colorScheme: 'light' });
      await page.click('.mdv-btn-theme');
      assert.equal(await theme(page), 'dark');
      assert.equal(await page.getAttribute('.mdv-btn-theme', 'aria-label'), 'テーマ: ダーク');
      assert.equal((await stored(page)).theme, 'dark');
      await page.reload();
      await page.waitForSelector('.mdv-app');
      assert.equal(await theme(page), 'dark', '再読み込み後も引き継ぐ');
      await page.click('.mdv-btn-theme');
      assert.equal((await stored(page)).theme, 'auto');
      assert.equal(await theme(page), 'light');
    });
  });

  test('OS がダークなら、最初からダークで表示する', async () => {
    await withPage(browser, { colorScheme: 'dark' }, async ({ page }) => {
      assert.equal(await theme(page), 'dark');
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.mdv-sheet')).backgroundColor), 'rgb(21, 31, 44)');
    });
  });

  test('テーマを切り替えると、図も配色を合わせて描き直す', async () => {
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
      assert.equal(await page.locator('.mdv-mermaid-error').count(), 1, '誤りのある図はエラー表示のまま');
    });
  });
});

describe('画面の言語（FR-502）', () => {
  test('メニューから切り替えられ、次回に引き継ぐ', async () => {
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
      assert.equal(await page.textContent('.mdv-welcome-title'), 'Read a folder of Markdown as a site, just as it is.');
      await clickMenu(page, 'menuLanguage');
      await page.waitForFunction(() => document.documentElement.lang === 'ja');
      assert.equal((await page.textContent('.mdv-open-folder')).trim(), 'フォルダを開く');
    });
  });
});

describe('外部の画像（FR-210, SEC-5, SEC-10）', () => {
  const ITEM = '.mdv-menu-item[data-action="menuExternalImages"]';
  const extImg = (page) => page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img[alt="外部画像"]'); return i && i.complete && i.naturalWidth === 64; });
  const locked = (page) => page.evaluate(() => window.MDV.app.state.mediaLocked);
  const checked = async (page) => { await openMenu(page); const v = await page.getAttribute(ITEM, 'aria-checked'); await page.keyboard.press('Escape'); return v; };
  /** 文書を経由せずに画像を読み込ませて、ブラウザー自身が止めるかどうかを確かめる。 */
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

  test('既定では表示せず、通信もしない。ブラウザーの CSP でも止めている', async () => {
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
      assert.deepEqual(record.errors, [], '表示の段階で取り除くので、CSP 違反も起きない');
      assert.equal(await checked(page), 'false');
      // 表示処理を通らない読み込みも、ブラウザーが止める
      assert.equal(await probe(page, sink.origin + '/direct.png'), 'blocked');
      assert.deepEqual(record.blocked, [sink.origin + '/direct.png']);
      assert.deepEqual(sink.paths(), [], 'サーバーには何も届いていない');
    });
  });

  test('表示に切り替えるときは確認し、再読み込みして反映する。戻すときはその場で反映する', async () => {
    sink.hits.length = 0;
    const dir = docsWithExternalImage();
    await withPage(browser, { allowErrors: true }, async ({ page, record }) => {
      await loadFolder(page, dir);
      await goTo(page, '#/other.md', '別の文書');
      // 確認のダイアログ。キャンセルすれば何も変わらない
      await clickMenu(page, 'menuExternalImages');
      await page.waitForSelector('dialog.mdv-dialog-external[open]');
      assert.equal(await page.textContent('.mdv-dialog-external .mdv-dialog-title'), '外部の画像を表示しますか');
      assert.equal(await page.textContent('.mdv-dialog-external .mdv-dialog-lead'), '表示すると、画像や動画の配信元のサーバーに接続します。設定を切り替えるために、ページを再読み込みします。');
      assert.equal(await page.textContent('.mdv-dialog-external .mdv-dialog-note'), '再読み込みすると、開いているフォルダは閉じます。再読み込みのあとで、もう一度開いてください。');
      assert.ok(await page.evaluate(() => document.activeElement.classList.contains('mdv-external-cancel')), '初期フォーカスはキャンセル');
      await page.click('.mdv-external-cancel');
      await page.waitForSelector('dialog.mdv-dialog-external', { state: 'detached' });
      assert.equal((await stored(page)).externalImages, undefined);
      assert.equal(await locked(page), true);
      // 表示して再読み込み
      await clickMenu(page, 'menuExternalImages');
      await page.waitForSelector('dialog.mdv-dialog-external[open]');
      await Promise.all([page.waitForEvent('load'), page.click('.mdv-external-run')]);
      await page.waitForFunction(() => window.MDV && window.MDV.app && window.MDV.app.state.view === 'welcome');
      assert.equal(await locked(page), false);
      assert.equal((await stored(page)).externalImages, true);
      assert.ok((await page.textContent('.mdv-welcome-pending')).includes('other.md'), '見ていた文書の場所は URL に残る');
      assert.deepEqual(sink.paths(), []);
      // フォルダを開き直すと、元の文書に戻り、外部の画像が表示される
      await loadFolder(page, dir);
      await waitHeading(page, '別の文書');
      await goTo(page, '#/README.md', '外部画像の確認');
      await extImg(page);
      await page.waitForFunction(() => { const v = document.querySelector('.mdv-prose video'); return v && v.getAttribute('src'); });
      assert.equal(await page.getAttribute('.mdv-prose img[alt="外部画像"]', 'referrerpolicy'), 'no-referrer');
      assert.ok(sink.paths().includes('/external.png'));
      assert.ok(sink.paths().includes('/movie.mp4'));
      assert.ok(sink.hits.every((h) => h.referer === undefined && h.cookie === undefined), 'リファラーも Cookie も送らない');
      assert.equal(await checked(page), 'true');
      // 表示しない側へは、その場で切り替わる（確認も再読み込みもない）
      const before = sink.hits.length;
      await clickMenu(page, 'menuExternalImages');
      await page.waitForFunction(() => !document.querySelector('.mdv-prose img[alt="外部画像"]'));
      assert.equal(await page.locator('dialog.mdv-dialog-external').count(), 0);
      assert.equal(await locked(page), true);
      assert.equal((await stored(page)).externalImages, false);
      assert.equal(await checked(page), 'false');
      assert.equal(await probe(page, sink.origin + '/after-off.png'), 'blocked');
      assert.equal(sink.hits.length, before, '切り替えたあとは通信しない');
      assert.equal(await heading(page), '外部画像の確認', 'フォルダは開いたまま');
      assert.deepEqual(record.requests.filter((u) => !u.startsWith(sink.origin)), []);
    });
  });

  test('サイトモードでは、再読み込みしても同じ文書に戻る', async () => {
    sink.hits.length = 0;
    const out = path.join(tmpDir(), 'ext-site.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), docsWithExternalImage(), '--out', out, '--title', '外部画像'], { cwd: ROOT });
    await withPage(browser, { url: pathToFileURL(out).href, allowErrors: true }, async ({ page, record }) => {
      await waitHeading(page, '外部画像の確認');
      assert.equal(await locked(page), true);
      await clickMenu(page, 'menuExternalImages');
      await page.waitForSelector('dialog.mdv-dialog-external[open]');
      assert.equal(await page.locator('.mdv-dialog-external .mdv-dialog-note').count(), 0, '閉じるフォルダがないので、その説明は出さない');
      assert.deepEqual(sink.paths(), []);
      await Promise.all([page.waitForEvent('load'), page.click('.mdv-external-run')]);
      await waitHeading(page, '外部画像の確認');
      await extImg(page);
      assert.equal(await locked(page), false);
      assert.ok(sink.paths().includes('/external.png'));
      assert.deepEqual(record.errors, []);
    });
  });

  test('設定を保存できない環境では、切り替えられないことを知らせる（再読み込みしない）', async () => {
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
      assert.equal(await page.getAttribute('.mdv-app', 'data-has-set'), 'true', 'フォルダは開いたまま');
      assert.equal(await page.getAttribute('.mdv-app', 'data-view'), 'doc');
    });
  });

  test('設定ブロックで既定を許可にできる（FR-701）。利用者はその場で止められる', async () => {
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

describe('画面幅による切り替え（FR-503）', () => {
  test('広い画面: サイドバーを開閉でき、状態を引き継ぐ', async () => {
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

  test('中くらいの画面: 目次は本文の先頭の折りたたみに移る', async () => {
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

  test('狭い画面: サイドバーはドロワーになり、背景・Esc・移動で閉じる', async () => {
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
      assert.equal(await open(), false, '文書を選ぶと閉じる');
    });
  });

  test('スマートフォン相当の幅でも、ページが横にはみ出さない', async () => {
    await withPage(browser, { viewport: { width: 375, height: 700 } }, async ({ page }) => {
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok((await overflow()) <= 0, '開始画面');
      await loadFolder(page, fixture('site'));
      assert.ok((await overflow()) <= 0, 'ホーム');
      await goTo(page, '#/syntax.md', '記法');
      await page.waitForSelector('.mdv-mermaid svg');
      assert.ok((await overflow()) <= 0, '表・コード・図を含む文書');
      await page.fill('.mdv-search-input', '固有語');
      await page.waitForSelector('.mdv-search-item');
      const panel = await page.evaluate(() => { const r = document.getElementById('mdv-search-panel').getBoundingClientRect(); return { left: r.left, right: r.right }; });
      assert.ok(panel.left >= 0 && panel.right <= 375, '検索パネルが画面内に収まる');
    });
  });
});

describe('指で操作する端末（スマートフォン・タブレット）', () => {
  test('ファイルの選択を種類で絞り込まない（.md を選べない端末があるため）。パソコンでは Markdown に絞り込む', async () => {
    await withPage(browser, async ({ page }) => {
      const accept = await page.getAttribute('.mdv-input-files', 'accept');
      assert.ok(accept.split(',').includes('.md') && accept.split(',').includes('text/markdown'));
    });
    const context = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, acceptDownloads: true });
    try {
      await withPage(browser, { context, allowErrors: true }, async ({ page, record }) => {
        assert.equal(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches), true);
        assert.equal(await page.getAttribute('.mdv-input-files', 'accept'), null);
        // 開始画面の説明は、ドロップではなく選ぶ操作を案内する
        assert.equal(await page.textContent('.mdv-welcome-lead'), 'フォルダかファイルを選んでください。ファイルはこの端末の中だけで処理され、外部には送信されません。');
        // Markdown 以外を選んだときは、何も変えずに知らせる
        await page.locator('.mdv-input-files').setInputFiles(fixture('site/assets/data.csv'));
        await page.waitForSelector('.mdv-toast');
        assert.ok((await page.textContent('.mdv-toast')).includes('Markdown 文書が見つかりませんでした'));
        assert.equal(await page.evaluate(() => window.MDV.app.state.view), 'welcome');
        // Markdown のファイルは開ける
        await page.locator('.mdv-input-files').setInputFiles(fixture('site/syntax.md'));
        await waitHeading(page, '記法');
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, '横にはみ出さない');
        assert.deepEqual(record.errors, []);
      });
    } finally {
      await context.close();
    }
  });
});

describe('スクロールバーを常に表示する環境（Windows など）での見た目', () => {
  // テスト用のブラウザーはスクロールバーを隠すため、はみ出しの有無を数値で確かめる
  const overflowing = () => Array.from(document.querySelectorAll('.mdv-app, .mdv-app *')).filter((el) => {
    if (el.closest('.mdv-prose')) return false; // 本文の表・コードは、意図して横スクロールにしている
    const cs = getComputedStyle(el);
    if (!/(auto|scroll)/.test(cs.overflowX) && !/(auto|scroll)/.test(cs.overflowY)) return false;
    return el.scrollWidth > el.clientWidth;
  }).map((el) => el.nodeName.toLowerCase() + '.' + String(el.getAttribute('class') || '').split(' ')[0] + ` ${el.scrollWidth}>${el.clientWidth}`);

  test('サイドバー・目次・検索結果・メニューに、横スクロールバーが出ない', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.deepEqual(await page.evaluate(overflowing), [], 'ホーム（表示中の文書のタブがある状態）');
      await goTo(page, '#/guide/sub/deep.md', '深い文書');
      assert.deepEqual(await page.evaluate(overflowing), [], '深い階層');
      await page.fill('.mdv-search-input', '固有語');
      await page.waitForSelector('.mdv-search-item');
      assert.deepEqual(await page.evaluate(overflowing), [], '検索結果');
      await page.keyboard.press('Escape');
      await openMenu(page);
      assert.deepEqual(await page.evaluate(overflowing), [], 'メニュー');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'ページ全体');
      await loadFolder(page, fixture('nav'));
      await page.waitForSelector('.mdv-sidenav a');
      assert.deepEqual(await page.evaluate(overflowing), [], 'カスタムナビ');
    });
    await withPage(browser, { viewport: { width: 390, height: 800 } }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.click('.mdv-btn-sidebar');
      await page.waitForSelector('.mdv-app[data-sidebar="open"]');
      await page.waitForTimeout(300);
      assert.deepEqual(await page.evaluate(overflowing), [], '狭い画面のドロワー');
    });
  });
});

describe('印刷（FR-504）', () => {
  test('本文のみを、常にライト配色で出力する', async () => {
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
      assert.equal(r.alertTitle, 'rgb(138, 90, 0)', 'アラートの色もライト配色');
      assert.equal(r.codeWrap, 'pre-wrap', '長いコードは折り返して印刷する');
      const pdf = await page.pdf({ format: 'A4' });
      assert.ok(pdf.length > 5000, 'PDF として出力できる');
    });
  });
});
