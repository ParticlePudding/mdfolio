// 別のブラウザーエンジンでの動作確認（共通部分）。
// Chromium 以外では Playwright を使えないため、WebDriver で操作できる範囲を確認する:
//   起動、<input> 方式でのファイル読み込み、書き出したサイトの表示（画像・コード・数式・図）、検索、移動、
//   テーマ・言語、外部通信の遮断（追加した CSP が効くこと）、外部画像の許可（再読み込みと設定の保存）、
//   別のページの中（フレーム）に埋め込んだ場合の表示と移動。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VIEWER = path.join(ROOT, 'dist/mdfolio.html');
const FIXTURES = path.join(ROOT, 'tests/fixtures');

function startSink() {
  const hits = [];
  const png = fs.readFileSync(path.join(FIXTURES, 'site/assets/pixel.png'));
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    res.setHeader('content-type', 'image/png');
    res.setHeader('access-control-allow-origin', '*');
    res.end(png);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ origin: 'http://127.0.0.1:' + server.address().port, hits, close: () => new Promise((r) => server.close(r)) })));
}

function buildSite(dir, out, extra = []) {
  execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), dir, '--out', out, ...extra], { cwd: ROOT });
  return pathToFileURL(out).href;
}

/** 1 つの HTML を返すだけの HTTP サーバー。headers は応答ヘッダー。 */
function serve(html, host, headers = {}) {
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    res.end(html);
  });
  return new Promise((resolve) => server.listen(0, host, () => resolve({ url: `http://${host}:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) })));
}

const hostPage = (frame) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>host</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body>${frame}</body></html>`;

function writeTree(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

const headingIs = (text) => { const h = document.querySelector('.mdv-doc:not([hidden]) .mdv-prose h1'); return !!h && h.textContent.indexOf(text) >= 0; };
const appReady = () => !!(window.MDV && window.MDV.app && document.querySelector('.mdv-app'));

/**
 * d: Driver（セッション開始済み）。engine: 表示用の名前。
 * 結果を { name, ok, detail } の配列で返す。1 つ失敗しても残りを続ける。
 */
export async function runSmoke(d, engine, log = console.log, shots = null) {
  const results = [];
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-cross-'));
  const sink = await startSink();
  const step = async (name, fn) => {
    try {
      const detail = await fn();
      if (detail && typeof detail === 'object' && detail.skip) {
        results.push({ name, ok: true, skipped: true, detail: detail.skip });
        log(`  skip ${name}  (${detail.skip})`);
        return;
      }
      results.push({ name, ok: true, detail: detail || '' });
      log(`  ok   ${name}${detail ? '  (' + detail + ')' : ''}`);
    } catch (e) {
      results.push({ name, ok: false, detail: String(e.message || e).split('\n').slice(0, 12).join(' / ') });
      log(`  FAIL ${name}: ${String(e.message || e).split('\n').slice(0, 30).join(' / ')}`);
    }
  };
  const open = async (url, hash = '') => { await d.goto('about:blank'); await d.goto(url + hash); await d.wait(appReady, [], 20000, 'アプリの起動'); };

  try {
    const siteUrl = buildSite(path.join(FIXTURES, 'site'), path.join(work, 'site.html'));
    const viewerUrl = pathToFileURL(VIEWER).href;

    // ------------------------------------------------------------ 閲覧モード
    await step('起動: 開始画面が表示され、初期化でエラーが出ていない', async () => {
      await open(viewerUrl);
      const r = await d.exec(() => ({
        view: window.MDV.app.state.view, mode: window.MDV.app.state.mode, locked: window.MDV.app.state.mediaLocked,
        root: document.getElementById('mdv-root').textContent.indexOf('mdfolio:') === 0,
        buttons: !!document.querySelector('.mdv-open-folder') && !!document.querySelector('.mdv-open-files'),
        csp: document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').length,
        picker: typeof window.showDirectoryPicker, ua: navigator.userAgent
      }));
      assert.deepEqual({ view: r.view, mode: r.mode, locked: r.locked, root: r.root, buttons: r.buttons, csp: r.csp }, { view: 'welcome', mode: 'viewer', locked: true, root: false, buttons: true, csp: 2 });
      return `フォルダ選択 API: ${r.picker === 'function' ? 'あり' : 'なし（<input> 方式を使う）'}`;
    });

    await step('ファイルを開く（<input type="file">）: 選んだ文書を読み込んで表示する', async () => {
      const files = [path.join(FIXTURES, 'single/one.md'), path.join(FIXTURES, 'single/other.md')];
      await d.sendKeys('.mdv-input-files', files.join('\n'));
      await d.wait(() => window.MDV.app.state.view === 'doc' && !!document.querySelector('.mdv-prose h1'), [], 20000, '文書の表示');
      const r = await d.exec(() => ({ docs: window.MDV.app.state.set.docs.slice(), h1: document.querySelector('.mdv-prose h1').textContent.replace('#', '').trim(), hash: location.hash }));
      assert.deepEqual(r.docs.slice().sort(), ['one.md', 'other.md']);
      return `表示: ${r.h1}`;
    });

    await step('フォルダを開く（<input webkitdirectory>）: フォルダの構造ごと読み込める', async () => {
      await open(viewerUrl);
      const supported = await d.exec(() => 'webkitdirectory' in HTMLInputElement.prototype);
      if (!supported) return { skip: 'このエンジンは webkitdirectory に対応していない' };
      try {
        await d.sendKeys('.mdv-input-dir', path.join(FIXTURES, 'nav'));
      } catch (e) {
        return { skip: '自動操作ではフォルダを指定できない（手動での確認が必要）' };
      }
      const ok = await d.wait(() => window.MDV.app.state.view === 'doc', [], 8000, 'フォルダの読み込み').then(() => true, () => false);
      if (!ok) return { skip: '自動操作ではフォルダを指定できない（手動での確認が必要）' };
      const r = await d.exec(() => ({ docs: window.MDV.app.state.set.docs.slice(), nav: document.querySelectorAll('.mdv-sidenav a').length }));
      assert.ok(r.docs.includes('b/c.md'), 'サブフォルダの文書: ' + r.docs.join(', '));
      assert.ok(r.nav >= 3, 'カスタムナビ');
      return `文書 ${r.docs.length} 件`;
    });

    // ------------------------------------------------------------ サイトモード
    await step('書き出したサイト: 開くだけで表示され、埋め込み画像（PNG・SVG）が出る', async () => {
      await open(siteUrl);
      await d.wait(headingIs, ['テスト用サイト'], 20000, 'ホーム文書');
      await d.wait(() => { const list = Array.from(document.querySelectorAll('.mdv-prose img')); return list.length === 3 && list.every((i) => i.complete && i.naturalWidth > 0); }, [], 20000, '画像');
      const r = await d.exec(() => ({
        mode: window.MDV.app.state.mode, widths: Array.from(document.querySelectorAll('.mdv-prose img')).map((i) => i.naturalWidth),
        tree: document.querySelectorAll('.mdv-side-tree a').length, toc: document.querySelectorAll('.mdv-toc .mdv-toc-link').length,
        title: document.title, overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        header: Math.round(document.querySelector('.mdv-header').getBoundingClientRect().height),
        sidebar: document.querySelector('.mdv-sidebar').getBoundingClientRect().width > 0 || window.innerWidth < 800
      }));
      assert.deepEqual(r, { mode: 'site', widths: [64, 120, 64], tree: 11, toc: 5, title: 'テスト用サイト - site', overflow: false, header: 52, sidebar: true });
    });

    await step('記法: 表・コードの色分け・数式（KaTeX）・図（Mermaid）・脚注・タスクリスト', async () => {
      await d.exec(() => { location.hash = '#/syntax.md'; });
      await d.wait(headingIs, ['記法'], 20000, '記法の文書');
      await d.wait(() => document.querySelectorAll('.mdv-mermaid svg').length >= 1 && document.querySelectorAll('.mdv-mermaid-error').length >= 1, [], 30000, '図の描画');
      const r = await d.exec(() => {
        const p = document.querySelector('.mdv-prose');
        return {
          katex: p.querySelectorAll('.katex').length >= 2, katexCss: !!document.querySelector('style[data-mdv-dyn="katex-css"]'),
          mathWidth: p.querySelector('.katex').getBoundingClientRect().width > 10,
          mermaidNodes: p.querySelectorAll('.mdv-mermaid svg .node').length >= 2,
          hljs: p.querySelectorAll('.mdv-code pre span[class^="hljs-"]').length > 0,
          code: p.querySelector('.mdv-code pre').textContent,
          tables: p.querySelectorAll('.mdv-table-wrap table').length >= 2, footnotes: p.querySelectorAll('.footnotes li').length >= 1,
          tasks: Array.from(p.querySelectorAll('input[type="checkbox"]')).map((b) => b.checked + ':' + b.disabled + ':' + (b.getAttribute('aria-label') ? '名前あり' : '名前なし')),
          alerts: p.querySelectorAll('.markdown-alert').length >= 1, libs: JSON.stringify(window.MDV.app.state.libs),
          wideTable: p.querySelectorAll('.mdv-table-wrap[tabindex="0"]').length
        };
      });
      assert.deepEqual(r, {
        katex: true, katexCss: true, mathWidth: true, mermaidNodes: true, hljs: true, code: 'const x = 1;\n', tables: true, footnotes: true,
        tasks: ['false:true:名前あり', 'true:true:名前あり'], alerts: true, libs: '{"katex":true,"mermaid":true}', wideTable: 1
      });
      return 'あとから読み込むスクリプト（CSP のハッシュで許可）も実行できる';
    });

    if (shots) {
      await d.exec(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 300));
      await shots('syntax');
    }

    await step('文字コード: Shift_JIS と UTF-16 の文書を正しく表示する', async () => {
      await d.exec(() => { location.hash = '#/sjis.md'; });
      await d.wait(headingIs, ['シフトJISの文書'], 20000, 'Shift_JIS');
      await d.exec(() => { location.hash = '#/utf16.md'; });
      await d.wait(headingIs, ['UTF-16 の文書'], 20000, 'UTF-16');
      await d.exec(() => { location.hash = '#/' + encodeURIComponent('日本語 フォルダ') + '/' + encodeURIComponent('仕様書 v1.0.md'); });
      await d.wait(() => window.MDV.app.state.current === '日本語 フォルダ/仕様書 v1.0.md', [], 20000, '日本語のパス');
    });

    await step('検索: 入力すると結果が出て、開くと一致語に印が付く', async () => {
      await d.wait(() => { const s = window.MDV.app.state.set; return !s.indexing && s.indexed === s.docs.length; }, [], 30000, '索引');
      await d.exec(() => { const i = document.querySelector('.mdv-search-input'); i.focus(); i.value = 'イプシロン'; i.dispatchEvent(new Event('input', { bubbles: true })); });
      await d.wait(() => document.querySelectorAll('.mdv-search-item').length === 1, [], 10000, '検索結果');
      const title = await d.exec(() => document.querySelector('.mdv-search-item').textContent);
      await d.exec(() => document.querySelector('.mdv-search-item').click());
      await d.wait(headingIs, ['シフトJISの文書'], 20000, '結果の文書');
      await d.wait(() => document.querySelectorAll('mark.mdv-hit').length > 0, [], 10000, '一致語の印');
      assert.ok(title.includes('シフトJIS'));
      // 全角・半角、大文字・小文字を区別しない
      await d.exec(() => { const i = document.querySelector('.mdv-search-input'); i.value = 'ＭＡＲＫＤＯＷＮ'; i.dispatchEvent(new Event('input', { bubbles: true })); });
      await d.wait(() => document.querySelectorAll('.mdv-search-item').length >= 2, [], 10000, '全角での検索');
      await d.exec(() => { const i = document.querySelector('.mdv-search-input'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); });
    });

    await step('移動: リンク・戻る・進む・ページ内の見出し・URL を直接開く', async () => {
      await d.exec(() => { location.hash = '#/README.md'; });
      await d.wait(headingIs, ['テスト用サイト'], 20000, 'ホーム');
      await d.exec(() => Array.from(document.querySelectorAll('.mdv-prose a')).find((a) => a.textContent.indexOf('イントロ') >= 0).click());
      await d.wait(headingIs, ['イントロダクション'], 20000, 'リンク先');
      await d.exec(() => history.back());
      await d.wait(headingIs, ['テスト用サイト'], 20000, '戻る');
      await d.exec(() => history.forward());
      await d.wait(headingIs, ['イントロダクション'], 20000, '進む');
      const route = '#/guide/intro.md#' + encodeURIComponent('末尾');
      await open(siteUrl, route);
      await d.wait(headingIs, ['イントロダクション'], 20000, '直接開く');
      const r = await d.wait(() => { const el = document.getElementById('user-content-末尾'); const rect = el && el.getBoundingClientRect(); return rect && window.scrollY > 300 && rect.top >= 52 && rect.bottom <= window.innerHeight ? { y: Math.round(window.scrollY) } : false; }, [], 20000, '見出しの位置');
      return `スクロール位置 ${r.y}px`;
    });

    await step('テーマと言語: 切り替わり、再読み込みしても保たれる（設定の保存）', async () => {
      await open(siteUrl);
      await d.wait(headingIs, ['テスト用サイト'], 20000, 'ホーム');
      const before = await d.exec(() => ({ theme: document.documentElement.getAttribute('data-theme'), lang: document.documentElement.lang }));
      await d.click('.mdv-btn-theme');
      await d.click('.mdv-btn-theme');
      const dark = await d.exec(() => ({ theme: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor }));
      assert.deepEqual(dark, { theme: 'dark', bg: 'rgb(15, 23, 34)' });
      await d.click('.mdv-btn-menu');
      await d.wait(() => !document.querySelector('.mdv-menu').hidden, [], 5000, 'メニュー');
      await d.click('.mdv-menu-item[data-action="menuLanguage"]');
      const other = before.lang === 'ja' ? 'en' : 'ja';
      await d.wait((l) => document.documentElement.lang === l, [other], 5000, '言語');
      await d.refresh();
      await d.wait(appReady, [], 20000, '再読み込み');
      const after = await d.exec(() => ({ theme: document.documentElement.getAttribute('data-theme'), lang: document.documentElement.lang, stored: !!localStorage.getItem('mdv:settings:v1') }));
      assert.deepEqual(after, { theme: 'dark', lang: other, stored: true });
      // 元に戻す
      await d.exec(() => { localStorage.removeItem('mdv:settings:v1'); });
      return `言語 ${before.lang} → ${other}、テーマ ダーク`;
    });

    // ------------------------------------------------------------ セキュリティ
    await step('文書の中のスクリプトは実行されない（XSS の確認用文書）', async () => {
      await open(siteUrl, '#/xss.md');
      await d.wait(headingIs, ['XSS'], 20000, 'XSS の文書');
      await d.wait(() => !!document.querySelector('.mdv-mermaid svg, .mdv-mermaid-error'), [], 30000, '図');
      await new Promise((r) => setTimeout(r, 500));
      const r = await d.exec(() => {
        const p = document.querySelector('.mdv-prose');
        return {
          xss: typeof window.__xss,
          handlers: Array.from(p.querySelectorAll('*')).reduce((n, el) => n + Array.from(el.attributes).filter((a) => /^on/i.test(a.name)).length, 0),
          bad: p.querySelectorAll('script, iframe, form, object, embed, link, meta, base, textarea, select').length,
          jsLinks: p.querySelectorAll('a[href^="javascript" i], a[href^="data:" i], a[href^="file:" i]').length,
          root: !!document.getElementById('mdv-root').querySelector('.mdv-app'),
          display: getComputedStyle(document.querySelector('.mdv-header')).display
        };
      });
      assert.deepEqual(r, { xss: 'undefined', handlers: 0, bad: 0, jsLinks: 0, root: true, display: 'flex' });
    });

    await step('CSP: eval・あとから足したスクリプト・イベント属性・通信は実行できない', async () => {
      sink.hits.length = 0;
      const r = await d.execAsync(async (origin) => {
        const out = {};
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        await wait(20);
        // 自動操作用のスクリプトは、ブラウザーによってはページとは別の権限で動く。ページ自身の eval を使って確かめる
        try { out.eval = String(window.eval('1 + 1')); } catch (e) { out.eval = 'blocked'; }
        try { out.fn = String(new window.Function('return 1')()); } catch (e) { out.fn = 'blocked'; }
        const s = document.createElement('script'); s.textContent = 'window.__inline = 1'; document.head.appendChild(s);
        out.inline = typeof window.__inline;
        const el = document.createElement('div'); el.setAttribute('onclick', 'window.__handler = 1'); document.body.appendChild(el); el.click();
        out.handler = typeof window.__handler;
        try { await fetch(origin + '/fetch', { mode: 'no-cors' }); out.fetch = 'sent'; } catch (e) { out.fetch = 'blocked'; }
        const ext = document.createElement('script'); ext.src = origin + '/script.js'; document.head.appendChild(ext);
        const f = document.createElement('iframe'); f.src = origin + '/frame.html'; document.body.appendChild(f);
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = origin + '/style.css'; document.head.appendChild(l);
        out.image = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve('loaded'); i.onerror = () => resolve('blocked'); i.src = origin + '/image.png'; });
        await wait(600);
        return out;
      }, sink.origin);
      assert.deepEqual(r, { eval: 'blocked', fn: 'blocked', inline: 'undefined', handler: 'undefined', fetch: 'blocked', image: 'blocked' });
      assert.deepEqual(sink.hits, [], 'サーバーに届いた通信');
    });

    let vectorsUrl = '';
    await step('外部への通信: 既定では、図の中の画像指定を含めて 1 件も届かない（あとから追加した CSP が効いている）', async () => {
      sink.hits.length = 0;
      const O = sink.origin;
      const dir = writeTree(path.join(work, 'vectors'), {
        'README.md': `# 通信の確認\n\n![md](${O}/md-image.png)\n\n<img src="${O}/html-image.png" alt="h">\n\n<video src="${O}/video.mp4"></video>\n\n<div style="background:url(${O}/style-bg.png)">x</div>\n\n<link rel="stylesheet" href="${O}/link.css">\n\n<iframe src="${O}/iframe.html"></iframe>\n`,
        'm-shape.md': `# m-shape\n\n\`\`\`mermaid\nflowchart LR\n  A@{ img: "${O}/mermaid-shape.png", label: "L", w: 60, h: 60 } --> B\n\`\`\`\n`,
        'm-label.md': `# m-label\n\n\`\`\`mermaid\nflowchart LR\n  A["<img src='${O}/mermaid-label.png'>"] --> B\n\`\`\`\n`,
        'm-themecss.md': `# m-themecss\n\n\`\`\`mermaid\n%%{init: {"themeCSS": ".nodeLabel { background-image: url(${O}/mermaid-themecss.png) }"}}%%\nflowchart LR\n  A --> B\n\`\`\`\n`
      });
      vectorsUrl = buildSite(dir, path.join(work, 'vectors.html'));
      await open(vectorsUrl);
      await d.wait(headingIs, ['通信の確認'], 20000, '文書');
      for (const name of ['m-shape', 'm-label', 'm-themecss']) {
        await d.exec((n) => { location.hash = '#/' + n + '.md'; }, name);
        await d.wait(headingIs, [name], 20000, name);
        await d.wait(() => !!document.querySelector('.mdv-mermaid svg, .mdv-mermaid-error'), [], 30000, '図');
        await new Promise((r) => setTimeout(r, 700));
      }
      const locked = await d.exec(() => window.MDV.app.state.mediaLocked);
      assert.equal(locked, true);
      assert.deepEqual(sink.hits, [], 'サーバーに届いた通信');
    });

    await step('外部の画像を許可: 確認 → 再読み込み → 画像・動画だけが読み込まれる。戻すとその場で止まる', async () => {
      sink.hits.length = 0;
      await open(vectorsUrl);
      await d.wait(headingIs, ['通信の確認'], 20000, '文書');
      await d.click('.mdv-btn-menu');
      await d.wait(() => !document.querySelector('.mdv-menu').hidden, [], 5000, 'メニュー');
      await d.click('.mdv-menu-item[data-action="menuExternalImages"]');
      await d.wait(() => !!document.querySelector('dialog.mdv-dialog-external[open]'), [], 5000, '確認ダイアログ');
      assert.deepEqual(sink.hits, []);
      await d.exec(() => { window.__beforeReload = true; });
      await d.click('.mdv-external-run');
      await d.wait(() => window.__beforeReload === undefined && !!(window.MDV && window.MDV.app) && window.MDV.app.state.mediaLocked === false, [], 20000, '再読み込み');
      await d.wait(headingIs, ['通信の確認'], 20000, '文書');
      await d.wait(() => { const i = document.querySelector('.mdv-prose img'); return !!i && i.complete && i.naturalWidth === 64; }, [], 20000, '外部の画像');
      await new Promise((r) => setTimeout(r, 800));
      const got = Array.from(new Set(sink.hits)).sort();
      assert.ok(got.includes('/md-image.png') && got.includes('/html-image.png'), '画像: ' + got.join(', '));
      for (const never of ['/style-bg.png', '/link.css', '/iframe.html']) assert.ok(!got.includes(never), `${never} は読み込まない`);
      // 表示しない側へ戻す（確認なし・その場で反映）
      await d.click('.mdv-btn-menu');
      await d.wait(() => !document.querySelector('.mdv-menu').hidden, [], 5000, 'メニュー');
      await d.click('.mdv-menu-item[data-action="menuExternalImages"]');
      await d.wait(() => window.MDV.app.state.mediaLocked === true && !document.querySelector('.mdv-prose img'), [], 10000, '遮断');
      const before = sink.hits.length;
      const probe = await d.execAsync((origin) => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve('loaded'); i.onerror = () => resolve('blocked'); i.src = origin + '/after-off.png'; }), sink.origin);
      assert.equal(probe, 'blocked');
      assert.equal(sink.hits.length, before, '遮断後の通信');
      await d.exec(() => { localStorage.removeItem('mdv:settings:v1'); });
      return `許可中に届いたもの: ${got.join(', ')}`;
    });

    // ------------------------------------------------------------ 別のページの中に埋め込んだ場合
    await step('埋め込み（srcdoc のフレーム）: 表示でき、リンク・戻るで移動できる', async () => {
      // srcdoc では、文書の URL（about:srcdoc）とリンクの基準 URL（親ページ）が異なる。
      // リンクをブラウザーに任せると、フレームが親ページの URL へ移動してしまう
      const html = fs.readFileSync(path.join(work, 'site.html'), 'utf8');
      const host = await serve(hostPage(`<iframe id="page" sandbox="allow-scripts allow-same-origin" srcdoc="${html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`), '127.0.0.1');
      try {
        await d.goto('about:blank');
        await d.goto(host.url);
        await d.frame(0);
        await d.wait(appReady, [], 20000, 'フレームの中のアプリ');
        await d.wait(headingIs, ['テスト用サイト'], 20000, 'ホーム');
        const env = await d.exec(() => ({ href: location.href.split('#')[0], sameBase: document.baseURI.split('#')[0] === location.href.split('#')[0] }));
        assert.deepEqual(env, { href: 'about:srcdoc', sameBase: false });
        await d.click('.mdv-side-tree a[href="#/syntax.md"]');
        await d.wait(headingIs, ['記法'], 20000, 'リンク先');
        const after = await d.exec(() => location.href);
        assert.equal(after, 'about:srcdoc#/syntax.md');
        await d.exec(() => history.back());
        await d.wait(headingIs, ['テスト用サイト'], 20000, '戻る');
        return 'フレームの URL は about:srcdoc のまま';
      } finally {
        await d.frame(null).catch(() => {});
        await host.close();
      }
    });

    await step('埋め込み（別オリジンのサンドボックス化したフレーム）: 公開ページ用に変換した HTML が動く', async () => {
      const hosted = path.join(work, 'hosted.html');
      execFileSync(process.execPath, [path.join(ROOT, 'tools/dev/make-hosted.mjs'), path.join(work, 'site.html'), hosted], { cwd: ROOT });
      const csp = ["default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'", 'font-src data:', 'img-src data: blob:', 'media-src data: blob:', "connect-src 'none'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'"].join('; ');
      const runtime = '<script>window.__hostRuntime = 1;</script>';
      const inner = await serve(fs.readFileSync(hosted, 'utf8').replace('<head>\n', '<head>\n' + runtime + '\n'), '127.0.0.1', { 'content-security-policy': csp });
      const outer = await serve(hostPage(`<iframe id="page" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src="${inner.url}"></iframe>`), 'localhost');
      try {
        await d.goto('about:blank');
        await d.goto(outer.url);
        await d.frame(0);
        await d.wait(appReady, [], 20000, 'フレームの中のアプリ');
        await d.wait(headingIs, ['テスト用サイト'], 20000, 'ホーム');
        const start = await d.exec(() => {
          const c = window.MDV.app.state.config;
          return { runtime: window.__hostRuntime, mode: window.MDV.app.state.mode, locked: window.MDV.app.state.mediaLocked, flags: [c.allowDownloads, c.lockExternalImages, c.hosted], ownCsp: document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]:not([data-mdv-dyn])').length };
        });
        assert.deepEqual(start, { runtime: 1, mode: 'site', locked: true, flags: [false, true, true], ownCsp: 0 });
        // メニューに、動かない項目（書き出し・外部の画像）がない
        await d.click('.mdv-btn-menu');
        await d.wait(() => !document.querySelector('.mdv-menu').hidden, [], 5000, 'メニュー');
        const actions = await d.exec(() => Array.from(document.querySelectorAll('.mdv-menu-item')).filter((b) => !b.hidden).map((b) => b.getAttribute('data-action')));
        assert.deepEqual(actions, ['menuLanguage', 'menuHelp', 'menuAbout']);
        await d.keys('\uE00C');
        // 画像（blob:）。画面に入ってから読み込む（loading="lazy"）ので、先にその位置まで動かす
        await d.exec(() => { document.querySelector('.mdv-prose img').scrollIntoView({ block: 'center' }); });
        await d.wait(() => { const i = document.querySelector('.mdv-prose img'); return !!i && i.complete && i.naturalWidth > 0; }, [], 20000, '埋め込みの画像');
        // あとから読み込むライブラリ（数式・図）
        await d.click('.mdv-side-tree a[href="#/syntax.md"]');
        await d.wait(headingIs, ['記法'], 20000, 'リンク先');
        await d.wait(() => document.querySelectorAll('.katex').length >= 2 && !!document.querySelector('.mdv-mermaid svg'), [], 40000, '数式と図');
        // コードのコピー（フレームの中では、ブラウザーによって結果が異なる。どちらの場合も、結果を正しく表示する）
        await d.click('.mdv-code .mdv-copy');
        // 画面の言語はブラウザーの設定によって変わるので、表示中の言語の文言と比べる
        const copy = await d.wait(() => { const T = window.MDV.i18n[document.documentElement.lang]; const text = document.querySelector('.mdv-code .mdv-copy').textContent; return text === T.copied ? 'copied' : text === T.copyFailed ? 'copyFailed' : false; }, [], 10000, 'コピーの結果');
        // 添付は保存を始めず、保存できないことを伝える
        await d.exec(() => { location.hash = '#/README.md'; });
        await d.wait(headingIs, ['テスト用サイト'], 20000, 'ホーム');
        await d.exec(() => Array.from(document.querySelectorAll('.mdv-prose a')).find((a) => a.textContent.indexOf('添付 CSV') >= 0).click());
        await d.wait(() => !!document.querySelector('.mdv-empty-body'), [], 10000, '添付の説明');
        const message = await d.exec(() => { const T = window.MDV.i18n[document.documentElement.lang]; return { expected: document.querySelector('.mdv-empty-body').textContent === T.assetNoSave.replace('{0}', 'data.csv'), button: document.querySelectorAll('.mdv-download').length }; });
        assert.deepEqual(message, { expected: true, button: 0 });
        return `コードのコピー: ${copy === 'copied' ? 'できる' : 'このブラウザーではできない（できないと表示する）'}`;
      } finally {
        await d.frame(null).catch(() => {});
        await outer.close();
        await inner.close();
      }
    });

    // ------------------------------------------------------------ 隣の mdfolio.css（SPEC 3.10）
    await step('隣の mdfolio.css: 書き出したサイトの隣に置くと、本文・図の見た目に反映される', async () => {
      const dir = path.join(work, 'style');
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'dist/sample-site.html'), path.join(dir, 'site.html'));
      // 利用者の CSS（配色の変数と本文の規則）
      fs.writeFileSync(path.join(dir, 'mdfolio.css'), ':root { --accent: #8A1C14; }\n.mdv-prose h2 { color: #0B6E80; }\n');
      await d.goto('about:blank');
      await d.goto(pathToFileURL(path.join(dir, 'site.html')).href + '#/guide/' + encodeURIComponent('Markdown記法') + '.md');
      await d.wait(appReady, [], 20000, 'アプリ');
      await d.wait(headingIs, ['Markdown 記法'], 20000, '記法の文書');
      await d.wait(() => document.querySelectorAll('.mdv-mermaid svg').length === 2, [], 20000, '図');
      const r = await d.exec(() => ({
        link: getComputedStyle(document.querySelector('.mdv-prose a')).color,
        h2: getComputedStyle(document.querySelector('.mdv-prose h2')).color,
        diagram: /#8A1C14|rgb\(138, ?28, ?20\)/i.test(document.querySelector('.mdv-mermaid svg').outerHTML)
      }));
      assert.deepEqual(r, { link: 'rgb(138, 28, 20)', h2: 'rgb(11, 110, 128)', diagram: true });
      // インラインのスクリプトは実行されない（CSP。style-src を広げてもスクリプトの許可は変わらない）
      await d.exec(() => { const el = document.createElement('script'); el.textContent = 'window.__styleInjected = 1'; document.body.appendChild(el); });
      await new Promise((res) => setTimeout(res, 200));
      assert.equal(await d.exec(() => window.__styleInjected === undefined), true);
      return 'CSS の変更が本文・図に反映される';
    });

    await step('狭い画面: 横にはみ出さず、サイドバーはドロワーになる', async () => {
      await d.setSize(420, 800);
      await open(siteUrl);
      await d.wait(headingIs, ['テスト用サイト'], 20000, 'ホーム');
      const r = await d.exec(() => ({ w: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth + 1, drawer: document.querySelector('.mdv-sidebar').getBoundingClientRect().right <= 0 || getComputedStyle(document.querySelector('.mdv-sidebar')).visibility === 'hidden' }));
      await d.setSize(1280, 900);
      if (r.w > 799) return { skip: `ウィンドウを狭くできなかった（幅 ${r.w}px）` };
      assert.deepEqual({ overflow: r.overflow, drawer: r.drawer }, { overflow: false, drawer: true });
      return `幅 ${r.w}px`;
    });
  } finally {
    await sink.close();
  }
  return results;
}
