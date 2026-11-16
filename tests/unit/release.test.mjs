// リリースのファイル（tools/dev/make-release.mjs）の確認（SPEC 8.8）
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../helpers/load.mjs';

const tool = path.join(ROOT, 'tools/dev/make-release.mjs');
const { sectionOf, CONTENTS } = await import(tool);
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const hasPython = spawnSync('python3', ['--version']).status === 0;

/** zip の中央ディレクトリから、項目の名前の一覧を返す。 */
function zipNames(file) {
  const buf = fs.readFileSync(file);
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0, n = buf.readUInt16LE(eocd + 10); i < n; i++) {
    const len = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), comment = buf.readUInt16LE(p + 32);
    names.push(buf.slice(p + 46, p + 46 + len).toString('utf8'));
    p += 46 + len + extra + comment;
  }
  return names;
}

describe('リリース', () => {
  test('変更履歴から、その版の節だけを取り出す', () => {
    const text = '# x\n\n## 1.2.0 — 2026-11-16\n\n### 追加\n\n- a\n\n## 1.1.0 — 2026-11-15\n\n- b\n';
    assert.equal(sectionOf(text, '1.2.0'), '### 追加\n\n- a');
    assert.equal(sectionOf(text, '1.1.0'), '- b');
    assert.equal(sectionOf(text, '1.1'), null);
    assert.equal(sectionOf(text, '9.9.9'), null);
  });

  test('今の版の節が変更履歴にあり、変更履歴は 1 つだけ（日本語）', () => {
    assert.ok(sectionOf(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), version));
    assert.ok(!fs.existsSync(path.join(ROOT, 'CHANGELOG.en.md')));
  });

  test('単一 HTML、zip、説明を作る。zip はリポジトリと同じ並びで、README の手順に要るものを含む（AU-3）', { skip: !hasPython }, () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-release-'));
    const r = spawnSync(process.execPath, [tool, out], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(fs.readdirSync(out).sort(), [`mdfolio-${version}.zip`, 'mdfolio.html', 'notes.md']);
    assert.ok(fs.readFileSync(path.join(out, 'mdfolio.html')).equals(fs.readFileSync(path.join(ROOT, 'dist/mdfolio.html'))));
    const names = zipNames(path.join(out, `mdfolio-${version}.zip`));
    const top = `mdfolio-${version}/`;
    assert.ok(names.every((n) => n.startsWith(top)), '最上位のフォルダは 1 つ');
    for (const p of ['dist/mdfolio.html', 'dist/mdfolio/index.html', 'dist/mdfolio/tools/update.mjs', 'dist/mdfolio/README.txt', 'dist/mdfolio/はじめに.txt',
      'tools/build-site.mjs', 'sample-docs/guide/基本操作.md', 'sample-docs-en/guide/basics.md', 'sample.md', 'sample.en.md',
      'README.md', 'README.en.md', 'CHANGELOG.md', 'LICENSE', 'THIRD-PARTY-NOTICES.txt']) assert.ok(names.includes(top + p), p);
    assert.ok(!names.includes(top + 'CHANGELOG.en.md'));
    assert.ok(!names.some((n) => /node_modules|\/\.git\/|\/src\/|\/tests\//.test(n)), '開発用のファイルを含まない');
    assert.equal(CONTENTS.length, 12);
    const notes = fs.readFileSync(path.join(out, 'notes.md'), 'utf8');
    assert.ok(notes.includes('### ') && notes.includes('Assets:'));
    assert.ok(!notes.includes(`## ${version}`), '節の見出しは入れない');
    fs.rmSync(out, { recursive: true, force: true });
  });
});
