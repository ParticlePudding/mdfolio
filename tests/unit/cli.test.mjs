// Command-line export (FR-604): checks the output without a browser
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, core } from '../helpers/load.mjs';

const CLI = path.join(ROOT, 'tools/build-site.mjs');
const VIEWER = path.join(ROOT, 'dist/mdfolio.html');
const FIXTURES = path.join(ROOT, 'tests/fixtures');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-cli-'));

function run(args, options = {}) {
  const env = options.lang ? { ...process.env, MDFOLIO_LANG: options.lang } : process.env;
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: options.cwd || ROOT, encoding: 'utf8', env });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function tree(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

function readSite(file) {
  const html = fs.readFileSync(file, 'utf8');
  const parts = core.extractParts(html);
  return {
    html, parts,
    ids: parts.blocks.map((b) => b.id),
    config: JSON.parse(core.findBlock(parts, 'mdv-config').text),
    site: JSON.parse(core.findBlock(parts, 'mdv-site').text)
  };
}

describe('Usage and arguments', () => {
  test('--help shows the usage', () => {
    const r = run(['--help']);
    assert.equal(r.code, 0);
    for (const opt of ['--out', '--title', '--home', '--viewer', '--lang', '--theme', '--allow-external-images', '--lock-external-images', '--no-downloads']) assert.ok(r.out.includes(opt), opt);
    assert.equal(run(['-h']).code, 0);
  });

  test('Invalid arguments exit with code 1 and show the reason', () => {
    const cases = [
      [[], '文書フォルダを指定してください'],
      [[path.join(FIXTURES, 'site'), path.join(FIXTURES, 'nav')], '文書フォルダは 1 つだけ'],
      [[path.join(FIXTURES, 'site'), '--out'], '--out には値が必要です'],
      [[path.join(FIXTURES, 'site'), '--theme', 'blue'], '--theme'],
      [[path.join(FIXTURES, 'site'), '--lang', 'fr'], '--lang'],
      [[path.join(FIXTURES, 'site'), '--zzz'], '不明なオプション'],
      [[path.join(FIXTURES, 'no-such-folder')], 'フォルダが見つかりません'],
      [[path.join(FIXTURES, 'site/README.md')], 'フォルダが見つかりません'],
      [[path.join(FIXTURES, 'nodocs')], 'Markdown 文書が見つかりませんでした'],
      [[path.join(FIXTURES, 'site'), '--viewer', path.join(ROOT, 'no-such.html')], 'ビューアが見つかりません'],
      [[path.join(FIXTURES, 'site'), '--viewer', path.join(ROOT, 'README.md')], ''],
      [[path.join(FIXTURES, 'site'), '--home', 'assets/pixel.png'], '--home の文書が見つかりません'],
      [[path.join(FIXTURES, 'site'), '--allow-external-images', '--lock-external-images'], '同時に指定できません'],
      [[path.join(FIXTURES, 'site'), '--lock-external-images', '--allow-external-images'], '同時に指定できません']
    ];
    const dir = tmp();
    for (const [args, message] of cases) {
      const r = run(args, { cwd: dir });
      assert.equal(r.code, 1, args.join(' '));
      assert.ok(r.err.includes(message), `${args.join(' ')} → ${r.err}`);
    }
    assert.deepEqual(fs.readdirSync(dir), [], 'nothing is written on failure');
  });
});

describe('Output content', () => {
  const dir = tmp();
  const out = path.join(dir, 'site.html');
  const r = run([path.join(FIXTURES, 'site'), '--out', out]);
  const site = r.code === 0 ? readSite(out) : null;

  test('Same structure and CSP as the viewer; only the settings and document data are added', () => {
    assert.equal(r.code, 0, r.err);
    assert.ok(r.out.includes('文書 11 件、添付 4 件'));
    assert.ok(r.out.includes('ホーム: README.md'));
    assert.ok(r.out.includes('数式ライブラリ: 含む、図のライブラリ: 含む'));
    const viewer = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
    assert.equal(site.parts.csp, viewer.csp);
    assert.equal(site.parts.css, viewer.css);
    assert.deepEqual(site.ids, viewer.blocks.map((b) => b.id));
    for (const b of viewer.blocks) {
      if (b.id === 'mdv-config' || b.id === 'mdv-site') continue;
      assert.equal(core.findBlock(site.parts, b.id).text, b.text, b.id);
    }
    assert.equal(core.composeHtml(site.parts), site.html);
    assert.ok(!site.html.includes('\r'));
    assert.deepEqual(site.config, { title: 'site', lang: 'auto', theme: 'auto', home: 'README.md', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.equal(site.parts.title, 'site');
  });

  test('Options for the hosting environment (--no-downloads / --lock-external-images / --allow-external-images) affect only the settings', () => {
    const base = fs.readFileSync(out, 'utf8');
    const variants = [
      [['--no-downloads'], { allowExternalImages: false, allowDownloads: false, lockExternalImages: false, hosted: false }],
      [['--lock-external-images'], { allowExternalImages: false, allowDownloads: true, lockExternalImages: true, hosted: false }],
      [['--no-downloads', '--lock-external-images'], { allowExternalImages: false, allowDownloads: false, lockExternalImages: true, hosted: false }],
      [['--allow-external-images'], { allowExternalImages: true, allowDownloads: true, lockExternalImages: false, hosted: false }]
    ];
    for (const [options, expected] of variants) {
      const file = path.join(tmp(), 'site.html');
      const rr = run([path.join(FIXTURES, 'site'), '--out', file, '--title', 'site', ...options]);
      assert.equal(rr.code, 0, rr.err);
      const v = readSite(file);
      assert.deepEqual(v.config, Object.assign({ title: 'site', lang: 'auto', theme: 'auto', home: 'README.md' }, expected), options.join(' '));
      // Everything except the settings block is the same as the output without options (CSP, scripts and document data do not change)
      assert.equal(v.parts.csp, site.parts.csp);
      for (const b of site.parts.blocks) {
        if (b.id === 'mdv-config') continue;
        const other = core.findBlock(v.parts, b.id).text;
        if (b.id === 'mdv-site') assert.deepEqual(JSON.parse(other).files, JSON.parse(b.text).files, options.join(' '));
        else assert.equal(other, b.text, b.id);
      }
      assert.notEqual(v.html, base);
    }
  });

  test('Ignored items (hidden files, node_modules, unreferenced attachments) are not included', () => {
    const paths = site.site.files.map((f) => f.path);
    assert.deepEqual(paths, [
      'README.md', 'bom.md', 'sjis.md', 'syntax.md', 'utf16.md', 'xss.md',
      'guide/index.md', 'guide/intro.md', 'guide/Setup.md', 'guide/sub/deep.md', '日本語 フォルダ/仕様書 v1.0.md',
      'assets/data.csv', 'assets/evil.html', 'assets/pixel.png', 'assets/diagram.svg'
    ]);
    assert.deepEqual(core.validateSiteData(site.site), { ok: true });
    assert.equal(site.site.name, 'site');
    assert.equal(site.site.generator, 'mdfolio ' + core.VERSION);
  });

  test('Detects the character encoding and embeds the text as strings (Shift_JIS, UTF-16, UTF-8 with BOM)', () => {
    const text = (p) => site.site.files.find((f) => f.path === p).text;
    assert.ok(text('sjis.md').startsWith('# シフトJISの文書'));
    assert.ok(text('utf16.md').startsWith('# UTF-16 の文書'));
    assert.ok(text('bom.md').startsWith('# BOM 付き UTF-8'), 'the BOM is removed');
    assert.equal(text('README.md'), fs.readFileSync(path.join(FIXTURES, 'site/README.md'), 'utf8'));
  });

  test('Attachments are embedded as is (Base64), with the type taken from the extension', () => {
    for (const f of site.site.files.filter((x) => x.kind === 'asset')) {
      const original = fs.readFileSync(path.join(FIXTURES, 'site', f.path));
      assert.ok(Buffer.from(f.base64, 'base64').equals(original), f.path);
      assert.equal(f.mime, core.mimeOf(f.path));
      assert.equal(typeof f.mtime, 'number');
    }
  });

  test('Running twice gives the same output except for the creation time', () => {
    const again = path.join(dir, 'again.html');
    assert.equal(run([path.join(FIXTURES, 'site'), '--out', again]).code, 0);
    const b = readSite(again);
    assert.deepEqual({ ...b.site, created: '' }, { ...site.site, created: '' });
    assert.match(b.site.created, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('Various inputs', () => {
  test('The default output is "<folder name>.html" and the default title is the folder name', () => {
    const cwd = tmp();
    const docs = tree(path.join(tmp(), '手順書 2026'), { 'README.md': '# 手順\n' });
    const r = run([docs], { cwd });
    assert.equal(r.code, 0, r.err);
    assert.deepEqual(fs.readdirSync(cwd), ['手順書 2026.html']);
    const site = readSite(path.join(cwd, '手順書 2026.html'));
    assert.equal(site.config.title, '手順書 2026');
    assert.equal(site.parts.title, '手順書 2026');
    assert.ok(site.html.includes('<title>手順書 2026</title>'));
  });

  test('A title containing HTML special characters is embedded correctly', () => {
    const dir = tmp();
    const docs = tree(path.join(dir, 'docs'), { 'README.md': '# x\n' });
    const out = path.join(dir, 'o.html');
    const title = '</title><script>alert(1)</script> & "quoted" <!-- x';
    assert.equal(run([docs, '--out', out, '--title', title]).code, 0);
    const site = readSite(out);
    assert.equal(site.config.title, title);
    assert.equal(site.parts.title, title);
    assert.equal((site.html.match(/<script/g) || []).length, site.ids.length, 'the number of scripts does not change');
    assert.ok(site.html.includes('<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quoted&quot; &lt;!-- x</title>'));
  });

  test('Home document: README.md -> index.md -> the first document; --home can also set it', () => {
    const dir = tmp();
    const home = (files, extra = []) => {
      const docs = tree(fs.mkdtempSync(path.join(dir, 'd-')), files);
      const out = path.join(docs, '..', path.basename(docs) + '.html');
      const r = run([docs, '--out', out, ...extra]);
      assert.equal(r.code, 0, r.err);
      return readSite(out).config.home;
    };
    assert.equal(home({ 'b.md': '# b\n', 'README.md': '# r\n', 'index.md': '# i\n' }), 'README.md');
    assert.equal(home({ 'b.md': '# b\n', 'index.md': '# i\n', 'a/README.md': '# sub\n' }), 'index.md');
    assert.equal(home({ 'b.md': '# b\n', 'a.md': '# a\n' }), 'a.md');
    assert.equal(home({ 'README.md': '# r\n', 'guide/start.md': '# s\n' }, ['--home', 'guide/start.md']), 'guide/start.md');
    assert.equal(home({ 'README.md': '# r\n', 'guide/start.md': '# s\n' }, ['--home', 'guide/start']), 'guide/start.md', 'the extension can be omitted');
  });

  test('Leaves out the libraries when no math or diagrams are used, and collects references written in HTML as attachments', () => {
    const dir = tmp();
    const out = path.join(dir, 'plain.html');
    const r = run([path.join(FIXTURES, 'plain'), '--out', out]);
    assert.equal(r.code, 0, r.err);
    assert.ok(r.out.includes('数式ライブラリ: 除外、図のライブラリ: 除外'));
    const site = readSite(out);
    assert.deepEqual(site.ids, ['mdv-config', 'mdv-site', 'mdv-res-help-ja', 'mdv-res-help-en', 'mdv-res-licenses', 'mdv-js-vendor', 'mdv-js-app']);
    assert.deepEqual(site.site.files.map((f) => f.path), ['README.md', 'b.md', 'c.md', 'files/data.txt', 'img/p.png', 'img/q.png']);
    assert.ok(fs.statSync(out).size < 1024 * 1024);
    // The hashes of unused libraries are also removed from the CSP
    assert.equal((site.parts.csp.match(/'sha256-/g) || []).length, 2);
  });

  test('Attachments over 20 MB are left out with a message; documents over 10 MB are not rendered', () => {
    const dir = tmp();
    const docs = tree(path.join(dir, 'docs'), {
      'README.md': '# 大きな添付\n\n[大](big.bin) [小](small.bin) [文書](huge.md)\n',
      'small.bin': Buffer.alloc(1024, 1),
      'big.bin': Buffer.alloc(20 * 1024 * 1024 + 1, 2),
      'huge.md': '# 巨大\n\n$x$\n\n' + 'a'.repeat(10 * 1024 * 1024)
    });
    const out = path.join(dir, 'o.html');
    const r = run([docs, '--out', out]);
    assert.equal(r.code, 0, r.err);
    assert.ok(/20MB を超える.*1 件/.test(r.out), r.out);
    const site = readSite(out);
    assert.deepEqual(site.site.files.map((f) => f.path), ['README.md', 'huge.md', 'small.bin']);
    assert.ok(!site.ids.includes('mdv-lib-katex'), 'math in documents over 10 MB is not counted (the viewer shows them as plain text too)');
  });

  test('A lite build of the viewer can also be used as the base', () => {
    const dir = tmp();
    const lite = path.join(dir, 'lite.html');
    const build = spawnSync(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--out', lite, '--without', 'mermaid,katex'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr);
    const out = path.join(dir, 'o.html');
    const r = run([path.join(FIXTURES, 'site'), '--out', out, '--viewer', lite]);
    assert.equal(r.code, 0, r.err);
    const site = readSite(out);
    assert.ok(!site.ids.includes('mdv-lib-katex') && !site.ids.includes('mdv-lib-mermaid'));
    assert.equal(site.site.files.filter((f) => f.kind === 'doc').length, 11);
    assert.ok(fs.statSync(out).size < 1024 * 1024);
  });

  test('</script> and <!-- in documents are embedded safely and read back unchanged', () => {
    const dir = tmp();
    const nasty = '# x\n\n</script><script>alert(1)</script> <!-- ' + String.fromCharCode(0x2028) + ' \\ "q"\n';
    const docs = tree(path.join(dir, 'docs'), { 'README.md': nasty });
    const out = path.join(dir, 'o.html');
    assert.equal(run([docs, '--out', out]).code, 0);
    const site = readSite(out);
    assert.equal(site.site.files[0].text, nasty);
    assert.equal((site.html.match(/<\/script>/g) || []).length, site.ids.length);
    assert.ok(!core.findBlock(site.parts, 'mdv-site').text.includes('<!--'));
  });
});

describe('English messages of the command-line export (FD-10)', () => {
  test('Shows the result, errors and --help in English', () => {
    const out = path.join(tmp(), 'site.html');
    let r = run([path.join(ROOT, 'sample-docs'), '--out', out], { lang: 'en' });
    assert.equal(r.code, 0, r.err);
    assert.ok(r.out.includes('Wrote ' + out));
    assert.match(r.out, /7 document\(s\), 3 attachment\(s\)/);
    assert.ok(r.out.includes('Math library: included, diagram library: included'));
    assert.ok(!/[\u3040-\u30ff]/.test(r.out), r.out);
    r = run([], { lang: 'en' });
    assert.equal(r.code, 1);
    assert.ok(r.err.includes('Error: Specify a document folder'), r.err);
    r = run(['--help'], { lang: 'en' });
    assert.ok(r.out.includes('node tools/build-site.mjs <document folder> [options]'));
    assert.ok(!/[\u3040-\u30ff]/.test(r.out));
    r = run(['--help'], { lang: 'ja' });
    assert.ok(r.out.includes('node tools/build-site.mjs <文書フォルダ> [オプション]'));
  });
});

describe('Embedding CSS for the look (--css, SPEC FR-1006)', () => {
  const docs = () => tree(tmp(), { 'README.md': '# home\n' });

  test('Embeds the given CSS without the BOM; an export used as the base keeps it', () => {
    const dir = tmp();
    const css = path.join(dir, 'look.css');
    fs.writeFileSync(css, '\uFEFFh1 { color: rgb(1, 2, 3); }\n');
    const out = path.join(dir, 'site.html');
    let r = run([docs(), '--out', out, '--css', css]);
    assert.equal(r.code, 0, r.err);
    let site = readSite(out);
    assert.equal(site.parts.userCss, 'h1 { color: rgb(1, 2, 3); }\n');
    // Exporting with the exported HTML as the viewer and no --css keeps the CSS
    const again = path.join(dir, 'again.html');
    r = run([docs(), '--out', again, '--viewer', out]);
    assert.equal(r.code, 0, r.err);
    assert.equal(readSite(again).parts.userCss, 'h1 { color: rgb(1, 2, 3); }\n');
    // Without --css nothing is embedded (the distributed viewer has no embedded CSS)
    r = run([docs(), '--out', path.join(dir, 'plain.html')]);
    site = readSite(path.join(dir, 'plain.html'));
    assert.equal(site.parts.userCss, '');
    assert.ok(!site.html.slice(0, site.html.indexOf('</head>')).includes('<style id="mdv-user-style">'));
  });

  test('CSS containing </style, CSS that is too large, or a missing file stops with a reason and writes nothing', () => {
    const dir = tmp();
    const bad = path.join(dir, 'bad.css');
    fs.writeFileSync(bad, 'a { } </STYLE><script>x</script>');
    const big = path.join(dir, 'big.css');
    fs.writeFileSync(big, 'a{}'.padEnd(core.LIMITS.maxUserCssBytes + 1, ' '));
    for (const [arg, message] of [[bad, '</style'], [big, '1MB'], [path.join(dir, 'none.css'), '見つかりません']]) {
      const out = path.join(dir, 'out.html');
      const r = run([docs(), '--out', out, '--css', arg]);
      assert.equal(r.code, 1);
      assert.ok(r.err.includes(message), r.err);
      assert.ok(!fs.existsSync(out));
    }
  });
});
