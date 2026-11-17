// Loading documents (FR-101 to FR-112, FR-902)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  launchBrowser, withPage, loadFolder, loadFiles, fixture, hash, heading, waitHeading, goTo, toasts,
  mockOptions, openMock, tmpDir, writeTree, waitIndexed
} from '../helpers/e2e.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const SITE_DOCS = [
  'README.md', 'bom.md', 'sjis.md', 'syntax.md', 'utf16.md', 'xss.md',
  'guide/index.md', 'guide/intro.md', 'guide/Setup.md', 'guide/sub/deep.md',
  '日本語 フォルダ/仕様書 v1.0.md'
];

const setInfo = (page) => page.evaluate(() => {
  const s = window.MDV.app.state.set;
  return s ? { name: s.name, source: s.source, single: s.single, docs: s.docs.slice(), entries: Array.from(s.entries.keys()).sort(), home: s.home } : null;
});

describe('Opening a folder (FR-101, FR-105, FR-106)', () => {
  test('<input> method: loads everything below recursively and shows the home document', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.equal(await heading(page), 'テスト用サイト');
      assert.equal(await hash(page), '#/README.md');
      assert.equal(await page.title(), 'テスト用サイト - site');
      assert.equal(await page.textContent('.mdv-title'), 'site', 'the folder name becomes the site title');
      const info = await setInfo(page);
      assert.equal(info.name, 'site');
      assert.equal(info.source, 'files');
      assert.equal(info.single, false);
      assert.deepEqual(info.docs, SITE_DOCS, 'tree order: files (README first) -> folders');
      assert.equal(info.home, 'README.md');
      assert.ok(await page.isVisible('.mdv-search'));
      assert.ok(await page.isVisible('.mdv-sidebar'));
    });
  });

  test('segments starting with . and node_modules are not loaded; attachments are only listed, not shown', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const info = await setInfo(page);
      for (const p of ['.hidden/secret.md', '.dotfile.md', 'node_modules/pkg/readme.md']) {
        assert.ok(!info.entries.includes(p), `${p} is not loaded`);
      }
      for (const p of ['assets/pixel.png', 'assets/data.csv', 'notes.txt']) {
        assert.ok(info.entries.includes(p), `${p} is kept as an attachment`);
      }
      const tree = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-side-tree a')).map((a) => a.textContent));
      assert.deepEqual(tree, ['README', 'bom', 'sjis', 'syntax', 'utf16', 'xss', 'index', 'intro', 'Setup', 'deep', '仕様書 v1.0']);
      assert.ok(!tree.includes('notes'), 'non-Markdown files are not shown in the tree');
    });
  });

  test('"Open folder" button -> file selection dialog (when the File System Access API is unavailable)', async () => {
    await withPage(browser, async ({ page }) => {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.mdv-open-folder')]);
      assert.equal(chooser.isMultiple(), true);
      await chooser.setFiles(fixture('nav'));
      await waitHeading(page, 'ナビ付きサイト');
      assert.equal((await setInfo(page)).name, 'nav');
    });
  });

  test('falls back to the <input> method automatically when showDirectoryPicker is refused', async () => {
    await withPage(browser, mockOptions({ reject: 'SecurityError' }), async ({ page }) => {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.mdv-open-folder')]);
      assert.equal(await page.evaluate(() => window.__pickerCalls), 1);
      await chooser.setFiles(fixture('nav'));
      await waitHeading(page, 'ナビ付きサイト');
    });
  });

  test('does nothing when the user cancels folder selection', async () => {
    await withPage(browser, mockOptions({ reject: 'AbortError' }), async ({ page }) => {
      let chooserShown = false;
      page.on('filechooser', () => { chooserShown = true; });
      await page.click('.mdv-open-folder');
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => window.__pickerCalls), 1);
      assert.equal(chooserShown, false);
      assert.ok(await page.isVisible('.mdv-welcome'));
      assert.deepEqual(await toasts(page), []);
    });
  });

  test('showDirectoryPicker method: loads from the handle and shows scanning progress', async () => {
    const files = { 'README.md': '# モックのホーム\n\n[次](docs/a.md)\n', 'docs/a.md': '# A\n', '.git/config.md': '# no\n', 'node_modules/x.md': '# no\n' };
    await withPage(browser, mockOptions({ name: 'mock-folder', files, generate: [{ count: 900, prefix: 'many/n', ext: '.md' }], slow: 20 }), async ({ page }) => {
      await page.click('.mdv-open-folder');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.mdv-toast')).some((e) => /フォルダを読み込んでいます… \d+ 件/.test(e.textContent)));
      await waitHeading(page, 'モックのホーム');
      const info = await setInfo(page);
      assert.equal(info.name, 'mock-folder');
      assert.equal(info.source, 'handles');
      assert.equal(info.docs.length, 902);
      assert.ok(!info.entries.some((p) => p.startsWith('.git/') || p.startsWith('node_modules/')));
      assert.deepEqual((await toasts(page)).filter((x) => x.includes('読み込んでいます')), [], 'the progress notice disappears when finished');
    });
  });
});

