[日本語](README.md) | **English**

# mdfolio

A Markdown document viewer that runs entirely from local HTML and JavaScript files. It requires no server, installation, or network connection. It comes in two forms:

- **Folder version** (`dist/mdfolio/`): place it in a permanent location (such as a shared folder), and anyone can read the documents in the `docs` folder simply by opening `index.html`. You can change the look with CSS (`style/document.css`).
- **Single-HTML version** (`dist/mdfolio.html`, about 4.1 MB): open one file and choose a folder. Easy to carry around and share. Sites made with "Export as site" are also single HTML files.

- Version: 1.2.0
- Public page: https://particlepudding.github.io/mdfolio/en/ (read the samples, try the viewer, read the documentation)
- License: MIT (license notices for the bundled libraries are inside the HTML)

The app's interface can be shown in English or Japanese. It follows your browser's language by default, but you can change it from the menu (⋯). The design records (`docs/SPEC.md`, `docs/REVIEW.md`, `docs/TEST_REPORT.md`) are in Japanese only.

The English text was written by a non-native English speaker. If you notice any mistakes or awkward wording, please let us know through [GitHub Issues](https://github.com/ParticlePudding/mdfolio/issues). Bug reports and requests are welcome there too.

## How to use

### 1. Put the folder version in place

1. Put the `dist/mdfolio/` folder where you want to use it (for example, a shared folder).
2. Put Markdown files and images in `docs/`, then run `node tools/update.mjs` in the mdfolio folder (the one that contains `index.html`; Node.js 20 or later). You can set the title with `--title "Team handbook"`. The command displays messages in English or Japanese, based on your computer's language settings. Set the environment variable `MDFOLIO_LANG=en` to always use English.
3. Open `index.html` in a browser. When you change the documents, run step 2 again and then reload the page.

You can change the look in `style/document.css`. Instructions are in the comment at the top of the file. Changing the color variables (such as `--accent`) changes the colors of the text, the screen and the diagrams together. The document body is rendered as ordinary HTML (`h1`–`h6`, `table`, `pre`, and so on) inside `.mdv-prose`, so you can write CSS rules for these elements too.

Browsers generally prevent pages opened from `file://` from reading nearby files. That is why putting files in `docs/` is not enough: the update command must create `data/site.js`. If you use "Export as site" after changing the CSS, run the update command first as well (the export uses a copy of the CSS).

### 2. Read your own folder (single-HTML version)

1. Open `dist/mdfolio.html` in a browser (double-click it).
2. Press "Open folder" and choose a folder that contains Markdown files, or drop the folder onto the window.
3. Move between documents using the list on the left, links in the text, and search (`Ctrl+K` or `/`).

To try it, open the included `sample-docs-en` folder (`sample-docs` is the Japanese version). To try a single file, choose the included `sample.en.md` with "Open files" (`sample.md` is the Japanese version). The full instructions are under "How to use" in the menu (⋯).

### 3. Share documents with other people

"Export as site" in the menu (⋯) saves one HTML file that contains the open documents and every image and attachment they refer to.
Recipients only need to open that HTML file. Email and chat services may alter an HTML file that is attached directly and break it, so put it in a zip file first.

### 4. Export from the command line

```
node tools/build-site.mjs <document folder> --out site.html --title "Handbook"
```

This makes the same HTML as the export in the app. It needs only Node.js 20 or later, no npm packages. See `--help` for options.

## Features

| Area | What it does |
|---|---|
| Opening | Choosing a folder or files, drag and drop, or embedding in HTML. Detects UTF-8, UTF-16 (with BOM) and Shift_JIS automatically |
| Display | CommonMark and GFM (tables, strikethrough, task lists, autolinks), footnotes, GitHub-style alerts, code highlighting, math (KaTeX), diagrams (Mermaid), front matter |
| Navigation | File tree, navigation from `_sidebar.md` / `SUMMARY.md`, outline of the page, linking to a position on a page (URL hash), Back / Forward |
| Search | Full-text search (all words must appear; case-insensitive; ignores full-width/half-width differences), highlighting of matches |
| View | Light / dark / auto, Japanese / English, layout that adapts to the screen width, print layout |
| Distribution | Export to a single HTML file with the documents inside (in the app or from the command line) |
| Convenience | Automatic refresh when the file you are viewing changes, reopening the last folder (both Chrome / Edge only) |

Code highlighting supports 68 languages:

- Standard: bash, c, cpp, csharp, css, diff, go, graphql, ini, java, javascript, json, kotlin, less, lua, makefile, markdown, objectivec, perl, php, php-template, plaintext, python, python-repl, r, ruby, rust, scss, shell, sql, swift, typescript, vbnet, wasm, xml, yaml
- Extra: powershell, dos, dockerfile, nginx, apache, cmake, matlab, latex, protobuf, vbscript, armasm, verilog, vhdl, fortran, scala, dart, haskell, julia, groovy, gradle, properties, http, delphi, erlang, elixir, clojure, lisp, scheme, awk, tcl, vim, glsl

To add a language, add it to `HLJS_EXTRA` in `tools/vendor.mjs` and run `npm run vendor` and `npm run build`.

## Security and privacy

mdfolio is built so that opening Markdown written by someone else is safe.

- Opened files are processed inside the browser only and are never sent anywhere. The app uses no networking features (such as fetch), and the browser's Content Security Policy forbids network access as well.
- Scripts and event attributes in documents are removed. Even if one slipped through, only the scripts built into the HTML can run.
- Images and videos on the internet are not loaded by default (loading them would tell their server that you opened the document). You can change this with "Show external images" in the menu. Turning it on reloads the page.
- Links to attachments are not opened in the browser; they are downloaded instead.

Details are in chapter 6 of `docs/SPEC.md`, and what was tested is in `docs/TEST_REPORT.md` (both in Japanese).

## Supported environments

| Browser | Status |
|---|---|
| Google Chrome / Microsoft Edge (desktop, latest) | Main target. All features are tested automatically in Chromium |
| Firefox / Safari (desktop, latest) | Expected to work. Main features were tested automatically using their rendering engines (Gecko 160 and WebKitGTK 2.52). The released browser versions themselves were not tested. |
| Smartphones and tablets | Intended for reading exported sites and for "Open files". Tested automatically using an emulated 390-pixel-wide touchscreen. **Not checked on real devices** |
| Embedded in another page (`<iframe>`) | The features needed for reading work (see "Embedding in another page" below). Checked automatically with a test frame that simulates these conditions. Not checked in each service's real environment |

In Firefox / Safari, folders are opened through the file selection dialog (the browser may ask whether to "upload" them, but nothing is sent). "Reopen last folder" and automatic refresh are not available.

## Settings

You can change the default behavior by editing `<script type="application/json" id="mdv-config">` in the HTML (editing this part by hand is fine).

| Key | Value | Meaning |
|---|---|---|
| `title` | text | Site title (if empty, the folder name) |
| `lang` | `auto` / `ja` / `en` | Interface language |
| `theme` | `auto` / `light` / `dark` | Theme |
| `home` | path | First document to show |
| `allowExternalImages` | `true` / `false` | Whether to show external images from the start |
| `allowDownloads` | `true` / `false` | `false` hides actions that save files ("Export as site" and saving attachments) |
| `lockExternalImages` | `true` / `false` | `true` never loads external images (users cannot change this) |
| `hosted` | `true` / `false` | `true` adds a notice on the start screen and in the help saying that this is a public page for trying out the viewer |

The last three are for places where saving files or loading external content is not possible. For the command-line export, use `--no-downloads` and `--lock-external-images`.

Do not edit the script parts (`mdv-js-…`, `mdv-lib-…`). Their fingerprints (hashes) are verified, so changing even a single character will stop the page from working.

## Embedding in another page

`mdfolio.html` and exported sites can be displayed in an `<iframe>` on another page. Reading, search and following links work even when storage is unavailable, when the document's URL differs from the base URL for links (`srcdoc`), or when the clipboard API is not allowed.

If the frame's restrictions block saving files, set `allowDownloads` to `false` so that actions that would not work are removed from the screen.

Hosting services that inject their own scripts into the page (such as Claude Artifacts) cannot host the file as-is, because the Content Security Policy (CSP) included in the HTML blocks those scripts. The following command converts it into an HTML file for trying out:

```
node tools/dev/make-hosted.mjs dist/mdfolio.html hosted-viewer.html --page-title "mdfolio viewer (trial)"
```

The conversion removes the Content Security Policy written in the HTML and disables actions that save files and the display of external images (it also escapes the U+FFFD replacement character, which such hosts reject). This removes one of the safety mechanisms, so use the converted HTML only for trying out the viewer or publishing samples. For opening files on your own device or distributing within your organization, use the original, unconverted HTML file (section 6.1 of `docs/SPEC.md`).

## Main limitations

- Up to 5,000 documents and 50,000 files and folders. Documents larger than 10 MB are shown as plain text without conversion.
- Attachments included in an export are limited to 20 MB each.
- Automatic encoding detection covers UTF-8 / UTF-16 (with BOM) / Shift_JIS only.
- The bundled Mermaid is the lightweight build, so mindmaps (`mindmap`) and architecture diagrams (`architecture-beta`) cannot be shown. Flowcharts, sequence, class, state and ER diagrams, Gantt charts, pie charts and others work.
- Emoji shortcodes (`:smile:`), wiki links (`[[...]]`), `[TOC]` and definition lists are not supported.

Other limitations are in chapter 11 of `docs/SPEC.md`.

## Redistribution

- `dist/mdfolio.html` and sites exported from it can be redistributed as-is. The required copyright and license notices are included in the HTML.

## For developers

```
node tools/build.mjs                       # build dist/mdfolio.html (no npm packages needed)
node tools/build-folder.mjs                # build dist/mdfolio/ (folder version); run build.mjs first
node tools/build.mjs --without mermaid,katex --out lite.html   # lightweight build without math and diagrams (about 0.65 MB)
npm install                                 # install what the tests need (Playwright and others)
npx playwright install chromium             # browser for the tests
npm test                                    # build → unit tests → browser tests
npm run test:webkit                         # check with WebKitGTK (needs webkit2gtk-driver, xvfb)
npm run test:gecko                          # check with Gecko (needs geckodriver; set the browser with MDFOLIO_GECKO_BINARY)
npm run vendor                              # update bundled libraries and regenerate license notices
```

| Path | Contents |
|---|---|
| `dist/mdfolio/` | Folder version (`index.html`, `style/`, `docs/`, `data/`, `lib/`, `tools/update.mjs`) |
| `dist/mdfolio.html` | Single-HTML version |
| `dist/mdfolio-docs.html` | The Japanese README and the three documents in `docs/`, exported as one site by mdfolio itself |
| `dist/sample-site.html` | `sample-docs/` exported as a site (example output) |
| `sample-docs/` `sample-docs-en/` | Sample documents for trying mdfolio (Japanese and English) |
| `sample.en.md` `sample.md` | A self-contained, single-file sample document (English and Japanese) |
| `CHANGELOG.md` | Change history (Japanese only) |
| `src/` | Source (`core.js` logic independent of the screen, `md.js` Markdown extensions, `i18n.js` UI text, `app.js` screen, `app.css` screen parts, `document.css` document body and colors) |
| `vendor/` | Bundled libraries (as distributed) and the list `manifest.json` |
| `tools/` | Build, export and library updates. `tools/folder/` holds the update command and notes for the folder version. `tools/dev/` holds the conversion for embedding (`make-hosted.mjs`), zip creation (`make-zip.py`), assembly of the public pages (`make-pages.mjs`) and test summaries |
| `tests/` | Unit tests (`unit/`), browser tests (`e2e/`), checks with other engines (`cross/`), test documents (`fixtures/`) |
| `docs/` | Specification `SPEC.md`, spec review record `REVIEW.md`, test report `TEST_REPORT.md` (Japanese) |
| `test-results/` | Test run records (counts, performance measurements, results and screenshots from other engines) |

## License

MIT License (`LICENSE`). For the licenses of bundled libraries, see `THIRD-PARTY-NOTICES.txt`.
