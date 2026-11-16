// 単体テスト用: ソースと同梱ライブラリを Node.js に読み込む
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

// コマンド（更新コマンド、コマンドライン版の書き出し）の表示の言語は、テストでは日本語に固定する。
// 実行する機械の言語設定に左右されないように（SPEC FD-10）。英語の表示は、テストの中で個別に指定して確かめる。
process.env.MDFOLIO_LANG = process.env.MDFOLIO_LANG || 'ja';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const core = require(path.join(ROOT, 'src/core.js'));
export const mdx = require(path.join(ROOT, 'src/md.js'));
export const markdownit = require(path.join(ROOT, 'vendor/markdown-it/markdown-it.umd.min.js'));
export const footnote = require(path.join(ROOT, 'vendor/markdown-it-footnote/markdown-it-footnote.min.js'));
export const hljs = require(path.join(ROOT, 'vendor/highlightjs/highlight.min.js'));

export function highlight(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  }
  return '';
}

export function createRenderer(options = {}) {
  return mdx.createRenderer({ markdownit, footnote, highlight, ...options });
}
