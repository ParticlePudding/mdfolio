# mdfolio Test Report

| Item | Details |
|---|---|
| Target | mdfolio 1.3.0 (single-HTML version `dist/mdfolio.html`, 4,338,005 bytes, SHA-256 `80bfb828…11503d836`) |
| Basis | [SPEC.md](SPEC.md) 1.13 |
| Dates | 2026-11-13 (1.0.1), 2026-11-15 (1.1.0), 2026-11-16 (re-run after the copyright holder name change in 1.1.0; 1.2.0), 2026-11-17 (1.3.0, 1.3.1), 2026-11-18 (fixes from the user evaluation) |
| Tested by | The implementer (Claude). **Not tested by a third party** |

---

## 1. Conclusion

### Unreleased (fixes from the user evaluation)

- 20 evaluators with different jobs used 1.3.1 with their own sample documents (average 3.85 / 5, no critical problems). Each report was checked by reproducing it; the confirmed ones are listed in [REVIEW.md](REVIEW.md) section 11 (G-1 to G-14) and fixed as FR-1101 to FR-1113.
- All **397 automated tests passed** (187 unit, 210 browser). 12 browser tests were added (`tests/e2e/fixes.e2e.mjs`). 18 existing browser tests were updated for the intended changes: the site title is now the home document's title, the file list shows titles (tests now find sidebar items by their path), the empty-folder message is longer, and the external image choice is stored per file.
- **FR-1106 (bold next to Japanese text) is not implemented**: it needs a new library (markdown-it-cjk-friendly, MIT), and adding it waits for the requester's decision.
- **Not verified**: Gecko and WebKit, real phones, and fonts on real Windows / macOS (FR-1112 was checked only by the order in the CSS).

### Unreleased (English-first project, translation of documents and comments)

- The specification, review record, test report, source code comments, developer tool messages, and test names were translated into English. All automated tests pass after the translation: **385 tests** (unit 187, browser 198).
- To confirm that the translation did not change the program, `src/app.js`, `src/core.js`, `src/md.js`, and `src/i18n.js` were parsed with a JavaScript parser and compared token by token with the previous version, ignoring comments: **no differences**. The CSS files were compared with comments removed.
- Found during the translation: in `src/document.css`, the section divider comment before the "body text" rule was never closed, so the `.mdv-prose { font-family; font-size: 1rem; line-height: 1.8 }` rule had been commented out since 1.1.0. The comment was closed. The rendered values did not change (16px, line height 28.8px), because the same values already came from the `body` rule in `app.css`.
- The public page (English at the top, Japanese under `ja/`, `en/` forwarding to the top) was served the same way as GitHub Pages and checked in Chromium: no errors, no external requests, no horizontal overflow, the language links work, and the samples show the expected interface language.
- **Not verified**: the Gecko and WebKit checks (`tests/cross/smoke.mjs`; the tools are not available in this environment), the forwarding of `/en/` on the real github.io site, and review of the English by a native speaker.

### 1.3.0 (adjacent mdfolio.css, folder version removed)

- All **385 automated tests passed** (187 unit tests, 198 browser-driven tests). The folder version's tests (unit and E2E) were removed, and tests were added for the adjacent `mdfolio.css` and for embedding it in exports (7 E2E, 5 unit).
- What was verified: when there is no adjacent `mdfolio.css`, the page displays with the built-in look and no errors. When it exists, it is applied to the colors of the body text, links and diagrams. `<link>` and `<style>` inside a document cannot load a different CSS. When opened via `file://`, the export screen says that the adjacent CSS is not included in the export. CSS chosen with "Choose CSS…" is included in the export, and the exported site keeps that look even when opened in a location without the CSS. "Do not embed" cancels it. CSS that contains `</style` and CSS over 1MB are rejected. CSS embedded in the current HTML is carried over. When opened via `http://`, the adjacent CSS is offered as a candidate and included in the export even without choosing it. The command-line version's `--css`. The CSP allows `file:` only for CSS, not for scripts, images, etc.
- Problems found during implementation: (1) The code that splits the HTML into parts mistook the string `<style id="mdv-user-style">` inside a script body for the CSS (found by the build check; fixed to search only inside `<head>`). (2) Even when there is no adjacent CSS, Chromium creates an empty style sheet, so the app wrongly concluded that the CSS was in effect (found by E2E; fixed to load the same file again in a form that does not affect the screen, and to decide based on whether that load succeeds).
- The publishing set (12 pages in Japanese and English, including the appearance sample) was served the same way as GitHub Pages and checked, and it was confirmed on screen that the colors and headings change in the appearance sample.
- **Not verified**: checks on Gecko and WebKit (`tests/cross/smoke.mjs` was rewritten for the `mdfolio.css` items, but it has not been run in this development environment). Whether Firefox / Safari load the adjacent CSS of an HTML file opened via `file://` is not verified. Real Windows / macOS machines and real smartphones are also not verified.

### 1.2.0 (wider English support, public pages, automation)

