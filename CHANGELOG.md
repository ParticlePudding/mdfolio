# Changelog

Changes in each version of mdfolio. The details are in `docs/SPEC.md` (revision history), `docs/REVIEW.md`, and `docs/TEST_REPORT.md`.

## Unreleased

### Changed

- The project is now English-first, so that anyone can use it.
  - `README.md` is now in English (shown first on GitHub); the Japanese README is `README.ja.md`.
  - The public page shows English at the top (`/`); Japanese moved to `/ja/`. The old `/en/` address forwards to the top.
  - This changelog and the release notes are in English.
  - The specification, review record, test report, and source code comments are in English.

## 1.3.0 — 2026-11-17

### Added

- Place `mdfolio.css` in the same folder as `mdfolio.html` (or an exported site) to change the look. See `examples/mdfolio.css` for an example.
- "Choose CSS" in the export dialog embeds the chosen CSS in the exported HTML file.
- A "Custom look sample" on the public page.

### Removed

- The folder version (`dist/mdfolio/` and its update command `tools/update.mjs`). To change the look, use `mdfolio.css` instead. You no longer need to run a command after changing documents or CSS, and you do not need Node.js. The folder version up to 1.2.0 is still available from the Releases page.

### Changed

- The English changelog (`CHANGELOG.en.md`) was removed; the change history was kept in Japanese only. (Reversed in the next version: this changelog is now in English.)
- The page's security settings (CSP) now allow loading `mdfolio.css` from the same folder. Script restrictions are unchanged.
- The command-line export is now documented as a developer tool; users do not need Node.js.

## 1.2.0 — 2026-11-16

### Added

- Wider English support (the app's interface has supported English and Japanese since 1.0.0).
  - English README and English sample documents (`sample-docs-en/`, `sample.en.md`).
  - Folder version: an English guide (`README.txt`), and English alongside Japanese in the notes in `index.html` and `style/document.css`.
  - The folder version's update command (`tools/update.mjs`) and the command-line export (`tools/build-site.mjs`) print messages in English or Japanese, based on the system language. Set the environment variable `MDFOLIO_LANG` (`ja` / `en`) to choose.
- The public page (https://particlepudding.github.io/mdfolio/), with samples, the viewer, the folder version sample, and the documentation in English and Japanese, including the full license text.
- GitHub Actions rebuilds the public page whenever `main` is updated and creates a release when started from the Actions tab or when a tag such as `v1.2.0` is pushed.
- This changelog.

### Changed

- The name "mdfolio" has been finalized (it was previously a working name).
- The copyright holder in `LICENSE` is now "Particle Pudding".
- The help and the samples now say which diagram types are not available (Mermaid mindmaps and architecture diagrams).
- The English text (interface, help, README, samples) was revised. The interface uses the singular for a count of 1 (such as "1 result").
- The comparison table in the sample on distributing documents now includes the folder version.

### Fixed

- The Japanese sample on distributing documents said there were two ways; there were three.
- The docs said to reload the page after turning on external images; the page actually reloads automatically.

### Removed

- The pre-converted trial HTML files added in 1.0.1 (`dist/hosted/`). The conversion tool (`tools/dev/make-hosted.mjs`) remains.

## 1.1.0 — 2026-11-15

### Added

- The folder version (`dist/mdfolio/`): place it in a fixed location, and anyone can read the documents in `docs/` just by opening `index.html`. The look can be changed with `style/document.css`.
- Diagram (Mermaid) colors are taken from CSS variables.

### Changed

- The CSS is split into the document body and colors (`document.css`) and the parts of the interface (`app.css`).

## 1.0.1 — 2026-11-13

### Added

- Display inside another page (`<iframe>`).
- Settings `allowDownloads`, `lockExternalImages`, and `hosted`, and a conversion for external hosting services (`tools/dev/make-hosted.mjs`).

### Fixed

- "Copied" was shown even when copying failed.
- On touch devices, filtering the file dialog by extension could make `.md` files impossible to choose.
- In the distribution zip, Japanese file names lacked the UTF-8 flag and could be garbled on Windows (`tools/dev/make-zip.py`).

## 1.0.0 — 2026-11-13

- Initial release: the single-HTML viewer (`mdfolio.html`), with folder and file opening, full-text search, math, diagrams, code highlighting, site export, and an English and Japanese interface.
