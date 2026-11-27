// Shared helpers for E2E tests (drive a real browser with Playwright)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { ROOT, core } from './load.mjs';

// In tests, the language of command output (the update command, the command-line export) is pinned to Japanese,
// so results do not depend on the language setting of the machine running them (SPEC FD-10). English output is checked by specifying it explicitly in individual tests.
process.env.MDFOLIO_LANG = process.env.MDFOLIO_LANG || 'ja';

export { ROOT, core };
export const VIEWER = path.join(ROOT, 'dist/mdfolio.html');
export const VIEWER_URL = pathToFileURL(VIEWER).href;
export const FIXTURES = path.join(ROOT, 'tests/fixtures');
export const fixture = (name) => path.join(FIXTURES, name);

// If the test environment's locale is left as POSIX, Chrome cannot read files with Japanese names.
// Set a UTF-8 locale for the browser process only.
const BROWSER_ENV = { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };

export function launchBrowser(options = {}) {
  return chromium.launch({ env: BROWSER_ENV, ...options });
}

export function launchPersistent(userDataDir, options = {}) {
  return chromium.launchPersistentContext(userDataDir, { env: BROWSER_ENV, locale: 'ja-JP', viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...options });
}

/**
 * Record console errors (including CSP violations), page exceptions and network requests.
 * requests holds requests actually attempted; blocked holds those CSP stopped before sending.
 */
/** The neighboring mdfolio.css (SPEC 3.10). The HTML always tries to load it and records it as not found when absent. This is the specified behavior, so it is excluded */
export const isUserCssUrl = (u) => /\/mdfolio\.css(?:[?#]|$)/.test(String(u || ''));

export function watch(page) {
  const record = { errors: [], warnings: [], requests: [], blocked: [], userCss: [] };
  page.on('console', (m) => {
    if (m.type() === 'error' && isUserCssUrl(m.location() && m.location().url) && /Failed to load resource/.test(m.text())) return;
    if (m.type() === 'error') record.errors.push(m.text());
    else if (m.type() === 'warning') record.warnings.push(m.text());
  });
  page.on('pageerror', (e) => record.errors.push('pageerror: ' + e.message));
  page.on('crash', () => record.errors.push('page crashed'));
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('blob:') || u.startsWith('data:')) return;
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) return; // loading the HTML itself
    if (isUserCssUrl(u) && r.resourceType() === 'stylesheet') { record.userCss.push(u); return; }
    record.requests.push(u);
  });
  page.on('requestfailed', (r) => {
    const f = r.failure();
    if (!f || f.errorText !== 'csp') return;
    const i = record.requests.lastIndexOf(r.url());
    if (i >= 0) record.requests.splice(i, 1);
    record.blocked.push(r.url());
  });
  return record;
}

/** Check that there are no errors, CSP violations or unexpected requests (the pass criteria). */
export function assertClean(record) {
  assert.deepEqual(record.errors, [], 'no console errors, CSP violations or exceptions');
  assert.deepEqual(record.requests, [], 'no requests other than loading the HTML itself');
}

/**
 * Open the viewer.
 * options:
 *   url / hash            URL to open (default: dist/mdfolio.html via file://)
 *   locale, viewport, colorScheme
 *   picker                'none' (default: hide the File System Access API and use the <input> method) | 'keep'
 *   init, initArg         function to run before the page's scripts
 *   context               when using an existing context
 */
export async function openPage(browser, options = {}) {
  const ownContext = !options.context;
  const context = options.context || await browser.newContext({
    locale: options.locale || 'ja-JP',
    viewport: options.viewport || { width: 1440, height: 900 },
    colorScheme: options.colorScheme || 'light',
    acceptDownloads: true
  });
  const page = await context.newPage();
  const record = watch(page);
  await page.addInitScript((picker) => {
    if (picker === 'none') {
      try { Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true, writable: true }); } catch (e) { /* ignore */ }
    }
  }, options.picker || 'none');
  if (options.init) await page.addInitScript(options.init, options.initArg);
  await page.goto((options.url || VIEWER_URL) + (options.hash || ''));
  await page.waitForSelector('.mdv-app');
  return { context, page, record, ownContext };
}

