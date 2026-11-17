#!/usr/bin/env node
/**
 * リリースに添付するファイルと、リリースの説明を作る（SPEC 8.8 AU-3、AU-5）。
 *
 *   node tools/dev/make-release.mjs [出力フォルダ]      既定: tmp/release
 *
 * 先に npm run build を実行しておくこと。作るもの:
 *   mdfolio.html            単一 HTML 版（dist/mdfolio.html の写し。これ 1 つで動く）
 *   mdfolio-<版>.zip        配布用の zip（中身はリポジトリと同じ並び。README の手順がそのまま使える）
 *   notes.md                リリースの説明（CHANGELOG.md の、その版の部分）
 *
 * zip は tools/dev/make-zip.py で作る（日本語のファイル名に UTF-8 の印を付ける）。Python 3 が必要。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'tmp/release'));
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

function fail(message) {
  console.error('エラー: ' + message);
  process.exit(1);
}

/** 変更履歴から、その版の節（「## <版> — 日付」から次の「## 」の前まで）を取り出す。 */
export function sectionOf(text, ver) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => new RegExp('^## ' + ver.replace(/\./g, '\\.') + '(\\s|$)').test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

// 配布用の zip に入れるもの（リポジトリと同じ並び）
export const CONTENTS = [
  'dist/mdfolio.html', 'examples/mdfolio.css',
  'sample-docs', 'sample-docs-en', 'sample.md', 'sample.en.md',
  'README.md', 'README.ja.md', 'CHANGELOG.md', 'LICENSE', 'THIRD-PARTY-NOTICES.txt'
];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const p of CONTENTS) if (!fs.existsSync(path.join(ROOT, p))) fail(p + ' がありません（先に npm run build を実行してください）');
  const generator = /<meta name="generator" content="mdfolio ([^"]+)">/.exec(fs.readFileSync(path.join(ROOT, 'dist/mdfolio.html'), 'utf8'));
  if (!generator || generator[1] !== version) fail(`dist/mdfolio.html の版（${generator && generator[1]}）が package.json の版（${version}）と一致しません。npm run build を実行してください`);
  const ja = sectionOf(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), version);
  if (!ja) fail(`CHANGELOG.md に「## ${version}」の節が必要です`);

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'dist/mdfolio.html'), path.join(out, 'mdfolio.html'));
  const zip = path.join(out, `mdfolio-${version}.zip`);
  execFileSync('python3', [path.join(ROOT, 'tools/dev/make-zip.py'), zip, `mdfolio-${version}`, ...CONTENTS.map((p) => path.join(ROOT, p) + '=' + p)], { stdio: ['ignore', 'inherit', 'inherit'] });

  const notes = [
    ja, '',
    '添付: `mdfolio.html`（これ 1 つで動きます）、`mdfolio-' + version + '.zip`（見本、見た目の CSS の例、説明書などの一式）。', '',
    '---', '',
    'Assets: `mdfolio.html` (single-HTML version; this one file is all you need) and `mdfolio-' + version + '.zip` (samples, an example CSS for the look, documentation and more). The change history is in Japanese only (`CHANGELOG.md`); see `README.md` for an English overview.', ''
  ].join('\n');
  fs.writeFileSync(path.join(out, 'notes.md'), notes);
  console.log(`${path.relative(ROOT, out) || out}: mdfolio.html, mdfolio-${version}.zip, notes.md`);
}
