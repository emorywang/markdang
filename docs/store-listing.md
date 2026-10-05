# Chrome Web Store form text

[简体中文](store-listing.zh-CN.md) · [Publishing steps](publishing.md)

Copy each field's text into the matching dashboard field. These statements describe version 1.0.1. The package supplies the name and short description; editing this document alone does not change them.

## Name

MarkDang

## Short description

Read Markdown comfortably in your browser. No accounts, subscriptions, or telemetry.

## Detailed description

MarkDang turns Markdown files into a readable page in Chrome and Edge, with an outline, code highlighting, math, and diagrams.

I built it for reading project documentation and notes directly in the browser. Open a local file or a raw Markdown URL, and use the outline to move between sections without switching to an editor.

What it does:

- Reads .md, .markdown, .mdx, and .mkd files, with optional .txt support.
- Offers light, dark, and system themes, adjustable fonts and content width, and custom CSS.
- Renders tables, task lists, alerts, footnotes, KaTeX math, and Mermaid diagrams.
- Provides an outline and file browsing for local folders or web folders with a directory index.
- Includes source view, zen mode, print styles, code copying, image zoom, and optional auto refresh.
- Supports English and Simplified Chinese, with automatic browser-language selection or a manual choice.

For local files, enable “Allow access to file URLs” in the browser's extension details. Web documents must use a supported filename extension and be served as plain text or Markdown. MDX is displayed as Markdown; JSX, imports, and JavaScript are not executed. The first-install welcome page includes setup steps and a shortcut to extension details; reload open local documents after granting access. Clicking a task checkbox changes the view, not the original file.

There are no accounts, subscriptions, ads, or telemetry. Rendering libraries and fonts are bundled, and preferences stay in the browser profile. Web documents, remote images, and custom CSS may still make requests to their hosts. PlantUML is off by default; if you enable it, diagram source is sent to www.plantuml.com for rendering.

The code is available under PolyForm Noncommercial 1.0.0 for personal and noncommercial use. Commercial use requires separate permission. Donations are optional and do not unlock features.

Project and documentation: https://github.com/emorywang/markdang
Report an issue: https://github.com/emorywang/markdang/issues

## Single purpose description

Read and render Markdown documents in the browser. The outline, file browser, code highlighting, math, diagrams, themes, and refresh controls support reading those documents.

## storage justification

The storage permission saves reading preferences, plugin options, interface language, and user-entered CSS in chrome.storage.local. These settings remain in the local browser profile. The extension does not use Chrome Sync, store document contents, or send preferences to the developer.

## Page access / host justification

Content scripts recognize supported Markdown and optional plain-text document URLs on HTTP(S) hosts and local file URLs. Documents can be hosted on any domain, so their hosts cannot be enumerated in advance. Ordinary HTML website pages are not converted. Local access also supports the browser's directory listing and requires the user's separate “Allow access to file URLs” setting. The extension reads the current document and, when file browsing is used, its parent directory index. Local document refresh and directory reads may briefly open an inactive tab scoped to those resources. It does not enumerate unrelated tabs or record browsing history. The manifest has no separate host_permissions field; its content-script match patterns provide document-page access.

## Remote code choice and explanation

Choice: No, I am not using remote code.

All executable JavaScript ships in the extension package. Mermaid is loaded from the extension's own URL when needed. The extension does not download or execute JavaScript or WebAssembly from a remote server. Optional PlantUML rendering returns an image from www.plantuml.com; it is not remote execution code. Document images and user-entered CSS can request remote resources without adding remote JavaScript.

## Data usage

Select Website content and Web history for the current handling scope, including local processing.

Website content: the current document text and its code, math, diagrams, and directory entries are processed to display the requested document. PlantUML source is sent to www.plantuml.com only if the user enables that disabled-by-default option.

Web history: only the current document and relevant directory/resource URLs are used for rendering, relative links, folder navigation, and optional refresh. No browsing history is recorded, unrelated browsing is not monitored, and no history permission is requested.

The extension does not specifically collect personally identifying, health, financial, authentication, location, or behavioral-tracking data. It does not sell data, use it for unrelated purposes, or use it for creditworthiness or lending decisions. Confirm the dashboard's three use certifications.

## Privacy policy URL

https://github.com/emorywang/markdang/blob/main/PRIVACY.md

Chinese: https://github.com/emorywang/markdang/blob/main/PRIVACY.zh-CN.md. Verify both public main-branch links after merging.

## Reviewer test instructions

No account, payment, license key, or test credentials are required. The interface supports English and Simplified Chinese. Auto uses Simplified Chinese for Chinese browser languages and English otherwise.

1. Install the extension and open https://raw.githubusercontent.com/emorywang/markdang/main/demo/review-sample.md. This plain-text sample should render headings, code, a table, formulas, and a Mermaid diagram.
2. Navigate with the outline. Switch light/dark themes, open source view, and try printing or zen mode. Esc exits zen mode.
3. Open the popup and full settings. Change the interface language in General; the settings and open reader update. Check About's support links.
4. For local testing, save the sample as review-sample.md. In chrome://extensions or edge://extensions, choose MarkDang → Details and enable “Allow access to file URLs”. Drag the saved .md file into the browser. Put a second .md file beside it and use the folder tab to browse.
5. Enable Task lists under Plugins and reload the sample to try checkboxes. Changes affect only the displayed page and disappear after reload.
6. Auto refresh is off by default. Enable it for a local file, edit and save the source, and check the updated view. An inactive local probe tab may briefly open; it closes after reading.
7. PlantUML is off by default and separate from the local-plugin bulk switch. Its setting discloses sending source to www.plantuml.com. It is not needed for these reading tests. Do not use confidential source to test the external service.

There is no telemetry or developer-operated document backend. Remote document/image requests and opt-in PlantUML are disclosed in the policy. MDX does not execute JSX or JavaScript. Ordinary HTML website pages are not converted.

## Other fields

| Field | Value |
| --- | --- |
| Suggested category | Tools |
| Homepage | https://github.com/emorywang/markdang |
| Support | https://github.com/emorywang/markdang/issues |
| Official URL | Blank unless an owned site has been verified |
| Distribution | Public; intended regions |
| Login credentials | None |
| Mature content | No; the product does not supply adult content |
| Promotional video | Optional |
