// 表示（レンダリング）: FR-201〜FR-213
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, withPage, loadFolder, fixture, hash, heading, goTo, waitHeading, waitIndexed, tmpDir, writeTree, clickMenu } from '../helpers/e2e.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

async function openSyntax(page) {
  await loadFolder(page, fixture('site'));
  await goTo(page, '#/syntax.md', '記法');
  // 図（非同期）の描画完了を待つ
  await page.waitForSelector('.mdv-mermaid svg');
  await page.waitForSelector('.mdv-mermaid-error');
}

describe('Markdown の表示', () => {
  test('フロントマター: 本文に出さず、title を文書タイトルにする（FR-208, FR-213）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      assert.equal(await page.title(), '記法の確認 - site');
      const text = await page.textContent('.mdv-prose');
      assert.ok(!text.includes('author: tester'));
      assert.ok(!text.includes('title: 記法の確認'));
      assert.ok(!text.includes('HTML コメントは表示されない'));
    });
  });

  test('表: 列揃え・横スクロール（FR-201, FR-212）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      const r = await page.evaluate(() => {
        const tables = document.querySelectorAll('.mdv-prose .mdv-table-wrap > table');
        const td = tables[0].querySelector('tbody td:nth-child(2)');
        const wide = tables[1].parentNode;
        return {
          count: tables.length,
          align: getComputedStyle(td).textAlign,
          wideScrolls: wide.scrollWidth > wide.clientWidth + 50,
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth
        };
      });
      assert.equal(r.count, 2);
      assert.equal(r.align, 'right');
      assert.equal(r.wideScrolls, true, '横に長い表は、表の枠の中でスクロールする');
      assert.ok(r.pageOverflow <= 0, 'ページ全体は横にはみ出さない');
    });
  });

  test('タスクリスト: 操作できないチェックボックス（FR-201）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      const boxes = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-prose .task-list-item input')).map((i) => ({ type: i.type, checked: i.checked, disabled: i.disabled })));
      assert.deepEqual(boxes, [{ type: 'checkbox', checked: false, disabled: true }, { type: 'checkbox', checked: true, disabled: true }]);
    });
  });

  test('アラート: 種別ごとの表示と、画面の言語に合わせた見出し（FR-207）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      assert.equal(await page.textContent('.markdown-alert-warning .markdown-alert-title'), '警告');
      assert.ok((await page.textContent('.markdown-alert-warning')).includes('警告の本文'));
      await clickMenu(page, 'menuLanguage');
      await page.waitForFunction(() => document.querySelector('.markdown-alert-warning .markdown-alert-title').textContent === 'Warning');
    });
  });

  test('コード: ハイライト・言語名・コピー（FR-204）', async () => {
    await withPage(browser, async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
      await openSyntax(page);
      const blocks = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-prose .mdv-code')).map((c) => ({
        lang: c.querySelector('.mdv-code-lang').textContent,
        keywords: c.querySelectorAll('.hljs-keyword').length,
        text: c.querySelector('pre').textContent,
        copyLabel: c.querySelector('.mdv-copy').getAttribute('aria-label')
      })));
      assert.equal(blocks[0].lang, 'js');
      assert.ok(blocks[0].keywords >= 1);
      assert.equal(blocks[0].text, 'const x = 1;\n');
      assert.equal(blocks[0].copyLabel, 'コードをコピー');
      assert.equal(blocks[1].lang, 'unknownlang');
      assert.equal(blocks[1].keywords, 0);
      assert.equal(blocks[1].text, 'plain <text>\n');
      await page.click('.mdv-code >> nth=0 >> .mdv-copy');
      await page.waitForFunction(() => document.querySelector('.mdv-copy').textContent === 'コピーしました');
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
      if (clip !== null) assert.equal(clip, 'const x = 1;\n');
      await page.waitForFunction(() => document.querySelector('.mdv-copy').textContent === 'コピー', null, { timeout: 5000 });
    });
  });

  test('数式: インライン・ディスプレイ・金額は対象外・エラーでも続行（FR-205）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      const r = await page.evaluate(async () => {
        await document.fonts.ready;
        const prose = document.querySelector('.mdv-prose');
        return {
          inline: prose.querySelectorAll('.math-inline .katex').length,
          display: prose.querySelectorAll('.math-display .katex-display').length,
          errors: prose.querySelectorAll('.katex-error').length,
          currency: prose.textContent.includes('金額 $5 と $10。'),
          mathml: prose.querySelectorAll('.katex math').length,
          fonts: Array.from(document.fonts).filter((f) => f.status === 'loaded' && /^KaTeX/.test(f.family)).length,
          fontErrors: Array.from(document.fonts).filter((f) => f.status === 'error').length,
          afterMath: prose.textContent.includes('もエラー表示になるだけ')
        };
      });
      assert.equal(r.inline, 1);
      assert.equal(r.display, 1);
      assert.equal(r.errors, 1, '誤った数式はその箇所だけエラー表示');
      assert.equal(r.currency, true, '金額は数式にしない');
      assert.ok(r.mathml >= 2, '読み上げ用の MathML を出力する');
      assert.ok(r.fonts >= 1, '内蔵フォントが読み込まれる');
      assert.equal(r.fontErrors, 0);
      assert.equal(r.afterMath, true);
    });
  });

  test('図: 正しい図は SVG に、誤りのある図はメッセージと元のコードを表示（FR-206）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      const r = await page.evaluate(() => {
        const svg = document.querySelector('.mdv-mermaid svg');
        const err = document.querySelector('.mdv-mermaid-error');
        return {
          svgs: document.querySelectorAll('.mdv-mermaid svg').length,
          labels: svg.textContent.includes('開始') && svg.textContent.includes('終了'),
          width: svg.getBoundingClientRect().width,
          errTitle: err.querySelector('.mdv-mermaid-error-title').textContent,
          errMsg: err.querySelector('.mdv-mermaid-error-msg').textContent.length,
          errCode: err.querySelector('pre').textContent,
          leftovers: document.querySelectorAll('body > [id^="dmdv-mmd"], body > [id^="mdv-mmd"], pre.mermaid-src').length
        };
      });
      assert.equal(r.svgs, 1);
      assert.equal(r.labels, true);
      assert.ok(r.width > 50);
      assert.equal(r.errTitle, '図の記述に誤りがあります');
      assert.ok(r.errMsg > 0);
      assert.equal(r.errCode, 'this is not a diagram\n');
      assert.equal(r.leftovers, 0, '作業用の要素が残らない');
    });
  });

  test('生 HTML: 許可した要素は表示し、style は安全な範囲だけ残す（FR-209, SEC-3）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      const r = await page.evaluate(() => {
        const styled = document.getElementById('user-content-styled');
        return {
          details: document.querySelectorAll('.mdv-prose details > summary').length,
          kbd: document.querySelector('.mdv-prose kbd').textContent,
          style: styled.getAttribute('style'),
          color: getComputedStyle(styled).color,
          position: getComputedStyle(styled).position
        };
      });
      assert.equal(r.details, 1);
      assert.equal(r.kbd, 'Ctrl');
      assert.equal(r.style, 'color: red');
      assert.equal(r.color, 'rgb(255, 0, 0)');
      assert.equal(r.position, 'static');
    });
  });

  test('脚注: 参照から脚注へ、脚注から本文へ移動できる（FR-202）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      const inView = (sel) => page.evaluate((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return r.top >= 0 && r.top < window.innerHeight;
      }, sel);
      assert.equal(await page.getAttribute('.footnote-ref a', 'href'), '#/syntax.md#fn1');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click('.footnote-ref a');
      await page.waitForFunction(() => location.hash === '#/syntax.md#fn1');
      await page.waitForFunction(() => {
        const r = document.getElementById('user-content-fn1').getBoundingClientRect();
        return window.scrollY > 200 && r.top >= 0 && r.top < window.innerHeight;
      });
      assert.ok(await inView('#user-content-fn1'));
      assert.ok((await page.textContent('#user-content-fn1')).includes('脚注の内容。'));
      assert.equal(await page.getAttribute('.footnote-backref', 'href'), '#/syntax.md#fnref1');
    });
  });

  test('自動リンク: スキーム付き URL だけをリンクにする（3.2.1）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      const r = await page.evaluate(() => {
        const p = Array.from(document.querySelectorAll('.mdv-prose p')).find((x) => x.textContent.includes('README.md や main.py'));
        return Array.from(p.querySelectorAll('a')).map((a) => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, ext: a.classList.contains('mdv-ext') }));
      });
      assert.deepEqual(r, [{ href: 'https://example.com/auto', target: '_blank', rel: 'noopener noreferrer', ext: true }]);
    });
  });

  test('見出し: ID とアンカーリンク（FR-203）', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      const r = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-prose h2')).slice(0, 3).map((h) => ({ id: h.id, href: h.querySelector('.mdv-anchor').getAttribute('href'), label: h.querySelector('.mdv-anchor').getAttribute('aria-label') })));
      assert.deepEqual(r[0], { id: 'user-content-表', href: '#/syntax.md#' + encodeURIComponent('表'), label: '「表」へのリンク' });
      assert.equal(r[1].id, 'user-content-タスク');
      await page.hover('.mdv-prose h2 >> nth=1');
      await page.click('.mdv-prose h2 >> nth=1 >> .mdv-anchor');
      await page.waitForFunction(() => location.hash === '#/syntax.md#' + encodeURIComponent('タスク'));
    });
  });

  test('空の文書・フロントマターだけの文書・見出しのない文書（FR-213）', async () => {
    const dir = writeTree(tmpDir(), {
      'README.md': '# ホーム\n',
      'empty.md': '',
      'only-frontmatter.md': '---\ntitle: メタだけ\n---\n',
      'no-heading.md': '見出しのない本文です。\n',
      'crlf.md': '# CRLF の文書\r\n\r\n- 一\r\n- 二\r\n'
    });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await goTo(page, '#/empty.md');
      await page.waitForFunction(() => document.title.startsWith('empty - '));
      assert.equal(await page.locator('.mdv-prose > *').count(), 0);
      await goTo(page, '#/only-frontmatter.md');
      await page.waitForFunction(() => document.title.startsWith('メタだけ - '));
      await goTo(page, '#/no-heading.md');
      await page.waitForFunction(() => document.title.startsWith('no-heading - '));
      assert.ok(await page.isHidden('.mdv-toc'), '見出しが 2 つ未満なら目次を出さない');
      await goTo(page, '#/crlf.md', 'CRLF の文書');
      assert.equal(await page.locator('.mdv-prose li').count(), 2);
    });
  });
});

