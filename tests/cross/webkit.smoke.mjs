#!/usr/bin/env node
// Checks on WebKit (the same engine family as Safari). Uses WebKitGTK and WebKitWebDriver.
//   Ubuntu: apt-get install webkit2gtk-driver libwebkit2gtk-4.1-0 xvfb
//   Run:    node tests/cross/webkit.smoke.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Driver, freePort, waitFor } from './webdriver.mjs';
import { runSmoke, ROOT } from './smoke.mjs';

const MINIBROWSER = ['/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser', '/usr/lib/aarch64-linux-gnu/webkit2gtk-4.1/MiniBrowser', '/usr/libexec/webkit2gtk-4.1/MiniBrowser'].find((p) => fs.existsSync(p));
if (!MINIBROWSER || !fs.existsSync('/usr/bin/WebKitWebDriver')) {
  console.log('WebKitGTK (MiniBrowser / WebKitWebDriver) not found; skipping.');
  process.exit(2);
}

const display = ':' + (90 + Math.floor(Math.random() * 9));
const xvfb = process.env.DISPLAY ? null : spawn('Xvfb', [display, '-screen', '0', '1440x1000x24', '-nolisten', 'tcp'], { stdio: 'ignore' });
if (xvfb) await new Promise((r) => setTimeout(r, 800));
const port = await freePort();
const env = {
  ...process.env, DISPLAY: process.env.DISPLAY || display, LANG: 'ja_JP.UTF-8', LC_ALL: 'C.UTF-8', LANGUAGE: 'ja',
  WEBKIT_DISABLE_COMPOSITING_MODE: '1', WEBKIT_DISABLE_DMABUF_RENDERER: '1', LIBGL_ALWAYS_SOFTWARE: '1', GDK_BACKEND: 'x11', NO_AT_BRIDGE: '1'
};
const wd = spawn('WebKitWebDriver', ['--port=' + port, '--host=127.0.0.1'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
wd.stdout.on('data', (x) => { log += x; });
wd.stderr.on('data', (x) => { log += x; });

const d = new Driver('http://127.0.0.1:' + port);
let results = [];
let version = '';
try {
  await waitFor(async () => (await fetch(d.base + '/status')).ok, 15000, 'WebKitWebDriver startup');
  const session = await d.start({ browserName: 'MiniBrowser', 'webkitgtk:browserOptions': { binary: MINIBROWSER, args: ['--automation'] } });
  version = session.capabilities.browserVersion;
  await d.setSize(1280, 900);
  console.log(`WebKitGTK ${version} (MiniBrowser)`);
  const shots = async (name) => {
    const dir = path.join(ROOT, 'test-results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `cross-webkit-${name}.png`), await d.screenshot());
  };
  results = await runSmoke(d, 'WebKitGTK ' + version, console.log, shots);
} catch (e) {
  console.log('Could not run: ' + e.message);
  console.log(log.slice(-1500));
  results.push({ name: 'run', ok: false, detail: e.message });
} finally {
  await d.quit();
  wd.kill();
  if (xvfb) xvfb.kill();
}

const failed = results.filter((r) => !r.ok);
const skipped = results.filter((r) => r.skipped);
const out = path.join(ROOT, 'test-results');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'cross-webkit.json'), JSON.stringify({ engine: 'WebKitGTK', version, results }, null, 2) + '\n');
console.log(`\n${results.length} items: ${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} unverified`);
process.exit(failed.length ? 1 : 0);
