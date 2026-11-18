# mdfolio Specification

| Item | Details |
|---|---|
| Version | 1.9 (appearance override with an adjacent CSS file; folder edition removed) |
| Date | 2026-11-13 |
| Subject | A Markdown document site that runs on local HTML / JavaScript only |
| Related documents | [REVIEW.md](REVIEW.md) (specification review record), [TEST_REPORT.md](TEST_REPORT.md) (test report) |

---

## 1. Overview

### 1.1 Purpose

Make it possible to browse and distribute a set of local Markdown documents as a "document site" using only a browser, **with no server, no build tools, no installation and no network connection**.

### 1.2 Usage scenarios

| ID | Scenario | Summary |
|---|---|---|
| S1 | Browse your own document folder | Double-click `mdfolio.html` to open it and choose a document folder. Browse with a tree, links between documents and full-text search (**viewer mode**) |
| S2 | Distribute documents as a bundle | Export the whole set of open documents as a single HTML file with the documents embedded (hereafter "site HTML") |
| S3 | Read a distributed site HTML | Recipients only need to double-click the HTML to read it. No operation or setup is needed (**site mode**) |
| S4 | Take a quick look at a single `.md` | Drop the file onto the window to display it |

### 1.3 Assumptions and constraints (arising from browser behavior)

| ID | Constraint | How this specification handles it |
|---|---|---|
| C1 | A page opened via `file://` cannot read local files with `fetch` / `XMLHttpRequest` | Do not use any network API at all. Documents are obtained either by (a) the user choosing a folder / files, or (b) embedding them in the HTML |
| C2 | ES Modules (`type="module"`) cannot be loaded under `file://` | Use classic scripts only |
| C3 | A page cannot read arbitrary local paths without a user action | Handled by folder selection, drop and embedding |
| C4 | Used in offline environments | Do not reference external resources such as CDNs. All required libraries and fonts are built into the HTML |

### 1.4 Out of scope (not implemented in this version)