/** Open the page, run the test body, then check the pass criteria (no errors, no requests). */
export async function withPage(browser, options, fn) {
  if (typeof options === 'function') { fn = options; options = {}; }
  const opened = await openPage(browser, options);
  try {
    await fn(opened);
    if (!options.allowErrors) assertClean(opened.record);
  } finally {
    if (opened.ownContext) await opened.context.close();
    else await opened.page.close();
  }
}

/** Set a folder on <input webkitdirectory> and open it. */
export async function loadFolder(page, dir) {
  await page.locator('.mdv-input-dir').setInputFiles(dir);
  await page.waitForSelector('.mdv-app[data-has-set="true"] .mdv-doc:not([hidden]) .mdv-prose > *');
}

export async function loadFiles(page, files) {
  await page.locator('.mdv-input-files').setInputFiles(files);
  await page.waitForSelector('.mdv-app[data-has-set="true"] .mdv-doc:not([hidden]) .mdv-prose > *');
}

/** Wait until the heading (h1) contains the given string. */
export async function waitHeading(page, text) {
  await page.waitForFunction((t) => {
    const h1 = document.querySelector('.mdv-doc:not([hidden]) .mdv-prose h1');
    return !!h1 && h1.textContent.includes(t);
  }, text);
}

export async function waitIndexed(page) {
  await page.waitForFunction(() => {
    const s = window.MDV.app.state.set;
    return !!s && !s.indexing && s.indexed === s.docs.length;
  });
}

/** Navigate by changing the hash, and wait for the heading to appear. */
export async function goTo(page, route, heading) {
  await page.evaluate((r) => { location.hash = r; }, route);
  if (heading) await waitHeading(page, heading);
}

export const hash = (page) => page.evaluate(() => location.hash);
export const heading = (page) => page.evaluate(() => {
  const h1 = document.querySelector('.mdv-prose h1');
  if (!h1) return null;
  const clone = h1.cloneNode(true);
  clone.querySelectorAll('.mdv-anchor').forEach((a) => a.remove());
  return clone.textContent.trim();
});
export const toasts = (page) => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-toast')).map((e) => e.textContent));

export async function openMenu(page) {
  if (await page.locator('.mdv-menu').isHidden()) await page.click('.mdv-btn-menu');
  await page.waitForSelector('.mdv-menu:not([hidden])');
}

export async function clickMenu(page, action) {
  await openMenu(page);
  await page.click(`.mdv-menu-item[data-action="${action}"]`);
}