- All **395 automated tests passed** (191 unit tests, 204 browser-driven tests). The increase from 1.1.0 is 16 unit tests (6 for sample documents, 4 for public pages, 3 for releases, 3 for English output of the update command and the command-line export).
- Because the display language of the update command and the command-line export now depends on the settings of the machine that runs them, the tests fix them to Japanese with the environment variable `MDFOLIO_LANG=ja`, and English is checked by separate tests.
- The descriptions of diagram (Mermaid) types (in the usage guide and samples) were checked by actually drawing them in a browser. Flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts and pie charts can be drawn; mind maps and architecture diagrams show an error.
- The release zip was extracted, and it was confirmed that the folder version's update command inside it (with English output) and the command-line export work.
- The publishing set (12 pages in Japanese and English) was served the same way as GitHub Pages and checked (the same items as the 2026-11-16 addendum).
- After the English text was revised (review record D-10), all automated tests were re-run and passed. Checks for English singular/plural forms on screen were added to existing unit tests (the count did not change). Having the English text checked by a native English speaker has not been done.
- **Not verified**: the two GitHub Actions workflows (updating the public pages, creating a release) cannot be run in this development environment. The form of the configuration files and the steps they run (build, unit tests, `make-pages.mjs`, `make-release.mjs`) were checked locally, but the result of the first run on GitHub needs to be checked on the Actions screen. Checks on Gecko and WebKit were not re-run, because the tools are not available in this development environment. Real Windows / macOS machines and real smartphones remain not verified, as in 1.1.0.

### 1.1.0 (folder version added)

- **2026-11-16 addendum**: The copyright holder name in `LICENSE` was changed from "mdfolio contributors" to "Particle Pudding" and the build was redone; all 379 automated tests (175 unit tests, 204 browser-driven tests) passed. Behavior was not changed. The size and hash of the single-HTML version changed as shown in the table above. Checks on Gecko and WebKit were not re-run (this change touches nothing that could make behavior differ). The two files in `dist/hosted/` are copies of the pages published at 1.0.1, so they were not rebuilt and still carry the old name.
- **2026-11-16 addendum (GitHub Pages)**: The publishing set (output of `tools/dev/make-pages.mjs`) was served the same way as GitHub Pages (over http under `/mdfolio/`) and opened in Chromium. It was confirmed that the 5 pages (landing page, export sample, viewer, folder version sample, documentation) display without errors, that there is no external traffic and no failed loads (404), that nothing overflows horizontally at a width of 390px, and that the folder version loads math and diagrams from `lib/`. **Opening the pages at the actual publishing location (github.io) has not been verified** (whether this development environment can connect to the publishing location is not verified).
- **2026-11-16 addendum (Japanese and English support; SPEC 8.7)**: English sample documents, README and public pages were added. All **384 automated tests passed** (180 unit tests, 204 browser-driven tests). The increase is 5 unit tests for the sample documents. They check that the Japanese and English samples have matching structure and matching syntax samples, that the English samples have English file names, and that the targets of relative links, images and heading links in both samples exist (PG-4, PG-8). It was also confirmed that deliberately breaking a heading link makes the test fail.
  The publishing set was served the same way as GitHub Pages and checked in Chromium (this is a check of the publishing procedure and is not counted among the automated tests): the 12 Japanese and English pages display without errors, with no external traffic and no failed loads, and nothing overflows horizontally at a width of 390px. The language switch link on the landing page, `hreflang`, and the targets of all card links. Even when the samples and documentation are opened in a browser **set to the opposite language**, the screen language matches the document language (PG-3). In the English sample: moving between documents, heading links, math and diagrams (English text inside diagrams), images, and search (`MERMAID`).
  While revising the sample documents, the Japanese "Distribution" section said "there are 2 ways" but actually described 3, so it was corrected to "3".
  Not verified: display at the actual publishing location (github.io). The naturalness of the English text has not been checked by a native English speaker.
- **2026-11-16 addendum (license notices; PG-9)**: The full license notices were added to the landing pages (Japanese and English) in a collapsible section. 4 unit tests were added (184 in total, all passed). They check that all 9 HTML files of the public pages contain the full text of `LICENSE` and `THIRD-PARTY-NOTICES.txt` (for the folder version, in `lib/resources.js`), that the landing page uses no scripts and no external loads, and that the screen language of the samples is fixed. It was confirmed in a browser that the section on the landing page can be opened and does not overflow horizontally even at a width of 390px.
- All **379 automated tests passed** (175 unit tests, 204 browser-driven tests). The increase from 1.0.1 is 7 unit tests and 13 E2E tests for the folder version. All tests up to 1.0.1 pass on the single-HTML version after the CSS was split into two files.
- On Gecko and WebKit as well, 2 items were added for opening the folder version via `file://`; on each engine, 17 of 18 items passed and 1 item was not verified (an operation that cannot be automated; the same as 1.0.1).
- What was verified: display of the designated document; loading the math and diagram libraries from `lib/`; changes to `document.css` being applied to the body text, the screen, diagrams (light and dark) and printing; opening another folder and going back; export (the CSS copied by the update command is used, and changes made before copying are not included); behavior of the update command (it produces the same data as the command-line export, and it does not damage files on error); external images are not loaded; inline scripts are not executed; automated accessibility checks with the default color scheme.
- 3 problems were found and fixed during implementation (chapter 6, T-25 to T-27).
- Not verified: real Windows and macOS machines (especially when the files are placed on a shared folder and opened), Edge, and release versions of Firefox / Safari. Contrast when users change the color scheme has not been checked automatically (only the default color scheme is checked).

