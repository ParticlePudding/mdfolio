/*!
 * mdfolio source — file input and output
 * MIT License
 *
 * Every call to a browser file API is here: the folder picker and file handles (File System Access API),
 * <input type="file">, drag and drop, IndexedDB (the remembered folder) and downloads. app.js reaches files
 * only through these functions, so a native edition (Tauri, WebView2, ...) can replace this file alone.
 *
 * Data passed to app.js does not depend on the UI:
 *   ref      Where an item's contents come from. Opaque to app.js (here: a FileSystemFileHandle or a File).
 *   root     A folder that can be scanned again (here: a FileSystemDirectoryHandle). Opaque to app.js.
 *   result   { kind, name, single, root, items: [{ path, ref, size, mtime }], truncated }
 *            kind: 'handles' (can be re-read; auto-update works) or 'files' (a snapshot chosen once).
 *            single: only files were chosen, not a folder. root: set when the result is one folder that can
 *            be scanned again and remembered. truncated: scanning stopped at core.LIMITS.maxEntries.
 *            skipped: the number of folders, files or dropped items that could not be read and were left out.
 *            size / mtime are undefined when not known yet (read them with stat()).
 */
(function (root) {
  'use strict';

  var IDB_NAME = 'mdv';
  var IDB_STORE = 'kv';
  var DROP_HANDLE_TIMEOUT_MS = 3000;
  var PROGRESS_EVERY = 200;

  function core() { return root.MDV.core; }

  function newResult(kind, name) {
    return { kind: kind, name: name || '', single: false, root: null, items: [], truncated: false, skipped: 0 };
  }

  /** Whether an error means the folder or file no longer exists (moved, deleted, or the handle is stale). */
  function isGone(err) {
    var name = err && err.name;
    return name === 'NotFoundError' || name === 'InvalidStateError' || name === 'TypeMismatchError';
  }

  // ------------------------------------------------------------------ Scanning folders

  /**
   * Walk a directory handle breadth-first and add its files to result.items. counter.n counts every entry
   * (folders too) across calls, so that several dropped folders share one limit.
   * A subfolder that cannot be read is skipped (counted in result.skipped); if the folder itself cannot be read, this rejects.
   */
  async function scanDirHandle(result, dirHandle, prefix, counter, onProgress) {
    var queue = [{ handle: dirHandle, prefix: prefix }];
    while (queue.length) {
      var item = queue.shift();
      try {
        for await (var pair of item.handle.entries()) {
          var name = pair[0];
          var child = pair[1];
          if (core().isIgnoredName(name)) continue;
          counter.n++;
          if (counter.n > core().LIMITS.maxEntries) { result.truncated = true; return; }
          if (counter.n % PROGRESS_EVERY === 0 && onProgress) onProgress(counter.n);
          if (child.kind === 'directory') queue.push({ handle: child, prefix: item.prefix + name + '/' });
          else result.items.push({ path: item.prefix + name, ref: child });
        }
      } catch (e) {
        if (item.handle === dirHandle) throw e;
        result.skipped++;
      }
    }
  }

  /** Scan a folder chosen earlier (picker, drop, remembered folder, or "Reload"). */
  async function scanFolder(dirHandle, opts) {
    var result = newResult('handles', dirHandle.name);
    result.root = dirHandle;
    await scanDirHandle(result, dirHandle, '', { n: 0 }, opts && opts.onProgress);
    return result;
  }

  /** Files from <input> or a drop (a FileList or an array of File). */
  function fromFileList(files, stripRoot) {
    var result = newResult('files', '');
    var name = '';
    var count = 0;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var rel = file.webkitRelativePath || file.name;
      if (stripRoot && file.webkitRelativePath) {
        var cut = rel.indexOf('/');
        if (cut >= 0) { name = name || rel.slice(0, cut); rel = rel.slice(cut + 1); }
      }
      count++;
      if (count > core().LIMITS.maxEntries) { result.truncated = true; break; }
      result.items.push({ path: rel, ref: file, size: file.size, mtime: file.lastModified });
    }
    result.name = name;
    result.single = !name;
    return result;
  }

  // ------------------------------------------------------------------ Drag and drop

  function readAllEntries(reader) {
    return new Promise(function (resolve, reject) {
      var all = [];
      (function next() {
        reader.readEntries(function (batch) {
          if (!batch.length) { resolve(all); return; }
          for (var i = 0; i < batch.length; i++) all.push(batch[i]);
          next();
        }, reject);
      })();
    });
  }

  function entryToFile(entry) {
    return new Promise(function (resolve, reject) { entry.file(resolve, reject); });
  }

  /** Walk entries obtained via webkitGetAsEntry (drops in Firefox / Safari). */
  async function scanEntries(result, rootEntries, onProgress) {
    var queue = rootEntries.slice();
    var count = 0;
    while (queue.length) {
      var item = queue.shift();
      var entry = item.entry;
      if (core().isIgnoredName(entry.name)) continue;
      count++;
      if (count > core().LIMITS.maxEntries) { result.truncated = true; return; }
      if (count % PROGRESS_EVERY === 0 && onProgress) onProgress(count);
      // Folders and files that cannot be read are skipped and counted
      if (entry.isDirectory) {
        try {
          var children = await readAllEntries(entry.createReader());
          children.forEach(function (c) { queue.push({ entry: c, prefix: item.prefix + entry.name + '/' }); });
        } catch (e) { result.skipped++; }
      } else {
        try {
          var file = await entryToFile(entry);
          result.items.push({ path: item.prefix + entry.name, ref: file, size: file.size, mtime: file.lastModified });
        } catch (e) { result.skipped++; }
      }
    }
  }

  /**
   * Read a drop. Call it synchronously inside the drop event: the browser empties the DataTransfer
   * after the event, so everything needed is taken before the first await.
   */
  function fromDataTransfer(dt, opts) {
    var onProgress = opts && opts.onProgress;
    var items = dt.items ? Array.prototype.filter.call(dt.items, function (it) { return it.kind === 'file'; }) : [];
    var files = dt.files ? Array.prototype.slice.call(dt.files) : [];
    var handlePromises = null;
    var entries = null;
    if (items.length && typeof items[0].getAsFileSystemHandle === 'function') {
      // Set a timeout in case no handle is obtained or there is no response
      var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, DROP_HANDLE_TIMEOUT_MS); });
      handlePromises = items.map(function (it) {
        try { return Promise.race([Promise.resolve(it.getAsFileSystemHandle()).catch(function () { return null; }), timeout]); } catch (e) { return Promise.resolve(null); }
      });
    }
    // One entry per dropped item (null where there is none), in the same order as items
    var itemEntries = null;
    if (items.length && typeof items[0].webkitGetAsEntry === 'function') {
      itemEntries = items.map(function (it) { try { return it.webkitGetAsEntry(); } catch (e) { return null; } });
      entries = itemEntries.filter(Boolean);
    }

    return (async function () {
      var handleList = handlePromises ? await Promise.all(handlePromises) : [];
      var handles = handleList.filter(Boolean);
      var result;
      if (handles.length) {
        if (items.length === 1 && handles[0].kind === 'directory') {
          result = newResult('handles', handles[0].name);
          result.root = handles[0];
          await scanDirHandle(result, handles[0], '', { n: 0 }, onProgress);
        } else {
          result = newResult('handles', '');
          result.single = !handles.some(function (x) { return x.kind === 'directory'; }) &&
            !(itemEntries || []).some(function (x, i) { return !handleList[i] && x && x.isDirectory; });
          var counter = { n: 0 };
          for (var i = 0; i < items.length; i++) {
            var hd = handleList[i];
            if (!hd) {
              // No handle for this item (timed out or refused): read it the other way, or count it as skipped
              var fallback = itemEntries && itemEntries[i];
              if (fallback) await scanEntries(result, [{ entry: fallback, prefix: '' }], onProgress);
              else result.skipped++;
              continue;
            }
            if (core().isIgnoredName(hd.name)) continue;
            if (hd.kind === 'directory') {
              try { await scanDirHandle(result, hd, hd.name + '/', counter, onProgress); } catch (e) { result.skipped++; }
            } else {
              result.items.push({ path: hd.name, ref: hd });
            }
          }
        }
      } else if (entries && entries.length) {
        if (entries.length === 1 && entries[0].isDirectory) {
          result = newResult('files', entries[0].name);
          var children = await readAllEntries(entries[0].createReader());
          await scanEntries(result, children.map(function (c) { return { entry: c, prefix: '' }; }), onProgress);
        } else {
          result = newResult('files', '');
          result.single = !entries.some(function (x) { return x.isDirectory; });
          await scanEntries(result, entries.map(function (c) { return { entry: c, prefix: '' }; }), onProgress);
        }
      } else {
        result = fromFileList(files, false);
      }
      return result;
    })();
  }

  // ------------------------------------------------------------------ Choosing folders and files

  var inputs = null;
  var pickers = typeof WeakMap === 'function' ? new WeakMap() : null;

  function needInputs() {
    if (!inputs) throw new Error('source.createInputs() must be called before pickFolder() / pickFiles()');
    return inputs;
  }

  /**
   * Create the hidden <input type="file"> elements for folders and files and return them for the page to place.
   * onPick(result) receives what is chosen through them. It is a callback rather than a return value of
   * pickFolder / pickFiles because the input can be filled without our click (tests set its files directly).
   * Call it once, before pickFolder / pickFiles. opts: { accept (for files), onPick, onError }
   * onError(err) receives errors while reading what was picked (default: rethrow).
   */
  function createInputs(opts) {
    var dir = document.createElement('input');
    dir.className = 'mdv-hidden-input mdv-input-dir';
    dir.type = 'file';
    dir.setAttribute('webkitdirectory', '');
    dir.setAttribute('multiple', '');
    dir.setAttribute('tabindex', '-1');
    dir.setAttribute('aria-hidden', 'true');
    var files = document.createElement('input');
    files.className = 'mdv-hidden-input mdv-input-files';
    files.type = 'file';
    files.setAttribute('multiple', '');
    files.setAttribute('tabindex', '-1');
    files.setAttribute('aria-hidden', 'true');
    if (opts.accept) files.setAttribute('accept', opts.accept);
    var deliver = function (list, stripRoot) {
      try {
        opts.onPick(fromFileList(list, stripRoot));
      } catch (e) {
        if (opts.onError) opts.onError(e); else throw e;
      }
    };
    // An empty folder is delivered too (as an empty result), so that the app can say there are no documents.
    // Cancelling the dialog fires no change event, because the value is cleared before each click
    dir.addEventListener('change', function () { if (dir.files) deliver(dir.files, true); });
    files.addEventListener('change', function () { if (files.files && files.files.length) deliver(files.files, false); });
    inputs = { dir: dir, files: files };
    return [dir, files];
  }

  /**
   * Choose a folder. Resolves with { root, name } for a folder to scan with scanFolder(), or null when the
   * user cancelled or when the <input> fallback was opened (its result arrives through onPick).
   */
  async function pickFolder() {
    if (typeof window.showDirectoryPicker === 'function') {
      var handle = null;
      try {
        handle = await window.showDirectoryPicker({ mode: 'read' });
      } catch (e) {
        if (e && e.name === 'AbortError') return null; // The user cancelled
        handle = null; // If unavailable or denied, fall back to the traditional method
      }
      if (handle) return { root: handle, name: handle.name };
    }
    needInputs().dir.value = '';
    inputs.dir.click();
    return null;
  }

  /** Choose files. The result arrives through onPick. */
  function pickFiles() {
    needInputs().files.value = '';
    inputs.files.click();
  }

  /**
   * Choose one file with an <input> placed in opts.mount (e.g. a dialog), reused for every pick in that mount.
   * Resolves with { name, size, ref } or null (cancelled). opts: { mount, accept, className }
   * The dialog opens synchronously, so call this directly from a click handler. A new pick settles an earlier
   * one that is still waiting with null, for browsers that do not fire the input's cancel event.
   */
  function pickFile(opts) {
    var mount = opts.mount || document.body;
    var picker = pickers && pickers.get(mount);
    if (!picker) {
      var input = document.createElement('input');
      input.type = 'file';
      input.hidden = true;
      picker = { input: input, resolve: null };
      var settle = function (file) {
        var resolve = picker.resolve;
        picker.resolve = null;
        input.value = '';
        if (resolve) resolve(file ? { name: file.name, size: file.size, ref: file } : null);
      };
      input.addEventListener('change', function () { settle(input.files && input.files[0]); });
      input.addEventListener('cancel', function () { settle(null); });
      mount.appendChild(input);
      if (pickers) pickers.set(mount, picker);
    }
    if (opts.className) picker.input.className = opts.className;
    if (opts.accept) picker.input.setAttribute('accept', opts.accept); else picker.input.removeAttribute('accept');
    if (picker.resolve) { var earlier = picker.resolve; picker.resolve = null; earlier(null); }
    return new Promise(function (resolve) {
      picker.resolve = resolve;
      picker.input.value = '';
      picker.input.click();
    });
  }

  // ------------------------------------------------------------------ Reading

  /** Whether the item can be read again to see changes on disk (enables auto-update and fresh reads). */
  function isLive(ref) {
    return !!ref && typeof ref.getFile === 'function';
  }

  /** The item's contents as a Blob (a File, with name, type, size and lastModified). */
  async function readFile(ref) {
    if (!ref) throw new Error('no source');
    if (typeof ref.getFile === 'function') return ref.getFile();
    return ref;
  }

  /** The item's bytes, with its size, modification time and type ('' if unknown) at the moment of reading. */
  async function readBytes(ref) {
    var file = await readFile(ref);
    return { bytes: new Uint8Array(await file.arrayBuffer()), size: file.size, mtime: file.lastModified, type: file.type || '' };
  }

  /** The item's text, read as UTF-8 (used for CSS chosen by the user). */
  async function readText(ref) {
    return (await readFile(ref)).text();
  }

  /** Size and modification time, for change detection and size checks. */
  async function stat(ref) {
    var file = await readFile(ref);
    return { size: file.size, mtime: file.lastModified };
  }

  // ------------------------------------------------------------------ Saving

  /** Save a Blob as a download with the suggested file name. */
  function save(blob, suggestedName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.className = 'mdv-hidden-input';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  // ------------------------------------------------------------------ Remembered folder (FR-108)

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      var req;
      try { req = window.indexedDB.open(IDB_NAME, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function () { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error('blocked')); };
    });
  }

  async function idbRun(mode, fn) {
    var db = await idbOpen();
    try {
      return await new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, mode);
        var req = fn(tx.objectStore(IDB_STORE));
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    } finally {
      db.close();
    }
  }

  // One remembered folder per HTML file
  function lastKey() {
    return 'last:' + location.pathname;
  }

  /** Remember the folder for "Reopen last folder". Resolves with { root, name }; rejects if it cannot be stored. */
  function rememberFolder(dirHandle) {
    return idbRun('readwrite', function (store) { return store.put({ handle: dirHandle, name: dirHandle.name }, lastKey()); })
      .then(function () { return { root: dirHandle, name: dirHandle.name }; });
  }

  /** The remembered folder as { root, name }, or null (none, or not available in this browser). */
  function lastFolder() {
    if (typeof window.showDirectoryPicker !== 'function' || !window.indexedDB) return Promise.resolve(null);
    return idbRun('readonly', function (store) { return store.get(lastKey()); }).then(function (rec) {
      if (!rec || !rec.handle || typeof rec.handle.entries !== 'function') return null;
      return { root: rec.handle, name: rec.name || rec.handle.name };
    });
  }

  function forgetLastFolder() {
    return idbRun('readwrite', function (store) { return store.delete(lastKey()); });
  }

  /**
   * Ask for permission to read a remembered folder again. Resolves true when granted, false when refused;
   * rejects when the folder can no longer be used.
   */
  async function requestAccess(dirHandle) {
    var perm = 'granted';
    if (typeof dirHandle.queryPermission === 'function') perm = await dirHandle.queryPermission({ mode: 'read' });
    if (perm !== 'granted' && typeof dirHandle.requestPermission === 'function') perm = await dirHandle.requestPermission({ mode: 'read' });
    return perm === 'granted';
  }

  var api = {
    createInputs: createInputs,
    pickFolder: pickFolder,
    pickFiles: pickFiles,
    pickFile: pickFile,
    fromDataTransfer: fromDataTransfer,
    isGone: isGone,
    scanFolder: scanFolder,
    isLive: isLive,
    readFile: readFile,
    readBytes: readBytes,
    readText: readText,
    stat: stat,
    save: save,
    rememberFolder: rememberFolder,
    lastFolder: lastFolder,
    forgetLastFolder: forgetLastFolder,
    requestAccess: requestAccess
  };
  root.MDV = root.MDV || {};
  root.MDV.source = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
