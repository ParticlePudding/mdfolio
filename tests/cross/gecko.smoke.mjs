#!/usr/bin/env node
// Checks on Gecko (Firefox's engine). Uses geckodriver and a Firefox-family browser executable.
//   MDFOLIO_GECKO_BINARY   browser executable (e.g. /usr/bin/firefox)
//   MDFOLIO_GECKODRIVER    geckodriver (default: geckodriver on PATH)
//   Run: MDFOLIO_GECKO_BINARY=/usr/bin/firefox node tests/cross/gecko.smoke.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Driver, freePort, waitFor } from './webdriver.mjs';
import { runSmoke, ROOT } from './smoke.mjs';

const binary = process.env.MDFOLIO_GECKO_BINARY || ['/usr/bin/firefox', '/usr/bin/firefox-esr', '/opt/gecko/zen/zen'].find((p) => fs.existsSync(p));
const driverPath = process.env.MDFOLIO_GECKODRIVER || ['/usr/bin/geckodriver', '/usr/local/bin/geckodriver', '/opt/gecko/geckodriver'].find((p) => fs.existsSync(p));
if (!binary || !driverPath) {
  console.log('No Firefox-family browser or geckodriver found; skipping.');
  process.exit(2);
}

const port = await freePort();
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfolio-gecko-home-'));
const wd = spawn(driverPath, ['--port', String(port), '--host', '127.0.0.1'], { env: { ...process.env, HOME: home, MOZ_HEADLESS: '1', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
wd.stdout.on('data', (x) => { log += x; });
wd.stderr.on('data', (x) => { log += x; });

const d = new Driver('http://127.0.0.1:' + port);
let results = [];
let version = '';
let name = '';
try {
  await waitFor(async () => (await fetch(d.base + '/status')).ok, 15000, 'geckodriver startup');
  const session = await d.start({
    browserName: 'firefox',
    'moz:firefoxOptions': {
      binary,
      args: ['-headless', '-width', '1280', '-height', '900'],
      prefs: { 'intl.accept_languages': 'ja,en', 'browser.shell.checkDefaultBrowser': false, 'datareporting.policy.dataSubmissionEnabled': false, 'app.update.enabled': false }
    }
  });
  version = session.capabilities.browserVersion;
  name = session.capabilities.browserName;
  const ua = await d.exec(() => navigator.userAgent);
  console.log(`Gecko ${version} (${path.basename(binary)}) ${ua}`);
  await d.setSize(1280, 900).catch(() => {});
  const shots = async (label) => {
    const dir = path.join(ROOT, 'test-results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `cross-gecko-${label}.png`), await d.screenshot());
  };
  results = await runSmoke(d, 'Gecko ' + version, console.log, shots);
} catch (e) {
  console.log('Could not run: ' + e.message);
  console.log(log.slice(-2500));
  results.push({ name: 'run', ok: false, detail: e.message });
} finally {
  await d.quit();
  wd.kill();
}

const failed = results.filter((r) => !r.ok);
const skipped = results.filter((r) => r.skipped);
const out = path.join(ROOT, 'test-results');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'cross-gecko.json'), JSON.stringify({ engine: 'Gecko', version, browser: path.basename(binary), results }, null, 2) + '\n');
console.log(`\n${results.length} items: ${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} unverified`);
process.exit(failed.length ? 1 : 0);