describe('Opening files (FR-102, FR-112)', () => {
  test('single file: can be displayed, but indicates that images cannot be resolved', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFiles(page, [path.join(fixture('single'), 'one.md')]);
      assert.equal(await heading(page), '単一ファイル');
      const info = await setInfo(page);
      assert.equal(info.single, true);
      assert.deepEqual(info.docs, ['one.md']);
      const ph = await page.textContent('.mdv-ph');
      assert.ok(ph.includes('pic.png'));
      assert.ok(ph.includes('フォルダとして開くと表示できます'));
      assert.equal(await page.locator('.mdv-prose a.mdv-missing').count(), 1, 'links to unselected documents are treated as "not found"');
    });
  });

  test('multiple files: links between documents and images selected together work', async () => {
    await withPage(browser, async ({ page }) => {
      const dir = fixture('single');
      await loadFiles(page, [path.join(dir, 'one.md'), path.join(dir, 'other.md'), path.join(dir, 'pic.png')]);
      await goTo(page, '#/one.md', '単一ファイル');
      await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.naturalWidth === 64; });
      await page.click('.mdv-prose a:has-text("隣の文書")');
      await waitHeading(page, '隣の文書');
    });
  });
});

describe('Drag and drop (FR-103)', () => {
  test('dropping files', async () => {
    await withPage(browser, async ({ page }) => {
      await page.evaluate(() => {
        const dt = new DataTransfer();
        dt.items.add(new File(['# ドロップした文書\n\n[b](b.md)\n'], 'README.md', { type: 'text/markdown' }));
        dt.items.add(new File(['# B\n'], 'b.md', { type: 'text/markdown' }));
        window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      });
      await waitHeading(page, 'ドロップした文書');
      const info = await setInfo(page);
      assert.deepEqual(info.docs, ['README.md', 'b.md']);
      assert.equal(info.single, true);
    });
  });

  // Imitates the entries returned by webkitGetAsEntry (drops in Firefox / Safari)
  const fakeEntries = () => {
    const fileEntry = (name, text) => ({ isFile: true, isDirectory: false, name, file: (ok) => ok(new File([text], name, { lastModified: 1700000000000 })) });
    const dirEntry = (name, children) => ({
      isFile: false, isDirectory: true, name,
      createReader: () => {
        let i = 0;
        // Like the real thing, returns them in several batches
        return { readEntries: (ok) => { const batch = children.slice(i, i + 2); i += 2; setTimeout(() => ok(batch), 0); } };
      }
    });
    window.__fake = { fileEntry, dirEntry };
    window.__drop = (items) => {
      const ev = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'dataTransfer', { value: { types: ['Files'], files: [], items: items } });
      window.dispatchEvent(ev);
    };
  };

  test('dropping one folder: that folder becomes the root (entry method)', async () => {
    await withPage(browser, { init: fakeEntries }, async ({ page }) => {
      await page.evaluate(() => {
        const { fileEntry, dirEntry } = window.__fake;
        const root = dirEntry('dropped-docs', [
          fileEntry('README.md', '# エントリのホーム\n'),
          dirEntry('guide', [fileEntry('a.md', '# A\n'), fileEntry('b.md', '# B\n'), fileEntry('c.md', '# C\n')]),
          dirEntry('.git', [fileEntry('x.md', '# no\n')]),
          dirEntry('node_modules', [fileEntry('y.md', '# no\n')]),
          fileEntry('logo.png', 'png')
        ]);
        window.__drop([{ kind: 'file', webkitGetAsEntry: () => root }]);
      });
      await waitHeading(page, 'エントリのホーム');
      const info = await setInfo(page);
      assert.equal(info.name, 'dropped-docs');
      assert.equal(info.single, false);
      assert.deepEqual(info.docs, ['README.md', 'guide/a.md', 'guide/b.md', 'guide/c.md']);
      assert.deepEqual(info.entries, ['README.md', 'guide/a.md', 'guide/b.md', 'guide/c.md', 'logo.png']);
    });
  });

  test('dropping several items: placed directly under the root', async () => {
    await withPage(browser, { init: fakeEntries }, async ({ page }) => {
      await page.evaluate(() => {
        const { fileEntry, dirEntry } = window.__fake;
        window.__drop([
          { kind: 'file', webkitGetAsEntry: () => dirEntry('alpha', [fileEntry('one.md', '# One\n')]) },
          { kind: 'file', webkitGetAsEntry: () => fileEntry('top.md', '# Top\n') },
          { kind: 'string', webkitGetAsEntry: () => null }
        ]);
      });
      await waitHeading(page, 'Top');
      const info = await setInfo(page);
      assert.equal(info.name, '');
      assert.deepEqual(info.docs, ['top.md', 'alpha/one.md']);
    });
  });

  test('dropping one folder (handle method, Edge / Chrome)', async () => {
    await withPage(browser, mockOptions({ name: 'handle-drop', files: { 'README.md': '# ハンドルのホーム\n', 'sub/x.md': '# X\n' } }), async ({ page }) => {
      await page.evaluate(() => {
        const ev = new Event('drop', { bubbles: true, cancelable: true });
        const item = { kind: 'file', getAsFileSystemHandle: async () => window.__mockRoot(), webkitGetAsEntry: () => null };
        Object.defineProperty(ev, 'dataTransfer', { value: { types: ['Files'], files: [], items: [item] } });
        window.dispatchEvent(ev);
      });
      await waitHeading(page, 'ハンドルのホーム');
      const info = await setInfo(page);
      assert.equal(info.name, 'handle-drop');
      assert.equal(info.source, 'handles');
      assert.deepEqual(info.docs, ['README.md', 'sub/x.md']);
    });
  });

  test('while dragging: on the start screen the crop marks move in; while a document is shown, a drop prompt is overlaid', async () => {
    await withPage(browser, async ({ page }) => {
      const fire = (type) => page.evaluate((t) => {
        const ev = new Event(t, { bubbles: true, cancelable: true });
        Object.defineProperty(ev, 'dataTransfer', { value: { types: ['Files'], dropEffect: 'none' } });
        window.dispatchEvent(ev);
      }, type);
      await fire('dragenter');
      assert.ok(await page.evaluate(() => document.querySelector('.mdv-app').classList.contains('is-dragover')));
      assert.ok(await page.isHidden('.mdv-dropveil'), 'on the start screen the sheet itself reacts');
      await fire('dragleave');
      assert.ok(!(await page.evaluate(() => document.querySelector('.mdv-app').classList.contains('is-dragover'))));
      await loadFolder(page, fixture('nav'));
      await fire('dragenter');
      assert.ok(await page.isVisible('.mdv-dropveil'));
      assert.equal((await page.textContent('.mdv-dropveil')).trim(), 'ここにドロップして開く');
      await fire('dragleave');
      assert.ok(await page.isHidden('.mdv-dropveil'));
      // Does not react to dragging non-files (such as strings)
      await page.evaluate(() => {
        const ev = new Event('dragenter', { bubbles: true, cancelable: true });
        Object.defineProperty(ev, 'dataTransfer', { value: { types: ['text/plain'] } });
        window.dispatchEvent(ev);
      });
      assert.ok(await page.isHidden('.mdv-dropveil'));
    });
  });
});

