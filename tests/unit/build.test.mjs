// Checks of the build output (dist/mdfolio.html), the build and distribution (NFR-1, NFR-3, NFR-6, SEC-3, FR-802, SPEC chapter 8)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT, core } from '../helpers/load.mjs';

const VIEWER = path.join(ROOT, 'dist/mdfolio.html');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha256Hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const sha256Base64 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('base64');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-build-'));

const html = fs.readFileSync(VIEWER, 'utf8');
const parts = core.extractParts(html);
const block = (id) => core.findBlock(parts, id);
const manifest = JSON.parse(read('vendor/manifest.json'));
const pkg = JSON.parse(read('package.json'));

describe('Structure of the build output (SPEC 8.2)', () => {
  test('CSP: allows only the built-in CSS and the neighboring mdfolio.css, and scripts only by hash (SEC-4, SPEC 3.10)', () => {
    const csp = parts.csp;
    assert.match(csp, /(?:^|; )style-src 'self' file: 'unsafe-inline'(?:;|$)/);
    assert.match(csp, /(?:^|; )script-src 'sha256-[^;]+(?:;|$)/);
    assert.ok(!/script-src[^;]*(?:'unsafe-inline'|'self'|file:)/.test(csp), 'script permissions are not widened');
    assert.match(csp, /(?:^|; )connect-src 'none'(?:;|$)/);
  });

  test('A single HTML file that references no external files (NFR-1)', () => {
    assert.ok(html.startsWith('<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">'));
    assert.ok(html.endsWith('</body>\n</html>\n'));
    // The "skeleton" without the block contents has no external references
    let skeleton = html;
    for (const b of parts.blocks) skeleton = skeleton.replace(b.text, '');
    skeleton = skeleton.replace(parts.css, '').replace(parts.csp.replace(/&/g, '&amp;'), '');
    // Only the link to the neighboring mdfolio.css (SPEC 3.10) is allowed, as a relative reference
    const userCssLink = '<link rel="stylesheet" href="mdfolio.css" id="mdv-user-css">';
    assert.equal(skeleton.split(userCssLink).length, 2, 'there is one link to the neighboring CSS');
    skeleton = skeleton.replace(userCssLink, '');
    assert.ok(skeleton.length < 3000, 'the skeleton is small');
    assert.ok(!/(?:src|href|action|data|poster)="(?!data:)[^"]/i.test(skeleton), `has an external reference: ${skeleton}`);
    assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(skeleton));
    assert.equal((skeleton.match(/<script/g) || []).length, parts.blocks.length);
    assert.equal((skeleton.match(/<link /g) || []).length, 1, 'only the tab icon (data: URL)');
    assert.ok(skeleton.includes('<link rel="icon" href="data:image/svg+xml,'));
    assert.ok(skeleton.includes('<noscript>'));
  });

  test('Line breaks are LF only, and no special spaces or invisible characters have slipped in', () => {
    assert.ok(!html.includes('\r'));
    const bom = String.fromCharCode(0xFEFF);
    assert.ok(!html.startsWith(bom));
    // Our own sources contain no line separators or no-break spaces
    const bad = [0x2028, 0x2029, 0x00A0, 0xFEFF, 0x200B].map((c) => String.fromCharCode(c));
    for (const f of ['src/core.js', 'src/md.js', 'src/i18n.js', 'src/app.js', 'src/app.css', 'src/document.css', 'tools/build.mjs', 'tools/build-site.mjs', 'tools/vendor.mjs']) {
      const text = read(f);
      for (const ch of bad) assert.ok(!text.includes(ch), `${f} contains U+${ch.charCodeAt(0).toString(16).toUpperCase()}`);
      assert.ok(!text.includes('\r'), `${f} uses LF`);
    }
  });

  test('Order and types of the blocks', () => {
    assert.deepEqual(parts.blocks.map((b) => [b.id, b.type]), [
      ['mdv-config', 'application/json'],
      ['mdv-site', 'application/json'],
      ['mdv-res-help-ja', 'application/json'],
      ['mdv-res-help-en', 'application/json'],
      ['mdv-res-licenses', 'application/json'],
      ['mdv-res-katex-css', 'application/json'],
      ['mdv-lib-katex', 'application/json'],
      ['mdv-lib-mermaid', 'application/json'],
      ['mdv-js-vendor', ''],
      ['mdv-js-app', '']
    ]);
    // The data blocks can be parsed as JSON
    for (const b of parts.blocks.filter((x) => x.type === 'application/json')) {
      assert.doesNotThrow(() => JSON.parse(b.text), `${b.id} is JSON`);
    }
    assert.deepEqual(JSON.parse(block('mdv-config').text), { title: '', lang: 'auto', theme: 'auto', home: '', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.equal(JSON.parse(block('mdv-site').text), null);
    assert.equal(JSON.parse(block('mdv-res-help-ja').text), read('src/help.ja.md'));
    assert.equal(JSON.parse(block('mdv-res-help-en').text), read('src/help.en.md'));
  });

  test('Splitting and reassembling gives exactly the original', () => {
    assert.equal(core.composeHtml(core.extractParts(html)), html);
  });

  test('The size is 6 MB or less (NFR-3)', (t) => {
    const bytes = fs.statSync(VIEWER).size;
    t.diagnostic(`dist/mdfolio.html: ${bytes} bytes (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
    assert.ok(bytes <= 6 * 1024 * 1024);
  });
});

describe('Scripts and CSP (SEC-3)', () => {
  const policy = parts.csp;
  const hashes = (policy.match(/'sha256-[^']+'/g) || []).map((h) => h.slice(8, -1));

  test('The CSP hashes match the 4 executed scripts one to one', () => {
    const executable = [
      block('mdv-js-vendor').text,
      block('mdv-js-app').text,
      JSON.parse(block('mdv-lib-katex').text),
      JSON.parse(block('mdv-lib-mermaid').text)
    ];
    assert.deepEqual(executable.map(sha256Base64).sort(), hashes.slice().sort());
    assert.equal(new Set(hashes).size, 4);
  });

  test('The lazily loaded libraries are byte-for-byte identical to the distributed files', () => {
    const file = (id, name) => manifest.components.find((c) => c.id === id).files.find((f) => f.path.endsWith(name));
    const katex = fs.readFileSync(path.join(ROOT, 'vendor', file('katex', 'katex.min.js').path), 'utf8');
    const mermaid = fs.readFileSync(path.join(ROOT, 'vendor', file('mermaid', 'mermaid.tiny.js').path), 'utf8');
    assert.equal(JSON.parse(block('mdv-lib-katex').text), katex);
    assert.equal(JSON.parse(block('mdv-lib-mermaid').text), mermaid);
  });

  test('The inline scripts are syntactically valid and contain no sequences that break the HTML', () => {
    for (const id of ['mdv-js-vendor', 'mdv-js-app']) {
      const text = block(id).text;
      assert.doesNotThrow(() => new vm.Script(text, { filename: id }), `syntax of ${id}`);
      assert.ok(!/<\/script/i.test(text), `${id} has no </script`);
      assert.ok(!text.includes('<!--'), `${id} has no <!--`);
      assert.ok(!/<script/i.test(text), `${id} has no <script`);
      assert.ok(!/sourceMappingURL/.test(text), `${id} has no source map reference`);
    }
    for (const b of parts.blocks) {
      assert.ok(!/<\/script/i.test(b.text) && !b.text.includes('<!--'), `${b.id}`);
    }
  });

  test('The app scripts do not rely on eval or external loading', () => {
    const app = read('src/app.js') + read('src/core.js') + read('src/md.js') + read('src/i18n.js');
    assert.ok(!/\beval\s*\(/.test(app));
    assert.ok(!/new\s+Function\s*\(/.test(app));
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/.test(app), 'uses no networking features');
    assert.ok(!/document\.write|insertAdjacentHTML|outerHTML\s*=/.test(app));
    // innerHTML is assigned in only 2 places: icons (fixed SVG) and rendered diagrams (Mermaid output)
    const uses = (read('src/app.js').match(/\.innerHTML\s*=/g) || []).length;
    assert.equal(uses, 2, 'number of innerHTML assignments');
  });
});

describe('Version and manifests', () => {
  test('The version numbers match', () => {
    assert.equal(pkg.version, core.VERSION);
    assert.equal(parts.generator, 'mdfolio ' + core.VERSION);
    const out = JSON.parse(read('dist/mdfolio.manifest.json'));
    assert.equal(out.version, core.VERSION);
    assert.equal(out.bytes, fs.statSync(VIEWER).size);
    assert.equal(out.sha256, sha256Hex(fs.readFileSync(VIEWER)));
    assert.equal(out.csp, parts.csp);
    assert.deepEqual(out.blocks.map((b) => b.id), parts.blocks.map((b) => b.id));
  });

  test('The bundled libraries are unmodified and match the SHA-256 in the manifest (NFR-6)', () => {
    const ids = manifest.components.map((c) => c.id).sort();
    assert.deepEqual(ids, ['dompurify', 'highlight.js', 'katex', 'markdown-it', 'markdown-it-cjk-friendly', 'markdown-it-footnote', 'mermaid']);
    let files = 0;
    for (const c of manifest.components) {
      assert.ok(c.version && c.license && c.package, `name, version and license of ${c.id}`);
      for (const f of c.files) {
        const buf = fs.readFileSync(path.join(ROOT, 'vendor', f.path));
        assert.equal(sha256Hex(buf), f.sha256, `vendor/${f.path}`);
        assert.equal(buf.length, f.bytes);
        files++;
      }
    }
    assert.ok(files >= 40, `${files} files`);
    // No files missing from the manifest have slipped into vendor/
    const listed = new Set(manifest.components.flatMap((c) => c.files.map((f) => f.path)));
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.relative(path.join(ROOT, 'vendor'), path.join(dir, e.name)).split(path.sep).join('/')]));
    const extra = walk(path.join(ROOT, 'vendor')).filter((p) => p !== 'manifest.json' && !listed.has(p) && !/(^|\/)LICENSE/i.test(p));
    assert.deepEqual(extra, []);
  });

  test('Only allowed licenses. The diagram library is a build without the EPL / GPL component (elkjs)', () => {
    // Permissive licenses only. DOMPurify is dual-licensed and used under Apache-2.0
    const allowed = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Unlicense', 'CC0-1.0', 'BlueOak-1.0.0', '(MPL-2.0 OR Apache-2.0)']);
    const all = [];
    for (const c of manifest.components) {
      all.push([c.package, c.license]);
      for (const b of c.bundles || []) all.push([b.name, b.license]);
    }
    const src = read('tools/vendor.mjs');
    const declared = new Set((/const ALLOWED_LICENSES = new Set\(\[([\s\S]*?)\]\)/.exec(src)[1].match(/'[^']+'/g) || []).map((x) => x.slice(1, -1)));
    for (const [name, license] of all) {
      assert.ok(declared.has(license), `${name}: ${license} is in the allowed list in tools/vendor.mjs`);
      assert.ok(!/GPL|EPL|AGPL|SSPL|Commons Clause/i.test(license.replace('MPL-2.0 OR Apache-2.0', 'Apache-2.0')), `${name}: ${license}`);
    }
    assert.ok(all.length >= 80, `${all.length} components checked`);
    assert.ok(!declared.has('GPL-3.0') && !declared.has('EPL-2.0'));
    const mermaid = JSON.parse(block('mdv-lib-mermaid').text);
    assert.ok(!mermaid.includes('org.eclipse.elk'), 'elkjs is not included');
    assert.equal(manifest.components.find((c) => c.id === 'mermaid').package, '@mermaid-js/tiny');
    // The allowed list itself stays within the expected set
    for (const l of declared) assert.ok(allowed.has(l), `unexpected allowed license: ${l}`);
  });

  test('The license notices are in the HTML and cover every bundled component (FR-802)', () => {
    const notices = read('THIRD-PARTY-NOTICES.txt');
    const embedded = JSON.parse(block('mdv-res-licenses').text);
    // What is shown = mdfolio's own license + the full third-party license notices
    assert.ok(embedded.startsWith('mdfolio ' + core.VERSION + '\n'));
    assert.ok(embedded.includes(read('LICENSE').trim()));
    assert.ok(embedded.endsWith(notices.trim()) || embedded.trim().endsWith(notices.trim()));
    for (const c of manifest.components) {
      assert.ok(notices.includes(c.package), `${c.package} is listed`);
      for (const b of c.bundles || []) assert.ok(notices.includes(b.name), `${b.name} is listed`);
    }
    assert.ok(notices.includes('SIL OPEN FONT LICENSE'), 'license of the KaTeX fonts');
    assert.ok(notices.includes('Permission is hereby granted, free of charge'), 'MIT license text');
    assert.ok(read('LICENSE').includes('MIT License'));
  });
});

describe('Build (SPEC 8.5)', () => {
  test('The same input always gives the same output', () => {
    const dir = tmp();
    const a = path.join(dir, 'a.html');
    const b = path.join(dir, 'b.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--out', a], { cwd: ROOT });
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--out', b], { cwd: ROOT });
    assert.ok(fs.readFileSync(a).equals(fs.readFileSync(b)));
    assert.ok(fs.readFileSync(a).equals(fs.readFileSync(VIEWER)), 'dist/mdfolio.html is built from the current sources');
  });

  test('--without leaves out the math and diagram libraries', () => {
    const dir = tmp();
    const out = path.join(dir, 'lite.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--out', out, '--without', 'mermaid,katex'], { cwd: ROOT });
    const lite = core.extractParts(fs.readFileSync(out, 'utf8'));
    assert.deepEqual(lite.blocks.map((b) => b.id), ['mdv-config', 'mdv-site', 'mdv-res-help-ja', 'mdv-res-help-en', 'mdv-res-licenses', 'mdv-js-vendor', 'mdv-js-app']);
    assert.equal((lite.csp.match(/'sha256-/g) || []).length, 2);
    assert.ok(fs.statSync(out).size < 800 * 1024, `the lite build is ${fs.statSync(out).size} bytes`);
    assert.equal(core.findBlock(lite, 'mdv-js-app').text, block('mdv-js-app').text, 'the app script is the same');
  });

  test('Stops on invalid arguments and on modified bundled files', () => {
    const run = (args, env) => {
      try {
        execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), ...args], { cwd: ROOT, stdio: 'pipe', env: { ...process.env, ...env } });
        return { code: 0, stderr: '' };
      } catch (e) {
        return { code: e.status, stderr: String(e.stderr) };
      }
    };
    assert.equal(run(['--unknown']).code, 1);
    assert.ok(run(['--without', 'jquery']).stderr.includes('--without'));
    // Building a copy with a modified bundled file fails
    const copy = tmp();
    for (const d of ['src', 'vendor', 'tools']) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
    for (const f of ['package.json', 'THIRD-PARTY-NOTICES.txt', 'LICENSE']) fs.copyFileSync(path.join(ROOT, f), path.join(copy, f));
    const ok = (() => { try { execFileSync(process.execPath, [path.join(copy, 'tools/build.mjs'), '--out', path.join(copy, 'ok.html')], { cwd: copy, stdio: 'pipe' }); return true; } catch (e) { return String(e.stderr); } })();
    assert.equal(ok, true, 'an unmodified copy builds');
    assert.ok(fs.readFileSync(path.join(copy, 'ok.html')).equals(fs.readFileSync(VIEWER)), 'same output from a different location');
    const target = path.join(copy, 'vendor/dompurify/purify.min.js');
    fs.appendFileSync(target, '\n/* tampered */');
    let failed = '';
    try { execFileSync(process.execPath, [path.join(copy, 'tools/build.mjs'), '--out', path.join(copy, 'bad.html')], { cwd: copy, stdio: 'pipe' }); } catch (e) { failed = String(e.stderr); }
    assert.ok(failed.includes('SHA-256'), `detects the modification: ${failed}`);
    assert.equal(fs.existsSync(path.join(copy, 'bad.html')), false);
  });
});

describe('UI text (NFR-5)', () => {
  // i18n.js can be loaded both in browsers and in Node.js (UMD)
  const sandbox = { MDV: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('src/i18n.js'), sandbox);
  const i18n = sandbox.MDV.i18n;

  test('Japanese and English have the same keys', () => {
    const ja = Object.keys(i18n.ja).sort();
    const en = Object.keys(i18n.en).sort();
    assert.deepEqual(ja, en);
    assert.ok(ja.length >= 90, `${ja.length} strings`);
    for (const k of ja) {
      assert.ok(typeof i18n.ja[k] === 'string' && i18n.ja[k].length > 0, `ja.${k}`);
      assert.ok(typeof i18n.en[k] === 'string' && i18n.en[k].length > 0, `en.${k}`);
      // The placeholders ({0} and so on) match
      const holes = (s) => (s.match(/\{\d\}/g) || []).sort().join('');
      assert.equal(holes(i18n.ja[k]), holes(i18n.en[k]), `placeholders of ${k}`);
    }
  });

  test('Every string used by the program is defined', () => {
    const app = read('src/app.js');
    const used = new Set();
    for (const m of app.matchAll(/\bt\('([A-Za-z0-9]+)'/g)) used.add(m[1]);
    for (const m of app.matchAll(/menuItem\('([A-Za-z0-9]+)'/g)) used.add(m[1]);
    for (const m of app.matchAll(/dialogShell\('[^']*', '([A-Za-z0-9]+)'/g)) used.add(m[1]);
    for (const m of app.matchAll(/'((?:img|media)(?:Missing|MissingSingle|Blocked))'/g)) used.add(m[1]);
    for (const m of app.matchAll(/\['[^']+', '([A-Za-z]+Label)'\]/g)) used.add(m[1]);
    assert.ok(used.size > 80, `${used.size} strings used`);
    const missing = Array.from(used).filter((k) => !(k in i18n.ja));
    assert.deepEqual(missing, []);
  });

  test('Language detection and placeholder substitution', () => {
    assert.equal(i18n.detect({ languages: ['ja-JP', 'en'] }), 'ja');
    assert.equal(i18n.detect({ languages: ['en-US'] }), 'en');
    assert.equal(i18n.detect({ language: 'fr' }), 'en');
    assert.equal(i18n.translate('ja', 'searchCount', [3]), '3 件');
    assert.equal(i18n.translate('en', 'searchCountMore', [120, 50]), 'Showing top 50 of 120 results');
    // English singular and plural ({0:item|items})
    assert.equal(i18n.translate('en', 'searchCount', [1]), '1 result');
    assert.equal(i18n.translate('en', 'searchCount', [0]), '0 results');
    assert.equal(i18n.translate('en', 'searchCount', [12]), '12 results');
    assert.equal(i18n.translate('en', 'exportSummary', [1, 3, '2 MB']), '1 document, 3 attachments. File size is about 2 MB.');
    assert.equal(i18n.translate('en', 'exportSkipped', [1]), '1 attachment will not be included (over 20 MB or unreadable).');
    assert.equal(i18n.translate('ja', 'searchCount', [1]), '1 件');
    assert.equal(i18n.translate('en', 'searchCount'), '{0} {0:result|results}', 'unchanged without arguments');
    assert.equal(i18n.translate('ja', 'noSuchKey', []), 'noSuchKey');
  });
});
