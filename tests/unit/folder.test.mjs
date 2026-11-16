// フォルダ版のビルド（tools/build-folder.mjs）と更新コマンド（tools/update.mjs）
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync, execFileSync } from 'node:child_process';
import { ROOT, core } from '../helpers/load.mjs';

const BUILT = path.join(ROOT, 'dist/mdfolio');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-folder-'));

before(() => {
  if (!fs.existsSync(path.join(BUILT, 'index.html'))) execFileSync(process.execPath, [path.join(ROOT, 'tools/build-folder.mjs')], { cwd: ROOT, stdio: 'ignore' });
});

function copyFolder() {
  const dir = path.join(tmp(), 'mdfolio');
  fs.cpSync(BUILT, dir, { recursive: true });
  return dir;
}
// 表示の言語は MDFOLIO_LANG で固定する（既定は日本語。実行する機械の言語設定に左右されないように）
const update = (dir, args = [], lang = 'ja') => spawnSync(process.execPath, [path.join(dir, 'tools/update.mjs'), ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, MDFOLIO_LANG: lang } });

/** data/*.js を評価して window.MDV_DATA を返す。 */
function readData(dir, ...files) {
  const context = vm.createContext({ window: {} });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  // 別の実行環境のオブジェクトなので、比べやすいよう JSON を通して写す
  return JSON.parse(JSON.stringify(context.window.MDV_DATA));
}

