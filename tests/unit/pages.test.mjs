// 公開ページの一式（tools/dev/make-pages.mjs）の確認（SPEC 8.7）
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { ROOT, core } from '../helpers/load.mjs';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n?/g, '\n').trim();
const LICENSE = read('LICENSE');
const NOTICES = read('THIRD-PARTY-NOTICES.txt');
let out;

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}
const unescapeHtml = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** ページに埋め込まれたライセンス表記の全文を取り出す。 */
function licensesOf(rel) {
  const file = path.join(out, rel);
  const html = fs.readFileSync(file, 'utf8');
  if (rel.endsWith('folder/index.html')) {
    // フォルダ版は lib/resources.js に持つ（index.html が読み込む）
    assert.ok(html.includes('<script src="lib/resources.js"></script>'), rel);
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(path.dirname(file), 'lib/resources.js'), 'utf8'), sandbox);
    return sandbox.window.MDV_DATA['mdv-res-licenses'];
  }
  const pre = /<pre class="licenses"[^>]*>([\s\S]*?)<\/pre>/.exec(html);
  if (pre) return unescapeHtml(pre[1]);
  const block = core.findBlock(core.extractParts(html), 'mdv-res-licenses');
  assert.ok(block, rel + ' にライセンス表記のブロックがない');
  return JSON.parse(block.text);
}

describe('公開ページ', () => {
  before(() => {
    if (!fs.existsSync(path.join(ROOT, 'dist/mdfolio.html'))) execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs')], { cwd: ROOT, stdio: 'ignore' });
    out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-pages-')), 'pages');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/dev/make-pages.mjs'), out], { cwd: ROOT, stdio: 'ignore' });
  });
  after(() => fs.rmSync(path.dirname(out), { recursive: true, force: true }));

  test('日本語と英語の案内・見本・説明書と、ビューア、.nojekyll がそろっている（PG-1）', () => {
    const files = walk(out);
    for (const dir of ['', 'en/']) {
      for (const f of ['index.html', 'sample-site.html', 'mdfolio-docs.html', 'folder/index.html', 'folder/docs/_sidebar.md']) assert.ok(files.includes(dir + f), dir + f);
    }
    assert.ok(files.includes('mdfolio.html'));
    assert.ok(files.includes('.nojekyll'));
    assert.ok(!files.includes('en/mdfolio.html'), 'ビューアは 1 つだけ');
  });

  test('すべての HTML に、LICENSE と同梱ライブラリのライセンス表記の全文が入っている', () => {
    const pages = walk(out).filter((f) => f.endsWith('.html'));
    assert.equal(pages.length, 9);
    for (const rel of pages) {
      const text = licensesOf(rel);
      assert.ok(text.includes(LICENSE), rel + ': LICENSE');
      assert.ok(text.includes(NOTICES), rel + ': THIRD-PARTY-NOTICES.txt');
      assert.ok(text.includes('Copyright (c) 2026 Particle Pudding'), rel);
    }
  });

  test('案内のページはスクリプトを使わず、外部への読み込みがない（PG-7）', () => {
    for (const rel of ['index.html', 'en/index.html']) {
      const html = fs.readFileSync(path.join(out, rel), 'utf8');
      assert.ok(!/<script\b/i.test(html), rel + ': <script>');
      assert.ok(/<meta http-equiv="Content-Security-Policy" content="default-src 'none';/.test(html), rel + ': CSP');
      const srcs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
      for (const u of srcs.filter((x) => /^https?:/.test(x))) assert.match(u, /^https:\/\/(github\.com\/ParticlePudding\/mdfolio|particlepudding\.github\.io\/mdfolio\/)/, rel + ': ' + u);
      assert.ok(!/<(img|link rel="stylesheet")[^>]+https?:/.test(html), rel + ': 外部の読み込み');
    }
  });

  test('見本の画面の言語は文書の言語に固定されている（PG-3）', () => {
    for (const [rel, lang] of [['folder/index.html', 'ja'], ['en/folder/index.html', 'en'], ['sample-site.html', 'ja'], ['en/sample-site.html', 'en'], ['mdfolio-docs.html', 'ja'], ['en/mdfolio-docs.html', 'en']]) {
      const html = fs.readFileSync(path.join(out, rel), 'utf8');
      const text = rel.includes('folder/') ? /id="mdv-config">([^<]*)</.exec(html)[1] : core.findBlock(core.extractParts(html), 'mdv-config').text;
      assert.equal(JSON.parse(text).lang, lang, rel);
    }
  });
});
