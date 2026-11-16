// md.js（markdown-it の設定と拡張）の単体テスト
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer, core } from '../helpers/load.mjs';

const r = createRenderer();
const render = (src) => r.render(src);

describe('CommonMark / GFM（FR-201）', () => {
  test('見出し・強調・打ち消し線・インラインコード', () => {
    const html = render('# 題\n\n**太字** *斜体* ~~取消~~ `code`\n');
    assert.match(html, /<h1 id="題">題<\/h1>/);
    assert.ok(html.includes('<strong>太字</strong>'));
    assert.ok(html.includes('<em>斜体</em>'));
    assert.ok(html.includes('<s>取消</s>'));
    assert.ok(html.includes('<code>code</code>'));
  });

  test('表と列揃え', () => {
    const html = render('| 左 | 中央 | 右 |\n|:---|:---:|---:|\n| a | b | c |\n');
    assert.ok(html.includes('<table>'));
    assert.ok(html.includes('<th style="text-align:left">左</th>'));
    assert.ok(html.includes('<th style="text-align:center">中央</th>'));
    assert.ok(html.includes('<td style="text-align:right">c</td>'));
  });

  test('自動リンク: スキーム付き URL とメールのみ（README.md などはリンクにしない）', () => {
    const html = render('README.md と main.py と example.com と www.example.com、https://example.com/a?b=1 と foo@example.com\n');
    assert.ok(html.includes('<a href="https://example.com/a?b=1">https://example.com/a?b=1</a>'));
    assert.ok(html.includes('<a href="mailto:foo@example.com">foo@example.com</a>'));
    assert.equal((html.match(/<a /g) || []).length, 2);
  });

  test('改行: 単なる改行は改行にならない。行末の空白 2 つと \\ は改行になる', () => {
    assert.ok(!render('一行目\n二行目\n').includes('<br'));
    assert.ok(render('一行目  \n二行目\n').includes('<br'));
    assert.ok(render('一行目\\\n二行目\n').includes('<br'));
  });

  test('リンク・画像・参照式リンク', () => {
    const html = render('[文書](guide/a.md "題") ![図](img/a.png)\n\n[参照][ref]\n\n[ref]: ../b.md#x\n');
    assert.ok(html.includes('<a href="guide/a.md" title="題">文書</a>'));
    assert.ok(html.includes('<img src="img/a.png" alt="図">'));
    assert.ok(html.includes('<a href="../b.md#x">参照</a>'));
  });

  test('日本語のパスはパーセントエンコードして出力される', () => {
    const html = render('[導入](日本語/導入 手順.md)\n\n[導入2](<日本語/導入 手順.md>)\n');
    assert.ok(html.includes('href="%E6%97%A5%E6%9C%AC%E8%AA%9E/%E5%B0%8E%E5%85%A5%20%E6%89%8B%E9%A0%86.md"'));
  });

  test('生 HTML はそのまま出力する（除去はサニタイズ工程で行う）', () => {
    const html = render('<div align="center">生 <b>HTML</b></div>\n\n<!-- コメント -->\n\n<script>alert(1)</script>\n\n文中の <kbd>Ctrl</kbd>\n');
    assert.ok(html.includes('<div align="center">生 <b>HTML</b></div>'));
    assert.ok(html.includes('<!-- コメント -->'));
    assert.ok(html.includes('<script>alert(1)</script>'));
    assert.ok(html.includes('<kbd>Ctrl</kbd>'));
  });

  test('javascript: などの危険なリンクは markdown-it の段階でリンクにならない', () => {
    const html = render('[x](javascript:alert(1)) [y](vbscript:x) [z](data:text/html,x)\n');
    assert.ok(!html.includes('<a '));
  });
});

describe('脚注（FR-202）', () => {
  test('参照と定義', () => {
    const html = render('本文[^1]と[^note]。\n\n[^1]: 最初の脚注。\n[^note]: 名前付き。\n');
    assert.match(html, /<sup class="footnote-ref"><a href="#fn1" id="fnref1">\[1\]<\/a><\/sup>/);
    assert.ok(html.includes('<section class="footnotes">'));
    assert.match(html, /<li id="fn1" class="footnote-item">/);
    assert.ok(html.includes('href="#fnref1" class="footnote-backref"'));
    assert.ok(html.includes('名前付き。'));
  });
});

