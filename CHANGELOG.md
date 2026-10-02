# 更新日志 / Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式。

## [Unreleased]

### Fixed

- Refresh local files without returning cached source; identify probe tabs explicitly and clear completed probe timers.
- Serialize settings writes, merge nested preferences, validate stored values, and retain rapid UI changes.
- Sanitize Markdown HTML and Mermaid SVG; enforce Mermaid strict security and escape metadata, attributes, and error messages.
- Generate stable TOC links for repeated, formatted, omitted, and Unicode headings; handle invalid regex without breaking rendering.
- Update Auto theme on system changes, restore original pages when disabled, keep the zen exit button visible, and correct directory sorting.
- Apply KaTeX error options consistently and preserve source when front matter is disabled.

### Changed

- Keep PlantUML separate from the bulk local-plugin switch; show its network disclosure and actual local-file permission status.
- Remove nonfunctional language/character-set controls and duplicate popup CSS.
- Use a supported Vite 7 build, clean output, real build watching, version checks, and release license notices.
- Make browser tests portable and self-contained; add unit and regression suites to CI.
- Correct repository links, setup/ZIP instructions, privacy claims, settings behavior, and contributor guidance.

### Added

- Privacy policy and store-publishing checklist.

## [1.0.0] - 2026-10-01

MarkDang（码刻档）首个公开发布版本。一款独立开发的浏览器 Markdown 阅读器：无账号、无订阅、无遥测，个人与非商业用途免费。

### 品牌 / Branding

- MarkDang / 码刻档 C1 视觉识别：扩展图标、双语横版 logo（浅/深双变体）、favicon
- 阅读器与设置页统一换装 MarkDang 色板（浅/深双主题，深浅色随系统）
- 内置 Manrope（可变字重）与 Source Code Pro 字体，`@font-face` 本地加载
- 工具栏/侧栏图标统一为 24 viewBox · 1.75 描边规格

### 许可 / Licensing

- 代码采用 PolyForm Noncommercial License 1.0.0：个人与非商业用途自由使用/修改/Fork/再发布，商业用途需单独授权（Source Available for Noncommercial Use）
- MarkDang / 码刻档 名称、Logo、图标与品牌视觉不随代码许可证授权；新增 [TRADEMARKS.md](TRADEMARKS.md) 与 [NOTICE](NOTICE) 说明 Fork 更名义务与署名

### 阅读 / Reading

- 浅色 / 深色 / 跟随系统三态主题，代码块独立配色（浅/深模式各自生效）
- 内容居中 + 自定义最大宽度（px/%）、六档字号、四种字体栈、自定义 CSS
- 原始内容视图（侧栏自动隐藏）、禅模式（Esc 退出）、打印样式、全屏、回顶部
- 代码块一键复制、图片点击缩放

### 侧边栏 / Sidebar

- 文件目录 tab：当前目录全部 Markdown 文件、点击切换、搜索、按名称/大小/日期排序、升降序、文件夹置顶、显示隐藏文件
- 大纲 tab：标题折叠箭头、展开全部/折叠全部（齿轮菜单）、实时筛选、父级条目加粗
- 本地文件夹页渲染为文件浏览页

### 插件 / Plugins（19 个，全部免费）

- 换行风格、自动识别链接（模糊链接/IP/邮箱）、排版字符替换、表情、上标、下标
- 目录：标题层级、容器类名、匹配正则、忽略标签、列表类型（真嵌套列表输出）
- 数学公式：行内/块级/裸公式/围栏公式/HTML 内公式、错误颜色
- Mermaid 图表：主题选择 + initialize JSON 配置
- PlantUML 图表：经官方服务器渲染（可选开启）
- 缩写、释义、脚注、元数据（渲染为表格）
- 表格扩展语法：跨行合并（^^）、单元格多行（行尾 \）、无表头、多级表体、标题标签锚点
- 复选框：可交互勾选、标签位置前后可调
- 警告框：GitHub [!NOTE] 风格类型过滤、嵌套、五种命名容器

### 工程 / Engineering

- Vite + TypeScript 严格模式 + Preact 10；内容脚本与 Service Worker 以单文件 IIFE 输出
- 构建后自动转义 U+FFFE/U+FFFF 非字符（Chromium 以「非 UTF-8」拒载）
- file:// 目录/文档访问：后台隐藏标签页代理，目录/文档双通道严格隔离并缓存
- 幂等标题装饰与真嵌套 TOC 列表输出
- 初始三套自动化测试（e2e / 交互路径 / 选项可观测效果）
- KaTeX 样式字体内联；manifest 未单独声明 host_permissions（内容脚本匹配仍授予页面访问）、零 CSS 条目
- Windows zip 路径修复；mermaid 版本锁定；punycode 构建垫片

[1.0.0]: https://github.com/emorywang/markdang/releases/tag/v1.0.0
