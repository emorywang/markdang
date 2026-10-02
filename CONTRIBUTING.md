# 贡献指南 / Contributing

感谢关注本项目！欢迎 Issue 与 PR。
Thanks for your interest — issues and PRs are welcome.

## 提交 Issue / Filing issues

请包含：
Please include:

1. 浏览器与版本（Chrome/Edge）
2. 复现步骤与最小示例文件（可脱敏）
3. 相关设置的截图或导出（设置 → 恢复默认设置前请先备份）
4. `chrome://extensions` → 本扩展 → Service Worker 控制台的报错（如有）

## 提交 PR / Submitting PRs

1. Fork 并创建分支：`feat/xxx` 或 `fix/xxx`
2. 开发流程见 [docs/development.md](docs/development.md)
3. **提交前必须全部通过**（这是本项目的硬性约定，避免让其他用户当测试员）：

   ```bash
   npx tsc --noEmit && npm run build
   node scripts/e2e.mjs && node scripts/test-ux.mjs && node scripts/test-options.mjs
   ```

4. 新增/变更设置项时：
   - 在 `src/shared/settings.ts` 补充 schema（存储键名一经发布即视为稳定契约，不做破坏性变更）
   - 在 `demo/全功能测试.md` 增加可观测示例
   - 在 `test-options.mjs` 增加断言
   - 在 `docs/settings.md` 与 README 设置表同步

5. UI 改动请附带修改前后的截图

## 代码风格 / Style

- TypeScript 严格模式；不加 `any`（与 DOM/扩展 API 边界除外）
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)（`feat:` / `fix:` / `docs:` / `chore:` / `test:`）
- 注释只写「为什么」，不写「做了什么」

## 行为准则 / Code of Conduct

保持友善与专业。项目维护者保留处理不当言论的权利。
Be kind and professional.
