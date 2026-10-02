# 设置参考 / Settings Reference

完整设置项、默认值与效果说明。
All settings with defaults and their effects.
Live examples: [demo/full-feature-test.md](../demo/full-feature-test.md).

## 通用 / General

| 选项 Option | 默认 Default | 说明 Description |
| --- | --- | --- |
| 启用 `enable` | `true` | 开启 MarkDang。关闭后所有页面恢复原始状态 / master switch |
| 本地文件访问 — | — | 只读状态项，跳转扩展详情开启「允许访问文件网址」/ guide to the browser permission |
| 换行风格 `mdPlugins: Breaks` | `true` | 开启时软换行渲染为 `<br>`；关闭时遵循 CommonMark 合并为一行 |
| 开启大纲折叠 `isOutlineExpandable` | `true` | 大纲标题显示 ▸ 折叠箭头，可折叠章节 |
| 渲染文件夹路径 `enableFolderUrl` | `true` | 打开本地文件夹时渲染为文件浏览页 |
| 将 .txt 文件视为 Markdown 渲染 `enableTxtExt` | `true` | 关闭后 `.txt` 显示原始文本 |
| 自动刷新文档 `refresh` | `false` | 轮询文档源并热更新（http 页面直接抓取；本地文件经后台探测） |
| 自动刷新间隔 `refreshInterval` | `0.5` 秒 | 范围 0.5–600 秒 |
| 字符集兼容模式 `charsetCompat` | `false` | 预留：大型本地文件的字符集处理 |
| 语言 `language` | 跟随浏览器 | 设置存储语言（阅读器提示文案） |
| 恢复默认设置 — | — | 一键重置全部设置为默认值 |

## 外观 / Appearance

| 选项 Option | 默认 Default | 说明 Description |
| --- | --- | --- |
| 字体大小 `textSize` | `Medium` (18px) | 六档：Tiny 12 / Small 14 / Normal 16 / Medium 18 / Large 20 / Extra Large 24 |
| 字体 `textFont` | `Default` | Default / System / Serif / Monospace 字体栈 |
| 主题 `pageTheme` | `auto` | 浅色 / 深色 / 跟随系统 |
| 浅色模式代码块主题 `codeBlockDayTheme` | `light` | 浅色页面时高亮配色：light（浅底深字）或 dark（深底浅字） |
| 深色模式代码块主题 `codeBlockNightTheme` | `dark` | 深色页面时同上。背景+文字+语法配色整体切换，对未高亮代码同样生效 |
| 代码自动换行 `codeWrap` | `false` | 开启后代码行折行；关闭时横向滚动 |
| 禅模式 `zenMode` | `false` | 隐藏侧栏与全部按钮；`Esc` 或右上角按钮退出 |
| 内容居中 `centered` | `true` | 居中阅读布局 |
| 自定义内容最大宽度 `enableCustomContentWidth` + `customContentData` | 关闭 · `1000px` | 单位 px（500–3000）或 %（10–100） |
| 自定义 CSS `enableCustomCSS` + `customCSS` | 关闭 | 「应用 CSS」后注入页面，可覆盖主题样式 |

## 插件 / Plugins

总开关「所有插件」一键全开/全关。带 ⚙ 的插件有细分选项 / plugins with ⚙ have fine-grained options:

| 插件 Plugin | 默认 Default | 细分选项 Options |
| --- | --- | --- |
| 换行风格 `Breaks` | 开 | — |
| 自动识别链接 `Linkify` | 开 | ⚙ 模糊链接 `fuzzyLink`(关) · 模糊 IP `fuzzyIP`(关) · 模糊邮箱 `fuzzyEmail`(开)。注意：邮箱与中文字符间需留空格（linkify-it 上游行为） |
| 排版字符替换 `Typographer` | 开 | — |
| 表情 `Emoji` | 开 | — |
| 上标 `Sup` / 下标 `Sub` | 开 | — |
| 目录 `TOC` | 开 | ⚙ 标题层级 `includeLevel`([1,2]) · 容器 CSS 类 `containerClass`(table-of-contents) · 匹配正则 `markerPattern`(`/^\[\[toc\]\]/im`) · 忽略标签 `omitTag` · 列表类型 `listType`(ul/ol) |
| 插入 `Ins` / 标记 `Mark` | 开 | — |
| 数学公式 `Katex` | 开 | ⚙ 启用裸数学公式 `\begin{..}` 块 · 启用围栏数学公式 ```` ```math ```` · 渲染 HTML 中的行内/块公式 · 显示错误 · 错误颜色 |
| Mermaid 图表 `Mermaid` | 开 | ⚙ 主题（auto/default/dark/neutral/forest，auto 跟随页面深浅） · `mermaid.initialize` JSON 配置 |
| PlantUML 图表 `PlantUML` | **关** | 需网络：将图表源码发送到 PlantUML 官方服务器渲染为 SVG |
| 缩写 `Abbr` / 释义 `Deflist` / 脚注 `Footnote` | 开 | — |
| 元数据 `FrontMatter` | 开 | ⚙ 显示元数据（将 `--- title: .. ---` 渲染为表格） |
| 表格扩展语法 `MultimdTable` | 开 | ⚙ 跨行合并（`^^` 与上行合并）· 跨行单元格换行（行尾 `\`）· 无表头模式 · 多级表体（空行分隔）· 自动生成标题标签（`[标签]` 行 → caption id） |
| 复选框 `TaskLists` | 开 | ⚙ 允许勾选（复选框可点击）· 将任务项渲染在标签内（文字包 `<label>`）· 将文字显示在复选框之前 |
| 警告框 `Alert` | 开 | ⚙ Alert 类型（note/important/tip/warning/caution/info/danger，GitHub `[!X]` 引用语法）· 嵌套 Alert · 五种命名容器 `::: info/tip/success/warning/danger` |

## 阅读器行为 / Reader behavior

| 设置 Setting | 说明 Description |
| --- | --- |
| 侧边栏折叠 `sideCollapsed` | 记忆侧栏状态；原始内容视图下侧栏自动隐藏 |
| 大纲筛选 / 文件搜索 | 搜索图标切换输入框，客户端即时过滤 |
| 目录排序 | 名称 / 大小 / 修改日期，升降序，文件夹置顶，显示隐藏文件（本地目录） |
| 自动刷新间隔 | http 页面直接抓取源；本地文件通过后台隐藏标签页探测 |

> 存储键名自 v1.0.0 起保持稳定，升级时设置与默认值前向合并，不会丢失。
> Storage keys are stable since v1.0.0; upgrades forward-merge settings with defaults.