### 1.0.1

- All **359 automated tests passed** (168 unit tests, 191 browser-driven tests). None were skipped. However, during one run in the final check, 1 performance test failed (chapter 4; it passed on re-run).
- All 68 requirements in the specification (51 FR, 10 SEC, 7 NFR) are mapped to at least one test (chapter 7).
- Besides Chromium, 16 main features were checked on the Firefox engine (Gecko 160) and a Safari-family engine (WebKitGTK 2.52); on each, 15 items passed and 1 item was not verified (an operation that cannot be automated).
- During testing, **22 problems** in the product and **1 problem** in the distribution package (zip) were found, and all were fixed (chapter 6). One of them was a serious one that violated the requirement "does not communicate externally". Of these, 6 product problems and the 1 package problem were found in 1.0.1.
- Some things could not be verified by automated tests (chapter 8): release versions of Firefox / Safari, real Windows / macOS machines, **real smartphones**, **real hosting environments (such as Claude artifacts)**, operation through the browser's own folder picker, and printing on paper. A manual check list is included.
- The "display embedded inside another page" added in 1.0.1 was checked with frames that imitate those conditions. Publishing the 2 sample pages succeeded, but **opening the published pages and checking display and operation has not been done** (the browser available for checking was not signed in to the publishing site).

---

## 2. Test environment

| Item | Details |
|---|---|
| Machine | Linux (Ubuntu 24.04), 2 cores (Intel Xeon 2.1GHz), 8GB memory |
| Node.js | 22.23.4 |
| Browser (all items) | Chromium 153.0.8010.12 (Chrome for Testing, headless), Playwright 1.63.0 |
| Browsers (main features) | WebKitGTK 2.52.6 (MiniBrowser, WebKitWebDriver) / Gecko 160.0 (a build of Zen Browser 1.24.2b, geckodriver 0.36.0) |
| Checking engine | axe-core 4.14.0 (accessibility) |
| How opened | Mainly `file://` (opening the HTML directly). Some via `http://127.0.0.1` |

Testing approach:

- The built `dist/mdfolio.html` itself was operated in real browsers (these are not tests of isolated components).
- At the end of each test, it is checked that **there are no console errors, no CSP violations and no unexpected network requests**. Only the tests that use malicious documents allow log entries for things the CSP blocked, and they check that there are no other errors.
- "No external communication" was judged not from the browser's logs but from **whether any request reached a local HTTP server set up in place of external servers**.
- For Gecko, the Firefox download site could not be reached from the test environment, so a build of another browser that uses the same engine was used. The engine is the same, but it is not Firefox itself.
- Embedded display was checked with 2 kinds of frames. (1) One imitating a public page: served from a different origin than the parent page, with `sandbox` (saving, dialogs and top-level navigation forbidden), with a CSP header that limits images to `data:` / `blob:`, and with another script inserted at the start of `<head>`. (2) One embedded with `srcdoc`: the document URL becomes `about:srcdoc`, including the case where storage is made unavailable. These conditions were assembled from the hosting side's public descriptions, and there is no guarantee that they match the real environment.

---

## 3. Results

| File | Contents | Tests | Passed | Time |
|---|---|---:|---:|---:|
| `tests/unit/core.test.mjs` | Path resolution, routes, slugs, encoding detection, search, tree, style restrictions, site data, HTML assembly | 82 | 82 | 0.3 s |
| `tests/unit/md.test.mjs` | Markdown extensions (math, task lists, alerts, heading IDs, reference extraction) | 43 | 43 | 0.5 s |
| `tests/unit/build.test.mjs` | Output structure, CSP hashes, inventory and licenses of bundled libraries, build reproducibility, matching UI strings | 19 | 19 | 1.1 s |
| `tests/unit/cli.test.mjs` | Command-line export | 15 | 15 | 4.0 s |
| `tests/unit/package.test.mjs` | Zip creation (Japanese file names), conversion for external hosting environments (including rewriting the replacement character) | 9 | 9 | 2.0 s |
| `tests/e2e/startup.e2e.mjs` | Startup, CSP, help, license display, when storage is unavailable | 13 | 13 | 7 s |
| `tests/e2e/open.e2e.mjs` | Loading via folder, files and drop; exclusions; encodings; limits; errors | 22 | 22 | 14 s |
| `tests/e2e/render.e2e.mjs` | Display (tables, code, math, diagrams, footnotes, alerts, images, table of contents), deferred code highlighting | 19 | 19 | 16 s |
| `tests/e2e/navigate.e2e.mjs` | Links, back/forward, scroll position, tree, custom nav, attachment downloads | 23 | 23 | 13 s |
| `tests/e2e/search.e2e.mjs` | Full-text search, keyboard operation, match highlighting, index | 17 | 17 | 17 s |
| `tests/e2e/settings.e2e.mjs` | Theme, language, external images, screen width, touch devices, printing, horizontal scrollbars | 16 | 16 | 13 s |
| `tests/e2e/export.e2e.mjs` | Export, site mode, excluding unused libraries, match with the command-line version | 20 | 20 | 13 s |
| `tests/e2e/security.e2e.mjs` | Script removal, ID protection, links, external communication, CSP, tamper detection | 14 | 14 | 25 s |
| `tests/e2e/fsa.e2e.mjs` | Reload, auto-update, last folder (including real handles) | 11 | 11 | 28 s |
| `tests/e2e/a11y.e2e.mjs` | Checks with axe-core, color scheme, keyboard operation, focus | 17 | 17 | 26 s |
| `tests/e2e/perf.e2e.mjs` | Performance (NFR-2) | 4 | 4 | 45 s |
| `tests/e2e/embed.e2e.mjs` | Settings that do not use saving, locked external images, display of the trial public page, behavior inside a sandboxed cross-origin frame and a `srcdoc` frame, display unchanged before and after conversion | 15 | 15 | 31 s |
| `tests/unit/folder.test.mjs` | Folder version build and update command (1.1.0) | 7 | 7 | 1.5 s |
| `tests/e2e/folder.e2e.mjs` | Behavior of the folder version opened via `file://` (1.1.0) | 13 | 13 | 13 s |
| **Total (1.1.0)** | | **379** | **379** | about 4.3 min |
| (Reference) 1.0.1 total | | 359 | 359 | |

