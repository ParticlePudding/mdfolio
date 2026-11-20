// Features that use folder handles: reload and auto-update (FR-109), last folder (FR-108)
// The first half checks on file:// with a replaced folder picker; the second half checks with real handles (OPFS).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  launchBrowser, launchPersistent, watch, assertClean, withPage, loadFolder, fixture, heading, hash, waitHeading, waitIndexed, goTo, toasts,
  clickMenu, tmpDir, writeTree, startServer, mockOptions, openMock, VIEWER
} from '../helpers/e2e.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const long = (title, word) => `# ${title}\n\n${word}\n\n` + Array.from({ length: 60 }, (_, i) => `段落 ${i + 1}: スクロール確認用の文章です。`).join('\n\n') + '\n';
const treeLabels = (page) => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-side-tree a')).map((a) => a.textContent.trim()));
const renderSeq = (page) => page.evaluate(() => window.MDV.app.state.renderSeq);
/** Rewrite the contents of the replaced folder (standing in for changes on disk). */
const mutate = (page, changes) => page.evaluate((c) => {
  const files = window.__mockFs.files;
  Object.keys(c).forEach((p) => {
    if (c[p] === null) delete files[p];
    else files[p] = { text: c[p], mtime: Date.now() };
  });
}, changes);

describe('Auto-update (FR-109)', () => {
  const spec = () => ({ name: 'notes', files: { 'README.md': long('メモ', '旧い内容です。'), 'other.md': '# 別の文書\n\n[戻る](README.md)\n' } });

  test('when the displayed document changes, the display updates while keeping the scroll position', async () => {
    await withPage(browser, mockOptions(spec()), async ({ page }) => {
      await openMock(page);
      assert.equal(await page.evaluate(() => window.MDV.app.state.set.source), 'handles');
      await waitIndexed(page);
      await page.evaluate(() => window.scrollTo(0, 600));
      await mutate(page, { 'README.md': long('メモ（改訂）', '新しい内容です。検索語ガンマ。') });
      await page.waitForFunction(() => document.querySelector('.mdv-prose').textContent.includes('新しい内容です'), null, { timeout: 6000 });
      assert.equal(await heading(page), 'メモ（改訂）');
      assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - 600) <= 2, 'scroll position is unchanged');
      assert.equal(await page.title(), 'メモ（改訂）');
      assert.deepEqual(await toasts(page), [], 'auto-update shows no notice');
      // The search index also gets the new content
      await page.fill('.mdv-search-input', 'ガンマ');
      await page.waitForSelector('.mdv-search-item');
      assert.ok((await page.textContent('.mdv-search-item')).includes('メモ（改訂）'));
      await page.fill('.mdv-search-input', '旧い内容');
      await page.waitForSelector('.mdv-search-empty');
    });
  });

  test('no redraw when nothing changed; moving to another document watches that document', async () => {
    await withPage(browser, mockOptions(spec()), async ({ page }) => {
      await openMock(page);
      const seq = await renderSeq(page);
      const reads = await page.evaluate(() => window.__mockFs.reads);
      await page.waitForTimeout(4500);
      assert.equal(await renderSeq(page), seq, 'not redrawn');
      assert.ok((await page.evaluate(() => window.__mockFs.reads)) >= reads + 2, 'modification times are checked periodically');
      await goTo(page, '#/other.md', '別の文書');
      await mutate(page, { 'README.md': long('メモ', '裏で変わった内容。') });
      const seq2 = await renderSeq(page);
      await page.waitForTimeout(2600);
      assert.equal(await renderSeq(page), seq2, 'changes to a document not on screen cause no redraw');
      await mutate(page, { 'other.md': '# 別の文書（更新）\n' });
      await waitHeading(page, '別の文書（更新）');
      // On return, a document changed in the background is shown with its new content
      await goTo(page, '#/README.md', 'メモ');
      await page.waitForFunction(() => document.querySelector('.mdv-prose').textContent.includes('裏で変わった内容'));
    });
  });

  test('if the displayed document is deleted, the display stays and no error is raised', async () => {
    await withPage(browser, mockOptions(spec()), async ({ page }) => {
      await openMock(page);
      await mutate(page, { 'README.md': null });
      await page.waitForTimeout(2600);
      assert.equal(await heading(page), 'メモ');
      assert.deepEqual(await toasts(page), []);
      // Other documents can still be read
      await goTo(page, '#/other.md', '別の文書');
    });
  });

  test('reopening a folder stops watching the previous folder', async () => {
    await withPage(browser, mockOptions(spec()), async ({ page }) => {
      await openMock(page);
      await loadFolder(page, fixture('single'));
      await page.waitForFunction(() => window.MDV.app.state.set.source !== 'handles');
      const reads = await page.evaluate(() => window.__mockFs.reads);
      await page.waitForTimeout(2600);
      assert.equal(await page.evaluate(() => window.__mockFs.reads), reads, 'the previous folder is not read');
    });
  });
});

