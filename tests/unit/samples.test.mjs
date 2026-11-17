// Checks for the sample documents (sample-docs/ and the English sample-docs-en/) (SPEC 8.7 PG-4, PG-8)
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

describe('Sample documents', () => {
  test('Japanese and English sets have the same number and placement (folders and extensions) of documents, images and attachments (PG-4)', () => {
    const [ja, en] = SETS.map((s) => walk(path.join(ROOT, s)));
    assert.deepEqual(kinds(en), kinds(ja));
    assert.equal(docsOf(en).length, docsOf(ja).length);
  });

  test('English samples use no Japanese in file or folder names (PG-4)', () => {
    for (const f of walk(path.join(ROOT, 'sample-docs-en'))) assert.match(f, /^[\x20-\x7e]+$/, f);
  });

  test('English samples include the same syntax examples as the Japanese samples (PG-4)', () => {
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

  test('Single-file samples (sample.md and sample.en.md): in-page heading links have targets, and both have the same structure', () => {
    const outline = (f) => {
      const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const html = r.render(text);
      for (const href of r.collectRefs(text).links.filter((x) => x.startsWith('#'))) {
        assert.ok(html.includes(`id="${decodeURIComponent(href.slice(1))}"`), `${f}: no heading for ${href}`);
      }
      return { headings: text.match(/^#{1,3} /gm).map((h) => h.trim()), fences: text.match(/^```\w+$/gm), alerts: text.match(/^> \[!\w+\]/gm) };
    };
    assert.deepEqual(outline('sample.en.md'), outline('sample.md'));
  });

  for (const set of SETS) {
    test(`${set}: all relative links and images point to existing files, and linked headings exist (PG-8)`, () => {
      const dir = path.join(ROOT, set);
      const files = walk(dir);
      let checked = 0;
      for (const f of files.filter((x) => x.endsWith('.md'))) {
        const refs = r.collectRefs(fs.readFileSync(path.join(dir, f), 'utf8'));
        for (const ref of [...refs.links, ...refs.images]) {
          if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('#')) continue;
          const [p, hash] = ref.split('#');
          const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), decodeURIComponent(p)));
          assert.ok(files.includes(target), `${f} → ${ref} (${target} does not exist)`);
          if (hash) {
            const html = r.render(fs.readFileSync(path.join(dir, target), 'utf8'));
            assert.ok(html.includes(`id="${decodeURIComponent(hash)}"`), `${f} → ${ref} (heading #${hash} does not exist)`);
          }
          checked++;
        }
      }
      assert.ok(checked >= 15, `too few links checked: ${checked}`);
    });
  }
});
