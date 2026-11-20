# mdfolio Specification Review Record

| Item | Details |
|---|---|
| Subject | SPEC.md 0.9 (pre-review draft) |
| Date | 2026-11-13 |
| Reviewer | Self-review by the author of the specification (Claude). **Not a third-party review** |
| Result | 41 findings (High 6 / Medium 19 / Low 16). All were reflected in SPEC.md 1.0 or recorded as implementation decisions |
| Verdict | OK to proceed to implementation (open issues in Section 4) |
| Afterwards | During implementation and testing, 16 problems that this review did not find were discovered (Section 5). The specification was revised to 1.1. In 1.0.1, display embedded inside another page was supported, and the specification was revised to 1.2 (Section 6) |

---

## 1. Review method

1. **Desk review**: The specification was read through against a checklist covering the following points.
   - Meeting the requirements (the request: runs as local HTML / JS, a site for viewing Markdown documents, redistributable, tested)
   - Feasibility (does it really work under browser constraints)
   - Security (safety when opening Markdown written by third parties)
   - Licensing (can the obligations of redistribution be met)
   - Consistency and ambiguity (undefined behavior, contradictions, statements open to differing interpretations)
   - Testability (can each requirement be verified)
2. **Hands-on verification**: Assumptions that affect feasibility were checked on the real thing rather than guessed (Section 2).

Verification environment: Chrome for Testing 153.0.8010.12 (headless, Linux), Node.js 22.23, Playwright 1.63.
Libraries examined: markdown-it 15.0.3, markdown-it-footnote 4.0.0, DOMPurify 3.4.17, highlight.js 11.12.0, KaTeX 0.19.1, mermaid 12.3.0 / @mermaid-js/tiny 12.3.0.

---

## 2. Results of hands-on verification

| # | Assumption checked | Result |
|---|---|---|
| V1 | A page opened via `file://` is treated as a secure context, and `showDirectoryPicker` exists | Yes. `isSecureContext === true`; both `showDirectoryPicker` and `showOpenFilePicker` exist as functions |
| V2 | localStorage / IndexedDB / `history.replaceState` work under `file://` | Yes. All work |
| V3 | OPFS (`navigator.storage.getDirectory`) works under `file://` | **No: `SecurityError`**. Works on `http://127.0.0.1` |
| V4 | With CSP `script-src` restricted to hashes only, a dynamically generated inline script can run | Yes. Scripts whose hash matched ran, and scripts whose hash did not match were blocked (1 violation event confirmed) |
| V5 | KaTeX can render under a CSP without `unsafe-eval`, and fonts from `data:` URIs load | Yes. Rendering succeeded; 0 font load errors |
| V6 | The lightweight Mermaid build can render under the same CSP | Yes. 14 types succeeded: flowchart, sequence, class, state, ER, Gantt, pie, journey, Git graph, timeline, quadrant, XY, Sankey, block. Mindmap failed (as documented for the lightweight build). No CSP violations |
| V7 | Contents of the full and lightweight Mermaid builds | The full build (5.5 MB) contains ELK code (345 occurrences of `org.eclipse.elk`) and 9 places equivalent to `new Function`. The lightweight build (2.9 MB) has 0 ELK occurrences. The license of `elkjs` is `EPL-2.0 OR GPL-3.0-or-later` |
| V8 | Mermaid behavior on syntax errors | With `suppressErrorRendering: true`, no error diagram is left in the DOM and the message can be received as an exception |
| V9 | DOMPurify configuration (HTML profile, `SANITIZE_NAMED_PROPS`, hooks) | Yes. `script` / `style` / `iframe` / `form` / inline SVG and MathML, `on*` attributes, `javascript:` `data:` `file:` links, `target`, and `data-*` are removed, and `user-content-` is prefixed to `id` / `name`. Nodes inside hooks belong to an inert document, so images never start loading before `src` is rewritten |
| V10 | How DOMPurify handles the `style` attribute and `class` | **They pass through unchanged** (`position:fixed; background:url(...)` remained). Additional measures are needed |
| V11 | markdown-it 15 API and output | Yes. The API is as expected. Table column alignment is output as `style="text-align:right"`. With `fuzzyLink: false`, `README.md` `main.py` `example.com` are not turned into links |
| V12 | File list obtained from `<input webkitdirectory>` | Yes. `webkitRelativePath` is obtained in the form `フォルダ名/…` (folder name/…). The browser also enumerates folders starting with `.` and the contents of `node_modules` |
| V13 | `TextDecoder` with `shift_jis` / strict UTF-8 mode / UTF-16 | Yes. All work |
| V14 | A folder handle can be stored in IndexedDB, read back and reused | Partly. Succeeds with a normal profile (also after reload). With Playwright's default temporary profile, the renderer crashed when reading it back |
| V15 | Escaping for inlining the always-loaded libraries into HTML (replacing the `<` of `<!--` `<script` `</script` with `\x3c`) | Yes. markdown-it (4 places), DOMPurify (2 places) and highlight.js (2 places) all passed a syntax check after replacement |
| V16 | Whether Firefox / WebKit can be installed in the test environment | **No: not possible**. Access to the browser distribution sites was refused by network restrictions |

