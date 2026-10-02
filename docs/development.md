# 开发指南 / Development Guide

## 环境要求 / Prerequisites

- Node.js ≥ 18（推荐 20+）
- Chrome 或 Edge（测试用真实浏览器驱动）

## 常用命令 / Commands

```bash
# 安装依赖
npm install --legacy-peer-deps

# 构建：pages(ES) → content(IIFE) → background(IIFE) → boot(IIFE) → mermaid(IIFE)，输出到 extension/
npm run build

# 监听模式
npm run dev

# 打包 dist/markdang-<version>.zip
npm run zip

# 三套测试（需先构建）
node scripts/e2e.mjs            # 44 项功能/数据流断言
node scripts/test-ux.mjs        # 21 项真实交互断言
node scripts/test-options.mjs   # 22 项选项可观测效果断言

# 重新生成 README 截图（输出到 docs/screenshots/）
node scripts/screenshots.mjs

# TypeScript 严格检查
npx tsc --noEmit
```

## 测试原理 / How tests work

三套测试均通过 `playwright-core` 启动真实 Edge/Chromium，以
`--load-extension` 加载 `extension/` 目录，再经 `chrome://extensions`
页面的 `developerPrivate` API 自动授予「允许访问文件网址」：

- **e2e.mjs** — 功能与数据流：渲染、设置读写、目录探测、txt 门控、禁用状态
- **test-ux.mjs** — 用户操作路径：点击按钮、切换 tab、菜单、禅模式、Esc、色值断言
- **test-options.mjs** — 逐项设置的可观测效果（每个开关必须在 demo 页产生 DOM 变化）

测试样例数据：`../test-md/`（多文件目录，位于仓库外的工作区）与 `demo/full-feature-test.md`（全选项示例）。

## 构建细节 / Build notes

| 主题 | 说明 |
| --- | --- |
| 五段式构建 | 内容脚本与 MV3 Service Worker 禁止静态 `import`，因此各自打包为单文件 IIFE（`inlineDynamicImports`）；`boot.js`（首屏防闪烁）与 `mermaid.js`（图表引擎，按需动态加载）是独立入口；options/popup 为普通 ES 模块页面 |
| 非字符转义 | Chromium 拒绝含 U+FFFE/U+FFFF 的扩展文件（报「非 UTF-8」）。mermaid 的双向文本正则包含裸非字符，`scripts/build.mjs` 构建后自动转义为 `\uFFFE`/`\uFFFF` |
| Mermaid 懒加载 | `mermaid.js` 通过 manifest 的 `web_accessible_resources` 暴露；阅读器仅在文档含 mermaid 代码块时 `import(chrome.runtime.getURL('assets/mermaid.js'))`，挂在 `window.__markdangMermaid` 上 |
| KaTeX 内联 | `?inline` 导入 + 高 `assetsInlineLimit`，样式与字体以 data URL 注入，manifest 无需 CSS 条目 |
| 依赖锁定 | mermaid 11 由 package-lock 锁定；`punycode.js` 为依赖树自带的垫片 |

## 发布清单 / Release checklist

1. `npm run build` 无报错，`npx tsc --noEmit` 通过
2. 三套测试全绿：`e2e` / `test-ux` / `test-options`
3. `node scripts/screenshots.mjs` 重新生成截图并人工过目
4. 更新 `CHANGELOG.md` 与 `public/manifest.json` 版本号
5. `npm run zip`，在 GitHub Releases 上传 zip 与说明
