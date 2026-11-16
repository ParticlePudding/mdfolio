# Distributing documents

There are three ways to share documents with other people.

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

## 3. Put the folder version in a shared location

The folder version consists of `index.html` and folders such as `style`, `docs` and `lib`. Put it in a permanent location, such as a shared folder. Put your documents in the `docs` folder and run `node tools/update.mjs`; after that, opening `index.html` is all it takes to read them. You can change the look to match your organization by editing `style/document.css`.

## Which to choose

| | Export as site | Viewer and folder | Folder version |
|---|---|---|---|
| What recipients do | Just open the file | Choose the folder | Just open `index.html` |
| Updating documents | Export again | Replace the files | Run the update command |
| Best for | Finished documents | Documents in progress | Documents shared in one place |

## Export from the command line

If you have Node.js installed, you can perform the same export from the command line.

```bash
node tools/build-site.mjs sample-docs-en --title "Sample documents" --out sample-site.html
```
