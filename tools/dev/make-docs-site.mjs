#!/usr/bin/env node
/**
 * 説明書（README.md と docs/ の文書）を、mdfolio 自身で 1 つのサイト HTML に書き出す。
 *
 *   node tools/dev/make-docs-site.mjs [出力.html]      既定: dist/mdfolio-docs.html
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'dist/mdfolio-docs.html'));
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-docs-'));

fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(work, 'README.md'));
for (const name of ['SPEC.md', 'REVIEW.md', 'TEST_REPORT.md']) fs.copyFileSync(path.join(ROOT, 'docs', name), path.join(work, name));
fs.writeFileSync(path.join(work, '_sidebar.md'), [
  '- [はじめに（README）](README.md)',
  '- 作成の記録',
  '  - [仕様書](SPEC.md)',
  '  - [仕様レビュー記録](REVIEW.md)',
  '  - [テスト報告書](TEST_REPORT.md)',
  ''
].join('\n'));
// 更新日時を固定して、同じ内容からは同じ HTML ができるようにする
const stamp = new Date(fs.statSync(path.join(ROOT, 'README.md')).mtimeMs);
for (const name of fs.readdirSync(work)) fs.utimesSync(path.join(work, name), stamp, stamp);

process.stdout.write(execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), work, '--out', out, '--title', 'mdfolio ドキュメント'], { cwd: ROOT, encoding: 'utf8' }));
fs.rmSync(work, { recursive: true, force: true });