describe('Replacing, and when there are no documents (FR-111, FR-902)', () => {
  test('folder without Markdown documents: notifies and stays on the start screen', async () => {
    await withPage(browser, async ({ page }) => {
      await page.locator('.mdv-input-dir').setInputFiles(fixture('nodocs'));
      await page.waitForSelector('.mdv-toast-error');
      assert.deepEqual(await toasts(page), ['Markdown 文書が見つかりませんでした']);
      assert.ok(await page.isVisible('.mdv-welcome'));
      assert.equal(await setInfo(page), null);
    });
  });

  test('opening a folder without documents while a document set is open keeps the current display', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.locator('.mdv-input-dir').setInputFiles(fixture('nodocs'));
      await page.waitForSelector('.mdv-toast-error');
      assert.equal(await heading(page), 'イントロダクション');
      assert.equal((await setInfo(page)).name, 'site');
    });
  });

  test('opening another folder replaces the current one without confirmation and shows its home document', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.fill('.mdv-search-input', 'ベータ');
      await page.locator('.mdv-input-dir').setInputFiles(fixture('nav'));
      await waitHeading(page, 'ナビ付きサイト');
      assert.equal(await hash(page), '#/README.md');
      assert.equal(await page.title(), 'ナビ付きサイト - nav');
      assert.equal(await page.textContent('.mdv-title'), 'nav');
      assert.equal(await page.inputValue('.mdv-search-input'), '', 'search is reset');
      const info = await setInfo(page);
      assert.deepEqual(info.docs, ['README.md', '_sidebar.md', 'a.md', 'b/c.md', 'b/unlisted.md']);
    });
  });
});

