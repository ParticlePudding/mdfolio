// core.js の単体テスト
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { core } from '../helpers/load.mjs';

describe('パス', () => {
  test('normalizePath: 区切りの統一と . / .. の解決', () => {
    assert.equal(core.normalizePath('a/b/c.md'), 'a/b/c.md');
    assert.equal(core.normalizePath('./a//b/./c.md'), 'a/b/c.md');
    assert.equal(core.normalizePath('a/b/../c.md'), 'a/c.md');
    assert.equal(core.normalizePath('a\\b\\c.md'), 'a/b/c.md');
    assert.equal(core.normalizePath('/a/b/'), 'a/b');
    assert.equal(core.normalizePath(''), '');
  });

  test('normalizePath: ルートより上に出る場合は null', () => {
    assert.equal(core.normalizePath('../a.md'), null);
    assert.equal(core.normalizePath('a/../../b.md'), null);
    assert.equal(core.normalizePath(null), null);
  });

  test('normalizePath: NFC に正規化する（macOS 由来の NFD ファイル名）', () => {
    const nfd = 'ガイド.md'.normalize('NFD');
    assert.notEqual(nfd, 'ガイド.md');
    assert.equal(core.normalizePath(nfd), 'ガイド.md');
  });

  test('dirname / basename / extname', () => {
    assert.equal(core.dirname('a/b/c.md'), 'a/b');
    assert.equal(core.dirname('c.md'), '');
    assert.equal(core.basename('a/b/c.md'), 'c.md');
    assert.equal(core.extname('a/b/c.MD'), 'md');
    assert.equal(core.extname('a/b/noext'), '');
    assert.equal(core.extname('.gitignore'), '');
    assert.equal(core.extname('archive.tar.gz'), 'gz');
  });

  test('isDocPath: 対象の拡張子（FR-105）', () => {
    for (const ext of ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdwn', 'mdtxt', 'mdtext', 'MD', 'Markdown']) {
      assert.equal(core.isDocPath('a.' + ext), true, ext);
    }
    for (const name of ['a.txt', 'a.md.bak', 'md', 'a.mdx', 'a.html']) {
      assert.equal(core.isDocPath(name), false, name);
    }
    assert.equal(core.stripDocExt('導入.md'), '導入');
    assert.equal(core.stripDocExt('a.markdown'), 'a');
    assert.equal(core.stripDocExt('a.txt'), 'a.txt');
  });

  test('isIgnoredPath: . で始まる要素と node_modules（FR-106）', () => {
    assert.equal(core.isIgnoredPath('.git/config'), true);
    assert.equal(core.isIgnoredPath('a/.hidden/b.md'), true);
    assert.equal(core.isIgnoredPath('a/.b.md'), true);
    assert.equal(core.isIgnoredPath('node_modules/x/readme.md'), true);
    assert.equal(core.isIgnoredPath('a/node_modules/x.md'), true);
    assert.equal(core.isIgnoredPath('a/b.md'), false);
    assert.equal(core.isIgnoredPath('a/node_modules_backup/x.md'), false);
    assert.equal(core.isIgnoredName('.git'), true);
    assert.equal(core.isIgnoredName('docs'), false);
  });

  test('resolveRelative: 文書のフォルダ基準・ルート基準', () => {
    assert.equal(core.resolveRelative('guide/intro.md', 'setup.md'), 'guide/setup.md');
    assert.equal(core.resolveRelative('guide/intro.md', './img/a.png'), 'guide/img/a.png');
    assert.equal(core.resolveRelative('guide/intro.md', '../README.md'), 'README.md');
    assert.equal(core.resolveRelative('guide/intro.md', '/img/a.png'), 'img/a.png');
    assert.equal(core.resolveRelative('intro.md', 'a.md'), 'a.md');
    assert.equal(core.resolveRelative('guide/intro.md', '..\\img\\a.png'), 'img/a.png');
    assert.equal(core.resolveRelative('intro.md', '../a.md'), null);
  });
});

