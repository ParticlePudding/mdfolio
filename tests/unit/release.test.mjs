// Checks of the release files (tools/dev/make-release.mjs) (SPEC 8.8)
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

/** Returns the list of entry names from the zip central directory. */
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

describe('Release', () => {
  test('Extracts only the section for the given version from the changelog', () => {
    const text = '# x\n\n## 1.2.0 — 2026-11-16\n\n### 追加\n\n- a\n\n## 1.1.0 — 2026-11-15\n\n- b\n';
    assert.equal(sectionOf(text, '1.2.0'), '### 追加\n\n- a');
    assert.equal(sectionOf(text, '1.1.0'), '- b');
    assert.equal(sectionOf(text, '1.1'), null);
    assert.equal(sectionOf(text, '9.9.9'), null);
  });

  test('The changelog has a section for the current version, and there is only one changelog', () => {
    assert.ok(sectionOf(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), version));
    assert.ok(!fs.existsSync(path.join(ROOT, 'CHANGELOG.en.md')));
  });

  test('Creates the single HTML file, the zip and the notes; the zip has the repository layout and contains what the README steps need (AU-3)', { skip: !hasPython }, () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-release-'));
    const r = spawnSync(process.execPath, [tool, out], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(fs.readdirSync(out).sort(), [`mdfolio-${version}.zip`, 'mdfolio.html', 'notes.md']);
    assert.ok(fs.readFileSync(path.join(out, 'mdfolio.html')).equals(fs.readFileSync(path.join(ROOT, 'dist/mdfolio.html'))));
    const names = zipNames(path.join(out, `mdfolio-${version}.zip`));
    const top = `mdfolio-${version}/`;
    assert.ok(names.every((n) => n.startsWith(top)), 'there is one top-level folder');
    for (const p of ['dist/mdfolio.html', 'examples/mdfolio.css',
      'sample-docs/guide/基本操作.md', 'sample-docs-en/guide/basics.md', 'sample.md', 'sample.en.md',
      'README.md', 'README.ja.md', 'CHANGELOG.md', 'LICENSE', 'THIRD-PARTY-NOTICES.txt']) assert.ok(names.includes(top + p), p);
    assert.ok(!names.includes(top + 'CHANGELOG.en.md'));
    assert.ok(!names.some((n) => /node_modules|\/\.git\/|\/src\/|\/tests\/|test-results|TEST_REPORT|CLAUDE\.md/.test(n)), 'contains no development files, test results or maintainer notes');
    assert.ok(!names.some((n) => n.startsWith(top + 'dist/mdfolio/')), 'does not contain the folder version (removed in 1.3.0)');
    assert.equal(CONTENTS.length, 11);
    assert.ok(!names.some((n) => n.startsWith(top + 'tools/')), 'it is for users, so it contains no Node.js tools');
    const notes = fs.readFileSync(path.join(out, 'notes.md'), 'utf8');
    assert.ok(notes.includes('### ') && notes.includes('Assets:'));
    assert.ok(!/[\u3040-\u30ff]/.test(notes), 'the release notes are in English (no kana)');
    assert.ok(!notes.includes(`## ${version}`), 'the section heading is not included');
    fs.rmSync(out, { recursive: true, force: true });
  });
});