---

## 3. Findings and responses

Severity: **High** = requires a change of design or approach / **Medium** = requires additions to or more detail in the specification / **Low** = supplementary or clarifying wording.

### 3.1 Feasibility and testing

| ID | Severity | Finding | Response |
|---|---|---|---|
| RV-01 | High | It had not been confirmed that the main APIs work under `file://`. OPFS does not work (V3) | Confirmed in V1 to V3. OPFS is not relied on. Test method stated in Section 10 |
| RV-02 | High | It had not been confirmed whether lazily loaded scripts can run under the CSP hash approach. Also, generating all scripts dynamically carries a large risk in unverified browsers | Confirmed in V4. The always-loaded parts are ordinary inline scripts; dynamic generation is limited to KaTeX / Mermaid (8.2) |
| RV-03 | High | It had not been confirmed whether KaTeX / Mermaid work without `unsafe-eval` | Confirmed in V5 and V6. `unsafe-eval` stays out of the CSP (SEC-4) |
| RV-04 | High | The full Mermaid build bundles `elkjs`, which is under a copyleft-type license (V7), contrary to the policy of "bundle only permissively licensed code" | Adopted the lightweight build. Unsupported diagram types stated as out of scope (1.4, 8.4) |
| RV-05 | Medium | On syntax errors, Mermaid by default inserts an error diagram into the DOM, duplicating the error display of FR-206 | Use `suppressErrorRendering` and show errors ourselves (implementation decision; V8) |
| RV-06 | Medium | KaTeX prints strict-mode warnings to the console, which confuses judging the pass criterion (no console errors) | Call KaTeX with `strict: 'ignore'` (implementation decision) |
| RV-07 | High | The Firefox / Safari engines cannot be installed in the test environment (V16), yet 0.9 listed both unconditionally as "secondary targets" | Section 2 changed to "secondary targets, no automated tests run"; stated the approach of implementing with standard APIs plus feature detection, and the creation of a manual check list (Sections 2 and 10) |
| RV-08 | Medium | The native folder selection dialog cannot be automated, and the test method for the `showDirectoryPicker` path of FR-101 was undefined | Verified with a substitute handle under `file://` and with a real OPFS handle on `http://127.0.0.1`. The dialog itself is a manual check item (Section 10) |
| RV-09 | Medium | Reading back a stored folder handle can fail with a temporary profile (V14) | Added to FR-108: "if storing or restoring fails, the feature is simply not shown". Tests use a normal profile |

### 3.2 Security

| ID | Severity | Finding | Response |
|---|---|---|---|
| RV-10 | High | DOMPurify passes the `style` attribute through (V10). This enables external requests via `url()` and spoofing the screen with `position:fixed` | Made SEC-3 concrete (a whitelist of allowed properties; removal of values containing `url()` etc. and of positioning properties) |
| RV-11 | Medium | Table column alignment is output as a `style` attribute (V11), so banning `style` entirely would break column alignment | Include `text-align` in the SEC-3 whitelist and state this explicitly |
| RV-12 | Medium | `class` also passes through, so a document can imitate parts of the app (such as the copy button) | Remove app-internal classes (`mdv-`) and `data-*` from user HTML (SEC-2) |
| RV-13 | Medium | Opening a link to an attachment as a blob URL in a new tab would make an HTML attachment be interpreted in the same origin as the app | Attachments are always treated as downloads (SEC-9, FR-211) |
| RV-14 | Medium | The paths that could cause external requests (`src` `srcset` `poster`, `url()` in `style`, `<a ping>`, `<link>`, `<meta refresh>`, `<base>`, `<form>`) had not been listed exhaustively | Reflected in SEC-1 / SEC-3 and in the CSP notes. "No requests occur" becomes an E2E verification item |
| RV-15 | Low | Under `file://`, depending on the browser, storage is shared with other local HTML files | Stated that stored content is limited to display settings and the folder handle (5.6) |
| RV-16 | Low | Handling of inline SVG / MathML and SVG images was not described | Stated in SEC-1 (removed) and SEC-9 (SVG images only via `<img>`) |

