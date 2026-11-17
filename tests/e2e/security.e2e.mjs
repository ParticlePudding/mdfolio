// Security (SEC-1 to SEC-9): checks that assume document content is untrusted
// "No external communication" is judged by whether anything actually reached a server we set up, not by the browser's own records.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  launchBrowser, withPage, loadFolder, fixture, heading, waitHeading, waitIndexed, goTo, clickMenu,
  tmpDir, writeTree, captureDownload, startSink, VIEWER, ROOT
} from '../helpers/e2e.mjs';
import { core } from '../helpers/load.mjs';

let browser;
let sink;
before(async () => { browser = await launchBrowser(); sink = await startSink(); });
after(async () => { await browser.close(); await sink.close(); });

const CSP_MESSAGE = /violates the following Content Security Policy directive/;
const xss = (page) => page.evaluate(() => typeof window.__xss);

/** Build a viewer with only the config block rewritten. */
function viewerWith(config) {
  const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
  core.findBlock(parts, 'mdv-config').text = core.jsonForScript(config);
  const file = path.join(tmpDir(), 'viewer.html');
  fs.writeFileSync(file, core.composeHtml(parts));
  return pathToFileURL(file).href;
}

async function openXss(page) {
  await loadFolder(page, fixture('site'));
  await goTo(page, '#/xss.md', 'XSS テスト');
  await page.waitForSelector('.mdv-mermaid svg, .mdv-mermaid-error');
  await page.waitForTimeout(500);
}