describe('画像・メディア（FR-210）', () => {
  test('相対パスの画像を表示し、見つからない画像・外部画像はプレースホルダにする', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.mdv-prose img')).length === 3 && Array.from(document.querySelectorAll('.mdv-prose img')).every((i) => i.complete && i.naturalWidth > 0));
      const r = await page.evaluate(() => ({
        imgs: Array.from(document.querySelectorAll('.mdv-prose img')).map((i) => ({ alt: i.alt, w: i.naturalWidth, blob: i.src.startsWith('blob:'), width: i.getAttribute('width') })),
        placeholders: Array.from(document.querySelectorAll('.mdv-prose .mdv-ph')).map((p) => ({ text: p.textContent, label: p.getAttribute('aria-label'), role: p.getAttribute('role') }))
      }));
      assert.deepEqual(r.imgs, [
        { alt: 'ピクセル', w: 64, blob: true, width: null },
        { alt: 'SVG 図', w: 120, blob: true, width: null },
        { alt: 'HTML の画像', w: 64, blob: true, width: '40' }
      ]);
      assert.deepEqual(r.placeholders, [
        { text: '画像が見つかりません: assets/none.png', label: '存在しない画像 (画像が見つかりません: assets/none.png)', role: 'img' },
        { text: '外部の画像は表示していません: https://example.invalid/external.png', label: '外部画像 (外部の画像は表示していません: https://example.invalid/external.png)', role: 'img' }
      ]);
    });
  });

  test('深い階層の文書からの相対パス（../../）', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await goTo(page, '#/guide/sub/deep.md', '深い文書');
      await page.waitForFunction(() => { const i = document.querySelector('.mdv-prose img'); return i && i.naturalWidth === 64; });
    });
  });
});

