// src/source.js loads in Node.js and states its call order clearly (FILE_IO.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from '../helpers/load.mjs';

test('source.js loads without a browser, and pickFiles before createInputs gives a clear error', () => {
  const sandbox = { MDV: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/source.js'), 'utf8'), sandbox);
  const source = sandbox.MDV.source;
  for (const k of ['createInputs', 'pickFolder', 'pickFiles', 'pickFile', 'fromDataTransfer', 'scanFolder', 'isLive', 'readFile', 'readBytes', 'readText', 'stat', 'save', 'rememberFolder', 'lastFolder', 'forgetLastFolder', 'requestAccess', 'isGone']) {
    assert.equal(typeof source[k], 'function', k);
  }
  assert.throws(() => source.pickFiles(), /createInputs\(\) must be called before/);
  assert.equal(source.isGone({ name: 'NotFoundError' }), true);
  assert.equal(source.isGone({ name: 'NotReadableError' }), false);
});
