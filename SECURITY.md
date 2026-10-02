# Security policy

Security fixes target the latest release and current `main` branch.

Do not post sensitive documents, credentials, or exploit details in a public issue. Use [GitHub private vulnerability reporting](https://github.com/emorywang/markdang/security/advisories/new). If GitHub indicates that private reporting is unavailable, open a public issue asking for a private contact channel **without disclosing the vulnerability**. No response-time guarantee is made.

## Security boundaries

- Document HTML is sanitized with DOMPurify before insertion into the page. Metadata and generated attributes are escaped. Active embeds and forms are removed.
- Mermaid uses `securityLevel: 'strict'`, fixed security options, and sanitized SVG. Document directives and custom JSON cannot enable JavaScript callbacks.
- Local probes validate their requesting and reporting tabs. A document may request only itself or its immediate parent directory, not arbitrary local files.
- The extension ships its executable dependencies in the package and does not load remote JavaScript. The extension's default CSP is an additional protection; it does not replace sanitizing document content in the page DOM.
- Remote images, explicit PlantUML rendering, and custom CSS resources can generate network requests. See [PRIVACY.md](PRIVACY.md).

安全漏洞请勿通过公开 Issue 披露。优先使用上述 GitHub 私密报告入口；如未启用，请仅请求私密联系渠道，不附漏洞细节或敏感文档。