describe('ページ内目次（FR-303）', () => {
  test('H1〜H4 を一覧し、スクロール位置に応じて現在位置を強調する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const items = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-toc .mdv-toc-link')).map((a) => [a.textContent, a.getAttribute('data-depth')]));
      assert.deepEqual(items, [['テスト用サイト', '0'], ['リンク', '1'], ['画像', '1'], ['末尾の節', '1'], ['最後の見出し', '1']]);
      const current = () => page.evaluate(() => { const a = document.querySelector('.mdv-toc .is-current'); return a ? a.textContent : null; });
      assert.equal(await current(), 'テスト用サイト');
      await page.click('.mdv-toc .mdv-toc-link:has-text("末尾の節")');
      await page.waitForFunction(() => { const a = document.querySelector('.mdv-toc .is-current'); return a && a.textContent === '末尾の節'; });
      assert.equal(await hash(page), '#/README.md#' + encodeURIComponent('末尾の節'));
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForFunction(() => { const a = document.querySelector('.mdv-toc .is-current'); return a && a.textContent === '最後の見出し'; });
      assert.equal(await page.getAttribute('.mdv-toc .is-current', 'aria-current'), 'location');
      assert.equal(await heading(page), 'テスト用サイト');
    });
  });
});

describe('コードの色分け（FR-204）: 内容を変えない・大きな文書では後回しにする', () => {
  const pending = (page) => page.evaluate(() => (window.MDV.app.state.pendingCode ? window.MDV.app.state.pendingCode.length : 0));
  const blocks = (page) => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-prose .mdv-code')).map((c) => ({
    lang: c.querySelector('.mdv-code-lang').textContent,
    text: c.querySelector('pre').textContent,
    spans: c.querySelectorAll('pre span[class^="hljs-"]').length,
    other: c.querySelectorAll('pre *:not(span):not(code):not(mark)').length
  })));

  test('色分けしても、コードの文字は 1 文字も変わらない', async () => {
    const samples = [
      ['js', '\n\n  // 先頭に空行と字下げ\n\tconst a = "<script>alert(1)</script>" && b < c > d;\n\n'],
      ['html', '<div class="x" onclick="alert(1)">&amp; &lt;b&gt; <!-- c --></div>\n<script>window.__xss = 1</script>\n'],
      ['python', 'def f(x):\n    return f"{x!r} \\n \\t" # コメント　全角空白\n'],
      ['json', '{ "a": [1, 2.5e3, null, true], "b": "\\u3042 \\" </code></pre>" }\n'],
      ['markdown', '# 見出し\n\n```js\nnested\n```\n\n<b>raw</b> &copy;\n'],
      ['bash', 'echo "$HOME" | sed -e \'s/&/\\&amp;/g\' > out.txt 2>&1 && rm -rf ./tmp/*\n'],
      ['diff', '- old line\n+ new line\n@@ -1,2 +1,2 @@\n'],
      ['css', 'a::before { content: "\\201C"; background: url(https://example.invalid/x.png) }\n']
    ];
    const fence = (lang, code) => '````' + lang + '\n' + code + (code.endsWith('\n') ? '' : '\n') + '````\n';
    const md = '# 色分けの確認\n\n' + samples.map(([lang, code]) => fence(lang, code)).join('\n') +
      '\n<pre><code class="language-js">const html = 1 &lt; 2 &amp;&amp; "&lt;b&gt;";\n</code></pre>\n';
    const dir = writeTree(tmpDir(), { 'README.md': md });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      const got = await blocks(page);
      assert.equal(got.length, samples.length + 1);
      samples.forEach(([lang, code], i) => {
        assert.equal(got[i].lang, lang);
        assert.equal(got[i].text, code, `${lang}: 表示されるコードは元のまま`);
        assert.ok(got[i].spans > 0, `${lang}: 色分けされている`);
        assert.equal(got[i].other, 0, `${lang}: span 以外の要素は作られない`);
      });
      // HTML で直接書かれたコードブロックも同じ扱い
      assert.equal(got[samples.length].text, 'const html = 1 < 2 && "<b>";\n');
      assert.ok(got[samples.length].spans > 0);
      assert.equal(await page.evaluate(() => typeof window.__xss), 'undefined');
      assert.equal(await pending(page), 0, '小さな文書は、表示と同時にすべて色分けする');
    });
  });

  test('コードブロックが多い文書: 先頭は表示と同時に、残りは画面に近いものから順に色分けする', async () => {
    const count = 400;
    const code = (n) => `function step${n}(input) {\n  return input.filter((x) => x.enabled).map((x) => x.value * ${n});\n}\n`;
    let md = '# コードの多い文書\n';
    for (let n = 1; n <= count; n++) md += `\n## 節 ${n}\n\n\`\`\`js\n${code(n)}\`\`\`\n`;
    const dir = writeTree(tmpDir(), { 'README.md': '# ホーム\n\n[多い](many.md)\n', 'many.md': md });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await waitIndexed(page);
      // 表示の直後: 先頭の 60 個だけ色分け済み（ページの処理が進まないうちに同じ呼び出しの中で確かめる）
      const first = await page.evaluate(() => new Promise((resolve) => {
        const check = () => {
          const h1 = document.querySelector('.mdv-prose h1');
          if (h1 && h1.textContent.indexOf('コードの多い文書') === 0) {
            const list = Array.from(document.querySelectorAll('.mdv-prose .mdv-code pre'));
            resolve({ total: list.length, done: list.filter((p) => p.querySelector('span[class^="hljs-"]')).length, pending: window.MDV.app.state.pendingCode ? window.MDV.app.state.pendingCode.length : 0 });
            return;
          }
          setTimeout(check, 0);
        };
        location.hash = '#/many.md';
        check();
      }));
      assert.equal(first.total, count);
      assert.ok(first.done >= 60 && first.done < count, `最初に色分けされるのは一部（${first.done} 個）`);
      assert.equal(first.done + first.pending, count);
      // しばらくすると、すべて色分けされる。文字は変わらない
      await page.waitForFunction(() => window.MDV.app.state.pendingCode === null);
      const all = await blocks(page);
      assert.ok(all.every((b) => b.spans > 0 && b.other === 0));
      all.forEach((b, i) => assert.equal(b.text, code(i + 1)));
    });
  });

  test('途中の位置を開いたときは、見えている範囲を先に色分けする。検索語の強調も保つ', async () => {
    const count = 400;
    let md = '# コードの多い文書\n';
    for (let n = 1; n <= count; n++) md += `\n## 節 ${n}\n\n\`\`\`js\nconst value${n} = ${n === 350 ? '"目印オメガ"' : n};\n\`\`\`\n`;
    const dir = writeTree(tmpDir(), { 'README.md': '# ホーム\n', 'many.md': md });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, dir);
      await waitIndexed(page);
      // 検索結果から開く: 350 番目のコードブロックの中の語が強調され、その位置までスクロールする
      await page.fill('.mdv-search-input', '目印オメガ');
      await page.waitForSelector('.mdv-search-item');
      // 開いた直後から監視して、「見えている 350 番目」が「離れた 330 番目」より先に色分けされることを確かめる
      const order = await page.evaluate(() => new Promise((resolve) => {
        const done = (i) => { const list = document.querySelectorAll('.mdv-prose .mdv-code pre'); return list.length > i && !!list[i].querySelector('span[class^="hljs-"]'); };
        const check = () => {
          const h1 = document.querySelector('.mdv-prose h1');
          if (h1 && h1.textContent.indexOf('コードの多い文書') === 0 && done(349)) { resolve({ visibleFirst: !done(329), startDone: done(0) }); return; }
          setTimeout(check, 0);
        };
        document.querySelector('.mdv-search-item').click();
        check();
      }));
      assert.deepEqual(order, { visibleFirst: true, startDone: true });
      await waitHeading(page, 'コードの多い文書');
      await page.waitForFunction(() => window.MDV.app.state.pendingCode === null);
      const r = await page.evaluate(() => {
        const mark = document.querySelector('.mdv-prose mark.mdv-hit');
        const pre = mark && mark.closest('pre');
        const rect = mark && mark.getBoundingClientRect();
        return {
          mark: mark ? mark.textContent : null,
          inCode: !!pre,
          text: pre ? pre.textContent : null,
          highlighted: pre ? pre.querySelectorAll('span[class^="hljs-"]').length > 0 : false,
          visible: rect ? rect.top > 0 && rect.bottom < window.innerHeight : false
        };
      });
      assert.deepEqual(r, { mark: '目印オメガ', inCode: true, text: 'const value350 = "目印オメガ";\n', highlighted: true, visible: true });
      // Esc で強調を消しても、コードは元のまま
      await page.focus('.mdv-search-input');
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.mdv-prose mark.mdv-hit'));
      assert.equal(await page.evaluate(() => document.querySelectorAll('.mdv-prose .mdv-code pre')[349].textContent), 'const value350 = "目印オメガ";\n');
    });
  });

  test('印刷の前には、残りをまとめて色分けする', async () => {
    let md = '# 印刷する文書\n';
    for (let n = 1; n <= 300; n++) md += `\n\`\`\`js\nconst v${n} = ${n};\n\`\`\`\n`;
    const dir = writeTree(tmpDir(), { 'README.md': md });
    await withPage(browser, async ({ page }) => {
      const done = await page.evaluate(async (text) => {
        // 読み込みから印刷の合図までを、ページの処理を挟まずに行う
        const dt = new DataTransfer();
        dt.items.add(new File([text], 'README.md', { type: 'text/markdown' }));
        const input = document.querySelector('.mdv-input-files');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          const state = window.MDV.app.state;
          if (document.querySelector('.mdv-prose h1') && state.pendingCode) break;
          if (document.querySelector('.mdv-prose h1') && document.querySelectorAll('.mdv-prose .mdv-code').length === 300 && !state.pendingCode) return 'already';
        }
        const before = window.MDV.app.state.pendingCode.length;
        window.dispatchEvent(new Event('beforeprint'));
        const list = Array.from(document.querySelectorAll('.mdv-prose .mdv-code pre'));
        return { before: before > 0, pendingAfter: window.MDV.app.state.pendingCode, highlighted: list.filter((p) => p.querySelector('span[class^="hljs-"]')).length, total: list.length };
      }, md);
      assert.deepEqual(done, { before: true, pendingAfter: null, highlighted: 300, total: 300 });
    });
  });
});
