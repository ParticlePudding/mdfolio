#!/usr/bin/env node
/**
 * Conversion for hosting environments (used when publishing a page for trying mdfolio out)
 *
 *   node tools/dev/make-hosted.mjs <input.html> <output.html> [--title <title>] [--page-title <page name>]
 *
 *   --title        Site title (also used as the heading on screen)
 *   --page-title   Changes only the HTML <title> (not the heading on screen)
 *
 * Converts an mdfolio HTML file so it can be placed in a hosting environment that shows the page inside a
 * sandboxed frame and injects its own scripts into the page (such as Claude artifacts).
 *
 *   1. Change the settings: hide actions that save files (allowDownloads: false) and never load external images
 *      (lockExternalImages: true), because neither works in such environments.
 *      Also show on the start screen and in the help that this is a public trial page (hosted: true).
 *   2. Rewrite the replacement character (U+FFFD) as an escape with the same meaning, because some
 *      hosting environments do not accept files that contain this character.
 *   3. Remove the CSP written in the HTML (which limits scripts by their hashes). If it stayed, it would also
 *      block the scripts injected by the host. We rely on the host's CSP to block network access.
 *
 * Step 3 removes one of the safety measures. For opening locally or distributing within an organization, use the HTML before conversion.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const core = createRequire(import.meta.url)(path.join(ROOT, 'src/core.js'));

function fail(message) {
  console.error('Error: ' + message);
  process.exit(1);
}

const argv = process.argv.slice(2);
let title = null;
let pageTitle = null;
const files = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--title') title = argv[++i];
  else if (argv[i] === '--page-title') pageTitle = argv[++i];
  else if (argv[i].startsWith('-')) fail('Unknown option: ' + argv[i]);
  else files.push(argv[i]);
}
if (files.length !== 2) fail('Specify the input and output files');
if (title === undefined || pageTitle === undefined) fail('--title / --page-title requires a value');
const [input, output] = files;
if (!fs.existsSync(input)) fail('Input not found: ' + input);

const html = fs.readFileSync(input, 'utf8');
let parts = null;
try {
  parts = core.extractParts(html);
} catch (e) {
  parts = null;
}
if (!parts || core.composeHtml(parts) !== html) fail('Cannot read as an mdfolio HTML file: ' + input);

// 1. Settings
const configBlock = core.findBlock(parts, 'mdv-config');
const config = core.normalizeConfig(JSON.parse(configBlock.text));
config.allowDownloads = false;
config.lockExternalImages = true;
config.allowExternalImages = false;
config.hosted = true;
if (title !== null) { config.title = title; parts.title = title; }
if (pageTitle !== null) parts.title = pageTitle;
configBlock.text = core.jsonForScript(config);

// 2. Rewrite the replacement character (U+FFFD) as an escape with the same meaning
//    This character is also a sign of a failed character encoding conversion, so some hosting environments
//    reject a file just because it contains it. The bundled library (markdown-it) writes this character literally
//    in the code that replaces invalid input with it. It can also appear in document data.
const REPLACEMENT = String.fromCharCode(0xFFFD);
const ESCAPED = '\\' + 'uFFFD';
for (const block of parts.blocks) {
  if (block.text.indexOf(REPLACEMENT) < 0) continue;
  if (block.type === 'application/json') {
    // In JSON this character can only appear inside strings. Rewriting it as an escape does not change the parsed result
    const before = JSON.parse(block.text);
    block.text = block.text.split(REPLACEMENT).join(ESCAPED.toLowerCase());
    if (JSON.stringify(JSON.parse(block.text)) !== JSON.stringify(before)) fail('Cannot rewrite the replacement character: ' + block.id);
  } else {
    // In scripts, rewrite only string literals made up of nothing but replacement characters ('…', "…" and untagged `…`).
    // Anywhere else we cannot be sure the rewrite keeps the meaning, so the conversion stops
    const quoted = new RegExp('(^|[^\\\\])([\'"])(' + REPLACEMENT + '+)\\2', 'g');
    const template = new RegExp('(^|[^\\\\\\w$)\\]])(`)(' + REPLACEMENT + '+)`', 'g');
    const rewrite = (m, before, quote, run) => before + quote + ESCAPED.repeat(run.length) + quote;
    const text = block.text.replace(quoted, rewrite).replace(template, rewrite);
    if (text.indexOf(REPLACEMENT) >= 0) fail('Cannot safely rewrite the replacement character (U+FFFD) in the script: ' + block.id);
    try {
      new vm.Script(text, { filename: block.id });
    } catch (e) {
      fail('The rewritten script has a syntax error: ' + block.id + ' ' + e.message);
    }
    block.text = text;
  }
}

// 3. Remove the CSP
let out = core.composeHtml(parts);
const cspLine = '<meta http-equiv="Content-Security-Policy" content="' + core.escapeHtml(parts.csp) + '">\n';
if (out.split(cspLine).length !== 2) fail('CSP declaration not found');
out = out.replace(cspLine, '');
if (/http-equiv="Content-Security-Policy"/.test(out.slice(0, out.indexOf('<style')))) fail('A CSP declaration remains');

// 4. Remove the link to the neighboring mdfolio.css (the host cannot hold a file next to the page, so it would only cause a failed request)
out = out.replace('<link rel="stylesheet" href="' + core.USER_CSS_FILE + '" id="mdv-user-css">\n', '');
if (out.indexOf(REPLACEMENT) >= 0) fail('A replacement character (U+FFFD) remains (check whether the title or styles contain one)');

fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(`Wrote ${output} (${(Buffer.byteLength(out) / 1024 / 1024).toFixed(2)} MB, ${JSON.parse(core.findBlock(parts, 'mdv-site').text) ? 'site mode' : 'viewer mode'})`);
