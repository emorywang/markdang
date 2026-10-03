# Contributing

[简体中文](CONTRIBUTING.zh-CN.md) · [README](README.md)

Issues and pull requests are welcome. The code is source-available under the [PolyForm Noncommercial License](LICENSE); brand assets are governed separately by [TRADEMARKS.md](TRADEMARKS.md).

## Issues

Include the extension version, browser and version, reproducible steps, expected and actual behavior, and a minimal sanitized Markdown example if needed. Screenshots and relevant settings help. Running the project's test suites is **not** required to report a bug. Use [the security policy](SECURITY.md) for vulnerabilities.

## Pull requests

1. Create a focused `fix/...` or `feat/...` branch and follow [the development guide](docs/development.md).
2. Run `npm run check` and `npm run test:e2e` before requesting review. State any check you could not run and why.
3. Add regression coverage for a corrected failure or new behavior. Keep fixtures in the repository.
4. Update both language versions of relevant docs when changing behavior. Include before/after screenshots for visible UI changes, and keep interface text pairs in `src/shared/i18n.ts` complete.
5. Use Conventional Commit messages such as `fix: refresh local documents without stale cache`.

Use strict TypeScript, typed application messages, and small functions with a clear purpose. Keep necessary boundary assertions local. Comments should explain non-obvious decisions. Prefer accurate documentation and working controls over placeholders.
