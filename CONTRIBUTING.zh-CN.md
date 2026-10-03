# 贡献指南

[English](CONTRIBUTING.md) · [README](README.zh-CN.md)

欢迎提交 Issue 和 PR。代码采用 [PolyForm Noncommercial License](LICENSE)，品牌资产另受[商标与品牌指南](TRADEMARKS.md)约束。

## 报告问题

请提供扩展版本、浏览器及版本、复现步骤、期望表现和实际表现。涉及文档渲染时，可附最小脱敏 Markdown 示例；截图及相关设置也有帮助。报告 Bug **不需要先运行测试**。安全漏洞请按[安全政策](SECURITY.zh-CN.md)报告。

## 提交 PR

1. 创建范围明确的 `fix/...` 或 `feat/...` 分支，遵循[开发指南](docs/development.zh-CN.md)。
2. 请求审阅前运行 `npm run check` 和 `npm run test:e2e`；说明无法运行的检查及原因。
3. 为修复的失败场景或新增行为补充必要的回归测试，测试示例保存在仓库中。
4. 功能修改同步更新中英文文档；可见界面变化附修改前后的截图。`src/shared/i18n.ts` 中的文案应保持完整的中英文对。
5. 使用 Conventional Commits，例如 `fix: refresh local documents without stale cache`。

使用严格 TypeScript、带类型的应用消息和职责清晰的小函数。必要的边界类型断言放在使用位置附近；注释解释不明显的设计理由。优先保证文档准确、控件实际生效。沟通保持友善、具体、专业。
