/*!
 * mdfolio md — markdown-it の設定と拡張（ブラウザ・Node.js 共用）
 * MIT License
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  root.MDV = root.MDV || {};
  root.MDV.md = api;
  if (typeof module === 'object' && module && module.exports) { module.exports = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'];
  var DEFAULT_ALERT_LABELS = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };

  function fenceLang(md, token) {
    var info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    return info ? info.split(/\s+/)[0].toLowerCase() : '';
  }

  // ---------------------------------------------------------------------------
  // 数式: $...$ / $$...$$
  // ---------------------------------------------------------------------------

  /** $ が数式の開き・閉じになれるかを前後の文字から判定する（金額表記との誤認を避ける）。 */
  function mathDelim(src, pos, max) {
    var prev = pos > 0 ? src.charCodeAt(pos - 1) : -1;
    var next = pos + 1 < max ? src.charCodeAt(pos + 1) : -1;
    var canOpen = true;
    var canClose = true;
    if (prev === 0x20 || prev === 0x09 || prev === 0x0A || (next >= 0x30 && next <= 0x39)) canClose = false;
    if (next === 0x20 || next === 0x09 || next === 0x0A || next === -1) canOpen = false;
    return { canOpen: canOpen, canClose: canClose };
  }

  /** from 以降で、エスケープされていない needle の位置を返す。 */
  function findUnescaped(src, needle, from, max) {
    var at = from;
    for (;;) {
      at = src.indexOf(needle, at);
      if (at < 0 || at + needle.length > max) return -1;
      var back = at - 1;
      while (back >= 0 && src.charCodeAt(back) === 0x5C) back--;
      if ((at - back) % 2 === 1) return at;
      at += 1;
    }
  }

  function mathInlineRule(state, silent) {
    var src = state.src;
    var pos = state.pos;
    var max = state.posMax;
    if (src.charCodeAt(pos) !== 0x24 /* $ */) return false;

    // $$...$$（段落内のディスプレイ数式）
    if (pos + 1 < max && src.charCodeAt(pos + 1) === 0x24) {
      var endD = findUnescaped(src, '$$', pos + 2, max);
      if (endD < 0 || endD === pos + 2 || src.slice(pos + 2, endD).indexOf('`') >= 0) {
        if (!silent) state.pending += '$$';
        state.pos = pos + 2;
        return true;
      }
      if (!silent) {
        var td = state.push('math_inline', 'math', 0);
        td.markup = '$$';
        td.content = src.slice(pos + 2, endD).trim();
      }
      state.pos = endD + 2;
      return true;
    }

    var open = mathDelim(src, pos, max);
    if (!open.canOpen) {
      if (!silent) state.pending += '$';
      state.pos = pos + 1;
      return true;
    }
    var start = pos + 1;
    var end = findUnescaped(src, '$', start, max);
    if (end < 0) {
      if (!silent) state.pending += '$';
      state.pos = start;
      return true;
    }
    if (end === start) {
      if (!silent) state.pending += '$$';
      state.pos = start + 1;
      return true;
    }
    // 閉じが条件を満たさない、または途中にコード（`）を挟む場合は数式とみなさない
    if (!mathDelim(src, end, max).canClose || src.slice(start, end).indexOf('`') >= 0) {
      if (!silent) state.pending += '$';
      state.pos = start;
      return true;
    }
    if (!silent) {
      var t = state.push('math_inline', 'math', 0);
      t.markup = '$';
      t.content = src.slice(start, end);
    }
    state.pos = end + 1;
    return true;
  }

  function mathBlockRule(state, startLine, endLine, silent) {
    var pos = state.bMarks[startLine] + state.tShift[startLine];
    var max = state.eMarks[startLine];
    if (state.sCount[startLine] - state.blkIndent >= 4) return false;
    if (pos + 2 > max) return false;
    if (state.src.charCodeAt(pos) !== 0x24 || state.src.charCodeAt(pos + 1) !== 0x24) return false;

    var firstLine = state.src.slice(pos + 2, max);
    var lines = [];
    var next = startLine;
    var found = false;

    var trimmed = firstLine.replace(/\s+$/, '');
    if (trimmed.length >= 2 && trimmed.slice(-2) === '$$') {
      // 1 行で完結: $$ ... $$
      lines.push(trimmed.slice(0, -2));
      found = true;
    } else {
      // 開始行の途中に $$ がある場合（例: 「$$a$$ と続く文」）は段落内の数式として扱う
      if (firstLine.indexOf('$$') >= 0) return false;
      if (firstLine.trim()) lines.push(firstLine);
      for (next = startLine + 1; next < endLine; next++) {
        var lp = state.bMarks[next] + state.tShift[next];
        var lm = state.eMarks[next];
        if (lp < lm && state.sCount[next] < state.blkIndent) break; // 外側のブロックを抜けた
        var line = state.src.slice(lp, lm);
        var lt = line.replace(/\s+$/, '');
        if (lt.length >= 2 && lt.slice(-2) === '$$') {
          var rest = lt.slice(0, -2);
          if (rest.trim()) lines.push(rest);
          found = true;
          break;
        }
        lines.push(line);
      }
    }
    if (!found) return false; // 閉じがなければ数式とみなさない（文書全体を飲み込まないため）
    if (silent) return true;

    state.line = next + 1;
    var token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = lines.join('\n');
    token.map = [startLine, state.line];
    token.markup = '$$';
    return true;
  }

  function mathPlugin(md) {
    md.inline.ruler.after('escape', 'math_inline', mathInlineRule);
    md.block.ruler.after('blockquote', 'math_block', mathBlockRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
    md.renderer.rules.math_inline = function (tokens, idx) {
      var t = tokens[idx];
      var cls = t.markup === '$$' ? 'math-inline math-inline-display' : 'math-inline';
      return '<span class="' + cls + '">' + md.utils.escapeHtml(t.content) + '</span>';
    };
    md.renderer.rules.math_block = function (tokens, idx) {
      return '<div class="math-display">' + md.utils.escapeHtml(tokens[idx].content) + '</div>\n';
    };
  }

  // ---------------------------------------------------------------------------
  // タスクリスト: - [ ] / - [x]
  // ---------------------------------------------------------------------------

  function taskListPlugin(md) {
    md.core.ruler.push('mdv_task_lists', function (state) {
      var tokens = state.tokens;
      for (var i = 2; i < tokens.length; i++) {
        var tok = tokens[i];
        if (tok.type !== 'inline' || tokens[i - 1].type !== 'paragraph_open' || tokens[i - 2].type !== 'list_item_open') continue;
        var first = tok.children && tok.children[0];
        if (!first || first.type !== 'text') continue;
        var m = /^\[([ xX])\][ \xa0]/.exec(first.content);
        if (!m) continue;
        first.content = first.content.slice(m[0].length);
        tok.content = tok.content.slice(m[0].length);
        var box = new state.Token('html_inline', '', 0);
        box.content = '<input type="checkbox" disabled' + (m[1] === ' ' ? '' : ' checked') + '> ';
        tok.children.unshift(box);
        tokens[i - 2].attrJoin('class', 'task-list-item');
        // 親リストに印を付ける
        var level = tokens[i - 2].level - 1;
        for (var j = i - 3; j >= 0; j--) {
          if (tokens[j].level === level && (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open')) {
            if ((tokens[j].attrGet('class') || '').indexOf('contains-task-list') < 0) tokens[j].attrJoin('class', 'contains-task-list');
            break;
          }
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // GitHub 形式のアラート: > [!NOTE]
  // ---------------------------------------------------------------------------

  function alertPlugin(md, getLabels) {
    md.core.ruler.push('mdv_alerts', function (state) {
      var tokens = state.tokens;
      var labels = (typeof getLabels === 'function' ? getLabels() : getLabels) || DEFAULT_ALERT_LABELS;
      for (var i = 0; i + 2 < tokens.length; i++) {
        if (tokens[i].type !== 'blockquote_open') continue;
        if (tokens[i + 1].type !== 'paragraph_open' || tokens[i + 2].type !== 'inline') continue;
        var inline = tokens[i + 2];
        var kids = inline.children || [];
        if (!kids.length || kids[0].type !== 'text') continue;
        var m = /^\[!([A-Za-z]+)\][ \t]*$/.exec(kids[0].content);
        if (!m) continue;
        var type = m[1].toLowerCase();
        if (ALERT_TYPES.indexOf(type) < 0) continue;
        if (kids.length > 1 && kids[1].type !== 'softbreak' && kids[1].type !== 'hardbreak') continue;

        // 対応する閉じトークンを探す
        var close = -1;
        for (var j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === 'blockquote_close' && tokens[j].level === tokens[i].level) { close = j; break; }
        }
        if (close < 0) continue;

        tokens[i].tag = 'div';
        tokens[i].attrJoin('class', 'markdown-alert markdown-alert-' + type);
        tokens[close].tag = 'div';

        // マーカー行を取り除く
        kids.splice(0, kids.length > 1 ? 2 : 1);
        var nl = inline.content.indexOf('\n');
        inline.content = nl < 0 ? '' : inline.content.slice(nl + 1);

        var title = new state.Token('html_block', '', 0);
        title.content = '<p class="markdown-alert-title">' + md.utils.escapeHtml(labels[type] || DEFAULT_ALERT_LABELS[type]) + '</p>\n';
        title.block = true;
        if (!kids.length) {
          // マーカーだけの段落は段落ごと取り除く
          tokens.splice(i + 1, 3, title);
        } else {
          tokens.splice(i + 1, 0, title);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 見出し ID
  // ---------------------------------------------------------------------------

  function inlineText(children) {
    var s = '';
    for (var i = 0; i < (children || []).length; i++) {
      var c = children[i];
      if (c.type === 'text' || c.type === 'code_inline' || c.type === 'math_inline') s += c.content;
      else if (c.type === 'softbreak' || c.type === 'hardbreak') s += ' ';
      else if (c.type === 'image') s += inlineText(c.children);
    }
    return s;
  }

  function headingIdPlugin(md) {
    md.core.ruler.push('mdv_heading_ids', function (state) {
      var slug = state.env && state.env.slug;
      if (typeof slug !== 'function') return;
      var tokens = state.tokens;
      for (var i = 0; i + 1 < tokens.length; i++) {
        if (tokens[i].type !== 'heading_open') continue;
        if (tokens[i + 1].type !== 'inline') continue;
        tokens[i].attrSet('id', slug(inlineText(tokens[i + 1].children)));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // フェンス: mermaid / math
  // ---------------------------------------------------------------------------

  function fencePlugin(md) {
    var defaultFence = md.renderer.rules.fence;
    md.renderer.rules.fence = function (tokens, idx, options, env, self) {
      var token = tokens[idx];
      var lang = fenceLang(md, token);
      if (lang === 'mermaid') {
        return '<pre class="mermaid-src"><code>' + md.utils.escapeHtml(token.content) + '</code></pre>\n';
      }
      if (lang === 'math') {
        return '<div class="math-display">' + md.utils.escapeHtml(token.content) + '</div>\n';
      }
      return defaultFence(tokens, idx, options, env, self);
    };
  }

  // ---------------------------------------------------------------------------
  // 参照（リンク・画像）と利用機能の抽出
  // ---------------------------------------------------------------------------

  var HTML_ATTR_RE = /\b(src|href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  var HTML_ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };

  function decodeEntities(s) {
    return String(s).replace(/&(amp|lt|gt|quot|#39);/g, function (m, k) { return HTML_ENTITY[k]; });
  }

  function scanHtml(html, out) {
    var m;
    HTML_ATTR_RE.lastIndex = 0;
    while ((m = HTML_ATTR_RE.exec(html))) {
      var v = decodeEntities(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4]);
      if (m[1].toLowerCase() === 'href') out.links.push(v); else out.images.push(v);
    }
    if (/class\s*=\s*["'][^"']*\bmath-(?:inline|display)\b/i.test(html)) out.hasMath = true;
    if (/class\s*=\s*["'][^"']*\bmermaid-src\b/i.test(html)) out.hasMermaid = true;
  }

  // ---------------------------------------------------------------------------
  // レンダラーの生成
  // ---------------------------------------------------------------------------

  /**
   * options:
   *   markdownit   markdown-it の関数（省略時はグローバル）
   *   footnote     markdown-it-footnote（省略時はグローバル。なければ脚注なし）
   *   highlight    function (code, lang) → ハイライト済み HTML（なければ空文字）
   *   alertLabels  アラート見出しの文言を返す関数、またはオブジェクト
   */
  function createRenderer(options) {
    options = options || {};
    var markdownit = options.markdownit || root.markdownit;
    if (typeof markdownit !== 'function') throw new Error('markdown-it is not loaded');
    var md = markdownit({
      html: true,
      linkify: true,
      typographer: false,
      breaks: false,
      langPrefix: 'language-',
      highlight: options.highlight || null
    });
    // README.md や main.py のような文字列を URL と誤認しないよう、スキームなしのリンク化を止める
    md.linkify.set({ fuzzyLink: false, fuzzyIP: false, fuzzyEmail: true });

    var footnote = options.footnote || root.markdownitFootnote;
    if (typeof footnote === 'function') md.use(footnote);
    md.use(mathPlugin);
    md.use(taskListPlugin);
    md.use(alertPlugin, options.alertLabels);
    md.use(headingIdPlugin);
    md.use(fencePlugin);

    function render(src, env) {
      env = env || {};
      if (typeof env.slug !== 'function') env.slug = root.MDV.core.createSlugger();
      return md.render(String(src), env);
    }

    /** 文書中のリンク先・画像と、数式・図の利用有無を返す（書き出し時の添付収集に使う）。 */
    function collectRefs(src) {
      var out = { links: [], images: [], hasMath: false, hasMermaid: false };
      var tokens = md.parse(String(src), {});
      (function walk(list) {
        for (var i = 0; i < list.length; i++) {
          var t = list[i];
          if (t.type === 'image') {
            if (t.attrGet('src')) out.images.push(t.attrGet('src'));
          } else if (t.type === 'link_open') {
            if (t.attrGet('href')) out.links.push(t.attrGet('href'));
          } else if (t.type === 'math_inline' || t.type === 'math_block') {
            out.hasMath = true;
          } else if (t.type === 'fence') {
            var lang = fenceLang(md, t);
            if (lang === 'mermaid') out.hasMermaid = true;
            else if (lang === 'math') out.hasMath = true;
          } else if (t.type === 'html_block' || t.type === 'html_inline') {
            scanHtml(t.content, out);
          }
          if (t.children) walk(t.children);
        }
      })(tokens);
      return out;
    }

    return { md: md, render: render, collectRefs: collectRefs };
  }

  return {
    createRenderer: createRenderer,
    DEFAULT_ALERT_LABELS: DEFAULT_ALERT_LABELS,
    ALERT_TYPES: ALERT_TYPES
  };
});