describe('リンク解決（仕様 5.3）', () => {
  const index = core.createIndex([
    { path: 'README.md', kind: 'doc' },
    { path: 'guide/intro.md', kind: 'doc' },
    { path: 'guide/Setup.md', kind: 'doc' },
    { path: 'guide/README.md', kind: 'doc' },
    { path: 'guide/img/図 1.png', kind: 'asset' },
    { path: 'ref/index.markdown', kind: 'doc' },
    { path: 'ref/api.md', kind: 'doc' },
    { path: '日本語/導入.md', kind: 'doc' },
    { path: 'notes.v1.md', kind: 'doc' },
    { path: 'data/table.csv', kind: 'asset' }
  ]);

  test('classifyHref', () => {
    assert.equal(core.classifyHref('#a'), 'fragment');
    assert.equal(core.classifyHref('https://example.com/'), 'external');
    assert.equal(core.classifyHref('mailto:a@example.com'), 'external');
    assert.equal(core.classifyHref('//example.com/a.png'), 'external');
    assert.equal(core.classifyHref('data:image/png;base64,AAAA'), 'external');
    assert.equal(core.classifyHref('a/b.md'), 'relative');
    assert.equal(core.classifyHref('../b.md#x'), 'relative');
    assert.equal(core.classifyHref(''), 'empty');
    assert.equal(core.classifyHref('   '), 'empty');
    assert.equal(core.classifyHref(null), 'empty');
  });

  test('文書へのリンク: 完全一致・相対・フラグメント', () => {
    assert.deepEqual(core.resolveLink(index, 'README.md', 'guide/intro.md'), { type: 'doc', path: 'guide/intro.md', fragment: '' });
    assert.deepEqual(core.resolveLink(index, 'guide/intro.md', '../README.md#top'), { type: 'doc', path: 'README.md', fragment: 'top' });
    assert.deepEqual(core.resolveLink(index, 'guide/intro.md', '/ref/api.md'), { type: 'doc', path: 'ref/api.md', fragment: '' });
    assert.deepEqual(core.resolveLink(index, 'guide/intro.md', 'Setup.md?x=1#y'), { type: 'doc', path: 'guide/Setup.md', fragment: 'y' });
  });

  test('大文字小文字を無視して一致する（Windows で書かれた文書）', () => {
    assert.equal(core.resolveLink(index, 'guide/intro.md', 'setup.md').path, 'guide/Setup.md');
    assert.equal(core.resolveLink(index, 'README.md', 'GUIDE/INTRO.MD').path, 'guide/intro.md');
  });

  test('拡張子の補完と .html の読み替え', () => {
    assert.equal(core.resolveLink(index, 'README.md', 'guide/intro').path, 'guide/intro.md');
    assert.equal(core.resolveLink(index, 'README.md', 'notes.v1').path, 'notes.v1.md');
    assert.equal(core.resolveLink(index, 'README.md', 'guide/intro.html').path, 'guide/intro.md');
    assert.equal(core.resolveLink(index, 'README.md', 'guide/intro.htm#a').path, 'guide/intro.md');
  });

  test('フォルダへのリンクは README / index に解決する', () => {
    assert.equal(core.resolveLink(index, 'README.md', 'guide/').path, 'guide/README.md');
    assert.equal(core.resolveLink(index, 'README.md', 'guide').path, 'guide/README.md');
    assert.equal(core.resolveLink(index, 'README.md', 'ref/').path, 'ref/index.markdown');
    assert.equal(core.resolveLink(index, 'guide/intro.md', '/').path, 'README.md');
    assert.equal(core.resolveLink(index, 'guide/intro.md', '..').path, 'README.md');
  });

  test('パーセントエンコード・日本語・空白・バックスラッシュ', () => {
    assert.equal(core.resolveLink(index, 'README.md', '%E6%97%A5%E6%9C%AC%E8%AA%9E/%E5%B0%8E%E5%85%A5.md').path, '日本語/導入.md');
    assert.equal(core.resolveLink(index, 'README.md', '日本語/導入.md').path, '日本語/導入.md');
    assert.deepEqual(core.resolveLink(index, 'guide/intro.md', 'img/%E5%9B%B3%201.png'), { type: 'asset', path: 'guide/img/図 1.png', fragment: '' });
    assert.equal(core.resolveLink(index, 'guide/intro.md', 'img\\図 1.png').path, 'guide/img/図 1.png');
    assert.equal(core.resolveLink(index, 'README.md', '日本語/導入.md#%E6%A6%82%E8%A6%81').fragment, '概要');
  });

  test('NFD で書かれたリンクも NFC のファイルに一致する', () => {
    const idx = core.createIndex([{ path: core.normalizePath('ガイド.md'), kind: 'doc' }]);
    assert.equal(core.resolveLink(idx, 'README.md', 'ガイド.md'.normalize('NFD')).type, 'doc');
  });

  test('添付・外部・フラグメント・空', () => {
    assert.deepEqual(core.resolveLink(index, 'README.md', 'data/table.csv'), { type: 'asset', path: 'data/table.csv', fragment: '' });
    assert.deepEqual(core.resolveLink(index, 'README.md', 'https://example.com/a?b#c'), { type: 'external', href: 'https://example.com/a?b#c' });
    assert.deepEqual(core.resolveLink(index, 'README.md', '#%E6%A6%82%E8%A6%81'), { type: 'fragment', fragment: '概要' });
    assert.deepEqual(core.resolveLink(index, 'README.md', '?q=1#sec'), { type: 'fragment', fragment: 'sec' });
    assert.deepEqual(core.resolveLink(index, 'README.md', ''), { type: 'empty' });
  });

  test('解決できないリンク', () => {
    assert.deepEqual(core.resolveLink(index, 'README.md', 'nothing.md#x'), { type: 'missing', path: 'nothing.md', raw: 'nothing.md', fragment: 'x' });
    assert.deepEqual(core.resolveLink(index, 'README.md', '../outside.md'), { type: 'missing', path: null, raw: '../outside.md', fragment: '' });
    assert.equal(core.resolveLink(index, 'README.md', 'guide/img/none.png').type, 'missing');
  });

  test('不正なパーセントエンコードでも例外にならない', () => {
    assert.equal(core.safeDecode('100%'), '100%');
    assert.equal(core.safeDecode('%E3%81%82%ZZ'), 'あ%ZZ');
    assert.equal(core.resolveLink(index, 'README.md', '100%.md').type, 'missing');
  });
});

describe('ルート（仕様 5.2）', () => {
  test('buildRoute: 要素ごとにエンコードする', () => {
    assert.equal(core.buildRoute('guide/intro.md'), '#/guide/intro.md');
    assert.equal(core.buildRoute('guide/導入.md'), '#/guide/%E5%B0%8E%E5%85%A5.md');
    assert.equal(core.buildRoute('a b/c#d.md', '見出し 1'), '#/a%20b/c%23d.md#%E8%A6%8B%E5%87%BA%E3%81%97%201');
    assert.equal(core.buildRoute(''), '#/');
  });

  test('parseRoute: 種別の判定', () => {
    assert.deepEqual(core.parseRoute(''), { type: 'home' });
    assert.deepEqual(core.parseRoute('#'), { type: 'home' });
    assert.deepEqual(core.parseRoute('#/'), { type: 'home' });
    assert.deepEqual(core.parseRoute('#!help'), { type: 'help', fragment: '' });
    assert.deepEqual(core.parseRoute('#!help#usage'), { type: 'help', fragment: 'usage' });
    assert.deepEqual(core.parseRoute('#!unknown'), { type: 'home' });
    assert.deepEqual(core.parseRoute('#section'), { type: 'fragment', fragment: 'section' });
    assert.deepEqual(core.parseRoute('#/guide/intro.md'), { type: 'doc', path: 'guide/intro.md', fragment: '' });
    assert.deepEqual(core.parseRoute('#/guide/intro.md#setup'), { type: 'doc', path: 'guide/intro.md', fragment: 'setup' });
  });

  test('buildRoute → parseRoute の往復（日本語・空白・# ・%）', () => {
    const cases = [
      ['guide/intro.md', ''],
      ['日本語 フォルダ/導入 手順.md', '概要'],
      ['a#b/c%20d.md', 'x y'],
      ['100%/50%.md', '100%'],
      ['深い/階層/の/文書.md', 'セクション-1']
    ];
    for (const [p, f] of cases) {
      assert.deepEqual(core.parseRoute(core.buildRoute(p, f)), { type: 'doc', path: p, fragment: f });
    }
  });

  test('parseRoute: エンコードされていないハッシュ（手入力）も解釈する', () => {
    assert.deepEqual(core.parseRoute('#/日本語/導入.md#概要'), { type: 'doc', path: '日本語/導入.md', fragment: '概要' });
    assert.deepEqual(core.parseRoute('#/a/../b.md'), { type: 'doc', path: 'b.md', fragment: '' });
    assert.equal(core.parseRoute('#/../x.md').type, 'home');
  });

  test('buildHelpRoute', () => {
    assert.equal(core.buildHelpRoute(), '#!help');
    assert.equal(core.buildHelpRoute('使い方'), '#!help#%E4%BD%BF%E3%81%84%E6%96%B9');
  });
});

