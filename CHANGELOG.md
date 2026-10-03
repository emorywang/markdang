# Changelog

[简体中文](CHANGELOG.zh-CN.md) · [README](README.md)

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- English and Simplified Chinese interfaces, with automatic browser-language selection and a persistent manual choice.
- Support links in About and README: Ko-fi in English; Afdian and Ko-fi in Chinese.
- Complete Chinese counterparts for settings, development, architecture, publishing, privacy, security, contribution, and changelog documentation.
- Privacy policy, store-publishing checklist, and language regression checks.

### Fixed

- Refresh local files without returning cached source; identify probe tabs explicitly and clear completed probe timers.
- Serialize settings writes, merge nested preferences, validate stored values, and retain rapid UI changes.
- Sanitize Markdown HTML and Mermaid SVG; enforce Mermaid strict security and escape metadata, attributes, and error messages.
- Generate stable TOC links for repeated, formatted, omitted, and Unicode headings; handle invalid regex without breaking rendering.
- Update Auto theme on system changes, restore original pages when disabled, keep the zen exit button visible, and correct directory sorting.
- Apply KaTeX error options consistently and preserve source when front matter is disabled.
- Preserve formatted task labels and nested task lists without sharing options between renderers.

### Changed

- Keep PlantUML separate from the bulk local-plugin switch; show its network disclosure and actual local-file permission status.
- Replace the inactive language selector with working localization; remove the inactive character-set control and duplicate popup CSS.
- Increase sidebar/menu text; keep popup navigation on one row with an accessible full-settings icon.
- Refine bilingual About copy with reading features, local settings, and the absence of accounts, subscriptions, and telemetry.
- Update reader labels in place when the language changes, preserving task state and outline folds.
- Use a supported Vite 7 build, clean output, real build watching, version checks, and release license notices.
- Package formula fonts as local WOFF2 resources loaded on demand, reducing the reader script and release size.
- Make browser tests portable and self-contained; add unit and regression suites to CI.
- Correct repository links, setup/ZIP instructions, privacy claims, settings behavior, and contributor guidance.

## [1.0.0] - 2026-10-01

The first public version of MarkDang (码刻档), an independently developed browser Markdown reader. No accounts, subscriptions, or telemetry; free for personal and noncommercial use.

### Branding

- C1 visual identity: extension icons, bilingual horizontal logos for light/dark backgrounds, and favicon.
- Shared MarkDang light/dark palette for the reader and settings, following the system color scheme.
- Bundled Manrope variable font and Source Code Pro, loaded locally with `@font-face`.
- Consistent toolbar/sidebar icons using a 24-unit viewBox and 1.75-unit strokes.

### Licensing

- PolyForm Noncommercial License 1.0.0 for source code; commercial use requires separate permission.
- Names, logos, icons, and brand visuals are excluded from the code license; `TRADEMARKS.md` and `NOTICE` document fork branding and attribution.

### Reading

- Light, dark, and system themes, with independent code palettes for light/dark pages.
- Centered content, custom maximum width in px/%, six text sizes, four font stacks, and custom CSS.
- Source view, zen mode with Esc exit, print styles, fullscreen, and back-to-top.
- Code copying and image zoom.

### Sidebar

- File browsing, filtering, name/size/date sorting, ascending/descending order, folders first, and dotfile visibility.
- Outline folds, expand/collapse-all menu, live filtering, and emphasized parent headings.
- File browsing for local directory pages.

### Plugins

- Nineteen plugin switches: line breaks, automatic links, typographic substitutions, emoji, superscript, subscript, TOC, inserted/highlighted text, math, Mermaid, PlantUML, abbreviations, definition lists, footnotes, front matter, extended tables, task lists, and alerts.
- TOC heading levels, class, marker pattern, omit comment, and nested ordered/unordered lists.
- Inline/block/bare/fenced/HTML math and error colors; Mermaid theme and initialize JSON.
- Optional PlantUML rendering through its public server; front matter table display.
- Extended table row spans, multiline cells, headerless/multiple bodies, and caption anchors.
- Interactive task checkboxes and label positioning; GitHub-style alert filters, nested alerts, and five named containers.

### Engineering

- Vite, strict TypeScript, and Preact 10; single-file IIFE content-script and service-worker bundles.
- Post-build escaping of U+FFFE/U+FFFF characters rejected by Chromium's UTF-8 validation.
- Separate background-tab channels for local directory/document probes, with caching in the initial version.
- Idempotent heading decoration and nested TOC output; initial feature, interaction, and option browser suites.
- Initially inlined KaTeX styles/fonts; content-script matches grant page access without a separate `host_permissions` field.
- Windows ZIP path correction, locked Mermaid dependency, and a punycode build shim.

[1.0.0]: https://github.com/emorywang/markdang/releases/tag/v1.0.0