### 3.3 Gaps and ambiguities in the specification

| ID | Severity | Finding | Response |
|---|---|---|---|
| RV-17 | Medium | There was no list of supported Markdown syntax, so it was impossible to judge "how much can be displayed" | Added 3.2.1 (including the scope of autolinks, the rules for recognizing `$` in math, and line break rules) |
| RV-18 | Medium | Concern that autolinking mistakes strings like `README.md` or `main.py` for URLs (`.md` and `.py` are real TLDs) | Only URLs with a scheme and email addresses are linked (3.2.1; confirmed in V11) |
| RV-19 | Medium | How the root is decided when several items are dropped, and dropping in site mode, were undefined | Added to FR-103 |
| RV-20 | Medium | Behavior when opening something else while a document set is open was undefined | Added FR-111 (replace without confirmation) |
| RV-21 | Medium | No mention that images and link targets cannot be resolved when only files are opened | Added FR-112 |
| RV-22 | Medium | Behavior when opening (reloading) a URL with a hash in viewer mode was undefined | Added to FR-304 (show the start screen, then move to that document after loading) |
| RV-23 | Medium | The text searched and the definition of "relevance" were ambiguous | Stated in FR-401 / FR-402 |
| RV-24 | Medium | With loading methods that do not hold a handle, files changed after selection may not be reloadable | Added to FR-109 (prompt the user to open again) |
| RV-25 | Low | With `<input webkitdirectory>`, the browser also enumerates excluded items (V12) | Added "excluded by the app" to FR-106 and a note on the time required to Section 11 |
| RV-26 | Low | It was unclear what "entry" in FR-110 refers to | Corrected to "files and folders" |
| RV-27 | Medium | Link resolution did not define handling of links to `.html` (common in documents written for static site generators), `file:` URLs, or Windows absolute paths | Added to 5.3: reading `.html` as `.md`, and that absolute paths do not work (also noted in Section 11) |
| RV-28 | Low | The correspondence between the heading ID prefix (`user-content-`) and URL fragments was undefined | Added to 5.2 |
| RV-29 | Low | Re-rendering of diagrams on theme change and colors when printing were undefined | Added to FR-501 / FR-504 |
| RV-30 | Low | The display when the math or diagram library is unavailable (excluded by FR-603, or cannot run) was undefined | Fallback display added to FR-205 / FR-206 / 8.2 |
| RV-31 | Low | Progress display while scanning a folder, and switching over when `showDirectoryPicker` fails, were not described | Added to FR-101 |
| RV-32 | Low | The tree sort order could change with the user's locale (a distributed site would look different to different people) | Added a fixed collation rule to FR-301 |
| RV-33 | Low | FR-902 "stay on the start screen" is inappropriate when a document set is already open | Corrected to "keep the previous display" |
| RV-34 | Low | Focus handling when switching documents was not described (for keyboard and screen reader users) | Added to NFR-4 |

### 3.4 Licensing

| ID | Severity | Finding | Response |
|---|---|---|---|
| RV-35 | Medium | The license notices built into the HTML covered only third-party code and did not include a notice for our own code (MIT) | Added our own code to FR-802 and Section 9 |
| RV-36 | Medium | Notices for dependencies that bundled libraries pull in internally (e.g. d3, lodash-es, DOMPurify inside the lightweight Mermaid build) were not considered. Also, if an unintended license slipped in during a library update, nobody would notice | Added notices for dependencies to 8.4 (listed from the dependency tree, erring on the safe side to avoid omissions). Added a license check to NFR-6 |
| RV-37 | Low | The handling of the KaTeX font licenses had not been checked | Include the KaTeX package LICENSE (MIT). Because some distributions treat the fonts as SIL OFL 1.1, also include the full text of OFL 1.1 (implementation decision) |

### 3.5 Other

