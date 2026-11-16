// フォルダ版（SPEC 8.6）: HTML・CSS・JS を分けたフォルダを file:// で開いたときの動作
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  ROOT, launchBrowser, watch, fixture, tmpDir, writeTree, loadFolder, waitHeading, waitIndexed, clickMenu, openMenu, startSink, core
} from '../helpers/e2e.mjs';

const BUILT = path.join(ROOT, 'dist/mdfolio');
let browser;

before(async () => {
  if (!fs.existsSync(path.join(BUILT, 'index.html'))) execFileSync(process.execPath, [path.join(ROOT, 'tools/build-folder.mjs')], { cwd: ROOT, stdio: 'ignore' });
  browser = await launchBrowser();
});
after(async () => { await browser.close(); });

/** dist/mdfolio を一時フォルダに写す。docs を差し替える場合は docs にファイルの一覧を渡す。 */
function copyFolder(docs) {
  const dir = path.join(tmpDir(), 'mdfolio');
  fs.cpSync(BUILT, dir, { recursive: true });
  if (docs) {
    fs.rmSync(path.join(dir, 'docs'), { recursive: true, force: true });
    if (typeof docs === 'string') fs.cpSync(docs, path.join(dir, 'docs'), { recursive: true });
    else writeTree(path.join(dir, 'docs'), docs);
  }
  return dir;
}
const update = (dir, args = []) => execFileSync(process.execPath, [path.join(dir, 'tools/update.mjs'), ...args], { cwd: dir, encoding: 'utf8' });

/** フォルダ版を開く。フォルダの中のファイル以外への通信と、エラーがないことを最後に確かめる。 */
async function withFolder(dir, options, fn) {
  if (typeof options === 'function') { fn = options; options = {}; }
  const context = await browser.newContext({ locale: options.locale || 'ja-JP', viewport: options.viewport || { width: 1440, height: 900 }, colorScheme: options.colorScheme || 'light', acceptDownloads: true });
  const page = await context.newPage();
  const record = watch(page);
  await page.addInitScript(() => { try { Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true, writable: true }); } catch (e) { /* 無視 */ } });
  const base = pathToFileURL(dir).href + '/';
  try {
    await page.goto(base + 'index.html' + (options.hash || ''));
    await page.waitForSelector('.mdv-app');
    await fn({ page, record, base });
    if (!options.allowErrors) assert.deepEqual(record.errors, [], 'コンソールエラー・CSP 違反・例外がないこと');
    const outside = record.requests.filter((u) => !u.startsWith(base));
    assert.deepEqual(outside, [], 'フォルダの外への通信がないこと');
  } finally {
    await context.close();
  }
}
const loaded = (page) => page.evaluate(() => Array.from(document.querySelectorAll('script[src], link[rel="stylesheet"]')).map((e) => e.getAttribute('src') || e.getAttribute('href')));

