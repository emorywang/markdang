# Architecture

MarkDang is a Manifest V3 extension with four runtime components:

| Component | Responsibility |
| --- | --- |
| Boot script | Hide the initial plain-text view briefly, then restore it if startup fails |
| Content script | Parse and sanitize documents; render the reader, outline, and directory views |
| Service worker | Serialize preference writes, resolve local-file probes, and forward keyboard commands |
| Options and popup | Share one Preact settings component and observe local preference changes |

## Preferences

`src/shared/settings.ts` defines defaults and the public storage keys. Reads recursively merge known fields, validate types and enums, and clamp numeric ranges. Arrays replace rather than concatenate. Unknown keys never enter the normalized schema.

All application writes go through the service worker's FIFO queue. It merges each patch against the latest stored preferences and writes only the affected top-level keys. This prevents rapid UI changes and changes from separate extension pages from overwriting unrelated preferences. Partial plugin patches contain only the modified plugin fields. Settings changes are observed only in the `local` storage area.

## Local files

Content scripts cannot fetch `file:` resources directly. A reader asks the worker to open the current file or its immediate parent directory in an inactive tab. The tab URL contains a unique probe marker. At startup, the content script asks the worker whether that exact tab is a probe, reports its raw text or directory entries, and skips the reader UI only for a confirmed probe.

The worker validates the sender, top-level frame, source URL, target URL, probe kind, and reporting tab. Requests for the same resource share an in-flight probe. Results are not cached between document polls, so auto refresh sees subsequent edits. Every completion clears its timeout; a timeout, tab closure, or creation failure resolves callers and cleans up the temporary tab. Late callbacks cannot settle a replacement probe.

Ordinary inactive tabs still render normally. Web documents use same-origin requests for auto refresh and directory listings. The directory parser resolves links explicitly against the requested URL and accepts immediate children on the same origin.

## Rendering and security

A fresh markdown-it renderer is configured from the active plugins. The pipeline handles front matter, headings and TOC, math, tables, alerts, and diagram placeholders. Heading IDs are assigned before TOC generation, including headings omitted from the TOC. IDs remain unique when titles repeat or already contain numeric suffixes. TOC lists form a tree without empty intermediate lists.

Before any document HTML reaches the live DOM, DOMPurify removes executable markup, forms, active embeds, stylesheets, and unsafe URLs. Metadata values and generated attribute values are escaped. Task checkboxes remain supported. Raw source is retained separately from the rendered DOM.

Mermaid is imported lazily from the installed extension package. Rendering is serialized and versioned so an old asynchronous render cannot replace newer content. Security stays `strict` regardless of user JSON or diagram directives; generated SVG is sanitized as well. Interactive Mermaid callbacks and HTML labels are intentionally unavailable. Invalid diagrams retain their source and display a text error.

PlantUML is a separate network feature. Its explicit switch is excluded from the bulk local-plugin toggle. See [the privacy policy](../PRIVACY.md) for all network behavior.

## Reader lifecycle

Rendering eligibility is based on MIME type and supported URL extensions. A page's initial `<pre>` is the raw source; rendered code blocks are never used as the document source. Changing the master, `.txt`, or folder switch reloads the current page to restore the browser's original DOM or start the reader cleanly. Eligible pages retain a settings observer even when disabled.

Auto refresh has one timer and one in-flight poll per reader. Fetches have timeouts and accept only text document responses. System color-scheme changes update Auto mode without a reload. Outline folding is independent of document rendering, and searching can reveal a match inside a folded section.

## Build

Five sequential Vite passes produce ES modules for options/popup and single-file IIFEs for the content script, classic service worker, boot script, and Mermaid. A module service worker could use static imports; this project chooses a classic bundle for simplicity. Content-script dynamic imports of packaged, web-accessible modules remain supported.

The build removes old output, verifies package/manifest versions, escapes raw U+FFFE/U+FFFF characters, and includes project and third-party license notices. KaTeX styles and fonts are inlined; other fonts and the Mermaid module are web-accessible packaged resources. No executable code is downloaded from a CDN.