| ID | Severity | Finding | Response |
|---|---|---|---|
| RV-38 | Low | NFR-3 (5 MB or less) leaves little margin over the estimate (about 4.4 MB) | Changed to 6 MB or less |
| RV-39 | Low | Handling of the total size of an export was undefined | Added a warning above 100 MB to FR-602 |
| RV-40 | Low | Because of the CSP hash approach, the HTML stops working if it is rewritten in transit | Note added to Section 6; recommendation of zip distribution added to Section 11 |
| RV-41 | Low | Some out-of-scope items were unclear (previous / next, `[TOC]`, definition lists) | Added to 1.4 |

---

## 4. Open issues (not resolved by the review)

| # | Description | Handling |
|---|---|---|
| 1 | Behavior in Firefox / Safari cannot be tested automatically | The specification states "no automated tests run". A manual check list is attached to the test report |
| 2 | `showDirectoryPicker` through the native folder selection dialog, and storing and restoring a real handle obtained under `file://` (FR-108), cannot be tested automatically | Same as above. Designed so that failure does not affect viewing |
| 3 | Checking on a real Windows machine (Edge) is not possible in this environment | Same as above (the engine is the same Chromium) |
| 4 | The exact list of dependency libraries actually included in the lightweight Mermaid build cannot be determined mechanically from the distribution | License notices are listed from the dependency tree, erring on the safe side (notices for things not included may be mixed in, but nothing will be missing) |

---

## 5. Addendum after implementation and testing (2026-11-13)

This review was based on the specification and small experiments; it did not run and check the finished product. Testing after implementation found 16 problems that the review did not find. The list and responses are in Section 6 of [TEST_REPORT.md](TEST_REPORT.md). The lessons for the review are recorded here.

| What was missed | Why it was missed | What future reviews should check |
|---|---|---|
| Image references inside diagrams (Mermaid) caused external network requests (T-08) | The assumption "used with safe settings" was trusted based only on the library's description. The RV verification tried only the document's `<img>` | Check properties such as "makes no network requests" by actually observing the traffic, not by listing paths and ruling them out on paper. Be suspicious of loading paths that third-party libraries have of their own |
| 5 accessibility defects (T-13) | The checklist was coarse, covering only "give it a name" and "contrast" | Use an independent checking engine (axe-core) from the verification stage of the review |
| Broken layout in environments where scroll bars are always shown (T-15) | The browser used for verification was set to hide scroll bars | First identify how the verification environment differs from real-world environments (scroll bars, fonts, locale) |
| Display time for large documents just barely within the target (T-11) | The performance target was set without measurements to back it | Measure the processing time of the bundled libraries before setting targets |

Current status of the open issues (Section 4):

- 1 (Firefox / Safari): Automated checks of the main features were done with the Firefox engine (Gecko 160) and a Safari-family engine (WebKitGTK 2.52). (At the time of V16 it was judged that they could not be installed, but other distributions using the same engines were available.) Checking on the actual product versions remains a manual check item.
- 2, 3: Unchanged (manual check items).
- 4: Unchanged.

---

## 6. Review of the 1.0.1 changes (2026-11-13)

This records a review of the specification (SPEC.md 1.2), before and after implementation, for the changes that allow placing the sample on a public page (a hosting environment that shows it inside a frame of another page). The reviewer is the implementer, not a third party.

