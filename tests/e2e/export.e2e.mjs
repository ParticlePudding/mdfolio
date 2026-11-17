// Site export (FR-601 to FR-604) and site mode (FR-104)
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
// Attachments are ordered by first reference (per document: links, then images)
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

/** Reuse one exported site across tests (the export is done only once). */
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

describe('Export dialog (FR-601)', () => {
  test('title and home document can be set; document count, attachment count and approximate size are shown', async () => {
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

  test('exporting saves a single HTML file and reports completion', async () => {
    const e = await exportedSite();
    assert.equal(e.name, 'テスト サイト_1.html', 'characters not allowed in file names are replaced');
    assert.deepEqual(e.toasts, ['書き出しました: テスト サイト_1.html']);
    assert.ok(fs.statSync(e.file).size > 4 * 1024 * 1024);
  });
});

describe('Contents of the exported HTML (FR-601, FR-602, spec 5.5, 8.2)', () => {
  test('same CSP and scripts as the viewer; only the config and site data differ', async () => {
    const e = await exportedSite();
    const out = readSite(e.file);
    const base = viewerParts();
    assert.equal(out.parts.csp, base.csp);
    assert.deepEqual(out.ids, base.blocks.map((b) => b.id), 'libraries are kept because math and diagrams are used');
    for (const b of base.blocks) {
      if (b.id === 'mdv-config' || b.id === 'mdv-site') continue;
      assert.equal(core.findBlock(out.parts, b.id).text, b.text, `${b.id} is identical to the viewer`);
    }
    assert.equal(out.parts.css, base.css);
    assert.equal(out.parts.title, 'テスト サイト/1');
    assert.equal(out.parts.lang, 'ja');
    assert.deepEqual(out.config, { title: 'テスト サイト/1', lang: 'auto', theme: 'auto', home: 'README.md', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.ok(!out.html.includes('\r'));
    assert.equal(core.composeHtml(out.parts), out.html, 'splitting and reassembling gives the same result');
  });

  test('embeds all documents and only the attachments that are referenced', async () => {
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
    // Documents are stored as decoded text (Shift_JIS and UTF-16 alike)
    assert.equal(byPath['README.md'].text, fs.readFileSync(path.join(fixture('site'), 'README.md'), 'utf8'));
    assert.ok(byPath['sjis.md'].text.startsWith('# シフトJISの文書'));
    assert.ok(byPath['utf16.md'].text.startsWith('# UTF-16 の文書'));
    assert.ok(byPath['bom.md'].text.startsWith('# BOM 付き UTF-8'));
    // Attachments are stored byte for byte
    for (const p of SITE_ASSETS) {
      const original = fs.readFileSync(path.join(fixture('site'), p));
      assert.ok(Buffer.from(byPath[p].base64, 'base64').equals(original), `contents of ${p} match`);
      assert.equal(byPath[p].mime, core.mimeOf(p));
    }
    assert.equal(byPath['notes.txt'], undefined, 'unreferenced files are not included');
    assert.ok(!site.files.some((f) => /^\.|\/\.|node_modules/.test(f.path)));
  });
});

describe('Site mode (FR-104, scenario S3)', () => {
  test('documents are shown just by opening it, with no interaction, network requests or errors', async () => {
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

  test('the menu has no Open, Reload or Export items, and drops are not accepted', async () => {
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

  test('links, search, back navigation and attachment downloads work', async () => {
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

  test('opening a URL with a hash directly shows that document and position (FR-304)', async () => {
    const e = await exportedSite();
    const route = core.buildRoute('guide/intro.md', '末尾');
    await withPage(browser, { url: e.url, hash: route }, async ({ page }) => {
      await waitHeading(page, 'イントロダクション');
      assert.equal(await hash(page), route);
      // It is the last heading in the document, so it cannot reach the top of the screen; check that it is in view
      const inView = () => { const r = document.getElementById('user-content-末尾').getBoundingClientRect(); return window.scrollY > 300 && r.top >= 52 && r.bottom <= window.innerHeight; };
      await page.waitForFunction(inView);
      // Same place after a reload
      await page.reload();
      await waitHeading(page, 'イントロダクション');
      assert.equal(await hash(page), route);
      await page.waitForFunction(inView);
    });
  });

  test('math, diagrams and license text are included too (FR-802)', async () => {
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

  test('the site setting (home document) is applied', async () => {
    let out;
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      out = await exportSite(page, { title: '', home: 'guide/intro.md' });
    });
    assert.equal(out.name, 'site.html', 'uses the folder name when the title is empty');
    assert.equal(readSite(out.file).config.home, 'guide/intro.md');
    await withPage(browser, { url: pathToFileURL(out.file).href }, async ({ page }) => {
      await waitHeading(page, 'イントロダクション');
      await page.click('.mdv-title');
      await page.waitForFunction(() => location.hash === '#/');
      assert.equal(await heading(page), 'イントロダクション');
    });
  });
});

describe('Leaving out unused libraries (FR-603)', () => {
  test('leaves out KaTeX and Mermaid when neither math nor diagrams are used', async () => {
    let out;
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('plain'));
      out = await exportSite(page);
      assert.match(out.summary, /^文書 3 件、添付 3 件。ファイルサイズは約 \d+ KB です。$/);
    });
    const site = readSite(out.file);
    assert.deepEqual(site.ids, ['mdv-config', 'mdv-site', 'mdv-res-help-ja', 'mdv-res-help-en', 'mdv-res-licenses', 'mdv-js-vendor', 'mdv-js-app']);
    assert.ok(fs.statSync(out.file).size < 1024 * 1024, 'under 1 MB');
    assert.equal((site.parts.csp.match(/'sha256-/g) || []).length, 2, 'hashes of removed libraries are also removed from the CSP');
    assert.deepEqual(site.site.files.map((f) => f.path), ['README.md', 'b.md', 'c.md', 'files/data.txt', 'img/p.png', 'img/q.png']);
    assert.ok(core.findBlock(site.parts, 'mdv-res-licenses').text.includes('katex'), 'license text is kept');
    await withPage(browser, { url: pathToFileURL(out.file).href }, async ({ page }) => {
      await waitHeading(page, '数式も図もないサイト');
      assert.ok((await page.textContent('.mdv-prose')).includes('価格は $5 と $10 です。'));
      await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.naturalWidth === 64; });
      await goTo(page, '#/b.md', '文書 B');
      await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.naturalWidth === 48; });
      assert.equal(await page.textContent('.mdv-prose pre code'), 'mermaid.render();\n', 'the word mermaid inside code is not treated as a diagram');
      assert.equal(await page.locator('.mdv-mermaid, .mdv-mermaid-error, .katex').count(), 0);
      assert.equal(await page.evaluate(() => typeof window.mermaid + ' ' + typeof window.katex), 'undefined undefined');
    });
  });

  test('keeps only KaTeX when only math is used', async () => {
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

  test('keeps only Mermaid when only diagrams are used', async () => {
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

  test('in HTML without the libraries, shows the source of math and diagrams (FR-205, FR-206)', async () => {
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

describe('Handling of attachments and documents (FR-602)', () => {
  test('attachments over 20 MB are not embedded, and their count is reported', async () => {
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

  test('unreadable documents are left out and their count is reported; warns when the total is large', async () => {
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

  test('documents containing </script> or <!-- are embedded safely', async () => {
    const nasty = '# 埋め込みの確認\n\n本文に </script><script>window.__xss = 1</script> と <!-- コメント開始、' + String.fromCharCode(0x2028) + ' 行区切り、"引用符" と \\ バックスラッシュ。\n\n```html\n</script><script>window.__xss = 2</script>\n```\n';
    const dir = writeTree(tmpDir(), { 'README.md': nasty });
    let out;
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      out = await exportSite(page);
    });
    const site = readSite(out.file);
    assert.equal(site.site.files[0].text, nasty, 'not a single character of the content changes');
    assert.equal((site.html.match(/<\/script>/g) || []).length, site.ids.length, 'the only </script> occurrences are the closing tags of each block');
    await withPage(browser, { url: pathToFileURL(out.file).href }, async ({ page }) => {
      await waitHeading(page, '埋め込みの確認');
      assert.equal(await page.evaluate(() => typeof window.__xss), 'undefined');
      assert.ok((await page.textContent('.mdv-prose pre')).includes('</script><script>window.__xss = 2</script>'));
    });
  });
});

describe('Command-line version (FR-604)', () => {
  test('generates HTML with the same content as the in-app export', async () => {
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
    assert.deepEqual(cli.site.files.map(strip), app.site.files.map(strip), 'documents and attachments match in content and order');
    for (let i = 0; i < cli.site.files.length; i++) {
      assert.ok(Math.abs(cli.site.files[i].mtime - app.site.files[i].mtime) <= 1, 'modification times match too');
    }
    for (const id of app.ids) {
      if (id === 'mdv-site') continue;
      assert.equal(core.findBlock(cli.parts, id).text, core.findBlock(app.parts, id).text, `${id} matches`);
    }
    await withPage(browser, { url: pathToFileURL(cliFile).href, hash: '#/guide/Setup.md' }, async ({ page }) => {
      await waitHeading(page, 'セットアップ');
      assert.equal(await page.evaluate(() => window.MDV.app.state.mode), 'site');
    });
  });

  test('options (--home, --lang, --theme, --allow-external-images) and leaving out unused libraries', async () => {
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

  test('invalid arguments exit with an error', () => {
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
    assert.equal(fs.existsSync(out), false, 'no file is created on failure');
  });
});
