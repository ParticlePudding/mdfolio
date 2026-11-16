// サイト書き出し（FR-601〜FR-604）とサイトモード（FR-104）
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  launchBrowser, withPage, loadFolder, fixture, hash, heading, waitHeading, waitIndexed, goTo, toasts,
  clickMenu, openMenu, tmpDir, writeTree, captureDownload, mockOptions, openMock, VIEWER, ROOT
} from '../helpers/e2e.mjs';
import { core } from '../helpers/load.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const SITE_DOCS = [
  'README.md', 'bom.md', 'sjis.md', 'syntax.md', 'utf16.md', 'xss.md',
  'guide/index.md', 'guide/intro.md', 'guide/Setup.md', 'guide/sub/deep.md',
  '日本語 フォルダ/仕様書 v1.0.md'
];
// 添付は「最初に参照された順」（文書ごとにリンク → 画像）に並ぶ
const SITE_ASSETS = ['assets/data.csv', 'assets/evil.html', 'assets/pixel.png', 'assets/diagram.svg'];

async function openExportDialog(page) {
  await clickMenu(page, 'menuExport');
  await page.waitForSelector('dialog.mdv-dialog-export[open]');
  await page.waitForFunction(() => !document.querySelector('.mdv-export-summary').textContent.includes('確認しています'));
}

async function exportSite(page, opts = {}) {
  await openExportDialog(page);
  await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
  if (opts.title !== undefined) await page.fill('.mdv-export-title', opts.title);
  if (opts.home) await page.selectOption('.mdv-export-home', opts.home);
  const summary = await page.textContent('.mdv-export-summary');
  const warn = (await page.isVisible('.mdv-export-warn')) ? await page.textContent('.mdv-export-warn') : '';
  const dl = await captureDownload(page, () => page.click('.mdv-export-run'), opts.dir);
  await page.waitForSelector('dialog.mdv-dialog-export', { state: 'detached' });
  return { ...dl, summary, warn };
}

function readSite(file) {
  const html = fs.readFileSync(file, 'utf8');
  const parts = core.extractParts(html);
  return {
    html,
    parts,
    ids: parts.blocks.map((b) => b.id),
    config: JSON.parse(core.findBlock(parts, 'mdv-config').text),
    site: JSON.parse(core.findBlock(parts, 'mdv-site').text)
  };
}

const viewerParts = () => core.extractParts(fs.readFileSync(VIEWER, 'utf8'));

/** 書き出したフォルダ一式を使い回す（書き出しは 1 回だけ行う）。 */
let exported = null;
async function exportedSite() {
  if (exported) return exported;
  await withPage(browser, async ({ page }) => {
    await loadFolder(page, fixture('site'));
    exported = await exportSite(page, { title: 'テスト サイト/1' });
    exported.toasts = await toasts(page);
  });
  exported.url = pathToFileURL(exported.file).href;
  return exported;
}

describe('書き出しダイアログ（FR-601）', () => {
  test('タイトル・ホーム文書を指定でき、文書数・添付数・概算サイズを確認できる', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await openExportDialog(page);
      assert.equal(await page.inputValue('.mdv-export-title'), 'site');
      const options = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-export-home option')).map((o) => [o.value, o.selected]));
      assert.deepEqual(options.map((o) => o[0]), SITE_DOCS);
      assert.deepEqual(options.filter((o) => o[1]).map((o) => o[0]), ['README.md']);
      assert.match(await page.textContent('.mdv-export-summary'), /^文書 11 件、添付 4 件。ファイルサイズは約 4\.\d MB です。$/);
      assert.ok(await page.isHidden('.mdv-export-warn'));
      assert.equal(await page.textContent('.mdv-dialog-export .mdv-dialog-title'), 'サイトとして書き出す');
      await page.click('.mdv-export-cancel');
      await page.waitForSelector('dialog.mdv-dialog-export', { state: 'detached' });
      assert.equal(await heading(page), 'テスト用サイト');
    });
  });

  test('書き出すと HTML が 1 つ保存され、完了を通知する', async () => {
    const e = await exportedSite();
    assert.equal(e.name, 'テスト サイト_1.html', 'ファイル名に使えない文字は置き換える');
    assert.deepEqual(e.toasts, ['書き出しました: テスト サイト_1.html']);
    assert.ok(fs.statSync(e.file).size > 4 * 1024 * 1024);
  });
});

