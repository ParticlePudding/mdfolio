// Distribution tools: creating the zip (with Japanese file names) and converting for external hosting environments
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, core } from '../helpers/load.mjs';

const VIEWER = path.join(ROOT, 'dist/mdfolio.html');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-pkg-'));

/** Reads the zip central directory and returns each entry's name (as bytes) and flags. */
function readZipEntries(file) {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.ok(eocd >= 0, 'the end of central directory record is found');
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

describe('Creating the zip (tools/dev/make-zip.py)', () => {
  const python = spawnSync('python3', ['--version'], { encoding: 'utf8' });
  const skip = python.status !== 0 ? 'python3 is not available' : false;

  test('Marks Japanese file names as UTF-8 (without it, Windows garbles them)', { skip }, () => {
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
      assert.equal((e.flags & 0x800) !== 0, true, 'UTF-8 flag (bit 11 of the general purpose flags)');
      assert.equal(e.nameBytes.includes(0x5c), false, 'the separator is /');
    }
  });

  test('Shows the usage and exits when arguments are missing', { skip }, () => {
    const r = spawnSync('python3', [path.join(ROOT, 'tools/dev/make-zip.py')], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.ok(r.stdout.includes('make-zip.py'));
  });
});

describe('Conversion for external hosting environments (tools/dev/make-hosted.mjs)', () => {
  const run = (args) => spawnSync(process.execPath, [path.join(ROOT, 'tools/dev/make-hosted.mjs'), ...args], { cwd: ROOT, encoding: 'utf8' });
  // The replacement character (U+FFFD). Do not write the character itself in this file
  const REPLACEMENT = String.fromCharCode(0xFFFD);
  const ESCAPED = '\\' + 'uFFFD';
  const count = (text, part) => text.split(part).length - 1;

  test('Removes the CSP and turns off saving and external images; nothing else changes', () => {
    const out = path.join(tmp(), 'hosted.html');
    const r = run([VIEWER, out]);
    assert.equal(r.status, 0, r.stderr);
    const before = fs.readFileSync(VIEWER, 'utf8');
    const after = fs.readFileSync(out, 'utf8');
    // The same text also appears inside scripts, so count only lines that start with it (the declaration in <head>)
    const metaCsp = (html) => html.split('\n').filter((l) => l.startsWith('<meta http-equiv="Content-Security-Policy"')).length;
    assert.equal(metaCsp(before), 1);
    assert.equal(metaCsp(after), 0, 'no CSP written in the HTML');
    assert.ok(after.startsWith('<!DOCTYPE html>'));
    // Apart from the settings block, the CSP line and how replacement characters are written (see the test below), not a single character changes
    const cspLine = before.split('\n').find((l) => l.startsWith('<meta http-equiv="Content-Security-Policy"')) + '\n';
    const configRe = /<script type="application\/json" id="mdv-config">[^\n]*<\/script>/;
    // The link to the neighboring mdfolio.css is also removed (the host cannot hold a file next to the page)
    const userCssLine = '<link rel="stylesheet" href="mdfolio.css" id="mdv-user-css">\n';
    assert.ok(before.includes(userCssLine) && !after.includes(userCssLine));
    assert.equal(after.replace(configRe, ''), before.replace(cspLine, '').replace(userCssLine, '').replace(configRe, '').split(REPLACEMENT).join(ESCAPED));
    const config = JSON.parse(after.match(/<script type="application\/json" id="mdv-config">([^\n]*)<\/script>/)[1]);
    assert.deepEqual(config, { title: '', lang: 'auto', theme: 'auto', home: '', allowExternalImages: false, allowDownloads: false, lockExternalImages: true, hosted: true });
  });

  test('Produces HTML without the replacement character (U+FFFD); in scripts it is rewritten as an escape with the same meaning', () => {
    const out = path.join(tmp(), 'hosted.html');
    assert.equal(run([VIEWER, out]).status, 0);
    const before = fs.readFileSync(VIEWER, 'utf8');
    const after = fs.readFileSync(out, 'utf8');
    const literal = count(before, REPLACEMENT);
    assert.ok(literal > 0, 'the bundled library (markdown-it) uses this character');
    assert.equal(count(after, REPLACEMENT), 0);
    assert.equal(count(after, ESCAPED) - count(before, ESCAPED), literal, 'each character is replaced by one escape');
    // Evaluate the rewritten literals and check they give the same values as the originals (expressions of the same form as in markdown-it)
    const vendor = (html) => core.findBlock(core.extractParts(html.includes('<meta http-equiv="Content-Security-Policy"') ? html : html.replace('<meta name="generator"', '<meta http-equiv="Content-Security-Policy" content="x">\n<meta name="generator"')), 'mdv-js-vendor').text;
    const literals = (text) => (text.match(new RegExp('`(?:' + REPLACEMENT + '|\\\\uFFFD)+`', 'g')) || []).map((src) => (0, eval)(src));
    const a = literals(vendor(before));
    const b = literals(vendor(after));
    assert.equal(a.length >= 5, true);
    assert.deepEqual(b, a);
    for (const value of b) assert.ok(/^\uFFFD+$/.test(value));
  });

  test('Replacement characters in document data do not change the parsed content', () => {
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

  test('Stops the conversion when a replacement character is somewhere it cannot be safely rewritten', () => {
    const dir = tmp();
    const cases = [
      ';var x = String.raw`' + REPLACEMENT + '`;',          // tagged template (uses the raw string)
      ';var y = "a' + REPLACEMENT + 'b";',                  // mixed with other characters
      ';var z = /' + REPLACEMENT + '/;'                     // regular expression
    ];
    for (const extra of cases) {
      const parts = core.extractParts(fs.readFileSync(VIEWER, 'utf8'));
      core.findBlock(parts, 'mdv-js-app').text += extra;
      const input = path.join(dir, 'in.html');
      fs.writeFileSync(input, core.composeHtml(parts));
      const out = path.join(dir, 'out.html');
      const r = run([input, out]);
      assert.equal(r.status, 1, extra);
      assert.ok(r.stderr.includes('Cannot safely rewrite the replacement character (U+FFFD) in the script: mdv-js-app'), r.stderr);
      assert.equal(fs.existsSync(out), false);
    }
  });

  test('--title changes the site title and <title>; --page-title changes only <title>', () => {
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

  test('Converting HTML that allows external images does not keep that permission', () => {
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

  test('Invalid arguments exit with code 1, show the reason and write nothing', () => {
    const dir = tmp();
    const out = path.join(dir, 'x.html');
    const cases = [
      [[VIEWER], 'Specify the input and output files'],
      [[path.join(dir, 'none.html'), out], 'Input not found'],
      [[path.join(ROOT, 'README.md'), out], 'Cannot read as an mdfolio HTML file'],
      [[VIEWER, out, '--zzz'], 'Unknown option'],
      [[VIEWER, out, '--title'], 'requires a value']
    ];
    for (const [args, message] of cases) {
      const r = run(args);
      assert.equal(r.status, 1, args.join(' '));
      assert.ok(r.stderr.includes(message), `${args.join(' ')} → ${r.stderr}`);
    }
    assert.deepEqual(fs.readdirSync(dir), []);
  });
});
