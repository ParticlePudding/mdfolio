mdfolio (folder version)    * 日本語: はじめに.txt

- Open
  Open index.html in a browser (Chrome / Edge / Firefox / Safari).
  The documents in the docs folder are shown. You can also open other folders and files
  from the menu (...).

- Add or change documents
  1. Put Markdown (.md) files and images in the docs folder.
  2. In this folder, run the following command (Node.js is required):
       node tools/update.mjs
  3. Reload index.html in the browser.
  Step 2 is needed because browsers cannot read the files next to a page opened from your disk.
  To set the title or the first document to show, see: node tools/update.mjs --help
  The command prints messages in English or Japanese, following your computer's language.
  To choose, set the environment variable MDFOLIO_LANG to en or ja.

  The included docs folder holds Japanese sample documents. English sample documents
  (sample-docs-en) are in the distribution zip and at
  https://github.com/ParticlePudding/mdfolio . To show them, run:
       node tools/update.mjs --docs <path to sample-docs-en>

- Change the look
  Edit style/document.css and reload the browser.
  This changes the look of the document body (headings, tables, code and so on) and the colors,
  fonts and text width of the whole screen. How to change it is explained at the top of the file.
  For "Export as site" to use your changes, run node tools/update.mjs after editing.

- Settings
  In the settings inside index.html (the line with id="mdv-config"), you can set the title,
  the language ("lang": "auto", "ja" or "en"), the theme and more.

- What is in this folder
  index.html          the file you open
  style/document.css  document body and colors (you may edit this)
  style/app.css       parts of the screen (usually not edited)
  docs/               the folder for your documents
  data/               files made by the update command (do not edit)
  lib/                the program (do not edit)
  tools/update.mjs    the update command
  README.txt          this guide (Japanese: はじめに.txt)
