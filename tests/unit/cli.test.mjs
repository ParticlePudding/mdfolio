// コマンドライン版の書き出し（FR-604）: ブラウザーを使わずに、出力の中身を検証する
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

describe('使い方と引数', () => {
  test('--help で使い方を表示する', () => {
    const r = run(['--help']);
    assert.equal(r.code, 0);
    for (const opt of ['--out', '--title', '--home', '--viewer', '--lang', '--theme', '--allow-external-images', '--lock-external-images', '--no-downloads']) assert.ok(r.out.includes(opt), opt);
    assert.equal(run(['-h']).code, 0);
  });

  test('誤った指定は、理由を示して終了コード 1 で終わる', () => {
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
    assert.deepEqual(fs.readdirSync(dir), [], '失敗したときは何も書き出さない');
  });
});

describe('出力の内容', () => {
  const dir = tmp();
  const out = path.join(dir, 'site.html');
  const r = run([path.join(FIXTURES, 'site'), '--out', out]);
  const site = r.code === 0 ? readSite(out) : null;

  test('ビューアと同じ構造・同じ CSP で、設定と文書データだけが入る', () => {
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

  test('表示環境に合わせる指定（--no-downloads / --lock-external-images / --allow-external-images）は、設定にだけ反映される', () => {
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
      // 設定のブロック以外は、指定なしの出力と同じ（CSP・スクリプト・文書データは変わらない）
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

  test('読み込まないもの（隠しファイル・node_modules・参照されていない添付）は入らない', () => {
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

  test('文字コードを判定して、文字列として埋め込む（Shift_JIS・UTF-16・BOM 付き UTF-8）', () => {
    const text = (p) => site.site.files.find((f) => f.path === p).text;
    assert.ok(text('sjis.md').startsWith('# シフトJISの文書'));
    assert.ok(text('utf16.md').startsWith('# UTF-16 の文書'));
    assert.ok(text('bom.md').startsWith('# BOM 付き UTF-8'), 'BOM は取り除く');
    assert.equal(text('README.md'), fs.readFileSync(path.join(FIXTURES, 'site/README.md'), 'utf8'));
  });

  test('添付は内容をそのまま（Base64）埋め込み、種類は拡張子から決める', () => {
    for (const f of site.site.files.filter((x) => x.kind === 'asset')) {
      const original = fs.readFileSync(path.join(FIXTURES, 'site', f.path));
      assert.ok(Buffer.from(f.base64, 'base64').equals(original), f.path);
      assert.equal(f.mime, core.mimeOf(f.path));
      assert.equal(typeof f.mtime, 'number');
    }
  });

  test('2 回実行しても、作成日時のほかは同じ出力になる', () => {
    const again = path.join(dir, 'again.html');
    assert.equal(run([path.join(FIXTURES, 'site'), '--out', again]).code, 0);
    const b = readSite(again);
    assert.deepEqual({ ...b.site, created: '' }, { ...site.site, created: '' });
    assert.match(b.site.created, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('さまざまな入力', () => {
  test('出力先の既定は「フォルダ名.html」。タイトルの既定はフォルダ名', () => {
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

  test('タイトルに HTML の記号が含まれていても、正しく埋め込まれる', () => {
    const dir = tmp();
    const docs = tree(path.join(dir, 'docs'), { 'README.md': '# x\n' });
    const out = path.join(dir, 'o.html');
    const title = '</title><script>alert(1)</script> & "quoted" <!-- x';
    assert.equal(run([docs, '--out', out, '--title', title]).code, 0);
    const site = readSite(out);
    assert.equal(site.config.title, title);
    assert.equal(site.parts.title, title);
    assert.equal((site.html.match(/<script/g) || []).length, site.ids.length, 'スクリプトの数は変わらない');
    assert.ok(site.html.includes('<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quoted&quot; &lt;!-- x</title>'));
  });

  test('ホーム文書: README.md → index.md → 先頭の文書。--home で指定もできる', () => {
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
    assert.equal(home({ 'README.md': '# r\n', 'guide/start.md': '# s\n' }, ['--home', 'guide/start']), 'guide/start.md', '拡張子は省略できる');
  });

  test('数式・図を使っていなければライブラリを省き、HTML で書かれた参照も添付として集める', () => {
    const dir = tmp();
    const out = path.join(dir, 'plain.html');
    const r = run([path.join(FIXTURES, 'plain'), '--out', out]);
    assert.equal(r.code, 0, r.err);
    assert.ok(r.out.includes('数式ライブラリ: 除外、図のライブラリ: 除外'));
    const site = readSite(out);
    assert.deepEqual(site.ids, ['mdv-config', 'mdv-site', 'mdv-res-help-ja', 'mdv-res-help-en', 'mdv-res-licenses', 'mdv-js-vendor', 'mdv-js-app']);
    assert.deepEqual(site.site.files.map((f) => f.path), ['README.md', 'b.md', 'c.md', 'files/data.txt', 'img/p.png', 'img/q.png']);
    assert.ok(fs.statSync(out).size < 1024 * 1024);
    // CSP から、使わないライブラリのハッシュも外れている
    assert.equal((site.parts.csp.match(/'sha256-/g) || []).length, 2);
  });

  test('20MB を超える添付は含めず、その旨を表示する。10MB を超える文書は変換の対象にしない', () => {
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
    assert.ok(!site.ids.includes('mdv-lib-katex'), '10MB を超える文書の中の数式は数えない（ビューアでもテキスト表示になる）');
  });

  test('軽量版のビューアをもとにすることもできる', () => {
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

  test('文書の中の </script> や <!-- は、そのまま読める形で安全に埋め込まれる', () => {
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

describe('コマンドライン版の書き出しの英語の表示（FD-10）', () => {
  test('結果、エラー、--help を英語で表示する', () => {
    const out = path.join(tmp(), 'site.html');
    let r = run([path.join(ROOT, 'sample-docs-en'), '--out', out], { lang: 'en' });
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

describe('見た目の CSS を埋め込む（--css、SPEC FR-1006）', () => {
  const docs = () => tree(tmp(), { 'README.md': '# home\n' });

  test('指定した CSS を埋め込み、BOM は取り除く。書き出したものをもとにすると引き継ぐ', () => {
    const dir = tmp();
    const css = path.join(dir, 'look.css');
    fs.writeFileSync(css, '\uFEFFh1 { color: rgb(1, 2, 3); }\n');
    const out = path.join(dir, 'site.html');
    let r = run([docs(), '--out', out, '--css', css]);
    assert.equal(r.code, 0, r.err);
    let site = readSite(out);
    assert.equal(site.parts.userCss, 'h1 { color: rgb(1, 2, 3); }\n');
    // 書き出した HTML をビューアにして、指定せずに書き出すと引き継ぐ
    const again = path.join(dir, 'again.html');
    r = run([docs(), '--out', again, '--viewer', out]);
    assert.equal(r.code, 0, r.err);
    assert.equal(readSite(again).parts.userCss, 'h1 { color: rgb(1, 2, 3); }\n');
    // 指定しなければ埋め込まない（配布物のビューアには埋め込みがない）
    r = run([docs(), '--out', path.join(dir, 'plain.html')]);
    site = readSite(path.join(dir, 'plain.html'));
    assert.equal(site.parts.userCss, '');
    assert.ok(!site.html.slice(0, site.html.indexOf('</head>')).includes('<style id="mdv-user-style">'));
  });

  test('</style を含む CSS、大きすぎる CSS、ないファイルは、理由を示して止まり、何も書き出さない', () => {
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
