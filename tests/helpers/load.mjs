// For unit tests: load the source and the bundled libraries into Node.js
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

// In tests, the language of command output (the update command, the command-line export) is pinned to Japanese,
// so results do not depend on the language setting of the machine running them (SPEC FD-10). English output is checked by specifying it explicitly in individual tests.
process.env.MDFOLIO_LANG = process.env.MDFOLIO_LANG || 'ja';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const core = require(path.join(ROOT, 'src/core.js'));
export const mdx = require(path.join(ROOT, 'src/md.js'));
export const markdownit = require(path.join(ROOT, 'vendor/markdown-it/markdown-it.umd.min.js'));
export const footnote = require(path.join(ROOT, 'vendor/markdown-it-footnote/markdown-it-footnote.min.js'));
export const cjkFriendly = require(path.join(ROOT, 'vendor/markdown-it-cjk-friendly/markdown-it-cjk-friendly.min.js'));
export const hljs = require(path.join(ROOT, 'vendor/highlightjs/highlight.min.js'));

export function highlight(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  }
  return '';
}

export function createRenderer(options = {}) {
  return mdx.createRenderer({ markdownit, footnote, cjkFriendly, highlight, ...options });
}
