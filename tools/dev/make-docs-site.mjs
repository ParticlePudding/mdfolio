#!/usr/bin/env node
/**
 * 説明書を、mdfolio 自身で 1 つのサイト HTML に書き出す。
 *
 *   node tools/dev/make-docs-site.mjs [出力.html] [--lang ja]      既定: 英語、dist/mdfolio-docs.html
 *
 * 英語（既定）は README.md と docs/ の 3 文書（仕様書・レビュー記録・テスト報告書）。
 * --lang ja は日本語の README（README.ja.md）だけ（3 文書は英語のため）。
 * 画面の言語は、英語版は en、日本語版は ja に固定する。
 * README の先頭の言語の切り替えの行は、説明書の中ではリンク先がないので取り除く。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const langAt = argv.indexOf('--lang');
const lang = langAt >= 0 ? argv.splice(langAt, 2)[1] : 'en';
if (lang !== 'ja' && lang !== 'en') { console.error('--lang は ja か en です'); process.exit(1); }
const out = path.resolve(argv[0] || path.join(ROOT, 'dist/mdfolio-docs.html'));
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-docs-'));
const readme = lang === 'en' ? 'README.md' : 'README.ja.md';
const dropLangLine = (text) => text.replace(/^(?:\*\*English\*\* \| \[日本語\]\(README\.ja\.md\)|\[English\]\(README\.md\) \| \*\*日本語\*\*)\n+/, '');

fs.writeFileSync(path.join(work, 'README.md'), dropLangLine(fs.readFileSync(path.join(ROOT, readme), 'utf8')));
// 仕様書・レビュー記録・テスト報告書は英語なので、英語の説明書にだけ入れる
if (lang === 'en') {
  for (const name of ['SPEC.md', 'REVIEW.md', 'TEST_REPORT.md']) fs.copyFileSync(path.join(ROOT, 'docs', name), path.join(work, name));
  fs.writeFileSync(path.join(work, '_sidebar.md'), [
    '- [Introduction (README)](README.md)',
    '- Design records',
    '  - [Specification](SPEC.md)',
    '  - [Spec review record](REVIEW.md)',
    '  - [Test report](TEST_REPORT.md)',
    ''
  ].join('\n'));
}
// 更新日時を固定して、同じ内容からは同じ HTML ができるようにする
const stamp = new Date(fs.statSync(path.join(ROOT, readme)).mtimeMs);
for (const name of fs.readdirSync(work)) fs.utimesSync(path.join(work, name), stamp, stamp);

const title = lang === 'en' ? 'mdfolio documentation' : 'mdfolio ドキュメント';
process.stdout.write(execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), work, '--out', out, '--title', title, '--lang', lang], { cwd: ROOT, encoding: 'utf8' }));
fs.rmSync(work, { recursive: true, force: true });
