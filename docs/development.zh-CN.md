# 开发指南

[English](development.md) · [README](../README.zh-CN.md)

使用 Node.js 22.12 及以上版本，推荐 Node.js 24 LTS。以下命令均在仓库根目录运行。

```bash
npm ci
npm run check          # 类型检查、单元测试、干净的生产构建
npm audit --audit-level=high
npx playwright-core install chromium
npm run test:e2e       # 浏览器功能、交互、选项、回归及语言测试
npm run zip           # 重新构建并生成 dist/markdang-v<version>.zip
```

Linux 可使用 `npx playwright-core install --with-deps chromium` 同时安装浏览器依赖，CI 使用该方式。浏览器测试通过 Playwright 的完整 Chromium 通道加载扩展，各套测试使用独立配置，并通过浏览器的扩展管理页授予本地文件访问权限。测试数据位于 `tests/fixtures/` 和 `demo/full-feature-test.md`，不依赖仓库外的文件。测试阻止示例内容向远程网站发起请求。

使用兼容的浏览器可执行文件时，设置：

```powershell
$env:MARKDANG_BROWSER_PATH = 'C:\path\to\chrome.exe'
npm run test:e2e
```

```bash
MARKDANG_BROWSER_PATH=/path/to/chromium npm run test:e2e
```

近期正式版 Chrome、Edge 对命令行加载扩展有限制，测试优先使用 Playwright Chromium。设置 `MARKDANG_HEADLESS=false` 可显示浏览器窗口。

## 快速手动验证

在 PR 对应的成功 Actions 构建页，从 **Artifacts** 下载 **markdang-…** 测试包：先解压下载包，再解压其中的 `markdang-v<version>.zip`。在 `chrome://extensions` 或 `edge://extensions` 加载直接包含 `manifest.json` 的文件夹，开启本地文件访问，打开一个 Markdown 文件即可。测试期间先关闭旧版扩展，并保留解压目录。

另一个 **popup-previews-…** 包包含中英文关于页在浅色、深色模式下的 400 × 600 弹窗截图。**setup-previews-…** 包含中英文欢迎页的浅深色截图。安装引导测试从未授予文件访问的状态开始，检查浏览器中的实际授权和状态更新，以及网页、本地文档、目录页面的图标加载。

CI 下载固定版本的 Noto Sans CJK SC 字体用于截图，下载设有超时和有限重试。该测试环境字体不会加入扩展包。

## 日常开发

`npm run dev` 在源码修改后重新构建。每次构建完成后，在扩展管理页点击「重新加载」，再刷新文档标签页。这是构建监听，不是 Vite 开发服务器或浏览器热更新。

`npm run typecheck` 和 `npm run test:unit` 可独立运行。浏览器测试需要已有 `extension/` 构建。`npm run screenshots` 更新 README 截图；`node scripts/check-visual.mjs` 将审查图写入忽略提交的 `artifacts/` 目录。

## 修改功能

同步修改设置类型、默认值、界面、设置参考及有代表性的回归测试。设置写入应发送局部补丁，避免发送整份旧快照。不要增加尚未实现的控件，也不要用固定断言数量代替行为验证。尽量保留已有存储键，对停用的占位字段给出明确说明。

界面文案在 `src/shared/i18n.ts` 中以完整的中英文对维护，调用键受 TypeScript 检查；两种语言的文档也应同步更新。原始 Markdown、文件名及代码不属于界面翻译。

CI Action 固定到已审核的发布提交。升级时核实上游版本，同时更新 SHA 和版本注释。

`overrides.katex` 复用直接依赖的 KaTeX 版本范围，让 Markdown 插件与 Mermaid 共用已修复的渲染器。升级后，保持 JavaScript、样式表与字体版本一致，并验证文档公式和图表公式。

## 发布检查清单

1. 运行 `npm ci`、`npm run check`、`npm audit --audit-level=high`、`npm run test:e2e`。
2. 检查中英文界面、浅深色阅读视图、实际 400 × 600 弹窗、键盘操作及本地权限提示。确认语言保存、已打开阅读器的即时切换，以及关于页的支持链接。
3. 同步更新 `package.json`、锁文件根节点、`public/manifest.json` 的 `version` 和 `version_name`；构建会拒绝版本不一致的情况。
4. 更新两种语言的更新日志，运行 `npm run zip`。
5. 解压 ZIP，在新浏览器配置中加载**解压目录**并验证。ZIP 根目录直接包含 `manifest.json`。
6. 将 ZIP 上传到 GitHub Release 或浏览器商店。上架前阅读[发布清单](publishing.zh-CN.md)。
