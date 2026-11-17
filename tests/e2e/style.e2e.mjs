// 見た目の上書き（隣の mdfolio.css と、書き出しへの埋め込み。SPEC 3.10 FR-1001〜1005、FR-1007）
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  launchBrowser, withPage, loadFolder, waitHeading, goTo, toasts, clickMenu, tmpDir, captureDownload, VIEWER, ROOT
} from '../helpers/e2e.mjs';
import { core } from '../helpers/load.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const SAMPLE = path.join(ROOT, 'sample-docs');
const USER_CSS = ':root { --accent: #8A1C14; }\n.mdv-prose h2 { color: rgb(11, 110, 128); }\n';
const ACCENT = 'rgb(138, 28, 20)';
const H2 = 'rgb(11, 110, 128)';

/** ビューアの写しを一時フォルダに置く（css を渡すと、隣に mdfolio.css も置く）。 */
function viewerIn(css, viewerHtml) {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'mdfolio.html'), viewerHtml || fs.readFileSync(VIEWER));
  if (css !== undefined) fs.writeFileSync(path.join(dir, 'mdfolio.css'), css);
  return { dir, url: pathToFileURL(path.join(dir, 'mdfolio.html')).href };
}

const looks = (page) => page.evaluate(() => ({
  h2: getComputedStyle(document.querySelector('.mdv-doc:not([hidden]) .mdv-prose h2')).color,
  link: getComputedStyle(document.querySelector('.mdv-doc:not([hidden]) .mdv-prose a')).color
}));

async function openExportDialog(page) {
  await clickMenu(page, 'menuExport');
  await page.waitForSelector('dialog.mdv-dialog-export[open]');
  await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
}

const cssState = (page) => page.evaluate(() => ({
  status: document.querySelector('.mdv-export-css-status').textContent,
  note: !document.querySelector('.mdv-export-css-note').hidden,
  clear: !document.querySelector('.mdv-export-css-clear').hidden
}));

async function pickCss(page, file) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.mdv-export-css-pick')]);
  await chooser.setFiles(file);
}

describe('隣の mdfolio.css（FR-1001）', () => {
  test('ないときは内蔵の見た目で表示し、エラーを出さない', async () => {
    const v = viewerIn();
    await withPage(browser, { url: v.url }, async ({ page, record }) => {
      await loadFolder(page, SAMPLE);
      const r = await looks(page);
      assert.notEqual(r.h2, H2);
      assert.notEqual(r.link, ACCENT);
      assert.ok(record.userCss.length >= 1 && record.userCss.length <= 2, '隣の mdfolio.css を読みに行くのは、表示用と確認用の 2 回まで');
    });
  });

  test('あれば、本文・リンク・図の色に反映する（図の色は CSS の変数から取る。FR-1007）', async () => {
    const v = viewerIn(USER_CSS);
    await withPage(browser, { url: v.url }, async ({ page }) => {
      await loadFolder(page, SAMPLE);
      assert.deepEqual(await looks(page), { h2: H2, link: ACCENT });
      await goTo(page, '#/guide/' + encodeURIComponent('Markdown記法') + '.md', 'Markdown 記法');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2);
      assert.ok(/#8A1C14|rgb\(138, ?28, ?20\)/i.test(await page.innerHTML('.mdv-mermaid')), '図の線が上書きした色');
    });
  });

  test('文書の中の <link> や <style> では、別の CSS を読み込ませられない', async () => {
    const docs = tmpDir();
    fs.writeFileSync(path.join(docs, 'README.md'), '# x\n\n## y\n\n<link rel="stylesheet" href="evil.css">\n<style>.mdv-prose h2 { color: rgb(1, 2, 3); }</style>\n');
    fs.writeFileSync(path.join(docs, 'evil.css'), '.mdv-prose h2 { color: rgb(4, 5, 6); }');
    const v = viewerIn();
    await withPage(browser, { url: v.url }, async ({ page, record }) => {
      await loadFolder(page, docs);
      const color = await page.evaluate(() => getComputedStyle(document.querySelector('.mdv-prose h2')).color);
      assert.ok(color !== 'rgb(1, 2, 3)' && color !== 'rgb(4, 5, 6)', color);
      assert.ok(!record.requests.some((u) => u.includes('evil.css')));
    });
  });
});

