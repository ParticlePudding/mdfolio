// E2E テスト用の共通処理（Playwright で実ブラウザを操作する）
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { ROOT, core } from './load.mjs';

// コマンド（更新コマンド、コマンドライン版の書き出し）の表示の言語は、テストでは日本語に固定する。
// 実行する機械の言語設定に左右されないように（SPEC FD-10）。英語の表示は、テストの中で個別に指定して確かめる。
process.env.MDFOLIO_LANG = process.env.MDFOLIO_LANG || 'ja';

export { ROOT, core };
export const VIEWER = path.join(ROOT, 'dist/mdfolio.html');
export const VIEWER_URL = pathToFileURL(VIEWER).href;
export const FIXTURES = path.join(ROOT, 'tests/fixtures');
export const fixture = (name) => path.join(FIXTURES, name);

// テスト環境のロケールが POSIX のままだと、Chrome が日本語のファイル名のファイルを読めない。
// ブラウザのプロセスにだけ UTF-8 のロケールを指定する。
const BROWSER_ENV = { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };

export function launchBrowser(options = {}) {
  return chromium.launch({ env: BROWSER_ENV, ...options });
}

export function launchPersistent(userDataDir, options = {}) {
  return chromium.launchPersistentContext(userDataDir, { env: BROWSER_ENV, locale: 'ja-JP', viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...options });
}

/**
 * コンソールエラー（CSP 違反を含む）・ページの例外・通信を記録する。
 * requests は実際に送ろうとした通信、blocked は CSP が送信前に止めたもの。
 */
export function watch(page) {
  const record = { errors: [], warnings: [], requests: [], blocked: [] };
  page.on('console', (m) => {
    if (m.type() === 'error') record.errors.push(m.text());
    else if (m.type() === 'warning') record.warnings.push(m.text());
  });
  page.on('pageerror', (e) => record.errors.push('pageerror: ' + e.message));
  page.on('crash', () => record.errors.push('page crashed'));
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('blob:') || u.startsWith('data:')) return;
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) return; // HTML 自身の読み込み
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

/** エラー・CSP 違反・想定外の通信がないことを確かめる（合格基準）。 */
export function assertClean(record) {
  assert.deepEqual(record.errors, [], 'コンソールエラー・CSP 違反・例外がないこと');
  assert.deepEqual(record.requests, [], 'HTML 自身の読み込み以外の通信がないこと');
}

/**
 * ビューアを開く。
 * options:
 *   url / hash            開く URL（既定は dist/mdfolio.html を file:// で）
 *   locale, viewport, colorScheme
 *   picker                'none'（既定。File System Access API を隠して <input> 方式にする）| 'keep'
 *   init, initArg         ページのスクリプトより前に実行する関数
 *   context               既存のコンテキストを使う場合
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
      try { Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true, writable: true }); } catch (e) { /* 無視 */ }
    }
  }, options.picker || 'none');
  if (options.init) await page.addInitScript(options.init, options.initArg);
  await page.goto((options.url || VIEWER_URL) + (options.hash || ''));
  await page.waitForSelector('.mdv-app');
  return { context, page, record, ownContext };
}

/** ページを開いてテスト本体を実行し、最後に合格基準（エラーなし・通信なし）を確かめる。 */
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

/** <input webkitdirectory> にフォルダを設定して開く。 */
export async function loadFolder(page, dir) {
  await page.locator('.mdv-input-dir').setInputFiles(dir);
  await page.waitForSelector('.mdv-app[data-has-set="true"] .mdv-doc:not([hidden]) .mdv-prose > *');
}

export async function loadFiles(page, files) {
  await page.locator('.mdv-input-files').setInputFiles(files);
  await page.waitForSelector('.mdv-app[data-has-set="true"] .mdv-doc:not([hidden]) .mdv-prose > *');
}

/** 見出し（h1）が指定の文字列を含むまで待つ。 */
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

/** ハッシュを変えて移動し、見出しが出るまで待つ。 */
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

/** { '相対パス': '内容' | Buffer } からフォルダを作る。 */
export function writeTree(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

/** ダウンロードを待って保存し、保存先のパスと提示されたファイル名を返す。 */
export async function captureDownload(page, action, dir) {
  const [download] = await Promise.all([page.waitForEvent('download'), action()]);
  const name = download.suggestedFilename();
  const file = path.join(dir || tmpDir(), name);
  await download.saveAs(file);
  return { file, name };
}

/** 設定ブロックだけを書き換えたビューアを一時フォルダに作り、その URL（file://）を返す。 */
export function viewerWithConfig(config) {
  const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
  core.findBlock(parts, 'mdv-config').text = core.jsonForScript(config);
  const file = path.join(tmpDir(), 'viewer.html');
  fs.writeFileSync(file, core.composeHtml(parts));
  return pathToFileURL(file).href;
}

/**
 * 「外部のサーバー」の代わりになる HTTP サーバー。届いたリクエストを hits に記録する。
 * ブラウザーが本当に通信したかどうかを、サーバー側の記録で確かめるために使う。
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

/** dist/ を配信する小さな HTTP サーバー（http:// での動作確認用）。 */
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
 * テスト用のフォルダ選択（showDirectoryPicker の差し替え）。addInitScript に渡して使う。
 * spec: { name, files: { 'パス': { text, mtime } | '文字列' }, reject: 'AbortError' など, slow: ミリ秒,
 *         generate: [{ count, prefix, ext, text（見出し行）, body（本文） }] }
 * ページ側では window.__mockFs を書き換えると、ファイルの追加・変更・削除を再現できる。
 */
export function installMockPicker(spec) {
  const files = {};
  Object.keys(spec.files || {}).forEach((p) => {
    const v = spec.files[p];
    files[p] = typeof v === 'string' ? { text: v, mtime: 1700000000000 } : v;
  });
  // 大量のファイルや巨大な文書は、ページの中で生成する
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
        return (async function* () {
          let n = 0;
          for (const it of items) {
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

/** installMockPicker を使ってページを開く。 */
export function mockOptions(spec, extra = {}) {
  return { picker: 'keep', init: installMockPicker, initArg: spec, ...extra };
}

/** 「フォルダを開く」ボタンから、差し替えたフォルダ選択で開く。 */
export async function openMock(page) {
  await page.click('.mdv-open-folder');
  await page.waitForSelector('.mdv-app[data-has-set="true"] .mdv-doc:not([hidden]) .mdv-prose > *');
}