describe('フォルダ版を開く', () => {
  test('index.html を開くと、所定の文書（docs/）を表示する。スクリプトは lib/ と data/ のファイルだけ', async () => {
    await withFolder(BUILT, async ({ page, record, base }) => {
      await waitHeading(page, 'mdfolio サンプル文書');
      assert.deepEqual(await page.evaluate(() => [window.MDV.app.state.mode, window.MDV.app.state.current, window.MDV.app.version]), ['library', 'README.md', core.VERSION]);
      assert.equal(await page.textContent('.mdv-title'), 'mdfolio サンプル文書');
      assert.deepEqual(await loaded(page), ['style/app.css', 'style/document.css', 'lib/vendor.js', 'lib/resources.js', 'data/site.js', 'data/styles.js', 'lib/mdfolio.js']);
      // インラインのスクリプトは設定（JSON）だけ。実行されるスクリプトを足しても動かない
      assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('script:not([src])')).map((s) => s.type)), ['application/json']);
      await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__injected = 1'; document.body.appendChild(s); });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.__injected), undefined);
      record.errors.splice(0); // 上の CSP 違反は想定どおり
      // 通信はフォルダの中のファイルだけ
      assert.ok(record.requests.every((u) => u.startsWith(base)));
      assert.ok(record.requests.some((u) => u.endsWith('/data/site.js')));
    });
  });

  test('数式と図のライブラリは、必要になったときに lib/ から読み込む', async () => {
    await withFolder(BUILT, async ({ page }) => {
      await waitHeading(page, 'mdfolio サンプル文書');
      assert.deepEqual((await loaded(page)).filter((s) => /katex|mermaid/.test(s)), [], '数式も図もない文書では読み込まない');
      await page.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await waitHeading(page, 'Markdown 記法');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2, null, { timeout: 30000 });
      assert.deepEqual((await loaded(page)).filter((s) => /katex|mermaid/.test(s)).sort(), ['lib/katex.css', 'lib/katex.js', 'lib/mermaid.js']);
      // ライブラリの CSS は、アプリの CSS より前（document.css で上書きできる）
      const order = await loaded(page);
      assert.ok(order.indexOf('lib/katex.css') < order.indexOf('style/document.css'));
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.katex')).fontSize), '17.6px', 'document.css の .katex { font-size: 1.1em } が効く');
    });
  });

  test('見出しへのリンクで開くと、数式と図を描いたあとも、その見出しの位置にある', async () => {
    await withFolder(BUILT, { hash: '#/guide/' + encodeURIComponent('Markdown記法') + '.md#' + encodeURIComponent('画像') }, async ({ page }) => {
      await page.waitForFunction(() => document.querySelectorAll('.katex').length >= 2, null, { timeout: 30000 });
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const el = window.MDV.app.state.anchorEl;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return { top: el && el.textContent.indexOf('画像') >= 0 ? el.getBoundingClientRect().top : -1, atBottom: window.scrollY >= max - 2, y: window.scrollY };
      });
      // 文書の終わりに近い見出しは、ページの末尾までしか動けない
      assert.ok(r.top >= 0 && (r.top < 160 || r.atBottom) && r.y > 1000, `見出しの位置へ動いている（${JSON.stringify(r)}）`);
    });
  });

  test('使い方とライセンス表記を表示できる（lib/resources.js）', async () => {
    await withFolder(BUILT, async ({ page }) => {
      await clickMenu(page, 'menuHelp');
      await page.waitForFunction(() => window.MDV.app.state.view === 'help');
      assert.ok((await page.textContent('.mdv-prose h1')).length > 0);
      await clickMenu(page, 'menuAbout');
      await page.waitForSelector('dialog.mdv-dialog-about[open]');
      assert.ok((await page.textContent('dialog.mdv-dialog-about')).includes('markdown-it'));
    });
  });

  test('外部の画像は、既定では読み込まない（SEC-10）', async () => {
    const sink = await startSink();
    try {
      const dir = copyFolder({ 'README.md': `# 外部画像\n\n![x](${sink.origin}/a.png)\n\n<img src="${sink.origin}/b.png">\n` });
      update(dir);
      await withFolder(dir, async ({ page }) => {
        await waitHeading(page, '外部画像');
        await page.waitForTimeout(500);
        assert.equal(await page.locator('.mdv-prose .mdv-ph').count(), 2);
      });
      assert.deepEqual(sink.paths(), []);
    } finally {
      await sink.close();
    }
  });
});

describe('アクセシビリティ（フォルダ版、既定の配色）', () => {
  test('axe-core の自動検査で違反がない（所定の文書のホームと記法のページ、ライト・ダーク）', async () => {
    const axeSource = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
    for (const colorScheme of ['light', 'dark']) {
      await withFolder(BUILT, { colorScheme }, async ({ page, record }) => {
        await waitHeading(page, 'mdfolio サンプル文書');
        const audit = async () => {
          await page.evaluate(axeSource);
          const violations = await page.evaluate(async () => {
            const r = await window.axe.run({ exclude: [['.mdv-prose [style*="color"]']] }, { resultTypes: ['violations'] });
            return r.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | '));
          });
          // axe は CSS を読もうとして fetch するが、CSP（connect-src 'none'）が止める。検査の道具の動作なので除く
          const own = (e) => /^Connecting to 'file:[^']*\.css' violates the following Content Security Policy directive: "connect-src 'none'"/.test(e);
          for (let i = record.errors.length - 1; i >= 0; i--) if (own(record.errors[i])) record.errors.splice(i, 1);
          return violations;
        };
        assert.deepEqual(await audit(), [], colorScheme + ' / ホーム');
        await page.click('.mdv-sidenav a:has-text("Markdown 記法")');
        await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2, null, { timeout: 30000 });
        assert.deepEqual(await audit(), [], colorScheme + ' / 記法');
      });
    }
  });
});

