# File input and output (`src/source.js`)

Every call to a browser file API is in `src/source.js`, published as `window.MDV.source`. `src/app.js` reaches files only through it. A native edition (Tauri, WebView2, ...) replaces this one file and keeps everything else.

## Data passed to app.js

| Name | Meaning |
|---|---|
| `ref` | Where an item's contents come from. Opaque to app.js (in the browser: a file handle or a `File`) |
| `root` | A folder that can be scanned again and remembered. Opaque to app.js (in the browser: a directory handle) |
| result | `{ kind, name, single, root, items: [{ path, ref, size, mtime }], truncated }`. `kind` is `'handles'` (can be re-read; auto-update works) or `'files'` (a snapshot). `size` / `mtime` may be undefined (use `stat`) |

## Functions

| Function | Does | Browser API used |
|---|---|---|
| `createInputs({ accept, onPick })` | Creates the hidden folder and file inputs; what they pick goes to `onPick(result)` | `<input type="file">` |
| `pickFolder()` | Opens the folder picker. Returns `{ root, name }`, or `null` (cancelled, or fell back to the input) | `showDirectoryPicker` |
| `pickFiles()` | Opens the file picker (result through `onPick`) | `<input type="file">` |
| `pickFile({ mount, accept, className })` | Chooses one file (CSS in the export dialog). Returns `{ name, size, ref }` or `null` | `<input type="file">` |
| `fromDataTransfer(dt, { onProgress })` | Reads a drop. Call it synchronously in the drop event | `getAsFileSystemHandle`, `webkitGetAsEntry` |
| `scanFolder(root, { onProgress })` | Lists a folder (opening, reloading) | directory handle `entries()` |
| `isLive(ref)` | Whether the item can be re-read to see changes | — |
| `readFile(ref)` / `readBytes(ref)` / `readText(ref)` | Reads contents (Blob / bytes with size, time and type / UTF-8 text) | `getFile`, `File` |
| `stat(ref)` | `{ size, mtime }` for change detection | `getFile` |
| `save(blob, suggestedName)` | Saves a file (export, attachments) | `a[download]` |
| `rememberFolder(root)` / `lastFolder()` / `forgetLastFolder()` | The remembered folder (FR-108). IndexedDB `mdv` / `kv`, key `last:<page path>`, value `{ handle, name }` | `indexedDB` |
| `requestAccess(root)` | Asks again for permission to read a remembered folder | `queryPermission`, `requestPermission` |

## What a native edition replaces

All of the functions above. With a native file system, `pickFolder` can return a path as `root`, `ref` can be a path, `isLive` can be true for every file, `save` can show a save dialog, and the remembered folder can be stored in the app's settings. `createInputs`, `pickFiles` and `pickFile` can open native dialogs and pass the result to `onPick` or return it.

Nothing else needs to change: decoding text (`core.detectAndDecode`), document sets, rendering, search and export stay in `core.js` / `md.js` / `app.js`.
