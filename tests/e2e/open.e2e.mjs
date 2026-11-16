// 文書の読み込み（FR-101〜FR-112, FR-902）
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

describe('フォルダを開く（FR-101, FR-105, FR-106）', () => {
  test('<input> 方式: 配下を再帰的に読み込み、ホーム文書を表示する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.equal(await heading(page), 'テスト用サイト');
      assert.equal(await hash(page), '#/README.md');
      assert.equal(await page.title(), 'テスト用サイト - site');
      assert.equal(await page.textContent('.mdv-title'), 'site', 'フォルダ名がサイトタイトルになる');
      const info = await setInfo(page);
      assert.equal(info.name, 'site');
      assert.equal(info.source, 'files');
      assert.equal(info.single, false);
      assert.deepEqual(info.docs, SITE_DOCS, 'ツリー順: ファイル（README が先頭）→ フォルダ');
      assert.equal(info.home, 'README.md');
      assert.ok(await page.isVisible('.mdv-search'));
      assert.ok(await page.isVisible('.mdv-sidebar'));
    });
  });

  test('. で始まる要素と node_modules は読み込まない。添付は一覧に持つだけで表示しない', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const info = await setInfo(page);
      for (const p of ['.hidden/secret.md', '.dotfile.md', 'node_modules/pkg/readme.md']) {
        assert.ok(!info.entries.includes(p), `${p} は読み込まれない`);
      }
      for (const p of ['assets/pixel.png', 'assets/data.csv', 'notes.txt']) {
        assert.ok(info.entries.includes(p), `${p} は添付として保持する`);
      }
      const tree = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-side-tree a')).map((a) => a.textContent));
      assert.deepEqual(tree, ['README', 'bom', 'sjis', 'syntax', 'utf16', 'xss', 'index', 'intro', 'Setup', 'deep', '仕様書 v1.0']);
      assert.ok(!tree.includes('notes'), 'Markdown 以外はツリーに出さない');
    });
  });

  test('「フォルダを開く」ボタン → ファイル選択ダイアログ（File System Access API がない場合）', async () => {
    await withPage(browser, async ({ page }) => {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.mdv-open-folder')]);
      assert.equal(chooser.isMultiple(), true);
      await chooser.setFiles(fixture('nav'));
      await waitHeading(page, 'ナビ付きサイト');
      assert.equal((await setInfo(page)).name, 'nav');
    });
  });

  test('showDirectoryPicker が拒否された場合は <input> 方式に自動で切り替える', async () => {
    await withPage(browser, mockOptions({ reject: 'SecurityError' }), async ({ page }) => {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.mdv-open-folder')]);
      assert.equal(await page.evaluate(() => window.__pickerCalls), 1);
      await chooser.setFiles(fixture('nav'));
      await waitHeading(page, 'ナビ付きサイト');
    });
  });

  test('利用者がフォルダ選択をキャンセルした場合は何もしない', async () => {
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

  test('showDirectoryPicker 方式: ハンドルから読み込み、走査の進捗を表示する', async () => {
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
      assert.deepEqual((await toasts(page)).filter((x) => x.includes('読み込んでいます')), [], '進捗の通知は終わったら消える');
    });
  });
});