describe('Character encodings (FR-107)', () => {
  test('auto-detects Shift_JIS, UTF-16 (BOM) and UTF-8 with BOM', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/sjis.md', 'シフトJISの文書');
      assert.ok((await page.textContent('.mdv-prose')).includes('日本語の本文です。固有語イプシロン。'));
      await goTo(page, '#/utf16.md', 'UTF-16 の文書');
      assert.ok((await page.textContent('.mdv-prose')).includes('固有語イータ。'));
      await goTo(page, '#/bom.md', 'BOM 付き UTF-8');
      assert.equal(await heading(page), 'BOM 付き UTF-8', 'the BOM does not leak into the heading');
      // The search index is built with the same detection
      await waitIndexed(page);
      await page.fill('.mdv-search-input', 'イプシロン');
      await page.waitForSelector('.mdv-search-item');
      assert.equal(await page.getAttribute('.mdv-search-item', 'href'), '#/sjis.md');
    });
  });
});

describe('Limits (FR-110)', () => {
  test('up to 5,000 documents; the excess is not loaded and a notice is shown', async () => {
    await withPage(browser, mockOptions({ name: 'many', files: { 'README.md': '# 多数の文書\n' }, generate: [{ count: 5010, prefix: 'd/doc', ext: '.md' }] }), async ({ page }) => {
      await openMock(page);
      const info = await setInfo(page);
      assert.equal(info.docs.length, 5000);
      assert.ok((await toasts(page)).some((x) => x.includes('文書が 5000 件を超えたため')));
      assert.equal(await heading(page), '多数の文書');
    });
  });

  test('scanning stops at 50,000 entries; it is cut off and a notice is shown', async () => {
    await withPage(browser, mockOptions({ name: 'huge', files: { 'README.md': '# 巨大なフォルダ\n' }, generate: [{ count: 50010, prefix: 'bin/f', ext: '.dat' }] }), async ({ page }) => {
      await openMock(page);
      const count = await page.evaluate(() => window.MDV.app.state.set.entries.size);
      assert.ok(count <= 50000, `entries kept: ${count}`);
      assert.ok(count >= 49990);
      assert.ok((await toasts(page)).some((x) => x.includes('ファイルとフォルダが 50000 件を超えたため')));
    });
  });

  test('documents over 10MB are not converted and are shown as text', async () => {
    await withPage(browser, mockOptions({ name: 'big', files: { 'README.md': '# 小さい文書\n\n[big](big.md)\n' }, big: { path: 'big.md', title: '巨大', bytes: 10 * 1024 * 1024 + 100 } }), async ({ page }) => {
      await openMock(page);
      await page.evaluate(() => { location.hash = '#/big.md'; });
      await page.waitForSelector('pre.mdv-plain', { timeout: 60000 });
      assert.equal(await page.textContent('.mdv-notice'), 'この文書は 10MB を超えるため、変換せずにテキストとして表示しています。');
      assert.ok((await page.evaluate(() => document.querySelector('pre.mdv-plain').textContent.slice(0, 12))).startsWith('# 巨大'));
      assert.equal(await page.locator('.mdv-prose h1').count(), 0, 'not converted as Markdown');
      assert.equal(await page.title(), 'big - big');
      // The note disappears when returning to a normal document
      await goTo(page, '#/README.md', '小さい文書');
      assert.ok(await page.isHidden('.mdv-notice'));
    });
  });
});

describe('Unreadable files (FR-901)', () => {
  test('a document that fails to load shows a message (the screen keeps working)', async () => {
    const files = { 'README.md': '# ホーム\n\n[壊れた文書](broken.md)\n', 'broken.md': '# 読めない\n' };
    await withPage(browser, mockOptions({ name: 'x', files }), async ({ page }) => {
      await page.evaluate(() => { window.__mockFs.fail['broken.md'] = true; });
      await openMock(page);
      await page.click('.mdv-prose a:has-text("壊れた文書")');
      await page.waitForSelector('.mdv-empty');
      assert.ok((await page.textContent('.mdv-empty')).includes('「broken.md」を読み込めませんでした'));
      await page.click('.mdv-empty a:has-text("ホームへ移動")');
      await waitHeading(page, 'ホーム');
    });
  });

  test('if a file disappears after opening via <input>, a notice is shown and the app keeps working', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 一時フォルダ\n\n[消える文書](gone.md)\n', 'gone.md': '# 消える文書\n' });
    await withPage(browser, async ({ page }) => {
      await page.locator('.mdv-input-dir').setInputFiles(dir);
      await waitHeading(page, '一時フォルダ');
      await waitIndexed(page);
      // Contents were read when building the index, so it can still be displayed after it disappears
      fs.rmSync(path.join(dir, 'gone.md'));
      await page.click('.mdv-prose a:has-text("消える文書")');
      await waitHeading(page, '消える文書');
    });
  });
});
