#!/usr/bin/env node
/**
 * Updates the bundled libraries (for maintainers)
 *
 *   npm install             Fetch the devDependencies
 *   node tools/vendor.mjs   Copy the distributed files from node_modules to vendor/,
 *                           and generate vendor/manifest.json and THIRD-PARTY-NOTICES.txt
 *
 * A package published only as an ES module (markdown-it-cjk-friendly) is bundled with esbuild into one
 * script that sets a global, like the other libraries. esbuild is a maintainer-only tool; it is not bundled.
 *
 * If it finds a license that is not in the allowed list (ALLOWED_LICENSES), it stops without writing anything.
 * The normal build (tools/build.mjs) needs neither this script nor npm.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NM = path.join(ROOT, 'node_modules');
const OUT = path.join(ROOT, 'vendor');
const require = createRequire(import.meta.url);

/** Licenses allowed for bundled code (permissive licenses only). */
const ALLOWED_LICENSES = new Set([
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Unlicense', 'CC0-1.0', 'BlueOak-1.0.0',
  '(MPL-2.0 OR Apache-2.0)' // DOMPurify. We choose Apache-2.0
]);

/** Languages added to the highlight.js default set. To add more, list them here and run this script again. */
const HLJS_EXTRA = [
  'powershell', 'dos', 'dockerfile', 'nginx', 'apache', 'cmake', 'matlab', 'latex', 'protobuf', 'vbscript',
  'armasm', 'verilog', 'vhdl', 'fortran', 'scala', 'dart', 'haskell', 'julia', 'groovy', 'gradle',
  'properties', 'http', 'delphi', 'erlang', 'elixir', 'clojure', 'lisp', 'scheme', 'awk', 'tcl', 'vim', 'glsl'
];

const KATEX_FONTS = fs.readdirSync(path.join(NM, 'katex/dist/fonts')).filter((f) => f.endsWith('.woff2')).sort();