describe('ファイルを開く（FR-102, FR-112）', () => {
  test('単一ファイル: 表示できるが、画像は解決できない旨を示す', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFiles(page, [path.join(fixture('single'), 'one.md')]);
      assert.equal(await heading(page), '単一ファイル');
      const info = await setInfo(page);
      assert.equal(info.single, true);
      assert.deepEqual(info.docs, ['one.md']);
      const ph = await page.textContent('.mdv-ph');
      assert.ok(ph.includes('pic.png'));
      assert.ok(ph.includes('フォルダとして開くと表示できます'));
      assert.equal(await page.locator('.mdv-prose a.mdv-missing').count(), 1, '選択していない文書へのリンクは「見つからない」扱い');
    });
  });

  test('複数ファイル: 文書間のリンクと、一緒に選んだ画像が使える', async () => {
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

describe('ドラッグ＆ドロップ（FR-103）', () => {
  test('ファイルのドロップ', async () => {
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

  // webkitGetAsEntry が返すエントリ（Firefox / Safari のドロップ）を模したもの
  const fakeEntries = () => {
    const fileEntry = (name, text) => ({ isFile: true, isDirectory: false, name, file: (ok) => ok(new File([text], name, { lastModified: 1700000000000 })) });
    const dirEntry = (name, children) => ({
      isFile: false, isDirectory: true, name,
      createReader: () => {
        let i = 0;
        // 実物と同じく、複数回に分けて返す
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

  test('フォルダを 1 つドロップ: そのフォルダがルートになる（エントリ方式）', async () => {
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

  test('複数の項目をドロップ: ルート直下に並べる', async () => {
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

  test('フォルダを 1 つドロップ（ハンドル方式、Edge / Chrome）', async () => {
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

  test('ドラッグ中の表示: 開始画面ではトンボが寄り、文書表示中はドロップ案内を重ねる', async () => {
    await withPage(browser, async ({ page }) => {
      const fire = (type) => page.evaluate((t) => {
        const ev = new Event(t, { bubbles: true, cancelable: true });
        Object.defineProperty(ev, 'dataTransfer', { value: { types: ['Files'], dropEffect: 'none' } });
        window.dispatchEvent(ev);
      }, type);
      await fire('dragenter');
      assert.ok(await page.evaluate(() => document.querySelector('.mdv-app').classList.contains('is-dragover')));
      assert.ok(await page.isHidden('.mdv-dropveil'), '開始画面では用紙そのものが反応する');
      await fire('dragleave');
      assert.ok(!(await page.evaluate(() => document.querySelector('.mdv-app').classList.contains('is-dragover'))));
      await loadFolder(page, fixture('nav'));
      await fire('dragenter');
      assert.ok(await page.isVisible('.mdv-dropveil'));
      assert.equal((await page.textContent('.mdv-dropveil')).trim(), 'ここにドロップして開く');
      await fire('dragleave');
      assert.ok(await page.isHidden('.mdv-dropveil'));
      // ファイル以外（文字列など）のドラッグには反応しない
      await page.evaluate(() => {
        const ev = new Event('dragenter', { bubbles: true, cancelable: true });
        Object.defineProperty(ev, 'dataTransfer', { value: { types: ['text/plain'] } });
        window.dispatchEvent(ev);
      });
      assert.ok(await page.isHidden('.mdv-dropveil'));
    });
  });
});

describe('置き換えと、文書がない場合（FR-111, FR-902）', () => {
  test('Markdown 文書がないフォルダ: 通知し、開始画面のまま', async () => {
    await withPage(browser, async ({ page }) => {
      await page.locator('.mdv-input-dir').setInputFiles(fixture('nodocs'));
      await page.waitForSelector('.mdv-toast-error');
      assert.deepEqual(await toasts(page), ['Markdown 文書が見つかりませんでした']);
      assert.ok(await page.isVisible('.mdv-welcome'));
      assert.equal(await setInfo(page), null);
    });
  });

  test('文書セットを開いているときに文書のないフォルダを開いても、表示を維持する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.locator('.mdv-input-dir').setInputFiles(fixture('nodocs'));
      await page.waitForSelector('.mdv-toast-error');
      assert.equal(await heading(page), 'イントロダクション');
      assert.equal((await setInfo(page)).name, 'site');
    });
  });

  test('別のフォルダを開くと確認なしで置き換わり、ホーム文書を表示する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/intro.md', 'イントロダクション');
      await page.fill('.mdv-search-input', 'ベータ');
      await page.locator('.mdv-input-dir').setInputFiles(fixture('nav'));
      await waitHeading(page, 'ナビ付きサイト');
      assert.equal(await hash(page), '#/README.md');
      assert.equal(await page.title(), 'ナビ付きサイト - nav');
      assert.equal(await page.textContent('.mdv-title'), 'nav');
      assert.equal(await page.inputValue('.mdv-search-input'), '', '検索はリセットされる');
      const info = await setInfo(page);
      assert.deepEqual(info.docs, ['README.md', '_sidebar.md', 'a.md', 'b/c.md', 'b/unlisted.md']);
    });
  });
});

describe('文字コード（FR-107）', () => {
  test('Shift_JIS・UTF-16（BOM）・BOM 付き UTF-8 を自動判定する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/sjis.md', 'シフトJISの文書');
      assert.ok((await page.textContent('.mdv-prose')).includes('日本語の本文です。固有語イプシロン。'));
      await goTo(page, '#/utf16.md', 'UTF-16 の文書');
      assert.ok((await page.textContent('.mdv-prose')).includes('固有語イータ。'));
      await goTo(page, '#/bom.md', 'BOM 付き UTF-8');
      assert.equal(await heading(page), 'BOM 付き UTF-8', 'BOM が見出しに混ざらない');
      // 検索索引も同じ判定で作られる
      await waitIndexed(page);
      await page.fill('.mdv-search-input', 'イプシロン');
      await page.waitForSelector('.mdv-search-item');
      assert.equal(await page.getAttribute('.mdv-search-item', 'href'), '#/sjis.md');
    });
  });
});

describe('上限（FR-110）', () => {
  test('文書は 5,000 件まで。超えた分は読み込まず通知する', async () => {
    await withPage(browser, mockOptions({ name: 'many', files: { 'README.md': '# 多数の文書\n' }, generate: [{ count: 5010, prefix: 'd/doc', ext: '.md' }] }), async ({ page }) => {
      await openMock(page);
      const info = await setInfo(page);
      assert.equal(info.docs.length, 5000);
      assert.ok((await toasts(page)).some((x) => x.includes('文書が 5000 件を超えたため')));
      assert.equal(await heading(page), '多数の文書');
    });
  });

  test('走査は 50,000 件まで。途中で打ち切って通知する', async () => {
    await withPage(browser, mockOptions({ name: 'huge', files: { 'README.md': '# 巨大なフォルダ\n' }, generate: [{ count: 50010, prefix: 'bin/f', ext: '.dat' }] }), async ({ page }) => {
      await openMock(page);
      const count = await page.evaluate(() => window.MDV.app.state.set.entries.size);
      assert.ok(count <= 50000, `保持している件数 ${count}`);
      assert.ok(count >= 49990);
      assert.ok((await toasts(page)).some((x) => x.includes('ファイルとフォルダが 50000 件を超えたため')));
    });
  });

  test('10MB を超える文書は変換せず、テキストとして表示する', async () => {
    await withPage(browser, mockOptions({ name: 'big', files: { 'README.md': '# 小さい文書\n\n[big](big.md)\n' }, big: { path: 'big.md', title: '巨大', bytes: 10 * 1024 * 1024 + 100 } }), async ({ page }) => {
      await openMock(page);
      await page.evaluate(() => { location.hash = '#/big.md'; });
      await page.waitForSelector('pre.mdv-plain', { timeout: 60000 });
      assert.equal(await page.textContent('.mdv-notice'), 'この文書は 10MB を超えるため、変換せずにテキストとして表示しています。');
      assert.ok((await page.evaluate(() => document.querySelector('pre.mdv-plain').textContent.slice(0, 12))).startsWith('# 巨大'));
      assert.equal(await page.locator('.mdv-prose h1').count(), 0, 'Markdown として変換していない');
      assert.equal(await page.title(), 'big - big');
      // 通常の文書に戻ると注記は消える
      await goTo(page, '#/README.md', '小さい文書');
      assert.ok(await page.isHidden('.mdv-notice'));
    });
  });
});

describe('読み込めないファイル（FR-901）', () => {
  test('読み込みに失敗した文書は、その旨を表示する（画面は止まらない）', async () => {
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

  test('<input> 方式で開いた後にファイルが消えても、通知して動作を続ける', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 一時フォルダ\n\n[消える文書](gone.md)\n', 'gone.md': '# 消える文書\n' });
    await withPage(browser, async ({ page }) => {
      await page.locator('.mdv-input-dir').setInputFiles(dir);
      await waitHeading(page, '一時フォルダ');
      await waitIndexed(page);
      // 索引の作成時に内容を読み込んでいるため、消えた後も表示はできる
      fs.rmSync(path.join(dir, 'gone.md'));
      await page.click('.mdv-prose a:has-text("消える文書")');
      await waitHeading(page, '消える文書');
    });
  });
});
