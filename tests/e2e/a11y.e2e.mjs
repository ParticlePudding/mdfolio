// アクセシビリティ（NFR-4）
// 機械的に判定できる項目は axe-core（独立した検査エンジン）で確認し、キーボード操作・フォーカス・配色は個別に確認する。
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  launchBrowser, openPage, withPage, loadFolder, fixture, heading, waitHeading, waitIndexed, goTo, clickMenu, openMenu, ROOT
} from '../helpers/e2e.mjs';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser.close(); });

const axeSource = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');

/**
 * axe-core で検査して、違反を「規則: 対象」の一覧で返す。
 * 文書の作者が style で指定した色（#user-content-styled）は、アプリの配色ではないので対象から外す。
 */
async function audit(page) {
  await page.evaluate(axeSource);
  const result = await page.evaluate(async () => {
    // preload: false … axe-core が検査のためにスタイルシートを取りに行くのを止める（隣の mdfolio.css を読もうとして CSP の connect-src に止められ、
    // それがエラーとして記録されるため。アプリの動作ではない）
    const r = await window.axe.run({ exclude: [['.mdv-prose [style*="color"]']] }, { resultTypes: ['violations'], preload: false });
    return { violations: r.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | ')), passes: r.passes.length };
  });
  return result;
}

async function openSyntax(page) {
  await loadFolder(page, fixture('site'));
  await waitIndexed(page);
  await goTo(page, '#/syntax.md', '記法');
  await page.waitForSelector('.mdv-mermaid svg');
  await page.waitForSelector('.mdv-mermaid-error');
}

const active = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return 'body';
  return el.getAttribute('data-action') || el.id || (el.className && String(el.className).split(' ').filter((c) => c.indexOf('mdv-') === 0).pop()) || el.nodeName;
});

describe('自動検査（axe-core）', () => {
  for (const scheme of ['light', 'dark']) {
    test(`主要な画面で違反がない（${scheme === 'light' ? 'ライト' : 'ダーク'}）`, async () => {
      const { page, context } = await openPage(browser, { colorScheme: scheme });
      try {
        const checked = [];
        const check = async (label) => {
          const r = await audit(page);
          assert.deepEqual(r.violations, [], `${label} で違反がある`);
          assert.ok(r.passes > 15, `${label}: 検査が実行されている`);
          checked.push(label);
        };
        await check('開始画面');
        await loadFolder(page, fixture('site'));
        await waitIndexed(page);
        await check('文書（リンク・画像）');
        await goTo(page, '#/syntax.md', '記法');
        await page.waitForSelector('.mdv-mermaid svg');
        await page.waitForSelector('.mdv-mermaid-error');
        await check('文書（表・コード・数式・図・タスクリスト・脚注・アラート）');
        await page.fill('.mdv-search-input', '固有語');
        await page.waitForSelector('.mdv-search-item');
        await check('検索結果');
        await page.fill('.mdv-search-input', 'どこにもない語zzz');
        await page.waitForSelector('.mdv-search-empty');
        await check('検索結果なし');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await openMenu(page);
        await check('メニュー');
        await page.keyboard.press('Escape');
        await clickMenu(page, 'menuExport');
        await page.waitForSelector('dialog.mdv-dialog-export[open]');
        await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
        await check('書き出しダイアログ');
        await page.click('.mdv-export-cancel');
        await clickMenu(page, 'menuExternalImages');
        await page.waitForSelector('dialog.mdv-dialog-external[open]');
        await check('外部画像の確認ダイアログ');
        await page.click('.mdv-external-cancel');
        await clickMenu(page, 'menuAbout');
        await page.waitForSelector('dialog.mdv-dialog-about[open]');
        await check('ライセンスのダイアログ');
        await page.click('.mdv-about-close');
        await clickMenu(page, 'menuHelp');
        await page.waitForFunction(() => window.MDV.app.state.view === 'help');
        await check('使い方');
        await goTo(page, '#/nothing.md');
        await page.waitForSelector('.mdv-empty');
        await check('見つからない文書');
        await goTo(page, '#/assets/data.csv');
        await page.waitForSelector('.mdv-download');
        await check('添付ファイル');
        // すべての表示部品を含む文書（表示できない画像の代わりの表示を含む）
        await loadFolder(page, fixture('a11y'));
        await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2);
        await check('すべての表示部品');
        // カスタムナビ（タブ）と英語表示
        await loadFolder(page, fixture('nav'));
        await page.waitForSelector('.mdv-sidenav a');
        await check('カスタムナビ');
        await clickMenu(page, 'menuLanguage');
        await page.waitForFunction(() => document.documentElement.lang === 'en');
        await check('英語表示');
        assert.equal(checked.length, 15);
      } finally {
        await context.close();
      }
    });
  }

  test('狭い画面（ドロワー・折りたたみ目次）でも違反がない', async () => {
    await withPage(browser, { viewport: { width: 390, height: 800 } }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.deepEqual((await audit(page)).violations, []);
      await page.click('.mdv-btn-sidebar');
      await page.waitForSelector('.mdv-app[data-sidebar="open"]');
      await page.waitForTimeout(350);
      assert.deepEqual((await audit(page)).violations, []);
      await page.keyboard.press('Escape');
      await page.click('.mdv-toc-inline summary');
      assert.deepEqual((await audit(page)).violations, []);
    });
  });
});