| # | Severity | Finding | Response |
|---|---|---|---|
| A-1 | **High** | In an environment where the host injects scripts into the page, it does not work unless the CSP written in the HTML is removed. Once removed, the HTML itself can no longer guarantee that it "does not communicate externally". Yet the start screen says files "are never sent anywhere", which would be an overstatement | Positioned the converted HTML as "for trying out", and stated in the specification what cannot be guaranteed (6.1). Added a setting (`hosted`) that replaces the wording of the start screen and How to use with wording that says it is a public page for trying out the viewer |
| A-2 | High | In an environment where frame restrictions block saving, "Export as site" and saving attachments become actions that do nothing when pressed | Added the setting `allowDownloads`, and the affected actions are not shown. Links to attachments show that saving is not possible |
| A-3 | Medium | The toggle for showing external images also does not work in an environment where the host's CSP blocks them. The handling when the user has a saved "show" setting also needs to be decided | Added the setting `lockExternalImages`. The toggle is not shown, and it takes precedence over a saved setting and over `allowExternalImages`. The CSP added at startup (SEC-10) is still applied |
| A-4 | Medium | If links between documents are left to the browser's default navigation, then in an environment where the document URL differs from the base URL for links (`srcdoc`), the frame navigates to another page | Reproduced by experiment (Chromium). Changed so that the app itself handles in-app links (FR-211). Opening in a new tab (click with a modifier key) is left to the browser |
| A-5 | Medium | Inside a frame, the clipboard API may not be permitted. If the app waits for the refusal before falling back to the older method, some browsers no longer treat it as "within the user's action" and it fails. Also, the older method does not throw on failure, so the app would show "Copied" | Inside a frame, try the older method first. Check the result, and show "Could not copy" when it did not work (FR-204) |
| A-6 | Medium | On smartphones, filtering file selection by extension makes `.md` unselectable on some devices (file type handling differs by device and app). This cannot be reproduced in the test environment | Do not filter on touch devices (FR-102). This is a preventive change; the report states that it has not been checked on real devices |
| A-7 | Low | If `hosted` were carried over into HTML created by the in-app export, HTML meant for local use would say "this is a public page" | Not carried over on export (5.4) |
| A-8 | Low | In an environment that serves a nonce-based CSP, libraries loaded later (math, diagrams) do not run | Carry over the nonce of the existing script (2.1). Whether the target hosting environment uses this approach has not been confirmed |
| A-9 | Medium | (Found during publishing) The publishing destination did not accept files containing the replacement character (U+FFFD). A bundled library (markdown-it) uses this character literally in 11 places in its script. The review had not anticipated that the destination inspects file contents | The conversion rewrites them as escapes with the same meaning (6.1). Tests confirm that the display of invalid input is the same before and after the rewrite |

Not resolved:

- Behavior could not be checked in the actual hosting environment (Claude artifacts) or on real smartphones. Publishing itself succeeded (after the A-9 fix, the destination accepted the 2 pages), but the published pages could not be opened to check display and operation (the browser available for checking was not signed in to the destination). What was checked was a frame imitating the conditions based on the published documentation (different origin, sandbox, a CSP limiting images to `data:` / `blob:`, script injection) and a browser imitating touch input. Differences from the real environment may remain; this is recorded as unverified in the report (Section 8).
- In the already distributed `mdfolio-1.0.0.zip`, Japanese file names lack the UTF-8 flag, so in some Windows environments the file names in `sample-docs` are garbled when extracted (report T-19). The 1.0.0 review and testing did not check the file names inside the zip against how Windows handles them. For the rebuilt zip, it was only checked mechanically that the flag is set; it has not been extracted on a real Windows machine.


---

## 7. Specification review of the folder edition (1.1.0) (2026-11-15)

This records a review of SPEC.md 8.6 before implementation. The reviewer is the implementer.

| # | Severity | Finding | Response |
|---|---|---|---|
| B-1 | **High** | Under `file://`, scripts cannot read the contents of CSS loaded via `<link>`, so the in-browser export cannot include the CSS directly. If nothing is done, users cannot notice that their edited CSS is not reflected in the export | The update command creates a copy of the CSS (`data/styles.js`), and the export uses it. The export screen says "if you change the CSS, run the update command first" (FD-6) |
| B-2 | High | Just placing Markdown in `docs/` does not make it appear (a list cannot be built under `file://`). Without knowing why, users will be confused | State that the update command must be run in How to use, the README, and an explanation file placed in `docs/`. Always create `data/site.js`, and show no error even when there are no documents |
| B-3 | Medium | When the script permission becomes `'self'`, under `file://` any file on the same machine may fall within the permitted scope (depending on the browser). The defense weakens if something gets past sanitization (SEC-1 to SEC-3) | Stated in the specification (8.6 "Security differences from the single HTML file"). External scripts (http / https) still do not run. The option of using the single HTML version for sensitive use remains |
| B-4 | Medium | Firefox handles `file://` differently from Chrome (loading files in subfolders, interpretation of `'self'`). Checking only on Chromium would miss this | Add folder edition items to the Gecko / WebKit checks (`tests/cross/`) |
| B-5 | Medium | If diagram (Mermaid) colors are fixed in the script, changing the colors in CSS leaves only the diagrams in their original colors, which defeats the goal of "consistent design" | Take diagram colors from CSS variables (FD-4). Fall back to the default colors when the diagram library cannot interpret a value |
| B-6 | Low | When users change the color variables, the contrast between text and background may fall below the standard (4.5:1) | Write a caution at the top of `document.css`. Automated accessibility checks are run against the default colors |
| B-7 | Low | If another folder is opened while the bundled documents are shown, users lose the bundled documents unless there is a way back | Put "Back to the bundled documents" in the menu (FD-2) |
| B-8 | Low | If the single HTML and the CSS are maintained separately, their appearance drifts apart | Share the source CSS (`src/app.css`, `src/document.css`) between both formats, and concatenate and embed it in the single HTML |

