# MarkDang 码刻档

MarkDang（码刻档）是一个浏览器扩展，在 Chrome 和 Edge 中把 Markdown 文件渲染为排版舒适、样式统一的阅读视图。

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-orange)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/develop/concepts/manifest-v3)
[![Tech](https://img.shields.io/badge/TypeScript-Vite%20%2B%20Preact-3178c6)](#技术栈)
[![Tests](https://img.shields.io/badge/Tests-87%20assertions-success)](#测试)
[English](README.md)

| 阅读视图（浅色） | 阅读视图（深色，大纲已折叠） |
| --- | --- |
| ![Reader light](docs/screenshots/reader-light.png) | ![Reader dark](docs/screenshots/reader-dark-outline.png) |

| 侧栏目录 tab | 文件夹浏览页 | 设置页 |
| --- | --- | --- |
| ![目录 tab](docs/screenshots/sidebar-folder-tab.png) | ![文件夹浏览页](docs/screenshots/folder-view.png) | ![设置页](docs/screenshots/options-page.png) |

## 功能

- 渲染 `.md`、`.markdown`、`.mdx`、`.mkd`（可选启用 `.txt`），支持 `http(s)` 与 `file://` 两种来源
- 页面主题：浅色 / 深色 / 跟随系统；代码块主题在各模式下独立设置
- 侧栏双 tab：大纲（标题折叠、全部展开/折叠、实时筛选）与目录（文件搜索、按名称/大小/日期排序、文件夹置顶、显示隐藏文件）
- 本地文件夹 URL 渲染为文件浏览页
- 自动刷新：编辑文件时自动重新渲染（间隔 0.5–600 秒）
- 19 个 markdown-it 插件，均可单独开关并带有细分选项：KaTeX 公式、Mermaid 图表（按需懒加载）、PlantUML（默认关闭）、GitHub 风格警告框、任务列表、脚注、Multi-Markdown 表格、TOC 等
- 禅模式、打印样式、全屏、回顶部、代码一键复制、图片点击缩放
- 内容宽度（px/%）、字号、字体、自定义 CSS 均可配置

## 安装

### 从 Release 安装

1. 从 [Releases](../../releases) 下载 `markdang-v1.0.0.zip` 并解压
2. 打开 `chrome://extensions`（Edge：`edge://extensions`）
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择 `extension` 文件夹
5. 在扩展详情中开启「允许访问文件网址」——本地文件与文件夹功能必需

该文件夹以原地引用方式加载，之后请勿删除或移动。

### 从源码构建

```bash
git clone https://github.com/YOUR_USER/markdang.git
cd markdang
npm install --legacy-peer-deps
npm run build        # 输出到 extension/
```

然后按上述步骤加载 `extension/` 文件夹。

## 使用

打开任意受支持的文件即自动渲染。本地文件夹 URL（如 `file:///D:/docs/`）渲染为文件浏览页。

侧栏 tab：

| Tab | 功能 |
| --- | --- |
| 目录 | 当前目录下全部 Markdown 文件，点击切换；支持搜索、排序、文件夹置顶、隐藏文件 |
| 大纲 | 文档标题折叠浏览；齿轮菜单可全部展开/折叠；支持筛选 |

右上角操作按钮：

| 按钮 | 功能 |
| --- | --- |
| 侧栏图标 | 收起 / 展开侧栏 |
| `</>` | 切换原始内容视图（侧栏隐藏，按钮保留） |
| 太阳 | 浅色 / 深色切换（Auto 在设置页选择） |
| 打印机 | 按阅读优化样式打印 |
| 四角 | 全屏 |
| 向上箭头 | 返回顶部（滚动后出现） |

快捷键（可在 `chrome://extensions/shortcuts` 修改）：

| 快捷键 | 功能 |
| --- | --- |
| `Alt+Shift+B` | 收起 / 展开侧栏 |
| `Alt+Shift+C` | 切换内容居中 |
| `Alt+Shift+R` | 切换自动刷新 |
| `Alt+Shift+T` | 切换主题 |
| `Esc` | 退出禅模式 / 关闭菜单 |

## 设置

完整参数与默认值见 [docs/settings.md](docs/settings.md)。每个选项在 [`demo/full-feature-test.md`](demo/full-feature-test.md) 中都有对应的可观测示例——打开该文件并开关对应设置即可看到效果。

## 测试

三套测试通过 playwright-core 驱动真实浏览器（Edge）加载扩展运行，发布前必须全部通过：

```bash
node scripts/e2e.mjs           # 44 项 —— 功能与数据流断言（含 Mermaid 懒加载）
node scripts/test-ux.mjs       # 21 项 —— 交互路径（点击、菜单、主题）
node scripts/test-options.mjs  # 22 项 —— 每个选项的可观测效果
```

开发环境搭建见 [docs/development.md](docs/development.md)。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 构建 | Vite 5，三段式构建（页面 ES 模块 + 内容脚本/Service Worker 单文件 IIFE） |
| 语言 | TypeScript 严格模式 |
| 设置界面 | Preact 10 |
| Markdown | markdown-it 14 + 15 个插件，另含自研 TOC/警告框/FrontMatter/裸公式扩展 |
| 图表 | Mermaid 11（从扩展包内懒加载）、PlantUML 服务器渲染（可选开启） |
| 代码高亮 | highlight.js 11，浅/深双配色 |
| 数学 | KaTeX，样式与字体内联进内容脚本包 |
| 字体排版 | Manrope（可变字重）与 Source Code Pro，经 `@font-face` 本地内置 |
| 测试 | playwright-core + 真实浏览器，三套断言套件 |

实现细节见 [docs/architecture.md](docs/architecture.md)：内容脚本与 MV3 Service Worker 打包为单文件 IIFE（不允许 `import` 语句）；构建后转义非字符码点（Chromium 会以「非 UTF-8」拒绝加载）；Mermaid 包随扩展分发，仅当文档含图表时才动态加载。

## 项目结构

```
├── src/
│   ├── shared/       # 设置 schema + IPC
│   ├── background/   # Service Worker：隐藏标签页目录/文档探测、快捷键
│   ├── content/      # 阅读器：markdown 管线、侧栏、目录视图、样式
│   ├── options/      # 设置页（Preact）
│   └── popup/        # 弹窗（复用设置组件）
├── demo/             # full-feature-test.md —— 所有选项的实时示例
├── docs/             # 设置参考、开发指南、架构说明、截图
├── scripts/          # 构建、三套测试、截图、打包
└── public/           # manifest、图标、品牌资产、字体
```

## 许可证

代码以 [PolyForm Noncommercial License 1.0.0](LICENSE) 授权：个人与非商业用途下可自由使用、学习、修改、Fork 与再发布；商业用途需单独授权。本项目为 source-available 软件，不是 OSI 定义的开源软件。

MarkDang / 码刻档 的名称、Logo、图标与视觉识别不随代码许可证授权，保留全部权利；Fork 必须更换品牌。见 [TRADEMARKS.md](TRADEMARKS.md) 与 [NOTICE](NOTICE)。