describe('配色のコントラスト（4.5:1 以上）', () => {
  // 画面に出ている要素の、実際の文字色と背景色から計算する。axe が判定を保留する数式・図・重なった要素も含める。
  const measure = () => {
    const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const background = (el) => {
      const layers = [];
      for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
        const c = parse(getComputedStyle(p).backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; }
      }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
      return bg;
    };
    const out = [];
    const add = (label, fg, bg) => { out.push([label, Math.round(ratio(over(fg, bg), bg) * 100) / 100]); };
    const selectors = [
      '.mdv-title', '.mdv-search-kbd', '.mdv-doc-path', '.mdv-doc-date', '.mdv-prose h1', '.mdv-prose h2', '.mdv-prose h3', '.mdv-prose p', '.mdv-prose li',
      '.mdv-prose a', '.mdv-prose a.mdv-missing', '.mdv-prose :not(pre) > code', '.mdv-code pre code', '.mdv-code-lang', '.mdv-copy', '.mdv-prose blockquote p',
      '.mdv-prose th', '.mdv-prose td', '.mdv-prose .footnotes li', '.mdv-prose .footnote-backref', '.mdv-prose .footnote-ref a', '.mdv-prose s', '.mdv-prose kbd', '.mdv-prose h4', '.mdv-prose summary', '.mdv-prose strong', '.mdv-prose em',
      '.markdown-alert-note .markdown-alert-title', '.markdown-alert-tip .markdown-alert-title', '.markdown-alert-important .markdown-alert-title',
      '.markdown-alert-warning .markdown-alert-title', '.markdown-alert-caution .markdown-alert-title', '.markdown-alert p:not(.markdown-alert-title)',
      '.mdv-toc-title', '.mdv-toc-link', '.mdv-toc-link.is-current', '.mdv-side-tree a', '.mdv-side-tree a[aria-current="page"]', '.mdv-side-tree summary',
      '.mdv-ph-text', '.mdv-mermaid-error-title', '.mdv-mermaid-error-msg', '.mdv-mermaid-error pre', '.katex', '.katex-error', '.math-display .katex',
      '.mdv-search-item .mdv-search-item-title', '.mdv-search-item .mdv-search-item-path', '.mdv-search-item .mdv-search-item-snippet', '.mdv-search-item mark', '.mdv-search-foot',
      '.mdv-search-item.is-active .mdv-search-item-title', '.mdv-search-item.is-active .mdv-search-item-path', '.mdv-search-item.is-active .mdv-search-item-snippet',
      '.mdv-search-item:not(.is-active) .mdv-search-item-title', '.mdv-search-item:not(.is-active) .mdv-search-item-path', '.mdv-search-item:not(.is-active) .mdv-search-item-snippet',
      'mark.mdv-hit', '.mdv-menu-item', '.mdv-btn', '.mdv-btn-primary', '.mdv-dialog-title', '.mdv-dialog-lead', '.mdv-field-label', '.mdv-export-summary', '.mdv-input',
      '.mdv-welcome-title', '.mdv-welcome-lead', '.mdv-open-folder', '.mdv-open-files', '.mdv-welcome-foot a', '.mdv-empty-title', '.mdv-empty-body', '.mdv-toast', '.mdv-notice', '.mdv-plain',
      '.mdv-side-tab[aria-selected="true"]', '.mdv-side-tab[aria-selected="false"]', '.mdv-sidenav a', '.mdv-sidenav-label', '.mdv-toc-inline summary'
    ];
    const missing = [];
    selectors.forEach((sel) => {
      const el = Array.from(document.querySelectorAll(sel)).find((e) => e.getClientRects().length > 0);
      if (!el) { missing.push(sel); return; }
      add(sel, parse(getComputedStyle(el).color), background(el));
    });
    // コードの色分け: 使われている色をすべて確かめる
    const seen = new Set();
    document.querySelectorAll('.mdv-code pre span').forEach((span) => {
      const color = getComputedStyle(span).color;
      const key = span.className + ' ' + color;
      if (seen.has(key)) return;
      seen.add(key);
      add('コード ' + span.className, parse(color), background(span));
    });
    // 検索欄の入力例（プレースホルダー）
    const input = document.querySelector('.mdv-search-input');
    if (input && input.getClientRects().length) add('検索欄の入力例', parse(getComputedStyle(input, '::placeholder').color), background(input));
    // 図: 文字の色と、その下にある図形の色
    document.querySelectorAll('.mdv-mermaid .nodeLabel').forEach((label, i) => {
      const node = label.closest('.node');
      const shape = node && node.querySelector('rect, polygon, circle, path');
      if (!shape) return;
      const fill = parse(getComputedStyle(shape).fill);
      if (fill) add('図のノード ' + i, parse(getComputedStyle(label).color), over(fill, background(label)));
    });
    document.querySelectorAll('.mdv-mermaid .edgeLabel p, .mdv-mermaid .edgeLabel span').forEach((label, i) => {
      if (label.textContent.trim()) add('図の線のラベル ' + i, parse(getComputedStyle(label).color), background(label));
    });
    return { list: out, missing: missing };
  };

  async function collect(page) {
    const all = [];
    const missing = new Set();
    const merge = async (state) => {
      const r = await page.evaluate(measure);
      r.list.forEach((x) => all.push([state + ' / ' + x[0], x[1]]));
      return r.missing;
    };
    const found = new Set();
    const track = (list, miss) => { list.forEach((s) => { if (!miss.includes(s)) found.add(s); }); };
    const states = [];
    const step = async (name) => { const miss = await merge(name); states.push(miss); };
    await step('開始画面');
    await loadFolder(page, fixture('site'));
    await waitIndexed(page);
    await step('文書');
    await goTo(page, '#/syntax.md', '記法');
    await page.waitForSelector('.mdv-mermaid svg');
    await page.waitForSelector('.mdv-mermaid-error');
    await page.evaluate(() => document.fonts.ready);
    await step('記法');
    await page.fill('.mdv-search-input', '固有語');
    await page.waitForSelector('.mdv-search-item');
    await step('検索');
    await page.click('.mdv-search-item');
    await page.waitForSelector('mark.mdv-hit');
    await step('検索語の強調');
    await openMenu(page);
    await step('メニュー');
    await page.keyboard.press('Escape');
    await clickMenu(page, 'menuExport');
    await page.waitForSelector('dialog.mdv-dialog-export[open]');
    await page.waitForFunction(() => !document.querySelector('.mdv-export-run').disabled);
    await step('書き出し');
    await page.click('.mdv-export-run');
    await page.waitForSelector('.mdv-toast');
    await step('通知');
    await goTo(page, '#/nothing.md');
    await page.waitForSelector('.mdv-empty');
    await step('見つからない');
    await loadFolder(page, fixture('a11y'));
    await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2);
    await page.waitForFunction(() => window.MDV.app.state.pendingCode === null);
    await step('すべての表示部品');
    await loadFolder(page, fixture('nav'));
    await page.waitForSelector('.mdv-sidenav a');
    await step('カスタムナビ');
    // 大きすぎる文書の表示（変換せずにテキストで表示し、その旨を知らせる）
    await page.evaluate(() => { window.MDV.core.LIMITS.maxDocBytes = 10; });
    await loadFolder(page, fixture('single'));
    await page.waitForSelector('.mdv-notice:not([hidden])');
    await step('大きすぎる文書');
    // どの状態でも見つからなかった対象は、確認漏れとして扱う
    const never = states.reduce((acc, miss) => acc.filter((s) => miss.includes(s)), states[0] || []);
    track([], []);
    return { all, never, missing, found };
  }

  for (const scheme of ['light', 'dark']) {
    test(`文字と背景のコントラスト比が 4.5:1 以上（${scheme === 'light' ? 'ライト' : 'ダーク'}）`, async (t) => {
      const { page, context } = await openPage(browser, { colorScheme: scheme, viewport: { width: 1440, height: 900 } });
      try {
        const r = await collect(page);
        // 目次の折りたたみ（狭い画面用）は別に確認する
        assert.deepEqual(r.never.filter((s) => s !== '.mdv-toc-inline summary'), [], '確認の対象がすべて画面に現れている');
        const low = r.all.filter((x) => x[1] < 4.5);
        assert.deepEqual(low, [], 'コントラスト比が 4.5:1 未満の組み合わせ');
        const min = r.all.reduce((a, b) => (b[1] < a[1] ? b : a));
        t.diagnostic(`${r.all.length} 件を確認。最小は ${min[1]}:1（${min[0]}）`);
        assert.ok(r.all.length > 120);
        // 自動検査（axe）が判定を保留する数式・図・コードの色も、確認の対象に入っている
        for (const key of ['図のノード', '図の線のラベル', 'コード hljs-keyword', 'コード hljs-comment', 'コード hljs-string', '.katex', '検索欄の入力例']) {
          assert.ok(r.all.some((x) => x[0].includes(key)), `${key} を確認している`);
        }
      } finally {
        await context.close();
      }
    });
  }

  test('狭い画面の折りたたみ目次と、印刷時の配色', async () => {
    await withPage(browser, { viewport: { width: 900, height: 800 }, colorScheme: 'dark' }, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const r = await page.evaluate(measure);
      const toc = r.list.find((x) => x[0] === '.mdv-toc-inline summary');
      assert.ok(toc && toc[1] >= 4.5, `折りたたみ目次: ${toc && toc[1]}`);
      await page.emulateMedia({ media: 'print' });
      const printed = await page.evaluate(measure);
      const low = printed.list.filter((x) => x[1] < 4.5);
      assert.deepEqual(low, [], '印刷時（常にライト配色）');
    });
  });
});