describe('フォルダ版のビルド', () => {
  test('スクリプトとリソースは単一 HTML と同じ中身。CSS はソースのまま', () => {
    const parts = core.extractParts(fs.readFileSync(path.join(ROOT, 'dist/mdfolio.html'), 'utf8'));
    const text = (id) => core.findBlock(parts, id).text;
    const strip = (rel) => fs.readFileSync(path.join(BUILT, rel), 'utf8').replace(/^\/\*[^\n]*\*\/\n/, '');
    assert.equal(strip('lib/vendor.js'), text('mdv-js-vendor'));
    assert.equal(strip('lib/mdfolio.js'), text('mdv-js-app'));
    assert.equal(fs.readFileSync(path.join(BUILT, 'lib/katex.js'), 'utf8'), JSON.parse(text('mdv-lib-katex')));
    assert.equal(fs.readFileSync(path.join(BUILT, 'lib/mermaid.js'), 'utf8'), JSON.parse(text('mdv-lib-mermaid')));
    assert.equal(fs.readFileSync(path.join(BUILT, 'style/document.css'), 'utf8'), fs.readFileSync(path.join(ROOT, 'src/document.css'), 'utf8'));
    assert.equal(fs.readFileSync(path.join(BUILT, 'style/app.css'), 'utf8'), fs.readFileSync(path.join(ROOT, 'src/app.css'), 'utf8'));
    // 単一 HTML の CSS は、app.css と document.css をこの順につないだもの
    assert.equal(parts.css, fs.readFileSync(path.join(ROOT, 'src/app.css'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src/document.css'), 'utf8'));
    const data = readData(BUILT, 'lib/resources.js', 'lib/export.js');
    assert.deepEqual(data['mdv-lib-files'], { export: 'lib/export.js', katex: 'lib/katex.js', 'katex-css': 'lib/katex.css', mermaid: 'lib/mermaid.js' });
    assert.equal(data['mdv-res-help-ja'], JSON.parse(text('mdv-res-help-ja')));
    assert.deepEqual(data['mdv-export'], { csp: parts.csp, generator: parts.generator, css: parts.css, blocks: parts.blocks });
  });

  test('index.html: CSP はスクリプトを lib/・data/ と同じ場所に限り、インラインのスクリプトは設定（JSON）だけ', () => {
    const html = fs.readFileSync(path.join(BUILT, 'index.html'), 'utf8');
    const csp = core.unescapeHtml(html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1]);
    assert.ok(csp.includes("script-src 'self' file:;"));
    assert.ok(csp.includes("connect-src 'none'"));
    assert.ok(!/unsafe-eval|unsafe-inline'[^;]*;\s*img/.test(csp.split('style-src')[0]));
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].map((m) => m[1]);
    assert.deepEqual(inline, [' type="application/json" id="mdv-config"']);
    assert.deepEqual(JSON.parse(html.match(/id="mdv-config">([^<]*)</)[1]), core.DEFAULT_CONFIG);
    assert.deepEqual([...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]), ['lib/vendor.js', 'lib/resources.js', 'data/site.js', 'data/styles.js', 'lib/mdfolio.js']);
  });
});

describe('更新コマンド', () => {
  test('作るサイトデータは、コマンドライン版の書き出し（build-site）と同じ', () => {
    const dir = copyFolder();
    const docs = path.join(ROOT, 'tests/fixtures/site');
    const r = update(dir, ['--docs', docs]);
    assert.equal(r.status, 0, r.stderr);
    const site = readData(dir, 'data/site.js')['mdv-site'];
    const out = path.join(tmp(), 'site.html');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), docs, '--out', out], { cwd: ROOT });
    const expected = JSON.parse(core.findBlock(core.extractParts(fs.readFileSync(out, 'utf8')), 'mdv-site').text);
    assert.deepEqual(Object.assign({}, site, { created: '' }), Object.assign({}, expected, { created: '' }), '作成日時のほかは同じ');
    assert.equal(core.validateSiteData(site).ok, true);
  });

  test('タイトルとホームは、指定しなければ前回の指定を引き継ぐ。"" で消せる。ホームの文書がなくなったら自動で選び直す', () => {
    const dir = copyFolder();
    const meta = () => readData(dir, 'data/site.js')['mdv-site-meta'];
    assert.equal(update(dir, ['--title', '部の文書', '--home', 'guide/基本操作.md']).status, 0);
    assert.deepEqual(meta(), { title: '部の文書', home: 'guide/基本操作.md', homeSpecified: true });
    assert.equal(update(dir).status, 0);
    assert.deepEqual(meta(), { title: '部の文書', home: 'guide/基本操作.md', homeSpecified: true });
    fs.rmSync(path.join(dir, 'docs/guide/基本操作.md'));
    const r = update(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('前回指定したホーム（guide/基本操作.md）が見つからないため、自動で選びました'));
    assert.deepEqual(meta(), { title: '部の文書', home: 'README.md', homeSpecified: false });
    assert.equal(update(dir, ['--title', '']).status, 0);
    assert.equal(meta().title, '');
  });

  test('CSS の写しを作る。文書がない・文書フォルダがないときは、文書なしのデータにする', () => {
    const dir = copyFolder();
    fs.appendFileSync(path.join(dir, 'style/document.css'), '\n.x { color: red; }\n');
    fs.rmSync(path.join(dir, 'docs'), { recursive: true });
    const r = update(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('注意: 文書フォルダが見つかりません'));
    const data = readData(dir, 'data/site.js', 'data/styles.js');
    assert.equal(data['mdv-site'], null);
    assert.ok(data['mdv-styles'].document.endsWith('.x { color: red; }\n'));
    assert.equal(data['mdv-styles'].app, fs.readFileSync(path.join(dir, 'style/app.css'), 'utf8'));
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.writeFileSync(path.join(dir, 'docs/memo.txt'), 'x');
    assert.equal(update(dir).status, 0);
    assert.equal(readData(dir, 'data/site.js')['mdv-site'], null);
  });

  test('誤りは理由を示して終了コード 1。data/ のファイルは壊さない', () => {
    const dir = copyFolder();
    const before = fs.readFileSync(path.join(dir, 'data/site.js'), 'utf8');
    const cases = [
      [['--home', 'none.md'], '--home の文書が見つかりません'],
      [['--zzz'], '不明なオプション'],
      [['--title'], '値が必要です']
    ];
    for (const [args, message] of cases) {
      const r = update(dir, args);
      assert.equal(r.status, 1, args.join(' '));
      assert.ok(r.stderr.includes(message), r.stderr);
    }
    fs.appendFileSync(path.join(dir, 'style/document.css'), '\n/* </style> */\n');
    const r = update(dir);
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes('style/document.css に "</style"'));
    assert.equal(fs.readFileSync(path.join(dir, 'data/site.js'), 'utf8'), before);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'data')).sort(), ['site.js', 'styles.js'], '一時ファイルを残さない');
  });

  test('--help で使い方を表示する', () => {
    const r = update(copyFolder(), ['--help']);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('node tools/update.mjs [オプション]'));
  });

  test('英語でも表示する: 結果、注意、エラー、--help（FD-10）', () => {
    const dir = copyFolder();
    let r = update(dir, [], 'en');
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('Rebuilt data/site.js and data/styles.js'), r.stdout);
    assert.match(r.stdout, /\d+ document\(s\), \d+ attachment\(s\)/);
    assert.ok(!/[\u3040-\u30ff]/.test(r.stdout), '仮名を含まない: ' + r.stdout);
    r = update(dir, ['--docs', path.join(dir, 'nothing-here')], 'en');
    assert.ok(r.stdout.includes('Note: The document folder was not found'), r.stdout);
    r = update(dir, ['--bogus'], 'en');
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes('Error: Unknown option: --bogus'), r.stderr);
    r = update(dir, ['--help'], 'en');
    assert.ok(r.stdout.includes('node tools/update.mjs [options]'));
    assert.ok(!/[\u3040-\u30ff]/.test(r.stdout));
  });

  test('表示の言語の決め方: MDFOLIO_LANG → LC_ALL → LC_MESSAGES → LANG → OS の設定（FD-10）', async () => {
    const { detectLang } = await import(path.join(BUILT, 'tools/update.mjs'));
    assert.equal(detectLang({ MDFOLIO_LANG: 'en', LANG: 'ja_JP.UTF-8' }), 'en');
    assert.equal(detectLang({ MDFOLIO_LANG: 'ja', LANG: 'C' }), 'ja');
    assert.equal(detectLang({ LC_ALL: 'ja_JP.UTF-8', LANG: 'en_US.UTF-8' }), 'ja');
    assert.equal(detectLang({ LC_ALL: '', LC_MESSAGES: 'en_GB.UTF-8', LANG: 'ja_JP.UTF-8' }), 'en');
    assert.equal(detectLang({ LANG: 'ja_JP.UTF-8' }), 'ja');
    assert.equal(detectLang({ LANG: 'C.UTF-8' }), 'en');
    assert.match(detectLang({}), /^(ja|en)$/);
  });
});
