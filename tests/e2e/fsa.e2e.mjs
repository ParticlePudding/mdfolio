// フォルダのハンドルを使う機能: 再読み込み・自動更新（FR-109）、前回のフォルダ（FR-108）
// 前半はフォルダ選択を差し替えて file:// 上で確認し、後半は本物のハンドル（OPFS）で確認する。
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
/** 差し替えたフォルダの中身を書き換える（ディスク上での変更の代わり）。 */
const mutate = (page, changes) => page.evaluate((c) => {
  const files = window.__mockFs.files;
  Object.keys(c).forEach((p) => {
    if (c[p] === null) delete files[p];
    else files[p] = { text: c[p], mtime: Date.now() };
  });
}, changes);

describe('自動更新（FR-109）', () => {
  const spec = () => ({ name: 'notes', files: { 'README.md': long('メモ', '旧い内容です。'), 'other.md': '# 別の文書\n\n[戻る](README.md)\n' } });

  test('表示中の文書が変更されると、スクロール位置を保ったまま表示を更新する', async () => {
    await withPage(browser, mockOptions(spec()), async ({ page }) => {
      await openMock(page);
      assert.equal(await page.evaluate(() => window.MDV.app.state.set.source), 'handles');
      await waitIndexed(page);
      await page.evaluate(() => window.scrollTo(0, 600));
      await mutate(page, { 'README.md': long('メモ（改訂）', '新しい内容です。検索語ガンマ。') });
      await page.waitForFunction(() => document.querySelector('.mdv-prose').textContent.includes('新しい内容です'), null, { timeout: 6000 });
      assert.equal(await heading(page), 'メモ（改訂）');
      assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - 600) <= 2, 'スクロール位置は変わらない');
      assert.equal(await page.title(), 'メモ（改訂） - notes');
      assert.deepEqual(await toasts(page), [], '自動更新では通知を出さない');
      // 検索の索引も新しい内容になる
      await page.fill('.mdv-search-input', 'ガンマ');
      await page.waitForSelector('.mdv-search-item');
      assert.ok((await page.textContent('.mdv-search-item')).includes('メモ（改訂）'));
      await page.fill('.mdv-search-input', '旧い内容');
      await page.waitForSelector('.mdv-search-empty');
    });
  });

  test('変更がなければ描き直さない。別の文書へ移れば、その文書を監視する', async () => {
    await withPage(browser, mockOptions(spec()), async ({ page }) => {
      await openMock(page);
      const seq = await renderSeq(page);
      const reads = await page.evaluate(() => window.__mockFs.reads);
      await page.waitForTimeout(4500);
      assert.equal(await renderSeq(page), seq, '描き直していない');
      assert.ok((await page.evaluate(() => window.__mockFs.reads)) >= reads + 2, '定期的に更新日時を確かめている');
      await goTo(page, '#/other.md', '別の文書');
      await mutate(page, { 'README.md': long('メモ', '裏で変わった内容。') });
      const seq2 = await renderSeq(page);
      await page.waitForTimeout(2600);
      assert.equal(await renderSeq(page), seq2, '表示していない文書の変更では描き直さない');
      await mutate(page, { 'other.md': '# 別の文書（更新）\n' });
      await waitHeading(page, '別の文書（更新）');
      // 戻ると、裏で変わっていた文書も新しい内容で表示される
      await goTo(page, '#/README.md', 'メモ');
      await page.waitForFunction(() => document.querySelector('.mdv-prose').textContent.includes('裏で変わった内容'));
    });
  });

  test('表示中の文書が削除されても、表示はそのままでエラーにしない', async () => {
    await withPage(browser, mockOptions(spec()), async ({ page }) => {
      await openMock(page);
      await mutate(page, { 'README.md': null });
      await page.waitForTimeout(2600);
      assert.equal(await heading(page), 'メモ');
      assert.deepEqual(await toasts(page), []);
      // ほかの文書は引き続き読める
      await goTo(page, '#/other.md', '別の文書');
    });
  });

  test('フォルダを開き直すと、前のフォルダの監視をやめる', async () => {
    await withPage(browser, mockOptions(spec()), async ({ page }) => {
      await openMock(page);
      await loadFolder(page, fixture('single'));
      await page.waitForFunction(() => window.MDV.app.state.set.source !== 'handles');
      const reads = await page.evaluate(() => window.__mockFs.reads);
      await page.waitForTimeout(2600);
      assert.equal(await page.evaluate(() => window.__mockFs.reads), reads, '前のフォルダを読みに行かない');
    });
  });
});