describe('Reload (FR-109)', () => {
  test('rereads the folder and reflects additions, deletions and changes, keeping the displayed document', async () => {
    const spec = { name: 'notes', files: { 'README.md': '# ホーム\n\n[a](a.md)\n', 'a.md': '# 文書 A\n', 'old.md': '# 古い文書\n' } };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      assert.deepEqual(await treeLabels(page), ['ホーム', '文書 A', '古い文書'], 'labels are document titles (FR-1105)');
      await goTo(page, '#/a.md', '文書 A');
      await mutate(page, { 'new/added.md': '# 追加した文書\n\n検索語デルタ。\n', 'old.md': null, 'a.md': '# 文書 A（改訂）\n' });
      await clickMenu(page, 'menuReload');
      await waitHeading(page, '文書 A（改訂）');
      assert.deepEqual(await toasts(page), ['再読み込みしました']);
      assert.equal(await hash(page), '#/a.md');
      assert.deepEqual(await treeLabels(page), ['ホーム', '文書 A（改訂）', '追加した文書'], 'added files appear and deleted files disappear');
      await waitIndexed(page);
      await page.fill('.mdv-search-input', 'デルタ');
      await page.waitForSelector('.mdv-search-item');
      await page.fill('.mdv-search-input', '古い文書');
      await page.waitForSelector('.mdv-search-empty');
    });
  });

  test('if the displayed document is gone, shows the home document', async () => {
    const spec = { name: 'notes', files: { 'README.md': '# ホーム\n', 'gone.md': '# 消える文書\n' } };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      await goTo(page, '#/gone.md', '消える文書');
      await mutate(page, { 'gone.md': null });
      await clickMenu(page, 'menuReload');
      await waitHeading(page, 'ホーム');
      assert.equal(await hash(page), '#/README.md');
    });
  });

  test('"Reload" keeps the document and its scroll position', async () => {
    const spec = { name: 'notes', files: { 'README.md': '# ホーム\n', 'long.md': long('長い文書', '本文です。') } };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      await goTo(page, '#/long.md', '長い文書');
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForFunction(() => Math.abs(window.scrollY - 600) <= 2);
      // Clicked through the DOM: Playwright's own click scrolls the page to bring the button into view
      const y = await page.evaluate(() => {
        document.querySelector('.mdv-btn-menu').click();
        const y0 = window.scrollY;
        window.__oldSet = window.MDV.app.state.set;
        document.querySelector('.mdv-menu-item[data-action="menuReload"]').click();
        return Math.abs(y0 - window.scrollY) <= 2 ? window.scrollY : -1;
      });
      assert.ok(Math.abs(y - 600) <= 2, 'focusing the menu in the sticky header does not scroll the page: ' + y);
      await page.waitForFunction(() => window.MDV.app.state.set !== window.__oldSet && !!document.querySelector('.mdv-toast'));
      await waitHeading(page, '長い文書');
      assert.equal(await hash(page), '#/long.md');
      const after = await page.evaluate(() => window.scrollY);
      assert.ok(Math.abs(after - y) <= 2, `scroll position is kept: ${y} -> ${after}`);
    });
  });

  test('if all documents are gone, keeps the display and shows a notice', async () => {
    const spec = { name: 'notes', files: { 'README.md': '# ホーム\n' } };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      await mutate(page, { 'README.md': null, 'memo.txt': 'text' });
      await clickMenu(page, 'menuReload');
      await page.waitForSelector('.mdv-toast-error');
      assert.deepEqual(await toasts(page), ['Markdown 文書が見つかりませんでした。名前が .md で終わるファイルの入ったフォルダを選んでください（作り方はメニューの「使い方」にあります）']);
      assert.equal(await heading(page), 'ホーム');
    });
  });

  test('when opened via <input>, rereads the displayed document; if it changed, suggests reopening', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 入力欄から開いた文書\n\n最初の内容。\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await clickMenu(page, 'menuReload');
      await page.waitForSelector('.mdv-toast');
      assert.deepEqual(await toasts(page), ['再読み込みしました']);
      // Browsers do not allow reading files changed after selection (a security measure)
      await page.waitForTimeout(1100);
      fs.writeFileSync(path.join(dir, 'README.md'), '# 入力欄から開いた文書\n\n変更後の内容。\n');
      await clickMenu(page, 'menuReload');
      await page.waitForSelector('.mdv-toast-error');
      assert.equal(await page.textContent('.mdv-toast-error'), 'ファイルが変更されたため再読み込みできません。フォルダを開き直してください');
      assert.ok((await page.textContent('.mdv-prose')).includes('最初の内容。'), 'the display is unchanged');
      // Reopening as suggested shows the new content
      await loadFolder(page, dir);
      await page.waitForFunction(() => document.querySelector('.mdv-prose').textContent.includes('変更後の内容。'));
    });
  });
});