describe('別のフォルダを開く・所定の文書に戻る', () => {
  test('所定の文書の表示中も、フォルダを開ける。メニューから所定の文書に戻れる', async () => {
    await withFolder(BUILT, async ({ page }) => {
      await waitHeading(page, 'mdfolio サンプル文書');
      await openMenu(page);
      const items = async () => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-menu-item')).filter((b) => !b.hidden).map((b) => b.getAttribute('data-action')));
      assert.deepEqual(await items(), ['menuOpenFolder', 'menuOpenFiles', 'menuExport', 'menuExternalImages', 'menuLanguage', 'menuHelp', 'menuAbout']);
      await page.keyboard.press('Escape');
      await loadFolder(page, fixture('site'));
      await waitHeading(page, 'テスト用サイト');
      assert.equal(await page.textContent('.mdv-title'), 'site');
      await openMenu(page);
      assert.deepEqual(await items(), ['menuLibrary', 'menuOpenFolder', 'menuOpenFiles', 'menuReload', 'menuExport', 'menuExternalImages', 'menuLanguage', 'menuHelp', 'menuAbout']);
      await page.click('.mdv-menu-item[data-action="menuLibrary"]');
      await waitHeading(page, 'mdfolio サンプル文書');
      assert.equal(await page.textContent('.mdv-title'), 'mdfolio サンプル文書');
      await waitIndexed(page);
      await page.fill('.mdv-search-input', '制限');
      await page.waitForSelector('.mdv-search-item');
    });
  });

  test('文書がないときは開始画面で、文書の置き方を案内する', async () => {
    const dir = copyFolder({});
    update(dir);
    await withFolder(dir, async ({ page }) => {
      assert.equal(await page.evaluate(() => window.MDV.app.state.view), 'welcome');
      assert.equal(await page.textContent('.mdv-welcome-hint'), '所定の文書を表示するには、docs フォルダに Markdown を置いて、node tools/update.mjs を実行してください。');
      await loadFolder(page, fixture('site'));
      await waitHeading(page, 'テスト用サイト');
    });
  });
});

describe('CSS で見た目を変える（style/document.css）', () => {
  const editCss = (dir, extra) => fs.appendFileSync(path.join(dir, 'style/document.css'), '\n' + extra + '\n');

  test('変数と本文の規則の変更が、本文・画面・図に反映される（ライト・ダーク）', async () => {
    const dir = copyFolder();
    editCss(dir, [
      ':root { --accent: #8A1C14; --accent-soft: #F7E1DE; --sheet: #FFFDF6; --content-w: 40rem; }',
      '[data-theme="dark"] { --accent: #F2A19B; --accent-soft: #3A1E1C; }',
      '.mdv-prose h2 { color: #8A1C14; border-bottom: 2px solid var(--accent); }',
      '.mdv-prose table { font-size: 0.8125rem; }'
    ].join('\n'));
    await withFolder(dir, async ({ page }) => {
      await page.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await waitHeading(page, 'Markdown 記法');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2, null, { timeout: 30000 });
      const look = await page.evaluate(() => {
        const cs = (sel) => getComputedStyle(document.querySelector(sel));
        return {
          h2: cs('.mdv-prose h2').color, h2border: cs('.mdv-prose h2').borderBottomColor, link: cs('.mdv-prose a').color,
          sheet: cs('.mdv-sheet').backgroundColor, table: cs('.mdv-prose table').fontSize,
          activeNav: cs('.mdv-sidenav a[aria-current="page"]').color
        };
      });
      assert.deepEqual(look, { h2: 'rgb(138, 28, 20)', h2border: 'rgb(138, 28, 20)', link: 'rgb(138, 28, 20)', sheet: 'rgb(255, 253, 246)', table: '13px', activeNav: 'rgb(138, 28, 20)' });
      // 図も同じ配色（枠は --accent、塗りは --accent-soft）
      const svg = await page.evaluate(() => document.querySelector('.mdv-mermaid svg').outerHTML);
      assert.ok(/#8A1C14|rgb\(138, ?28, ?20\)/i.test(svg), '図の枠の色');
      assert.ok(/#F7E1DE|rgb\(247, ?225, ?222\)/i.test(svg), '図の塗りの色');
      // ダーク
      await page.click('.mdv-btn-theme');
      await page.click('.mdv-btn-theme');
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
      await page.waitForFunction(() => /#F2A19B|rgb\(242, ?161, ?155\)/i.test(document.querySelector('.mdv-mermaid svg').outerHTML), null, { timeout: 20000 });
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.mdv-prose a')).color), 'rgb(242, 161, 155)');
    });
  });

  test('図のライブラリが読めない書き方の色は使わず、既定の色で描く', async () => {
    const dir = copyFolder();
    editCss(dir, ':root { --accent-soft: color-mix(in srgb, red 20%, white); --accent: var(--tip); }');
    await withFolder(dir, async ({ page }) => {
      await page.click('.mdv-sidenav a:has-text("Markdown 記法")');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2, null, { timeout: 30000 });
      const svg = await page.evaluate(() => document.querySelector('.mdv-mermaid svg').outerHTML);
      assert.ok(!/color-mix/.test(svg));
      assert.ok(/#E3ECF8/i.test(svg), '塗りは既定の色');
      assert.equal(await page.locator('.mdv-mermaid-error').count(), 0);
    });
  });

  test('印刷では、利用者がダークの配色を変えていても、ライトの配色になる', async () => {
    const dir = copyFolder();
    editCss(dir, '[data-theme="dark"] { --sheet: #000000; --ink: #EEEEEE; }');
    await withFolder(dir, { colorScheme: 'dark' }, async ({ page }) => {
      await waitHeading(page, 'mdfolio サンプル文書');
      await page.emulateMedia({ media: 'print' });
      assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('.mdv-prose h1')).color]), ['rgb(255, 255, 255)', 'rgb(0, 0, 0)']);
    });
  });
});

