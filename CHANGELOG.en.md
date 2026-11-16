[日本語](CHANGELOG.md) | **English**

# Changelog

Changes in each version of mdfolio. The details are in `docs/SPEC.md` (revision history), `docs/REVIEW.md` and `docs/TEST_REPORT.md` (in Japanese).

## 1.2.0 — 2026-11-16

### Added

- Wider English support (the app screen has supported Japanese and English since 1.0.0).
  - English README (`README.en.md`) and English sample documents (`sample-docs-en/`, `sample.en.md`).
  - Folder version: an English guide (`README.txt`), and English alongside Japanese in the notes in `index.html` and `style/document.css`.
  - The update command of the folder version (`tools/update.mjs`) and the command-line export (`tools/build-site.mjs`) print messages in Japanese or English. They follow your computer's language; set the environment variable `MDFOLIO_LANG` (`ja` / `en`) to choose.
- Public pages (https://particlepudding.github.io/mdfolio/en/ , Japanese at `/`): samples, the viewer, the folder version sample and the documentation, in Japanese and English, with the full license text.
- Updating `main` now rebuilds the public pages, and adding a tag such as `v1.2.0` creates a release, automatically (GitHub Actions).
- This changelog.

### Changed

- The name "mdfolio" is now final (it was a working name before).
- The copyright holder in `LICENSE` is now "Particle Pudding".
- The help and the samples now say which diagram types are not available (Mermaid mindmaps and architecture diagrams).

### Fixed

- The Japanese sample on distributing documents said there were two ways; there are three.

### Removed

- Copies of the HTML converted for trying out in 1.0.1 (`dist/hosted/`). The conversion tool (`tools/dev/make-hosted.mjs`) remains.

## 1.1.0 — 2026-11-15

### Added

- Folder version (`dist/mdfolio/`): put it in a fixed place, and the documents in `docs/` can be read just by opening `index.html`. You can change the look with `style/document.css`.
- Diagram (Mermaid) colors are taken from CSS variables.

### Changed

- The CSS is split into the document body and colors (`document.css`) and the parts of the screen (`app.css`).

## 1.0.1 — 2026-11-13

### Added

- Display inside another page (`<iframe>`).
- Settings `allowDownloads`, `lockExternalImages` and `hosted`, and a conversion for external hosting services (`tools/dev/make-hosted.mjs`).

### Fixed

- "Copied" was shown even when copying failed.
- On touch devices, filtering the file dialog by extension could make `.md` files impossible to choose.
- In the distribution zip, Japanese file names lacked the UTF-8 flag and could be garbled on Windows (`tools/dev/make-zip.py`).

## 1.0.0 — 2026-11-13

- First version: the single-HTML viewer (`mdfolio.html`), opening folders and files, full-text search, math, diagrams and code highlighting, export as a site, and a Japanese and English screen.