const COMPONENTS = [
  {
    id: 'markdown-it', pkg: 'markdown-it', role: 'Markdown parser',
    files: [['dist/browser/markdown-it.umd.min.js', 'markdown-it/markdown-it.umd.min.js']],
    // Dependencies included in the browser build. argparse is for the command line and is not included
    bundles: { from: 'markdown-it', exclude: ['argparse'] }
  },
  {
    id: 'markdown-it-footnote', pkg: 'markdown-it-footnote', role: 'Footnotes for markdown-it',
    files: [['dist/markdown-it-footnote.min.js', 'markdown-it-footnote/markdown-it-footnote.min.js']]
  },
  {
    id: 'markdown-it-cjk-friendly', pkg: 'markdown-it-cjk-friendly', role: 'Emphasis next to Chinese, Japanese and Korean text for markdown-it',
    // ES module only: bundled with its dependency (get-east-asian-width) into a script that sets window.markdownitCjkFriendly
    build: { entry: 'dist/index.js', globalName: 'markdownitCjkFriendly', to: 'markdown-it-cjk-friendly/markdown-it-cjk-friendly.min.js' },
    bundles: { from: 'markdown-it-cjk-friendly', exclude: [] }
  },
  {
    id: 'dompurify', pkg: 'dompurify', role: 'HTML sanitizer',
    licenseNote: 'Dual-licensed (MPL-2.0 OR Apache-2.0). mdfolio uses it under Apache-2.0.',
    files: [['dist/purify.min.js', 'dompurify/purify.min.js']],
    // Babel helpers included in the build, as noted in the comments of the distributed file
    extraBundles: ['regenerator-runtime', '@babel/helpers']
  },
  {
    id: 'highlight.js', pkg: '@highlightjs/cdn-assets', role: 'Syntax highlighting (highlight.js)',
    files: [['highlight.min.js', 'highlightjs/highlight.min.js']].concat(
      HLJS_EXTRA.map((l) => [`languages/${l}.min.js`, `highlightjs/languages/${l}.min.js`]))
  },
  {
    id: 'katex', pkg: 'katex', role: 'Math typesetting (script, stylesheet and fonts)',
    licenseNote: 'The KaTeX package (including its fonts) is distributed under the MIT License. ' +
      'Some distributions describe the KaTeX fonts as licensed under the SIL Open Font License 1.1; ' +
      'the OFL 1.1 text is reproduced below as well so that either reading is satisfied.',
    extraTexts: ['OFL-1.1'],
    files: [['dist/katex.min.js', 'katex/katex.min.js'], ['dist/katex.min.css', 'katex/katex.min.css']].concat(
      KATEX_FONTS.map((f) => [`dist/fonts/${f}`, `katex/fonts/${f}`]))
  },
  {
    id: 'mermaid', pkg: '@mermaid-js/tiny', role: 'Diagrams (tiny build of Mermaid)',
    files: [['dist/mermaid.tiny.js', 'mermaid/mermaid.tiny.js']],
    // The dependencies included in the tiny build cannot be determined mechanically from the distributed file,
    // so they are listed conservatively from the dependency tree of the main mermaid package. The following are
    // left out because we have confirmed they are not in the tiny build:
    //   elkjs (EPL-2.0 OR GPL-3.0-or-later), the cytoscape packages (for Mindmap / Architecture diagrams), katex, type-only packages
    bundles: { from: 'mermaid', exclude: ['elkjs', 'cytoscape', 'cytoscape-cose-bilkent', 'cytoscape-fcose', 'katex', /^@types\//] },
    bundlesNote: 'Listed conservatively from the dependency tree of the "mermaid" package; ' +
      'some of these may not actually be present in the tiny build.',
    // Babel helpers noted in the comments of the bundled DOMPurify
    extraBundles: ['regenerator-runtime', '@babel/helpers'],
    // Markers of code that must not be in the tiny build (stop if found)
    mustNotContain: [['dist/mermaid.tiny.js', 'org.eclipse.elk']]
  }
];

// ---------------------------------------------------------------------------

/** Bundles an ES module package into a script that sets a global (browser) or module.exports (Node.js, for tests). */
function bundleEsm(c, dir) {
  const esbuild = require('esbuild');
  const version = readPkg(c.pkg).pkg.version;
  const result = esbuild.buildSync({
    entryPoints: [path.join(dir, c.build.entry)], bundle: true, format: 'iife', globalName: '__mdvBundle',
    minify: true, write: false, target: 'es2018', legalComments: 'none', charset: 'utf8',
    banner: { js: `/*! ${c.pkg} ${version} and its dependencies, bundled by tools/vendor.mjs with esbuild ${esbuild.version}. Licenses: THIRD-PARTY-NOTICES.txt */\n(function(){` },
    footer: { js: `var f=__mdvBundle.default;if(typeof module==='object'&&module.exports)module.exports=f;else(typeof globalThis!=='undefined'?globalThis:self).${c.build.globalName}=f;})();` }
  });
  return { buf: Buffer.from(result.outputFiles[0].text), source: `${c.pkg}/${c.build.entry} (bundled with esbuild ${esbuild.version})` };
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function readPkg(name) {
  const dir = path.join(NM, name);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  return { dir, pkg };
}

function licenseFileOf(dir) {
  const names = fs.readdirSync(dir).filter((f) => /^(licen[sc]e|copying)(\.|-|$)/i.test(f) && fs.statSync(path.join(dir, f)).isFile());
  names.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return names.length ? path.join(dir, names[0]) : null;
}

function noticeFileOf(dir) {
  const names = fs.readdirSync(dir).filter((f) => /^notice(\.|$)/i.test(f) && fs.statSync(path.join(dir, f)).isFile());
  return names.length ? path.join(dir, names[0]) : null;
}

function inferLicense(text) {
  if (/Permission is hereby granted, free of charge/.test(text) && /THE SOFTWARE IS PROVIDED "AS IS"/.test(text)) return 'MIT';
  if (/Permission to use, copy, modify, and\/or distribute this software/.test(text)) return 'ISC';
  if (/Apache License\s+Version 2\.0/.test(text)) return 'Apache-2.0';
  return null;
}

function describe(name) {
  const { dir, pkg } = readPkg(name);
  const licFile = licenseFileOf(dir);
  const text = licFile ? fs.readFileSync(licFile, 'utf8').replace(/\r\n?/g, '\n').trim() : null;
  let license = typeof pkg.license === 'string' ? pkg.license : null;
  if (!license && text) license = inferLicense(text);
  if (!license) throw new Error(`Cannot determine the license: ${name}`);
  if (!ALLOWED_LICENSES.has(license)) throw new Error(`License not allowed: ${name}@${pkg.version} (${license})`);
  if (!text) throw new Error(`No license file: ${name}`);
  const notice = noticeFileOf(dir);
  let repo = pkg.homepage || (pkg.repository && (pkg.repository.url || pkg.repository)) || '';
  repo = String(repo).replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://');
  if (/^[\w.-]+\/[\w.-]+$/.test(repo)) repo = 'https://github.com/' + repo;
  return {
    name, version: pkg.version, license, homepage: repo, text,
    notice: notice ? fs.readFileSync(notice, 'utf8').replace(/\r\n?/g, '\n').trim() : null,
    licenseFile: licFile
  };
}

/** Follows the production dependencies (dependencies) recursively. */
function walkDeps(rootName, exclude) {
  const seen = new Set();
  const isExcluded = (n) => exclude.some((x) => (x instanceof RegExp ? x.test(n) : x === n));
  (function walk(name, isRoot) {
    const { pkg } = readPkg(name);
    for (const dep of Object.keys(pkg.dependencies || {})) {
      if (isExcluded(dep) || seen.has(dep)) continue;
      seen.add(dep);
      walk(dep, false);
    }
  })(rootName, true);
  return [...seen].sort();
}

function lockInfo(name) {
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
    const e = lock.packages && lock.packages['node_modules/' + name];
    return e ? { resolved: e.resolved, integrity: e.integrity } : {};
  } catch (e) { return {}; }
}

// ---------------------------------------------------------------------------

const manifest = { note: 'Generated by tools/vendor.mjs. Do not edit by hand.', components: [], hljsExtraLanguages: HLJS_EXTRA };
const sections = [];   // bodies of the license notices
const summary = [];
const copies = [];     // [from, to]
const writes = [];     // [buffer, to] (bundled files)

for (const c of COMPONENTS) {
  const info = describe(c.pkg);
  const { dir } = readPkg(c.pkg);

  for (const [file, needle] of c.mustNotContain || []) {
    if (fs.readFileSync(path.join(dir, file), 'utf8').includes(needle)) {
      throw new Error(`${c.pkg}: ${file} contains code that must not be there (${needle})`);
    }
  }

  let files;
  if (c.build) {
    const { buf, source } = bundleEsm(c, dir);
    writes.push([buf, path.join(OUT, c.build.to)]);
    files = [{ path: c.build.to, source, bytes: buf.length, sha256: sha256(buf) }];
  } else {
    files = c.files.map(([from, to]) => {
      const src = path.join(dir, from);
      const buf = fs.readFileSync(src);
      copies.push([src, path.join(OUT, to)]);
      return { path: to, source: `${c.pkg}/${from}`, bytes: buf.length, sha256: sha256(buf) };
    });
  }
  copies.push([info.licenseFile, path.join(OUT, files[0].path.split('/')[0], 'LICENSE')]);

  const bundled = c.bundles ? walkDeps(c.bundles.from, c.bundles.exclude || []).map(describe) : [];
  // For the tiny build of mermaid, the root of the dependency tree (the main mermaid package) is itself included
  if (c.bundles && c.bundles.from !== c.pkg) bundled.unshift(describe(c.bundles.from));
  for (const name of c.extraBundles || []) {
    if (!bundled.some((b) => b.name === name)) bundled.push(describe(name));
  }

  manifest.components.push({
    id: c.id, package: c.pkg, version: info.version, license: info.license, role: c.role, homepage: info.homepage,
    ...lockInfo(c.pkg), licenseNote: c.licenseNote, files,
    bundles: bundled.map((b) => ({ name: b.name, version: b.version, license: b.license })),
    bundlesNote: c.bundlesNote
  });

  summary.push(`${c.pkg} ${info.version} — ${info.license} — ${c.role}`);
  if (bundled.length) {
    summary.push(`    bundles ${bundled.length} package(s): ` + bundled.map((b) => `${b.name} ${b.version} (${b.license})`).join(', '));
    if (c.bundlesNote) summary.push(`    note: ${c.bundlesNote}`);
  }

  sections.push({ title: `${c.pkg} ${info.version}`, license: info.license, homepage: info.homepage, note: c.licenseNote, text: info.text, notice: info.notice });
  for (const id of c.extraTexts || []) {
    const spdx = require('spdx-license-list/full')[id];
    sections.push({ title: `${c.pkg} ${info.version} — ${spdx.name}`, license: id, homepage: spdx.url, text: spdx.licenseText.replace(/\r\n?/g, '\n').trim() });
  }
  for (const b of bundled) {
    sections.push({ title: `${b.name} ${b.version}`, license: b.license, homepage: b.homepage, via: c.pkg, text: b.text, notice: b.notice });
  }
}

// Group licenses with the same text
const groups = new Map();
for (const s of sections) {
  const key = sha256(s.text.replace(/\s+/g, ' '));
  if (!groups.has(key)) groups.set(key, { text: s.text, items: [] });
  groups.get(key).items.push(s);
}

const RULE = '='.repeat(78);
const rule = '-'.repeat(78);
let out = '';
out += 'mdfolio — Third-Party Notices / 第三者ソフトウェアのライセンス表記\n';
out += RULE + '\n\n';
out += 'mdfolio.html（および mdfolio から書き出したサイト HTML）には、以下の第三者ソフトウェアが\n';
out += '含まれています。各ソフトウェアはそれぞれのライセンスに従って再配布されています。\n\n';
out += 'mdfolio.html (and site HTML files exported from mdfolio) contains the third-party\n';
out += 'software listed below, redistributed under their respective licenses.\n\n';
out += 'Generated by tools/vendor.mjs. Do not edit by hand.\n\n';
out += rule + '\nSummary\n' + rule + '\n\n' + summary.join('\n') + '\n\n';
out += rule + '\nLicense texts\n' + rule + '\n';
for (const g of groups.values()) {
  out += '\n' + RULE + '\n';
  for (const s of g.items) {
    out += `${s.title}\n  License: ${s.license}` + (s.homepage ? `\n  ${s.homepage}` : '') + (s.via ? `\n  (bundled within ${s.via})` : '') + '\n';
    if (s.note) out += `  Note: ${s.note}\n`;
  }
  out += RULE + '\n\n' + g.text + '\n';
  for (const s of g.items) {
    if (s.notice) out += `\n--- NOTICE (${s.title}) ---\n\n${s.notice}\n`;
  }
}

// Write the files only if we got here without an exception
fs.rmSync(OUT, { recursive: true, force: true });
for (const [from, to] of copies) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
for (const [buf, to] of writes) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, buf);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'THIRD-PARTY-NOTICES.txt'), out);

const total = manifest.components.reduce((n, c) => n + c.files.reduce((m, f) => m + f.bytes, 0), 0);
console.log(`Updated vendor/: ${manifest.components.length} components, ${copies.length + writes.length} files, ${(total / 1024 / 1024).toFixed(2)} MB`);
console.log(`THIRD-PARTY-NOTICES.txt: ${(out.length / 1024).toFixed(1)} KB, ${groups.size} distinct license texts, ${sections.length} packages`);
for (const c of manifest.components) console.log(`  ${c.package} ${c.version} (${c.license})` + (c.bundles.length ? ` + ${c.bundles.length} bundled` : ''));