The raw data is in `test-results/` (`summary.json` and a `.tap` file per test file).

---

## 4. Performance (NFR-2)

Measured on a 2-core machine (the level the specification assumes). The targets are used directly as pass criteria.

| Item | Target | Measured | Notes |
|---|---:|---:|---|
| Startup to start screen | 1,000 ms | 150 ms (200 ms to first paint) | Median of 7 runs. Max 264 ms |
| Display of a 1MB document | 3,000 ms | 2,230 ms | Median of 5 runs. Max 2,337 ms. A dense document with 1,653 each of headings, tables and code blocks |
| 1,000 documents: tree display | 2,000 ms | 54 ms | 424 ms when real files are opened with `<input>` |
| 1,000 documents: indexing | 10,000 ms | 801 ms | 1,557 ms with real files |
| 1,000 documents: search response | 300 ms | 171 ms | Includes the 150 ms input delay. Maximum over 5 search terms |

- Before the fix, the 1MB document took 2.9 to 3.4 seconds, right at the target (chapter 6, T-11). The change to defer code highlighting gave the values above. Highlighting finishes completely 4 to 7 seconds after display (reference value; it varies from run to run. It is processed a little at a time so that it does not block interaction).
- Measured values vary by about 10 to 20% between runs. The values above are from the final 1.0.1 run. The 1.0.1 changes did not touch display processing.
- **The display of the 1MB document does not have enough margin.** This test requires that the maximum of the 5 measurements is also within the target. In one run of the final check (right after the test environment was restarted), 1 of the 5 measurements was 3,092 ms and the test failed (the median at that time was 2,023 ms). It passed in 2 standalone re-runs (max 2,375 ms and 2,289 ms) and in the full re-run shown in the table above. On a loaded machine, or one slower than assumed, it can exceed 3 seconds.
- The output size is 4.12MB, within the 6MB target (NFR-3).

---

## 5. Accessibility (NFR-4)

| Check | Result |
|---|---|
| Automated checks with axe-core | **0 violations** on 15 screens (start screen, document, search results, menu, 3 kinds of dialogs, usage guide, error display, custom nav, English display, etc.) × light/dark, and on a narrow screen |
| Text/background contrast ratio | 328 combinations shown on screen were calculated from the actual colors, and all are 4.5:1 or higher. The minimum is 4.54:1 in light and 5.30:1 in dark. The print color scheme was also checked |
| Keyboard-only operation | Tab order, menus (arrow keys, Home, End, Esc), dialogs (focus cycles inside; returns to where it was on close), document list, table of contents, copy, scrolling wide tables and code, tab switching |
| Focus visibility | Confirmed that a focus outline appears on every element in the page that Tab stops on |
| Reduced motion setting | Confirmed that animations and smooth scrolling drop to 0 when the setting is on |
| Information for screen readers | Page regions (header, document list, body, table of contents), roles of the search box and results list, announcement of result counts, checkbox states |

Not verified: how things sound in real screen readers (NVDA, VoiceOver, etc.). Colors that document authors specify with `style` (the app does not adjust them).

---

## 6. Problems found in testing and how they were handled

These were not found in the specification review ([REVIEW.md](REVIEW.md)) but were found in testing after implementation. All were fixed, and tests were added to prevent them from recurring (T-17 and T-22 are preventive fixes that could not be reproduced in tests). They are listed from highest to lowest severity. T-02 was a problem in the test environment, not the product. T-18 and later were found in 1.0.1. T-24 was found not by testing but by actually publishing.