describe('書き出しへの埋め込み（FR-1002〜1005）', () => {
  test('file:// で隣の CSS が効いていると、書き出しに入らないことを知らせる。選ぶと埋め込み、書き出したサイトは CSS がなくてもその見た目', async () => {
    const v = viewerIn(USER_CSS);
    const pick = path.join(tmpDir(), 'look.css');
    fs.writeFileSync(pick, USER_CSS);
    await withPage(browser, { url: v.url }, async ({ page }) => {
      await loadFolder(page, SAMPLE);
      await openExportDialog(page);
      let s = await cssState(page);
      assert.deepEqual(s, { status: '埋め込む CSS: なし（内蔵の見た目で書き出します）', note: true, clear: false });
      await pickCss(page, pick);
      await page.waitForFunction(() => document.querySelector('.mdv-export-css-status').textContent.includes('look.css'));
      s = await cssState(page);
      assert.deepEqual(s, { status: '埋め込む CSS: look.css（選んだファイル）', note: false, clear: true });
      const out = tmpDir();
      const dl = await captureDownload(page, () => page.click('.mdv-export-run'), out);
      const parts = core.extractParts(fs.readFileSync(dl.file, 'utf8'));
      assert.equal(parts.userCss, USER_CSS);
      // 書き出したサイトを、隣に CSS のない場所で開く
      await page.goto(pathToFileURL(dl.file).href);
      await waitHeading(page, 'mdfolio サンプル文書');
      assert.deepEqual(await looks(page), { h2: H2, link: ACCENT });
    });
  });

  test('「埋め込まない」で取り消せる。</style を含む CSS と大きすぎる CSS は受け付けない', async () => {
    const v = viewerIn();
    const dir = tmpDir();
    const ok = path.join(dir, 'ok.css'); fs.writeFileSync(ok, 'h1 { color: red; }');
    const bad = path.join(dir, 'bad.css'); fs.writeFileSync(bad, 'h1 { } </style><script>alert(1)</script>');
    const big = path.join(dir, 'big.css'); fs.writeFileSync(big, 'h1{}'.padEnd(core.LIMITS.maxUserCssBytes + 1, ' '));
    await withPage(browser, { url: v.url }, async ({ page }) => {
      await loadFolder(page, SAMPLE);
      await openExportDialog(page);
      assert.deepEqual(await cssState(page), { status: '埋め込む CSS: なし（内蔵の見た目で書き出します）', note: false, clear: false });
      await pickCss(page, ok);
      await page.waitForFunction(() => !document.querySelector('.mdv-export-css-clear').hidden);
      await page.click('.mdv-export-css-clear');
      assert.equal((await cssState(page)).status, '埋め込む CSS: なし（内蔵の見た目で書き出します）');
      await pickCss(page, bad);
      await page.waitForFunction(() => document.querySelectorAll('.mdv-toast').length >= 1);
      await pickCss(page, big);
      await page.waitForFunction(() => document.querySelectorAll('.mdv-toast').length >= 2);
      const t = (await toasts(page)).join('\n');
      assert.ok(t.includes('bad.css には「</style」という文字列があるため、埋め込めません'), t);
      assert.ok(t.includes('big.css は大きすぎます（1MB まで）'), t);
      assert.equal((await cssState(page)).status, '埋め込む CSS: なし（内蔵の見た目で書き出します）');
      const dl = await captureDownload(page, () => page.click('.mdv-export-run'), tmpDir());
      assert.equal(core.extractParts(fs.readFileSync(dl.file, 'utf8')).userCss, '');
    });
  });

  test('今の HTML に埋め込まれた CSS は、既定で引き継ぐ（FR-1003）', async () => {
    const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
    const v = viewerIn(undefined, core.composeHtml({ ...parts, userCss: USER_CSS }));
    await withPage(browser, { url: v.url }, async ({ page }) => {
      await loadFolder(page, SAMPLE);
      assert.deepEqual(await looks(page), { h2: H2, link: ACCENT });
      await openExportDialog(page);
      assert.equal((await cssState(page)).status, '埋め込む CSS: この HTML に埋め込まれている CSS');
      const dl = await captureDownload(page, () => page.click('.mdv-export-run'), tmpDir());
      assert.equal(core.extractParts(fs.readFileSync(dl.file, 'utf8')).userCss, USER_CSS);
    });
  });

  test('http(s) で開き、隣の CSS を読めるときは、選ばなくても埋め込みの候補にする（FR-1004）', async () => {
    const files = { '/mdfolio.html': ['text/html; charset=utf-8', fs.readFileSync(VIEWER)], '/mdfolio.css': ['text/css', USER_CSS] };
    const server = http.createServer((req, res) => {
      const f = files[req.url.split('?')[0]];
      if (!f) { res.statusCode = 404; res.end(); return; }
      res.setHeader('content-type', f[0]);
      res.end(f[1]);
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    try {
      await withPage(browser, { url: `http://127.0.0.1:${server.address().port}/mdfolio.html` }, async ({ page }) => {
        await loadFolder(page, SAMPLE);
        assert.deepEqual(await looks(page), { h2: H2, link: ACCENT });
        await openExportDialog(page);
        assert.deepEqual(await cssState(page), { status: '埋め込む CSS: 隣の mdfolio.css', note: false, clear: true });
        const dl = await captureDownload(page, () => page.click('.mdv-export-run'), tmpDir());
        const css = core.extractParts(fs.readFileSync(dl.file, 'utf8')).userCss;
        assert.ok(/--accent:\s*#8A1C14/i.test(css) && /rgb\(11, 110, 128\)/.test(css), css);
      });
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});
