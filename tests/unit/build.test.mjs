// 成果物（dist/mdfolio.html）とビルド・配布まわりの検証（NFR-1, NFR-3, NFR-6, SEC-3, FR-802, 仕様 8 章）
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

describe('成果物の構造（仕様 8.2）', () => {
  test('CSP: CSS は内蔵と隣の mdfolio.css だけ、スクリプトはハッシュだけを許す（SEC-4、SPEC 3.10）', () => {
    const csp = parts.csp;
    assert.match(csp, /(?:^|; )style-src 'self' file: 'unsafe-inline'(?:;|$)/);
    assert.match(csp, /(?:^|; )script-src 'sha256-[^;]+(?:;|$)/);
    assert.ok(!/script-src[^;]*(?:'unsafe-inline'|'self'|file:)/.test(csp), 'スクリプトの許可は広げない');
    assert.match(csp, /(?:^|; )connect-src 'none'(?:;|$)/);
  });

  test('単一の HTML で、外部のファイルを参照しない（NFR-1）', () => {
    assert.ok(html.startsWith('<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">'));
    assert.ok(html.endsWith('</body>\n</html>\n'));
    // ブロックの中身を除いた「骨組み」に、外部への参照がない
    let skeleton = html;
    for (const b of parts.blocks) skeleton = skeleton.replace(b.text, '');
    skeleton = skeleton.replace(parts.css, '').replace(parts.csp.replace(/&/g, '&amp;'), '');
    // 隣の mdfolio.css を読む指定（SPEC 3.10）だけは、相対パスの参照として認める
    const userCssLink = '<link rel="stylesheet" href="mdfolio.css" id="mdv-user-css">';
    assert.equal(skeleton.split(userCssLink).length, 2, '隣の CSS を読む指定が 1 つある');
    skeleton = skeleton.replace(userCssLink, '');
    assert.ok(skeleton.length < 3000, '骨組みは小さい');
    assert.ok(!/(?:src|href|action|data|poster)="(?!data:)[^"]/i.test(skeleton), `外部参照がある: ${skeleton}`);
    assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(skeleton));
    assert.equal((skeleton.match(/<script/g) || []).length, parts.blocks.length);
    assert.equal((skeleton.match(/<link /g) || []).length, 1, 'タブのアイコン（data: URL）だけ');
    assert.ok(skeleton.includes('<link rel="icon" href="data:image/svg+xml,'));
    assert.ok(skeleton.includes('<noscript>'));
  });

  test('改行は LF のみ。特殊な空白や不可視文字が紛れ込んでいない', () => {
    assert.ok(!html.includes('\r'));
    const bom = String.fromCharCode(0xFEFF);
    assert.ok(!html.startsWith(bom));
    // ソース（自作分）に、行区切り文字やノーブレークスペースが入っていない
    const bad = [0x2028, 0x2029, 0x00A0, 0xFEFF, 0x200B].map((c) => String.fromCharCode(c));
    for (const f of ['src/core.js', 'src/md.js', 'src/i18n.js', 'src/app.js', 'src/app.css', 'src/document.css', 'tools/build.mjs', 'tools/build-site.mjs', 'tools/vendor.mjs']) {
      const text = read(f);
      for (const ch of bad) assert.ok(!text.includes(ch), `${f} に U+${ch.charCodeAt(0).toString(16).toUpperCase()} がある`);
      assert.ok(!text.includes('\r'), `${f} は LF`);
    }
  });

  test('ブロックの並びと種類', () => {
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
    // データのブロックは JSON として読める
    for (const b of parts.blocks.filter((x) => x.type === 'application/json')) {
      assert.doesNotThrow(() => JSON.parse(b.text), `${b.id} は JSON`);
    }
    assert.deepEqual(JSON.parse(block('mdv-config').text), { title: '', lang: 'auto', theme: 'auto', home: '', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.equal(JSON.parse(block('mdv-site').text), null);
    assert.equal(JSON.parse(block('mdv-res-help-ja').text), read('src/help.ja.md'));
    assert.equal(JSON.parse(block('mdv-res-help-en').text), read('src/help.en.md'));
  });

  test('分解して組み立て直すと、元と完全に一致する', () => {
    assert.equal(core.composeHtml(core.extractParts(html)), html);
  });

  test('サイズは 6MB 以下（NFR-3）', (t) => {
    const bytes = fs.statSync(VIEWER).size;
    t.diagnostic(`dist/mdfolio.html: ${bytes} バイト（${(bytes / 1024 / 1024).toFixed(2)} MB）`);
    assert.ok(bytes <= 6 * 1024 * 1024);
  });
});

describe('スクリプトと CSP（SEC-3）', () => {
  const policy = parts.csp;
  const hashes = (policy.match(/'sha256-[^']+'/g) || []).map((h) => h.slice(8, -1));

  test('CSP のハッシュは、実行される 4 つのスクリプトと 1 対 1 で一致する', () => {
    const executable = [
      block('mdv-js-vendor').text,
      block('mdv-js-app').text,
      JSON.parse(block('mdv-lib-katex').text),
      JSON.parse(block('mdv-lib-mermaid').text)
    ];
    assert.deepEqual(executable.map(sha256Base64).sort(), hashes.slice().sort());
    assert.equal(new Set(hashes).size, 4);
  });

  test('あとから読み込むライブラリは、配布元のファイルと 1 バイトも違わない', () => {
    const file = (id, name) => manifest.components.find((c) => c.id === id).files.find((f) => f.path.endsWith(name));
    const katex = fs.readFileSync(path.join(ROOT, 'vendor', file('katex', 'katex.min.js').path), 'utf8');
    const mermaid = fs.readFileSync(path.join(ROOT, 'vendor', file('mermaid', 'mermaid.tiny.js').path), 'utf8');
    assert.equal(JSON.parse(block('mdv-lib-katex').text), katex);
    assert.equal(JSON.parse(block('mdv-lib-mermaid').text), mermaid);
  });

  test('インラインのスクリプトは構文として正しく、HTML を壊す並びを含まない', () => {
    for (const id of ['mdv-js-vendor', 'mdv-js-app']) {
      const text = block(id).text;
      assert.doesNotThrow(() => new vm.Script(text, { filename: id }), `${id} の構文`);
      assert.ok(!/<\/script/i.test(text), `${id} に </script がない`);
      assert.ok(!text.includes('<!--'), `${id} に <!-- がない`);
      assert.ok(!/<script/i.test(text), `${id} に <script がない`);
      assert.ok(!/sourceMappingURL/.test(text), `${id} にソースマップの参照がない`);
    }
    for (const b of parts.blocks) {
      assert.ok(!/<\/script/i.test(b.text) && !b.text.includes('<!--'), `${b.id}`);
    }
  });

  test('本体のスクリプトは eval や外部読み込みに頼っていない', () => {
    const app = read('src/app.js') + read('src/core.js') + read('src/md.js') + read('src/i18n.js');
    assert.ok(!/\beval\s*\(/.test(app));
    assert.ok(!/new\s+Function\s*\(/.test(app));
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/.test(app), '通信の機能を使っていない');
    assert.ok(!/document\.write|insertAdjacentHTML|outerHTML\s*=/.test(app));
    // innerHTML への代入は、アイコン（固定の SVG）と図の描画結果（Mermaid の出力）の 2 か所だけ
    const uses = (read('src/app.js').match(/\.innerHTML\s*=/g) || []).length;
    assert.equal(uses, 2, 'innerHTML への代入箇所の数');
  });
});

describe('バージョンと目録', () => {
  test('バージョンの表記が一致している', () => {
    assert.equal(pkg.version, core.VERSION);
    assert.equal(parts.generator, 'mdfolio ' + core.VERSION);
    const out = JSON.parse(read('dist/mdfolio.manifest.json'));
    assert.equal(out.version, core.VERSION);
    assert.equal(out.bytes, fs.statSync(VIEWER).size);
    assert.equal(out.sha256, sha256Hex(fs.readFileSync(VIEWER)));
    assert.equal(out.csp, parts.csp);
    assert.deepEqual(out.blocks.map((b) => b.id), parts.blocks.map((b) => b.id));
  });

  test('同梱ライブラリは配布物そのままで、目録の SHA-256 と一致する（NFR-6）', () => {
    const ids = manifest.components.map((c) => c.id).sort();
    assert.deepEqual(ids, ['dompurify', 'highlight.js', 'katex', 'markdown-it', 'markdown-it-footnote', 'mermaid']);
    let files = 0;
    for (const c of manifest.components) {
      assert.ok(c.version && c.license && c.package, `${c.id} の名称・版・ライセンス`);
      for (const f of c.files) {
        const buf = fs.readFileSync(path.join(ROOT, 'vendor', f.path));
        assert.equal(sha256Hex(buf), f.sha256, `vendor/${f.path}`);
        assert.equal(buf.length, f.bytes);
        files++;
      }
    }
    assert.ok(files >= 40, `ファイル数 ${files}`);
    // 目録にないファイルが vendor/ に紛れていない
    const listed = new Set(manifest.components.flatMap((c) => c.files.map((f) => f.path)));
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.relative(path.join(ROOT, 'vendor'), path.join(dir, e.name)).split(path.sep).join('/')]));
    const extra = walk(path.join(ROOT, 'vendor')).filter((p) => p !== 'manifest.json' && !listed.has(p) && !/(^|\/)LICENSE/i.test(p));
    assert.deepEqual(extra, []);
  });

  test('ライセンスは許可した種類だけ。図のライブラリは EPL / GPL の部品（elkjs）を含まない版', () => {
    // 寛容型のライセンスだけ。DOMPurify は二重ライセンスで、Apache-2.0 を選んで利用する
    const allowed = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Unlicense', 'CC0-1.0', 'BlueOak-1.0.0', '(MPL-2.0 OR Apache-2.0)']);
    const all = [];
    for (const c of manifest.components) {
      all.push([c.package, c.license]);
      for (const b of c.bundles || []) all.push([b.name, b.license]);
    }
    const src = read('tools/vendor.mjs');
    const declared = new Set((/const ALLOWED_LICENSES = new Set\(\[([\s\S]*?)\]\)/.exec(src)[1].match(/'[^']+'/g) || []).map((x) => x.slice(1, -1)));
    for (const [name, license] of all) {
      assert.ok(declared.has(license), `${name}: ${license} は tools/vendor.mjs の許可一覧にある`);
      assert.ok(!/GPL|EPL|AGPL|SSPL|Commons Clause/i.test(license.replace('MPL-2.0 OR Apache-2.0', 'Apache-2.0')), `${name}: ${license}`);
    }
    assert.ok(all.length >= 80, `確認した部品 ${all.length} 個`);
    assert.ok(!declared.has('GPL-3.0') && !declared.has('EPL-2.0'));
    const mermaid = JSON.parse(block('mdv-lib-mermaid').text);
    assert.ok(!mermaid.includes('org.eclipse.elk'), 'elkjs が入っていない');
    assert.equal(manifest.components.find((c) => c.id === 'mermaid').package, '@mermaid-js/tiny');
    // 許可一覧そのものが、想定した範囲に収まっている
    for (const l of declared) assert.ok(allowed.has(l), `想定外の許可ライセンス: ${l}`);
  });

  test('ライセンス表記は HTML に含まれ、同梱したすべての部品に触れている（FR-802）', () => {
    const notices = read('THIRD-PARTY-NOTICES.txt');
    const embedded = JSON.parse(block('mdv-res-licenses').text);
    // 画面に出す内容 = mdfolio 自身のライセンス + 第三者ソフトウェアのライセンス表記（全文）
    assert.ok(embedded.startsWith('mdfolio ' + core.VERSION + '\n'));
    assert.ok(embedded.includes(read('LICENSE').trim()));
    assert.ok(embedded.endsWith(notices.trim()) || embedded.trim().endsWith(notices.trim()));
    for (const c of manifest.components) {
      assert.ok(notices.includes(c.package), `${c.package} の記載`);
      for (const b of c.bundles || []) assert.ok(notices.includes(b.name), `${b.name} の記載`);
    }
    assert.ok(notices.includes('SIL OPEN FONT LICENSE'), 'KaTeX のフォントのライセンス');
    assert.ok(notices.includes('Permission is hereby granted, free of charge'), 'MIT の条文');
    assert.ok(read('LICENSE').includes('MIT License'));
  });
});

describe('ビルド（仕様 8.5）', () => {
  test('同じ入力からは、常に同じ出力ができる', () => {
    const dir = tmp();
    const a = path.join(dir, 'a.html');
    const b = path.join(dir, 'b.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--out', a], { cwd: ROOT });
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--out', b], { cwd: ROOT });
    assert.ok(fs.readFileSync(a).equals(fs.readFileSync(b)));
    assert.ok(fs.readFileSync(a).equals(fs.readFileSync(VIEWER)), 'dist/mdfolio.html は現在のソースから作られている');
  });

  test('--without で数式・図のライブラリを外せる', () => {
    const dir = tmp();
    const out = path.join(dir, 'lite.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--out', out, '--without', 'mermaid,katex'], { cwd: ROOT });
    const lite = core.extractParts(fs.readFileSync(out, 'utf8'));
    assert.deepEqual(lite.blocks.map((b) => b.id), ['mdv-config', 'mdv-site', 'mdv-res-help-ja', 'mdv-res-help-en', 'mdv-res-licenses', 'mdv-js-vendor', 'mdv-js-app']);
    assert.equal((lite.csp.match(/'sha256-/g) || []).length, 2);
    assert.ok(fs.statSync(out).size < 800 * 1024, `軽量版は ${fs.statSync(out).size} バイト`);
    assert.equal(core.findBlock(lite, 'mdv-js-app').text, block('mdv-js-app').text, '本体は同じ');
  });

  test('誤った引数や、書き換えられた同梱ファイルを検出して止まる', () => {
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
    // 同梱ファイルを書き換えた複製を作り、そちらでビルドすると失敗する
    const copy = tmp();
    for (const d of ['src', 'vendor', 'tools']) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
    for (const f of ['package.json', 'THIRD-PARTY-NOTICES.txt', 'LICENSE']) fs.copyFileSync(path.join(ROOT, f), path.join(copy, f));
    const ok = (() => { try { execFileSync(process.execPath, [path.join(copy, 'tools/build.mjs'), '--out', path.join(copy, 'ok.html')], { cwd: copy, stdio: 'pipe' }); return true; } catch (e) { return String(e.stderr); } })();
    assert.equal(ok, true, '複製したままならビルドできる');
    assert.ok(fs.readFileSync(path.join(copy, 'ok.html')).equals(fs.readFileSync(VIEWER)), '置き場所が変わっても同じ出力');
    const target = path.join(copy, 'vendor/dompurify/purify.min.js');
    fs.appendFileSync(target, '\n/* tampered */');
    let failed = '';
    try { execFileSync(process.execPath, [path.join(copy, 'tools/build.mjs'), '--out', path.join(copy, 'bad.html')], { cwd: copy, stdio: 'pipe' }); } catch (e) { failed = String(e.stderr); }
    assert.ok(failed.includes('SHA-256'), `書き換えを検出する: ${failed}`);
    assert.equal(fs.existsSync(path.join(copy, 'bad.html')), false);
  });
});

describe('画面の文言（NFR-5）', () => {
  // i18n.js はブラウザーでも Node.js でも読める形（UMD）
  const sandbox = { MDV: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('src/i18n.js'), sandbox);
  const i18n = sandbox.MDV.i18n;

  test('日本語と英語で、同じ項目がそろっている', () => {
    const ja = Object.keys(i18n.ja).sort();
    const en = Object.keys(i18n.en).sort();
    assert.deepEqual(ja, en);
    assert.ok(ja.length >= 90, `文言の数 ${ja.length}`);
    for (const k of ja) {
      assert.ok(typeof i18n.ja[k] === 'string' && i18n.ja[k].length > 0, `ja.${k}`);
      assert.ok(typeof i18n.en[k] === 'string' && i18n.en[k].length > 0, `en.${k}`);
      // 差し込みの数（{0} など）が一致する
      const holes = (s) => (s.match(/\{\d\}/g) || []).sort().join('');
      assert.equal(holes(i18n.ja[k]), holes(i18n.en[k]), `${k} の差し込み`);
    }
  });

  test('プログラムが使う文言は、すべて定義されている', () => {
    const app = read('src/app.js');
    const used = new Set();
    for (const m of app.matchAll(/\bt\('([A-Za-z0-9]+)'/g)) used.add(m[1]);
    for (const m of app.matchAll(/menuItem\('([A-Za-z0-9]+)'/g)) used.add(m[1]);
    for (const m of app.matchAll(/dialogShell\('[^']*', '([A-Za-z0-9]+)'/g)) used.add(m[1]);
    for (const m of app.matchAll(/'((?:img|media)(?:Missing|MissingSingle|Blocked))'/g)) used.add(m[1]);
    for (const m of app.matchAll(/\['[^']+', '([A-Za-z]+Label)'\]/g)) used.add(m[1]);
    assert.ok(used.size > 80, `使われている文言 ${used.size} 個`);
    const missing = Array.from(used).filter((k) => !(k in i18n.ja));
    assert.deepEqual(missing, []);
  });

  test('言語の判定と、文言の差し込み', () => {
    assert.equal(i18n.detect({ languages: ['ja-JP', 'en'] }), 'ja');
    assert.equal(i18n.detect({ languages: ['en-US'] }), 'en');
    assert.equal(i18n.detect({ language: 'fr' }), 'en');
    assert.equal(i18n.translate('ja', 'searchCount', [3]), '3 件');
    assert.equal(i18n.translate('en', 'searchCountMore', [120, 50]), 'Showing top 50 of 120 results');
    // 英語の単数・複数（{0:item|items}）
    assert.equal(i18n.translate('en', 'searchCount', [1]), '1 result');
    assert.equal(i18n.translate('en', 'searchCount', [0]), '0 results');
    assert.equal(i18n.translate('en', 'searchCount', [12]), '12 results');
    assert.equal(i18n.translate('en', 'exportSummary', [1, 3, '2 MB']), '1 document, 3 attachments. File size is about 2 MB.');
    assert.equal(i18n.translate('en', 'exportSkipped', [1]), '1 attachment will not be included (over 20 MB or unreadable).');
    assert.equal(i18n.translate('ja', 'searchCount', [1]), '1 件');
    assert.equal(i18n.translate('en', 'searchCount'), '{0} {0:result|results}', '引数がなければそのまま');
    assert.equal(i18n.translate('ja', 'noSuchKey', []), 'noSuchKey');
  });
});