describe('フォルダ版からの書き出し', () => {
  test('書き出しは単一 HTML で、更新コマンドで写した CSS を使う。写す前の変更は入らない', async () => {
    const dir = copyFolder();
    fs.appendFileSync(path.join(dir, 'style/document.css'), '\n.mdv-prose h1 { color: #123456; }\n');
    const out = tmpDir();
    const exportOnce = async (name) => {
      let file = '';
      await withFolder(dir, async ({ page }) => {
        await waitHeading(page, 'mdfolio サンプル文書');
        await clickMenu(page, 'menuExport');
        await page.waitForSelector('dialog.mdv-dialog-export[open]');
        assert.ok((await page.textContent('.mdv-export-css-note')).includes('node tools/update.mjs'));
        await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled, null, { timeout: 30000 });
        const [download] = await Promise.all([page.waitForEvent('download'), page.click('.mdv-export-run')]);
        file = path.join(out, name);
        await download.saveAs(file);
      });
      return file;
    };
    const before = fs.readFileSync(await exportOnce('before.html'), 'utf8');
    assert.ok(!before.includes('#123456'), '更新コマンドの前は、編集前の CSS');
    update(dir);
    const file = await exportOnce('after.html');
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(html.includes('.mdv-prose h1 { color: #123456; }'));
    // 書き出した HTML は、単一 HTML として正しく動く（CSP のハッシュも合う）
    const parts = core.extractParts(html);
    assert.equal(core.composeHtml(parts), html);
    const config = JSON.parse(core.findBlock(parts, 'mdv-config').text);
    assert.equal(config.title, 'mdfolio サンプル文書');
    const context = await browser.newContext({ locale: 'ja-JP' });
    try {
      const page = await context.newPage();
      const record = watch(page);
      await page.goto(pathToFileURL(file).href + '#/guide/' + encodeURIComponent('Markdown記法') + '.md');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2 && document.querySelectorAll('.katex').length >= 2, null, { timeout: 30000 });
      assert.equal(await page.evaluate(() => window.MDV.app.state.mode), 'site');
      await page.click('.mdv-title');
      await waitHeading(page, 'mdfolio サンプル文書');
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.mdv-prose h1')).color), 'rgb(18, 52, 86)');
      assert.deepEqual(record.errors, []);
      assert.deepEqual(record.requests, []);
    } finally {
      await context.close();
    }
  });
});

describe('更新コマンド（tools/update.mjs）', () => {
  test('文書を足して更新コマンドを実行し、再読み込みすると表示される', async () => {
    const dir = copyFolder({ 'README.md': '# 最初の文書\n' });
    update(dir, ['--title', '部の文書']);
    await withFolder(dir, async ({ page }) => {
      await waitHeading(page, '最初の文書');
      assert.equal(await page.textContent('.mdv-title'), '部の文書');
      writeTree(path.join(dir, 'docs'), { '手順/追加.md': '# 追加した文書\n\n![図](../図.svg)\n', '図.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>' });
      update(dir, ['--title', '部の文書', '--home', '手順/追加.md']);
      await page.reload();
      await waitHeading(page, '追加した文書');
      await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.complete && i.naturalWidth === 10; });
    });
  });
});