describe('書き出した HTML の中身（FR-601, FR-602, 仕様 5.5, 8.2）', () => {
  test('ビューアと同じ CSP・同じスクリプトで、設定とサイトデータだけが異なる', async () => {
    const e = await exportedSite();
    const out = readSite(e.file);
    const base = viewerParts();
    assert.equal(out.parts.csp, base.csp);
    assert.deepEqual(out.ids, base.blocks.map((b) => b.id), '数式・図を使っているのでライブラリは残す');
    for (const b of base.blocks) {
      if (b.id === 'mdv-config' || b.id === 'mdv-site') continue;
      assert.equal(core.findBlock(out.parts, b.id).text, b.text, `${b.id} はビューアと同一`);
    }
    assert.equal(out.parts.css, base.css);
    assert.equal(out.parts.title, 'テスト サイト/1');
    assert.equal(out.parts.lang, 'ja');
    assert.deepEqual(out.config, { title: 'テスト サイト/1', lang: 'auto', theme: 'auto', home: 'README.md', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.ok(!out.html.includes('\r'));
    assert.equal(core.composeHtml(out.parts), out.html, '分解 → 再組み立てで一致する');
  });

  test('すべての文書と、参照されている添付だけを埋め込む', async () => {
    const e = await exportedSite();
    const { site } = readSite(e.file);
    assert.deepEqual(core.validateSiteData(site), { ok: true });
    assert.equal(site.format, 1);
    assert.equal(site.name, 'site');
    assert.equal(site.generator, 'mdfolio ' + core.VERSION);
    assert.match(site.created, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(site.files.filter((f) => f.kind === 'doc').map((f) => f.path), SITE_DOCS);
    assert.deepEqual(site.files.filter((f) => f.kind === 'asset').map((f) => f.path), SITE_ASSETS);
    const byPath = Object.fromEntries(site.files.map((f) => [f.path, f]));
    // 文書は判定後の文字列として入る（Shift_JIS も UTF-16 も同じ扱い）
    assert.equal(byPath['README.md'].text, fs.readFileSync(path.join(fixture('site'), 'README.md'), 'utf8'));
    assert.ok(byPath['sjis.md'].text.startsWith('# シフトJISの文書'));
    assert.ok(byPath['utf16.md'].text.startsWith('# UTF-16 の文書'));
    assert.ok(byPath['bom.md'].text.startsWith('# BOM 付き UTF-8'));
    // 添付はバイト列がそのまま入る
    for (const p of SITE_ASSETS) {
      const original = fs.readFileSync(path.join(fixture('site'), p));
      assert.ok(Buffer.from(byPath[p].base64, 'base64').equals(original), `${p} の内容が一致する`);
      assert.equal(byPath[p].mime, core.mimeOf(p));
    }
    assert.equal(byPath['notes.txt'], undefined, '参照されていないファイルは入らない');
    assert.ok(!site.files.some((f) => /^\.|\/\.|node_modules/.test(f.path)));
  });
});

describe('サイトモード（FR-104, シナリオ S3）', () => {
  test('開くだけで文書が表示される。操作・通信・エラーなし', async () => {
    const e = await exportedSite();
    await withPage(browser, { url: e.url }, async ({ page }) => {
      await waitHeading(page, 'テスト用サイト');
      assert.equal(await page.evaluate(() => window.MDV.app.state.mode), 'site');
      assert.equal(await page.title(), 'テスト用サイト - テスト サイト/1');
      assert.equal(await page.textContent('.mdv-title'), 'テスト サイト/1');
      assert.ok(await page.isHidden('.mdv-welcome'));
      assert.equal(await hash(page), '');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.mdv-prose img')).length === 3 && Array.from(document.querySelectorAll('.mdv-prose img')).every((i) => i.complete && i.naturalWidth > 0));
      assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-prose img')).map((i) => i.naturalWidth)), [64, 120, 64]);
      assert.ok((await page.textContent('.mdv-prose')).includes('外部の画像は表示していません'));
    });
  });

  test('メニューに「開く」「再読み込み」「書き出し」を出さない。ドロップも受け付けない', async () => {
    const e = await exportedSite();
    await withPage(browser, { url: e.url }, async ({ page }) => {
      await waitHeading(page, 'テスト用サイト');
      await openMenu(page);
      const visible = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-menu-item')).filter((b) => !b.hidden).map((b) => b.getAttribute('data-action')));
      assert.deepEqual(visible, ['menuExternalImages', 'menuLanguage', 'menuHelp', 'menuAbout']);
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        const dt = new DataTransfer();
        dt.items.add(new File(['# 別の文書\n'], 'other.md', { type: 'text/markdown' }));
        window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
        window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(300);
      assert.equal(await heading(page), 'テスト用サイト');
      assert.equal(await page.evaluate(() => window.MDV.app.state.set.docs.length), 11);
      assert.ok(await page.isHidden('.mdv-dropveil'));
    });
  });

  test('リンク・検索・戻る・添付のダウンロードが使える', async () => {
    const e = await exportedSite();
    await withPage(browser, { url: e.url }, async ({ page }) => {
      await waitHeading(page, 'テスト用サイト');
      await page.click('.mdv-prose a:has-text("イントロ")');
      await waitHeading(page, 'イントロダクション');
      await waitIndexed(page);
      await page.fill('.mdv-search-input', 'イプシロン');
      await page.waitForSelector('.mdv-search-item');
      await page.click('.mdv-search-item');
      await waitHeading(page, 'シフトJISの文書');
      await page.goBack();
      await waitHeading(page, 'イントロダクション');
      await goTo(page, '#/README.md', 'テスト用サイト');
      const csv = await captureDownload(page, () => page.click('.mdv-prose a:has-text("添付 CSV")'));
      assert.equal(csv.name, 'data.csv');
      assert.ok(fs.readFileSync(csv.file).equals(fs.readFileSync(path.join(fixture('site'), 'assets/data.csv'))));
      await goTo(page, '#/assets/pixel.png');
      await page.waitForSelector('.mdv-download');
      const png = await captureDownload(page, () => page.click('.mdv-download'));
      assert.ok(fs.readFileSync(png.file).equals(fs.readFileSync(path.join(fixture('site'), 'assets/pixel.png'))));
    });
  });

  test('ハッシュ付きの URL を直接開くと、その文書・位置が表示される（FR-304）', async () => {
    const e = await exportedSite();
    const route = core.buildRoute('guide/intro.md', '末尾');
    await withPage(browser, { url: e.url, hash: route }, async ({ page }) => {
      await waitHeading(page, 'イントロダクション');
      assert.equal(await hash(page), route);
      // 文書の最後の見出しなので画面の上端までは届かない。画面内に入っていることを確かめる
      const inView = () => { const r = document.getElementById('user-content-末尾').getBoundingClientRect(); return window.scrollY > 300 && r.top >= 52 && r.bottom <= window.innerHeight; };
      await page.waitForFunction(inView);
      // 再読み込みしても同じ場所
      await page.reload();
      await waitHeading(page, 'イントロダクション');
      assert.equal(await hash(page), route);
      await page.waitForFunction(inView);
    });
  });

  test('数式・図・ライセンス表記も含まれている（FR-802）', async () => {
    const e = await exportedSite();
    await withPage(browser, { url: e.url, hash: '#/syntax.md' }, async ({ page }) => {
      await waitHeading(page, '記法');
      await page.waitForSelector('.mdv-mermaid svg');
      assert.ok((await page.locator('.katex').count()) >= 2);
      await clickMenu(page, 'menuAbout');
      await page.waitForSelector('dialog.mdv-dialog-about[open]');
      const text = await page.textContent('.mdv-licenses');
      assert.ok(text.includes('MIT License') && text.includes('@mermaid-js/tiny') && text.includes('SIL OPEN FONT LICENSE'));
    });
  });

  test('サイトの設定（ホーム文書）が反映される', async () => {
    let out;
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      out = await exportSite(page, { title: '', home: 'guide/intro.md' });
    });
    assert.equal(out.name, 'site.html', 'タイトルが空ならフォルダ名を使う');
    assert.equal(readSite(out.file).config.home, 'guide/intro.md');
    await withPage(browser, { url: pathToFileURL(out.file).href }, async ({ page }) => {
      await waitHeading(page, 'イントロダクション');
      await page.click('.mdv-title');
      await page.waitForFunction(() => location.hash === '#/');
      assert.equal(await heading(page), 'イントロダクション');
    });
  });
});

describe('未使用ライブラリの除外（FR-603）', () => {
  test('数式も図も使っていなければ、KaTeX と Mermaid を省く', async () => {
    let out;
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('plain'));
      out = await exportSite(page);
      assert.match(out.summary, /^文書 3 件、添付 3 件。ファイルサイズは約 \d+ KB です。$/);
    });
    const site = readSite(out.file);
    assert.deepEqual(site.ids, ['mdv-config', 'mdv-site', 'mdv-res-help-ja', 'mdv-res-help-en', 'mdv-res-licenses', 'mdv-js-vendor', 'mdv-js-app']);
    assert.ok(fs.statSync(out.file).size < 1024 * 1024, '1MB 未満になる');
    assert.equal((site.parts.csp.match(/'sha256-/g) || []).length, 2, '外したライブラリのハッシュは CSP からも外す');
    assert.deepEqual(site.site.files.map((f) => f.path), ['README.md', 'b.md', 'c.md', 'files/data.txt', 'img/p.png', 'img/q.png']);
    assert.ok(core.findBlock(site.parts, 'mdv-res-licenses').text.includes('katex'), 'ライセンス表記は残す');
    await withPage(browser, { url: pathToFileURL(out.file).href }, async ({ page }) => {
      await waitHeading(page, '数式も図もないサイト');
      assert.ok((await page.textContent('.mdv-prose')).includes('価格は $5 と $10 です。'));
      await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.naturalWidth === 64; });
      await goTo(page, '#/b.md', '文書 B');
      await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.naturalWidth === 48; });
      assert.equal(await page.textContent('.mdv-prose pre code'), 'mermaid.render();\n', 'コードの中の mermaid という語は図として扱わない');
      assert.equal(await page.locator('.mdv-mermaid, .mdv-mermaid-error, .katex').count(), 0);
      assert.equal(await page.evaluate(() => typeof window.mermaid + ' ' + typeof window.katex), 'undefined undefined');
    });
  });

  test('数式だけを使っていれば KaTeX だけを残す', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 数式だけ\n\n$a^2$\n' });
    let out;
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      out = await exportSite(page);
    });
    const site = readSite(out.file);
    const ids = site.ids;
    assert.ok(ids.includes('mdv-lib-katex') && ids.includes('mdv-res-katex-css'));
    assert.ok(!ids.includes('mdv-lib-mermaid'));
    assert.equal((site.parts.csp.match(/'sha256-/g) || []).length, 3);
    await withPage(browser, { url: pathToFileURL(out.file).href }, async ({ page }) => {
      await waitHeading(page, '数式だけ');
      await page.waitForSelector('.katex');
    });
  });

  test('図だけを使っていれば Mermaid だけを残す', async () => {
    const dir = writeTree(tmpDir(), { 'README.md': '# 図だけ\n\n```mermaid\nflowchart LR\n  A --> B\n```\n' });
    let out;
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await page.waitForSelector('.mdv-mermaid svg');
      out = await exportSite(page);
    });
    const site = readSite(out.file);
    assert.ok(site.ids.includes('mdv-lib-mermaid'));
    assert.ok(!site.ids.includes('mdv-lib-katex') && !site.ids.includes('mdv-res-katex-css'));
    assert.equal((site.parts.csp.match(/'sha256-/g) || []).length, 3);
    await withPage(browser, { url: pathToFileURL(out.file).href }, async ({ page }) => {
      await waitHeading(page, '図だけ');
      await page.waitForSelector('.mdv-mermaid svg');
    });
  });

  test('ライブラリが含まれない HTML では、数式・図の原文を表示する（FR-205, FR-206）', async () => {
    const lite = path.join(tmpDir(), 'lite.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--out', lite, '--without', 'mermaid,katex'], { cwd: ROOT });
    const csp = core.extractParts(fs.readFileSync(lite, 'utf8')).csp;
    assert.equal((csp.match(/'sha256-/g) || []).length, 2);
    await withPage(browser, { url: pathToFileURL(lite).href }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/syntax.md', '記法');
      const r = await page.evaluate(() => ({
        katex: document.querySelectorAll('.katex').length,
        raw: Array.from(document.querySelectorAll('.mdv-math-raw')).map((e) => [e.textContent.trim(), e.getAttribute('title')]),
        mermaid: Array.from(document.querySelectorAll('pre.mermaid-src')).map((e) => [e.textContent.trim().split('\n')[0], e.getAttribute('title')]),
        svgs: document.querySelectorAll('.mdv-mermaid svg').length
      }));
      assert.equal(r.katex, 0);
      assert.equal(r.raw.length, 3);
      assert.deepEqual(r.raw[0], ['a^2 + b^2 = c^2', '数式を表示できません（この HTML には数式ライブラリが含まれていません）']);
      assert.equal(r.svgs, 0);
      assert.deepEqual(r.mermaid[0], ['flowchart LR', '図を表示できません（この HTML には図のライブラリが含まれていません）']);
    });
  });
});

describe('添付と文書の扱い（FR-602）', () => {
  test('20MB を超える添付は埋め込まず、件数を通知する', async () => {
    const spec = {
      name: 'assets',
      files: { 'README.md': '# 添付の確認\n\n[大きい](big.bin) [小さい](small.txt) ![画像なし](none.png)\n', 'small.txt': 'small' },
      bigAsset: { path: 'big.bin', bytes: 20 * 1024 * 1024 + 1 }
    };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await openMock(page);
      const out = await exportSite(page);
      assert.match(out.summary, /^文書 1 件、添付 1 件。/);
      assert.equal(out.warn, '20MB を超える、または読み込めない添付 1 件は含めません。');
      assert.deepEqual(readSite(out.file).site.files.map((f) => f.path), ['README.md', 'small.txt']);
    });
  });

  test('読み込めない文書は含めず、件数を通知する。合計が大きい場合は警告する', async () => {
    const spec = { name: 'partial', files: { 'README.md': '# 一部が読めない\n', 'ok.md': '# OK\n', 'ng.md': '# NG\n' } };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      await page.evaluate(() => { window.__mockFs.fail['ng.md'] = true; });
      await openMock(page);
      await waitIndexed(page);
      await page.evaluate(() => { window.MDV.core.LIMITS.warnTotalBytes = 1000; });
      const out = await exportSite(page);
      assert.match(out.summary, /^文書 2 件、添付 0 件。/);
      assert.ok(out.warn.includes('読み込めなかった文書 1 件は含めません。'));
      assert.ok(out.warn.includes('ファイルサイズが 100MB を超えます。開くのに時間がかかることがあります。'));
      assert.deepEqual(readSite(out.file).site.files.map((f) => f.path), ['README.md', 'ok.md']);
    });
  });

  test('文書に </script> や <!-- が含まれていても、安全に埋め込まれる', async () => {
    const nasty = '# 埋め込みの確認\n\n本文に </script><script>window.__xss = 1</script> と <!-- コメント開始、' + String.fromCharCode(0x2028) + ' 行区切り、"引用符" と \\ バックスラッシュ。\n\n```html\n</script><script>window.__xss = 2</script>\n```\n';
    const dir = writeTree(tmpDir(), { 'README.md': nasty });
    let out;
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      out = await exportSite(page);
    });
    const site = readSite(out.file);
    assert.equal(site.site.files[0].text, nasty, '内容が 1 文字も変わらない');
    assert.equal((site.html.match(/<\/script>/g) || []).length, site.ids.length, '</script> は各ブロックの閉じタグだけ');
    await withPage(browser, { url: pathToFileURL(out.file).href }, async ({ page }) => {
      await waitHeading(page, '埋め込みの確認');
      assert.equal(await page.evaluate(() => typeof window.__xss), 'undefined');
      assert.ok((await page.textContent('.mdv-prose pre')).includes('</script><script>window.__xss = 2</script>'));
    });
  });
});

