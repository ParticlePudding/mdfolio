# Distributing documents

There are two ways to share documents with other people.

## 1. Export as a site

Choose "Export as site" in the menu. You get one HTML file that contains all of the open documents.

1. Enter the site title and choose the first document to show
2. Press "Export"
3. Share the HTML file

Recipients only need to double-click the HTML file to read it. They do not have to choose a folder.

> [!IMPORTANT]
> The exported HTML contains your documents as they are. Make sure the content is safe to share before sending it.

Images and attachments referenced by the documents (up to 20 MB each) are also included. Files that no document refers to are left out.

## 2. Share the viewer and the folder

Put `mdfolio.html` and the document folder in a zip file. Recipients open `mdfolio.html` and choose the document folder. This option is best for documents that are still being updated.

## Which to choose

| | Export as site | Viewer and folder |
|---|---|---|
| What recipients do | Just open the file | Choose the folder |
| Updating documents | Export again | Replace the files |
| Best for | Finished documents | Documents in progress |

## Change the look

Place `mdfolio.css` in the same folder as the HTML file to change its look with that CSS. To include it in an export, choose the same file with "Choose CSS" in the export dialog.

## Export from the command line

If you have Node.js installed, you can perform the same export from the command line.

```bash
node tools/build-site.mjs sample-docs-en --title "Sample documents" --out sample-site.html
```
