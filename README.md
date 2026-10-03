# MarkDang

MarkDang (码刻档) renders Markdown documents in Chrome and Edge with a clean reading view, an outline, and optional file browsing. No accounts, subscriptions, or telemetry.

[简体中文](README.zh-CN.md) · [Settings](docs/settings.md) · [Development](docs/development.md) · [Privacy](PRIVACY.md)

[![Build](https://github.com/emorywang/markdang/actions/workflows/build.yml/badge.svg)](https://github.com/emorywang/markdang/actions/workflows/build.yml)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-orange)](LICENSE)

| Light reading view | Dark reading view |
| --- | --- |
| ![Light reader](docs/screenshots/reader-light.png) | ![Dark reader](docs/screenshots/reader-dark-outline.png) |

The screenshots illustrate the initial 1.0.0 design; minor controls may differ in the current source.

## Features

- Read `.md`, `.markdown`, `.mdx`, `.mkd`, and optionally `.txt` from local file URLs or web URLs served as plain text or Markdown.
- Switch between light, dark, and system themes; choose code palettes, fonts, content width, and custom CSS.
- Browse a collapsible outline or supported Markdown files in the current directory. Local folder URLs open a file browser; web folders require an HTML directory index.
- Render math, Mermaid diagrams, tables, alerts, task lists, footnotes, TOC, and other Markdown extensions. The 19 plugin switches include the separately enabled network feature PlantUML.
- Use raw source view, zen mode, print, fullscreen, code copying, image zoom, and auto refresh.

MDX files are treated as Markdown: JSX, imports, and JavaScript are not executed. HTML website pages, download responses, protected browser pages, and extensionless web URLs are not automatically converted. Web URLs must match a supported extension; lowercase and uppercase suffixes are supported, including query strings.

The interface supports English and Simplified Chinese. **Auto** follows the browser's display language: Chinese uses Simplified Chinese, and all other languages use English. Choose a language in **General → Interface language**; open settings and reader tabs update immediately. [The settings reference](docs/settings.md) documents all supported options and defaults.

## Install

### Build from source

Use Node.js **22.12+** (24 LTS recommended) and npm:

```bash
git clone https://github.com/emorywang/markdang.git
cd markdang
npm ci
npm run build
```

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode** and select **Load unpacked**.
3. Select the generated `extension/` directory, which contains `manifest.json`.
4. To read local files or folders, open the extension's details and enable **Allow access to file URLs**. The popup also shows this permission's status.

Keep the selected directory in place. After rebuilding, reload the extension and its document tabs.

### Install a release ZIP

When a packaged release is available in [Releases](https://github.com/emorywang/markdang/releases), download `markdang-v<version>.zip` and extract it into a permanent directory. Load **that extraction directory** using the same steps. `manifest.json` is at the ZIP's root; there is no extra `extension/` directory inside it.

This repository does not currently provide a store-install link.

## Use

Open a supported document URL, such as `file:///D:/docs/README.md` or a web-hosted raw Markdown file. Use the sidebar's outline and folder tabs to navigate. The action buttons toggle the sidebar, source view, and theme; print; enter fullscreen; and return to the top. Zen mode retains an exit button and supports Esc.

Shortcuts are editable at `chrome://extensions/shortcuts` (or the equivalent Edge page):

| Shortcut | Action |
| --- | --- |
| `Alt+Shift+B` | Toggle sidebar |
| `Alt+Shift+C` | Toggle centered layout |
| `Alt+Shift+R` | Toggle auto refresh |
| `Alt+Shift+T` | Cycle light, dark, and Auto themes |
| `Esc` | Exit zen mode, close menus or image zoom |

Auto refresh polls the source at 0.5–600-second intervals. Local-file polling briefly opens an inactive tab; use a longer interval when frequent tabs or requests are undesirable. Task-list clicks change only the displayed page and are lost on refresh.

## Privacy and security

Parsing, math, highlighting, Mermaid, and fonts run locally from the extension package. Preferences stay in the browser profile. Document HTML and generated SVG are sanitized; Mermaid uses strict, noninteractive rendering.

Remote images and web documents still generate requests to their hosts. **PlantUML is off by default; enabling it sends diagram source to www.plantuml.com.** Custom CSS can also load external resources. See [PRIVACY.md](PRIVACY.md).

The manifest requests `storage`. Its content-script match patterns also grant access to supported document pages and local file URLs; the absence of a separate `host_permissions` key does not mean the extension has no page access.

## Development and verification

```bash
npm run check                         # TypeScript, unit tests, clean build
npx playwright-core install chromium  # Browser setup; Linux may need --with-deps
npm run test:e2e                       # Feature, interaction, option, regression tests
npm run dev                           # Rebuild when source changes
npm run zip                           # Rebuild and package a release ZIP
```

Tests use repository fixtures and a fresh browser profile. [Development](docs/development.md), [architecture](docs/architecture.md), and [publishing](docs/publishing.md) explain the workflow. CI runs the same checks and browser suites.

The implementation uses TypeScript, Preact, Vite 7, markdown-it, DOMPurify, KaTeX, highlight.js, Mermaid, and pako. Five build passes generate extension pages and the classic worker/content bundles. Executable dependencies ship in the ZIP; Mermaid loads from that package only when needed.

## License and attribution

MarkDang's code is **source-available for noncommercial use** under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use requires separate permission. The license restricts commercial use itself, not only selling derivative software. It is not an OSI-approved open-source license.

Names, logos, icons, and visual identity are reserved brand assets. Distributed forks and derivative products must use a distinct identity and preserve attribution; see [TRADEMARKS.md](TRADEMARKS.md) and [NOTICE](NOTICE). Third-party software and fonts retain their own licenses. Release packages include their license texts.

## Support

[Buy me a coffee to support my work.](https://ko-fi.com/emorywang)