describe('見出し ID（FR-203）', () => {
  test('slugify: 小文字化・記号除去・空白をハイフン化・日本語は保持', () => {
    assert.equal(core.slugify('Hello World'), 'hello-world');
    assert.equal(core.slugify('  Getting Started!  '), 'getting-started');
    assert.equal(core.slugify('概要と目的'), '概要と目的');
    assert.equal(core.slugify('1. はじめに（概要）'), '1-はじめに概要');
    assert.equal(core.slugify('foo_bar-baz'), 'foo_bar-baz');
    assert.equal(core.slugify('C++ / C#'), 'c--c');
    assert.equal(core.slugify('API v2.0'), 'api-v20');
    assert.equal(core.slugify('!!!'), '');
  });

  test('createSlugger: 重複には -1, -2 を付ける', () => {
    const slug = core.createSlugger();
    assert.equal(slug('概要'), '概要');
    assert.equal(slug('概要'), '概要-1');
    assert.equal(slug('概要'), '概要-2');
    assert.equal(slug('Other'), 'other');
    assert.equal(slug('概要-1'), '概要-1-1');
    assert.equal(slug('!!!'), 'section');
    assert.equal(slug('???'), 'section-1');
  });

  test('createSlugger: インスタンスごとに独立している', () => {
    const a = core.createSlugger();
    const b = core.createSlugger();
    assert.equal(a('x'), 'x');
    assert.equal(b('x'), 'x');
  });
});

describe('フロントマター（FR-208）', () => {
  test('title を取り出し、本文から取り除く', () => {
    const r = core.parseFrontMatter('---\ntitle: 導入ガイド\ntags: [a, b]\n---\n# 本文\n');
    assert.equal(r.has, true);
    assert.equal(r.data.title, '導入ガイド');
    assert.equal(r.body, '# 本文\n');
  });

  test('引用符・コメント・CRLF・BOM', () => {
    assert.equal(core.parseFrontMatter('---\ntitle: "A: B"\n---\nx').data.title, 'A: B');
    assert.equal(core.parseFrontMatter("---\ntitle: 'q'\n---\nx").data.title, 'q');
    assert.equal(core.parseFrontMatter('---\ntitle: T # comment\n---\nx').data.title, 'T');
    const crlf = core.parseFrontMatter('---\r\ntitle: T\r\n---\r\nbody\r\n');
    assert.equal(crlf.data.title, 'T');
    assert.equal(crlf.body, 'body\r\n');
    assert.equal(core.parseFrontMatter('\uFEFF---\ntitle: T\n---\nx').data.title, 'T');
  });

  test('入れ子・リスト・ブロックスカラーは無視して title だけ使う', () => {
    const r = core.parseFrontMatter('---\nmeta:\n  a: 1\nlist:\n  - x\n  - y\ndesc: |\n  long\ntitle: T\n---\nbody');
    assert.equal(r.has, true);
    assert.equal(r.data.title, 'T');
    assert.equal(r.data.desc, undefined);
    assert.equal(r.body, 'body');
  });

  test('閉じがない・YAML らしくない場合はフロントマターとみなさない', () => {
    const noClose = '---\ntitle: T\n本文が続く';
    assert.equal(core.parseFrontMatter(noClose).has, false);
    assert.equal(core.parseFrontMatter(noClose).body, noClose);
    const hr = '---\nこれは水平線のあとの段落です。\n\n---\n次の節';
    assert.equal(core.parseFrontMatter(hr).has, false);
    assert.equal(core.parseFrontMatter('# 見出し\n---\n').has, false);
    assert.equal(core.parseFrontMatter('').has, false);
  });

  test('本文が空のフロントマター', () => {
    const r = core.parseFrontMatter('---\ntitle: T\n---');
    assert.equal(r.has, true);
    assert.equal(r.body, '');
  });
});

describe('文字コード判定（FR-107）', () => {
  const enc = new TextEncoder();
  test('UTF-8（BOM なし・あり）', () => {
    assert.deepEqual(core.detectAndDecode(enc.encode('日本語 abc')), { text: '日本語 abc', encoding: 'utf-8' });
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF, ...enc.encode('日本語')]);
    assert.deepEqual(core.detectAndDecode(bom), { text: '日本語', encoding: 'utf-8' });
  });

  test('UTF-16（BOM 付き LE / BE）', () => {
    assert.deepEqual(core.detectAndDecode(new Uint8Array([0xFF, 0xFE, 0x42, 0x30, 0x41, 0x00])), { text: 'あA', encoding: 'utf-16le' });
    assert.deepEqual(core.detectAndDecode(new Uint8Array([0xFE, 0xFF, 0x30, 0x42, 0x00, 0x41])), { text: 'あA', encoding: 'utf-16be' });
  });

  test('Shift_JIS', () => {
    // 「日本語のテスト」
    const sjis = new Uint8Array([0x93, 0xFA, 0x96, 0x7B, 0x8C, 0xEA, 0x82, 0xCC, 0x83, 0x65, 0x83, 0x58, 0x83, 0x67]);
    assert.deepEqual(core.detectAndDecode(sjis), { text: '日本語のテスト', encoding: 'shift_jis' });
  });

  test('ASCII のみ・空・ArrayBuffer 入力', () => {
    assert.deepEqual(core.detectAndDecode(enc.encode('# plain')), { text: '# plain', encoding: 'utf-8' });
    assert.deepEqual(core.detectAndDecode(new Uint8Array(0)), { text: '', encoding: 'utf-8' });
    assert.equal(core.detectAndDecode(enc.encode('abc').buffer).text, 'abc');
  });

  test('どれにも当てはまらない場合は置換文字入りで返す（例外にしない）', () => {
    const r = core.detectAndDecode(new Uint8Array([0x41, 0xFF, 0xFF, 0x42]));
    assert.equal(r.encoding, 'unknown');
    assert.ok(r.text.startsWith('A'));
    assert.ok(r.text.includes('\uFFFD'));
  });
});

