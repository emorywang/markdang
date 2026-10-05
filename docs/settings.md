# Settings reference

[简体中文](settings.zh-CN.md) · [README](../README.md)

Settings are saved locally in the current browser profile and apply to open reader tabs. English and Simplified Chinese are available; Auto is the default. The demo illustrates Markdown syntax and common reading options; automated suites cover additional lifecycle and persistence behavior.

## Reading and appearance

| Storage key | Default | Behavior |
| --- | --- | --- |
| `enable` | `true` | Master switch; changes reload the current eligible page |
| `language` | `auto` | `auto`, `zh-CN`, or `en`. Auto uses the browser UI language: Chinese → Simplified Chinese; everything else → English. Manual choices take precedence. Open settings, popup, and reader labels update immediately without re-rendering document content |
| `enableFolderUrl` | `true` | Render local directory listings |
| `enableTxtExt` | `true` | Read `.txt` as Markdown |
| `refresh` | `false` | Poll the current document; local files use temporary inactive tabs |
| `refreshInterval` | `0.5` | Seconds, clamped to 0.5–600 |
| `pageTheme` | `auto` | `light`, `dark`, or system-following `auto` |
| `codeBlockDayTheme` | `light` | Code palette on a light page: `light` or `dark` |
| `codeBlockNightTheme` | `dark` | Code palette on a dark page: `light` or `dark` |
| `textSize` | `Medium` | Tiny 12, Small 14, Normal 16, Medium 18, Large 20, Extra Large 24 px; applies to content independently of sidebar text |
| `textFont` | `Default` | `Default`, `System`, `Serif`, `Monospace` |
| `centered` | `true` | Center the content within the reading area |
| `enableCustomContentWidth` | `false` | Use the custom maximum width; otherwise 1000 px |
| `customContentData` | `{unit: 'px', maxWidth: 1000, maxPercent: 50}` | `px`: 500–3000; `%`: 10–100 of the reading area |
| `codeWrap` | `false` | Wrap long code lines |
| `zenMode` | `false` | Hide the sidebar and controls except the exit button; Esc exits |
| `enableCustomCSS` | `false` | Apply the saved custom stylesheet |
| `customCSS` | `''` | Saved on **Apply CSS**; **Cancel** restores the saved draft. External CSS resources may generate requests |
| `isOutlineExpandable` | `true` | Show fold controls; disabling reveals folded headings |
| `sideCollapsed` | `false` | Remember sidebar visibility |

Local file access is a browser permission, not a storage setting. Store installations start with it disabled; only the user can enable **Allow access to file URLs** in extension details. MarkDang opens a welcome page on first installation, not on updates. The welcome page, settings, and popup show the actual status and link to Chrome or Edge extension details. The status is checked again when the page regains focus or becomes visible. Reload open local documents after granting access. Web documents do not require this file permission.

## Plugins

`mdPlugins` is the list of enabled plugin names. All below are enabled by default **except PlantUML**. The bulk toggle affects only local rendering plugins and preserves the separate PlantUML choice.

| Plugin | Options under `mdPluginOptions` |
| --- | --- |
| `Breaks` | Soft line breaks become `<br>`; off follows standard Markdown soft-break behavior |
| `Linkify` | `fuzzyLink: false`, `fuzzyIP: false`, `fuzzyEmail: true`; explicit URLs remain supported. Leave whitespace between an email address and adjacent Chinese text |
| `Typographer` | Typographic substitutions such as `(c)` → © and `(TM)` → ™ |
| `Emoji` | Emoji shortcodes |
| `Sup`, `Sub` | Superscript `^text^` and subscript `~text~` |
| `TOC` | `includeLevel: [1,2]`, `containerClass: 'table-of-contents'`, `markerPattern: '/^\\[\\[toc\\]\\]/im'`, `omitTag: '<!-- omit from toc -->'`, `listType: 'ul'`. Regex strings or `/pattern/flags` are accepted; invalid regex uses the default marker. The omit comment may precede a heading or follow its text |
| `Ins`, `Mark` | `++inserted++`, `==marked==` |
| `Katex` | `enableBareBlocks`, `enableMathBlockInHtml`, `enableMathInlineInHtml`, `enableFencedBlocks`, `throwOnError`: all `false`; `errorColor: '#cc0000'`. Applies to `$...$`, `$$...$$`, and enabled extras. Errors fall back to source; `throwOnError` also logs errors in the standard math plugin |
| `Mermaid` | `theme: 'auto'` (or `default`, `dark`, `neutral`, `forest`); `json` defaults to `{"theme":"auto","startOnLoad":false}`. Theme selector takes precedence. Invalid JSON objects fall back to defaults. Security, text-size limit, noninteractive rendering, and disabling HTML labels are fixed by the reader |
| `PlantUML` | Disabled by default; sends diagram source to **www.plantuml.com** as an encoded SVG image request. No custom server setting is provided |
| `Abbr`, `Deflist`, `Footnote` | Abbreviations, definition lists, and `[^name]` footnotes |
| `FrontMatter` | `showMetadata: false`; recognizes a leading YAML-style `---` / `---` or `...` block. Display is a simple table of single-line `key: value` entries, not a full YAML parser. Disabling this plugin renders the original source as Markdown |
| `MultimdTable` | `rowspan`, `multiline`, `headerless`, `multibody`, `autolabel`: all `false` |
| `TaskLists` | `enabled`, `label`, `labelAfter`: all `false`. `enabled` allows clicks; `label` wraps the item text; `labelAfter` displays text before the checkbox and turns on `label` in the UI. Changes are not written back to the source |
| `Alert` | `alertNames: ['important','note','tip','warning','caution']`; optional `info`, `danger`; `deep: false`. `infoContainer`, `tipContainer`, `successContainer`, `warningContainer`, `dangerContainer`: all `true`, controlling the corresponding `::: name` containers |

## Sidebar

Outline and file filters run locally. Searching the outline reveals matching headings even inside folded sections. Directory sorting supports names and, where the browser supplies them, file sizes and dates. Folders-first and dotfile visibility are independent choices. Directory filter/sort choices last for the current page; sidebar visibility is persisted.

Reader sidebar text uses a 15 px base, with 15 px outline entries. The standalone settings menu uses 15 px text; the popup menu uses 14 px.

The file panel lists supported Markdown extensions and subdirectories; it does not list `.txt` files. Web directory browsing requires a readable HTML directory index. File system attributes marked hidden without a leading dot cannot be identified through the browser's directory listing.

## Retained compatibility keys

`charsetCompat`, `charset`, `maxOutlineExpandLevel`, and `skipGuide` were stored placeholders without implemented controls. They remain readable for compatibility, but do not control current behavior. The inactive character-set selector has been removed; use UTF-8 source files. Legacy `mode: 'zen'` is understood as zen mode; the UI uses `zenMode`.

The `language` key now controls the interface. Legacy `zh-*`/`zh_*` values map to `zh-CN`, `en-*`/`en_*` values map to `en`, and unsupported values map to `auto`. Resetting preferences restores Auto. Browser-managed extension descriptions and shortcut labels follow the browser language independently of the manual interface choice.
