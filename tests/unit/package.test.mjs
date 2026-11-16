// 配布のための道具: zip の作成（日本語のファイル名）と、外部のホスティング環境に置くための変換
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, core } from '../helpers/load.mjs';

const VIEWER = path.join(ROOT, 'dist/mdfolio.html');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-pkg-'));

/** zip の中央ディレクトリを読んで、各項目の名前（バイト列）とフラグを返す。 */
function readZipEntries(file) {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.ok(eocd >= 0, 'zip の終端が見つかる');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50);
    const flags = buf.readUInt16LE(p + 8);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    entries.push({ nameBytes: buf.subarray(p + 46, p + 46 + nameLen), flags });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

describe('zip の作成（tools/dev/make-zip.py）', () => {
  const python = spawnSync('python3', ['--version'], { encoding: 'utf8' });
  const skip = python.status !== 0 ? 'python3 がない環境' : false;

  test('日本語のファイル名に、UTF-8 であることを示す印を付ける（付けないと Windows で文字化けする）', { skip }, () => {
    const dir = tmp();
    const src = path.join(dir, 'docs');
    fs.mkdirSync(path.join(src, 'guide'), { recursive: true });
    fs.writeFileSync(path.join(src, 'README.md'), '# r\n');
    fs.writeFileSync(path.join(src, 'guide', '基本操作.md'), '# 基本操作\n');
    fs.writeFileSync(path.join(src, 'はじめに.txt'), 'x\n');
    fs.writeFileSync(path.join(src, '.DS_Store'), 'x');
    const out = path.join(dir, 'out.zip');
    const r = spawnSync('python3', [path.join(ROOT, 'tools/dev/make-zip.py'), out, 'パッケージ', src, path.join(src, 'README.md') + '=読んでください.md'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const entries = readZipEntries(out);
    const names = entries.map((e) => new TextDecoder('utf-8', { fatal: true }).decode(e.nameBytes)).sort();
    assert.deepEqual(names, ['パッケージ/docs/README.md', 'パッケージ/docs/guide/基本操作.md', 'パッケージ/docs/はじめに.txt', 'パッケージ/読んでください.md'].sort());
    for (const e of entries) {
      assert.equal((e.flags & 0x800) !== 0, true, 'UTF-8 の印（汎用フラグのビット 11）');
      assert.equal(e.nameBytes.includes(0x5c), false, '区切りは /');
    }
  });

  test('引数が足りないときは、使い方を表示して終わる', { skip }, () => {
    const r = spawnSync('python3', [path.join(ROOT, 'tools/dev/make-zip.py')], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.ok(r.stdout.includes('make-zip.py'));
  });
});

describe('外部のホスティング環境に置くための変換（tools/dev/make-hosted.mjs）', () => {
  const run = (args) => spawnSync(process.execPath, [path.join(ROOT, 'tools/dev/make-hosted.mjs'), ...args], { cwd: ROOT, encoding: 'utf8' });
  // 置換文字（U+FFFD）。このファイルには、その文字そのものを書かない
  const REPLACEMENT = String.fromCharCode(0xFFFD);
  const ESCAPED = '\\' + 'uFFFD';
  const count = (text, part) => text.split(part).length - 1;

  test('CSP の指定を取り除き、保存と外部画像を使わない設定にする。ほかは変えない', () => {
    const out = path.join(tmp(), 'hosted.html');
    const r = run([VIEWER, out]);
    assert.equal(r.status, 0, r.stderr);
    const before = fs.readFileSync(VIEWER, 'utf8');
    const after = fs.readFileSync(out, 'utf8');
    // スクリプトの中にも同じ文字列があるので、行の先頭にあるもの（<head> の中の指定）だけを数える
    const metaCsp = (html) => html.split('\n').filter((l) => l.startsWith('<meta http-equiv="Content-Security-Policy"')).length;
    assert.equal(metaCsp(before), 1);
    assert.equal(metaCsp(after), 0, 'HTML に書いた CSP がない');
    assert.ok(after.startsWith('<!DOCTYPE html>'));
    // 設定のブロックと CSP の行、置換文字の書き方（下のテスト）のほかは、1 文字も変わらない
    const cspLine = before.split('\n').find((l) => l.startsWith('<meta http-equiv="Content-Security-Policy"')) + '\n';
    const configRe = /<script type="application\/json" id="mdv-config">[^\n]*<\/script>/;
    assert.equal(after.replace(configRe, ''), before.replace(cspLine, '').replace(configRe, '').split(REPLACEMENT).join(ESCAPED));
    const config = JSON.parse(after.match(/<script type="application\/json" id="mdv-config">([^\n]*)<\/script>/)[1]);
    assert.deepEqual(config, { title: '', lang: 'auto', theme: 'auto', home: '', allowExternalImages: false, allowDownloads: false, lockExternalImages: true, hosted: true });
  });

  test('置換文字（U+FFFD）を含まない HTML にする。スクリプトでは、同じ意味のエスケープに書き換える', () => {
    const out = path.join(tmp(), 'hosted.html');
    assert.equal(run([VIEWER, out]).status, 0);
    const before = fs.readFileSync(VIEWER, 'utf8');
    const after = fs.readFileSync(out, 'utf8');
    const literal = count(before, REPLACEMENT);
    assert.ok(literal > 0, '同梱ライブラリ（markdown-it）が、この文字を使っている');
    assert.equal(count(after, REPLACEMENT), 0);
    assert.equal(count(after, ESCAPED) - count(before, ESCAPED), literal, '1 文字ずつエスケープに置き換わっている');
    // 書き換えたスクリプトを実行して、もとの文字列と同じ値になることを確かめる（markdown-it の該当部分と同じ形の式）
    const vendor = (html) => core.findBlock(core.extractParts(html.includes('<meta http-equiv="Content-Security-Policy"') ? html : html.replace('<meta name="generator"', '<meta http-equiv="Content-Security-Policy" content="x">\n<meta name="generator"')), 'mdv-js-vendor').text;
    const literals = (text) => (text.match(new RegExp('`(?:' + REPLACEMENT + '|\\\\uFFFD)+`', 'g')) || []).map((src) => (0, eval)(src));
    const a = literals(vendor(before));
    const b = literals(vendor(after));
    assert.equal(a.length >= 5, true);
    assert.deepEqual(b, a);
    for (const value of b) assert.ok(/^\uFFFD+$/.test(value));
  });

  test('文書のデータに置換文字が含まれていても、読み取った内容は変わらない', () => {
    const dir = tmp();
    const docs = path.join(dir, 'docs');
    fs.mkdirSync(docs);
    fs.writeFileSync(path.join(docs, 'README.md'), '# 文字化けした文書\n\nここに ' + REPLACEMENT + REPLACEMENT + ' があります。\n');
    const site = path.join(dir, 'site.html');
    const built = spawnSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), docs, '--out', site], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(built.status, 0, built.stderr);
    const out = path.join(dir, 'hosted.html');
    assert.equal(run([site, out]).status, 0);
    const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8').match(/id="mdv-site">([^\n]*)<\/script>/)[1]);
    const after = fs.readFileSync(out, 'utf8');
    assert.equal(count(after, REPLACEMENT), 0);
    assert.deepEqual(read(out), read(site));
    assert.ok(read(out).files[0].text.includes(REPLACEMENT + REPLACEMENT));
  });

  test('意味を変えずに書き換えられると言い切れない場所に置換文字がある場合は、変換をやめる', () => {
    const dir = tmp();
    const cases = [
      ';var x = String.raw`' + REPLACEMENT + '`;',          // タグ付きのテンプレート（生の文字列を使う）
      ';var y = "a' + REPLACEMENT + 'b";',                  // ほかの文字と混ざっている
      ';var z = /' + REPLACEMENT + '/;'                     // 正規表現
    ];
    for (const extra of cases) {
      const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
      core.findBlock(parts, 'mdv-js-app').text += extra;
      const input = path.join(dir, 'in.html');
      fs.writeFileSync(input, core.composeHtml(parts));
      const out = path.join(dir, 'out.html');
      const r = run([input, out]);
      assert.equal(r.status, 1, extra);
      assert.ok(r.stderr.includes('安全に書き換えられません: mdv-js-app'), r.stderr);
      assert.equal(fs.existsSync(out), false);
    }
  });

  test('--title はサイトのタイトルと <title> を、--page-title は <title> だけを変える', () => {
    const dir = tmp();
    const a = path.join(dir, 'a.html');
    const b = path.join(dir, 'b.html');
    assert.equal(run([VIEWER, a, '--title', 'サンプル <1>']).status, 0);
    assert.equal(run([VIEWER, b, '--page-title', 'ビューア（お試し用）']).status, 0);
    const read = (file) => {
      const html = fs.readFileSync(file, 'utf8');
      return { title: html.match(/<title>([^<]*)<\/title>/)[1], config: JSON.parse(html.match(/id="mdv-config">([^\n]*)<\/script>/)[1]).title };
    };
    assert.deepEqual(read(a), { title: 'サンプル &lt;1&gt;', config: 'サンプル <1>' });
    assert.deepEqual(read(b), { title: 'ビューア（お試し用）', config: '' });
  });

  test('外部の画像を許可する設定の HTML を変換しても、許可は引き継がない', () => {
    const dir = tmp();
    const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
    core.findBlock(parts, 'mdv-config').text = core.jsonForScript({ allowExternalImages: true, theme: 'dark' });
    const input = path.join(dir, 'in.html');
    fs.writeFileSync(input, core.composeHtml(parts));
    const out = path.join(dir, 'out.html');
    assert.equal(run([input, out]).status, 0);
    const config = JSON.parse(fs.readFileSync(out, 'utf8').match(/id="mdv-config">([^\n]*)<\/script>/)[1]);
    assert.deepEqual([config.allowExternalImages, config.lockExternalImages, config.allowDownloads, config.hosted, config.theme], [false, true, false, true, 'dark']);
  });

  test('誤った指定は、理由を示して終了コード 1 で終わり、何も書き出さない', () => {
    const dir = tmp();
    const out = path.join(dir, 'x.html');
    const cases = [
      [[VIEWER], '入力と出力のファイルを指定してください'],
      [[path.join(dir, 'none.html'), out], '入力が見つかりません'],
      [[path.join(ROOT, 'README.md'), out], 'mdfolio の HTML として読み取れません'],
      [[VIEWER, out, '--zzz'], '不明なオプション'],
      [[VIEWER, out, '--title'], '値が必要です']
    ];
    for (const [args, message] of cases) {
      const r = run(args);
      assert.equal(r.status, 1, args.join(' '));
      assert.ok(r.stderr.includes(message), `${args.join(' ')} → ${r.stderr}`);
    }
    assert.deepEqual(fs.readdirSync(dir), []);
  });
});
