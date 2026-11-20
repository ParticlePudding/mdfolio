# Limitations

## Browsers

| Browser | Support |
|---|---|
| Chrome / Edge | All features |
| Firefox / Safari | Reading, search and export. "Reopen last folder" and automatic refresh are not available |

## Documents

- mdfolio can read up to 5,000 documents from a single folder.
- Documents larger than 10 MB are shown as plain text without conversion.
- Folders and files whose names start with `.`, and `node_modules` folders, are not read.
- Supported text encodings are UTF-8, UTF-16 (with BOM), and Shift_JIS.

## Links and images

- Write links and image paths relative to the document. Absolute paths such as `C:\docs\a.md` cannot be used.
- If you open files only (not a folder), images cannot be shown.
- Images on the internet are not shown by default[^ext].

[^ext]: You can change this with "Show external images" in the menu. Turning it on reloads the page.

## Diagrams

Mermaid mindmaps (`mindmap`) and architecture diagrams (`architecture-beta`) are not available, because the bundled lightweight build does not include them. If you write one, an error is shown in place of the diagram.