describe('Scripts in documents never run (SEC-1, SEC-2, SEC-6, SEC-9)', () => {
  test('removes scripts, event attributes and dangerous elements', async () => {
    await withPage(browser, { allowErrors: true }, async ({ page, record }) => {
      await openXss(page);
      assert.equal(await xss(page), 'undefined', 'no script has run');
      const r = await page.evaluate(() => {
        const prose = document.querySelector('.mdv-prose');
        const all = Array.from(prose.querySelectorAll('*'));
        const zone = (el) => (el.closest('.mdv-mermaid, .mdv-mermaid-error') ? 'mermaid' : el.closest('.katex') ? 'katex' : el.closest('.mdv-ph, .mdv-code-bar, .mdv-anchor') ? 'app' : 'doc');
        const names = (z) => Array.from(new Set(all.filter((el) => zone(el) === z).map((el) => el.nodeName.toLowerCase()))).sort();
        return {
          docTags: names('doc'),
          handlers: all.reduce((n, el) => n + Array.from(el.attributes).filter((a) => /^on/i.test(a.name)).length, 0),
          urls: all.reduce((list, el) => list.concat(Array.from(el.attributes).filter((a) => /^(href|src|xlink:href|action|formaction|poster|srcset|background|ping|data|lowsrc|dynsrc)$/i.test(a.name)).map((a) => a.value)), []),
          inputs: prose.querySelectorAll('input').length,
          code: Array.from(prose.querySelectorAll('pre code, p > code')).map((e) => e.textContent.trim()),
          mathLinks: prose.querySelectorAll('.math-inline a, .katex a').length,
          display: [getComputedStyle(document.body).display, getComputedStyle(document.querySelector('.mdv-header')).display]
        };
      });
      // Elements coming from the document are display-only ones
      assert.deepEqual(r.docTags, ['a', 'code', 'details', 'div', 'h1', 'img', 'p', 'pre', 'span', 'summary', 'table', 'tbody', 'td', 'tr']);
      assert.equal(r.handlers, 0, 'no on* attributes remain');
      for (const u of r.urls) {
        assert.ok(/^(?:#\/|#!|blob:|https:\/\/example\.invalid\/|x$)/.test(u), `unexpected URL: ${u}`);
      }
      assert.ok(!r.urls.some((u) => /^\s*(?:javascript|data|vbscript|file|ftp):/i.test(u)));
      assert.equal(r.inputs, 0, 'no input fields other than checkboxes remain');
      assert.deepEqual(r.code, ['<script>window.__xss = 1</script>', '<script>window.__xss = 1</script>'], 'anything written as code is shown as text');
      assert.equal(r.mathLinks, 0, 'links inside math (\\href) are disabled');
      assert.deepEqual(r.display, ['block', 'flex'], 'the document\'s <style> has no effect');
      // The only errors logged are records of the CSP blocking things
      assert.ok(record.errors.length > 0);
      for (const e of record.errors) assert.match(e, CSP_MESSAGE);
      assert.deepEqual(record.requests, [], 'no network requests were made');
    });
  });

  test('documents cannot pose as app components, hijack IDs or cover the screen', async () => {
    await withPage(browser, { allowErrors: true }, async ({ page }) => {
      await openXss(page);
      const r = await page.evaluate(() => {
        const prose = document.querySelector('.mdv-prose');
        const overlay = prose.querySelector('#user-content-overlay');
        const attrs = prose.querySelector('#user-content-attrs');
        return {
          rootIsApp: !!document.getElementById('mdv-root').querySelector('.mdv-app'),
          main: document.getElementById('mdv-main').nodeName,
          getElementById: typeof document.getElementById,
          foreignIds: Array.from(prose.querySelectorAll('[id]')).filter((e) => !e.closest('.mdv-mermaid, .katex')).map((e) => e.id).filter((id) => id.indexOf('user-content-') !== 0),
          names: Array.from(prose.querySelectorAll('[name]')).map((e) => e.getAttribute('name')),
          overlayStyle: overlay.getAttribute('style'),
          overlayPosition: getComputedStyle(overlay).position,
          overlayImage: getComputedStyle(overlay).backgroundImage,
          fakeCopy: Array.from(prose.querySelectorAll('.mdv-copy')).filter((e) => !e.closest('.mdv-code')).length,
          fakeToast: prose.querySelectorAll('.mdv-toast').length,
          keptClass: prose.querySelectorAll('span.extra-class').length,
          appClasses: Array.from(prose.querySelectorAll('[class]')).filter((e) => !e.closest('.mdv-mermaid, .mdv-mermaid-error, .mdv-code, .mdv-ph, .mdv-table-wrap, .katex') && /(^|\s)mdv-(?!ext\b|missing\b|anchor\b|ph\b|code\b|table-wrap\b|mermaid)/.test(e.className)).map((e) => e.className),
          attrs: Array.from(attrs.attributes).map((a) => a.name)
        };
      });
      assert.equal(r.rootIsApp, true, 'id="mdv-root" still belongs to the app');
      assert.equal(r.main, 'MAIN');
      assert.equal(r.getElementById, 'function', 'name="getElementById" cannot override DOM features');
      assert.deepEqual(r.foreignIds, [], 'all document ids get a prefix');
      assert.deepEqual(r.names, ['user-content-mdv-main', 'user-content-getElementById']);
      assert.equal(r.overlayStyle, 'color: green', 'only safe style declarations are kept');
      assert.equal(r.overlayPosition, 'static');
      assert.equal(r.overlayImage, 'none');
      assert.equal(r.fakeCopy, 0);
      assert.equal(r.fakeToast, 0);
      assert.equal(r.keptClass, 1, 'classes not used by the app are kept');
      assert.deepEqual(r.appClasses, []);
      assert.deepEqual(r.attrs, ['id'], 'contenteditable, tabindex and data-* are removed');
    });
  });

  test('only links with safe destinations are kept', async () => {
    await withPage(browser, { allowErrors: true }, async ({ page, context }) => {
      await openXss(page);
      const link = (id) => page.evaluate((i) => {
        const a = document.getElementById('user-content-' + i);
        return { href: a.getAttribute('href'), rel: a.getAttribute('rel'), target: a.getAttribute('target'), ping: a.getAttribute('ping'), missing: a.classList.contains('mdv-missing') };
      }, id);
      for (const id of ['js-link', 'data-link', 'file-link', 'ftp-link']) {
        assert.equal((await link(id)).href, null, `${id} is not made a link`);
      }
      assert.equal(await page.locator('.mdv-prose a[href^="javascript" i]').count(), 0);
      assert.ok((await page.textContent('.mdv-prose')).includes('[markdown js](javascript:window.__xss=1)'), 'Markdown javascript: links stay as text');
      // External links open in a new tab without passing the referrer
      assert.deepEqual(await link('ping-link'), { href: 'https://example.invalid/ping', rel: 'noopener noreferrer', target: '_blank', ping: null, missing: false });
      // Scheme-less //host/... becomes https (so that under file:// it cannot connect to a shared folder)
      assert.deepEqual(await link('pr-link'), { href: 'https://example.invalid/protocol-relative', rel: 'noopener noreferrer', target: '_blank', ping: null, missing: false });
      // \\host\share\... cannot open a shared folder either (treated as a path inside the document set and shown as not found)
      const unc = await link('unc-link');
      assert.equal(unc.href, '#/example.invalid/share/file');
      assert.equal(unc.missing, true);
      await page.click('#user-content-unc-link');
      await page.waitForSelector('.mdv-empty');
      assert.ok((await page.textContent('.mdv-empty')).includes('この文書は見つかりません'));
      assert.ok(page.url().startsWith('file://') && page.url().includes('/dist/mdfolio.html#'));
      assert.equal(context.pages().length, 1);
    });
  });

  test('HTML in file names, folder names, headings, titles and search terms is shown as text', async () => {
    const evil = '<img src=x onerror=window.__xss=1>';
    const root = path.join(tmpDir(), '<i>root<_i>');
    writeTree(root, {
      'README.md': '# ホーム\n\n[次](title.md)\n',
      [evil + '.md']: '本文だけの文書（見出しなし）。検索語アルファ。\n',
      'title.md': '---\ntitle: "<script>window.__xss=1</script>前付けのタイトル"\n---\n\n# <img src=x onerror="window.__xss=1"> 見出し <b>太字</b>\n\n## <svg onload="window.__xss=1"></svg>小見出し <i>斜体</i>\n\n検索語アルファ。\n\n## もう一つ\n',
      ['<svg onload=window.__xss=1>/inner.md']: '# 内側\n',
      '_sidebar.md': '- [ホーム](README.md)\n- <img src=x onerror="window.__xss=1"> [悪いリンク](javascript:window.__xss=1)\n- <script>window.__xss=1</script>[タイトル](title.md)\n'
    });
    const chromeInjected = () => document.querySelectorAll(
      '.mdv-header img, .mdv-header b, .mdv-header i, .mdv-sidebar img, .mdv-sidebar b, .mdv-sidebar i, .mdv-sidebar script, .mdv-sidebar svg[onload], ' +
      '.mdv-toc img, .mdv-toc b, .mdv-toc i, #mdv-search-panel img, #mdv-search-panel b, #mdv-search-panel i, .mdv-doc-head img, .mdv-doc-head b, .mdv-empty img, dialog img, dialog b'
    ).length;
    await withPage(browser, { allowErrors: true }, async ({ page, record }) => {
      await loadFolder(page, root);
      await waitIndexed(page);
      assert.equal(await page.textContent('.mdv-title'), '<i>root<_i>');
      assert.equal(await page.title(), 'ホーム - <i>root<_i>');
      // Sidebar: navigation (_sidebar.md) and file list
      assert.equal(await page.locator('.mdv-sidenav a[href^="javascript" i]').count(), 0);
      await page.click('.mdv-side-tab[data-tab="files"]');
      const tree = await page.textContent('.mdv-side-tree');
      assert.ok(tree.includes(evil), 'file name is shown as plain text');
      assert.ok(tree.includes('<svg onload=window.__xss=1>'), 'same for the folder name');
      // Document with HTML in its headings
      await goTo(page, '#/title.md', '見出し');
      assert.equal(await page.title(), '<script>window.__xss=1</script>前付けのタイトル - <i>root<_i>');
      const toc = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-toc .mdv-toc-link')).map((a) => a.textContent));
      assert.deepEqual(toc, ['見出し 太字', '小見出し 斜体', 'もう一つ']);
      // Document with HTML in its file name
      await goTo(page, core.buildRoute(evil + '.md'));
      await page.waitForFunction((name) => document.querySelector('.mdv-doc-path').textContent === name, evil + '.md');
      assert.equal(await page.title(), evil + ' - <i>root<_i>');
      // Search results, and the search term itself
      await page.fill('.mdv-search-input', 'アルファ');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-search-item').length === 2);
      assert.ok((await page.textContent('#mdv-search-panel')).includes(evil));
      await page.fill('.mdv-search-input', '<img src=x onerror=window.__xss=1>zzz');
      await page.waitForSelector('.mdv-search-empty');
      assert.equal(await page.textContent('.mdv-search-empty'), '「<img src=x onerror=window.__xss=1>zzz」に一致する文書はありません');
      await page.keyboard.press('Escape');
      // A location that does not exist (HTML in the URL)
      await goTo(page, '#/' + encodeURIComponent('<img src=x onerror=window.__xss=1>') + '/none.md');
      await page.waitForSelector('.mdv-empty');
      assert.ok((await page.textContent('.mdv-empty')).includes('<img src=x onerror=window.__xss=1>/none.md'));
      // Export dialog
      await clickMenu(page, 'menuExport');
      await page.waitForSelector('dialog.mdv-dialog-export[open]');
      assert.equal(await page.inputValue('.mdv-export-title'), '<i>root<_i>');
      const options = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-export-home option')).map((o) => o.textContent));
      assert.ok(options.includes(evil + '.md'));
      assert.equal(await page.evaluate(chromeInjected), 0, 'no document-derived elements are created inside UI components');
      await page.click('.mdv-export-cancel');
      assert.equal(await xss(page), 'undefined');
      for (const e of record.errors) assert.match(e, CSP_MESSAGE);
      assert.deepEqual(record.requests, []);
    });
  });

  test('attached HTML files are downloaded, not opened', async () => {
    await withPage(browser, async ({ page, context }) => {
      await loadFolder(page, fixture('site'));
      const dl = await captureDownload(page, () => page.click('.mdv-prose a:has-text("添付 HTML")'));
      assert.equal(dl.name, 'evil.html');
      await page.waitForTimeout(200);
      assert.equal(context.pages().length, 1, 'not opened in a new tab');
      assert.equal(page.frames().length, 1, 'not loaded into a frame either');
      assert.equal(await xss(page), 'undefined');
      assert.equal(await heading(page), 'テスト用サイト');
    });
  });
});

describe('No external communication (SEC-5, SEC-8, SEC-10)', () => {
  /** Documents collecting markup that could trigger external loads. Each URL identifies its route. */
  function vectorDocs() {
    const O = sink.origin;
    const html = `# 通信の確認

![md](${O}/md-image.png)

<img src="${O}/html-image.png" alt="html">

<img src="${O}/srcset-fallback.png" srcset="${O}/srcset.png 2x" alt="srcset">

<picture><source srcset="${O}/picture-source.png"><img src="${O}/picture-img.png" alt="pic"></picture>

<video src="${O}/video.mp4" poster="${O}/poster.png" controls></video>

<video controls><source src="${O}/video-source.mp4"><track src="${O}/track.vtt"></video>

<audio src="${O}/audio.mp3" controls></audio>

<input type="image" src="${O}/input-image.png">

<table background="${O}/table-bg.png"><tr><td background="${O}/td-bg.png">x</td></tr></table>

<div style="background: url(${O}/style-bg.png)">style</div>

<div style="background-image: url('${O}/style-bg2.png'); list-style: url(${O}/list.png)">style2</div>

<style>@import url(${O}/import.css); body { background: url(${O}/style-tag.png) }</style>

<link rel="stylesheet" href="${O}/link.css">

<link rel="prefetch" href="${O}/prefetch">

<link rel="preload" as="image" href="${O}/preload.png">

<meta http-equiv="refresh" content="0; url=${O}/meta-refresh">

<base href="${O}/base/">

<object data="${O}/object.swf"></object>

<embed src="${O}/embed.swf">

<iframe src="${O}/iframe.html"></iframe>

<form action="${O}/form" method="post"><button id="submit">go</button></form>

<a href="${O}/ping-link" ping="${O}/ping-target">ping</a>

<svg><image href="${O}/svg-image.png" /><use href="${O}/use.svg#a" /></svg>

<script src="${O}/script.js"></script>

<img src="x" onerror="fetch('${O}/onerror-fetch')">

<bgsound src="${O}/bgsound.mp3">

<img dynsrc="${O}/dynsrc.png" lowsrc="${O}/lowsrc.png" alt="dyn">

<details open><summary>x</summary><img src="${O}/details-img.png" alt="d"></details>

$\\includegraphics[width=1em]{${O}/katex-img.png}$ と $\\href{${O}/katex-href}{x}$ と $\\url{${O}/katex-url}$
`;
    const diagrams = {
      'm-shape': `flowchart LR\n  A@{ img: "${O}/mermaid-shape.png", label: "L", w: 60, h: 60 } --> B\n`,
      'm-label': `flowchart LR\n  A["<img src='${O}/mermaid-label.png'>"] --> B\n`,
      'm-themecss': `%%{init: {"themeCSS": ".nodeLabel { background-image: url(${O}/mermaid-themecss.png) } .node rect { fill: url(${O}/mermaid-fill.svg#p) }"}}%%\nflowchart LR\n  A --> B\n`,
      'm-font': `%%{init: {"fontFamily": "x;} .nodeLabel{background-image:url(${O}/mermaid-font.png)"}}%%\nflowchart LR\n  A --> B\n`,
      'm-frontmatter': `---\nconfig:\n  themeCSS: ".nodeLabel { background: url(${O}/mermaid-fm.png) }"\n---\nflowchart LR\n  A --> B\n`,
      'm-click': `flowchart LR\n  A --> B\n  click A href "${O}/mermaid-click" _blank\n`,
      'm-seq': `sequenceDiagram\n  participant A\n  link A: Docs @ ${O}/mermaid-seq-link\n  A->>A: hi\n`
    };
    const files = { 'README.md': html };
    for (const [name, code] of Object.entries(diagrams)) files[name + '.md'] = `# ${name}\n\n\`\`\`mermaid\n${code}\`\`\`\n`;
    return { dir: writeTree(tmpDir(), files), names: Object.keys(diagrams) };
  }

  async function visitAll(page, names) {
    await waitHeading(page, '通信の確認');
    await page.waitForTimeout(800);
    for (const name of names) {
      await goTo(page, '#/' + name + '.md', name);
      await page.waitForSelector('.mdv-mermaid svg, .mdv-mermaid-error');
      await page.waitForTimeout(400);
    }
    await waitIndexed(page);
  }

  // Things that may be loaded as images, video or audio (only when allowed)
  const MEDIA = ['/md-image.png', '/html-image.png', '/srcset-fallback.png', '/picture-img.png', '/details-img.png', '/video.mp4', '/video-source.mp4', '/audio.mp3'];
  // Images specified inside (Mermaid) diagrams. When allowed, they are loaded as images
  const DIAGRAM_IMAGES = ['/mermaid-shape.png', '/mermaid-label.png', '/mermaid-themecss.png', '/mermaid-fill.svg', '/mermaid-fm.png'];

  test('by default, no markup causes external communication (including images specified in diagrams)', async () => {
    sink.hits.length = 0;
    const { dir, names } = vectorDocs();
    await withPage(browser, { allowErrors: true }, async ({ page, record, context }) => {
      await loadFolder(page, dir);
      await visitAll(page, names);
      assert.deepEqual(sink.paths(), [], 'nothing reached the server');
      assert.deepEqual(record.requests, [], 'no requests were even attempted');
      // Images specified in diagrams cannot be removed during rendering, so the browser CSP blocks them
      assert.deepEqual(Array.from(new Set(record.blocked)).map((u) => u.replace(sink.origin, '')).sort(), DIAGRAM_IMAGES.slice().sort());
      for (const e of record.errors) assert.match(e, CSP_MESSAGE);
      assert.equal(context.pages().length, 1);
      assert.ok(page.url().startsWith('file://'), 'did not navigate to another page');
      // Exporting makes no requests either
      const before = sink.hits.length;
      await clickMenu(page, 'menuExport');
      await page.waitForSelector('dialog.mdv-dialog-export[open]');
      await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
      const dl = await captureDownload(page, () => page.click('.mdv-export-run'));
      assert.ok(fs.statSync(dl.file).size > 1024 * 1024);
      assert.equal(sink.hits.length, before);
    });
  });

  test('the exported site also makes no requests by default', async () => {
    sink.hits.length = 0;
    const { dir, names } = vectorDocs();
    const out = path.join(tmpDir(), 'vectors.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), dir, '--out', out], { cwd: ROOT });
    await withPage(browser, { url: pathToFileURL(out).href, allowErrors: true }, async ({ page, record }) => {
      await visitAll(page, names);
      assert.equal(await page.evaluate(() => window.MDV.app.state.mode), 'site');
      assert.deepEqual(sink.paths(), []);
      assert.deepEqual(record.requests, []);
    });
  });

  test('even with external images allowed, only images, video and audio are loaded', async () => {
    sink.hits.length = 0;
    const { dir, names } = vectorDocs();
    await withPage(browser, { url: viewerWith({ allowExternalImages: true }), allowErrors: true }, async ({ page, record, context }) => {
      await loadFolder(page, dir);
      await visitAll(page, names);
      const got = Array.from(new Set(sink.paths())).sort();
      assert.deepEqual(got, MEDIA.concat(DIAGRAM_IMAGES).sort(), 'no routes other than images and media (styles, links, forms, embeds, scripts, etc.) are used');
      assert.ok(sink.hits.every((h) => h.method === 'GET'));
      assert.ok(sink.hits.every((h) => h.referer === undefined && h.cookie === undefined), 'sends neither the referrer nor cookies');
      assert.equal(context.pages().length, 1);
      assert.ok(page.url().startsWith('file://'));
      for (const e of record.errors) assert.match(e, CSP_MESSAGE);
    });
  });
});

describe('Content Security Policy (SEC-3, SEC-4)', () => {
  test('the CSP is declared inside <head>, before all scripts', () => {
    const html = fs.readFileSync(VIEWER, 'utf8');
    const csp = html.indexOf('<meta http-equiv="Content-Security-Policy"');
    assert.ok(csp > 0 && csp < html.indexOf('<style') && csp < html.indexOf('<script') && csp < html.indexOf('</head>'));
    const policy = core.extractParts(html).csp;
    const directive = (name) => (policy.split(';').map((d) => d.trim()).find((d) => d.split(' ')[0] === name) || '').split(' ').slice(1);
    assert.deepEqual(directive('default-src'), ["'none'"]);
    assert.equal(directive('script-src').length, 4);
    assert.ok(directive('script-src').every((s) => /^'sha256-[A-Za-z0-9+/]{43}='$/.test(s)), 'only scripts specified by hash');
    assert.ok(!/unsafe-eval|unsafe-hashes|strict-dynamic|\*|wasm/.test(policy));
    assert.ok(!directive('script-src').includes("'unsafe-inline'"));
    assert.deepEqual(directive('connect-src'), ["'none'"]);
    assert.deepEqual(directive('object-src'), ["'none'"]);
    assert.deepEqual(directive('frame-src'), ["'none'"]);
    assert.deepEqual(directive('worker-src'), ["'none'"]);
    assert.deepEqual(directive('form-action'), ["'none'"]);
    assert.deepEqual(directive('base-uri'), ["'none'"]);
    assert.deepEqual(directive('font-src'), ['data:']);
    assert.deepEqual(directive('img-src'), ['data:', 'blob:', 'http:', 'https:']);
    // file: is allowed only for CSS (the neighboring mdfolio.css, SPEC 3.10), not for images, media or fonts (so local files and shared folders cannot be read)
    assert.deepEqual(directive('style-src'), ["'self'", 'file:', "'unsafe-inline'"]);
    for (const name of ['img-src', 'media-src', 'font-src', 'connect-src', 'script-src', 'default-src']) assert.ok(!directive(name).includes('file:'), name);
    assert.ok(html.includes('<meta name="referrer" content="no-referrer">'));
  });

  test('even if rogue elements or scripts get in, they can neither run nor communicate', async () => {
    sink.hits.length = 0;
    await withPage(browser, { allowErrors: true }, async ({ page, record }) => {
      const r = await page.evaluate(async (origin) => {
        const out = {};
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        // eval is specially allowed inside the test harness call, so yield once before checking
        await wait(20);
        try { out.eval = String((0, eval)('1 + 1')); } catch (e) { out.eval = e.name; }
        try { out.fn = String(new Function('return 1')()); } catch (e) { out.fn = e.name; }
        const s = document.createElement('script'); s.textContent = 'window.__inline = 1'; document.head.appendChild(s);
        out.inline = typeof window.__inline;
        const ext = document.createElement('script'); ext.src = origin + '/script.js'; document.head.appendChild(ext);
        const d = document.createElement('div'); d.setAttribute('onclick', 'window.__handler = 1'); document.body.appendChild(d); d.click();
        out.handler = typeof window.__handler;
        const a = document.createElement('a'); a.setAttribute('href', 'javascript:window.__jsurl=1'); document.body.appendChild(a); a.click();
        await wait(50);
        out.jsurl = typeof window.__jsurl;
        try { await fetch(origin + '/fetch', { mode: 'no-cors' }); out.fetch = 'sent'; } catch (e) { out.fetch = 'blocked'; }
        out.xhr = await new Promise((resolve) => { const x = new XMLHttpRequest(); x.onload = () => resolve('sent'); x.onerror = () => resolve('blocked'); try { x.open('GET', origin + '/xhr'); x.send(); } catch (e) { resolve('blocked'); } });
        try { navigator.sendBeacon(origin + '/beacon', 'x'); } catch (e) { /* whether it arrived is checked on the server side */ }
        out.ws = await new Promise((resolve) => { try { const w = new WebSocket(origin.replace('http', 'ws') + '/ws'); w.onopen = () => resolve('sent'); w.onerror = () => resolve('blocked'); } catch (e) { resolve('blocked'); } });
        try { const es = new EventSource(origin + '/sse'); await wait(150); out.sse = es.readyState === 2 ? 'blocked' : 'sent'; es.close(); } catch (e) { out.sse = 'blocked'; }
        const f = document.createElement('iframe'); f.src = origin + '/iframe.html'; document.body.appendChild(f);
        const o = document.createElement('object'); o.data = origin + '/object.swf'; document.body.appendChild(o);
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = origin + '/style.css'; document.head.appendChild(l);
        const st = document.createElement('style'); st.textContent = '@import url(' + origin + '/import.css); @font-face { font-family: x; src: url(' + origin + '/font.woff2); } .mdv-app { font-family: x; background-image: url(' + origin + '/css-bg.png); }'; document.head.appendChild(st);
        const i = new Image(); i.src = origin + '/image.png'; document.body.appendChild(i);
        const v = document.createElement('video'); v.src = origin + '/video.mp4'; document.body.appendChild(v);
        try { const w = new Worker(URL.createObjectURL(new Blob(['postMessage(1)'], { type: 'text/javascript' }))); out.worker = await new Promise((resolve) => { w.onmessage = () => resolve('ran'); w.onerror = () => resolve('blocked'); setTimeout(() => resolve('blocked'), 400); }); } catch (e) { out.worker = 'blocked'; }
        const form = document.createElement('form'); form.action = origin + '/form'; form.method = 'post'; form.target = '_self'; document.body.appendChild(form);
        try { form.submit(); } catch (e) { /* ignore */ }
        const base = document.createElement('base'); base.href = origin + '/base/'; document.head.appendChild(base);
        out.base = document.baseURI.indexOf(origin) === 0 ? 'changed' : 'unchanged';
        await wait(700);
        return out;
      }, sink.origin);
      assert.deepEqual(r, {
        eval: 'EvalError', fn: 'EvalError', inline: 'undefined', handler: 'undefined', jsurl: 'undefined',
        fetch: 'blocked', xhr: 'blocked', ws: 'blocked', sse: 'blocked', worker: 'blocked', base: 'unchanged'
      });
      assert.deepEqual(sink.paths(), [], 'nothing reached the server');
      assert.ok(page.url().startsWith('file://'), 'form submission did not navigate the page');
      assert.ok(record.errors.length >= 10);
    });
  });

  test('does not run an embedded library that has been tampered with', async () => {
    const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
    const katex = core.findBlock(parts, 'mdv-lib-katex');
    katex.text = core.jsonForScript('window.__tampered = 1;' + JSON.parse(katex.text));
    const file = path.join(tmpDir(), 'tampered-lib.html');
    fs.writeFileSync(file, core.composeHtml(parts));
    await withPage(browser, { url: pathToFileURL(file).href, allowErrors: true }, async ({ page, record }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/syntax.md', '記法');
      await page.waitForSelector('.mdv-math-raw');
      assert.equal(await page.evaluate(() => typeof window.__tampered), 'undefined');
      assert.equal(await page.evaluate(() => typeof window.katex), 'undefined');
      assert.equal(await page.locator('.katex').count(), 0);
      assert.equal(await page.getAttribute('.mdv-math-raw', 'title'), '数式を表示できません（この HTML には数式ライブラリが含まれていません）');
      await page.waitForSelector('.mdv-mermaid svg');
      assert.ok(record.errors.some((e) => /script-src/.test(e) && CSP_MESSAGE.test(e)));
    });
  });

  test('runs nothing if the main app script has been tampered with', async () => {
    const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
    const app = core.findBlock(parts, 'mdv-js-app');
    app.text = 'window.__tampered = 1;' + app.text;
    const file = path.join(tmpDir(), 'tampered-app.html');
    fs.writeFileSync(file, core.composeHtml(parts));
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(pathToFileURL(file).href);
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(() => typeof window.__tampered), 'undefined');
      assert.equal(await page.evaluate(() => !!(window.MDV && window.MDV.app)), false);
      assert.equal(await page.locator('.mdv-app').count(), 0);
      assert.ok(errors.some((e) => CSP_MESSAGE.test(e)));
    } finally {
      await context.close();
    }
  });

  test('does not load embedded document data in an invalid format', async () => {
    const cases = [
      { format: 99, name: 'x', files: [{ path: 'a.md', kind: 'doc', text: '# a' }] },
      { format: 1, name: 'x', files: [{ path: 'a.md', kind: 'doc', text: 1 }] },
      { format: 1, name: 'x', files: [{ path: 'a.bin', kind: 'other' }] },
      { format: 1, name: 'x', files: 'nope' },
      'text'
    ];
    for (const data of cases) {
      const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
      core.findBlock(parts, 'mdv-site').text = core.jsonForScript(data);
      const file = path.join(tmpDir(), 'bad-site.html');
      fs.writeFileSync(file, core.composeHtml(parts));
      await withPage(browser, { url: pathToFileURL(file).href }, async ({ page }) => {
        await page.waitForSelector('.mdv-toast-error');
        assert.equal(await page.textContent('.mdv-toast-error'), '埋め込まれた文書データを読み込めませんでした', JSON.stringify(data).slice(0, 60));
        assert.equal(await page.getAttribute('.mdv-app', 'data-view'), 'welcome');
        assert.equal(await page.evaluate(() => window.MDV.app.state.mode), 'viewer', 'usable in viewer mode');
      });
    }
  });

  test('paths in embedded document data cannot point outside the document set', async () => {
    const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
    core.findBlock(parts, 'mdv-site').text = core.jsonForScript({
      format: 1, name: 'x',
      files: [
        { path: 'ok.md', kind: 'doc', text: '# 正常な文書\n' },
        { path: '../outside.md', kind: 'doc', text: '# 外' },
        { path: 'a/../../outside2.md', kind: 'doc', text: '# 外 2' },
        { path: '/abs.md', kind: 'doc', text: '# 絶対パス' },
        { path: 'C:\\Windows\\win.md', kind: 'doc', text: '# ドライブ' },
        { path: 'file:///etc/passwd.md', kind: 'doc', text: '# スキーム' }
      ]
    });
    const file = path.join(tmpDir(), 'odd-paths.html');
    fs.writeFileSync(file, core.composeHtml(parts));
    await withPage(browser, { url: pathToFileURL(file).href }, async ({ page }) => {
      await page.waitForSelector('.mdv-prose h1');
      const docs = await page.evaluate(() => window.MDV.app.state.set.docs.slice());
      // Paths that escape with ".." are not loaded. Others are treated as names inside the document set (the disk is never read)
      assert.deepEqual(docs, ['abs.md', 'ok.md', 'C:/Windows/win.md', 'file:/etc/passwd.md']);
      for (const p of docs) {
        await goTo(page, core.buildRoute(p));
        await page.waitForFunction((x) => document.querySelector('.mdv-doc-path').textContent === x, p);
      }
      assert.equal(await heading(page), 'スキーム');
      assert.ok(page.url().startsWith(pathToFileURL(file).href + '#/'), 'the page did not navigate');
    });
  });
});
