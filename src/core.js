/*!
 * mdfolio core — DOM に依存しない処理（ブラウザ・Node.js 共用）
 * MIT License
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  root.MDV = root.MDV || {};
  root.MDV.core = api;
  if (typeof module === 'object' && module && module.exports) { module.exports = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var NAME = 'mdfolio';
  var VERSION = '1.3.0';
  var SITE_FORMAT = 1;

  var DOC_EXTS = ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdwn', 'mdtxt', 'mdtext'];
  var DOC_EXT_RE = new RegExp('\\.(' + DOC_EXTS.join('|') + ')$', 'i');

  var LIMITS = {
    maxDocs: 5000,                      // 文書数の上限
    maxEntries: 50000,                  // 走査するファイル・フォルダ数の上限
    maxDocBytes: 10 * 1024 * 1024,      // これを超える文書はプレーンテキスト表示
    maxAssetBytes: 20 * 1024 * 1024,    // 書き出し時に埋め込む添付 1 件の上限
    maxUserCssBytes: 1024 * 1024,       // 書き出しに埋め込む CSS の上限（FR-1005）
    warnTotalBytes: 100 * 1024 * 1024   // 書き出し合計サイズの警告しきい値
  };

  // ---------------------------------------------------------------------------
  // 文字列ユーティリティ
  // ---------------------------------------------------------------------------

  function nfc(s) {
    return typeof s.normalize === 'function' ? s.normalize('NFC') : s;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function unescapeHtml(s) {
    return String(s).replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  }

  function safeDecode(s) {
    s = String(s);
    try {
      return decodeURIComponent(s);
    } catch (e) {
      // 一部だけ不正な場合は、デコードできる部分だけデコードする
      return s.replace(/(?:%[0-9a-fA-F]{2})+/g, function (m) {
        try { return decodeURIComponent(m); } catch (e2) { return m; }
      });
    }
  }

  function formatBytes(n) {
    if (!(n >= 0)) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(n < 10485760 ? 1 : 0) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function formatDate(ms) {
    if (!ms || !isFinite(ms)) return '';
    var d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function sanitizeFileName(name, fallback) {
    var s = String(name == null ? '' : name)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/^[\s.]+|[\s.]+$/g, '');
    if (s.length > 80) s = s.slice(0, 80);
    return s || fallback || 'site';
  }

  // ---------------------------------------------------------------------------
  // パス
  // ---------------------------------------------------------------------------

  /** 区切りを / に統一し、. と .. を解決する。ルートより上に出る場合は null。 */
  function normalizePath(p) {
    if (p == null) return null;
    var parts = String(p).replace(/\\/g, '/').split('/');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (seg === '' || seg === '.') continue;
      if (seg === '..') {
        if (!out.length) return null;
        out.pop();
        continue;
      }
      out.push(seg);
    }
    return nfc(out.join('/'));
  }

  function dirname(p) {
    var i = p.lastIndexOf('/');
    return i < 0 ? '' : p.slice(0, i);
  }

  function basename(p) {
    var i = p.lastIndexOf('/');
    return i < 0 ? p : p.slice(i + 1);
  }

  /** 拡張子（小文字、ドットなし）。なければ空文字。 */
  function extname(p) {
    var b = basename(p);
    var i = b.lastIndexOf('.');
    return i <= 0 ? '' : b.slice(i + 1).toLowerCase();
  }

  function isDocPath(p) {
    return DOC_EXT_RE.test(p);
  }

  function stripDocExt(name) {
    return name.replace(DOC_EXT_RE, '');
  }

  /** 名前が . で始まる要素、または node_modules を含むパスは読み込まない。 */
  function isIgnoredPath(p) {
    var segs = String(p).split('/');
    for (var i = 0; i < segs.length; i++) {
      if (segs[i].charAt(0) === '.' || segs[i] === 'node_modules') return true;
    }
    return false;
  }

  function isIgnoredName(name) {
    return name.charAt(0) === '.' || name === 'node_modules';
  }

  /** 文書 basePath から見た相対パス target を、ルート基準のパスに解決する。 */
  function resolveRelative(basePath, target) {
    var t = String(target).replace(/\\/g, '/');
    if (t.charAt(0) === '/') return normalizePath(t);
    var dir = dirname(basePath || '');
    return normalizePath((dir ? dir + '/' : '') + t);
  }

  // ---------------------------------------------------------------------------
  // リンク解決（仕様 5.3）
  // ---------------------------------------------------------------------------

  var SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.\-]*:/;

  function classifyHref(href) {
    var h = String(href == null ? '' : href).trim();
    if (!h) return 'empty';
    if (h.charAt(0) === '#') return 'fragment';
    if (h.slice(0, 2) === '//' || SCHEME_RE.test(h)) return 'external';
    return 'relative';
  }

  function splitHref(href) {
    var h = String(href);
    var fragment = '';
    var i = h.indexOf('#');
    if (i >= 0) { fragment = h.slice(i + 1); h = h.slice(0, i); }
    var q = h.indexOf('?');
    if (q >= 0) h = h.slice(0, q);
    return { path: h, fragment: fragment };
  }

  /**
   * 照合用の索引を作る。
   * @param {Array<{path:string, kind:string}>} entries
   */
  function createIndex(entries) {
    var exact = new Map();
    var lower = new Map();
    var dirs = new Map();
    dirs.set('', '');
    entries.forEach(function (e) {
      exact.set(e.path, e.kind);
      var lk = e.path.toLowerCase();
      if (!lower.has(lk)) lower.set(lk, e.path);
      var d = dirname(e.path);
      while (d) {
        var dl = d.toLowerCase();
        if (!dirs.has(dl)) dirs.set(dl, d);
        d = dirname(d);
      }
    });
    return { exact: exact, lower: lower, dirs: dirs };
  }

  function findInIndex(index, p) {
    if (index.exact.has(p)) return p;
    var l = index.lower.get(p.toLowerCase());
    return l === undefined ? null : l;
  }

  function hit(index, p) {
    return { path: p, kind: index.exact.get(p) };
  }

  /** 完全一致 → 大文字小文字無視 → .md 補完 → .html の読み替え → フォルダの README / index。 */
  function lookupPath(index, p) {
    if (p == null) return null;
    var i, cand;
    if (p !== '') {
      cand = findInIndex(index, p);
      if (cand) return hit(index, cand);
      if (!DOC_EXT_RE.test(p)) {
        for (i = 0; i < DOC_EXTS.length; i++) {
          cand = findInIndex(index, p + '.' + DOC_EXTS[i]);
          if (cand) return hit(index, cand);
        }
      }
      var ext = extname(p);
      if (ext === 'html' || ext === 'htm') {
        var stem = p.slice(0, p.length - ext.length - 1);
        for (i = 0; i < DOC_EXTS.length; i++) {
          cand = findInIndex(index, stem + '.' + DOC_EXTS[i]);
          if (cand) return hit(index, cand);
        }
      }
    }
    var dl = p.toLowerCase();
    if (index.dirs.has(dl)) {
      var dir = index.dirs.get(dl);
      var bases = ['readme', 'index'];
      for (var b = 0; b < bases.length; b++) {
        for (i = 0; i < DOC_EXTS.length; i++) {
          cand = findInIndex(index, (dir ? dir + '/' : '') + bases[b] + '.' + DOC_EXTS[i]);
          if (cand) return hit(index, cand);
        }
      }
    }
    return null;
  }

  /**
   * 文書中の href / src を解決する。
   * 戻り値の type: 'empty' | 'fragment' | 'external' | 'doc' | 'asset' | 'missing'
   */
  function resolveLink(index, basePath, href) {
    var kind = classifyHref(href);
    var h = String(href == null ? '' : href).trim();
    if (kind === 'empty') return { type: 'empty' };
    if (kind === 'fragment') return { type: 'fragment', fragment: safeDecode(h.slice(1)) };
    if (kind === 'external') return { type: 'external', href: h };
    var parts = splitHref(h);
    var fragment = safeDecode(parts.fragment);
    var rawPath = safeDecode(parts.path);
    if (rawPath === '') return { type: 'fragment', fragment: fragment };
    var resolved = resolveRelative(basePath, rawPath);
    if (resolved === null) return { type: 'missing', path: null, raw: rawPath, fragment: fragment };
    var found = lookupPath(index, resolved);
    if (!found) return { type: 'missing', path: resolved, raw: rawPath, fragment: fragment };
    return { type: found.kind === 'doc' ? 'doc' : 'asset', path: found.path, fragment: fragment };
  }

  // ---------------------------------------------------------------------------
  // ルート（URL ハッシュ、仕様 5.2）
  // ---------------------------------------------------------------------------

  function encodePath(p) {
    return String(p).split('/').map(encodeURIComponent).join('/');
  }

  function buildRoute(path, fragment) {
    return '#/' + encodePath(path || '') + (fragment ? '#' + encodeURIComponent(fragment) : '');
  }

  function buildHelpRoute(fragment) {
    return '#!help' + (fragment ? '#' + encodeURIComponent(fragment) : '');
  }

  function parseRoute(hash) {
    var h = String(hash || '');
    if (h.charAt(0) === '#') h = h.slice(1);
    if (h === '' || h === '/') return { type: 'home' };
    var i;
    if (h.charAt(0) === '!') {
      i = h.indexOf('#');
      var name = i >= 0 ? h.slice(1, i) : h.slice(1);
      if (name === 'help') return { type: 'help', fragment: i >= 0 ? safeDecode(h.slice(i + 1)) : '' };
      return { type: 'home' };
    }
    if (h.charAt(0) !== '/') return { type: 'fragment', fragment: safeDecode(h) };
    var rest = h.slice(1);
    var frag = '';
    i = rest.indexOf('#');
    if (i >= 0) { frag = rest.slice(i + 1); rest = rest.slice(0, i); }
    var path = normalizePath(rest.split('/').map(safeDecode).join('/'));
    if (path === null || path === '') return { type: 'home', fragment: safeDecode(frag) };
    return { type: 'doc', path: path, fragment: safeDecode(frag) };
  }

  // ---------------------------------------------------------------------------
  // 見出し ID（GitHub 方式）
  // ---------------------------------------------------------------------------

  var SLUG_REMOVE_RE = /[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu;

  function slugify(text) {
    return String(text).trim().toLowerCase().replace(SLUG_REMOVE_RE, '').replace(/ /g, '-');
  }

  /** 同じ文書内で重複しない ID を返す関数を作る。 */
  function createSlugger() {
    var seen = Object.create(null);
    return function (text) {
      var base = slugify(text) || 'section';
      var id = base;
      var n = seen[base] || 0;
      while (id in seen) {
        n += 1;
        id = base + '-' + n;
      }
      seen[base] = n;
      seen[id] = seen[id] || 0;
      return id;
    };
  }

  // ---------------------------------------------------------------------------
  // フロントマター
  // ---------------------------------------------------------------------------

  var FM_MAX_LINES = 200;
  var FM_LINE_OK_RE = /^(?:\s*$|\s*#|[A-Za-z0-9_\-."' ]+\s*:(?:\s|$)|\s*-(?:\s|$)|\s+\S)/;

  /** 先頭の YAML フロントマターを取り除く。data には最上位の「key: value」だけを入れる。 */
  function parseFrontMatter(text) {
    var src = String(text);
    if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
    var none = { has: false, data: {}, body: src };
    var open = /^---[ \t]*\r?\n/.exec(src);
    if (!open) return none;
    var pos = open[0].length;
    var data = {};
    for (var n = 0; n < FM_MAX_LINES; n++) {
      if (pos > src.length) return none;
      var nl = src.indexOf('\n', pos);
      var end = nl < 0 ? src.length : nl;
      var line = src.slice(pos, end);
      if (line.charAt(line.length - 1) === '\r') line = line.slice(0, -1);
      if (/^(?:---|\.\.\.)[ \t]*$/.test(line)) {
        return { has: true, data: data, body: nl < 0 ? '' : src.slice(nl + 1) };
      }
      if (nl < 0) return none;
      if (!FM_LINE_OK_RE.test(line)) return none;
      var m = /^([A-Za-z0-9_\-.]+)\s*:\s*(.*)$/.exec(line);
      if (m) {
        var v = m[2].trim();
        if (v.length >= 2 && ((v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') || (v.charAt(0) === "'" && v.charAt(v.length - 1) === "'"))) {
          v = v.slice(1, -1);
        } else {
          v = v.replace(/\s+#.*$/, '');
        }
        if (v !== '' && v !== '|' && v !== '>' && v !== '|-' && v !== '>-') data[m[1]] = v;
      }
      pos = nl + 1;
    }
    return none;
  }

  // ---------------------------------------------------------------------------
  // 文字コード判定
  // ---------------------------------------------------------------------------

  function decodeBytes(label, u8, fatal) {
    return new TextDecoder(label, { fatal: fatal }).decode(u8);
  }

  /** BOM → UTF-8 厳密 → Shift_JIS 厳密 → UTF-8（置換文字あり）の順で判定する。 */
  function detectAndDecode(bytes) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var n = u8.length;
    if (n >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) {
      return { text: decodeBytes('utf-8', u8.subarray(3), false), encoding: 'utf-8' };
    }
    if (n >= 2 && u8[0] === 0xFF && u8[1] === 0xFE) {
      return { text: decodeBytes('utf-16le', u8.subarray(2), false), encoding: 'utf-16le' };
    }
    if (n >= 2 && u8[0] === 0xFE && u8[1] === 0xFF) {
      return { text: decodeBytes('utf-16be', u8.subarray(2), false), encoding: 'utf-16be' };
    }
    try {
      return { text: decodeBytes('utf-8', u8, true), encoding: 'utf-8' };
    } catch (e) { /* UTF-8 ではない */ }
    try {
      return { text: decodeBytes('shift_jis', u8, true), encoding: 'shift_jis' };
    } catch (e2) { /* Shift_JIS でもない、または未対応 */ }
    return { text: decodeBytes('utf-8', u8, false), encoding: 'unknown' };
  }

  // ---------------------------------------------------------------------------
  // 見出し・本文テキストの抽出（検索・タイトル用の簡易解析）
  // ---------------------------------------------------------------------------

  var ENTITY_MAP = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

  /** インライン記法の記号を取り除く。 */
  function stripInline(s) {
    return String(s)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/!?\[([^\]]+)\]\[[^\]]*\]/g, '$1')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\/?[A-Za-z][^>]*>/g, '')
      .replace(/(`+)([\s\S]*?)\1/g, '$2')
      .replace(/(\*\*|__|~~)/g, '')
      .replace(/\*([^*\s][^*]*?)\*/g, '$1')
      .replace(/(^|[^A-Za-z0-9_])_([^_\s][^_]*?)_(?![A-Za-z0-9_])/g, '$1$2')
      .replace(/\\([\\`*_{}\[\]()#+\-.!|<>~$])/g, '$1')
      .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, function (m, k) { return ENTITY_MAP[k]; });
  }

  /** フェンスコードを追跡しながら行ごとに処理する。type: text | code | fence */
  function scanLines(body, onLine) {
    var lines = String(body).split(/\r?\n/);
    var fence = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (m && m[1].charAt(0) === fence.ch && m[1].length >= fence.len && /^\s*$/.test(m[2])) {
          fence = null;
          onLine(line, 'fence', i);
        } else {
          onLine(line, 'code', i);
        }
        continue;
      }
      if (m && !(m[1].charAt(0) === '`' && m[2].indexOf('`') >= 0)) {
        fence = { ch: m[1].charAt(0), len: m[1].length };
        onLine(line, 'fence', i);
        continue;
      }
      onLine(line, 'text', i);
    }
  }

  var ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
  var NOT_PARAGRAPH_RE = /^ {0,3}(?:#{1,6}(?:\s|$)|>|[-*+](?:\s|$)|\d+[.)]\s|\||```|~~~)/;

  /** 見出しの一覧（level, text）。 */
  function extractHeadings(body) {
    var out = [];
    var prev = null; // 直前の段落行
    scanLines(body, function (line, type) {
      if (type !== 'text') { prev = null; return; }
      var m = ATX_RE.exec(line);
      if (m) {
        var t = stripInline(m[2] || '').trim();
        if (t) out.push({ level: m[1].length, text: t });
        prev = null;
        return;
      }
      if (prev !== null) {
        if (/^ {0,3}=+[ \t]*$/.test(line)) { out.push({ level: 1, text: stripInline(prev).trim() }); prev = null; return; }
        if (/^ {0,3}-{2,}[ \t]*$/.test(line)) { out.push({ level: 2, text: stripInline(prev).trim() }); prev = null; return; }
      }
      if (/^\s*$/.test(line) || NOT_PARAGRAPH_RE.test(line) || /^ {4,}/.test(line)) { prev = null; return; }
      prev = line;
    });
    return out;
  }

  var TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;

  /** Markdown の記法記号を取り除いた検索用テキスト。 */
  function toPlainText(body) {
    var out = [];
    scanLines(body, function (line, type) {
      if (type === 'fence') return;
      if (type === 'code') { out.push(line); return; }
      if (TABLE_SEP_RE.test(line) || /^ {0,3}(?:[-*_][ \t]*){3,}$/.test(line) || /^ {0,3}=+[ \t]*$/.test(line)) return;
      if (/^ {0,3}\[[^\]^][^\]]*\]:\s*\S/.test(line)) return; // リンク参照定義
      var s = line
        .replace(/^\s*(?:>\s?)+/, '')
        .replace(/^\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i, '')
        .replace(/^ {0,3}#{1,6}[ \t]+/, '')
        .replace(/[ \t]+#+[ \t]*$/, '')
        .replace(/^\s*(?:[-*+]|\d+[.)])[ \t]+/, '')
        .replace(/^\[[ xX]\][ \t]+/, '')
        .replace(/^\[\^([^\]]+)\]:[ \t]*/, '');
      if (s.indexOf('|') >= 0) s = s.replace(/\\\|/g, '\u0000').replace(/\|/g, ' ').replace(/\u0000/g, '|');
      s = stripInline(s);
      out.push(s);
    });
    return out.join('\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim();
  }

  /** 文書の解析結果（タイトル・見出し・検索用テキスト）。 */
  function analyzeDoc(text, fallbackTitle) {
    var fm = parseFrontMatter(text);
    var headings = extractHeadings(fm.body);
    var title = fm.data.title || '';
    if (!title) {
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].level === 1) { title = headings[i].text; break; }
      }
    }
    return {
      title: title || fallbackTitle || '',
      hasOwnTitle: !!title,
      headings: headings,
      plain: toPlainText(fm.body),
      frontMatter: fm.data
    };
  }

  // ---------------------------------------------------------------------------
  // 検索（大文字小文字・全角半角を区別しない）
  // ---------------------------------------------------------------------------

  function isCombining(c) {
    return (c >= 0x0300 && c <= 0x036F) || (c >= 0x1AB0 && c <= 0x1AFF) || (c >= 0x1DC0 && c <= 0x1DFF) ||
      (c >= 0x20D0 && c <= 0x20FF) || c === 0x3099 || c === 0x309A || (c >= 0xFE20 && c <= 0xFE2F) ||
      c === 0xFF9E || c === 0xFF9F;
  }

  /** NFKC・小文字化で変化しないコード単位（高速化のための判定）。 */
  function isStable(c) {
    if (c < 0x80) return !(c >= 0x41 && c <= 0x5A);
    return (c >= 0x3041 && c <= 0x3096) || (c >= 0x30A1 && c <= 0x30FA) || c === 0x30FC ||
      (c >= 0x4E00 && c <= 0x9FFF) || c === 0x3001 || c === 0x3002;
  }

  /**
   * 照合用に文字列をたたむ（NFKC ＋小文字化）。
   * wantMap が真なら、たたんだ文字列の各位置 → 元の文字列の位置 の対応表も返す。
   */
  function foldImpl(src, wantMap) {
    src = String(src);
    var n = src.length;
    var out = '';
    var i = 0;
    var runStart = 0;
    var map = wantMap ? new Uint32Array(n + 16) : null;
    var mlen = 0;

    function ensure(extra) {
      if (mlen + extra > map.length) {
        var bigger = new Uint32Array(Math.max(map.length * 2, mlen + extra + 16));
        bigger.set(map.subarray(0, mlen));
        map = bigger;
      }
    }
    function flush(end) {
      if (end > runStart) {
        out += src.slice(runStart, end);
        if (wantMap) {
          ensure(end - runStart);
          for (var k = runStart; k < end; k++) map[mlen++] = k;
        }
      }
    }

    while (i < n) {
      var c = src.charCodeAt(i);
      var nx = i + 1 < n ? src.charCodeAt(i + 1) : 0;
      if (isStable(c) && !(nx >= 0x0300 && isCombining(nx))) { i++; continue; }
      flush(i);
      var j = i + 1;
      if (c >= 0xD800 && c <= 0xDBFF && j < n) {
        var lo = src.charCodeAt(j);
        if (lo >= 0xDC00 && lo <= 0xDFFF) j++;
      }
      while (j < n && isCombining(src.charCodeAt(j))) j++;
      var f;
      if (c < 0x80 && j === i + 1) {
        f = (c >= 0x41 && c <= 0x5A) ? String.fromCharCode(c + 32) : src.charAt(i);
      } else {
        f = src.slice(i, j).normalize('NFKC').toLowerCase();
      }
      out += f;
      if (wantMap) {
        ensure(f.length);
        for (var q = 0; q < f.length; q++) map[mlen++] = i;
      }
      i = j;
      runStart = i;
    }
    flush(n);
    if (wantMap) {
      ensure(1);
      map[mlen] = n;
      return { text: out, map: map };
    }
    return out;
  }

  function fold(s) { return foldImpl(s, false); }
  function foldWithMap(s) { return foldImpl(s, true); }

  /** 検索語を空白で分割し、たたんだ語の配列にする（重複は除く）。 */
  function tokenizeQuery(q) {
    var f = fold(String(q == null ? '' : q)).trim();
    if (!f) return [];
    var seen = Object.create(null);
    var out = [];
    f.split(/\s+/).forEach(function (t) {
      if (t && !seen[t]) { seen[t] = true; out.push(t); }
    });
    return out;
  }

  function countOccurrences(hay, needle, cap) {
    if (!needle) return 0;
    var count = 0;
    var pos = 0;
    while (count < cap) {
      var i = hay.indexOf(needle, pos);
      if (i < 0) break;
      count++;
      pos = i + needle.length;
    }
    return count;
  }

  function makeSearchEntry(path, analysis) {
    return {
      path: path,
      title: analysis.title,
      plain: analysis.plain,
      titleF: fold(analysis.title),
      pathF: fold(path),
      headF: fold(analysis.headings.map(function (h) { return h.text; }).join('\n')),
      textF: fold(analysis.plain)
    };
  }

  /**
   * AND 検索。タイトル・見出し・パスでの一致を優先し、次に本文の一致数で並べる。
   * @param {Array} entries makeSearchEntry の結果の配列
   */
  function searchDocs(entries, terms, limit) {
    var results = [];
    if (!terms || !terms.length) return { total: 0, results: results };
    for (var e = 0; e < entries.length; e++) {
      var en = entries[e];
      var score = 0;
      var firstBody = -1;
      var ok = true;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var inTitle = en.titleF.indexOf(t) >= 0;
        var inHead = en.headF.indexOf(t) >= 0;
        var inPath = en.pathF.indexOf(t) >= 0;
        var bodyAt = en.textF.indexOf(t);
        if (!inTitle && !inHead && !inPath && bodyAt < 0) { ok = false; break; }
        if (bodyAt >= 0 && firstBody < 0) firstBody = bodyAt;
        score += (inTitle ? 100 : 0) + (inHead ? 40 : 0) + (inPath ? 20 : 0) + countOccurrences(en.textF, t, 20) * 2;
      }
      if (ok) results.push({ path: en.path, title: en.title, score: score, hint: firstBody });
    }
    results.sort(function (a, b) {
      return b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    });
    return { total: results.length, results: results.slice(0, limit || 50) };
  }

  /** text の中で terms（たたみ済み）に一致する範囲を、元の文字列の位置で返す。 */
  function findRanges(text, terms) {
    var src = String(text);
    if (!src || !terms || !terms.length) return [];
    var f = foldWithMap(src);
    var raw = [];
    for (var t = 0; t < terms.length; t++) {
      var term = terms[t];
      if (!term) continue;
      var pos = 0;
      for (;;) {
        var i = f.text.indexOf(term, pos);
        if (i < 0) break;
        var s = f.map[i];
        var e = f.map[i + term.length];
        if (e <= s) {
          // 1 文字が複数文字に展開された途中で終わった場合は、その文字の終わりまで含める
          var k = i + term.length;
          while (k < f.text.length && f.map[k] <= s) k++;
          e = f.map[k];
        }
        raw.push([s, e]);
        pos = i + term.length;
      }
    }
    if (!raw.length) return raw;
    raw.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var merged = [raw[0]];
    for (var r = 1; r < raw.length; r++) {
      var last = merged[merged.length - 1];
      if (raw[r][0] <= last[1]) { if (raw[r][1] > last[1]) last[1] = raw[r][1]; }
      else merged.push(raw[r]);
    }
    return merged;
  }

  function isLowSurrogate(c) { return c >= 0xDC00 && c <= 0xDFFF; }

  /**
   * 一致箇所の前後を切り出した抜粋を作る。
   * hint は、たたんだ本文での最初の一致位置（分かっていれば）。大きな文書で全体を走査しないために使う。
   */
  function makeSnippet(plain, terms, radius, hint) {
    radius = radius || 40;
    var full = String(plain);
    var offset = 0;
    var win = full;
    if (hint >= 0 && full.length > 4000) {
      offset = Math.max(0, hint - 600);
      win = full.slice(offset, hint + 1400);
    }
    var src = win.replace(/\s/g, ' ');
    var ranges = findRanges(src, terms);
    if (!ranges.length && win !== full) {
      src = full.replace(/\s/g, ' ');
      ranges = findRanges(src, terms);
      offset = 0;
    }
    if (!ranges.length) {
      var headLen = Math.min(src.length, radius * 3);
      if (headLen < src.length && isLowSurrogate(src.charCodeAt(headLen))) headLen++;
      return { text: src.slice(0, headLen) + (headLen < src.length ? '…' : ''), ranges: [] };
    }
    var first = ranges[0];
    var start = Math.max(0, first[0] - radius);
    var end = Math.min(src.length, first[1] + radius * 2);
    if (start > 0 && isLowSurrogate(src.charCodeAt(start))) start--;
    if (end < src.length && isLowSurrogate(src.charCodeAt(end))) end++;
    var prefix = (start > 0 || offset > 0) ? '…' : '';
    var suffix = (end < src.length || offset + win.length < full.length) ? '…' : '';
    var out = [];
    for (var i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      if (r[1] <= start || r[0] >= end) continue;
      out.push([Math.max(r[0], start) - start + prefix.length, Math.min(r[1], end) - start + prefix.length]);
    }
    return { text: prefix + src.slice(start, end) + suffix, ranges: out };
  }

  // ---------------------------------------------------------------------------
  // ツリー
  // ---------------------------------------------------------------------------

  var collator;

  /** 自然順の比較。利用者の環境によらず同じ順になるよう、照合規則を固定する。 */
  function compareNames(a, b) {
    if (collator === undefined) {
      try { collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' }); } catch (e) { collator = null; }
    }
    if (collator) {
      var r = collator.compare(a, b);
      if (r !== 0) return r;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function indexRank(name) {
    var s = stripDocExt(name).toLowerCase();
    return s === 'readme' ? 0 : s === 'index' ? 1 : 2;
  }

  function compareFiles(a, b) {
    var ra = indexRank(a.name);
    var rb = indexRank(b.name);
    return ra !== rb ? ra - rb : compareNames(a.name, b.name);
  }

  /** 文書パスの配列からツリーを作る。各階層は「ファイル（README / index が先頭）→ フォルダ」の順。 */
  function buildTree(docPaths) {
    var root = { name: '', path: '', dirs: [], files: [], map: Object.create(null) };
    docPaths.forEach(function (p) {
      var segs = p.split('/');
      var node = root;
      for (var i = 0; i < segs.length - 1; i++) {
        var key = segs[i];
        var child = node.map[key];
        if (!child) {
          child = { name: key, path: (node.path ? node.path + '/' : '') + key, dirs: [], files: [], map: Object.create(null) };
          node.map[key] = child;
          node.dirs.push(child);
        }
        node = child;
      }
      node.files.push({ name: segs[segs.length - 1], path: p });
    });
    (function sortNode(node) {
      delete node.map;
      node.dirs.sort(function (a, b) { return compareNames(a.name, b.name); });
      node.files.sort(compareFiles);
      node.dirs.forEach(sortNode);
    })(root);
    return root;
  }

  /** ツリーの表示順（ファイル → フォルダ）で文書パスを並べる。 */
  function flattenTree(node, out) {
    out = out || [];
    node.files.forEach(function (f) { out.push(f.path); });
    node.dirs.forEach(function (d) { flattenTree(d, out); });
    return out;
  }

  /** ホーム文書: 設定の home → ルートの README → ルートの index → ツリー順で最初の文書。 */
  function pickHome(index, orderedDocs, configHome) {
    var found;
    if (configHome) {
      found = lookupPath(index, normalizePath(configHome));
      if (found && found.kind === 'doc') return found.path;
    }
    found = lookupPath(index, '');
    if (found && found.kind === 'doc') return found.path;
    return orderedDocs.length ? orderedDocs[0] : null;
  }

  // ---------------------------------------------------------------------------
  // style 属性のフィルタ（仕様 SEC-3）
  // ---------------------------------------------------------------------------

  var STYLE_PROPS = (
    'color background-color background font-size font-weight font-style font-family font-variant ' +
    'text-align text-decoration text-decoration-line text-decoration-color text-decoration-style text-decoration-thickness ' +
    'text-indent text-transform vertical-align white-space word-break overflow-wrap line-height letter-spacing ' +
    'width height min-width max-width min-height max-height ' +
    'margin margin-top margin-right margin-bottom margin-left ' +
    'padding padding-top padding-right padding-bottom padding-left ' +
    'border border-top border-right border-bottom border-left border-color border-style border-width ' +
    'border-top-color border-right-color border-bottom-color border-left-color ' +
    'border-top-style border-right-style border-bottom-style border-left-style ' +
    'border-top-width border-right-width border-bottom-width border-left-width ' +
    'border-collapse border-spacing border-radius ' +
    'display flex flex-direction flex-wrap flex-grow flex-shrink flex-basis gap row-gap column-gap ' +
    'align-items align-self justify-content grid-template-columns grid-template-rows ' +
    'float clear list-style-type table-layout caption-side overflow overflow-x overflow-y'
  ).split(' ');
  var STYLE_PROP_SET = Object.create(null);
  STYLE_PROPS.forEach(function (p) { STYLE_PROP_SET[p] = true; });

  var STYLE_VALUE_RE = /^[A-Za-z0-9#%.,()\-+*\/ \t]+$/;
  var STYLE_FORBIDDEN_RE = /(?:url|image|image-set|cross-fade|element|paint|src|attr|env|expression)\s*\(/i;

  /**
   * style 属性の値から、許可したプロパティ・安全な値だけを残す。
   * 引用符・バックスラッシュ・コメントを含む宣言は丸ごと捨てる（エスケープによる回避を防ぐ）。
   */
  function filterStyle(styleText) {
    var src = String(styleText == null ? '' : styleText);
    if (!src || src.indexOf('/*') >= 0 || src.length > 2000) return '';
    var out = [];
    var decls = src.split(';');
    for (var i = 0; i < decls.length; i++) {
      var d = decls[i];
      var c = d.indexOf(':');
      if (c < 0) continue;
      var prop = d.slice(0, c).trim().toLowerCase();
      var value = d.slice(c + 1).trim().replace(/\s*!important\s*$/i, '');
      if (!STYLE_PROP_SET[prop]) continue;
      if (!value || value.length > 200) continue;
      if (!STYLE_VALUE_RE.test(value)) continue;
      if (STYLE_FORBIDDEN_RE.test(value)) continue;
      out.push(prop + ': ' + value);
    }
    return out.join('; ');
  }

  // ---------------------------------------------------------------------------
  // サイトデータ・HTML の組み立て（仕様 5.5、8.2）
  // ---------------------------------------------------------------------------

  var MIME_TYPES = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
    webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon', apng: 'image/apng',
    mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
    pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', tsv: 'text/tab-separated-values',
    json: 'application/json', xml: 'application/xml', zip: 'application/zip',
    html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };

  function mimeOf(path) {
    return MIME_TYPES[extname(path)] || 'application/octet-stream';
  }

  function bytesToBase64(u8) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
    }
    var s = '';
    var CHUNK = 0x8000;
    for (var i = 0; i < u8.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
    }
    return btoa(s);
  }

  function base64ToBytes(b64) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      var b = Buffer.from(b64, 'base64');
      return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    }
    var bin = atob(b64);
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  // 行区切り文字（U+2028 / U+2029）。ソースに直接書くと行末として扱われるため、コードポイントから作る
  var LINE_SEP_RE = new RegExp(String.fromCharCode(0x2028), 'g');
  var PARA_SEP_RE = new RegExp(String.fromCharCode(0x2029), 'g');

  /** <script type="application/json"> に安全に埋め込める JSON 文字列。 */
  function jsonForScript(value) {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(LINE_SEP_RE, '\\u2028')
      .replace(PARA_SEP_RE, '\\u2029');
  }

  // allowDownloads / lockExternalImages は、ファイルの保存や外部の読み込みができない環境（サンドボックス化された
  // フレームの中など）に置く場合や、配布先でそれらを使わせたくない場合のための指定。
  // hosted は、HTML に書いた CSP を外して外部のホスティング環境に置いたお試し用のページであることを示す
  // （開始画面と使い方に、その旨を表示する）
  var DEFAULT_CONFIG = { title: '', lang: 'auto', theme: 'auto', home: '', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false };

  /** 設定ブロックの内容を検証して既定値で補う。 */
  function normalizeConfig(raw) {
    var c = {};
    var src = raw && typeof raw === 'object' ? raw : {};
    c.title = typeof src.title === 'string' ? src.title : DEFAULT_CONFIG.title;
    c.lang = src.lang === 'ja' || src.lang === 'en' ? src.lang : 'auto';
    c.theme = src.theme === 'light' || src.theme === 'dark' ? src.theme : 'auto';
    c.home = typeof src.home === 'string' ? src.home : '';
    c.allowExternalImages = src.allowExternalImages === true;
    c.allowDownloads = src.allowDownloads !== false;
    c.lockExternalImages = src.lockExternalImages === true;
    c.hosted = src.hosted === true;
    return c;
  }

  /**
   * サイトデータを作る。
   * @param {string} name 文書セットの名前
   * @param {Array} files {path, kind:'doc', text, mtime} / {path, kind:'asset', mime, base64, mtime}
   */
  function buildSiteData(name, files, created) {
    return {
      format: SITE_FORMAT,
      generator: NAME + ' ' + VERSION,
      created: created || new Date().toISOString(),
      name: String(name || ''),
      files: files.map(function (f) {
        if (f.kind === 'doc') return { path: f.path, kind: 'doc', mtime: f.mtime || 0, text: String(f.text) };
        return { path: f.path, kind: 'asset', mime: f.mime || mimeOf(f.path), mtime: f.mtime || 0, base64: String(f.base64) };
      })
    };
  }

  function validateSiteData(data) {
    if (data === null || data === undefined) return { ok: false, empty: true };
    if (typeof data !== 'object') return { ok: false, error: 'type' };
    if (data.format !== SITE_FORMAT) return { ok: false, error: 'format', format: data.format };
    if (!Array.isArray(data.files)) return { ok: false, error: 'files' };
    for (var i = 0; i < data.files.length; i++) {
      var f = data.files[i];
      if (!f || typeof f !== 'object' || typeof f.path !== 'string') return { ok: false, error: 'files' };
      if (f.kind !== 'doc' && f.kind !== 'asset') return { ok: false, error: 'files' };
      if (f.kind === 'doc' && typeof f.text !== 'string') return { ok: false, error: 'files' };
      if (f.kind === 'asset' && typeof f.base64 !== 'string') return { ok: false, error: 'files' };
      if (f.mime !== undefined && f.mime !== null && typeof f.mime !== 'string') return { ok: false, error: 'files' };
      if (f.mtime !== undefined && f.mtime !== null && typeof f.mtime !== 'number') return { ok: false, error: 'files' };
    }
    return { ok: true };
  }

  var NOSCRIPT = '<noscript><p style="font-family:sans-serif;padding:2em">このページの表示には JavaScript が必要です。 / JavaScript is required to view this page.</p></noscript>';
  var BLOCK_ID_RE = /^mdv-[a-z0-9-]+$/;

  /**
   * HTML 全体を組み立てる。ビルド・アプリ内の書き出し・CLI の 3 か所から使う唯一の実装。
   * parts: { lang, title, csp, generator, css, blocks: [{id, type, text}] }
   */
  // タブのアイコン。HTML の中に持たせて、http(s) で配信したときに favicon.ico を取りに行かせない
  var FAVICON = 'data:image/svg+xml,'
    + '%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E'
    + '%3Crect width=%2732%27 height=%2732%27 rx=%276%27 fill=%27%231D4F91%27/%3E'
    + '%3Cpath d=%27M9 6h10l5 5v15H9z%27 fill=%27%23fff%27/%3E'
    + '%3Cpath d=%27M12 15h9M12 19h9M12 23h5%27 stroke=%27%231D4F91%27 stroke-width=%271.8%27/%3E'
    + '%3C/svg%3E';

  /** 隣に置いて見た目を上書きする CSS のファイル名（SPEC 3.10） */
  var USER_CSS_FILE = 'mdfolio.css';

  function composeHtml(parts) {
    var css = String(parts.css || '');
    var userCss = String(parts.userCss || '');
    if (/<\/style/i.test(css)) throw new Error('composeHtml: CSS contains "</style"');
    if (/<\/style/i.test(userCss)) throw new Error('composeHtml: user CSS contains "</style"');
    var out = [];
    out.push('<!DOCTYPE html>');
    out.push('<html lang="' + escapeHtml(parts.lang || 'ja') + '">');
    out.push('<head>');
    out.push('<meta charset="utf-8">');
    out.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
    out.push('<meta http-equiv="Content-Security-Policy" content="' + escapeHtml(parts.csp || '') + '">');
    out.push('<meta name="referrer" content="no-referrer">');
    out.push('<meta name="color-scheme" content="light dark">');
    out.push('<meta name="generator" content="' + escapeHtml(parts.generator || (NAME + ' ' + VERSION)) + '">');
    out.push('<link rel="icon" href="' + FAVICON + '">');
    out.push('<title>' + escapeHtml(parts.title || NAME) + '</title>');
    out.push('<style id="mdv-style">' + css + '</style>');
    // 利用者の CSS: 埋め込んだもの（書き出しで選んだもの）→ 隣の mdfolio.css の順。あとのものが勝つ（FR-1001、FR-1002）
    if (userCss) out.push('<style id="mdv-user-style">' + userCss + '</style>');
    out.push('<link rel="stylesheet" href="' + USER_CSS_FILE + '" id="mdv-user-css">');
    out.push('</head>');
    out.push('<body>');
    out.push(NOSCRIPT);
    out.push('<div id="mdv-root"></div>');
    (parts.blocks || []).forEach(function (b) {
      var text = String(b.text);
      if (!BLOCK_ID_RE.test(b.id)) throw new Error('composeHtml: invalid block id "' + b.id + '"');
      if (/<\/script/i.test(text) || text.indexOf('<!--') >= 0) {
        throw new Error('composeHtml: block "' + b.id + '" contains a sequence that cannot be embedded');
      }
      out.push('<script' + (b.type ? ' type="' + escapeHtml(b.type) + '"' : '') + ' id="' + b.id + '">' + text + '</script>');
    });
    out.push('</body>');
    out.push('</html>');
    return out.join('\n') + '\n';
  }

  /** composeHtml で作った HTML を部品に分解する（CLI 用）。 */
  function extractParts(html) {
    var src = String(html).replace(/\r\n?/g, '\n');
    var parts = { blocks: [] };
    var m = /<html lang="([^"]*)">/.exec(src);
    parts.lang = m ? unescapeHtml(m[1]) : 'ja';
    m = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(src);
    if (!m) throw new Error('extractParts: Content-Security-Policy not found');
    parts.csp = unescapeHtml(m[1]);
    m = /<meta name="generator" content="([^"]*)">/.exec(src);
    parts.generator = m ? unescapeHtml(m[1]) : '';
    m = /<title>([\s\S]*?)<\/title>/.exec(src);
    parts.title = m ? unescapeHtml(m[1]) : '';
    m = /<style id="mdv-style">([\s\S]*?)<\/style>/.exec(src);
    if (!m) throw new Error('extractParts: style block not found');
    parts.css = m[1];
    // <head> の中だけを探す（スクリプトの本文にも同じ文字列があるため）
    var headEnd = src.indexOf('</head>');
    m = /<style id="mdv-user-style">([\s\S]*?)<\/style>/.exec(headEnd >= 0 ? src.slice(0, headEnd) : src);
    parts.userCss = m ? m[1] : '';
    var re = /<script(?: type="([^"]*)")? id="(mdv-[a-z0-9-]+)">([\s\S]*?)<\/script>/g;
    while ((m = re.exec(src))) {
      parts.blocks.push({ type: m[1] ? unescapeHtml(m[1]) : '', id: m[2], text: m[3] });
    }
    if (!parts.blocks.length) throw new Error('extractParts: no blocks found');
    return parts;
  }

  function findBlock(parts, id) {
    for (var i = 0; i < parts.blocks.length; i++) {
      if (parts.blocks[i].id === id) return parts.blocks[i];
    }
    return null;
  }

  /**
   * ビューアの部品に設定とサイトデータを差し込み、サイト HTML の部品にする。
   * options: { config, siteData, title, dropLibs: ['katex','mermaid'] }
   */
  /**
   * 取り除くライブラリのハッシュを CSP からも外す（使わないスクリプトを許可したままにしない）。
   * ビルドは script-src のハッシュを「本体 2 つ → 数式 → 図」の順に並べる。この並びと一致しない場合は何も変えない。
   */
  function pruneScriptHashes(parts, drop) {
    var csp = String(parts.csp || '');
    var m = /(^|;\s*)script-src ([^;]*)/.exec(csp);
    if (!m) return csp;
    var hashes = m[2].split(/\s+/).filter(Boolean);
    var owners = ['mdv-js-vendor', 'mdv-js-app'];
    ['mdv-lib-katex', 'mdv-lib-mermaid'].forEach(function (id) { if (findBlock(parts, id)) owners.push(id); });
    if (hashes.length !== owners.length) return csp;
    for (var i = 0; i < hashes.length; i++) if (!/^'sha256-[A-Za-z0-9+\/=]+'$/.test(hashes[i])) return csp;
    var kept = hashes.filter(function (h, i) { return !drop[owners[i]]; });
    if (kept.length === hashes.length) return csp;
    return csp.slice(0, m.index) + m[1] + 'script-src ' + kept.join(' ') + csp.slice(m.index + m[0].length);
  }

  function applySite(parts, options) {
    var drop = Object.create(null);
    (options.dropLibs || []).forEach(function (name) {
      drop['mdv-lib-' + name] = true;
      if (name === 'katex') drop['mdv-res-katex-css'] = true;
    });
    var out = {
      lang: parts.lang,
      csp: pruneScriptHashes(parts, drop),
      generator: parts.generator,
      css: parts.css,
      userCss: options.userCss !== undefined ? String(options.userCss || '') : (parts.userCss || ''),
      title: options.title || parts.title,
      blocks: []
    };
    parts.blocks.forEach(function (b) {
      if (drop[b.id]) return;
      if (b.id === 'mdv-config') out.blocks.push({ id: b.id, type: b.type, text: jsonForScript(normalizeConfig(options.config)) });
      else if (b.id === 'mdv-site') out.blocks.push({ id: b.id, type: b.type, text: jsonForScript(options.siteData) });
      else out.blocks.push({ id: b.id, type: b.type, text: b.text });
    });
    return out;
  }

  return {
    NAME: NAME,
    VERSION: VERSION,
    SITE_FORMAT: SITE_FORMAT,
    DOC_EXTS: DOC_EXTS,
    LIMITS: LIMITS,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    FAVICON: FAVICON,
    USER_CSS_FILE: USER_CSS_FILE,
    NOSCRIPT: NOSCRIPT,
    // 文字列
    nfc: nfc, escapeHtml: escapeHtml, unescapeHtml: unescapeHtml, safeDecode: safeDecode,
    formatBytes: formatBytes, formatDate: formatDate, sanitizeFileName: sanitizeFileName,
    // パス
    normalizePath: normalizePath, dirname: dirname, basename: basename, extname: extname,
    isDocPath: isDocPath, stripDocExt: stripDocExt, isIgnoredPath: isIgnoredPath, isIgnoredName: isIgnoredName,
    resolveRelative: resolveRelative,
    // リンク
    classifyHref: classifyHref, splitHref: splitHref, createIndex: createIndex, lookupPath: lookupPath, resolveLink: resolveLink,
    // ルート
    encodePath: encodePath, buildRoute: buildRoute, buildHelpRoute: buildHelpRoute, parseRoute: parseRoute,
    // 見出し ID
    slugify: slugify, createSlugger: createSlugger,
    // 文書解析
    parseFrontMatter: parseFrontMatter, detectAndDecode: detectAndDecode,
    stripInline: stripInline, extractHeadings: extractHeadings, toPlainText: toPlainText, analyzeDoc: analyzeDoc,
    // 検索
    fold: fold, foldWithMap: foldWithMap, tokenizeQuery: tokenizeQuery, makeSearchEntry: makeSearchEntry,
    searchDocs: searchDocs, findRanges: findRanges, makeSnippet: makeSnippet,
    // ツリー
    compareNames: compareNames, buildTree: buildTree, flattenTree: flattenTree, pickHome: pickHome,
    // セキュリティ
    filterStyle: filterStyle,
    // サイトデータ・HTML
    mimeOf: mimeOf, bytesToBase64: bytesToBase64, base64ToBytes: base64ToBytes, jsonForScript: jsonForScript,
    normalizeConfig: normalizeConfig, buildSiteData: buildSiteData, validateSiteData: validateSiteData,
    composeHtml: composeHtml, extractParts: extractParts, findBlock: findBlock, applySite: applySite
  };
});
