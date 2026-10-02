# Privacy policy

[简体中文](PRIVACY.zh-CN.md) · [README](README.md)

Effective date: 2026-10-02

MarkDang reads Markdown documents and renders them in your browser. It does not operate an account service, analytics service, advertising service, or document upload service.

## Local processing and storage

Document text is parsed locally. Reading preferences and custom CSS are stored in `chrome.storage.local` in your browser profile; MarkDang does not use Chrome Sync. The extension reads the current document URL to resolve relative links and, when requested, list its parent directory. Local directory and document probes open an inactive browser tab and close it after reading or after a timeout. Probe results are not saved to disk by the extension.

## Network requests

- Opening a web document and its linked images involves normal requests to the document or image host. Remote images referenced by Markdown may load automatically.
- The folder sidebar requests the current web document's parent directory when you open the folder tab. Web auto refresh requests the current document again while enabled.
- **PlantUML is disabled by default.** Enabling it sends the content of `plantuml` code blocks, compressed and encoded in an image request URL, to **https://www.plantuml.com**. Encoding is not encryption. Do not enable it for confidential diagrams.
- Custom CSS supplied by you may load external resources through `url()` or `@import`.
- Support links visit Ko-fi or Afdian only when opened. Payments take place on those sites; MarkDang does not embed payment widgets or track support-link clicks.
- Each contacted server may receive standard request information such as your IP address and the requested URL, according to the browser's normal networking rules. Its privacy policy applies to that request.

MarkDang does not send document content to its author or use telemetry. Markdown, KaTeX, syntax highlighting, Mermaid, and the bundled fonts run from the installed extension package. Mermaid uses strict security settings; executable HTML and active embeds are removed from documents before display.

## Permissions and controls

The extension requests `storage` to save preferences. Its content-script match patterns allow it to recognize supported document URLs on web hosts and local file URLs. These patterns are an access grant even though the manifest has no separate `host_permissions` entry. Local files also require you to enable **Allow access to file URLs** in the browser's extension settings.

You can disable the reader, auto refresh, or PlantUML in its settings, reset your preferences, or uninstall the extension. Uninstalling removes the extension's local preferences. MarkDang does not change the original Markdown files; interactive task-list changes affect only the displayed document and are lost on refresh.

Questions: [open a privacy question](https://github.com/emorywang/markdang/issues/new) without including private documents or personal information. For security vulnerabilities, follow [SECURITY.md](SECURITY.md).
