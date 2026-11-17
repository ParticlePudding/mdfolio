// Checks of the public pages (tools/dev/make-pages.mjs) (SPEC 8.7)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

/** Extracts the full license notices embedded in a page. */
function licensesOf(rel) {
  const file = path.join(out, rel);
  const html = fs.readFileSync(file, 'utf8');
  const pre = /<pre class="licenses"[^>]*>([\s\S]*?)<\/pre>/.exec(html);
  if (pre) return unescapeHtml(pre[1]);
  const block = core.findBlock(core.extractParts(html), 'mdv-res-licenses');
  assert.ok(block, rel + ' has no license notices block');
  return JSON.parse(block.text);
}

describe('Public pages', () => {
  before(() => {
    if (!fs.existsSync(path.join(ROOT, 'dist/mdfolio.html'))) execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs')], { cwd: ROOT, stdio: 'ignore' });
    out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-pages-')), 'pages');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/dev/make-pages.mjs'), out], { cwd: ROOT, stdio: 'ignore' });
  });
  after(() => fs.rmSync(path.dirname(out), { recursive: true, force: true }));

  test('Has the English (top) and Japanese (ja/) landing pages, samples, custom look samples and documentation, plus the viewer and .nojekyll (PG-1)', () => {
    const files = walk(out);
    for (const dir of ['', 'ja/']) {
      for (const f of ['index.html', 'sample-site.html', 'mdfolio-docs.html', 'style/sample-site.html', 'style/mdfolio.css']) assert.ok(files.includes(dir + f), dir + f);
      assert.ok(!files.some((f) => f.startsWith(dir + 'folder/')), 'no folder version sample (removed in 1.3.0)');
    }
    assert.ok(files.includes('mdfolio.html'));
    assert.ok(files.includes('.nojekyll'));
    assert.ok(!files.includes('ja/mdfolio.html'), 'only one viewer');
    // The former English landing page (en/) is only a redirect to the top (SPEC PG-1)
    assert.deepEqual(files.filter((f) => f.startsWith('en/')), ['en/index.html']);
    const moved = fs.readFileSync(path.join(out, 'en/index.html'), 'utf8');
    assert.ok(moved.includes('<meta http-equiv="refresh" content="0; url=../">') && moved.includes('<a href="../">'));
    assert.ok(!/<script\b/i.test(moved));
  });

  test('Every HTML file contains LICENSE and the full license notices of the bundled libraries', () => {
    const pages = walk(out).filter((f) => f.endsWith('.html') && f !== 'en/index.html');
    assert.equal(pages.length, 9);
    // The CSS of the custom look sample is a copy of examples/mdfolio.css
    for (const dir of ['', 'ja/']) assert.equal(fs.readFileSync(path.join(out, dir, 'style/mdfolio.css'), 'utf8'), fs.readFileSync(path.join(ROOT, 'examples/mdfolio.css'), 'utf8'));
    for (const rel of pages) {
      const text = licensesOf(rel);
      assert.ok(text.includes(LICENSE), rel + ': LICENSE');
      assert.ok(text.includes(NOTICES), rel + ': THIRD-PARTY-NOTICES.txt');
      assert.ok(text.includes('Copyright (c) 2026 Particle Pudding'), rel);
    }
  });

  test('The landing pages use no scripts and load nothing external (PG-7)', () => {
    for (const rel of ['index.html', 'ja/index.html']) {
      const html = fs.readFileSync(path.join(out, rel), 'utf8');
      assert.equal(/<html lang="([a-z]+)">/.exec(html)[1], rel === 'index.html' ? 'en' : 'ja', rel + ': the top page is English (SPEC 1.11)');
      assert.ok(!/<script\b/i.test(html), rel + ': <script>');
      assert.ok(/<meta http-equiv="Content-Security-Policy" content="default-src 'none';/.test(html), rel + ': CSP');
      const srcs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
      for (const u of srcs.filter((x) => /^https?:/.test(x))) assert.match(u, /^https:\/\/(github\.com\/ParticlePudding\/mdfolio|particlepudding\.github\.io\/mdfolio\/)/, rel + ': ' + u);
      assert.ok(!/<(img|link rel="stylesheet")[^>]+https?:/.test(html), rel + ': external loading');
    }
  });

  test('The interface language of the samples is fixed to the language of the documents (PG-3)', () => {
    for (const [rel, lang] of [['style/sample-site.html', 'en'], ['ja/style/sample-site.html', 'ja'], ['sample-site.html', 'en'], ['ja/sample-site.html', 'ja'], ['mdfolio-docs.html', 'en'], ['ja/mdfolio-docs.html', 'ja']]) {
      const html = fs.readFileSync(path.join(out, rel), 'utf8');
      const text = core.findBlock(core.extractParts(html), 'mdv-config').text;
      assert.equal(JSON.parse(text).lang, lang, rel);
    }
  });
});
