// Performance (NFR-2): the spec's target values are used directly as pass criteria. Measurements are saved to test-results/perf.json.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchBrowser, withPage, openPage, loadFolder, waitIndexed, tmpDir, writeTree, mockOptions, ROOT, VIEWER } from '../helpers/e2e.mjs';

let browser;
const results = { machine: `${os.cpus().length} cores / ${os.cpus()[0].model.trim()}`, viewerBytes: fs.statSync(VIEWER).size, measured: {} };
before(async () => { browser = await launchBrowser(); });
after(async () => {
  await browser.close();
  const dir = path.join(ROOT, 'test-results');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'perf.json'), JSON.stringify(results, null, 2) + '\n');
});

const median = (list) => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];
const round = (n) => Math.round(n);

function record(t, key, value, limit, note) {
  results.measured[key] = { ms: round(value), limitMs: limit, note: note || '' };
  t.diagnostic(`${key}: ${round(value)} ms (target: within ${limit} ms)${note ? ' ' + note : ''}`);
  assert.ok(value <= limit, `${key}: ${round(value)} ms exceeds the ${limit} ms target`);
}

// A document with realistic body content (headings, paragraphs, lists, tables, code)
const SECTION = [
  '## 概要 {n}',
  '',
  'この節では、文書管理の手順 {n} について説明します。**重要な点**は、手順を省略しないことです。詳しくは[関連資料](other.md)を参照してください。',
  '',
  '- 手順 A: 入力内容を確認する',
  '- 手順 B: `config.yaml` を更新する',
  '- 手順 C: 結果を記録する',
  '',
  '| 項目 | 値 | 備考 |',
  '| --- | --- | --- |',
  '| 上限 | {n} | 単位は件 |',
  '| 下限 | 0 | 既定値 |',
  '',
  '```js',
  'function step{n}(input) {',
  '  return input.filter((x) => x.enabled).map((x) => x.value * {n});',
  '}',
  '```',
  '',
  '> 補足: 数値は例です。English words are mixed in to exercise the tokenizer.',
  ''
].join('\n');

function bigDocument(bytes) {
  const parts = ['# 大きな文書\n'];
  let size = 0;
  for (let n = 1; size < bytes; n++) {
    const s = SECTION.replace(/\{n\}/g, String(n));
    parts.push(s);
    size += Buffer.byteLength(s) + 1;
  }
  return parts.join('\n');
}

const BODY = SECTION.replace(/\{n\}/g, '7') + '\n' + SECTION.replace(/\{n\}/g, '8');

