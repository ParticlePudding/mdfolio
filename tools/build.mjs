#!/usr/bin/env node
/**
 * Build: generates dist/mdfolio.html from src/ and vendor/.
 * Uses only Node.js built-in modules (no npm packages needed).
 *
 *   node tools/build.mjs [--out dist/mdfolio.html] [--without mermaid,katex]
 *
 * Steps (SPEC 8.5):
 *   1. Assemble the parts (CSS, scripts, resources)
 *   2. Replace <!-- / <script / </script in inline scripts with escapes that keep their meaning
 *   3. Put the SHA-256 of each script into the CSP
 *   4. Verify the output
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const core = require(path.join(ROOT, 'src/core.js'));

const MAX_BYTES = 6 * 1024 * 1024; // NFR-3

function fail(message) {
  console.error('Build failed: ' + message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { out: 'dist/mdfolio.html', without: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--out' || a === '--without') && (i + 1 >= argv.length || argv[i + 1].startsWith('--'))) fail(a + ' needs a value');
    if (a === '--out') args.out = argv[++i];
    else if (a === '--without') args.without = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else fail('Unknown argument: ' + a);
  }
  for (const w of args.without) if (w !== 'mermaid' && w !== 'katex') fail('--without accepts only mermaid and katex');
  return args;
}

const args = parseArgs(process.argv.slice(2));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha256Base64 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('base64');
const sha256Hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------- Checks (input)

const pkg = JSON.parse(read('package.json'));
if (pkg.version !== core.VERSION) fail(`The version in package.json (${pkg.version}) does not match VERSION in src/core.js (${core.VERSION})`);

const manifest = JSON.parse(read('vendor/manifest.json'));
const vendorFiles = new Map();
for (const c of manifest.components) {
  for (const f of c.files) {
    const abs = path.join(ROOT, 'vendor', f.path);
    if (!fs.existsSync(abs)) fail(`vendor/${f.path} is missing`);
    if (sha256Hex(fs.readFileSync(abs)) !== f.sha256) fail(`The content of vendor/${f.path} does not match the SHA-256 in manifest.json`);
    vendorFiles.set(f.path, c);
  }
}

/** Makes sure no invisible or control characters have slipped into our own sources. */
function assertCleanSource(name, text) {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const bad = (c < 0x20 && c !== 0x0A && c !== 0x09) || c === 0x7F || c === 0xA0 || c === 0x2028 || c === 0x2029 ||
      c === 0xFEFF || (c >= 0x200B && c <= 0x200D) || c === 0x2060;
    if (bad) {
      const line = text.slice(0, i).split('\n').length;
      fail(`${name}:${line} contains the invisible character U+${c.toString(16).toUpperCase().padStart(4, '0')}`);
    }
  }
}

// ---------------------------------------------------------------- Inline scripts

const stats = [];

/**
 * Turns a script into a form that can be embedded in HTML as an ordinary inline script.
 * - Removes the trailing sourceMappingURL comment
 * - Replaces the < of <!-- / <script / </script with \x3c (same meaning inside strings and regular expressions)
 * - Checks the syntax after replacing (fails here if one of them appeared as an operator)
 */
