// A minimal WebDriver client (to drive other browser engines without extra packages)
import { spawn } from 'node:child_process';
import net from 'node:net';

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on('error', reject);
  });
}

async function waitFor(fn, ms, what) {
  const end = Date.now() + ms;
  let last;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch (e) { last = e; }
    if (Date.now() > end) throw new Error('timed out waiting: ' + what + (last ? ' (' + last.message + ')' : ''));
    await new Promise((r) => setTimeout(r, 100));
  }
}

export class Driver {
  constructor(base) { this.base = base; this.session = null; }

  async call(method, path, body) {
    const res = await fetch(this.base + path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || (json.value && json.value.error)) {
      const v = json.value || {};
      throw new Error(`WebDriver ${method} ${path}: ${v.error || res.status} ${v.message || ''}`);
    }
    return json.value;
  }

  async start(capabilities) {
    const v = await this.call('POST', '/session', { capabilities: { alwaysMatch: capabilities } });
    this.session = v.sessionId;
    this.capabilities = v.capabilities;
    return v;
  }

  s(path) { return '/session/' + this.session + path; }
  goto(url) { return this.call('POST', this.s('/url'), { url }); }
  url() { return this.call('GET', this.s('/url')); }
  title() { return this.call('GET', this.s('/title')); }
  refresh() { return this.call('POST', this.s('/refresh'), {}); }
  setSize(width, height) { return this.call('POST', this.s('/window/rect'), { width, height }); }

  /** Run a function in the page. fn is sent as a string, so pass outside variables through args. */
  exec(fn, ...args) {
    return this.call('POST', this.s('/execute/sync'), { script: 'return (' + fn.toString() + ').apply(null, arguments);', args });
  }

  /** Run a function that returns a Promise and wait for its result. */
  execAsync(fn, ...args) {
    const script = 'var done = arguments[arguments.length - 1]; var a = Array.prototype.slice.call(arguments, 0, -1);' +
      'Promise.resolve().then(function () { return (' + fn.toString() + ').apply(null, a); }).then(function (v) { done({ ok: v }); }, function (e) { done({ error: String(e && e.message || e) }); });';
    return this.call('POST', this.s('/execute/async'), { script, args }).then((r) => { if (r && r.error) throw new Error(r.error); return r ? r.ok : r; });
  }

  wait(fn, args = [], ms = 20000, what = '') {
    return waitFor(() => this.exec(fn, ...args), ms, what || fn.toString().slice(0, 80));
  }

  async find(selector) {
    const v = await this.call('POST', this.s('/element'), { using: 'css selector', value: selector });
    return v[Object.keys(v)[0]];
  }

  async sendKeys(selector, text) {
    const id = await this.find(selector);
    return this.call('POST', this.s('/element/' + id + '/value'), { text });
  }

  async click(selector) {
    const id = await this.find(selector);
    return this.call('POST', this.s('/element/' + id + '/click'), {});
  }

  async keys(...keys) {
    const actions = [];
    for (const k of keys) { actions.push({ type: 'keyDown', value: k }); actions.push({ type: 'keyUp', value: k }); }
    await this.call('POST', this.s('/actions'), { actions: [{ type: 'key', id: 'kb', actions }] });
    await this.call('DELETE', this.s('/actions'));
  }

  /** Switch the target of operations into a frame (by index). null returns to the outermost page. */
  frame(id) { return this.call('POST', this.s('/frame'), { id }); }

  /** Return a PNG of the screen (Buffer). */
  async screenshot() {
    return Buffer.from(await this.call('GET', this.s('/screenshot')), 'base64');
  }

  async quit() {
    if (this.session) { try { await this.call('DELETE', '/session/' + this.session); } catch (e) { /* ignore */ } this.session = null; }
  }
}

/** Start the driver process and wait until it responds. */
export async function launchDriver(command, args, env) {
  const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  return { child, log: () => log, stop: () => { try { child.kill('SIGTERM'); } catch (e) { /* ignore */ } } };
}

export { waitFor };
