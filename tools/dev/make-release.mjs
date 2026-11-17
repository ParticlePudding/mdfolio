#!/usr/bin/env node
/**
 * Creates the release assets and the release notes (SPEC 8.8 AU-3, AU-5).
 *
 *   node tools/dev/make-release.mjs [output folder]      Default: tmp/release
 *
 * Run npm run build first. It creates:
 *   mdfolio.html            The single HTML file (a copy of dist/mdfolio.html; this one file is all you need)
 *   mdfolio-<version>.zip   The distribution zip (same layout as the repository, so the README steps work as written)
 *   notes.md                The release notes (the section for this version in CHANGELOG.md, in English)
 *
 * The zip is made by tools/dev/make-zip.py (which marks Japanese file names as UTF-8). Requires Python 3.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'tmp/release'));
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

function fail(message) {
  console.error('Error: ' + message);
  process.exit(1);
}

/** Extracts the section for a version from the changelog (from "## <version> — date" up to the next "## "). */
export function sectionOf(text, ver) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => new RegExp('^## ' + ver.replace(/\./g, '\\.') + '(\\s|$)').test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

// What goes into the distribution zip (same layout as the repository)
export const CONTENTS = [
  'dist/mdfolio.html', 'examples/mdfolio.css',
  'sample-docs', 'sample-docs-en', 'sample.md', 'sample.en.md',
  'README.md', 'README.ja.md', 'CHANGELOG.md', 'LICENSE', 'THIRD-PARTY-NOTICES.txt'
];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const p of CONTENTS) if (!fs.existsSync(path.join(ROOT, p))) fail(p + ' is missing (run npm run build first)');
  const generator = /<meta name="generator" content="mdfolio ([^"]+)">/.exec(fs.readFileSync(path.join(ROOT, 'dist/mdfolio.html'), 'utf8'));
  if (!generator || generator[1] !== version) fail(`The version of dist/mdfolio.html (${generator && generator[1]}) does not match the version in package.json (${version}). Run npm run build`);
  const changes = sectionOf(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), version);
  if (!changes) fail(`CHANGELOG.md needs a "## ${version}" section`);

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'dist/mdfolio.html'), path.join(out, 'mdfolio.html'));
  const zip = path.join(out, `mdfolio-${version}.zip`);
  execFileSync('python3', [path.join(ROOT, 'tools/dev/make-zip.py'), zip, `mdfolio-${version}`, ...CONTENTS.map((p) => path.join(ROOT, p) + '=' + p)], { stdio: ['ignore', 'inherit', 'inherit'] });

  const notes = [
    changes, '',
    '---', '',
    'Assets: `mdfolio.html` (this one file is all you need) and `mdfolio-' + version + '.zip` (samples, an example CSS for the look, documentation, and more). See `README.md` for an overview.', ''
  ].join('\n');
  fs.writeFileSync(path.join(out, 'notes.md'), notes);
  console.log(`${path.relative(ROOT, out) || out}: mdfolio.html, mdfolio-${version}.zip, notes.md`);
}