describe('見出し・本文テキストの抽出', () => {
  test('extractHeadings: ATX・下線式・記号の除去', () => {
    const src = [
      '# タイトル **強調** と `code`',
      '',
      '本文',
      '',
      '## 節 [リンク](x.md) ##',
      '',
      '下線式の見出し',
      '==============',
      '',
      '下線式 2',
      '---',
      '',
      '#タグではない',
      '    # インデントされたコード'
    ].join('\n');
    assert.deepEqual(core.extractHeadings(src), [
      { level: 1, text: 'タイトル 強調 と code' },
      { level: 2, text: '節 リンク' },
      { level: 1, text: '下線式の見出し' },
      { level: 2, text: '下線式 2' }
    ]);
  });

  test('extractHeadings: フェンスコード内の # は見出しにしない', () => {
    const src = '# A\n\n```bash\n# コメント\necho 1\n```\n\n~~~\n# これもコード\n~~~\n\n## B\n';
    assert.deepEqual(core.extractHeadings(src).map((h) => h.text), ['A', 'B']);
  });

  test('extractHeadings: リストや表の直後の --- は見出しにしない', () => {
    assert.deepEqual(core.extractHeadings('- item\n---\n'), []);
    assert.deepEqual(core.extractHeadings('| a | b |\n|---|---|\n'), []);
    assert.deepEqual(core.extractHeadings('\n---\n'), []);
  });

  test('toPlainText: 記法記号を取り除き、コードは残す', () => {
    const src = [
      '# 見出し',
      '',
      '> [!NOTE]',
      '> 引用の **本文**',
      '',
      '- [x] 完了した項目',
      '1. 番号付き [リンク](a.md)',
      '',
      '| 列A | 列B |',
      '|---|:--:|',
      '| 値1 | 値2 |',
      '',
      '![代替テキスト](img/a.png)',
      '',
      '```js',
      'const answer = 42;',
      '```',
      '',
      '[ref]: https://example.com',
      '<span style="color:red">赤</span> &amp; 終わり'
    ].join('\n');
    const plain = core.toPlainText(src);
    for (const s of ['見出し', '引用の 本文', '完了した項目', '番号付き リンク', '列A 列B', '値1 値2', '代替テキスト', 'const answer = 42;', '赤 & 終わり']) {
      assert.ok(plain.includes(s), `含まれるはず: ${s}\n---\n${plain}`);
    }
    for (const s of ['**', '```', '|', 'a.md', 'img/a.png', '[!NOTE]', 'example.com', '<span', '- [x]']) {
      assert.ok(!plain.includes(s), `含まれないはず: ${s}\n---\n${plain}`);
    }
  });

  test('toPlainText: snake_case と数式は壊さない', () => {
    const plain = core.toPlainText('変数 user_name と file_path_x、数式 $a_1 + b_2$');
    assert.ok(plain.includes('user_name'));
    assert.ok(plain.includes('file_path_x'));
  });

  test('analyzeDoc: タイトルの優先順位（フロントマター → 最初の H1 → 代替）', () => {
    assert.equal(core.analyzeDoc('---\ntitle: FM\n---\n# H1\n', 'file').title, 'FM');
    assert.equal(core.analyzeDoc('## 小見出し\n\n# 最初のH1\n\n# 2つ目\n', 'file').title, '最初のH1');
    assert.equal(core.analyzeDoc('本文だけ\n', 'file').title, 'file');
    assert.equal(core.analyzeDoc('本文だけ\n', 'file').hasOwnTitle, false);
    assert.equal(core.analyzeDoc('# T\n', 'file').hasOwnTitle, true);
  });

  test('analyzeDoc: フロントマターは検索用テキストに含めない', () => {
    const a = core.analyzeDoc('---\ntitle: T\nsecret: xyz123\n---\n本文\n', 'f');
    assert.ok(!a.plain.includes('xyz123'));
    assert.ok(a.plain.includes('本文'));
  });
});

describe('検索（FR-401〜403）', () => {
  test('fold: 大文字小文字・全角半角を区別しない', () => {
    assert.equal(core.fold('ABC abc'), 'abc abc');
    assert.equal(core.fold('ＡＢＣ１２３'), 'abc123');
    assert.equal(core.fold('ｶﾞｲﾄﾞ'), 'ガイド');
    assert.equal(core.fold('ガイド'), 'ガイド');
    assert.equal(core.fold('ガイド'.normalize('NFD')), 'ガイド');
    assert.equal(core.fold('全角　空白'), '全角 空白');
    assert.equal(core.fold('Ｍａｒｋｄｏｗｎ文書'), 'markdown文書');
    assert.equal(core.fold(''), '');
  });

  test('fold: ネイティブの NFKC ＋小文字化と一致する（日本語の一般的な文）', () => {
    const samples = [
      'Markdown ビューアの「使い方」を説明します。Version 1.0（2026年）',
      'ｱｲｳｴｵ ﾊﾟﾋﾟﾌﾟ ＡＢＣ ㈱ ① ㎏ ｶﾞｷﾞｸﾞ',
      'Ünïcödé Ça va? ÀÉÎ 😀 𠮷野家',
      'tab\tnewline\nCRLF\r\n'
    ];
    for (const s of samples) {
      assert.equal(core.fold(s), s.normalize('NFKC').toLowerCase(), s);
    }
  });

  test('foldWithMap: たたんだ位置から元の位置へ対応づけられる', () => {
    const src = 'ＡＢ㎏ｶﾞx';
    const f = core.foldWithMap(src);
    assert.equal(f.text, 'abkgガx');
    assert.deepEqual(Array.from(f.map.subarray(0, f.text.length + 1)), [0, 1, 2, 2, 3, 5, 6]);
  });

  test('tokenizeQuery: 空白（全角含む）で分割し、重複を除く', () => {
    assert.deepEqual(core.tokenizeQuery('  Foo　ＢＡＲ foo  '), ['foo', 'bar']);
    assert.deepEqual(core.tokenizeQuery(''), []);
    assert.deepEqual(core.tokenizeQuery('   '), []);
    assert.deepEqual(core.tokenizeQuery(null), []);
  });

  const docs = [
    ['guide/install.md', '# インストール手順\n\nWindows に Markdown ビューアをインストールします。設定は不要です。'],
    ['guide/config.md', '# 設定\n\n## テーマの設定\n\n設定ファイルで Theme を変更できます。インストール後に行います。設定 設定 設定'],
    ['README.md', '# はじめに\n\nこの文書セットの概要です。'],
    ['ref/api.md', '# API リファレンス\n\n```js\nconst viewer = createViewer();\n```\n']
  ].map(([p, text]) => core.makeSearchEntry(p, core.analyzeDoc(text, p)));

  test('searchDocs: AND 条件', () => {
    const r = core.searchDocs(docs, core.tokenizeQuery('インストール 設定'), 50);
    assert.deepEqual(r.results.map((x) => x.path).sort(), ['guide/config.md', 'guide/install.md']);
    assert.equal(r.total, 2);
    assert.equal(core.searchDocs(docs, core.tokenizeQuery('インストール 存在しない語'), 50).total, 0);
  });

  test('searchDocs: タイトル一致を本文一致より優先する', () => {
    const r = core.searchDocs(docs, core.tokenizeQuery('インストール'), 50);
    assert.equal(r.results[0].path, 'guide/install.md');
    const r2 = core.searchDocs(docs, core.tokenizeQuery('設定'), 50);
    assert.equal(r2.results[0].path, 'guide/config.md');
  });

  test('searchDocs: 全角半角・大文字小文字を区別しない', () => {
    assert.equal(core.searchDocs(docs, core.tokenizeQuery('ｍａｒｋｄｏｗｎ'), 50).results[0].path, 'guide/install.md');
    assert.equal(core.searchDocs(docs, core.tokenizeQuery('THEME'), 50).results[0].path, 'guide/config.md');
    assert.equal(core.searchDocs(docs, core.tokenizeQuery('ﾋﾞｭｰｱ'), 50).results[0].path, 'guide/install.md');
  });

  test('searchDocs: パス・コード内の語も対象', () => {
    assert.equal(core.searchDocs(docs, core.tokenizeQuery('api.md'), 50).results[0].path, 'ref/api.md');
    assert.equal(core.searchDocs(docs, core.tokenizeQuery('createviewer'), 50).results[0].path, 'ref/api.md');
  });

  test('searchDocs: 上限と総数、空の検索語', () => {
    const many = [];
    for (let i = 0; i < 120; i++) many.push(core.makeSearchEntry(`d/${i}.md`, core.analyzeDoc('共通の語 ' + i, String(i))));
    const r = core.searchDocs(many, core.tokenizeQuery('共通'), 50);
    assert.equal(r.total, 120);
    assert.equal(r.results.length, 50);
    assert.deepEqual(core.searchDocs(many, [], 50), { total: 0, results: [] });
  });

  test('findRanges: 元の文字列の位置で返す・重なりは結合する', () => {
    const text = 'Ｍａｒｋｄｏｗｎ と markdown と MARKDOWN';
    const ranges = core.findRanges(text, ['markdown']);
    assert.deepEqual(ranges.map(([s, e]) => text.slice(s, e)), ['Ｍａｒｋｄｏｗｎ', 'markdown', 'MARKDOWN']);
    assert.deepEqual(core.findRanges('abcabc', ['abc', 'bca']), [[0, 6]]);
    assert.deepEqual(core.findRanges('abc', ['x']), []);
    assert.deepEqual(core.findRanges('', ['x']), []);
  });

  test('findRanges: 1 文字が複数文字に展開される場合は文字単位に広げる', () => {
    const text = '重さ5㎏です';
    const ranges = core.findRanges(text, ['k']);
    assert.deepEqual(ranges.map(([s, e]) => text.slice(s, e)), ['㎏']);
    const text2 = 'ｶﾞｲﾄﾞ';
    assert.deepEqual(core.findRanges(text2, ['ガ']).map(([s, e]) => text2.slice(s, e)), ['ｶﾞ']);
  });

  test('makeSnippet: 一致箇所の前後を切り出し、範囲が一致語を指す', () => {
    const plain = 'あ'.repeat(100) + ' Markdown ビューア ' + 'い'.repeat(200);
    const sn = core.makeSnippet(plain, ['markdown'], 40);
    assert.ok(sn.text.startsWith('…'));
    assert.ok(sn.text.endsWith('…'));
    assert.equal(sn.ranges.length, 1);
    assert.equal(sn.text.slice(sn.ranges[0][0], sn.ranges[0][1]), 'Markdown');
    assert.ok(sn.text.length < 200);
  });

  test('makeSnippet: 本文に一致がなければ冒頭を返す', () => {
    const sn = core.makeSnippet('冒頭の文です。' + 'x'.repeat(500), ['zzz'], 40);
    assert.ok(sn.text.startsWith('冒頭の文です。'));
    assert.deepEqual(sn.ranges, []);
    assert.deepEqual(core.makeSnippet('短い', ['zzz'], 40), { text: '短い', ranges: [] });
  });

  test('makeSnippet: 大きな文書では hint 付近だけを調べ、結果は同じ語を指す', () => {
    const plain = 'ダミー '.repeat(5000) + '目的の語ターゲット ' + 'ダミー '.repeat(5000);
    const entry = core.makeSearchEntry('big.md', { title: 't', headings: [], plain });
    const hint = entry.textF.indexOf('ターゲット');
    const sn = core.makeSnippet(plain, ['ターゲット'], 40, hint);
    assert.equal(sn.ranges.length, 1);
    assert.equal(sn.text.slice(sn.ranges[0][0], sn.ranges[0][1]), 'ターゲット');
  });

  test('makeSnippet: サロゲートペアを途中で切らない', () => {
    const plain = '😀'.repeat(60) + 'needle' + '😀'.repeat(60);
    const sn = core.makeSnippet(plain, ['needle'], 41);
    assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(sn.text), '孤立サロゲートがない');
    assert.equal(sn.text.slice(sn.ranges[0][0], sn.ranges[0][1]), 'needle');
  });
});