describe('Performance (NFR-2)', () => {
  test('start screen is shown within 1 second of startup', async (t) => {
    const times = [];
    const paints = [];
    for (let i = 0; i < 7; i++) {
      const init = () => {
        const obs = new MutationObserver(() => {
          const app = document.querySelector('.mdv-app[data-view="welcome"] .mdv-open-folder');
          if (app && window.__ready === undefined) { window.__ready = performance.now(); obs.disconnect(); }
        });
        obs.observe(document, { childList: true, subtree: true });
      };
      const { page, context } = await openPage(browser, { init });
      await page.waitForFunction(() => window.__ready !== undefined);
      await page.waitForFunction(() => performance.getEntriesByType('paint').some((e) => e.name === 'first-contentful-paint'));
      times.push(await page.evaluate(() => window.__ready));
      paints.push(await page.evaluate(() => performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint').startTime));
      await context.close();
    }
    record(t, 'Startup (until the start screen is built)', median(times), 1000, `Median of 7 runs. Max ${round(Math.max(...times))} ms`);
    record(t, 'Startup (until first paint)', median(paints), 1000, `Median of 7 runs. Max ${round(Math.max(...paints))} ms`);
  });

  test('shows a 1 MB document within 3 seconds', async (t) => {
    const text = bigDocument(1024 * 1024);
    const bytes = Buffer.byteLength(text);
    assert.ok(bytes >= 1024 * 1024 && bytes < 1.1 * 1024 * 1024);
    const dir = writeTree(tmpDir(), { 'README.md': '# ホーム\n\n[大きな文書](big.md)\n', 'big.md': text });
    const times = [];
    const complete = [];
    for (let i = 0; i < 5; i++) {
      await withPage(browser, async ({ page }) => {
        await loadFolder(page, dir);
        await waitIndexed(page);
        const t0 = Date.now();
        const ms = await page.evaluate(() => new Promise((resolve) => {
          const t0 = performance.now();
          const check = () => {
            const h1 = document.querySelector('.mdv-prose h1');
            if (h1 && h1.textContent.indexOf('大きな文書') === 0 && document.querySelectorAll('.mdv-prose h2').length > 1000) {
              // Include painting
              requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0)));
              return;
            }
            requestAnimationFrame(check);
          };
          location.hash = '#/big.md';
          check();
        }));
        times.push(ms);
        assert.ok((await page.locator('.mdv-prose table').count()) > 1000);
        // Code highlighting continues after the document is shown
        await page.waitForFunction(() => window.MDV.app.state.pendingCode === null);
        complete.push(Date.now() - t0);
        assert.ok((await page.locator('.mdv-prose .hljs-keyword').count()) > 3000, 'all code blocks are highlighted');
      });
    }
    const sections = text.split('\n## ').length - 1;
    record(t, '1 MB document: display', median(times), 3000, `${(bytes / 1024 / 1024).toFixed(2)} MB, ${sections} each of headings, tables and code blocks. Median of 5 runs. Max ${round(Math.max(...times))} ms`);
    assert.ok(Math.max(...times) <= 3000, `the maximum is also within the target (${round(Math.max(...times))} ms)`);
    results.measured['1 MB document: display'].maxMs = round(Math.max(...times));
    results.measured['1 MB document: until code highlighting completes (reference)'] = { ms: round(median(complete)), limitMs: null, note: 'Processed bit by bit after display without blocking interaction. No target value' };
    t.diagnostic(`1 MB document: until code highlighting completes (reference): ${round(median(complete))} ms`);
  });

  test('1,000 documents: tree within 2 s, indexing within 10 s, search response within 0.3 s (folder handle)', async (t) => {
    const spec = { name: 'thousand', files: { 'README.md': '# 千の文書\n' }, generate: [{ count: 999, prefix: 'docs/section-', text: '# 文書', body: BODY }] };
    await withPage(browser, mockOptions(spec), async ({ page }) => {
      const m = await page.evaluate(() => new Promise((resolve) => {
        const t0 = performance.now();
        const out = {};
        const check = () => {
          const s = window.MDV.app.state.set;
          if (out.tree === undefined && s && document.querySelectorAll('.mdv-side-tree a').length >= 1000 && document.querySelector('.mdv-prose h1')) out.tree = performance.now() - t0;
          if (s && !s.indexing && s.indexed === s.docs.length && s.docs.length === 1000) { out.index = performance.now() - t0; resolve(out); return; }
          setTimeout(check, 10);
        };
        document.querySelector('.mdv-open-folder').click();
        check();
      }));
      record(t, '1,000 documents: tree display', m.tree, 2000, 'From "Open folder" until the list and the first document are shown');
      record(t, '1,000 documents: indexing', m.index, 10000, 'From "Open folder" until the full-text search index is built');
      const search = (q) => page.evaluate((query) => new Promise((resolve) => {
        const input = document.querySelector('.mdv-search-input');
        const list = document.getElementById('mdv-search-list');
        const before = list.innerHTML;
        const t0 = performance.now();
        const check = () => {
          const foot = document.querySelector('.mdv-search-foot');
          if (list.innerHTML !== before && foot && foot.textContent) { resolve({ ms: performance.now() - t0, foot: foot.textContent, items: list.children.length }); return; }
          requestAnimationFrame(check);
        };
        input.focus();
        input.value = query;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        check();
      }), q);
      const runs = [];
      for (const q of ['手順 確認', 'config.yaml', 'tokenizer english', '文書 500', '上限']) {
        const r = await search(q);
        assert.ok(r.items > 0, `"${q}" has results`);
        runs.push(r.ms);
      }
      record(t, '1,000 documents: search response', Math.max(...runs), 300, `From input until results are shown (including the 150 ms input debounce). Max over 5 search terms. Median ${round(median(runs))} ms`);
    });
  });

  test('1,000 documents: opening real files via <input>', async (t) => {
    const files = { 'README.md': '# 千の文書\n' };
    for (let i = 0; i < 999; i++) files[`docs/g${String(i % 20).padStart(2, '0')}/section-${String(i).padStart(4, '0')}.md`] = `# 文書 ${i}\n\n${BODY}`;
    const dir = writeTree(tmpDir(), files);
    await withPage(browser, async ({ page }) => {
      const t0 = Date.now();
      await page.locator('.mdv-input-dir').setInputFiles(dir);
      await page.waitForFunction(() => document.querySelectorAll('.mdv-side-tree a').length >= 1000 && !!document.querySelector('.mdv-prose h1'));
      const tree = Date.now() - t0;
      await waitIndexed(page);
      const index = Date.now() - t0;
      // This includes the time the test harness takes to hand over the files, so it is for reference only (the same targets are used)
      record(t, '1,000 documents (real files): tree display', tree, 2000, 'Includes the time to hand over the files');
      record(t, '1,000 documents (real files): indexing', index, 10000, 'Includes the time to hand over the files');
      assert.equal(await page.evaluate(() => window.MDV.app.state.set.docs.length), 1000);
    });
  });
});