describe('キーボードだけで操作できる', () => {
  test('Tab の順序: 本文へ移動 → ヘッダー → サイドバー → 本文', async () => {
    // ページを開いた直後の最初の Tab は「本文へ移動」
    await withPage(browser, async ({ page }) => {
      await page.keyboard.press('Tab');
      assert.equal(await active(page), 'mdv-skip');
      assert.ok(await page.isVisible('.mdv-skip'), 'フォーカスすると見える');
      assert.equal(await page.textContent('.mdv-skip'), '本文へ移動');
      await page.keyboard.press('Enter');
      assert.equal(await active(page), 'mdv-main');
      await page.keyboard.press('Tab');
      assert.equal(await active(page), 'mdv-open-folder', '開始画面では、次が「フォルダを開く」');
      await page.keyboard.press('Tab');
      assert.equal(await active(page), 'mdv-open-files');
    });
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      // 文書の表示後は本文にフォーカスがあるので、先頭の「本文へ移動」から順に確かめる
      const first = await page.evaluate(() => {
        const el = document.querySelector('a[href], button, input:not([tabindex="-1"]), [tabindex="0"]');
        return el.className;
      });
      assert.equal(first, 'mdv-skip', '文書の中で最初にフォーカスできるのは「本文へ移動」');
      await page.focus('.mdv-skip');
      const order = [];
      for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); order.push(await active(page)); }
      assert.deepEqual(order.slice(0, 5), ['mdv-btn-sidebar', 'mdv-title', 'mdv-search-input', 'mdv-btn-theme', 'mdv-btn-menu']);
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.mdv-sidebar')), true, 'ヘッダーの次はサイドバーの文書一覧');
      // 「本文へ移動」を使うと、サイドバーを飛ばして本文へ移る
      await page.focus('.mdv-skip');
      await page.keyboard.press('Enter');
      assert.equal(await active(page), 'mdv-main');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.mdv-main')), true);
    });
  });

  test('メニュー: Enter・↓ で開き、矢印・Home・End で移動、Esc・Tab で閉じる', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.focus('.mdv-btn-menu');
      await page.keyboard.press('Enter');
      await page.waitForSelector('.mdv-menu:not([hidden])');
      assert.equal(await page.getAttribute('.mdv-btn-menu', 'aria-expanded'), 'true');
      assert.equal(await active(page), 'menuOpenFolder');
      await page.keyboard.press('ArrowDown');
      assert.equal(await active(page), 'menuOpenFiles');
      await page.keyboard.press('End');
      assert.equal(await active(page), 'menuAbout');
      await page.keyboard.press('ArrowDown');
      assert.equal(await active(page), 'menuOpenFolder', '最後の次は最初へ戻る');
      await page.keyboard.press('ArrowUp');
      assert.equal(await active(page), 'menuAbout');
      await page.keyboard.press('Home');
      assert.equal(await active(page), 'menuOpenFolder');
      await page.keyboard.press('Escape');
      assert.ok(await page.isHidden('.mdv-menu'));
      assert.equal(await active(page), 'mdv-btn-menu', '閉じるとボタンへ戻る');
      assert.equal(await page.getAttribute('.mdv-btn-menu', 'aria-expanded'), 'false');
      // ↓ でも開く。Tab で外へ出ると閉じる
      await page.keyboard.press('ArrowDown');
      await page.waitForSelector('.mdv-menu:not([hidden])');
      await page.keyboard.press('Tab');
      assert.ok(await page.isHidden('.mdv-menu'));
      assert.notEqual(await active(page), 'body');
      // 項目を選ぶ（チェック項目の状態が伝わる）
      await page.focus('.mdv-btn-menu');
      await page.keyboard.press('Enter');
      assert.equal(await page.getAttribute('.mdv-menu-item[data-action="menuExternalImages"]', 'role'), 'menuitemcheckbox');
      assert.equal(await page.getAttribute('.mdv-menu-item[data-action="menuExternalImages"]', 'aria-checked'), 'false');
      for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
      assert.equal(await active(page), 'menuLanguage');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      assert.equal(await active(page), 'mdv-btn-menu', '選んだあともフォーカスを失わない');
      assert.equal(await page.getAttribute('.mdv-btn-menu', 'aria-label'), 'Menu');
    });
  });

  test('ダイアログ: 開くと中へ、Tab は中だけを巡り、Esc で閉じて元のボタンへ戻る', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.focus('.mdv-btn-menu');
      await page.keyboard.press('Enter');
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog.mdv-dialog-about[open]');
      assert.equal(await active(page), 'mdv-about-close');
      const label = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return document.getElementById(d.getAttribute('aria-labelledby')).textContent; });
      assert.equal(label, 'ライセンスとバージョン');
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        const where = await page.evaluate(() => (document.activeElement === document.body || document.activeElement.closest('dialog') ? 'dialog' : 'page'));
        assert.equal(where, 'dialog', 'フォーカスがダイアログの外へ出ない');
      }
      await page.keyboard.press('Escape');
      await page.waitForSelector('dialog.mdv-dialog-about', { state: 'detached' });
      assert.equal(await active(page), 'mdv-btn-menu');
      // 書き出しダイアログ: 入力欄から始まり、Enter で実行、キャンセルも選べる
      await page.keyboard.press('Enter');
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
      assert.equal(await active(page), 'menuExport');
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog.mdv-dialog-export[open]');
      assert.equal(await active(page), 'mdv-export-title');
      await page.keyboard.press('Escape');
      await page.waitForSelector('dialog.mdv-dialog-export', { state: 'detached' });
      assert.equal(await active(page), 'mdv-btn-menu');
    });
  });

  test('文書一覧: Enter で開くと本文へフォーカスが移る。フォルダは Enter で開閉する', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      await page.focus('.mdv-side-tree a:has-text("syntax")');
      await page.keyboard.press('Enter');
      await waitHeading(page, '記法');
      assert.equal(await active(page), 'mdv-main', '文書を切り替えたら本文へ');
      const summary = page.locator('.mdv-side-tree details[data-path="guide"] > summary');
      await summary.focus();
      const before = await page.evaluate(() => document.querySelector('.mdv-side-tree details[data-path="guide"]').open);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.querySelector('.mdv-side-tree details[data-path="guide"]').open), !before);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.querySelector('.mdv-side-tree details[data-path="guide"]').open), before);
      // 目次のリンクも Enter で移動できる
      await page.focus('.mdv-toc .mdv-toc-link >> nth=2');
      const target = await page.evaluate(() => document.activeElement.getAttribute('href'));
      await page.keyboard.press('Enter');
      await page.waitForFunction((h) => location.hash === h, target);
    });
  });

  test('本文: コピーのボタン・横に長い表・折りたたみを操作できる', async () => {
    await withPage(browser, async ({ page }) => {
      await openSyntax(page);
      await page.focus('.mdv-copy');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.mdv-copy').textContent === 'コピーしました');
      // 横にはみ出す表は、フォーカスして矢印キーでスクロールできる
      const wide = page.locator('.mdv-table-wrap[tabindex="0"]');
      assert.equal(await wide.count(), 1, 'はみ出している表だけがフォーカスの対象になる');
      assert.equal(await wide.getAttribute('role'), 'group');
      assert.equal(await wide.getAttribute('aria-label'), '表（横にスクロールできます）');
      assert.ok((await page.locator('.mdv-table-wrap').count()) > 1);
      await wide.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.mdv-table-wrap[tabindex="0"]').scrollLeft > 0);
      // 文書中の <details> も Enter で開閉できる
      const det = page.locator('.mdv-prose details > summary').first();
      await det.focus();
      const open = () => page.evaluate(() => document.querySelector('.mdv-prose details').open);
      const was = await open();
      await page.keyboard.press('Enter');
      assert.equal(await open(), !was);
      // タスクリストのチェックボックスは操作できない表示専用で、状態が名前で伝わる
      const boxes = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-prose input[type="checkbox"]')).map((b) => [b.disabled, b.checked, b.getAttribute('aria-label')]));
      assert.deepEqual(boxes, [[true, false, '未完了の項目'], [true, true, '完了した項目']]);
    });
  });

  test('画面の幅が変わったら、はみ出しているかどうかを判定し直す', async () => {
    await withPage(browser, { viewport: { width: 390, height: 800 } }, async ({ page }) => {
      await loadFolder(page, fixture('a11y'));
      const focusable = () => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-table-wrap')).map((w) => w.getAttribute('tabindex')));
      assert.deepEqual(await focusable(), [null, '0'], '狭い画面では、中くらいの表がはみ出す');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForFunction(() => document.querySelectorAll('.mdv-table-wrap[tabindex]').length === 0);
      assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-table-wrap')).map((w) => [w.getAttribute('role'), w.getAttribute('aria-label')])), [[null, null], [null, null]]);
      await page.setViewportSize({ width: 390, height: 800 });
      await page.waitForFunction(() => document.querySelectorAll('.mdv-table-wrap[tabindex="0"]').length === 1);
    });
  });

  test('横に長いコードも、フォーカスしてスクロールできる', async () => {
    await withPage(browser, async ({ page }) => {
      await page.evaluate(() => {
        const dt = new DataTransfer();
        const longLine = 'const veryLongLine = "' + 'あいうえお'.repeat(80) + '";';
        dt.items.add(new File(['# 長い行\n\n```js\n' + longLine + '\n```\n\n```js\nconst short = 1;\n```\n\n$$\n' + 'a + '.repeat(120) + 'b\n$$\n'], 'long.md', { type: 'text/markdown' }));
        const input = document.querySelector('.mdv-input-files');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await waitHeading(page, '長い行');
      await page.waitForSelector('.katex');
      await page.waitForFunction(() => document.querySelectorAll('.mdv-code pre[tabindex="0"]').length === 1);
      const info = await page.evaluate(() => Array.from(document.querySelectorAll('.mdv-code pre')).map((p) => [p.getAttribute('tabindex'), p.getAttribute('role'), p.getAttribute('aria-label')]));
      assert.deepEqual(info, [['0', 'group', 'コード（横にスクロールできます）'], [null, null, null]]);
      assert.deepEqual((await audit(page)).violations, []);
    });
  });

  test('サイドバーのタブ: 左右の矢印で切り替えられる', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('nav'));
      await page.waitForSelector('.mdv-sidenav a');
      const tabs = () => page.evaluate(() => Array.from(document.querySelectorAll('.mdv-side-tab')).map((b) => b.getAttribute('aria-selected')));
      assert.equal(await page.getAttribute('.mdv-side-tabs', 'role'), 'tablist');
      assert.equal(await page.getAttribute('#mdv-sidenav', 'role'), 'tabpanel');
      assert.equal(await page.getAttribute('#mdv-sidenav', 'aria-labelledby'), 'mdv-tab-nav');
      assert.equal(await page.getAttribute('#mdv-tab-files', 'aria-controls'), 'mdv-side-tree');
      await page.focus('.mdv-side-tab[data-tab="nav"]');
      await page.keyboard.press('ArrowRight');
      assert.deepEqual(await tabs(), ['false', 'true']);
      assert.equal(await active(page), 'mdv-tab-files');
      assert.ok(await page.isVisible('.mdv-side-tree'));
      await page.keyboard.press('ArrowLeft');
      assert.deepEqual(await tabs(), ['true', 'false']);
      await page.keyboard.press('End');
      assert.deepEqual(await tabs(), ['false', 'true']);
      await page.keyboard.press('Home');
      assert.deepEqual(await tabs(), ['true', 'false']);
    });
    // カスタムナビがなければ、タブもタブパネルの役割も出さない
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      assert.ok(await page.isHidden('.mdv-side-tabs'));
      assert.equal(await page.getAttribute('#mdv-side-tree', 'role'), null);
    });
  });

  test('フォーカスの位置が見える', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('a11y'));
      await page.waitForFunction(() => document.querySelectorAll('.mdv-mermaid svg').length === 2);
      await page.focus('.mdv-skip');
      const seen = [];
      // ページの最後まで Tab で進み、止まった要素すべてでフォーカスの枠が見えることを確かめる
      for (let i = 0; i < 80; i++) {
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
          const shadow = !!cs.boxShadow && cs.boxShadow !== 'none';
          const r = el.getBoundingClientRect();
          return { what: el.nodeName.toLowerCase() + '.' + String(el.getAttribute('class') || '').split(' ')[0], visible: ring || shadow, rect: r.width > 0 && r.height > 0 };
        });
        if (!info) break;
        seen.push(info);
        await page.keyboard.press('Tab');
      }
      const hidden = seen.filter((x) => !x.visible || !x.rect).map((x) => x.what);
      assert.deepEqual(hidden, [], 'フォーカスの枠が出ない要素');
      const kinds = Array.from(new Set(seen.map((x) => x.what)));
      for (const k of ['a.mdv-skip', 'button.mdv-iconbtn', 'input.mdv-search-input', 'a.mdv-anchor', 'button.mdv-copy', 'summary.', 'a.mdv-toc-link']) {
        assert.ok(kinds.includes(k), `${k} を確認している（確認したもの: ${kinds.join(', ')}）`);
      }
      assert.ok(seen.length > 30);
    });
  });
});

