---
title: Settings
---

# Settings

## List of settings

You can change the default behavior by editing the settings block with the ID `mdv-config` in `mdfolio.html`.

```html
<script type="application/json" id="mdv-config">{"title":"","lang":"auto","theme":"auto","home":"","allowExternalImages":false,"allowDownloads":true,"lockExternalImages":false,"hosted":false}</script>
```

| Key | Value | Meaning |
|---|---|---|
| `title` | text | Site title. If empty, the folder name is used |
| `lang` | `auto` / `ja` / `en` | Interface language |
| `theme` | `auto` / `light` / `dark` | Theme |
| `home` | path of a document | First document to show. If empty, `README.md` |
| `allowExternalImages` | `true` / `false` | Whether to show external images from the start |
| `allowDownloads` | `true` / `false` | `false` hides actions that save files ("Export as site" and saving attachments) |
| `lockExternalImages` | `true` / `false` | `true` never loads external images. Users cannot change this |
| `hosted` | `true` / `false` | `true` adds a notice on the start screen and in the help saying that this is a public page for trying out the viewer |

The last three are for places where saving files or loading external content is not possible, such as when the page is embedded in another page. When you open the file on your own device, keep the defaults.

> [!WARNING]
> Edit only this settings block in the HTML file. If you change any other part, a security mechanism (CSP) stops the page from working. To change the look, do not edit the HTML; place `mdfolio.css` next to it instead.

## Per-user settings

When a user changes the theme, language, external image setting, or sidebar visibility, these preferences are saved in the browser and take priority over the settings block.

## First document to show

It is chosen in this order:

1. `home` in the settings
2. `README.md` at the top level of the folder
3. `index.md` at the top level of the folder
4. The first document in the list
