#!/usr/bin/env node
/**
 * ホスティング環境向けの変換（お試し用のページを公開するときに使う）
 *
 *   node tools/dev/make-hosted.mjs <入力.html> <出力.html> [--title <タイトル>] [--page-title <ページ名>]
 *
 *   --title        サイトのタイトル（画面の見出しにも使う）
 *   --page-title   HTML の <title> だけを変える（画面の見出しは変えない）
 *
 * ページを「サンドボックス化したフレーム」の中で表示し、ページの中へ独自のスクリプトを差し込む種類の
 * ホスティング環境（Claude のアーティファクトなど）に、mdfolio の HTML を置くための変換を行う。
 *
 *   1. 設定を変える: 保存を伴う操作を出さない（allowDownloads: false）、外部の画像を常に読み込まない
 *      （lockExternalImages: true）。こうした環境では、どちらも動かないため。
 *      あわせて、お試し用の公開ページであること（hosted: true）を開始画面と使い方に表示する。
 *   2. 置換文字（U+FFFD）を、同じ意味のエスケープに書き換える。この文字を含むファイルを受け付けない
 *      ホスティング環境があるため。
 *   3. HTML に書いてある CSP（スクリプトをハッシュで限定する指定）を取り除く。残したままだと、ホスティング側が
 *      差し込むスクリプトまで止めてしまう。外部との通信は、ホスティング側の CSP が止める前提。
 *
 * 3 は安全のための仕組みを 1 つ外すことになる。手元で開く・社内で配布する用途には、変換前の HTML を使うこと。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const core = createRequire(import.meta.url)(path.join(ROOT, 'src/core.js'));

function fail(message) {
  console.error('エラー: ' + message);
  process.exit(1);
}

const argv = process.argv.slice(2);
let title = null;
let pageTitle = null;
const files = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--title') title = argv[++i];
  else if (argv[i] === '--page-title') pageTitle = argv[++i];
  else if (argv[i].startsWith('-')) fail('不明なオプション: ' + argv[i]);
  else files.push(argv[i]);
}
if (files.length !== 2) fail('入力と出力のファイルを指定してください');
if (title === undefined || pageTitle === undefined) fail('--title / --page-title には値が必要です');
const [input, output] = files;
if (!fs.existsSync(input)) fail('入力が見つかりません: ' + input);

const html = fs.readFileSync(input, 'utf8');
let parts = null;
try {
  parts = core.extractParts(html);
} catch (e) {
  parts = null;
}
if (!parts || core.composeHtml(parts) !== html) fail('mdfolio の HTML として読み取れません: ' + input);

// 1. 設定
const configBlock = core.findBlock(parts, 'mdv-config');
const config = core.normalizeConfig(JSON.parse(configBlock.text));
config.allowDownloads = false;
config.lockExternalImages = true;
config.allowExternalImages = false;
config.hosted = true;
if (title !== null) { config.title = title; parts.title = title; }
if (pageTitle !== null) parts.title = pageTitle;
configBlock.text = core.jsonForScript(config);

// 2. 置換文字（U+FFFD）を、同じ意味のエスケープに書き換える
//    この文字は「文字コードの変換に失敗した印」でもあるため、ホスティング環境によっては、含まれているだけで
//    ファイルを受け付けない。同梱ライブラリ（markdown-it）は、不正な入力をこの文字に置き換える処理の中で、
//    この文字そのものを書いている。文書のデータに含まれることもある。
const REPLACEMENT = String.fromCharCode(0xFFFD);
const ESCAPED = '\\' + 'uFFFD';
for (const block of parts.blocks) {
  if (block.text.indexOf(REPLACEMENT) < 0) continue;
  if (block.type === 'application/json') {
    // JSON では、この文字は文字列の中にしか現れない。エスケープに書き換えても、読み取った結果は変わらない
    const before = JSON.parse(block.text);
    block.text = block.text.split(REPLACEMENT).join(ESCAPED.toLowerCase());
    if (JSON.stringify(JSON.parse(block.text)) !== JSON.stringify(before)) fail('置換文字を書き換えられません: ' + block.id);
  } else {
    // スクリプトでは、「置換文字だけでできた文字列」に限って書き換える（'…' "…" と、タグの付かない `…`）。
    // それ以外の場所にある場合は、意味を変えずに書き換えられると言い切れないので、変換をやめる
    const quoted = new RegExp('(^|[^\\\\])([\'"])(' + REPLACEMENT + '+)\\2', 'g');
    const template = new RegExp('(^|[^\\\\\\w$)\\]])(`)(' + REPLACEMENT + '+)`', 'g');
    const rewrite = (m, before, quote, run) => before + quote + ESCAPED.repeat(run.length) + quote;
    const text = block.text.replace(quoted, rewrite).replace(template, rewrite);
    if (text.indexOf(REPLACEMENT) >= 0) fail('スクリプトの中の置換文字（U+FFFD）を、安全に書き換えられません: ' + block.id);
    try {
      new vm.Script(text, { filename: block.id });
    } catch (e) {
      fail('書き換えたスクリプトが構文エラーになりました: ' + block.id + ' ' + e.message);
    }
    block.text = text;
  }
}

// 3. CSP を取り除く
let out = core.composeHtml(parts);
const cspLine = '<meta http-equiv="Content-Security-Policy" content="' + core.escapeHtml(parts.csp) + '">\n';
if (out.split(cspLine).length !== 2) fail('CSP の指定が見つかりません');
out = out.replace(cspLine, '');
if (/http-equiv="Content-Security-Policy"/.test(out.slice(0, out.indexOf('<style')))) fail('CSP の指定が残っています');

// 4. 隣の mdfolio.css を読む指定を取り除く（公開先には隣のファイルを置けず、見つからない読み込みが起きるだけのため）
out = out.replace('<link rel="stylesheet" href="' + core.USER_CSS_FILE + '" id="mdv-user-css">\n', '');
if (out.indexOf(REPLACEMENT) >= 0) fail('置換文字（U+FFFD）が残っています（タイトルやスタイルに含まれていないか確認してください）');

fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(`${output} を書き出しました（${(Buffer.byteLength(out) / 1024 / 1024).toFixed(2)} MB、${JSON.parse(core.findBlock(parts, 'mdv-site').text) ? 'サイトモード' : '閲覧モード'}）`);
