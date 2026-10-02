# Privacy policy / 隐私声明

Effective date: 2026-10-02

MarkDang reads Markdown documents and renders them in your browser. It does not operate an account service, analytics service, advertising service, or document upload service.

## Local processing and storage

Document text is parsed locally. Reading preferences and custom CSS are stored in `chrome.storage.local` in your browser profile; MarkDang does not use Chrome Sync. The extension reads the current document URL to resolve relative links and, when requested, list its parent directory. Local directory and document probes open an inactive browser tab and close it after reading or after a timeout. Probe results are not saved to disk by the extension.

## Network requests

- Opening a web document and its linked images involves normal requests to the document or image host. Remote images referenced by Markdown may load automatically.
- The folder sidebar requests the current web document's parent directory when you open the folder tab. Web auto refresh requests the current document again while enabled.
- **PlantUML is disabled by default.** Enabling it sends the content of `plantuml` code blocks, compressed and encoded in an image request URL, to **https://www.plantuml.com**. Encoding is not encryption. Do not enable it for confidential diagrams.
- Custom CSS supplied by you may load external resources through `url()` or `@import`.
- Each contacted server may receive standard request information such as your IP address and the requested URL, according to the browser's normal networking rules. Its privacy policy applies to that request.

MarkDang does not send document content to its author or use telemetry. Markdown, KaTeX, syntax highlighting, Mermaid, and the bundled fonts run from the installed extension package. Mermaid uses strict security settings; executable HTML and active embeds are removed from documents before display.

## Permissions and controls

The extension requests `storage` to save preferences. Its content-script match patterns allow it to recognize supported document URLs on web hosts and local file URLs. These patterns are an access grant even though the manifest has no separate `host_permissions` entry. Local files also require you to enable **Allow access to file URLs** in the browser's extension settings.

You can disable the reader, auto refresh, or PlantUML in its settings, reset your preferences, or uninstall the extension. Uninstalling removes the extension's local preferences. MarkDang does not change the original Markdown files; interactive task-list changes affect only the displayed document and are lost on refresh.

Questions: [open a privacy question](https://github.com/emorywang/markdang/issues/new) without including private documents or personal information. For security vulnerabilities, follow [SECURITY.md](SECURITY.md).

## 中文说明

MarkDang 在浏览器内解析文档，不向作者上传文档，也不提供账号、广告、统计或遥测服务。设置仅保存在当前浏览器的本地扩展存储中，不使用 Chrome Sync。

打开网页文档、文档内的远程图片、网页目录及自动刷新会访问相应网站。**PlantUML 默认关闭；单独开启后，图表源码会以压缩编码的图片 URL 发送至 www.plantuml.com，编码不等于加密。** 自定义 CSS 中的外部资源也可能产生请求。这些网站可接收 IP 地址、请求 URL 等正常网络信息。

本地文件探测通过临时非活动标签页完成，结束或超时后关闭，不持久保存探测结果。内容脚本的匹配范围本身也授予页面访问能力；本地访问还需要手动开启「允许访问文件网址」。任务勾选不会写回原文件。可以关闭相应功能、重置设置或卸载扩展。
