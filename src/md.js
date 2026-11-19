/*!
 * mdfolio md — markdown-it configuration and extensions (shared by browser and Node.js)
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
  // Math: $...$ / $$...$$
  // ---------------------------------------------------------------------------

  /** Decide from the surrounding characters whether $ can open or close math (to avoid mistaking currency amounts for math). */
  function mathDelim(src, pos, max) {
    var prev = pos > 0 ? src.charCodeAt(pos - 1) : -1;
    var next = pos + 1 < max ? src.charCodeAt(pos + 1) : -1;
    var canOpen = true;
    var canClose = true;
    if (prev === 0x20 || prev === 0x09 || prev === 0x0A || (next >= 0x30 && next <= 0x39)) canClose = false;
    if (next === 0x20 || next === 0x09 || next === 0x0A || next === -1) canOpen = false;
    return { canOpen: canOpen, canClose: canClose };
  }

  /** Return the position of the first unescaped needle at or after from. */
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

    // $$...$$ (display math inside a paragraph)
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
    // Not treated as math if the closer does not meet the conditions or if code (`) appears in between
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
      // Complete on one line: $$ ... $$
      lines.push(trimmed.slice(0, -2));
      found = true;
    } else {
      // If $$ appears partway through the opening line (e.g. "$$a$$ followed by text"), treat it as math inside a paragraph
      if (firstLine.indexOf('$$') >= 0) return false;
      if (firstLine.trim()) lines.push(firstLine);
      for (next = startLine + 1; next < endLine; next++) {
        var lp = state.bMarks[next] + state.tShift[next];
        var lm = state.eMarks[next];
        if (lp < lm && state.sCount[next] < state.blkIndent) break; // Left the enclosing block
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
    if (!found) return false; // Not treated as math without a closer (so it does not swallow the whole document)
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
  // Task lists: - [ ] / - [x]
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
        // Mark the parent list
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
  // GitHub-style alerts: > [!NOTE]
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

        // Find the matching closing token
        var close = -1;
        for (var j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === 'blockquote_close' && tokens[j].level === tokens[i].level) { close = j; break; }
        }
        if (close < 0) continue;

        tokens[i].tag = 'div';
        tokens[i].attrJoin('class', 'markdown-alert markdown-alert-' + type);
        tokens[close].tag = 'div';

        // Remove the marker line
        kids.splice(0, kids.length > 1 ? 2 : 1);
        var nl = inline.content.indexOf('\n');
        inline.content = nl < 0 ? '' : inline.content.slice(nl + 1);

        var title = new state.Token('html_block', '', 0);
        title.content = '<p class="markdown-alert-title">' + md.utils.escapeHtml(labels[type] || DEFAULT_ALERT_LABELS[type]) + '</p>\n';
        title.block = true;
        if (!kids.length) {
          // A paragraph containing only the marker is removed entirely
          tokens.splice(i + 1, 3, title);
        } else {
          tokens.splice(i + 1, 0, title);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Heading IDs
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
  // Fences: mermaid / math
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
  // Extracting references (links, images) and features used
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
  // Creating the renderer
  // ---------------------------------------------------------------------------

  /**
   * options:
   *   markdownit   the markdown-it function (defaults to the global)
   *   footnote     markdown-it-footnote (defaults to the global; no footnotes if absent)
   *   cjkFriendly  markdown-it-cjk-friendly (defaults to the global): emphasis next to CJK text (FR-1106)
   *   highlight    function (code, lang) -> highlighted HTML (empty string if none)
   *   alertLabels  a function returning alert heading text, or an object
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
    // Disable scheme-less linkify so strings like README.md or main.py are not mistaken for URLs
    md.linkify.set({ fuzzyLink: false, fuzzyIP: false, fuzzyEmail: true });

    var footnote = options.footnote || root.markdownitFootnote;
    if (typeof footnote === 'function') md.use(footnote);
    var cjkFriendly = options.cjkFriendly || root.markdownitCjkFriendly;
    if (typeof cjkFriendly === 'function') md.use(cjkFriendly);
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

    /** Return the link targets and images in a document, and whether math and diagrams are used (used to collect attachments on export). */
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