| # | Severity | Problem found | How found | Action |
|---|---|---|---|---|
| T-08 | **High** | Even with external images blocked, **image references inside diagrams (Mermaid) caused external communication** (image nodes, `<img>` in labels, `url()` in `themeCSS`). This violates the requirement "does not communicate externally by default" | A test that judges communication by whether requests reach a local server | While not allowed, image and media loading is also stopped by the browser's CSP (SEC-10). Switching to allowed reloads the page after confirmation. Confirmed on Chromium, Gecko and WebKit that not a single request reaches the server |
| T-18 | Medium | Inside a frame embedding the HTML with `srcdoc`, clicking a link between documents moved the frame to another page (`about:blank` or the parent page) and **the display disappeared**. This was because link navigation was left to the browser in an environment where the document URL differs from the base URL for links (a problem present in 1.0.0) | Embedded display tests (added in 1.0.1). Reproduction confirmed by experiment | The app now handles in-app links itself (FR-211). Confirmed in frames on Chromium, Gecko and WebKit |
| T-19 | Medium | **Distribution package problem**: Japanese file names in `mdfolio-1.0.0.zip` (such as `基本操作.md` in `sample-docs`) did not have the flag marking them as UTF-8. In some Windows environments, file names become garbled when extracted, breaking links between the sample documents | Inspection of the distribution package (the flags of each zip entry were checked programmatically). **Neither the problem nor the fix has been confirmed on a real Windows machine** | Changed the tool that creates the zip (`tools/dev/make-zip.py`), which verifies the flag on every entry after creation. Replaced the zip with the rebuilt one |
| T-24 | Medium | The publishing site (Claude artifacts) did not accept the HTML converted for the public page. Files containing the replacement character (U+FFFD) cannot be published, and the script of a bundled library (markdown-it) uses that character literally in 11 places | **Actually publishing** (tests with imitation frames could not reveal this) | The conversion rewrites it to an escape with the same meaning (SPEC 6.1). If it appears in a place where the rewrite cannot be guaranteed to keep the meaning, the conversion stops. Confirmed that the display results for invalid input (NUL characters, `%XX` that cannot be read as characters) are the same before and after the rewrite |
| T-25 | Medium | (Folder version) The print color settings lost to color settings that users add after `document.css`, so changing the dark color scheme also changed the print colors | Folder version E2E (printing) | Doubled the selectors of the print settings to raise their specificity |
| T-28 | Medium | After opening a folder, the header could keep showing the folder name: when the indexer learned the home document's title before the first render, the render saw no change and did not update the header | E2E (opening a folder) | The header is updated on every render |
| T-29 | Low | A shared "show external images" value saved by 1.3.1 was ignored but stayed in storage | E2E (FR-1107) | It is removed when the app starts |
| T-30 | Low | (Test only) A Gantt chart was expected to be "wide", but Mermaid lays Gantt charts out to the column width, so they always fit | E2E (FR-1102) | The test uses a wide sequence diagram, and checks that the Gantt chart and the pie chart still fit |
| T-26 | Medium | (Folder version) The update command rewrote `data/site.js` before exiting due to an error in the CSS | Unit test | It now reads and checks the CSS first, and if there is an error, it rewrites no files |
| T-27 | Low | (Folder version) Running the update command without `--title` erased the previously specified title | Folder version E2E (export title) | If not specified, the previous value is carried over. The home document is also carried over if that document still exists |
| T-13 | Medium | 5 accessibility defects: task list checkboxes had no name; horizontally scrolling tables could not be reached by keyboard; the search results list had no name; footnote back-links were distinguished by color only; the math error display was hard to read in the dark theme (2.54:1) | axe-core | All fixed. Arrow key operation for menus and tabs, and where focus returns after a dialog closes, were also added |
| T-15 | Medium | In environments that always show scrollbars (Windows, etc.), an unnecessary horizontal scrollbar appeared in the sidebar | Screen checks on WebKit / Gecko (the test Chromium hides scrollbars, so it was not visible there) | Changed how borders are drawn to remove the overflow. Added a test that detects overflow numerically |
| T-11 | Medium | Displaying a dense 1MB document took 2.9 to 3.4 seconds and sometimes exceeded the target (3 seconds) | Performance test | Moved code highlighting after sanitizing, and the portion beyond a certain amount is processed after display (2.3 seconds) |
| T-10 | Medium | When the embedded document data had an unexpected format (unknown type, etc.), an exception was thrown at startup and the screen was not shown | Security test (feeding broken data) | Made validation stricter; the data is not loaded, a notice is shown, and the start screen appears |
| T-06 | Medium | After opening a search result, focus was taken away from the search box, and Esc could not close the results | Search test | Focus is no longer taken from a field being typed in, and Esc handling was fixed |
| T-04 | Medium | The "current position" in the table of contents was off. At the end of a document, the last heading did not become the current position | Display test | Fixed scroll position correction being applied twice, and added handling for the end of the document |
| T-01 | Medium | In text mixing amounts of money and code, `$` signs far apart were treated as math | Unit test | Fixed inline math detection |
| T-12 | Low | Returning to the search box right after opening a search result sometimes did not open the results panel (about 1 in 3 times) | Repeated test runs | The screen switch is now done without waiting for an event that arrives late |
| T-14 | Low | The CSP of an exported site still contained hashes of removed libraries | Command-line version test | The hashes are now removed too |
| T-16 | Low | Nav files (`_sidebar.md`) appeared in search results | Screen check | Excluded from search results |
| T-09 | Low | Alt text of images that cannot be shown inside headings got mixed into the table of contents | Security test | Removed from the table of contents text |
| T-07 | Low | The type of attachments included in exports could vary by browser and OS | Export test | It is now decided from the file extension |
| T-05 | Low | Unnecessary anchor links were added to nav headings in the sidebar | Screen check | They are no longer added |
| T-03 | Low | 4 visual defects (focus outline of the body area, button position on the start screen, styling of nav separators, default colors of diagrams) | Screen check | Fixed |
| T-20 | Low | "Copied" was shown even when copying code failed (the result of copying with the fallback method was not checked). Also, when switching to the fallback method, the screen could jump to the end of the page because of the selection | Embedded display tests and code review (inside frames, the fallback method is the main path) | The result is checked, and "Could not copy" is shown on failure. The temporary input field is fixed on screen. Inside frames, the fallback method is tried first (FR-204) |
| T-21 | Low | The start screen and usage guide said "processed only on this computer", which does not fit when opened on a smartphone. Also, for HTML placed on a public page with the CSP removed, the HTML itself cannot guarantee "nothing is sent externally" | Screen check (smartphone-equivalent width), specification review | Changed to "this device". On touch devices, the drop hint is omitted. Added wording for the trial public page (`hosted`) |
| T-23 | Low | When given HTML other than mdfolio, the public page conversion tool (`make-hosted.mjs`) stopped with an internal error without giving a reason (a tool added in 1.0.1) | Unit test | Fixed to show the reason and exit |
| T-22 | Low | On smartphones, when the file picker is restricted to Markdown, some devices may not allow `.md` files to be selected (handling of file types differs by device and by the app that stores the files) | Design review (**could not be reproduced in the test environment and not confirmed on a real device either**) | No restriction is applied on touch devices (FR-102) |
| T-17 | Low | When placed on a web server, the browser fetches `favicon.ico` (communication other than the HTML) | Design review (not reproduced in tests) | The tab icon is now contained in the HTML |
| T-02 | — | The test browser crashed with folders containing Japanese file names | Loading test | Caused by the locale setting of the test environment, not a product problem. Fixed on the test side |