describe('再読み込み（FR-109）', () => {
  test('フォルダを読み直して、追加・削除・変更を反映する。表示中の文書は保つ', async () => {
    const spec = { name: 'notes', files: { 'README.md': '# ホーム\n\n[a](a.md)\n', 'a.md': '# 文書 A\n', 'old.md': '# 古い文書\n' } };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      assert.deepEqual(await treeLabels(page), ['README', 'a', 'old']);
      await goTo(page, '#/a.md', '文書 A');
      await mutate(page, { 'new/added.md': '# 追加した文書\n\n検索語デルタ。\n', 'old.md': null, 'a.md': '# 文書 A（改訂）\n' });
      await clickMenu(page, 'menuReload');
      await waitHeading(page, '文書 A（改訂）');
      assert.deepEqual(await toasts(page), ['再読み込みしました']);
      assert.equal(await hash(page), '#/a.md');
      assert.deepEqual(await treeLabels(page), ['README', 'a', 'added'], '追加したファイルが増え、削除したファイルが消える');
      await waitIndexed(page);
      await page.fill('.mdv-search-input', 'デルタ');
      await page.waitForSelector('.mdv-search-item');
      await page.fill('.mdv-search-input', '古い文書');
      await page.waitForSelector('.mdv-search-empty');
    });
  });

  test('表示中の文書がなくなっていたら、ホームを表示する', async () => {
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

  test('文書がすべてなくなっていたら、表示はそのままにして知らせる', async () => {
    const spec = { name: 'notes', files: { 'README.md': '# ホーム\n' } };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      await mutate(page, { 'README.md': null, 'memo.txt': 'text' });
      await clickMenu(page, 'menuReload');
      await page.waitForSelector('.mdv-toast-error');
      assert.deepEqual(await toasts(page), ['Markdown 文書が見つかりませんでした']);
      assert.equal(await heading(page), 'ホーム');
    });
  });

  test('<input> で開いた場合は、表示中の文書を読み直す。変更されていれば開き直しを案内する', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 入力欄から開いた文書\n\n最初の内容。\n' });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await clickMenu(page, 'menuReload');
      await page.waitForSelector('.mdv-toast');
      assert.deepEqual(await toasts(page), ['再読み込みしました']);
      // ブラウザーは、選択後に変更されたファイルを読ませない（安全のための仕様）
      await page.waitForTimeout(1100);
      fs.writeFileSync(path.join(dir, 'README.md'), '# 入力欄から開いた文書\n\n変更後の内容。\n');
      await clickMenu(page, 'menuReload');
      await page.waitForSelector('.mdv-toast-error');
      assert.equal(await page.textContent('.mdv-toast-error'), 'ファイルが変更されたため再読み込みできません。フォルダを開き直してください');
      assert.ok((await page.textContent('.mdv-prose')).includes('最初の内容。'), '表示は元のまま');
      // 案内のとおり開き直せば、新しい内容になる
      await loadFolder(page, dir);
      await page.waitForFunction(() => document.querySelector('.mdv-prose').textContent.includes('変更後の内容。'));
    });
  });
});

describe('前回のフォルダ（FR-108）', () => {
  test('ハンドルを保存できない環境では、何も表示せず、エラーにもしない', async () => {
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

  test('<input> 方式しか使えないブラウザーでは、前回のフォルダを表示しない', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('single'));
      await page.reload();
      await page.waitForSelector('.mdv-app[data-view="welcome"]');
      await page.waitForTimeout(300);
      assert.ok(await page.isHidden('.mdv-open-last'));
    });
  });
});

describe('本物のフォルダハンドルでの確認（OPFS。FR-103, FR-108, FR-109）', () => {
  // ブラウザーが用意する実物の FileSystemDirectoryHandle を使う。フォルダ選択の画面だけは自動操作できないので、
  // showDirectoryPicker が OPFS の「docs」フォルダを返すようにしている。OPFS は file:// では使えないため http:// で開く。
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

  test('開く → 画像の表示 → 自動更新 → 再読み込み → 次回起動時に「前回のフォルダを開く」', async () => {
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
    assert.ok(await page.isHidden('.mdv-open-last'), '初回は「前回のフォルダ」がない');

    // 開く
    await page.click('.mdv-open-folder');
    await waitHeading(page, 'OPFS のホーム');
    const info = await page.evaluate(() => { const s = window.MDV.app.state.set; return { source: s.source, name: s.name, docs: s.docs.slice(), handle: Object.prototype.toString.call(s.rootHandle) }; });
    assert.deepEqual(info, { source: 'handles', name: 'docs', docs: ['README.md', 'sub/a.md'], handle: '[object FileSystemDirectoryHandle]' });
    await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.complete && i.naturalWidth === 64; });
    await page.click('.mdv-prose a:has-text("下の階層")');
    await waitHeading(page, '下の階層の文書');
    await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.complete && i.naturalWidth === 64; });

    // 自動更新
    await writeOpfs(page, [['sub/a.md', '# 下の階層の文書（更新）\n\n書き換えました。\n']]);
    await waitHeading(page, '下の階層の文書（更新）');

    // 再読み込み（追加されたファイルを反映）
    await writeOpfs(page, [['sub/b.md', '# 追加した文書\n']]);
    await clickMenu(page, 'menuReload');
    await page.waitForFunction(() => window.MDV.app.state.set.docs.length === 3);
    assert.equal(await hash(page), '#/sub/a.md');

    // ページを開き直すと、前回のフォルダを開ける。見ていた文書に戻る
    await page.reload();
    await page.waitForSelector('.mdv-app[data-view="welcome"]');
    await page.waitForSelector('.mdv-open-last', { state: 'visible' });
    assert.equal((await page.textContent('.mdv-open-last')).trim(), '前回のフォルダを開く（docs）');
    assert.ok((await page.textContent('.mdv-welcome-pending')).includes('sub/a.md'));
    await page.click('.mdv-open-last');
    await waitHeading(page, '下の階層の文書（更新）');
    assert.equal(await page.evaluate(() => window.MDV.app.state.set.docs.length), 3);

    // 別のファイル名の HTML には引き継がない（保存先は HTML ファイルごと）
    await page.goto(server.origin + '/other.html');
    await page.waitForSelector('.mdv-app[data-view="welcome"]');
    await page.waitForTimeout(400);
    assert.ok(await page.isHidden('.mdv-open-last'));

    // フォルダがなくなっていたら、選び直しを案内して、ボタンを消す
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
    assert.ok(await page.isHidden('.mdv-open-last'), '保存していた情報も消えている');

    assertClean(record);
    await page.close();
  });
});