describe('動きを減らす設定・読み上げのための情報', () => {
  test('「視差効果を減らす」設定では、アニメーションと滑らかなスクロールを使わない', async () => {
    const durations = () => Array.from(document.querySelectorAll('.mdv-app, .mdv-app *')).reduce((acc, el) => {
      const cs = getComputedStyle(el);
      const active = (v) => v.split(',').some((x) => parseFloat(x) > 0);
      if (active(cs.transitionDuration)) acc.transitions++;
      if (cs.animationName !== 'none' && active(cs.animationDuration)) acc.animations++;
      return acc;
    }, { transitions: 0, animations: 0, scroll: getComputedStyle(document.documentElement).scrollBehavior });
    const run = async (reducedMotion) => {
      const context = await browser.newContext({ reducedMotion, locale: 'ja-JP', viewport: { width: 390, height: 800 } });
      try {
        const page = await context.newPage();
        await page.addInitScript(() => { Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true, writable: true }); });
        await page.goto((await import('../helpers/e2e.mjs')).VIEWER_URL);
        await page.waitForSelector('.mdv-app');
        await loadFolder(page, fixture('site'));
        await page.click('.mdv-btn-sidebar');
        return await page.evaluate(durations);
      } finally {
        await context.close();
      }
    };
    const normal = await run('no-preference');
    const reduced = await run('reduce');
    assert.ok(normal.transitions > 0, '通常は切り替えの動きがある（確認が意味を持つこと）');
    assert.deepEqual(reduced, { transitions: 0, animations: 0, scroll: 'auto' });
  });

  test('画面の区分（ランドマーク）と名前', async () => {
    await withPage(browser, async ({ page }) => {
      await loadFolder(page, fixture('site'));
      const r = await page.evaluate(() => ({
        banner: document.querySelectorAll('header.mdv-header').length,
        main: document.querySelectorAll('main').length,
        navs: Array.from(document.querySelectorAll('nav')).map((n) => n.getAttribute('aria-label')),
        h1: Array.from(document.querySelectorAll('main h1')).filter((h) => h.getClientRects().length > 0).length, // 表示されている h1 は 1 つ
        lang: document.documentElement.lang,
        title: document.title,
        live: document.querySelector('.mdv-toasts').getAttribute('aria-live'),
        search: ['role', 'aria-label', 'aria-controls', 'aria-expanded', 'aria-autocomplete'].map((a) => document.querySelector('.mdv-search-input').getAttribute(a)),
        current: Array.from(document.querySelectorAll('[aria-current]')).map((e) => e.getAttribute('aria-current')).sort(),
        hiddenInputs: Array.from(document.querySelectorAll('input[type="file"]')).every((i) => i.getAttribute('tabindex') === '-1' && i.getAttribute('aria-hidden') === 'true'),
        icons: Array.from(document.querySelectorAll('.mdv-header svg, .mdv-sidebar svg')).every((s) => s.getAttribute('aria-hidden') === 'true')
      }));
      assert.deepEqual(r, {
        banner: 1, main: 1, navs: ['文書一覧', 'このページの目次'], h1: 1, lang: 'ja', title: 'テスト用サイト - site', live: 'polite',
        search: ['combobox', '文書を検索', 'mdv-search-list', 'false', 'list'],
        current: ['location', 'page'], hiddenInputs: true, icons: true
      });
      // 検索結果の件数は、読み上げの対象になる
      await page.fill('.mdv-search-input', '固有語');
      await page.waitForSelector('.mdv-search-item');
      assert.equal(await page.getAttribute('.mdv-search-foot [role="status"]', 'role'), 'status');
      assert.match(await page.textContent('.mdv-search-foot [role="status"]'), /^\d+ 件$/);
      assert.equal(await page.getAttribute('#mdv-search-list', 'aria-label'), '検索結果');
      assert.equal(await page.getAttribute('.mdv-search-input', 'aria-expanded'), 'true');
      const options = await page.evaluate(() => Array.from(document.querySelectorAll('#mdv-search-list > *')).map((o) => [o.getAttribute('role'), o.id, o.getAttribute('aria-selected')]));
      assert.ok(options.length >= 5 && options.every((o) => o[0] === 'option' && /^mdv-search-opt-\d+$/.test(o[1])));
      assert.equal(options[0][2], 'true');
      assert.equal(await heading(page), 'テスト用サイト');
    });
  });
});