A note on T-08: the review had stated that Mermaid would be "used with a safe setting (`securityLevel: 'strict'`)", but image loading was not stopped even with that setting. It was found because the test judged communication not by "whether the browser tried to send a request" but by "whether a request reached the server".

---

## 7. Mapping to requirements

"Tests" refers to files under `tests/` (`cross/smoke` is the check on Gecko / WebKit).

| ID | Requirement | Tests | Notes |
|---|---|---|---|
| FR-101 | Open folder | e2e/open | The browser's own folder picker cannot be automated. Checked with substituted handles and `<input>` |
| FR-102 | Open files | e2e/open, e2e/settings, e2e/embed, cross/smoke | No file type restriction on touch devices was checked in a browser simulating touch operation (not verified on a real device) |
| FR-103 | Drag and drop | e2e/fsa, e2e/open | Checked by synthesizing drop events (3 paths: files, folders, handles) |
| FR-104 | Embedded data (site mode) | e2e/export, cross/smoke |  |
| FR-105 | Target files | e2e/open, unit/core |  |
| FR-106 | Exclusions | e2e/open, unit/core |  |
| FR-107 | Character encoding | e2e/open, unit/core, cross/smoke |  |
| FR-108 | Reopen last folder | e2e/fsa | Saving and restoring checked with real handles (OPFS, http://). Not verified with a real folder opened via file:// |
| FR-109 | Reload and auto-update | e2e/fsa | 3 ways: substituted handles, real handles (OPFS), `<input>` |
| FR-110 | Limits | e2e/open |  |
| FR-111 | Replacement | e2e/open |  |
| FR-112 | Handling of single files | e2e/open |  |
| FR-201 | CommonMark / GFM | e2e/render, unit/md |  |
| FR-202 | Footnotes | e2e/render, unit/md |  |
| FR-203 | Heading IDs and anchors | e2e/render, unit/core, unit/md |  |
| FR-204 | Code highlighting and copy | e2e/render, e2e/embed, unit/md, cross/smoke | Copying inside frames checked down to the clipboard contents (Chromium). On Gecko / WebKit, the result message was checked |
| FR-205 | Math | e2e/export, e2e/render, unit/md, cross/smoke |  |
| FR-206 | Diagrams | e2e/export, e2e/render, unit/md, cross/smoke |  |
| FR-207 | Alerts | e2e/render, unit/md |  |
| FR-208 | Front matter | e2e/render, unit/core |  |
| FR-209 | Raw HTML (shown after sanitizing) | e2e/render |  |
| FR-210 | Images and media, external images | e2e/render, e2e/settings | Communication judged by server-side logs |
| FR-211 | Links | e2e/navigate, e2e/embed, cross/smoke | Includes navigation in `srcdoc` frames and display of attachments in settings that do not use saving |
| FR-212 | Horizontal scrolling | e2e/render, e2e/a11y |  |
| FR-213 | Document title | e2e/render |  |
| FR-301 | File tree | e2e/navigate, unit/core |  |
| FR-302 | Custom nav | e2e/navigate |  |
| FR-303 | In-page table of contents | e2e/render |  |
| FR-304 | Routing | e2e/export, e2e/navigate, e2e/startup, cross/smoke |  |
| FR-305 | Path and modification date | e2e/navigate |  |
| FR-306 | Scroll position restore | e2e/navigate |  |
| FR-307 | Home document | e2e/navigate, unit/core |  |
| FR-401 | Full-text search | e2e/search, unit/core, cross/smoke |  |
| FR-402 | Result display and operation | e2e/search |  |
| FR-403 | Match highlighting | e2e/search |  |
| FR-404 | Index creation | e2e/search |  |
| FR-405 | Search shortcut | e2e/search |  |
| FR-501 | Theme | e2e/settings, cross/smoke |  |
| FR-502 | Screen language | e2e/settings, e2e/startup, cross/smoke |  |
| FR-503 | Switching by screen width | e2e/settings, cross/smoke |  |
| FR-504 | Printing | e2e/settings | Checked by switching to the print view. Output on paper not verified |
| FR-601 | Site export | e2e/export, e2e/embed | Includes not appearing in the menu in settings that do not use saving |
| FR-602 | Embedding attachments | e2e/export, unit/md |  |
| FR-603 | Excluding unused libraries | e2e/export, unit/md |  |
| FR-604 | Command-line version | e2e/export, unit/cli | Also confirmed that the content matches the in-app export. For the added options, confirmed that only the settings block changes |
| FR-701 | Settings block | e2e/settings, e2e/startup, e2e/embed, unit/core |  |
| FR-702 | Saving settings | e2e/settings, e2e/startup, cross/smoke |  |
| FR-801 | Help | e2e/startup, e2e/embed | Includes the notice on the trial public page (Japanese and English) |
| FR-802 | License display | e2e/export, e2e/startup, unit/build |  |
| FR-901 | Error notification | e2e/open, e2e/startup |  |
| FR-902 | When there are no documents | e2e/open |  |
| FR-1101 | Distinct chart colors | e2e/fixes | Light and dark |
| FR-1102 | Wide diagrams at natural size | e2e/fixes | 390px wide window |
| FR-1103 | Scroll cue | e2e/fixes | Checked by the computed style, not by eye |
| FR-1104 | Site title | e2e/fixes, e2e/open, e2e/export, e2e/security |  |
| FR-1105 | Titles in the file list | e2e/fixes, e2e/fsa |  |
| FR-1106 | Bold next to CJK text | — | **Not implemented** (waiting for the decision on the library) |
| FR-1107 | External images per file | e2e/fixes, e2e/settings, e2e/embed |  |
| FR-1108 | Drawer focus | e2e/fixes |  |
| FR-1109 | Active item scrolled into view | e2e/fixes |  |
| FR-1110 | `\label` ignored | e2e/fixes |  |
| FR-1111 | Help for beginners, empty-folder message | e2e/fixes, e2e/open, e2e/fsa |  |
| FR-1112 | Code font order | e2e/fixes | Real Windows / macOS not verified |
| FR-1113 | Enter in search | e2e/fixes |  |
| SEC-1 | Sanitizing | e2e/security, cross/smoke |  |
| SEC-2 | ID prefix and removal of internal classes | e2e/security |  |
| SEC-3 | style restrictions | e2e/render, e2e/security, unit/build, unit/core |  |
| SEC-4 | CSP (scripts by hash only) | e2e/security, e2e/startup, cross/smoke |  |
| SEC-5 | No communication | e2e/security, e2e/settings, e2e/startup, cross/smoke | Judged by server-side logs |
| SEC-6 | Safe settings for math and diagrams | e2e/security |  |
| SEC-7 | rel on external links | e2e/navigate |  |
| SEC-8 | No sending features | e2e/security, unit/build | Also confirmed in the source that no communication features are used (unit/build) |
| SEC-9 | Attachments always downloaded | e2e/navigate, e2e/security |  |
| SEC-10 | External images also blocked by CSP | e2e/security, e2e/settings, cross/smoke |  |
| NFR-1 | Single file | e2e/startup, unit/build |  |
| NFR-2 | Performance | e2e/perf | Measured values in chapter 4 |
| NFR-3 | Size | unit/build |  |
| NFR-4 | Accessibility | e2e/a11y, e2e/navigate | Chapter 5 |
| NFR-5 | Internationalization | unit/build, e2e/settings, e2e/open |  |
| NFR-6 | Maintainability | unit/build |  |
| NFR-7 | Robustness | e2e/startup, e2e/settings |  |

Checks of statements without requirement IDs:

| Specification section | Tests | Notes |
|---|---|---|
| 2.1 Display embedded inside another page | e2e/embed, cross/smoke | Sandboxed cross-origin frames, `srcdoc` frames (including when storage is unavailable), nonce-based CSP. These imitate the conditions; not verified inside the actual service |
| 6.1 Placing on an external hosting environment (trial conversion) | unit/package, e2e/embed, cross/smoke | Only the CSP line and the settings block change in the conversion, and the converted HTML works in the frames above |
| 8.3 Zip creation | unit/package | Japanese file names get the UTF-8 flag. Extraction on Windows not verified |

---

## 8. What automated tests could not verify

| Item | Reason | Expected impact |
|---|---|---|
| Release versions of Firefox / Safari | Cannot be installed in the test environment | Main features were checked on the same engines. Minor display differences may remain |
| Real Windows / macOS machines | The test environment is Linux only | The browser engines are shared. Fonts, scrollbars and file paths (drive letters) are not verified |
| Operation through the browser's own folder picker (`showDirectoryPicker`) | Cannot be automated | Processing after selection was checked with substituted handles and real handles (OPFS) |
| "Reopen last folder" when opened via `file://` | Same as above (OPFS cannot be used with `file://`, so it was checked via `http://`) | Designed so that a failure only means the button does not appear; browsing is not affected |
| Folder selection (`<input webkitdirectory>`) and drag and drop in Firefox / Safari | Cannot be operated via WebDriver | Selecting files was checked on both engines. Checked with a real folder on Chromium |
| Printing on paper, output to PDF | Only checked up to the print view | — |
| Operation with screen readers | Cannot be automated | Items that can be judged mechanically were checked |
| Real smartphones and tablets (iOS / Android) | Not available in the test environment | Layout, the drawer and opening files were checked in Chromium simulating a 390px width and touch operation. The real devices' file pickers, display in Safari (iOS) and behavior in in-app browsers are not verified |
| Behavior inside a real hosting environment (Claude artifacts) | The publishing site's pages cannot be opened in the test browser. Opening them in a browser on the user's computer (the one inside the Claude app) was also tried, but it was not signed in to the publishing site and could not display the page | Publishing the 2 sample pages succeeded (the publishing site accepted the files; T-24). Display and operation were only checked in frames imitating the public descriptions (sandboxed frame, images only from `data:` / `blob:`, no saving or dialogs, script insertion). As with T-24, there may be other conditions that cannot be read from the descriptions, and display or operation may differ |
| File names in a zip extracted on Windows | The test environment is Linux only | It was confirmed programmatically that every zip entry has the UTF-8 flag (T-19) |
| Real data on the scale of 5,000 documents / 100MB | The behavior at the limits (cut-off and notice) was checked, but long-term use is not verified | — |

### Manual check list

Before distribution, we recommend checking the following in the environments where it will actually be used (1 to 2 minutes each).

1. **Edge or Chrome on Windows**: double-click `mdfolio.html` to open it → choose `sample-docs` with "Open folder" → documents are shown, and the list on the left, search and table of contents work.
2. On the same screen, there are no extra scrollbars in the sidebar or table of contents. Japanese fonts are easy to read.
3. Close and reopen the browser → "Reopen last folder (sample-docs)" appears, and clicking it opens the folder.
4. Edit and save `sample-docs/README.md` in an editor → the display changes within 2 to 3 seconds.
5. "Export as site" in the menu → open the saved HTML on another computer (or in another browser) → it can be read as is.
6. **Firefox**: open `mdfolio.html` → choose a folder with "Open folder" (if an upload confirmation appears, allow it; nothing is sent) → documents are shown. Dropping a folder onto the window also opens it.
7. **Safari (Mac)**: same as 6. Also open the exported site's HTML and confirm that math and diagrams are shown.
8. In the print preview, only the body text is printed, on a white background.
9. With the Network panel of the developer tools open, view several documents and confirm that no network requests occur.
10. **Zip extraction (Windows)**: extract the distribution zip → file names in `sample-docs/guide/` are readable in Japanese → open `sample-docs` with `mdfolio.html` and navigate via links such as "基本操作".
11. **Smartphone**: open the exported site's HTML (or the published page) → the ≡ at the top left shows the document list → tables and code do not overflow horizontally and can be scrolled horizontally within themselves → math and diagrams are shown.
12. **Smartphone**: tap "Open files" in the viewer → `.md` files can be selected → they are shown.
13. **Published page (HTML converted for trial use)**: navigation via links, search, theme switching and copying code work. "Export as site" and "Show external images" do not appear in the menu. Clicking a link to an attachment shows an explanation that it cannot be saved.

---

## 9. Re-running the tests

```
npm install                       # Playwright, axe-core, etc. (not included in the output)
npx playwright install chromium
npm test                          # build → unit tests → browser tests
node tools/dev/test-summary.mjs   # writes per-file test counts and times to test-results/
npm run test:webkit               # WebKitGTK (requires webkit2gtk-driver, xvfb)
npm run test:gecko                # Firefox family (requires geckodriver; set the executable with MDFOLIO_GECKO_BINARY)
```

Performance tests depend on machine speed. The targets assume a 2-core machine, so they can fail on slower environments or while other work is running (chapter 4). The zip creation tests (part of `tests/unit/package.test.mjs`) use Python 3. In environments without it, only those 2 tests are skipped.