describe('コマンドライン版（FR-604）', () => {
  test('アプリ内の書き出しと同じ内容の HTML を生成する', async () => {
    const e = await exportedSite();
    const cliFile = path.join(tmpDir(), 'cli-site.html');
    const stdout = execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), fixture('site'), '--title', 'テスト サイト/1', '--out', cliFile], { cwd: ROOT, encoding: 'utf8' });
    assert.ok(stdout.includes('文書 11 件、添付 4 件'));
    const app = readSite(e.file);
    const cli = readSite(cliFile);
    assert.deepEqual(cli.ids, app.ids);
    assert.deepEqual(cli.config, app.config);
    assert.equal(cli.parts.csp, app.parts.csp);
    assert.equal(cli.parts.title, app.parts.title);
    const strip = (f) => ({ ...f, mtime: 0 });
    assert.deepEqual(cli.site.files.map(strip), app.site.files.map(strip), '文書と添付の内容・順序が一致する');
    for (let i = 0; i < cli.site.files.length; i++) {
      assert.ok(Math.abs(cli.site.files[i].mtime - app.site.files[i].mtime) <= 1, '更新日時も一致する');
    }
    for (const id of app.ids) {
      if (id === 'mdv-site') continue;
      assert.equal(core.findBlock(cli.parts, id).text, core.findBlock(app.parts, id).text, `${id} が一致する`);
    }
    await withPage(browser, { url: pathToFileURL(cliFile).href, hash: '#/guide/Setup.md' }, async ({ page }) => {
      await waitHeading(page, 'セットアップ');
      assert.equal(await page.evaluate(() => window.MDV.app.state.mode), 'site');
    });
  });

  test('オプション（--home, --lang, --theme, --allow-external-images）と、未使用ライブラリの除外', async () => {
    const out = path.join(tmpDir(), 'plain.html');
    const stdout = execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), fixture('plain'), '--out', out, '--home', 'b', '--lang', 'en', '--theme', 'dark', '--allow-external-images'], { cwd: ROOT, encoding: 'utf8' });
    assert.ok(stdout.includes('数式ライブラリ: 除外、図のライブラリ: 除外'));
    const site = readSite(out);
    assert.deepEqual(site.config, { title: 'plain', lang: 'en', theme: 'dark', home: 'b.md', allowExternalImages: true, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.ok(!site.ids.includes('mdv-lib-katex') && !site.ids.includes('mdv-lib-mermaid'));
    assert.deepEqual(site.site.files.map((f) => f.path), ['README.md', 'b.md', 'c.md', 'files/data.txt', 'img/p.png', 'img/q.png']);
    await withPage(browser, { url: pathToFileURL(out).href }, async ({ page }) => {
      await waitHeading(page, '文書 B');
      assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
      assert.equal(await page.getAttribute('html', 'lang'), 'en');
    });
  });

  test('誤った指定はエラーで終了する', () => {
    const run = (args) => {
      try {
        execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
        return { code: 0, stderr: '' };
      } catch (err) {
        return { code: err.status, stderr: String(err.stderr) };
      }
    };
    const out = path.join(tmpDir(), 'x.html');
    assert.deepEqual([run([]).code, run([fixture('nodocs'), '--out', out]).code, run(['/no/such/dir']).code], [1, 1, 1]);
    assert.ok(run([fixture('nodocs'), '--out', out]).stderr.includes('Markdown 文書が見つかりませんでした'));
    assert.ok(run([fixture('site'), '--out', out, '--home', 'nothing.md']).stderr.includes('--home の文書が見つかりません'));
    assert.ok(run([fixture('site'), '--out', out, '--lang', 'fr']).stderr.includes('--lang'));
    assert.ok(run([fixture('site'), '--unknown']).stderr.includes('不明なオプション'));
    assert.equal(fs.existsSync(out), false, '失敗時はファイルを作らない');
  });
});
