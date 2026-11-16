---
title: Settings
---

# Settings

## List of settings

You can change the default behavior by editing the settings block named `mdv-config` inside `mdfolio.html`.

```html
<script type="application/json" id="mdv-config">{"title":"","lang":"auto","theme":"auto","home":"","allowExternalImages":false,"allowDownloads":true,"lockExternalImages":false,"hosted":false}</script>
```

| Key | Value | Meaning |
|---|---|---|
| `title` | text | Site title. If empty, the folder name is used |
| `lang` | `auto` / `ja` / `en` | Language of the screen |
| `theme` | `auto` / `light` / `dark` | Theme |
| `home` | path of a document | First document to show. If empty, `README.md` |
| `allowExternalImages` | `true` / `false` | Whether to show external images from the start |
| `allowDownloads` | `true` / `false` | `false` hides actions that save files ("Export as site" and saving attachments) |
| `lockExternalImages` | `true` / `false` | `true` never loads external images. Users cannot change this |
| `hosted` | `true` / `false` | `true` shows on the start screen and in the help that this is a public page for trying the viewer out |

The last three are for places where saving files or loading external content is not possible, such as when the page is embedded in another page. When you open the file on your own device, keep the defaults.

> [!WARNING]
> In the single-HTML version, edit only this settings block. If you change the program part, a security mechanism (CSP) stops it from running. In the folder version, you can edit the settings block in `index.html` and `style/document.css`.

## Settings per user

When a user changes the theme, the language, external images, or whether the sidebar is open, the choice is saved in the browser and takes priority over the settings block.

## First document to show

It is chosen in this order:

1. `home` in the settings
2. `README.md` directly in the folder
3. `index.md` directly in the folder
4. The first document in the list