function forInline(name, text) {
  let s = text.replace(/\r\n?/g, '\n');
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  s = s.replace(/\n?\/\/# sourceMappingURL=[^\n]*\s*$/, '\n');
  let count = 0;
  s = s.replace(/(\\*)<(?=!--|\/?script)/gi, (m, bs) => {
    count++;
    return (bs.length % 2 === 1 ? bs.slice(0, -1) : bs) + '\\x3c';
  });
  try {
    new vm.Script(s, { filename: name });
  } catch (e) {
    fail(`${name}: syntax check after escaping failed: ${e.message}`);
  }
  if (/<\/script/i.test(s) || s.includes('<!--')) fail(`${name}: text that cannot be embedded remains`);
  stats.push({ name, bytes: Buffer.byteLength(s), escapes: count });
  return s.endsWith('\n') ? s : s + '\n';
}

const hljsExtra = (manifest.hljsExtraLanguages || []).map((l) => `highlightjs/languages/${l}.min.js`);
const vendorOrder = [
  'markdown-it/markdown-it.umd.min.js',
  'markdown-it-footnote/markdown-it-footnote.min.js',
  'markdown-it-cjk-friendly/markdown-it-cjk-friendly.min.js',
  'dompurify/purify.min.js',
  'highlightjs/highlight.min.js',
  ...hljsExtra
];
for (const f of vendorOrder) if (!vendorFiles.has(f)) fail(`${f} is not listed in vendor/manifest.json`);

const vendorJs = vendorOrder.map((f) => forInline('vendor/' + f, read('vendor/' + f))).join(';\n');

const appSources = ['src/core.js', 'src/md.js', 'src/i18n.js', 'src/app.js'];
const appJs = appSources.map((f) => {
  const text = read(f);
  assertCleanSource(f, text);
  return forInline(f, text);
}).join(';\n');

// ---------------------------------------------------------------- Lazily loaded libraries and resources

const useKatex = !args.without.includes('katex');
const useMermaid = !args.without.includes('mermaid');

const katexJs = useKatex ? read('vendor/katex/katex.min.js') : null;
const mermaidJs = useMermaid ? read('vendor/mermaid/mermaid.tiny.js') : null;

/** Embeds the fonts (woff2) referenced by the KaTeX CSS as data: URIs. */
function inlineKatexCss() {
  let css = read('vendor/katex/katex.min.css');
  let fonts = 0;
  css = css.replace(/src:url\(fonts\/([A-Za-z0-9_-]+)\.woff2\) format\("woff2"\),url\(fonts\/[A-Za-z0-9_-]+\.woff\) format\("woff"\),url\(fonts\/[A-Za-z0-9_-]+\.ttf\) format\("truetype"\)/g, (m, name) => {
    const file = path.join(ROOT, 'vendor/katex/fonts', name + '.woff2');
    if (!fs.existsSync(file)) fail(`KaTeX font not found: ${name}.woff2`);
    fonts++;
    return `src:url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format("woff2")`;
  });
  if (!fonts || /url\((?!data:)/.test(css)) fail('The KaTeX CSS still contains url() references that were not embedded');
  return css;
}

// The UI parts (app.css) come first, then the document body and colors (document.css). The user's mdfolio.css comes after both (SPEC 3.10)
const cssParts = ['src/app.css', 'src/document.css'].map((f) => {
  const text = read(f).replace(/\r\n?/g, '\n');
  assertCleanSource(f, text);
  return text.endsWith('\n') ? text : text + '\n';
});
const css = cssParts.join('\n');

const helpJa = read('src/help.ja.md').replace(/\r\n?/g, '\n');
const helpEn = read('src/help.en.md').replace(/\r\n?/g, '\n');
const licenses = [
  `${core.NAME} ${core.VERSION}`,
  '='.repeat(78),
  '',
  read('LICENSE').replace(/\r\n?/g, '\n').trim(),
  '',
  '',
  read('THIRD-PARTY-NOTICES.txt').replace(/\r\n?/g, '\n').trim(),
  ''
].join('\n');

// ---------------------------------------------------------------- CSP

const scriptHashes = [
  { id: 'mdv-js-vendor', hash: sha256Base64(vendorJs) },
  { id: 'mdv-js-app', hash: sha256Base64(appJs) }
];
if (useKatex) scriptHashes.push({ id: 'mdv-lib-katex', hash: sha256Base64(katexJs) });
if (useMermaid) scriptHashes.push({ id: 'mdv-lib-mermaid', hash: sha256Base64(mermaidJs) });

const csp = [
  "default-src 'none'",
  'script-src ' + scriptHashes.map((h) => `'sha256-${h.hash}'`).join(' '),
  // 'self' file: allows loading an mdfolio.css placed next to the HTML file (SPEC 3.10)
  "style-src 'self' file: 'unsafe-inline'",
  'img-src data: blob: http: https:',
  'media-src data: blob: http: https:',
  'font-src data:',
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "form-action 'none'",
  "base-uri 'none'"
].join('; ');

// ---------------------------------------------------------------- Assembly

const JSON_TYPE = 'application/json';
const blocks = [
  { id: 'mdv-config', type: JSON_TYPE, text: core.jsonForScript(core.DEFAULT_CONFIG) },
  { id: 'mdv-site', type: JSON_TYPE, text: 'null' },
  { id: 'mdv-res-help-ja', type: JSON_TYPE, text: core.jsonForScript(helpJa) },
  { id: 'mdv-res-help-en', type: JSON_TYPE, text: core.jsonForScript(helpEn) },
  { id: 'mdv-res-licenses', type: JSON_TYPE, text: core.jsonForScript(licenses) }
];
if (useKatex) {
  blocks.push({ id: 'mdv-res-katex-css', type: JSON_TYPE, text: core.jsonForScript(inlineKatexCss()) });
  blocks.push({ id: 'mdv-lib-katex', type: JSON_TYPE, text: core.jsonForScript(katexJs) });
}
if (useMermaid) blocks.push({ id: 'mdv-lib-mermaid', type: JSON_TYPE, text: core.jsonForScript(mermaidJs) });
blocks.push({ id: 'mdv-js-vendor', type: '', text: vendorJs });
blocks.push({ id: 'mdv-js-app', type: '', text: appJs });

const parts = { lang: 'ja', title: core.NAME, csp, generator: `${core.NAME} ${core.VERSION}`, css, blocks };
const html = core.composeHtml(parts);

// ---------------------------------------------------------------- Checks (output)

if (html.includes('\r')) fail('The output contains CR (line breaks must be LF only)');
const back = core.extractParts(html);
if (core.composeHtml(back) !== html) fail('Splitting and reassembling the output does not give the same result');
for (const h of scriptHashes) {
  const b = core.findBlock(back, h.id);
  if (!b) fail(`Block ${h.id} is missing`);
  const actual = b.type === JSON_TYPE ? sha256Base64(JSON.parse(b.text)) : sha256Base64(b.text);
  if (actual !== h.hash) fail(`The hash of block ${h.id} does not match the CSP`);
  if (!back.csp.includes(`'sha256-${h.hash}'`)) fail(`The CSP does not contain the hash of ${h.id}`);
}
// The hashes of the lazily loaded libraries equal the SHA-256 of the distributed files in vendor/ as they are
for (const [id, file] of [['mdv-lib-katex', 'vendor/katex/katex.min.js'], ['mdv-lib-mermaid', 'vendor/mermaid/mermaid.tiny.js']]) {
  const h = scriptHashes.find((x) => x.id === id);
  if (!h) continue;
  const raw = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('base64');
  if (raw !== h.hash) fail(`The hash of ${id} does not match the SHA-256 of ${file}`);
}
const bytes = Buffer.byteLength(html);
if (bytes > MAX_BYTES) fail(`The output is larger than ${MAX_BYTES} bytes (${bytes} bytes)`);

// ---------------------------------------------------------------- Write the output

const outPath = path.resolve(ROOT, args.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);

const buildManifest = {
  name: core.NAME,
  version: core.VERSION,
  file: path.basename(outPath),
  bytes,
  sha256: sha256Hex(Buffer.from(html, 'utf8')),
  without: args.without,
  csp,
  blocks: back.blocks.map((b) => ({ id: b.id, type: b.type || 'text/javascript', bytes: Buffer.byteLength(b.text) })),
  scripts: scriptHashes.map((h) => ({ id: h.id, sha256Base64: h.hash })),
  inlineSources: stats,
  vendor: manifest.components.map((c) => ({ package: c.package, version: c.version, license: c.license }))
};
fs.writeFileSync(outPath.replace(/\.html$/, '') + '.manifest.json', JSON.stringify(buildManifest, null, 2) + '\n');

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log(`Generated ${path.relative(ROOT, outPath)}: ${mb(bytes)} (${bytes} bytes)`);
for (const b of buildManifest.blocks) console.log(`  ${b.id.padEnd(20)} ${String(b.bytes).padStart(9)} bytes`);
console.log(`  CSS                  ${String(Buffer.byteLength(css)).padStart(9)} bytes`);