---

## 8. Specification review of the public pages and English versions of the documents (2026-11-16)

This records a review of SPEC.md 8.7 before implementation. The reviewer is the implementer.

| # | Severity | Finding | Response |
|---|---|---|---|
| C-1 | Medium | GitHub Pages cannot vary the page returned by browser language. Without redirecting by script, English users also land on the Japanese guide | Put an "English" link in a prominent place at the top of the guide (PG-2). The English README links directly to the English guide. Redirecting by script is not done, because it makes the back button behave confusingly and also puts a script into the guide page |
| C-2 | Medium | If the sample's UI language stays `auto`, opening the Japanese sample in an English browser gives an English UI with Japanese body text, which is inconsistent | The samples on the public pages are fixed to the language of their documents (PG-3). The samples in the distribution (`dist/`) stay `auto` as before, so the distribution does not change |
| C-3 | Medium | The Japanese and English samples tend to drift apart when only one is updated | Unit tests check the number of documents in both and that the targets of relative links and images exist (PG-4, PG-8) |
| C-4 | Medium | If English documents refer to UI parts in their own words, they will not match what is shown on screen and users cannot find them | Use the words of the English UI (`en` in `i18n.js`) as is (PG-5) |
| C-5 | Low | The sample diagram (`overview.svg`) contains Japanese text | Prepare a version of the diagram with English text |
| C-6 | Low | The specification, review record and test report are long (about 130,000 characters in total), and continuing to maintain English versions would be difficult | Not translated into English. The English manual and README say so (PG-6) |
| C-7 | Low | The sample's search example (full-width 「ｍｅｒｍａｉｄ」) does not convey its meaning in English | In the English version, replace it with a case-insensitive example (`MERMAID`) (PG-4) |
| C-8 | Medium | (Added after a comment from the project owner) The app's HTML contains the full text of the license notices, but the guide on the public pages only says "you can see them in the menu" and does not include the full text | Include the full text in the guide page too. Because it is long (about 100,000 characters), it goes in a collapsible section. `<details>` is used so it can be opened without scripts. Unit tests confirm that every public page contains the full text (PG-9) |

---

## 9. Specification review of 1.2.0 (2026-11-16)

This records a review of the SPEC.md 1.7 changes before implementation. The reviewer is the implementer.

| # | Severity | Finding | Response |
|---|---|---|---|
| D-1 | **High** | The automated workflows (AU-1, AU-2) have permission to rewrite the `gh-pages` branch and releases. If third-party actions were used, whatever their authors changed would run as is | Do not use third-party actions (AU-4). Publishing and releases are done with the `git` and `gh` commands already installed in the runner. Permission is limited to `contents: write` |
| D-2 | Medium | If a version that fails unit tests is published, the public pages break | Run the unit tests first, and do not publish if they fail (AU-1). Browser tests (E2E) take time and need a browser set up, so they are not included in the automated workflow; they are run as part of the development procedure |
| D-3 | Medium | If the tag version and the `package.json` version differ, the release name and the version of its contents will not match | Stop if they do not match (AU-2) |
| D-4 | Medium | If the update command's language is decided only by the OS settings, test results vary with the machine that runs them | Allow fixing it with the environment variable `MDFOLIO_LANG`, and specify it in tests (FD-10) |
| D-5 | Medium | `LANG=C` (no language specified) environments are rare on Japanese Windows but common in Linux and Mac terminals. They would get English | Use English (anything other than `ja` is English). `はじめに.txt` (Getting started) and `--help` say that `MDFOLIO_LANG=ja` can be used to get Japanese |
| D-6 | Low | The sample documents of the folder edition (`docs/`) are only in Japanese | `docs/` in the distribution is a sample, so it stays in Japanese; `README.txt` explains how to use the English sample (`sample-docs-en/`). The public pages have a folder edition of the English sample |
| D-7 | Low | The proposal to specify the CSS for export (A7) is useful only for verification | Not done. Instead, the condition in which the screen and the export differ (forgetting to run the update command) is listed as a known limitation |
| D-8 | Low | The license notices include dependency libraries that are not actually included (open issue 4 in Section 4). The project owner asked about the intent | The policy is unchanged. Missing notices would be a license violation, but extra ones cause no problem. The lightweight Mermaid build is compressed into a single file, and which dependency libraries' code ended up in it cannot be checked mechanically, so everything it may depend on is listed |
| D-9 | Low | Deleting `dist/hosted/` removes the source files of the trial pages published in 1.0.1 (Claude artifacts) | The conversion tool (`make-hosted.mjs`) is kept, so they can be rebuilt at any time. The published pages themselves are not removed |
| D-10 | Medium | The English text is a translation by a native Japanese writer (the implementer), and unnatural expressions may remain. In the project owner's environment it is hard to get a check by a native English speaker | Have a separate AI (a model of the same family) that is given no background read only the English text, and fix based on its comments. The main comments were literal translations from Japanese ("screen" used to mean the whole display, "fixed place", "character width"), statements that contradicted the app's behavior (the reload after switching to show external images happens automatically), inconsistent spelling of "folder edition", and singular/plural in the UI English ("1 results"). After that, fixes were also made based on comments from two AIs from other companies that the project owner had asked to read the text (literal-sounding "nothing but", "hand over", choice of verbs, UI wording, etc.). Comments were adopted only after checking them against the implementation, and suggestions that changed the meaning were not adopted (e.g. a suggestion to rephrase the update command as "run from inside the mdfolio folder", when it actually means "run update.mjs, which is inside the folder"). This is no substitute for a check by native speakers, so the English README and guide page ask readers to report wording errors via GitHub Issues |