- Editing Markdown
- Fetching `.md` files from a server over HTTP on demand and displaying them (the docsify approach)
- Direct PDF output (use the browser's print function instead)
- Emoji shortcodes (`:smile:`), wiki links (`[[...]]`), `[TOC]`, definition lists
- Mermaid Mindmap / Architecture diagrams (not supported by the bundled lightweight Mermaid)
- "Previous / Next" links to adjacent documents

---

## 2. Operating environment

| Browser | Status | Notes |
|---|---|---|
| Microsoft Edge / Google Chrome (latest stable, PC) | **Primary target, tested** (Chromium engine) | All features |
| Firefox / Safari (latest stable, PC) | Secondary target, **only a simple check per engine** | Implemented with standard APIs only, branching by feature detection. Folders are opened with the file selection dialog. "Reopen last folder" and auto-reload are not supported (their buttons are not shown). Main features were checked automatically with the Firefox engine (Gecko 160) and a Safari-family engine (WebKitGTK 2.52) (chapter 10). Not checked in the released Firefox / Safari products themselves |
| iOS / Android browsers | Intended for reading site HTML and for "Open files"; **not verified on real devices** | Only automated tests in an environment simulating a 390px width and touch input were run. Opening a folder is not guaranteed |
| Internet Explorer | Not supported | |

- How to start: open the HTML file directly in the browser (`file://`). It also works the same when placed on a web server (`http(s)://`).
- Requirements to run: only one of the browsers above.
- Main operation is assumed to be on a PC (mouse and keyboard). Basic browsing also works with touch input.

### 2.1 When displayed embedded inside another page

Make the features needed for reading work even in environments that display the HTML inside an `<iframe>` (previews in document management systems, hosting services that serve HTML, etc.).

| Condition | Behavior |
|---|---|
| The document URL and the base URL for links differ (embedding with `srcdoc`, etc.) | The app itself handles links between documents (FR-211). If left to the browser, the frame navigates to another page and the display disappears |
| Storage (localStorage / IndexedDB) is unavailable | Settings change only for the current session (FR-702). "Reopen last folder" is not shown |
| The folder selection API is refused (cross-origin frame) | Falls back to the `<input>` method (FR-101) |
| The clipboard API is not permitted | Copy using the legacy method; if that fails, show "Could not copy" (FR-204) |
| The page is served with a nonce-based CSP | Pass the same nonce on to the libraries loaded later (math and diagrams) |
| Saving files, external loading or dialogs are blocked by frame restrictions | Settings (`allowDownloads` / `lockExternalImages` in 5.4) can keep the affected operations off the screen |

In hosting environments that inject their own scripts into the page, the CSP written in the HTML (SEC-4) blocks those scripts. To place the HTML in such an environment, use `tools/dev/make-hosted.mjs` to convert it into a "trial" HTML with the CSP removed and the settings above applied (6.1).

---

## 3. Functional requirements

Priority: **Required** = must be met in this version / **Recommended** = implemented in this version, but the feature is hidden when the browser does not support it.

### 3.1 Loading documents

| ID | Priority | Requirement |
|---|---|---|
| FR-101 | Required | **Open folder**: choose a folder with a button, scan it recursively and build a document set. Use the File System Access API (`showDirectoryPicker`) in browsers that support it; when it is unavailable or refused (except when the user cancels), automatically fall back to `<input type="file" webkitdirectory>`. Show progress (item count) while scanning |
| FR-102 | Required | **Open files**: choose and open one or more Markdown files. On a PC, filter the selection dialog to Markdown extensions. On finger-operated devices (devices whose main input is touch), do not filter (how the `.md` type is handled differs by device and by the app storing the file, and filtering can make files impossible to choose). If only non-Markdown files are chosen, notify as in FR-902 |
| FR-103 | Required | **Drag and drop**: drop files or folders onto the window to open them. If exactly one folder is dropped, that folder becomes the root; otherwise (several items, or files) the dropped items are placed directly under the root. Drops are not accepted in site mode |
| FR-104 | Required | **Embedded data**: if the HTML contains site data (5.5), load it as the document set at startup (site mode) |
| FR-105 | Required | **Target files**: files with the extensions `.md` `.markdown` `.mdown` `.mkd` `.mkdn` `.mdwn` `.mdtxt` `.mdtext` (case-insensitive) are "documents". All other files are "attachments" and are read only when a document references them as an image or link |
| FR-106 | Required | **Exclusions**: folders and files whose names start with `.`, and `node_modules` folders, are not loaded (the app excludes them for every loading method) |
| FR-107 | Required | **Character encoding**: automatically detect UTF-8 (with or without BOM), UTF-16 (with BOM) and Shift_JIS (CP932). Detection order: BOM → strict UTF-8 decode → strict Shift_JIS decode → UTF-8 (invalid bytes become replacement characters) |
| FR-108 | Recommended | **Reopen last folder**: save the handle of a folder opened with `showDirectoryPicker`, so that next time it can be opened from the start screen with one click (plus the browser's permission prompt). If saving or restoring fails, simply do not show the feature; do not treat it as an error |
| FR-109 | Recommended | **Reload**: the menu can rescan the folder and reload the displayed document. When opened with `showDirectoryPicker` (or a drop that provides a handle), detect changes to the displayed document file about every 2 seconds and automatically redisplay it while keeping the scroll position. With loading methods that have no handle, a file changed after it was chosen may not be reloadable; in that case, prompt the user to open it again |
| FR-110 | Required | **Limits**: up to 5,000 documents and up to 50,000 scanned files and folders. Anything beyond is not loaded, and the user is notified. Documents larger than 10MB are displayed as plain text without Markdown conversion |
| FR-111 | Required | **Replacement**: if another folder or files are opened while a document set is open, replace the document set without confirmation and show the home document |
| FR-112 | Required | **Single-file handling**: when only files (not a folder) are opened, images and link targets that were not chosen at the same time cannot be resolved. The image placeholder says that opening the folder will display it |

### 3.2 Display (rendering)

| ID | Priority | Requirement |
|---|---|---|
| FR-201 | Required | Display CommonMark and the GFM extensions (tables, strikethrough, task lists, autolinks for URLs / email addresses). Supported syntax is as in 3.2.1 |
| FR-202 | Required | Display footnotes (`[^1]`) |
| FR-203 | Required | Give headings IDs and show an anchor link next to each heading. IDs follow the GitHub style (lowercased, symbols removed, spaces turned into hyphens, Japanese kept, duplicates get `-1` `-2` appended) |
| FR-204 | Required | Syntax-highlight code blocks according to the language specified (no highlighting when no language is specified or it is unsupported). Show the language name and a copy button on each code block. If copying fails, do not pretend it succeeded; show "Could not copy". Inside a frame, first try a method that copies synchronously within the click action (some browsers stop accepting copies after waiting for the asynchronous API to be refused). Highlighting is done after sanitizing, and the highlighted result is also passed through the sanitizer before insertion. Do not highlight if it would change the characters of the code. Per document, the part beyond 20,000 characters or 60 blocks is processed after display, in order of closeness to the visible area (the remainder is processed all at once before printing) |
| FR-205 | Required | Math (KaTeX): inline `$...$`, display `$$...$$`, and ```` ```math ```` blocks. Syntax errors are shown as errors at that spot, and the rest of the document continues to display. If the library is unavailable, show the original math source |
| FR-206 | Required | Diagrams (Mermaid): display ```` ```mermaid ```` blocks as diagrams. On a syntax error, show the error message and the original code. If the library is unavailable, show the original code |
| FR-207 | Recommended | GitHub-style alerts (`> [!NOTE]` `[!TIP]` `[!IMPORTANT]` `[!WARNING]` `[!CAUTION]`) |
| FR-208 | Required | YAML front matter (from the leading `---` to `---`) is not shown in the body. If it has `title`, use it as the document title |
| FR-209 | Required | Raw HTML in Markdown is displayed after sanitizing (chapter 6) |
| FR-210 | Required | **Images and media**: relative paths are resolved to files in the document set and displayed. If not found, show a placeholder. External (`http(s)://`) images and media are blocked by default with a placeholder, and can be allowed in the settings. Blocking is done by CSP as well as by the display processing (SEC-10). When switching to allow, confirm that additional servers will be contacted, then reload the page (in viewer mode, the open folder is closed). When switching back to block, apply it immediately |
| FR-211 | Required | **Links**: links to documents in the document set navigate within the app. `#heading` moves within the page. Clicks on in-app links (those starting with `#`) are handled by the app itself rather than left to the browser's default navigation (2.1; actions that open a new tab, such as clicks with modifier keys, are left to the browser). External links open in a new tab. Links to attachments in the document set are saved as downloads (not opened in the browser). When an attachment path is opened directly by URL, show a download button. When saving is turned off in the settings (`allowDownloads: false` in 5.4), do not start a save; show that the file cannot be saved (do not show a button that does nothing when pressed). Links that cannot be resolved show "not found" at the destination |
| FR-212 | Required | Wide tables, code, math and diagrams scroll horizontally within the element. Elements that actually overflow can be focused with the keyboard and scrolled with the arrow keys (re-evaluated when the screen width changes) |
| FR-213 | Required | **Document title**: determined in the order front matter `title` → first H1 → file name, and also reflected in the browser tab title |

#### 3.2.1 Supported syntax

| Syntax | Support | Notes |
|---|---|---|
| Headings (`#`, underline style), paragraphs, emphasis, strikethrough (`~~`) | ○ | |
| Lists (nested, numbered), task lists (`- [ ]` `- [x]`) | ○ | Checkboxes are display-only (cannot be operated) |
| Block quotes, alerts (`> [!NOTE]` etc.) | ○ | |
| Code (inline, fenced, with language) | ○ | Highlighted languages are the highlight.js standard set plus additional languages (list in the README) |
| Tables (left / center / right column alignment) | ○ | |
| Links (inline, reference style), images | ○ | |
| Autolinks | △ | Only URLs starting with `http(s)://` and email addresses. Strings like `www.example.com` or `README.md` are not turned into links |
| Footnotes | ○ | |
| Math | ○ | Inline math is recognized only when the character right after the opening `$` and right before the closing `$` are not spaces, and the character right after the closing `$` is not a digit (amounts such as `$5 と $10` ("$5 and $10") do not become math). `\$` produces a literal `$` |
| Mermaid | ○ | Flowchart, sequence, class, state, ER, Gantt, pie, journey, Git graph, timeline, quadrant, XY, Sankey, block |
| Raw HTML | △ | Formatting, tables, `details`, `img`, `video`/`audio`, etc. Scripts, forms, etc. are removed (chapter 6) |
| Line breaks | ○ | Two trailing spaces or `\` at the end of a line make a line break. A plain newline is not a line break (CommonMark compliant) |
| Front matter (YAML) | △ | Hidden. Only `title` is used |

### 3.3 Navigation

| ID | Priority | Requirement |
|---|---|---|
| FR-301 | Required | **Sidebar (file tree)**: show the folder hierarchy as a tree; folders can be expanded and collapsed. Highlight the displayed document. Order is "files → folders"; among the files at each level, `README` / `index` come first, then the rest in natural order (numbers compared as numbers; the collation rules are fixed so that the order is the same regardless of the user's environment). The display name is the file name without its extension |
| FR-302 | Recommended | **Custom navigation**: if the root of the document set contains `_sidebar.md` or `SUMMARY.md` (case-insensitive; `_sidebar.md` if both exist), show its contents (a nested list of links) in the sidebar. Links are resolved relative to the root. The user can switch between "Nav / Files" |
| FR-303 | Required | **In-page table of contents**: list the headings (H1–H4) of the displayed document and highlight the current position according to the scroll position. When scrolled to the end of the document, the last heading is the current position. Not shown for documents with fewer than 2 headings |
| FR-304 | Required | **Routing**: reflect the displayed document and heading position in the URL hash (5.2). The browser's Back / Forward can be used to move. In site mode, opening a URL with a hash directly shows that document and position. In viewer mode, opening a URL with a hash shows the start screen, and the app moves to that document after the document set is loaded |
| FR-305 | Required | At the top of a document, show its path within the document set and its last-modified time (when available) |
| FR-306 | Recommended | When moving with Back / Forward, restore the previous scroll position |
| FR-307 | Required | **Home document**: determined in the order `home` in the settings → `README.md` at the root → `index.md` at the root → the first document in tree order (case-insensitive) |

### 3.4 Search

| ID | Priority | Requirement |
|---|---|---|
| FR-401 | Required | Full-text search over the whole document set. Targets are each document's title, headings, path and body (text with Markdown syntax symbols removed, including code). Multiple space-separated words are combined with AND. Case and full-width / half-width forms (alphanumerics and kana) are not distinguished. Files used for custom navigation (FR-302) are tables of contents, not body text, so they do not appear in search results (they can still be opened from the file list) |
| FR-402 | Required | Show up to 50 results in order of relevance (matches in the title, headings and path first, then the number of matches in the body), with the document title, path and an excerpt of the matching part (matching words highlighted). ↑↓ to select, Enter to open, Esc to close |
| FR-403 | Required | When a document is opened from the results, highlight the matching words in the body and scroll to the first match |
| FR-404 | Required | Build the search index in the background after loading. While it is being built, search works over the part already indexed, and progress is shown |
| FR-405 | Required | `Ctrl+K` (`⌘K` on macOS) or `/` focuses the search box |

### 3.5 Display settings

| ID | Priority | Requirement |
|---|---|---|
| FR-501 | Required | Theme: switchable between auto (follow the OS setting) / light / dark. When switched, diagrams (Mermaid) are also redrawn with matching colors |
| FR-502 | Required | UI language: Japanese / English. The default follows the browser's language setting |
| FR-503 | Required | Switch the layout according to the screen width (4.1) |
| FR-504 | Required | When printing, output only the body, always in light colors (hide the header, sidebar, table of contents and buttons) |

### 3.6 Site export

| ID | Priority | Requirement |
|---|---|---|
| FR-601 | Required | The open document set can be saved as a **single site HTML** with the documents embedded (not shown in the menu when saving is turned off in the settings). The export dialog lets the user set the site title and home document and check the number of documents, number of attachments and approximate size |
| FR-602 | Required | Embed the attachments referenced from documents (images and linked files) that exist in the document set. Files larger than 20MB each are not embedded, and their count is reported in the dialog. If the total exceeds 100MB, show a warning (the user can continue) |
| FR-603 | Recommended | If no document uses math / diagrams, exclude the corresponding library (KaTeX / Mermaid) from the site HTML to reduce its size. The hashes of excluded libraries are also removed from the CSP |
| FR-604 | Recommended | Provide a tool that can run the same export from the command line (Node.js; for developers and automation; kept only in the repository and not included in the user-facing instructions or the release zip). Of the settings (5.4), `allowExternalImages` / `lockExternalImages` / `allowDownloads` can be specified with options (`--allow-external-images` / `--lock-external-images` / `--no-downloads`) |
| FR-605 | Required | The command-line export's messages (results, warnings, errors, `--help`) are in Japanese and English. The language is determined from the environment variable `MDFOLIO_LANG` (`ja` / `en`), otherwise `LC_ALL`, `LC_MESSAGES`, `LANG`, otherwise the OS language setting, in that order; if it starts with `ja`, Japanese is used, otherwise English (moved from FD-10 in 1.2.0) |

### 3.7 Saving settings and state

| ID | Priority | Requirement |
|---|---|---|
| FR-701 | Required | The settings block in the HTML (5.4) can specify the site title, default theme, default language, home document and whether external images are allowed by default. In addition, it can specify options for adapting to the display environment (do not show operations that save files, never load external images, show that this is a public trial page) |
| FR-702 | Required | Settings changed by the user (theme, language, external images, sidebar open/closed) are saved in the browser and carried over to the next session. In environments where they cannot be saved, the app works without errors. However, since allowing external images requires the setting to persist across a reload, in environments where it cannot be saved the user is notified that it cannot be switched |

### 3.8 Help and license display

| ID | Priority | Requirement |
|---|---|---|
| FR-801 | Required | Usage instructions (help) can be shown within the app. On a public trial page (`hosted: true` in 5.4), a note at the top says that some features are unavailable |
| FR-802 | Required | Version information and the full license texts of this software and the bundled third-party software can be shown within the app |

### 3.9 Error handling

| ID | Priority | Requirement |
|---|---|---|
| FR-901 | Required | File read failures, permission denials, unsupported features, exceeded limits and export failures are reported to the user with an on-screen notification. JavaScript exceptions do not freeze the screen |
| FR-902 | Required | If the document set contains no Markdown documents, notify the user and keep the previous display |

---

### 3.10 Appearance override (specification 1.9, app 1.3.0)

Users can change the appearance of the body and the screen by placing `mdfolio.css` in the same folder as the HTML. There is no need to modify the program or run any command.

| ID | Priority | Requirement |
|---|---|---|
| FR-1001 | Required | The viewer (`mdfolio.html`) and exported site HTML load `mdfolio.css` from the same folder (relative path `mdfolio.css`) and apply it after the built-in CSS (for equal rules, `mdfolio.css` wins). If the file does not exist, display with the built-in CSS only and show the user nothing |
| FR-1002 | Required | Put "Choose CSS" on the export screen. Embed the chosen CSS file in the exported HTML (`<style id="mdv-user-style">`; after the built-in CSS, before `mdfolio.css`). The choice can be undone |
| FR-1003 | Required | The export screen shows the state of the CSS to embed: the chosen file name / carry over the CSS already embedded in the current HTML / none. CSS embedded in the current HTML is carried over by default |
| FR-1004 | Required | When the page is opened via `http(s)://` and the contents of the adjacent `mdfolio.css` can be read (same server), make it a candidate for embedding even without choosing it. When opened via `file://`, the contents cannot be read (a browser restriction; 8.6), so if the adjacent CSS is in effect, show "it is not included in the export; to include it, choose the same file" |
| FR-1005 | Required | A chosen CSS file can be up to 1MB. It is read as UTF-8 (a BOM is removed). A file containing `</style` cannot be embedded, so it is rejected with the reason shown |
| FR-1006 | Required | Add `--css <file>` to the command-line export (FR-604) so that CSS can be embedded in the same way |
| FR-1007 | Required | Diagram (Mermaid) colors also reflect color variables changed by `mdfolio.css` and embedded CSS (diagram colors are taken from CSS variables; introduced in 1.1.0) |

#### Security

- Add `'self' file:` to the CSP `style-src` (to load the adjacent CSS). Script permissions (SEC-4) are unchanged. CSS cannot execute scripts.
- `<link>` and `<style>` in documents (Markdown) are removed by sanitizing, so a document cannot make the page load another CSS file.
- Even if `url()` in `mdfolio.css` contains an external address, it is not loaded by the CSP (SEC-10) while external images are not allowed.
- When opened via `http(s)://`, the adjacent `mdfolio.css` is requested from the same server (once). It is the same origin as the page itself, so no new information is disclosed externally. If the file does not exist, the browser's developer console shows "not found", but this does not affect operation.

### 3.11 Fixes from the user evaluation (specification 1.13)

Twenty evaluators with different jobs used 1.3.1 with their own documents (2026-11-18). The following problems were confirmed by reproducing them, and are fixed. Requests that are new features are listed in the review record (section 11) and are not part of this version.

| ID | Priority | Requirement |
|---|---|---|
| FR-1101 | Required | Category colors of diagrams (pie slices and legend swatches) come from the CSS variables `--chart-1` … `--chart-8`, which have clearly distinct hues in both the light and the dark theme. None of them equals the page background. `mdfolio.css` can override them |
| FR-1102 | Required | A diagram that would have to be shrunk below half of its natural width to fit the column is shown at its natural size, and the reader scrolls it sideways. Other diagrams still shrink to fit (shrinking to about half keeps labels readable; below that, text falls to about 6px) |
| FR-1103 | Required | Tables, diagrams and display math that are wider than the column show a shadow at the edge where more content is hidden, so the reader can tell that they can scroll |
| FR-1104 | Required | The site title (header, browser tab, default title and file name in "Export as site") is chosen in this order: `title` in the settings → the title of the home document (front matter `title`, else its first heading) → the folder name. When the document title equals the site title, the browser tab shows it once |
| FR-1105 | Required | The file list in the sidebar shows each document's title (front matter `title`, else its first heading) once it is known, and the file name until then. The path is shown as a tooltip |
| FR-1106 | Required | Emphasis (`**` and `*`) works next to Chinese, Japanese and Korean text and punctuation, as in `**1.8%**の改善` (markdown-it-cjk-friendly) |
| FR-1107 | Required | The "Show external images" choice is stored for each HTML file (keyed by the page's path), not shared by every mdfolio file opened from the same computer. Theme, language and sidebar state stay shared |
| FR-1108 | Required | At narrow widths, while the sidebar drawer is open, the rest of the page cannot receive focus. Closing the drawer (Esc, the scrim, or the button) returns focus to the sidebar button when focus was in the drawer |
| FR-1109 | Required | After moving to another document, the active item in the sidebar (Nav and Files) is scrolled into view |
| FR-1110 | Required | In math, `\label{…}` is ignored instead of being shown as an error |
| FR-1111 | Required | The help (English and Japanese) starts with a short section for people new to Markdown. The message shown when a folder has no Markdown documents says what to do next |
| FR-1112 | Required | The code font lists common Latin monospace fonts before Japanese fonts, so that a backslash is not shown as a yen sign when the Latin fonts listed first are missing |
| FR-1113 | Required | Pressing Enter in the search box right after typing opens the top result, even before the result list has appeared |

In addition, the example `examples/mdfolio.css` defines every variable it changes for both the light and the dark theme, and explains that a variable set only in `:root` also applies to the dark theme.

## 4. Screen specification

### 4.1 Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡] Site title           [ Search  Ctrl+K ]              [Theme] [⋯] │ Header (fixed)
├──────────────┬──────────────────────────────────────┬────────────────┤
│ Sidebar      │ guide / intro.md  Updated 2026-11-12 │ On this page   │
│ (tree /      │ # Title                              │  - Heading     │
│   nav)       │ Body (max width ~820px)              │  - Heading     │
└──────────────┴──────────────────────────────────────┴────────────────┘
```

| Screen width | Layout |
|---|---|
| 1200px or more | Sidebar + body + table of contents |
| 800–1199px | Sidebar + body (the table of contents moves into a collapsible section at the top of the body) |
| Less than 800px | Body only (table of contents in a collapsible section at the top of the body). The sidebar is a drawer opened with `≡` |

### 4.2 Screens and components

| Component | Contents |
|---|---|
| Start screen | Shown in viewer mode when no document set is loaded. A drop area, "Open folder" and "Open files" buttons, "Reopen last folder" (if available) and a link to "How to use". The description says that files are processed only on this device. On finger-operated devices, the drop guidance is omitted. On a public trial page (`hosted: true`), it does not say "never sent anywhere"; instead it says that this is a public page for trying out the viewer and that confidential documents should be opened with a copy saved on one's own device |
| Header | Sidebar toggle, site title (click to go home), search box, theme switch, menu |
| Menu (⋯) | Open folder / Open files / Reload / Export as site / Show external images / language / How to use / Licenses and version. In site mode, "Open", "Reload" and "Export" are not shown. Operations turned off in the settings ("Export" with `allowDownloads: false`, "Show external images" with `lockExternalImages: true`) are not shown either |
| Sidebar | File tree. When there is custom navigation, "Nav / Files" tabs. The displayed document is shown as a tab that continues seamlessly into the body's page |
| Body | Path and last-modified time, rendered result |
| Table of contents | H1–H4. Highlights the current position |
| Search panel | Shown overlaid below the search box. Result list, count, indexing progress |
| Export dialog | Site title, home document, number of documents, number of attachments, approximate size, run / cancel |
| External image confirmation dialog | Shown when switching to showing external images. Tells the user that additional servers will be contacted and that the page will reload (in viewer mode, the folder will be closed). Run / cancel |
| License dialog | Version, full license texts |
| Notification | Shown temporarily at the bottom of the screen (announced to screen readers) |

### 4.3 Keyboard operation

| Key | Action |
|---|---|
| `Ctrl+K` / `⌘K` / `/` | Focus the search box (`/` is ordinary text input when an input field has focus) |
| `↑` `↓` `Enter` | Select and confirm search results |
| `Esc` | Close the search panel, menu, drawer or dialog |
| `Tab` | The first stop at the top of the page is "Skip to content". After that, the order is header → sidebar → body → table of contents |
| Menu: open with `Enter` / `↓`, move between items with `↑` `↓` `Home` `End`, close with `Esc` / `Tab` | When it closes or after an item is chosen, focus returns to the menu button |
| Sidebar tabs: `←` `→` `Home` `End` | Switch between "Nav / Files" |
| Overflowing tables and code: focus and press `←` `→` | Scroll that element horizontally |

---

## 5. Data specification

### 5.1 Path normalization

- Paths in a document set are relative paths from the root (separator `/`, no leading `/`). Example: `guide/intro.md`
- Keys used for matching are Unicode-normalized (NFC).
- When a folder is opened, the chosen folder itself becomes the root (the folder name is used as the default site title).

### 5.2 Routes (URL hash)

| Format | Meaning |
|---|---|
| (empty) or `#/` | Home document |
| `#/<path>` | A document. Each path segment is encoded with `encodeURIComponent`. Example: `#/guide/%E5%B0%8E%E5%85%A5.md` |
| `#/<path>#<heading-id>` | A heading position within a document. The heading ID is encoded with `encodeURIComponent` |
| `#!help` | Help |

- Heading IDs in the URL have no prefix (example: `#/a.md#概要`). The actual `id` in the DOM is `user-content-概要` (SEC-2), and the app maps between them.
- Heading IDs are matched in the order exact match → match after decoding → match after lowercasing → match after slugifying.

### 5.3 Resolving link and image paths

`href` / `src` in documents are resolved in the following order.

1. Starts with `#` → a heading in the same document.
2. Has a scheme (`http:` `https:` `mailto:` etc.) or starts with `//` → external.
3. Otherwise, resolve as a path in the document set.
   1. Separate the part after `#` (fragment) and the part after `?`.
   2. Decode percent-encoding (keep the original string on failure) and replace `\` with `/`.
   3. If it starts with `/`, resolve `.` and `..` relative to the root; otherwise relative to the current document's folder. Going above the root means "unresolvable".
   4. Match in the following order: exact match → case-insensitive match → if there is no extension, match with `.md` added → if the extension is `.html` / `.htm`, match with it read as `.md` → if it points to a folder, `README.md` / `index.md` inside it.
4. Result:
   - Resolved to a document → make it a link to `#/<path>[#fragment]`.
   - Resolved to an attachment → images and media display its content; links download it.
   - Not resolvable → images get a placeholder; links point to the "not found" page.
- URLs starting with `file:` and Windows absolute paths (`C:\...`) are disabled by sanitizing and do not work as links (chapter 11).

### 5.4 Settings block

Written as JSON in `<script type="application/json" id="mdv-config">` in the HTML. It may be edited by hand (it is not subject to the CSP).

| Key | Type | Default | Meaning |
|---|---|---|---|
| `title` | string | `""` | Site title (if empty, the folder name; if none, `mdfolio`) |
| `lang` | `"auto"`/`"ja"`/`"en"` | `"auto"` | Default UI language |
| `theme` | `"auto"`/`"light"`/`"dark"` | `"auto"` | Default theme |
| `home` | string | `""` | Path of the home document |
| `allowExternalImages` | boolean | `false` | Whether external images and media are allowed by default |
| `allowDownloads` | boolean | `true` | When `false`, operations that save files (Export as site, saving attachments) are not shown on screen. Links to attachments show that the file cannot be saved |
| `lockExternalImages` | boolean | `false` | When `true`, external images and media are never loaded. The toggle is not shown, and this takes precedence over settings saved by the user and over `allowExternalImages` |
| `hosted` | boolean | `false` | When `true`, the start screen and the help show that this is a public trial page (6.1). Not carried over to HTML created by the in-app export |

If there are settings changed by the user in the browser (5.6), they take precedence (except `lockExternalImages`). If the JSON is broken, the app runs with the defaults. `allowDownloads` and `lockExternalImages` change from their defaults only when `true` / `false` is written explicitly.

`allowDownloads` / `lockExternalImages` are used when the HTML is placed in an environment where saving files or external loading is not possible (2.1), or when those features should not be available to recipients.

### 5.5 Site data (embedded format)

Stored as JSON in `<script type="application/json" id="mdv-site">` in the HTML. `null` when nothing is embedded.

```json
{
  "format": 1,
  "generator": "mdfolio 1.0.1",
  "created": "2026-11-13T01:00:00.000Z",
  "name": "docs",
  "files": [
    { "path": "README.md", "kind": "doc", "mtime": 1794000000000, "text": "# ..." },
    { "path": "img/a.png", "kind": "asset", "mime": "image/png", "mtime": 1794000000000, "base64": "iVBORw0..." }
  ]
}
```

- `<` in JSON strings is stored escaped as `\u003c` (to prevent misinterpretation by the HTML parser).
- If `format` has an unsupported value, or the elements of `files` do not follow the rules (`kind` other than `doc` / `asset`, `text` / `base64` / `mime` not a string, `mtime` not a number, etc.), do not load the data and report an error.
- `path` is normalized by the rules in 5.1. Path elements that use `..` to point above the root are not loaded. Paths are used only as names within the embedded data; no file on disk is read.
- The site title and home document are stored in the settings block (5.4).

### 5.6 Data stored in the browser

| Storage | Key | Contents |
|---|---|---|
| localStorage | `mdv:settings:v1` | Theme, language, sidebar open/closed |
| localStorage | `mdv:external:<path of the HTML file>` | External image permission for this HTML file (FR-1107) |
| IndexedDB (DB name `mdv`) | `last:<path of the HTML file>` | Handle and name of the last opened folder |

Document contents themselves are not stored in the browser. Under `file://`, some browsers share storage with other local HTML files, so only the display settings and folder handle above are stored.

---

## 6. Security and privacy

Threat considered: when a Markdown file written by a third party is opened, a script planted in the document runs and sends the contents of the open folder to an external party.

| ID | Requirement |
|---|---|
| SEC-1 | Sanitize the rendered HTML with DOMPurify before inserting it into the DOM. Remove `<script>` `<style>` `<iframe>` `<object>` `<embed>` `<form>` and input controls, inline SVG / MathML, event handler attributes, and `javascript:` / `data:` / `file:` links (only `input` for displaying checkboxes is allowed, made non-operable). Code highlighting results (FR-204) are also passed through the sanitizer |
| SEC-2 | Prefix `id` / `name` in user HTML with `user-content-` to prevent collisions with the app's own elements (DOM clobbering). Remove class names for internal app use (those starting with `mdv-`) and `data-*` attributes from user HTML |
| SEC-3 | Limit the `style` attribute to a whitelist of allowed properties (text color, background color, text decoration, alignment, margins/padding, borders, size, etc.). Remove values containing external references such as `url()`, and properties related to positioning, stacking and transformation (`position` `z-index` `transform` etc.). Table column alignment (`text-align`) works within this scope |
| SEC-4 | Set a Content-Security-Policy with `<meta>`. `script-src` allows only the SHA-256 hashes of the built-in scripts (no `unsafe-inline` / `unsafe-eval`), and `connect-src 'none'` is set. As a result, even if something slips past sanitizing, injected scripts do not run |
| SEC-5 | The app does not use network APIs (`fetch` / `XMLHttpRequest` / `WebSocket` / `sendBeacon`). External requests can occur only when fetching images and media after the user allows external images (including images specified inside diagrams), and when the user clicks an external link |
| SEC-6 | Math is rendered with KaTeX `trust: false`, and diagrams with Mermaid `securityLevel: 'strict'` |
| SEC-7 | External links get `rel="noopener noreferrer"` |
| SEC-8 | No analytics, telemetry or other sending features |
| SEC-9 | Links to attachments are always treated as downloads and are never opened as HTML etc. in the same origin as the app. SVG images are displayed only as `<img>` (not expanded inline) |
| SEC-10 | While external images and media are not allowed, add a CSP `img-src data: blob:; media-src data: blob:` with `<meta>` at startup (before displaying any document), so the browser itself also blocks loading. Removal by the display processing (FR-210) alone cannot prevent loading via other routes, such as image nodes in diagrams (Mermaid), `<img>` in labels, or `url()` in `themeCSS`. A CSP can only be made stricter, so switching to allow requires reloading the page |

CSP (hashes are embedded at build time):

```
default-src 'none'; script-src 'sha256-…' …; style-src 'unsafe-inline';
img-src data: blob: http: https:; media-src data: blob: http: https:; font-src data:;
connect-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none';
form-action 'none'; base-uri 'none'
```

- `img-src` / `media-src` include `http: https:` for the "allow external images" setting. Default blocking is done in two layers: the app layer (rewriting `src` after sanitizing) and the CSP added at startup (SEC-10).
- `file:` is not included in any directive. Even when opened via `file://`, a document cannot make the page load other local files or shared folders (UNC paths) as images.
- When a malicious document is displayed, records of the CSP blocking loads (violation messages) may appear in the browser's developer tools console. This is the result of the blocking working, not a malfunction.
- Script hashes correspond to the script bodies in the HTML. Editing the script parts by hand stops the app from working (the settings block and site data may be edited).

### 6.1 Placing the HTML in an external hosting environment (trial conversion)

Hosting environments that display the page inside a sandboxed frame and inject their own scripts into the page cannot host it as is, because the CSP in SEC-4 blocks those scripts. `tools/dev/make-hosted.mjs` creates an HTML file with the following conversions.

1. Remove the CSP written in the HTML (SEC-4).
2. Set the settings to `allowDownloads: false`, `lockExternalImages: true`, `hosted: true`.
3. Rewrite the replacement character (U+FFFD) as an equivalent escape (`\uFFFD` in scripts, `\ufffd` in JSON). This character is also a "sign that a character encoding conversion failed", and some hosting environments reject a file merely for containing it. A bundled library (markdown-it) uses this character itself in the code that replaces invalid input with it, and it can also appear in document data. In scripts, rewrite only "strings consisting solely of replacement characters"; if it appears anywhere else, abort the conversion (because it cannot be asserted that the rewrite does not change the meaning).

The converted HTML lacks some of the security guarantees of this specification.

- SEC-4 (limiting scripts by hash) and `connect-src 'none'` are not enforced by the HTML itself. Blocking external communication depends on the hosting side's CSP.
- SEC-1 to SEC-3 (sanitizing), SEC-6, SEC-7, SEC-9 and SEC-10 (adding a CSP that prevents loading external images) continue to work.
- The behavior of scripts injected into the page by the hosting side cannot be controlled by this software. For this reason, the start screen does not say "never sent anywhere" and instead advises opening confidential documents with a copy saved on one's own device (4.2).

The converted HTML is intended for trying out the app and publishing samples; for opening locally or distributing within an organization, use the unconverted HTML.

---

## 7. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Distributability | The deliverable is a single HTML file. No dependency on external files |
| NFR-2 | Performance | From startup to the start screen within 1 second. Display a 1MB document within 3 seconds (excluding the part of code highlighting deferred by FR-204). For a folder of 1,000 documents: tree display within 2 seconds, indexing within 10 seconds, search response within 0.3 seconds (reference: a PC with about 2 cores) |
| NFR-3 | Size | Viewer itself 6MB or less |
| NFR-4 | Accessibility | Main operations can be performed with the keyboard alone (4.3). Buttons, input fields, checkboxes and the search result list have names. Contrast ratio of on-screen text to background of 4.5:1 or higher (light, dark, print). The focus position is visible. `prefers-reduced-motion` is respected. When switching documents, focus moves to the body area. When a dialog closes, focus returns to where it was before the dialog opened. Colors specified by the document author with `style` are not adjusted |
| NFR-5 | Internationalization | The UI is in Japanese and English. Documents and file names can use Unicode, including Japanese |
| NFR-6 | Maintainability | The build runs with Node.js built-in features only (no npm packages needed). Bundled libraries are placed in `vendor/` exactly as distributed, with a list of their names, versions, licenses and SHA-256 hashes. When updating libraries, stop if a license not on the list of allowed licenses is detected |
| NFR-7 | Robustness | Reading works even in environments where storage (localStorage / IndexedDB) is unavailable |

---

## 8. Structure

### 8.1 Deliverables

| File | Contents |
|---|---|
| `dist/mdfolio.html` | The viewer itself (single HTML). Distributing this alone is enough for it to work |
| `sample-docs/` | Sample documents for trying out the app (folder) |
| `sample-docs-en/` | English sample documents with the same content (8.7) |
| `sample.md` `sample.en.md` | Sample documents for trying out the app (self-contained in one file; Japanese and English) |
| `CHANGELOG.md` | Change history (English) |
| `src/` `vendor/` `tools/` `tests/` | Source, bundled libraries, build and export tools, tests |
| `docs/` | Specification, review record, test report |
| `README.md` (English) `README.ja.md` (Japanese) `LICENSE` `THIRD-PARTY-NOTICES.txt` | Usage, licenses |

### 8.2 Internal structure of the HTML

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="…">
  <meta name="referrer" content="no-referrer">
  <meta name="color-scheme" content="light dark">
  <meta name="generator" content="mdfolio 1.0.1">
  <link rel="icon" href="data:image/svg+xml,…">                          <!-- Tab icon (kept inside the HTML) -->
  <title>…</title>
  <style id="mdv-style">/* App CSS */</style>
</head>
<body>
  <noscript>…</noscript>
  <div id="mdv-root"></div>
  <script type="application/json" id="mdv-config">{…}</script>
  <script type="application/json" id="mdv-site">null</script>
  <script type="application/json" id="mdv-res-help-ja">"…"</script>      <!-- Help (Markdown) -->
  <script type="application/json" id="mdv-res-help-en">"…"</script>
  <script type="application/json" id="mdv-res-licenses">"…"</script>     <!-- Full license texts -->
  <script type="application/json" id="mdv-res-katex-css">"…"</script>    <!-- KaTeX CSS (fonts included) -->
  <script type="application/json" id="mdv-lib-katex">"…"</script>        <!-- Lazily loaded library (stored as a string) -->
  <script type="application/json" id="mdv-lib-mermaid">"…"</script>
  <script id="mdv-js-vendor">/* markdown-it, markdown-it-footnote, DOMPurify, highlight.js */</script>
  <script id="mdv-js-app">/* App itself (core, md, i18n, app) */</script>
</body>
</html>
```

- **Always-loaded libraries** (markdown-it, DOMPurify, highlight.js, the app itself) are stored as normal inline scripts (the most standard use of CSP hashes, and the least likely to differ between browsers).
- **Lazily loaded libraries** (KaTeX, Mermaid) are stored as JSON strings, and a `<script>` element is created and run the first time a document containing math / diagrams is displayed (to keep startup light). These dynamic scripts are also checked against CSP hashes, and the hashes match the SHA-256 of the distributed files in `vendor/` exactly. If they cannot run, the fallback display of FR-205 / FR-206 is used.
- The tab icon is kept inside the HTML as a `data:` URL, so that when served over http(s) the browser does not request `favicon.ico` (no requests other than the HTML itself).
- In the CSP `script-src`, hashes are listed in the order "the two always-loaded scripts → KaTeX → Mermaid". When the site export excludes a library, this order is used to find and remove the corresponding hash (FR-603).
- While external images are not allowed, the script adds one more `<meta http-equiv="Content-Security-Policy">` at startup (SEC-10). It is not included in exports.
- All screen DOM is generated by scripts under `#mdv-root`.
- The contents of blocks whose `id` starts with `mdv-` are not modified after startup (they are reused as is when exporting).

### 8.3 Source layout

| Path | Role |
|---|---|
| `src/core.js` | DOM-independent processing (path resolution, routes, slugs, search, front matter, encoding detection, tree building, site data, HTML assembly) |
| `src/md.js` | markdown-it configuration and extensions (task lists, alerts, math, Mermaid, heading IDs, reference extraction) |
| `src/i18n.js` | UI text (Japanese and English) |
| `src/app.js` | Screen and interaction (loading, rendering, navigation, search UI, export) |
| `src/app.css` | Styles |
| `src/help.ja.md` `src/help.en.md` | Help documents |
| `tools/build.mjs` | Build (generates `dist/mdfolio.html`) |
| `tools/build-site.mjs` | Site HTML export CLI |
| `tools/vendor.mjs` | Updating bundled libraries and generating license notices (for maintainers; the only part that uses npm) |
| `tools/dev/make-hosted.mjs` | Conversion for placing the HTML in an external hosting environment (6.1) |
| `tools/dev/make-pages.mjs` | Builds the set of files published on GitHub Pages (landing page, viewer, export sample, appearance sample, documentation; Japanese and English) (8.7) |
| `tools/dev/make-release.mjs` | Builds the distribution zip and the release notes (8.8) |
| `.github/workflows/` | Automated runs for updating the public pages and creating releases (8.8) |
| `tools/dev/make-zip.py` | Builds the distribution zip. Marks Japanese file names as UTF-8 (without this mark, file names are garbled when extracted on Windows, and links between documents break) |

`core.js` and `md.js` are written so they can be loaded in both the browser and Node.js, and the unit tests and the CLI use the same code.

### 8.4 Bundled libraries

| Library | Purpose | License |
|---|---|---|
| markdown-it | Markdown parser | MIT |
| markdown-it-footnote | Footnotes | MIT |
| DOMPurify | HTML sanitizing | Apache-2.0 (dual-licensed with MPL-2.0; Apache-2.0 chosen) |
| highlight.js | Syntax highlighting | BSD-3-Clause |
| KaTeX (including fonts) | Math | MIT |
| Mermaid (lightweight edition `@mermaid-js/tiny`) | Diagrams | MIT |

- Versions are the latest stable npm versions at the time of implementation, recorded in `vendor/manifest.json`.
- The lightweight edition of Mermaid is used instead of the full edition, because the full edition bundles `elkjs` (EPL-2.0 or GPL-3.0-or-later), which adds obligations when redistributing, and because the lightweight edition is about half the size (verified with the actual files in review item RV-06).
- The license notices of dependencies that each library includes internally are also included in the full license texts.
- Tools used only for testing (Playwright, axe-core) are not included in the deliverables.

### 8.5 Build

`node tools/build.mjs` generates `dist/mdfolio.html` from `src/` and `vendor/`. The build does the following.

1. Assemble the CSS, scripts and resources into the structure in 8.2.
2. For normal inline scripts, remove the trailing `sourceMappingURL` comment and replace the `<` of `<!--` `<script` `</script` in the body with an escape that does not change the meaning (`\x3c`).
3. Compute the SHA-256 of each script and embed it in the CSP.
4. Verify the output (syntax check of the scripts after replacement, line endings are LF only, `</script` does not appear in any block body, size).
5. Record the size, SHA-256 and CSP of the deliverable, and the size and hash of each block, in `dist/mdfolio.manifest.json`.

With `--without mermaid,katex`, a lightweight edition without the math and diagram libraries can be built (about 0.6MB). The same input always produces the same output.

---

### 8.6 Folder edition (added in app 1.1.0, removed in 1.3.0)

The "folder edition" that existed in 1.1.0–1.2.0 (`index.html` plus the `style/`, `docs/`, `lib/` and `data/` folders, and the update command `tools/update.mjs`) was removed in 1.3.0. Its purpose of changing the appearance is replaced by `mdfolio.css` placed next to the single HTML (3.10).

Reasons for removal (agreed with the project owner):

- An update command was needed every time documents or CSS changed, and the managing person's computer needed Node.js.
- Maintaining two forms alongside the single HTML doubles the work for documentation, testing and publishing.

Remaining constraint (a browser rule): a page opened via `file://` can use adjacent files (apply CSS, display images) but cannot read their contents as text. For this reason, the adjacent `mdfolio.css` takes effect on screen but is not automatically included in exports (FR-1004). The folder edition avoided this constraint by having the update command write a copy of the CSS into a JavaScript file.

### 8.7 Public pages and English documents (added in specification 1.5; English first since 1.12)

mdfolio is meant to be widely used, not only by Japanese-speaking users (the project owner's policy; specification 1.12), and things visible from outside (README, public pages, change history, release notes) put English first. The specification, review record, test report and source code comments are also written in English. Communication with the project owner and the handover notes (CLAUDE.md) are in Japanese.

#### Structure

```
(public pages)
  index.html              Landing page (English)
  sample-site.html        Export sample (sample-docs-en/; English UI)
  style/                  Appearance sample (English)
  mdfolio-docs.html       Documentation (README.md, plus the specification, review record and test report)
  mdfolio.html            Viewer (only one; UI language follows the browser)
  ja/
    index.html            Landing page (Japanese)
    sample-site.html      Export sample (sample-docs/; Japanese UI)
    style/                Appearance sample (Japanese)
    mdfolio-docs.html     Documentation (README.ja.md)
  en/index.html           Location of the English landing page in 1.2.0–1.3.0. Redirects to the top (for old links; no script)
```

The repository contains the English README `README.md`, the Japanese README `README.ja.md`, the English sample documents `sample-docs-en/` and the Japanese sample documents `sample-docs/`.

#### Requirements

| ID | Priority | Details |
|---|---|---|
| PG-1 | Required | Provide the public pages' landing page, export sample, appearance sample and documentation in both English and Japanese. English goes at the top (root), Japanese under `ja/`. `en/` contains a page that redirects to the top. There is one viewer, opened from both landing pages |
| PG-2 | Required | At the top of each landing page, put a link to the landing page in the other language. Both landing pages have `hreflang` declarations pointing to each other. No automatic language-based routing (redirection by script) |
| PG-3 | Required | The public pages' samples (export and appearance) and documentation fix the UI language to the language of the documents (setting `lang` to `ja` / `en`). If the user switches it in the menu, that choice is followed (5.6). The sample in the repository's `dist/` (`sample-site.html`) stays `auto`. The documentation (`dist/mdfolio-docs.html`) is the same as on the public pages, so it is fixed to `ja` |
| PG-4 | Required | `sample-docs-en/` has the same structure as `sample-docs/` (number of documents, sidebar, images, attachments) and samples of the same features (links, search, tables, alerts, code, math, diagrams, footnotes, collapsible sections, front matter). File and folder names are in English. Samples specific to Japanese (such as full-width search terms) are replaced with samples that are meaningful in English |
| PG-5 | Required | When English documents name screen components, use the same words as the app's English UI (`en` in `src/i18n.js`) |
| PG-6 | Required | Put links to each other at the top of `README.md` (English) and `README.ja.md` (Japanese). The Japanese documentation states that the specification, review record and test report are in English |
| PG-7 | Required | Landing pages use no scripts and do not communicate externally (CSP `default-src 'none'`). Other pages keep the same security mechanisms as the distributed files |
| PG-8 | Required | All relative links and images in the sample documents (Japanese and English) point to existing files. Checked by unit tests |
| PG-9 | Required | Every HTML file on the public pages contains the full texts of `LICENSE` and `THIRD-PARTY-NOTICES.txt`. App HTML embeds them as before (FR-802); landing pages show the full texts in a collapsible section (readable without scripts). Checked by unit tests |

### 8.8 Automating public pages and releases (added in specification 1.7)

GitHub's automation (GitHub Actions) updates the public pages and creates releases. The configuration files are placed in `.github/workflows/`.

| ID | Priority | Details |
|---|---|---|
| AU-1 | Required | When `main` is updated, run unit tests → build → assembly of the files to publish (`make-pages.mjs`), and replace the `gh-pages` branch. If any step fails, the public pages are not changed |
| AU-2 | Required | When a tag starting with `v` (e.g. `v1.2.0`) is pushed, or when started manually from the GitHub Actions screen (creates the tag `v<package.json version>` on the latest `main`; stops if a release for the same version already exists), verify that the tag's version matches the version in `package.json`, and after unit tests and the build, create a GitHub release. The release notes use that version's section of the change history (`CHANGELOG.md`; English) |
| AU-3 | Required | Two files are attached to the release: `mdfolio.html` (the single HTML edition; works on its own) and the distribution zip `mdfolio-<version>.zip`. The zip contains the single HTML edition, the appearance sample CSS (`examples/mdfolio.css`), the samples (`sample-docs/`, `sample-docs-en/`, `sample.md`, `sample.en.md`), `README.md`, `README.ja.md`, `CHANGELOG.md`, `LICENSE` and `THIRD-PARTY-NOTICES.txt`. Japanese file names are marked as UTF-8 (`make-zip.py`) |
| AU-4 | Required | Permissions used by the automation are limited to what is needed to write to the `gh-pages` branch and create releases (`contents: write`). The only external service components (third-party actions) used are official GitHub ones (`actions/checkout`, `actions/setup-node`) |
| AU-5 | Required | The distribution zip and release notes are assembled by `tools/dev/make-release.mjs`, so the same output can be produced locally |

## 9. License policy

- The original parts are under the MIT License (the copyright holder name is filled in by the user).
- Bundled third-party software is limited to software under permissive licenses that allow redistribution (MIT / ISC / BSD / Apache-2.0 / Unlicense / OFL, etc.). Code under copyleft licenses such as GPL or EPL is not bundled.
- The full license texts of this software and the third-party software are **built into the HTML** (FR-802). As a result, redistributing the single HTML alone satisfies the obligation to include copyright and permission notices.
- Exported site HTML also contains the same notices (the notices remain even when libraries are excluded by FR-603).

---

## 10. Test policy

| Level | Target | Method |
|---|---|---|
| Unit tests | Each function in `core.js` `md.js`, verification of the build output, CLI | Node.js built-in test runner (`node --test`) |
| Integration / E2E tests | All features of the built `dist/mdfolio.html` | Drive a real browser (Chromium) automatically with Playwright. Mainly run via `file://` |
| Security tests | XSS documents, CSP, presence of external communication | Verified within E2E. "No communication" is judged by whether requests reached a local HTTP server set up in place of external servers (not relying only on the browser's records) |
| Accessibility tests | Each item of NFR-4 | Automated checks by an independent checking engine (axe-core), plus individual checks of keyboard operation, focus and colors |
| Checks on other engines | Gecko (Firefox's engine), WebKit (Safari-family engine) | Drive real browsers with WebDriver and check the main features (`tests/cross/`). Not included in the normal `npm test` |
| Embedded display tests | Each condition in 2.1, the converted HTML of 6.1 | Verified within E2E by placing the page in a cross-origin sandboxed frame (simulating a hosting environment) and in a `srcdoc` frame. Also checked with the same two kinds of frames on Gecko / WebKit |
| Performance tests | Each item of NFR-2 | Measured within E2E |
| Visual checks | Screen design (light / dark, wide / narrow) | Review screenshots |

Test environment and alternatives:

- The browser's native folder selection dialog cannot be automated. The `showDirectoryPicker` route is verified with a substitute test handle under `file://`, and with real handles from OPFS (the browser's built-in virtual file system) under `http://127.0.0.1`. The `<input>` route and the drop route are verified with real files.
- Full automated testing (Playwright) targets Chromium. For Firefox / Safari, browsers that use the same engines (a Gecko-based build, WebKitGTK) are driven with WebDriver to check the main features. The released Firefox / Safari products themselves cannot be installed in the test environment, so they remain on the manual check list.
- Items that cannot be automated (native dialogs, real Windows machines, Firefox / Safari) are listed in the test report as a manual check list.

Pass criteria: all automated tests pass, and no console errors, CSP violations or unexpected external requests occur during E2E runs (in security tests that use malicious documents, only records of the CSP blocking appear). Every requirement ID is mapped to at least one test or manual check item.

---

## 11. Known limitations

- When a folder is opened with the `<input webkitdirectory>` method, the browser may show a confirmation such as "Upload files?" (nothing is actually sent externally). With this method, the browser enumerates all files in the folder, so very large folders take time.
- Automatic encoding detection covers only UTF-8 / UTF-16 (BOM) / Shift_JIS. EUC-JP etc. are not supported.
- "Reopen last folder" and auto-reload are available only in browsers that support the File System Access API (Edge / Chrome).
- Links and images using `file:` URLs or absolute paths in the form `C:\...` do not work (write them as relative paths within the document set).
- Site HTML contains the documents and attachments, so it grows in proportion to the amount of documents.
- When HTML is sent by email or chat, systems along the way may rewrite its content so that it no longer works. Distributing it inside a zip is recommended.
- Switching to showing external images requires reloading the page (SEC-10). In viewer mode, the open folder is closed, so open it again.
- While external images are not allowed, diagrams (Mermaid) that specify external images cannot be displayed (an error is shown).
- In documents with a very large number of code blocks, some code is not highlighted immediately after display and is highlighted in turn over a few seconds (FR-204).
- In environments without the browser's folder selection API (Firefox / Safari), choosing a folder (`<input webkitdirectory>`) and drag and drop have not been verified by automated tests (choosing files has been verified).
- Not checked on real smartphones or tablets. Only display and operation in a browser simulating a 390px width and touch input were checked. Choosing a folder is not available on some devices and browsers.
- Embedded display (2.1) was checked with frames simulating the conditions, not in the real environments of individual hosting services.
- In embedded display, the position of the displayed document (`#/…`) is not necessarily reflected in the outer page's URL (it depends on how the outer page is built). In that case, reloading or sharing the URL returns to the home document.
- In HTML converted for trial use (6.1), Export as site, saving attachments and showing external images are not available.
- Because the lightweight edition of Mermaid is bundled, Mindmap and Architecture diagrams cannot be displayed (shown as errors). This is also noted in the help ("How to use") and in the "Limitations" page of the samples.
- When opened via `file://`, the adjacent `mdfolio.css` takes effect on screen but is not automatically included in exports (3.10 FR-1004). To include it in an export, choose the same file on the export screen.
- Loading of the adjacent `mdfolio.css` has been checked only on Chromium. Whether Firefox / Safari load CSS next to an HTML file opened via `file://` has not been checked.

---

## 12. Revision history

| Version | Date | Changes |
|---|---|---|
| 0.9 | 2026-11-12 | First edition (draft before review) |
| 1.0 | 2026-11-13 | Reflected the 41 findings of the specification review (REVIEW.md) |
| 1.1 | 2026-11-13 | Reflected points found during implementation and testing (details in "Problems found in testing" in TEST_REPORT.md). Main changes: external images are also blocked by CSP (added SEC-10; FR-210, FR-702, 4.2, chapter 11). Code highlighting changed to run after sanitizing, with part of it deferred (FR-204, NFR-2). Added keyboard operation and information for screen readers (4.3, NFR-4, FR-212). Changed the tree order to "files → folders" (FR-301). Excluded custom navigation files from search results (FR-401). Stricter validation of embedded data (5.5). Hashes of excluded libraries are removed from the CSP (FR-603). Updated the internal HTML structure to match the implementation (8.2: scripts split into 2 blocks, tab icon built in, etc.). Corrected the file name of the build manifest (8.5). Added checks on Gecko / WebKit (chapter 2, chapter 10) |
| 1.2 | 2026-11-13 | Support for embedded display (app 1.0.1). In the conversion for public pages, the replacement character (U+FFFD) is rewritten as an escape (6.1; because the hosting destination rejected files containing this character). Added behavior when displayed inside another page (2.1). Changed in-app links to be handled by the app itself (FR-211; a fix for the display disappearing on link clicks when embedded with `srcdoc`). Added `allowDownloads` / `lockExternalImages` / `hosted` to the settings (FR-701, 5.4, FR-211, FR-601, FR-604, FR-801, 4.2). Documented the conversion for external hosting environments and what cannot be guaranteed in that case (6.1). File selection is not filtered on finger-operated devices (FR-102). Fixed showing that copying succeeded when it had failed (FR-204). Changed "this computer" to "this device" on the start screen (4.2). Added `sample.md` and the zip creation tool to the deliverables (8.1, 8.3). Added the scope not checked on real devices and real environments to the known limitations (chapter 11) |
| 1.3 | 2026-11-15 | Added the folder edition (8.6, app 1.1.0). Split the CSS into body/colors and screen components, and diagram colors are now taken from CSS variables |
| 1.4 | 2026-11-16 | Added the assembly tool used for publishing on GitHub Pages (8.3). No change to app behavior |
| 1.5 | 2026-11-16 | Added English versions of the public pages and documents (8.7, 8.1, 8.3). No change to app behavior |
| 1.6 | 2026-11-16 | Full license texts are also shown on the public landing pages (PG-9) |
| 1.7 | 2026-11-16 | App 1.2.0. Finalized the name "mdfolio" (removed "tentative name"). English support for the folder edition (FD-9, FD-10). Added the English one-file sample `sample.en.md` and the change history (8.1). Automated the public pages and releases (8.8). Removed the 1.0.1 trial copy (`dist/hosted/`). Added Mermaid diagram types and export CSS to the known limitations (chapter 11). Reviewed the English text, and added singular/plural selection for English UI text (`{0:item|items}` in `i18n.js`). The items under consideration — "a non-Node.js version of the update command", "specifying the CSS to export" and "a color contrast check" — will not be done, after discussion with the project owner |
| 1.8 | 2026-11-16 | The change history is consolidated into a single Japanese `CHANGELOG.md` (the English version was dropped; at the project owner's instruction, to reduce maintenance work) (8.1, 8.8) |
| 1.9 | 2026-11-17 | App 1.3.0. The appearance can be changed with `mdfolio.css` next to the single HTML, and the export can embed a chosen CSS file (3.10). Added `'self' file:` to the CSP `style-src`. Removed the folder edition (8.6; agreed with the project owner). "Specifying the CSS to export", postponed in 1.7, was adopted in the form of choosing and embedding a file, together with the removal of the folder edition. Moved the language requirement for the command-line export to FR-605 |
| 1.10 | 2026-11-17 | Made it clear that users do not use Node.js. The command-line export is for developers and automation, and was removed from the user-facing instructions (README, samples, public pages) and the release zip (FR-604, AU-3) |
| 1.11 | 2026-11-17 | Swapped the READMEs so that English is `README.md` and Japanese is `README.ja.md` (8.1, 8.7). The default app UI language (`auto`) is unchanged |
| 1.12 | 2026-11-17 | Put English first so that the app can be widely used (the project owner's policy). Public pages: English at the top, Japanese under `ja/`, and `en/` as a redirect page (8.7). Change history and release notes in English (8.1, 8.8). The specification, review record, test report and source code comments are to be written in English |
| 1.13 | 2026-11-18 | Fixes from the user evaluation by 20 evaluators (3.11: FR-1101 to FR-1113). External image permission is stored per HTML file (5.6). The example `mdfolio.css` defines the dark theme too |
