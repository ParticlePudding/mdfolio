# Distributing documents

There are three ways to hand documents to other people.

## 1. Export as a site

Choose "Export as site" in the menu. You get one HTML file that contains all of the open documents.

1. Enter the site title and choose the first document to show
2. Press "Export"
3. Hand over the HTML file

Recipients only need to double-click the HTML file to read it. They do not have to choose a folder.

> [!IMPORTANT]
> The exported HTML contains your documents as they are. Make sure the content may be shared before you hand it over.

Images and attachments that the documents refer to (up to 20 MB each) are included too. Files that no document refers to are left out.

## 2. Hand over the viewer and the folder

Put `mdfolio.html` and the document folder in a zip file. Recipients open `mdfolio.html` and choose the document folder. This suits documents that are still being updated.

## 3. Put the folder version in a fixed place

The folder version consists of `index.html` and folders such as `style`, `docs` and `lib`. Put it in a fixed place, such as a shared folder. Put your documents in `docs` and run `node tools/update.mjs`; after that, opening `index.html` is all it takes to read them. You can change the look to match your organization by editing `style/document.css`.

## Which to choose

| | Export as site | Viewer and folder |
|---|---|---|
| What recipients do | Just open the file | Choose the folder |
| Updating documents | Export again | Replace the files |
| Best for | Finished documents | Documents in progress |

## Export from the command line

If you have Node.js, the same export can be run as a command.

```bash
node tools/build-site.mjs sample-docs-en --title "Sample documents" --out sample-site.html
```
