# Contributing / 贡献指南

Issues and pull requests are welcome. The code is source-available under the [PolyForm Noncommercial License](LICENSE); brand assets are governed separately by [TRADEMARKS.md](TRADEMARKS.md).

## Issues

Include the extension version, browser and version, reproducible steps, expected and actual behavior, and a minimal sanitized Markdown example if needed. Screenshots and relevant settings help. Running the project's test suites is **not** required to report a bug. Use [the security policy](SECURITY.md) for vulnerabilities.

## Pull requests

1. Create a focused `fix/...` or `feat/...` branch and follow [the development guide](docs/development.md).
2. Run `npm run check` and `npm run test:e2e` before requesting review. State any check you could not run and why.
3. Add regression coverage for a corrected failure or new behavior. Keep fixtures in the repository.
4. Update the settings reference when changing a setting. Include before/after screenshots for visible UI changes.
5. Use Conventional Commit messages such as `fix: refresh local documents without stale cache`.

Use strict TypeScript, typed application messages, and small functions with a clear purpose. Keep necessary boundary assertions local. Comments should explain non-obvious decisions. Prefer accurate documentation and working controls over placeholders.

欢迎反馈和提交 PR。报告 Bug 不需要先运行测试；请提供版本、复现步骤和脱敏示例。代码改动请运行检查、补充必要的回归测试，并同步相关文档。保持沟通友善、具体、专业。