describe('ツリー（FR-301, FR-307）', () => {
  const paths = ['b/2.md', 'README.md', 'a10.md', 'a2.md', 'b/README.md', 'index.md', 'a/x.md', 'b/10.md', 'b/1.md', 'あ.md', 'A1.md'];

  test('buildTree: ファイル（README / index が先頭）→ フォルダ、自然順', () => {
    const tree = core.buildTree(paths);
    assert.deepEqual(tree.files.map((f) => f.name), ['README.md', 'index.md', 'A1.md', 'a2.md', 'a10.md', 'あ.md']);
    assert.deepEqual(tree.dirs.map((d) => d.name), ['a', 'b']);
    assert.deepEqual(tree.dirs[1].files.map((f) => f.name), ['README.md', '1.md', '2.md', '10.md']);
    assert.equal(tree.dirs[1].path, 'b');
    assert.equal(tree.dirs[1].files[0].path, 'b/README.md');
  });

  test('flattenTree: 表示順に並ぶ', () => {
    assert.deepEqual(core.flattenTree(core.buildTree(paths)), [
      'README.md', 'index.md', 'A1.md', 'a2.md', 'a10.md', 'あ.md', 'a/x.md', 'b/README.md', 'b/1.md', 'b/2.md', 'b/10.md'
    ]);
  });

  test('buildTree: 深い階層', () => {
    const tree = core.buildTree(['x/y/z/doc.md']);
    assert.equal(tree.dirs[0].dirs[0].dirs[0].files[0].path, 'x/y/z/doc.md');
    assert.equal(tree.dirs[0].dirs[0].path, 'x/y');
  });

  test('pickHome: 設定 → README → index → 最初の文書', () => {
    const mk = (ps) => {
      const idx = core.createIndex(ps.map((p) => ({ path: p, kind: 'doc' })));
      return [idx, core.flattenTree(core.buildTree(ps))];
    };
    let [idx, ordered] = mk(['guide/a.md', 'index.md', 'Readme.md', 'z.md']);
    assert.equal(core.pickHome(idx, ordered, ''), 'Readme.md');
    assert.equal(core.pickHome(idx, ordered, 'guide/a.md'), 'guide/a.md');
    assert.equal(core.pickHome(idx, ordered, 'GUIDE/A'), 'guide/a.md');
    assert.equal(core.pickHome(idx, ordered, 'none.md'), 'Readme.md');
    [idx, ordered] = mk(['guide/a.md', 'INDEX.md', 'z.md']);
    assert.equal(core.pickHome(idx, ordered, ''), 'INDEX.md');
    [idx, ordered] = mk(['guide/a.md', 'z.md', 'b.md']);
    assert.equal(core.pickHome(idx, ordered, ''), 'b.md');
    [idx, ordered] = mk(['guide/a.md']);
    assert.equal(core.pickHome(idx, ordered, ''), 'guide/a.md');
    [idx, ordered] = mk([]);
    assert.equal(core.pickHome(idx, ordered, ''), null);
  });
});