describe('見出し ID（FR-203）', () => {
  test('日本語・記号・インラインコード', () => {
    const html = render('# はじめに（概要）\n\n## `npm install` の実行\n\n### Hello World!\n');
    assert.ok(html.includes('<h1 id="はじめに概要">'));
    assert.ok(html.includes('<h2 id="npm-install-の実行">'));
    assert.ok(html.includes('<h3 id="hello-world">'));
  });

  test('重複する見出しには連番を付ける', () => {
    const html = render('## 概要\n\n## 概要\n\n## 概要\n');
    assert.deepEqual(html.match(/id="[^"]+"/g), ['id="概要"', 'id="概要-1"', 'id="概要-2"']);
  });

  test('レンダリングごとに連番はリセットされる', () => {
    assert.ok(render('## A\n').includes('id="a"'));
    assert.ok(render('## A\n').includes('id="a"'));
  });

  test('下線式の見出し・リンクを含む見出し', () => {
    const html = render('題名\n====\n\n## [リンク](x.md) 付き\n');
    assert.ok(html.includes('<h1 id="題名">'));
    assert.ok(html.includes('<h2 id="リンク-付き">'));
  });
});

describe('コード（FR-204）', () => {
  test('言語指定があればハイライトする', () => {
    const html = render('```js\nconst a = 1; // c\n```\n');
    assert.ok(html.includes('<pre><code class="language-js">'));
    assert.ok(html.includes('<span class="hljs-keyword">const</span>'));
    assert.ok(html.includes('<span class="hljs-comment">// c</span>'));
  });

  test('未対応の言語・言語指定なしはエスケープのみ', () => {
    const html = render('```nosuchlang\n<b> & "x"\n```\n\n```\n<i>\n```\n');
    assert.ok(html.includes('<pre><code class="language-nosuchlang">&lt;b&gt; &amp; &quot;x&quot;\n</code></pre>'));
    assert.ok(html.includes('<pre><code>&lt;i&gt;\n</code></pre>'));
  });

  test('インデントコード', () => {
    assert.ok(render('    <tag>\n').includes('<pre><code>&lt;tag&gt;\n</code></pre>'));
  });
});

describe('数式（FR-205）', () => {
  test('インライン $...$', () => {
    const html = render('質量とエネルギーは $E = mc^2$ の関係にある。\n');
    assert.ok(html.includes('<span class="math-inline">E = mc^2</span>'));
  });

  test('金額や変数名は数式にしない', () => {
    for (const src of ['価格は $5 と $10 です。', '$HOME と $PATH を設定する。', 'US$100 and A$200', 'コストは $ 5 $ ではない', '単独の $ 記号']) {
      assert.ok(!render(src + '\n').includes('math-'), src);
    }
  });

  test('\\$ はエスケープ、コード内は対象外', () => {
    assert.ok(!render('\\$x\\$ はそのまま\n').includes('math-'));
    assert.ok(render('\\$x\\$ はそのまま\n').includes('$x$'));
    assert.ok(!render('`$x$` と書く\n').includes('math-'));
    assert.ok(!render('```\n$x$\n```\n').includes('math-'));
  });

  test('数式の中身は HTML エスケープされる', () => {
    const html = render('$a < b \\& c > d$\n');
    assert.ok(html.includes('<span class="math-inline">a &lt; b \\&amp; c &gt; d</span>'));
  });

  test('エスケープされた \\$ を含むインライン数式', () => {
    assert.ok(render('$a \\$ b$\n').includes('<span class="math-inline">a \\$ b</span>'));
  });

  test('ディスプレイ $$...$$（複数行・1 行）', () => {
    const multi = render('前の段落\n\n$$\n\\int_0^1 x^2 dx\n= \\frac{1}{3}\n$$\n\n後の段落\n');
    assert.ok(multi.includes('<div class="math-display">\\int_0^1 x^2 dx\n= \\frac{1}{3}</div>'));
    assert.ok(multi.includes('<p>前の段落</p>'));
    assert.ok(multi.includes('<p>後の段落</p>'));
    assert.ok(render('$$ a + b $$\n').includes('<div class="math-display"> a + b </div>'));
    assert.ok(render('$$a$$\n').includes('<div class="math-display">a</div>'));
  });

  test('段落の途中の $$...$$ はインラインのディスプレイ数式', () => {
    const html = render('ここで $$x^2$$ と続く。\n');
    assert.ok(html.includes('<span class="math-inline math-inline-display">x^2</span>'));
    const html2 = render('$$a$$ と $$b$$ の和\n\n次の段落\n');
    assert.equal((html2.match(/math-inline-display/g) || []).length, 2);
    assert.ok(html2.includes('<p>次の段落</p>'));
  });

  test('閉じのない $$ は文書を飲み込まない', () => {
    const html = render('$$\n閉じていない\n\n# 見出し\n\n本文\n');
    assert.ok(!html.includes('math-display'));
    assert.ok(html.includes('<h1 id="見出し">'));
    assert.ok(html.includes('<p>本文</p>'));
  });

  test('```math ブロック', () => {
    const html = render('```math\na^2 + b^2 = c^2\n```\n');
    assert.ok(html.includes('<div class="math-display">a^2 + b^2 = c^2\n</div>'));
  });

  test('リスト・引用の中の数式', () => {
    assert.ok(render('- 項目 $x$\n- $$y$$\n').includes('<span class="math-inline">x</span>'));
    assert.ok(render('> $$\n> a\n> $$\n').includes('<div class="math-display">a</div>'));
  });
});

describe('Mermaid（FR-206）', () => {
  test('```mermaid は専用の要素にし、中身はエスケープする', () => {
    const html = render('```mermaid\ngraph TD; A-->B; B-->|<b>x</b>|C;\n```\n');
    assert.ok(html.includes('<pre class="mermaid-src"><code>graph TD; A--&gt;B; B--&gt;|&lt;b&gt;x&lt;/b&gt;|C;\n</code></pre>'));
    assert.ok(!html.includes('hljs'));
  });

  test('言語名の大文字小文字・属性つき', () => {
    assert.ok(render('```Mermaid\ngraph TD\n```\n').includes('mermaid-src'));
    assert.ok(render('``` mermaid {theme: x}\ngraph TD\n```\n').includes('mermaid-src'));
    assert.ok(!render('```mermaidx\ngraph TD\n```\n').includes('mermaid-src'));
  });
});

describe('タスクリスト（FR-201）', () => {
  test('チェックボックスに変換し、クラスを付ける', () => {
    const html = render('- [ ] 未完了\n- [x] 完了\n- [X] 大文字\n- 通常\n');
    assert.ok(html.includes('<ul class="contains-task-list">'));
    assert.ok(html.includes('<li class="task-list-item"><input type="checkbox" disabled> 未完了</li>'));
    assert.ok(html.includes('<li class="task-list-item"><input type="checkbox" disabled checked> 完了</li>'));
    assert.ok(html.includes('<input type="checkbox" disabled checked> 大文字'));
    assert.ok(html.includes('<li>通常</li>'));
    assert.equal((html.match(/contains-task-list/g) || []).length, 1);
  });

  test('入れ子・番号付き・装飾つき', () => {
    const html = render('1. [ ] 親\n   - [x] **子**\n');
    assert.ok(html.includes('<ol class="contains-task-list">'));
    assert.ok(html.includes('<ul class="contains-task-list">'));
    assert.ok(html.includes('<input type="checkbox" disabled checked> <strong>子</strong>'));
  });

  test('リスト以外の [ ] は変換しない', () => {
    assert.ok(!render('[ ] 段落の先頭\n').includes('<input'));
    assert.ok(!render('- 文中の [x] は対象外\n').includes('<input'));
    assert.ok(!render('- [ ]空白なし\n').includes('<input'));
  });
});

describe('アラート（FR-207）', () => {
  test('5 種類', () => {
    for (const [mark, type, label] of [['NOTE', 'note', 'Note'], ['TIP', 'tip', 'Tip'], ['IMPORTANT', 'important', 'Important'], ['WARNING', 'warning', 'Warning'], ['CAUTION', 'caution', 'Caution']]) {
      const html = render(`> [!${mark}]\n> 本文です。\n`);
      assert.ok(html.includes(`<div class="markdown-alert markdown-alert-${type}">`), mark);
      assert.ok(html.includes(`<p class="markdown-alert-title">${label}</p>`), mark);
      assert.ok(html.includes('<p>本文です。</p>'), mark);
      assert.ok(html.trimEnd().endsWith('</div>'), mark);
      assert.ok(!html.includes('[!'), mark);
      assert.ok(!html.includes('blockquote'), mark);
    }
  });

  test('小文字・マーカーだけの段落・複数段落', () => {
    assert.ok(render('> [!note]\n> x\n').includes('markdown-alert-note'));
    const html = render('> [!WARNING]\n>\n> 1 段落目\n>\n> 2 段落目\n');
    assert.ok(html.includes('markdown-alert-warning'));
    assert.ok(html.includes('<p>1 段落目</p>'));
    assert.ok(html.includes('<p>2 段落目</p>'));
    assert.ok(!html.includes('<p></p>'));
  });

  test('見出しの文言を差し替えられる（UI 言語に追従）', () => {
    const ja = createRenderer({ alertLabels: () => ({ note: '補足', tip: 'ヒント', important: '重要', warning: '警告', caution: '注意' }) });
    assert.ok(ja.render('> [!NOTE]\n> x\n').includes('<p class="markdown-alert-title">補足</p>'));
    assert.ok(ja.render('> [!CAUTION]\n> x\n').includes('<p class="markdown-alert-title">注意</p>'));
  });

  test('対象外: 未知の種別・同じ行に本文がある・通常の引用', () => {
    assert.ok(render('> [!UNKNOWN]\n> x\n').includes('<blockquote>'));
    assert.ok(render('> [!NOTE] 同じ行\n').includes('<blockquote>'));
    assert.ok(render('> 普通の引用\n').includes('<blockquote>'));
    assert.ok(!render('> 普通の引用\n').includes('markdown-alert'));
  });

  test('アラートの後ろの内容は影響を受けない', () => {
    const html = render('> [!TIP]\n> a\n\n後ろの段落\n\n> 普通の引用\n');
    assert.ok(html.includes('<p>後ろの段落</p>'));
    assert.ok(html.includes('<blockquote>\n<p>普通の引用</p>\n</blockquote>'));
  });
});

describe('参照の抽出（FR-602, FR-603）', () => {
  test('Markdown 記法のリンク・画像・参照式', () => {
    const refs = r.collectRefs('[a](guide/a.md) ![図](img/x.png) [外部](https://example.com)\n\n[参照][r] ![参照図][i]\n\n[r]: ../b.pdf\n[i]: img/y.svg "t"\n');
    assert.deepEqual(refs.links, ['guide/a.md', 'https://example.com', '../b.pdf']);
    assert.deepEqual(refs.images, ['img/x.png', 'img/y.svg']);
    assert.equal(refs.hasMath, false);
    assert.equal(refs.hasMermaid, false);
  });

  test('生 HTML の src / href / poster', () => {
    const refs = r.collectRefs('<img src="img/a.png" alt="">\n\n<video src=\'v/b.mp4\' poster=p/c.jpg controls></video>\n\n文中 <a href="d.zip">zip</a> と <img src="e.png?x=1&amp;y=2">\n');
    assert.deepEqual(refs.links, ['d.zip']);
    assert.deepEqual(refs.images, ['img/a.png', 'v/b.mp4', 'p/c.jpg', 'e.png?x=1&y=2']);
  });

  test('数式・図の利用を検出する', () => {
    assert.equal(r.collectRefs('文中の $x$\n').hasMath, true);
    assert.equal(r.collectRefs('$$\nx\n$$\n').hasMath, true);
    assert.equal(r.collectRefs('```math\nx\n```\n').hasMath, true);
    assert.equal(r.collectRefs('```mermaid\ngraph TD\n```\n').hasMermaid, true);
    assert.equal(r.collectRefs('- 項目\n  ```mermaid\n  graph TD\n  ```\n').hasMermaid, true);
    assert.equal(r.collectRefs('<span class="math-inline">x</span>\n').hasMath, true);
    assert.equal(r.collectRefs('<pre class="mermaid-src">graph TD</pre>\n').hasMermaid, true);
    const none = r.collectRefs('価格は $5 と $10。`$x$` と ```` ```mermaid ```` の説明。\n\n```js\nmermaid.render()\n```\n');
    assert.equal(none.hasMath, false);
    assert.equal(none.hasMermaid, false);
  });

  test('脚注やリストの中のリンクも拾う', () => {
    const refs = r.collectRefs('本文[^1]\n\n- [項目](list.md)\n\n> ![引用内](q.png)\n\n[^1]: [脚注内](fn.md)\n');
    assert.ok(refs.links.includes('list.md'));
    assert.ok(refs.links.includes('fn.md'));
    assert.ok(refs.images.includes('q.png'));
  });
});

describe('その他', () => {
  test('markdown-it が読み込まれていなければ分かりやすい例外', async () => {
    const { mdx } = await import('../helpers/load.mjs');
    const saved = globalThis.markdownit;
    delete globalThis.markdownit;
    try {
      assert.throws(() => mdx.createRenderer({}), /markdown-it/);
    } finally {
      if (saved) globalThis.markdownit = saved;
    }
  });

  test('空文字・巨大な入力でも例外にならない', () => {
    assert.equal(render(''), '');
    const big = ('# 見出し\n\n本文 $x$ と `code`。\n\n- [ ] 項目\n\n').repeat(2000);
    const t0 = Date.now();
    const html = render(big);
    assert.ok(html.length > big.length);
    assert.ok(Date.now() - t0 < 5000, 'レンダリングが 5 秒以内');
  });

  test('見出し ID は core.createSlugger と同じ規則', () => {
    const slug = core.createSlugger();
    const html = render('## A & B\n\n## A & B\n');
    assert.ok(html.includes(`id="${slug('A & B')}"`));
    assert.ok(html.includes(`id="${slug('A & B')}"`));
  });
});