---

## 10. Specification review of 1.3.0 (adjacent CSS, removal of the folder edition; 2026-11-17)

This records a review of SPEC.md 1.9 before implementation. The reviewer is the implementer.

| # | Severity | Finding | Response |
|---|---|---|---|
| E-1 | **High** | A page opened via `file://` can apply the adjacent CSS on screen but cannot read its contents (confirmed by experiment: on Chromium, `cssRules` gives `SecurityError` and `fetch` fails). If nothing is done, users will assume the export looks the same as the screen | On the export screen, when the adjacent CSS is applied but its contents cannot be read, show that it "is not included in the export; to include it, choose the same file" (FR-1004). The chosen CSS is embedded (FR-1002) |
| E-2 | Medium | When there is no adjacent `mdfolio.css`, the browser fails to load it and shows an error in the developer tools. The automated tests use "no errors, no network requests" as a pass condition | It does not affect user operation, so it is accepted as part of the specification (3.10, Security). The test tools exclude only the single load of the adjacent `mdfolio.css` and its failure. All other requests and errors still fail the tests as before |
| E-3 | Medium | Does widening the CSP `style-src` give documents more room to load other CSS? | `<link>` and `<style>` in documents are removed by sanitization (SEC-1 to SEC-3). Only `'self' file:` (the same origin and local files) is added, so CSS from external servers cannot be loaded. Script permissions are unchanged |
| E-4 | Medium | When exporting again from within an exported site, the appearance changes if the embedded CSS is lost | CSS embedded in the current HTML is carried over by default (FR-1003) |
| E-5 | Medium | If the CSS to embed contains `</style`, the HTML breaks | Not accepted, and the reason is shown (FR-1005). The same applies to the command-line version |
| E-6 | Medium | Some users received the folder edition (1.1.0, 1.2.0) | Announce the removal in the changelog and release notes. The migration path is "the single HTML file plus an adjacent `mdfolio.css`". Older versions remain available from the releases |
| E-7 | Low | When embedded in another page (`srcdoc`), the relative path `mdfolio.css` is resolved against the location of the outer page | This only applies CSS belonging to the owner of the outer page, so there is no security problem. Treated as known behavior |
| E-8 | Low | The folder edition sample on the public pages goes away | Instead, provide an "appearance sample" (the export sample with an `mdfolio.css` placed next to it) to show that the adjacent CSS changes the appearance |

---

## 11. Review of the fixes from the user evaluation (specification 1.13; 2026-11-18)

Twenty evaluators, each with a different job (technical writer, security officer, accessibility auditor, city-office clerk, physics professor, data scientist, product manager, support lead, nurse educator, lawyer, open-source maintainer, designer, bakery owner, teacher, SRE, translator, QA engineer, hobbyist author, enterprise architect, consultant), built their own sample documents and used 1.3.1 in a headless browser. Average score 3.85 of 5; all 20 would use it; no critical issues. The reviewer (the implementer) reproduced the issues below before accepting them.

