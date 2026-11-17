#!/usr/bin/env node
/**
 * 説明書（README.ja.md と docs/ の文書）を、mdfolio 自身で 1 つのサイト HTML に書き出す。
 *
 *   node tools/dev/make-docs-site.mjs [出力.html] [--lang en]      既定: dist/mdfolio-docs.html
 *
 * --lang en を付けると、英語の README（README.md）だけの説明書を作る（仕様書などは日本語だけのため）。
 * 画面の言語は、日本語版は ja、英語版は en に固定する。
 * README の先頭の言語の切り替えの行（「**English** | [日本語](README.ja.md)」など）は、説明書の中では
 * リンク先がないので取り除く。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const langAt = argv.indexOf('--lang');
const lang = langAt >= 0 ? argv.splice(langAt, 2)[1] : 'ja';
if (lang !== 'ja' && lang !== 'en') { console.error('--lang は ja か en です'); process.exit(1); }
const out = path.resolve(argv[0] || path.join(ROOT, 'dist/mdfolio-docs.html'));
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-docs-'));
const readme = lang === 'en' ? 'README.md' : 'README.ja.md';
const dropLangLine = (text) => text.replace(/^(?:\*\*English\*\* \| \[日本語\]\(README\.ja\.md\)|\[English\]\(README\.md\) \| \*\*日本語\*\*)\n+/, '');

fs.writeFileSync(path.join(work, 'README.md'), dropLangLine(fs.readFileSync(path.join(ROOT, readme), 'utf8')));
if (lang === 'ja') {
  for (const name of ['SPEC.md', 'REVIEW.md', 'TEST_REPORT.md']) fs.copyFileSync(path.join(ROOT, 'docs', name), path.join(work, name));
  fs.writeFileSync(path.join(work, '_sidebar.md'), [
    '- [はじめに（README）](README.md)',
    '- 作成の記録',
    '  - [仕様書](SPEC.md)',
    '  - [仕様レビュー記録](REVIEW.md)',
    '  - [テスト報告書](TEST_REPORT.md)',
    ''
  ].join('\n'));
}
// 更新日時を固定して、同じ内容からは同じ HTML ができるようにする
const stamp = new Date(fs.statSync(path.join(ROOT, readme)).mtimeMs);
for (const name of fs.readdirSync(work)) fs.utimesSync(path.join(work, name), stamp, stamp);

const title = lang === 'en' ? 'mdfolio documentation' : 'mdfolio ドキュメント';
process.stdout.write(execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), work, '--out', out, '--title', title, '--lang', lang], { cwd: ROOT, encoding: 'utf8' }));
fs.rmSync(work, { recursive: true, force: true });