describe('Last folder (FR-108)', () => {
  test('where handles cannot be saved, nothing is shown and no error is raised', async () => {
    const spec = { name: 'notes', files: { 'README.md': '# ホーム\n' } };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      await page.waitForTimeout(300);
      await page.reload();
      await page.waitForSelector('.mdv-app[data-view="welcome"]');
      await page.waitForTimeout(300);
      assert.ok(await page.isHidden('.mdv-open-last'));
    });
  });

  test('in browsers that only support the <input> method, the last folder is not shown', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('single'));
      await page.reload();
      await page.waitForSelector('.mdv-app[data-view="welcome"]');
      await page.waitForTimeout(300);
      assert.ok(await page.isHidden('.mdv-open-last'));
    });
  });
});

describe('Checks with real folder handles (OPFS; FR-103, FR-108, FR-109)', () => {
  // Uses the real FileSystemDirectoryHandle provided by the browser. Only the folder picker dialog cannot be automated,
  // so showDirectoryPicker is made to return the OPFS "docs" folder. OPFS is not available on file://, so the page is opened via http://.
  let server;
  let context;
  const png = fs.readFileSync(path.join(fixture('site'), 'assets/pixel.png')).toString('base64');

  before(async () => {
    const html = fs.readFileSync(VIEWER);
    server = await startServer({ '/mdfolio.html': html, '/other.html': html });
    context = await launchPersistent(tmpDir('mdfolio-profile-'));
    await context.addInitScript(() => {
      window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('docs');
    });
  });
  after(async () => { await context.close(); await server.close(); });

  const writeOpfs = (page, files) => page.evaluate(async (list) => {
    const root = await navigator.storage.getDirectory();
    for (const [p, content, isBase64] of list) {
      const segs = ('docs/' + p).split('/');
      let dir = root;
      for (const s of segs.slice(0, -1)) dir = await dir.getDirectoryHandle(s, { create: true });
      const fh = await dir.getFileHandle(segs[segs.length - 1], { create: true });
      const w = await fh.createWritable();
      await w.write(isBase64 ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0)) : content);
      await w.close();
    }
  }, files);

  test('open -> show images -> auto-update -> reload -> "Open last folder" on next startup', async () => {
    const page = await context.newPage();
    const record = watch(page);
    await page.goto(server.origin + '/mdfolio.html');
    await page.waitForSelector('.mdv-app');
    await writeOpfs(page, [
      ['README.md', '# OPFS のホーム\n\n![点](img/pixel.png)\n\n[下の階層](sub/a.md)\n'],
      ['sub/a.md', '# 下の階層の文書\n\n![点](../img/pixel.png)\n'],
      ['img/pixel.png', png, true],
      ['.hidden/secret.md', '# 隠し\n']
    ]);
    assert.ok(await page.isHidden('.mdv-open-last'), 'no "last folder" the first time');

    // Open
    await page.click('.mdv-open-folder');
    await waitHeading(page, 'OPFS のホーム');
    const info = await page.evaluate(() => { const s = window.MDV.app.state.set; return { source: s.source, name: s.name, docs: s.docs.slice(), handle: Object.prototype.toString.call(s.rootHandle) }; });
    assert.deepEqual(info, { source: 'handles', name: 'docs', docs: ['README.md', 'sub/a.md'], handle: '[object FileSystemDirectoryHandle]' });
    await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.complete && i.naturalWidth === 64; });
    await page.click('.mdv-prose a:has-text("下の階層")');
    await waitHeading(page, '下の階層の文書');
    await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.complete && i.naturalWidth === 64; });

    // Auto-update
    await writeOpfs(page, [['sub/a.md', '# 下の階層の文書（更新）\n\n書き換えました。\n']]);
    await waitHeading(page, '下の階層の文書（更新）');

    // Reload (reflects the added file)
    await writeOpfs(page, [['sub/b.md', '# 追加した文書\n']]);
    await clickMenu(page, 'menuReload');
    await page.waitForFunction(() => window.MDV.app.state.set.docs.length === 3);
    assert.equal(await hash(page), '#/sub/a.md');

    // Reopening the page lets you open the last folder, returning to the document that was being viewed
    await page.reload();
    await page.waitForSelector('.mdv-app[data-view="welcome"]');
    await page.waitForSelector('.mdv-open-last', { state: 'visible' });
    assert.equal((await page.textContent('.mdv-open-last')).trim(), '前回のフォルダを開く（docs）');
    assert.ok((await page.textContent('.mdv-welcome-pending')).includes('sub/a.md'));
    await page.click('.mdv-open-last');
    await waitHeading(page, '下の階層の文書（更新）');
    assert.equal(await page.evaluate(() => window.MDV.app.state.set.docs.length), 3);

    // Not carried over to an HTML file with a different name (stored per HTML file)
    await page.goto(server.origin + '/other.html');
    await page.waitForSelector('.mdv-app[data-view="welcome"]');
    await page.waitForTimeout(400);
    assert.ok(await page.isHidden('.mdv-open-last'));

    // If the folder is gone, suggest choosing again and remove the button
    await page.evaluate(async () => { await (await navigator.storage.getDirectory()).removeEntry('docs', { recursive: true }); });
    await page.goto(server.origin + '/mdfolio.html');
    await page.waitForSelector('.mdv-open-last', { state: 'visible' });
    await page.click('.mdv-open-last');
    await page.waitForSelector('.mdv-toast-error');
    assert.equal(await page.textContent('.mdv-toast-error'), '前回のフォルダを開けませんでした。フォルダを選び直してください');
    assert.ok(await page.isHidden('.mdv-open-last'));
    await page.reload();
    await page.waitForSelector('.mdv-app[data-view="welcome"]');
    await page.waitForTimeout(400);
    assert.ok(await page.isHidden('.mdv-open-last'), 'the saved information is also cleared');

    assertClean(record);
    await page.close();
  });
});