| # | Severity | Finding | Decision |
|---|---|---|---|
| G-1 | High | The example `examples/mdfolio.css` sets `--desk` only in `:root`; in the dark theme the header and sidebar become light with light text (unreadable). Confirmed | Fix the example; define the dark theme too and explain the rule |
| G-2 | Medium | Pie slices are shades of one color; one slice equals the page background (light and dark). Confirmed | FR-1101 |
| G-3 | Medium | Wide diagrams (Gantt, wide flowcharts) are shrunk to about half; text is about 6px. Confirmed | FR-1102. A zoom view is a feature request (deferred) |
| G-4 | Medium | The title defaults to the folder name (`docs`). Confirmed | FR-1104 |
| G-5 | Medium | The file list shows file names, not titles (six evaluators). Confirmed | FR-1105 |
| G-6 | Medium | `**1.8%**の` does not become bold (CommonMark's flanking rules do not suit Japanese). Confirmed | FR-1106, with the MIT-licensed plugin markdown-it-cjk-friendly (added with the requester's approval; its dependency get-east-asian-width is also MIT). Latin text keeps the CommonMark rules (checked by unit tests) |
| G-7 | Medium | The external image permission is shared by every mdfolio file opened from disk (all `file://` pages share one storage area in Chromium). Confirmed in the code | FR-1107 |
| G-8 | Medium | The active sidebar item stays off-screen on long lists. Confirmed (y=2255 in an 800px window) | FR-1109 |
| G-9 | Medium | Wide tables give no cue on phones that columns are hidden. Confirmed that the table overflows | FR-1103 |
| G-10 | Low | `\label{…}` is shown in red. Confirmed. The reported loss of `\gdef` between formulas was not reproduced | FR-1110 |
| G-11 | Low | Enter right after typing a search does nothing. Confirmed | FR-1113 |
| G-12 | Low | A backslash in code is shown as a yen sign when only Japanese fonts are available. Reported on Linux | FR-1112 |
| G-13 | Low | The help assumes the reader knows Markdown; the empty-folder message gives no next step | FR-1111 |
| G-14 | Low | Drawer focus: focus can move behind the scrim; Esc could lose focus. The Esc case was not reproduced, but the drawer is made robust | FR-1108 |

Deferred feature requests (not in this version): printing or making a PDF of all documents at once; clickable cross-references in PDF; a broken-link and orphan-page check before export; search stemming, phrase search and more than 50 results; zoom for diagrams and images; backlinks; previous/next page links; choosing which files to export; line numbers and soft wrap for code; sticky table headers; ticking task lists; per-document `lang`; EUC-JP support.

## 12. External code review of 1.4.0 (2026-11-20)

An outside review of 1.4.0 found no defects and made 8 suggestions. Each was checked against the code.

| # | Suggestion | Check | Action |
|---|---|---|---|
| H-1 | `probeUserCss` waits forever if neither `load` nor `error` fires | Confirmed in the code (not seen in Chromium) | Gives up after 3 seconds and treats the CSS as absent |
| H-2 | Heading extraction (`core.extractHeadings`) and heading IDs (`md.js`) use different text rules | Not a defect: `extractHeadings` only gives the title during indexing; the outline and IDs come from the rendered document, and the title is corrected when the document is shown | None |
| H-3 | `tools/build.mjs --out` without a value fails with an internal error | Confirmed | Clear message for `--out` and `--without` without a value |
| H-4 | `make-docs-site.mjs` leaves its temporary folder when the export fails | Confirmed | Removed in `finally` |
| H-5 | "Reload" of a folder returns to the top of the page | Confirmed. Investigating it found a second, older problem: closing the menu moved focus to the menu button in the sticky header, and Chromium then scrolled the page (from 600px to 130px). This happened after every menu action | Reload keeps the scroll position; focus in the header and menu moves without scrolling |
| H-6 | README: say why to zip a site before sending | Agreed | One sentence in both READMEs |
| H-7 | The examples in SPEC 8.2 say `mdfolio 1.0.1` | Confirmed | Updated to 1.4.0 |
| H-8 | Check the adjacent `mdfolio.css` in Firefox / Safari | Already in `tests/cross/smoke.mjs` since 1.3.0, but those engines are not available in this environment | Still not verified |
