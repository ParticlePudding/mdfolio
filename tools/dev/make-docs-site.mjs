#!/usr/bin/env node
/**
 * Exports the documentation as one site HTML file, using mdfolio itself.
 *
 *   node tools/dev/make-docs-site.mjs [output.html] [--lang ja]      Default: English, dist/mdfolio-docs.html
 *
 * English (the default) contains README.md and the 3 documents in docs/ (specification, review record, test report).
 * --lang ja contains only the Japanese README (README.ja.md), because the 3 documents are in English.
 * The interface language is fixed to en for the English version and ja for the Japanese version.
 * The language switch line at the top of the README is removed, because its link target is not in the documentation.
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
if (lang !== 'ja' && lang !== 'en') { console.error('--lang must be ja or en'); process.exit(1); }
const out = path.resolve(argv[0] || path.join(ROOT, 'dist/mdfolio-docs.html'));
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-docs-'));
const readme = lang === 'en' ? 'README.md' : 'README.ja.md';
const dropLangLine = (text) => text.replace(/^(?:\*\*English\*\* \| \[日本語\]\(README\.ja\.md\)|\[English\]\(README\.md\) \| \*\*日本語\*\*)\n+/, '');

// The temporary folder is removed even when the export fails
try {
  fs.writeFileSync(path.join(work, 'README.md'), dropLangLine(fs.readFileSync(path.join(ROOT, readme), 'utf8')));
  // The specification, review record and test report are in English, so they go only into the English documentation
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
  // Fix the modification times so that the same content always gives the same HTML
  const stamp = new Date(fs.statSync(path.join(ROOT, readme)).mtimeMs);
  for (const name of fs.readdirSync(work)) fs.utimesSync(path.join(work, name), stamp, stamp);

  const title = lang === 'en' ? 'mdfolio documentation' : 'mdfolio ドキュメント';
  process.stdout.write(execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.mjs'), work, '--out', out, '--title', title, '--lang', lang], { cwd: ROOT, encoding: 'utf8' }));
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
