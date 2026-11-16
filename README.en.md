[日本語](README.md) | **English**

# mdfolio

A Markdown document viewer that runs entirely in your browser. No server or installation needed.

- Version: 1.2.0
- Public page: https://particlepudding.github.io/mdfolio/en/
- Bugs, requests, and English corrections: [Issues](https://github.com/ParticlePudding/mdfolio/issues)

## Two forms

| Form | How it works |
|---|---|
| Single-HTML version (`dist/mdfolio.html`) | Open it and choose a folder to read |
| Folder version (`dist/mdfolio/`) | Place it in a shared folder; opening `index.html` shows the documents in `docs/`. Change the look in `style/document.css` |

## How to use

**Single-HTML version**: Open `mdfolio.html` and choose a folder with "Open folder". To try it, open `sample-docs-en`.

**Folder version**: Put your documents in `docs/`, run `node tools/update.mjs`, then open `index.html`. Run the command again after changing documents or CSS (Node.js 20 or later).

**Share**: "Export as site" in the menu (⋯) packs your documents into a single HTML file. Zip it before sending. You can also export from the command line:

```
node tools/build-site.mjs <document folder> --out site.html --title "Handbook"
```

## Features

- Tables, syntax highlighting, math, diagrams (Mermaid), footnotes, alerts
- File list, outline, full-text search
- Light / dark theme, English / Japanese interface, printing
- Automatic refresh when you save a file (Chrome / Edge)

## Security

- Documents are never sent anywhere.
- Scripts in documents are not run.
- Images on the internet are not loaded by default.

## Main limitations

- Supported encodings: UTF-8, UTF-16 (with BOM), and Shift_JIS.
- Mermaid mindmaps and architecture diagrams are not available.
- In Firefox / Safari, "Reopen last folder" and automatic refresh are not available.
- Not tested on real smartphones.

## Settings

Edit the line with `id="mdv-config"` in the HTML to change the title, language, theme, and more. See `sample-docs-en/reference/settings.md`.

## Redistribution

- `dist/mdfolio.html` and sites exported from it can be redistributed as-is. The required copyright and license notices are included in the HTML.

## For developers

```
npm run build        # build dist/
npm install          # prepare for testing
npm test             # build → unit tests → browser tests
```

The specification (`docs/SPEC.md`) and changelog (`CHANGELOG.md`) are in Japanese.

## License

MIT (`LICENSE`). Bundled libraries: `THIRD-PARTY-NOTICES.txt`.
