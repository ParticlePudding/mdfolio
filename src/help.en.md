# How to use mdfolio

mdfolio is a viewer for reading Markdown documents with nothing but a browser. It needs no server and no installation. Documents are processed on this device only and are never sent anywhere.

## Open documents

| To do this | Do this |
|---|---|
| Open a whole folder | Press "Open folder" and choose a folder, or drop a folder onto this window |
| Open files only | Press "Open files", or drop `.md` files |
| Reopen the last folder | Press "Reopen last folder" on the start screen (Edge / Chrome only) |

After you open a folder, the file list appears on the left and the outline of the page on the right.

> [!NOTE]
> When you choose a folder, the browser may ask whether to let the site view files, or whether to "upload" them. This only lets this page read the folder. No file is sent anywhere.

If you open files only, images in the same folder cannot be shown. Open the whole folder to show them.

## Read

- **Switch documents**: use the list on the left or links in the text. The browser's Back and Forward buttons work too.
- **Search**: type in the search box at the top. `Ctrl+K` (`⌘K` on Mac) or `/` moves to the search box. Words separated by spaces must all appear. Case and character width are ignored.
- **Theme**: the button at the top right cycles through auto, light and dark.
- **Print or save as PDF**: use the browser's print function. Only the document body is printed.
- **Pick up changes**: when a folder is open in Edge / Chrome, saving the file you are viewing updates the page automatically. Use "Reload" in the menu after adding or removing files.

## Distribute

"Export as site" in the menu packs the open documents into one HTML file. Recipients only need to open that file to read them.

- Images and attachments referenced by the documents are included (up to 20 MB each).
- If no document uses math or diagrams, the code for those features is left out to keep the file small.
- HTML sent directly by email or chat may be altered on the way and stop working. Sending it in a zip file is reliable.

## Use the folder edition

In the folder edition (`index.html` with folders such as `style` and `docs`), opening `index.html` shows the documents in the `docs` folder.

- After adding or changing documents, run `node tools/update.mjs` in that folder and reload the page.
- Change the look in `style/document.css`. It controls the document body and the colors, fonts and text width of the whole screen.
- After opening another folder, use "Back to the main documents" in the menu (⋯) to return.

## Control the sidebar order

Put `_sidebar.md` (or `SUMMARY.md`) at the top of the folder and its content appears in the "Nav" tab of the sidebar. Write a list of links.

```markdown
- [Introduction](README.md)
- Guide
  - [Install](guide/install.md)
  - [Settings](guide/config.md)
```

## Supported syntax

Besides common Markdown such as headings, lists, tables, code, links and images, the following are supported.

| Syntax | How to write |
|---|---|
| Task list | `- [ ] todo`, `- [x] done` |
| Footnote | `[^1]` in the text and `[^1]: note` on its own line |
| Alerts | `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` |
| Math | `$E = mc^2$` inline, `$$` around a displayed formula |
| Diagram | a code block whose language is `mermaid` |

Write links and images as paths relative to the document (for example `[Settings](guide/config.md)`, `![Overview](img/overview.png)`).

Diagrams (Mermaid) include flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, pie charts and more. **Mindmaps (`mindmap`) and architecture diagrams (`architecture-beta`) are not available** (the bundled lightweight build does not include them). If you write one, an error is shown in place of the diagram.

## External images

Images and videos on the internet (`https://…`) are not shown by default, because loading them tells the hosting server that you opened the document. Images referenced inside diagrams (Mermaid) are treated the same way, and the browser's Content Security Policy blocks them as well.

Switch this with "Show external images" in the menu. Turning it on reloads the page; if you had a folder open, open it again after the reload.

## Keyboard

| Key | Action |
|---|---|
| `Ctrl+K` (`⌘K` on Mac), `/` | Go to the search box |
| `↑` `↓` `Enter` | Choose and open a search result |
| `Tab` | Move to the next item. At the top of the page it shows "Skip to content" |
| `Enter` or `↓` on the menu (⋯) | Open the menu. Choose an item with `↑` `↓` |
| `Esc` | Close search results, the menu or a dialog |
| `←` `→` on a wide table or code block | Tab to the table or code first, then scroll sideways |

## Troubleshooting

| Situation | What to do |
|---|---|
| Images do not appear | If you opened files only, open the whole folder. Check that image paths are relative to the document |
| Text is garbled | Save the document as UTF-8 (supported: UTF-8, UTF-16 with BOM, Shift_JIS) |
| A link says "not found" | Check the link path and the file name. Absolute paths such as `C:\…` do not work |
| "Reopen last folder" is missing | It is available in Edge / Chrome only. Choose the folder again |
| Math or diagrams do not appear | An exported HTML cannot show them if the documents did not use them at export time. Export again from the original folder |