export function tmpDir(prefix = 'mdfolio-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Create a folder from { 'relative path': 'content' | Buffer }. */
export function writeTree(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

/** Wait for a download, save it, and return the saved path and the suggested file name. */
export async function captureDownload(page, action, dir) {
  const [download] = await Promise.all([page.waitForEvent('download'), action()]);
  const name = download.suggestedFilename();
  const file = path.join(dir || tmpDir(), name);
  await download.saveAs(file);
  return { file, name };
}

/** Create a viewer in a temporary folder with only the settings block rewritten, and return its URL (file://). */
export function viewerWithConfig(config) {
  const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
  core.findBlock(parts, 'mdv-config').text = core.jsonForScript(config);
  const file = path.join(tmpDir(), 'viewer.html');
  fs.writeFileSync(file, core.composeHtml(parts));
  return pathToFileURL(file).href;
}

/**
 * An HTTP server standing in for an "external server". Records incoming requests in hits.
 * Used to confirm, from the server's own log, whether the browser actually made a request.
 */
export async function startSink() {
  const hits = [];
  const png = fs.readFileSync(path.join(FIXTURES, 'site/assets/pixel.png'));
  const server = http.createServer((req, res) => {
    hits.push({ method: req.method, url: req.url, referer: req.headers.referer, cookie: req.headers.cookie });
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('content-type', /\.(mp4|mp3)$/.test(req.url) ? 'application/octet-stream' : 'image/png');
    res.end(png);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    hits,
    paths: () => hits.map((h) => h.url),
    close: () => new Promise((r) => server.close(r))
  };
}

/** A small HTTP server serving dist/ (for checking behavior over http://). */
export async function startServer(files) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const body = files[url];
    if (body === undefined) { res.statusCode = 404; res.end('not found'); return; }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

/**
 * Folder picker for tests (a replacement for showDirectoryPicker). Pass it to addInitScript.
 * spec: { name, files: { 'path': { text, mtime } | 'string' }, reject: 'AbortError' etc., slow: milliseconds,
 *         generate: [{ count, prefix, ext, text (heading line), body (body text) }] }
 * On the page side, modifying window.__mockFs simulates adding, changing and deleting files.
 */
export function installMockPicker(spec) {
  const files = {};
  Object.keys(spec.files || {}).forEach((p) => {
    const v = spec.files[p];
    files[p] = typeof v === 'string' ? { text: v, mtime: 1700000000000 } : v;
  });
  // Large numbers of files and huge documents are generated inside the page
  (spec.generate || []).forEach((g) => {
    for (let i = 0; i < g.count; i++) {
      files[(g.prefix || 'f') + String(i).padStart(6, '0') + (g.ext || '.md')] = { text: (g.text || '# doc') + ' ' + i + '\n' + (g.body ? '\n' + g.body : ''), mtime: 1700000000000 };
    }
  });
  if (spec.big) files[spec.big.path] = { text: '# ' + (spec.big.title || 'big') + '\n\n' + 'a'.repeat(spec.big.bytes), mtime: 1700000000000 };
  if (spec.bigAsset) files[spec.bigAsset.path] = { bytes: new Uint8Array(spec.bigAsset.bytes), mtime: 1700000000000 };
  window.__mockFs = { name: spec.name || 'mock', files: files, slow: spec.slow || 0, fail: {}, reads: 0, slowRead: spec.slowRead || 0 };
  window.__pickerCalls = 0;

  function fileHandle(p) {
    return {
      kind: 'file',
      name: p.split('/').pop(),
      getFile: async function () {
        const fsx = window.__mockFs;
        fsx.reads++;
        if (fsx.slowRead) await new Promise((r) => setTimeout(r, fsx.slowRead));
        if (fsx.fail[p] || !(p in fsx.files)) throw new DOMException('A requested file or directory could not be found.', 'NotFoundError');
        const f = fsx.files[p];
        const body = f.bytes !== undefined ? f.bytes : f.text;
        return new File([body], this.name, { lastModified: f.mtime || 1700000000000, type: f.type || '' });
      }
    };
  }

  function dirHandle(name, prefix) {
    return {
      kind: 'directory',
      name: name,
      entries: function () {
        const fsx = window.__mockFs;
        // failDirs: { '<prefix>': '<DOMException name>' } makes that folder unreadable ('' is the root)
        if (fsx.failDirs && fsx.failDirs[prefix]) throw new DOMException('mock', fsx.failDirs[prefix]);
        const seen = new Set();
        const items = [];
        Object.keys(fsx.files).forEach((p) => {
          if (p.indexOf(prefix) !== 0) return;
          const rest = p.slice(prefix.length);
          const i = rest.indexOf('/');
          const child = i < 0 ? rest : rest.slice(0, i);
          if (seen.has(child)) return;
          seen.add(child);
          items.push([child, i < 0 ? fileHandle(p) : dirHandle(child, prefix + child + '/')]);
        });
        // failDirsAfter: { '<prefix>': n } makes listing that folder fail after n entries
        const failAfter = fsx.failDirsAfter && fsx.failDirsAfter[prefix];
        return (async function* () {
          let n = 0;
          let given = 0;
          for (const it of items) {
            if (failAfter !== undefined && given++ >= failAfter) throw new DOMException('mock', 'NotReadableError');
            if (fsx.slow && ++n % 100 === 0) await new Promise((r) => setTimeout(r, fsx.slow));
            yield it;
          }
        })();
      },
      queryPermission: async function () { return 'granted'; },
      requestPermission: async function () { return 'granted'; }
    };
  }

  window.__mockRoot = () => dirHandle(window.__mockFs.name, '');
  window.showDirectoryPicker = async function () {
    window.__pickerCalls++;
    if (spec.reject) throw new DOMException('mock', spec.reject);
    return window.__mockRoot();
  };
}

/** Open the page using installMockPicker. */
export function mockOptions(spec, extra = {}) {
  return { picker: 'keep', init: installMockPicker, initArg: spec, ...extra };
}

/** Open via the "Open folder" button, using the replaced folder picker. */
export async function openMock(page) {
  await page.click('.mdv-open-folder');
  await page.waitForSelector('.mdv-app[data-has-set="true"] .mdv-doc:not([hidden]) .mdv-prose > *');
}