describe('style 属性のフィルタ（SEC-3）', () => {
  test('許可したプロパティは残す', () => {
    assert.equal(core.filterStyle('color: red'), 'color: red');
    assert.equal(core.filterStyle('text-align:right'), 'text-align: right');
    assert.equal(core.filterStyle('COLOR:#F00;Font-Weight:bold;'), 'color: #F00; font-weight: bold');
    assert.equal(core.filterStyle('background-color: rgb(255, 0, 0); width: calc(100% - 2px)'), 'background-color: rgb(255, 0, 0); width: calc(100% - 2px)');
    assert.equal(core.filterStyle('border: 1px solid #ccc; padding: 4px 8px'), 'border: 1px solid #ccc; padding: 4px 8px');
    assert.equal(core.filterStyle('font-family: Meiryo, sans-serif'), 'font-family: Meiryo, sans-serif');
  });

  test('位置指定・重なり・変形などは除去する', () => {
    assert.equal(core.filterStyle('position: fixed; top: 0; left: 0; z-index: 9999; color: red'), 'color: red');
    assert.equal(core.filterStyle('transform: scale(100); opacity: 0; pointer-events: none'), '');
    assert.equal(core.filterStyle('content: "x"; cursor: pointer; animation: x 1s'), '');
    assert.equal(core.filterStyle('--custom: 1; inset: 0'), '');
  });

  test('url() などの外部参照を含む値は除去する', () => {
    assert.equal(core.filterStyle('background: url(https://evil.example/x.png)'), '');
    assert.equal(core.filterStyle('background: URL( https://evil.example/x.png ); color: blue'), 'color: blue');
    assert.equal(core.filterStyle('background: red image-set(x)'), '');
    assert.equal(core.filterStyle('width: expression(alert(1))'), '');
    assert.equal(core.filterStyle('color: var(--x, url(https://evil.example/))'), '');
  });

  test('引用符・バックスラッシュ・コメント・その他の記号を含む宣言は捨てる', () => {
    assert.equal(core.filterStyle("background: \\75rl(https://evil.example/)"), '');
    assert.equal(core.filterStyle('font-family: "MS Gothic"'), '');
    assert.equal(core.filterStyle("font-family: 'x'"), '');
    assert.equal(core.filterStyle('color: red /* x */; position: fixed'), '');
    assert.equal(core.filterStyle('color: red; background: u/**/rl(x)'), '');
    assert.equal(core.filterStyle('color: red}; body{display:none'), '');
    assert.equal(core.filterStyle('color: <b>'), '');
    assert.equal(core.filterStyle('color: red; width: 1px @import x'), 'color: red');
  });

  test('!important は外す・空や異常な入力', () => {
    assert.equal(core.filterStyle('color: red !important'), 'color: red');
    assert.equal(core.filterStyle(''), '');
    assert.equal(core.filterStyle(null), '');
    assert.equal(core.filterStyle('color'), '');
    assert.equal(core.filterStyle('color:'), '');
    assert.equal(core.filterStyle(':red'), '');
    assert.equal(core.filterStyle('color: ' + 'a'.repeat(300)), '');
    assert.equal(core.filterStyle('x'.repeat(3000)), '');
  });
});

