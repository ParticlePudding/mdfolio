// 見本文書（sample-docs/ と英語の sample-docs-en/）の確認（SPEC 8.7 PG-4、PG-8）
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, createRenderer } from '../helpers/load.mjs';

const r = createRenderer();
const SETS = ['sample-docs', 'sample-docs-en'];

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}
const docsOf = (files) => files.filter((f) => f.endsWith('.md') && f !== '_sidebar.md');
const kinds = (files) => files.map((f) => path.dirname(f) + '/' + path.extname(f)).sort();

describe('見本文書', () => {
  test('日本語と英語で、文書・画像・添付の数と置き場所（フォルダと拡張子）がそろっている（PG-4）', () => {
    const [ja, en] = SETS.map((s) => walk(path.join(ROOT, s)));
    assert.deepEqual(kinds(en), kinds(ja));
    assert.equal(docsOf(en).length, docsOf(ja).length);
  });

  test('英語の見本は、ファイル名とフォルダ名に日本語を使っていない（PG-4）', () => {
    for (const f of walk(path.join(ROOT, 'sample-docs-en'))) assert.match(f, /^[\x20-\x7e]+$/, f);
  });

  test('英語の見本は、日本語の見本と同じ記法の見本を含む（PG-4）', () => {
    const features = (dir) => {
      const all = docsOf(walk(dir)).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
      return {
        table: /^\|.*\|$/m.test(all), alert: /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/m.test(all),
        alerts: (all.match(/^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gm) || []).length,
        code: (all.match(/^```(js|python|powershell|bash|html|text)$/gm) || []).length,
        mermaid: (all.match(/^```mermaid$/gm) || []).length, math: /\$\$/.test(all),
        footnote: /\[\^\w+\]:/.test(all), details: /<details>/.test(all), frontMatter: /^---\ntitle:/m.test(all),
        task: /^- \[x\]/m.test(all), anchorLink: /\]\([^)]*\.md#[^)]+\)/.test(all)
      };
    };
    const [ja, en] = SETS.map((s) => features(path.join(ROOT, s)));
    assert.deepEqual(en, ja);
  });

  test('1 ファイルの見本（sample.md と sample.en.md）: ページ内の見出しへのリンク先があり、同じ構成である', () => {
    const outline = (f) => {
      const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const html = r.render(text);
      for (const href of r.collectRefs(text).links.filter((x) => x.startsWith('#'))) {
        assert.ok(html.includes(`id="${decodeURIComponent(href.slice(1))}"`), `${f}: ${href} の見出しがない`);
      }
      return { headings: text.match(/^#{1,3} /gm).map((h) => h.trim()), fences: text.match(/^```\w+$/gm), alerts: text.match(/^> \[!\w+\]/gm) };
    };
    assert.deepEqual(outline('sample.en.md'), outline('sample.md'));
  });

  for (const set of SETS) {
    test(`${set}: 相対リンクと画像はすべて実在するファイルを指し、見出しへのリンク先の見出しもある（PG-8）`, () => {
      const dir = path.join(ROOT, set);
      const files = walk(dir);
      let checked = 0;
      for (const f of files.filter((x) => x.endsWith('.md'))) {
        const refs = r.collectRefs(fs.readFileSync(path.join(dir, f), 'utf8'));
        for (const ref of [...refs.links, ...refs.images]) {
          if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('#')) continue;
          const [p, hash] = ref.split('#');
          const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), decodeURIComponent(p)));
          assert.ok(files.includes(target), `${f} → ${ref}（${target} がない）`);
          if (hash) {
            const html = r.render(fs.readFileSync(path.join(dir, target), 'utf8'));
            assert.ok(html.includes(`id="${decodeURIComponent(hash)}"`), `${f} → ${ref}（見出し #${hash} がない）`);
          }
          checked++;
        }
      }
      assert.ok(checked >= 15, `確かめたリンクが少なすぎる: ${checked}`);
    });
  }
});
