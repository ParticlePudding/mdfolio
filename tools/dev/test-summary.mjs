#!/usr/bin/env node
// Runs the tests file by file and records the counts and durations in test-results/summary.json (source data for the test report).
//   node tools/dev/test-summary.mjs [unit|e2e]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const only = process.argv[2] || '';
const out = path.join(ROOT, 'test-results');
fs.mkdirSync(out, { recursive: true });

const groups = [
  ['unit', 'tests/unit', /\.test\.mjs$/],
  ['e2e', 'tests/e2e', /\.e2e\.mjs$/]
].filter((g) => !only || g[0] === only);

const summaryPath = path.join(out, 'summary.json');
const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : { files: {} };
let failed = 0;
for (const [kind, dir, re] of groups) {
  for (const name of fs.readdirSync(path.join(ROOT, dir)).filter((f) => re.test(f)).sort()) {
    const rel = dir + '/' + name;
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', rel], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    const tap = r.stdout + r.stderr;
    fs.writeFileSync(path.join(out, name.replace(/\.mjs$/, '.tap')), tap.split('\n').filter((l) => !/dbus|bluetooth|vaapi|sandbox_linux/.test(l)).join('\n'));
    const num = (key) => Number((new RegExp('^# ' + key + ' (\\d+)', 'm').exec(tap) || [0, 0])[1]);
    const notes = tap.split('\n').filter((l) => /^\s+# (?!Subtest)/.test(l)).map((l) => l.trim().replace(/^# /, ''));
    summary.files[rel] = { kind, tests: num('tests'), pass: num('pass'), fail: num('fail'), skipped: num('skipped'), seconds: Math.round((Date.now() - t0) / 100) / 10, notes };
    failed += num('fail') + (r.status ? 1 : 0) - (num('fail') ? 1 : 0);
    console.log(`${rel.padEnd(34)} ${String(num('pass')).padStart(3)} / ${String(num('tests')).padStart(3)}  ${summary.files[rel].seconds}s${num('fail') ? '  <- has failures' : ''}`);
  }
}
const all = Object.values(summary.files);
summary.total = { tests: all.reduce((a, f) => a + f.tests, 0), pass: all.reduce((a, f) => a + f.pass, 0), fail: all.reduce((a, f) => a + f.fail, 0), skipped: all.reduce((a, f) => a + f.skipped, 0) };
summary.date = new Date().toISOString();
summary.node = process.version;
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
console.log(`Total ${summary.total.pass} / ${summary.total.tests} (failed ${summary.total.fail}, skipped ${summary.total.skipped})`);
process.exit(summary.total.fail || failed ? 1 : 0);