describe('サイトデータ・HTML の組み立て', () => {
  test('mimeOf', () => {
    assert.equal(core.mimeOf('a/b.PNG'), 'image/png');
    assert.equal(core.mimeOf('a.svg'), 'image/svg+xml');
    assert.equal(core.mimeOf('a.pdf'), 'application/pdf');
    assert.equal(core.mimeOf('a.unknown'), 'application/octet-stream');
    assert.equal(core.mimeOf('noext'), 'application/octet-stream');
  });

  test('base64 の往復（バイナリ・大きなデータ）', () => {
    const small = new Uint8Array([0, 1, 2, 253, 254, 255]);
    assert.deepEqual(Array.from(core.base64ToBytes(core.bytesToBase64(small))), Array.from(small));
    const big = new Uint8Array(200000);
    for (let i = 0; i < big.length; i++) big[i] = (i * 31 + 7) & 0xFF;
    const back = core.base64ToBytes(core.bytesToBase64(big));
    assert.equal(back.length, big.length);
    assert.ok(back.every((v, i) => v === big[i]));
    assert.equal(core.bytesToBase64(new Uint8Array(0)), '');
  });

  test('jsonForScript: < をエスケープし、JSON として復元できる', () => {
    const value = { text: '</script><!-- <script> \u2028 \u2029 日本語 "q" \\', n: 1 };
    const s = core.jsonForScript(value);
    assert.ok(!s.includes('<'));
    assert.ok(!s.includes('\u2028') && !s.includes('\u2029'));
    assert.deepEqual(JSON.parse(s), value);
  });

  test('normalizeConfig: 不正な値は既定値にする', () => {
    assert.deepEqual(core.normalizeConfig(null), { title: '', lang: 'auto', theme: 'auto', home: '', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.deepEqual(core.normalizeConfig({ title: 'T', lang: 'en', theme: 'dark', home: 'a.md', allowExternalImages: true, extra: 1 }),
      { title: 'T', lang: 'en', theme: 'dark', home: 'a.md', allowExternalImages: true, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.deepEqual(core.normalizeConfig({ title: 5, lang: 'fr', theme: 'blue', home: null, allowExternalImages: 'yes' }),
      { title: '', lang: 'auto', theme: 'auto', home: '', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false });
    // 保存を使わない・外部画像を固定する指定は、true / false がはっきり書かれたときだけ既定から変わる
    assert.deepEqual(core.normalizeConfig({ allowDownloads: false, lockExternalImages: true }),
      { title: '', lang: 'auto', theme: 'auto', home: '', allowExternalImages: false, allowDownloads: false, lockExternalImages: true, hosted: false });
    assert.equal(core.normalizeConfig({ allowDownloads: 0 }).allowDownloads, true);
    assert.equal(core.normalizeConfig({ allowDownloads: 'no' }).allowDownloads, true);
    assert.equal(core.normalizeConfig({ lockExternalImages: 1 }).lockExternalImages, false);
    assert.equal(core.normalizeConfig({ hosted: true }).hosted, true);
    assert.equal(core.normalizeConfig({ hosted: 'yes' }).hosted, false);
  });

  test('applySite: 使わないライブラリを外すと、CSP のハッシュも外れる', () => {
    const csp = "default-src 'none'; script-src 'sha256-AAAA' 'sha256-BBBB' 'sha256-KKKK' 'sha256-MMMM'; style-src 'unsafe-inline'";
    const blocks = () => ['mdv-config', 'mdv-site', 'mdv-res-katex-css', 'mdv-lib-katex', 'mdv-lib-mermaid', 'mdv-js-vendor', 'mdv-js-app'].map((id) => ({ id, type: id.indexOf('mdv-js') === 0 ? '' : 'application/json', text: 'null' }));
    const apply = (dropLibs, policy = csp, list = blocks()) => core.applySite({ lang: 'ja', title: 't', csp: policy, generator: 'g', css: '', blocks: list }, { config: {}, siteData: null, title: 't', dropLibs });
    const scripts = (p) => /script-src ([^;]*)/.exec(p.csp)[1];
    assert.equal(scripts(apply([])), "'sha256-AAAA' 'sha256-BBBB' 'sha256-KKKK' 'sha256-MMMM'");
    assert.equal(scripts(apply(['katex'])), "'sha256-AAAA' 'sha256-BBBB' 'sha256-MMMM'");
    assert.equal(scripts(apply(['mermaid'])), "'sha256-AAAA' 'sha256-BBBB' 'sha256-KKKK'");
    assert.equal(scripts(apply(['katex', 'mermaid'])), "'sha256-AAAA' 'sha256-BBBB'");
    assert.deepEqual(apply(['katex', 'mermaid']).blocks.map((b) => b.id), ['mdv-config', 'mdv-site', 'mdv-js-vendor', 'mdv-js-app']);
    assert.equal(apply(['katex']).csp, "default-src 'none'; script-src 'sha256-AAAA' 'sha256-BBBB' 'sha256-MMMM'; style-src 'unsafe-inline'", 'ほかの指定は変えない');
    // 数式なしでビルドしたビューア（ハッシュ 3 つ）から、図も外す場合
    const lite = blocks().filter((b) => b.id !== 'mdv-lib-katex' && b.id !== 'mdv-res-katex-css');
    assert.equal(scripts(apply(['katex', 'mermaid'], "script-src 'sha256-AAAA' 'sha256-BBBB' 'sha256-MMMM'", lite)), "'sha256-AAAA' 'sha256-BBBB'");
    // 並びが想定と違う CSP は、そのままにする（誤って必要なハッシュを外さない）
    const odd = "script-src 'sha256-AAAA' 'sha256-BBBB' 'sha256-KKKK'";
    assert.equal(apply(['katex'], odd).csp, odd);
    const other = "script-src 'self' 'sha256-BBBB' 'sha256-KKKK' 'sha256-MMMM'";
    assert.equal(apply(['katex'], other).csp, other);
  });

  test('buildSiteData / validateSiteData', () => {
    const data = core.buildSiteData('docs', [
      { path: 'README.md', kind: 'doc', text: '# x', mtime: 5 },
      { path: 'a.png', kind: 'asset', base64: 'AAAA' }
    ], '2026-11-13T00:00:00.000Z');
    assert.equal(data.format, 1);
    assert.equal(data.generator, 'mdfolio ' + core.VERSION);
    assert.equal(data.name, 'docs');
    assert.deepEqual(data.files[1], { path: 'a.png', kind: 'asset', mime: 'image/png', mtime: 0, base64: 'AAAA' });
    assert.deepEqual(core.validateSiteData(data), { ok: true });
    assert.deepEqual(core.validateSiteData(null), { ok: false, empty: true });
    assert.equal(core.validateSiteData({ format: 2, files: [] }).error, 'format');
    assert.equal(core.validateSiteData({ format: 1 }).error, 'files');
    assert.equal(core.validateSiteData({ format: 1, files: [{ path: 'a.md', kind: 'doc' }] }).error, 'files');
    assert.equal(core.validateSiteData('x').error, 'type');
    // 種類・型が決まりどおりでないものは受け付けない（読み込み処理に渡さない）
    assert.equal(core.validateSiteData({ format: 1, files: [{ path: 'a.bin', kind: 'other' }] }).error, 'files');
    assert.equal(core.validateSiteData({ format: 1, files: [{ path: 'a.bin' }] }).error, 'files');
    assert.equal(core.validateSiteData({ format: 1, files: [{ path: 'a.png', kind: 'asset', base64: 5 }] }).error, 'files');
    assert.equal(core.validateSiteData({ format: 1, files: [{ path: 'a.png', kind: 'asset', base64: 'AAAA', mime: {} }] }).error, 'files');
    assert.equal(core.validateSiteData({ format: 1, files: [{ path: 'a.md', kind: 'doc', text: '', mtime: 'x' }] }).error, 'files');
    assert.equal(core.validateSiteData({ format: 1, files: [{ path: 5, kind: 'doc', text: '' }] }).error, 'files');
    assert.equal(core.validateSiteData({ format: 1, files: ['a.md'] }).error, 'files');
    assert.equal(core.validateSiteData({ format: 1, files: [null] }).error, 'files');
    assert.deepEqual(core.validateSiteData({ format: 1, files: [] }), { ok: true });
  });

  const parts = {
    lang: 'ja',
    title: 'A & B <test>',
    csp: "default-src 'none'; script-src 'sha256-abc='",
    generator: 'mdfolio 1.0.0',
    css: 'body { color: red; }\n/* <b> */',
    userCss: '',
    blocks: [
      { id: 'mdv-config', type: 'application/json', text: '{"title":""}' },
      { id: 'mdv-site', type: 'application/json', text: 'null' },
      { id: 'mdv-res-katex-css', type: 'application/json', text: '"css"' },
      { id: 'mdv-lib-katex', type: 'application/json', text: '"katex"' },
      { id: 'mdv-lib-mermaid', type: 'application/json', text: '"mermaid"' },
      { id: 'mdv-js-app', type: '', text: 'var a = 1 < 2;\nvar b = "\\x3c/script>";' }
    ]
  };

  test('composeHtml: 構造と必須要素', () => {
    const html = core.composeHtml(parts);
    assert.ok(html.startsWith('<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">'));
    assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'), 'CSP はスクリプトより前');
    assert.ok(html.includes('<title>A &amp; B &lt;test&gt;</title>'));
    assert.ok(html.includes('<script type="application/json" id="mdv-site">null</script>'));
    assert.ok(html.includes('<script id="mdv-js-app">var a = 1 < 2;'));
    assert.ok(html.includes('<div id="mdv-root"></div>'));
    assert.ok(html.endsWith('</body>\n</html>\n'));
    assert.ok(!html.includes('\r'));
  });

  test('composeHtml → extractParts → composeHtml が一致する', () => {
    const html = core.composeHtml(parts);
    const back = core.extractParts(html);
    assert.deepEqual(back, parts);
    assert.equal(core.composeHtml(back), html);
  });

  test('extractParts: CRLF に変換された HTML でも同じ結果になる', () => {
    const html = core.composeHtml(parts);
    assert.deepEqual(core.extractParts(html.replace(/\n/g, '\r\n')), parts);
  });

  test('composeHtml: 埋め込めない文字列や不正な ID は拒否する', () => {
    const bad = (block) => () => core.composeHtml({ ...parts, blocks: [block] });
    assert.throws(bad({ id: 'mdv-x', type: '', text: 'a </script> b' }));
    assert.throws(bad({ id: 'mdv-x', type: '', text: 'a </SCRIPT b' }));
    assert.throws(bad({ id: 'mdv-x', type: '', text: 'a <!-- b' }));
    assert.throws(bad({ id: 'other', type: '', text: 'x' }));
    assert.throws(bad({ id: 'mdv-x" onload="y', type: '', text: 'x' }));
    assert.throws(() => core.composeHtml({ ...parts, css: 'a </style> b' }));
    assert.throws(() => core.composeHtml({ ...parts, userCss: 'a </STYLE> b' }));
  });

  test('利用者の CSS（SPEC 3.10）: 内蔵の CSS → 埋め込んだ CSS → 隣の mdfolio.css の順に置き、分解しても戻る', () => {
    const withUser = { ...parts, userCss: 'h1 { color: blue; }' };
    const html = core.composeHtml(withUser);
    const head = html.slice(0, html.indexOf('</head>'));
    const i = head.indexOf('<style id="mdv-style">'), j = head.indexOf('<style id="mdv-user-style">h1 { color: blue; }</style>'), k = head.indexOf('<link rel="stylesheet" href="mdfolio.css" id="mdv-user-css">');
    assert.ok(i >= 0 && i < j && j < k, '順序');
    assert.deepEqual(core.extractParts(html), withUser);
    // 埋め込みがなければ <style id="mdv-user-style"> は出さない。隣の CSS を読む指定は常にある
    const plain = core.composeHtml(parts);
    assert.ok(!plain.includes('<style id="mdv-user-style">'));
    assert.ok(plain.includes('<link rel="stylesheet" href="mdfolio.css" id="mdv-user-css">'));
    // スクリプトの本文に同じ文字列があっても、<head> の中だけを読む
    const tricky = { ...parts, blocks: parts.blocks.concat([{ id: 'mdv-js-x', type: '', text: 'var s = \'<style id="mdv-user-style">x</style>\';' }]) };
    assert.equal(core.extractParts(core.composeHtml(tricky)).userCss, '');
  });

  test('applySite: 利用者の CSS は、指定があれば置き換え、なければ引き継ぐ', () => {
    const base = { ...parts, userCss: 'p { color: green; }' };
    const opts = { config: {}, siteData: null, title: 't', dropLibs: [] };
    assert.equal(core.applySite(base, opts).userCss, 'p { color: green; }');
    assert.equal(core.applySite(base, { ...opts, userCss: 'a {}' }).userCss, 'a {}');
    assert.equal(core.applySite(base, { ...opts, userCss: '' }).userCss, '');
  });

  test('extractParts: mdfolio の HTML でなければ例外', () => {
    assert.throws(() => core.extractParts('<html></html>'));
  });

  test('applySite: 設定とサイトデータを差し込み、指定ライブラリを除外する', () => {
    const siteData = core.buildSiteData('docs', [{ path: 'a.md', kind: 'doc', text: '</script>' }], '2026-01-01T00:00:00.000Z');
    const out = core.applySite(parts, { config: { title: 'サイト', home: 'a.md' }, siteData, title: 'サイト', dropLibs: ['katex'] });
    assert.deepEqual(out.blocks.map((b) => b.id), ['mdv-config', 'mdv-site', 'mdv-lib-mermaid', 'mdv-js-app']);
    assert.equal(out.title, 'サイト');
    assert.deepEqual(JSON.parse(core.findBlock(out, 'mdv-config').text), { title: 'サイト', lang: 'auto', theme: 'auto', home: 'a.md', allowExternalImages: false, allowDownloads: true, lockExternalImages: false, hosted: false });
    assert.deepEqual(JSON.parse(core.findBlock(out, 'mdv-site').text), siteData);
    assert.equal(core.findBlock(out, 'mdv-js-app').text, parts.blocks[5].text);
    assert.equal(core.findBlock(out, 'mdv-none'), null);
    // 組み立て直せること、元の部品は変更されないこと
    assert.ok(core.composeHtml(out).includes('id="mdv-site">{'));
    assert.equal(parts.blocks.length, 6);
    const both = core.applySite(parts, { config: {}, siteData, dropLibs: ['katex', 'mermaid'] });
    assert.deepEqual(both.blocks.map((b) => b.id), ['mdv-config', 'mdv-site', 'mdv-js-app']);
  });
});

describe('その他', () => {
  test('sanitizeFileName', () => {
    assert.equal(core.sanitizeFileName('設計書 v1.0'), '設計書 v1.0');
    assert.equal(core.sanitizeFileName('a/b\\c:d*e?f"g<h>i|j'), 'a_b_c_d_e_f_g_h_i_j');
    assert.equal(core.sanitizeFileName('  ..name..  '), 'name');
    assert.equal(core.sanitizeFileName(''), 'site');
    assert.equal(core.sanitizeFileName('...', 'x'), 'x');
    assert.equal(core.sanitizeFileName('a'.repeat(200)).length, 80);
  });

  test('formatBytes / formatDate', () => {
    assert.equal(core.formatBytes(0), '0 B');
    assert.equal(core.formatBytes(1023), '1023 B');
    assert.equal(core.formatBytes(1536), '1.5 KB');
    assert.equal(core.formatBytes(5 * 1024 * 1024), '5.0 MB');
    assert.equal(core.formatBytes(50 * 1024 * 1024), '50 MB');
    assert.equal(core.formatBytes(-1), '');
    assert.equal(core.formatDate(0), '');
    assert.equal(core.formatDate(NaN), '');
    assert.match(core.formatDate(new Date(2026, 10, 13, 9, 5).getTime()), /^2026-11-13 09:05$/);
  });

  test('escapeHtml / unescapeHtml の往復', () => {
    const s = '<a href="x">A & B</a>';
    assert.equal(core.escapeHtml(s), '&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;');
    assert.equal(core.unescapeHtml(core.escapeHtml(s)), s);
    assert.equal(core.unescapeHtml(core.escapeHtml('&lt;')), '&lt;');
  });

  test('定数', () => {
    assert.equal(core.NAME, 'mdfolio');
    assert.match(core.VERSION, /^\d+\.\d+\.\d+$/);
    assert.equal(core.LIMITS.maxDocs, 5000);
    assert.equal(core.LIMITS.maxEntries, 50000);
    assert.equal(core.LIMITS.maxDocBytes, 10 * 1024 * 1024);
    assert.equal(core.LIMITS.maxAssetBytes, 20 * 1024 * 1024);
  });
});
