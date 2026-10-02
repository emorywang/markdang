# 设置参考

[English](settings.md) · [README](../README.zh-CN.md)

设置仅保存在当前浏览器配置的本地扩展存储中，并同步应用到已打开的阅读器标签页。界面支持简体中文和英文，默认自动跟随浏览器。演示文档展示常见语法和阅读选项；自动化测试还覆盖刷新、权限、设置保存和页面生命周期。

## 阅读与外观

| 存储键 | 默认值 | 说明 |
| --- | --- | --- |
| `enable` | `true` | 总开关。切换后，符合条件的文档页会重载，以启动阅读器或恢复浏览器的原始内容 |
| `language` | `auto` | `auto`、`zh-CN`、`en`。自动模式读取浏览器的界面语言：中文环境显示简体中文，其余环境显示英文。手动选择优先；已打开的设置、弹窗及阅读器立即更新，文档正文不会重新渲染 |
| `enableFolderUrl` | `true` | 将本地目录列表转换为文件浏览视图 |
| `enableTxtExt` | `true` | 将 `.txt` 文件作为 Markdown 阅读 |
| `refresh` | `false` | 定期读取当前文档。本地文件通过临时非活动标签页探测 |
| `refreshInterval` | `0.5` | 刷新间隔，单位为秒；有效范围 0.5–600 |
| `pageTheme` | `auto` | `light`（浅色）、`dark`（深色）、`auto`（跟随系统） |
| `codeBlockDayTheme` | `light` | 浅色页面上的代码配色，可选 `light`、`dark` |
| `codeBlockNightTheme` | `dark` | 深色页面上的代码配色，可选 `light`、`dark` |
| `textSize` | `Medium` | Tiny 12、Small 14、Normal 16、Medium 18、Large 20、Extra Large 24 px；只调整正文，侧栏使用独立字号 |
| `textFont` | `Default` | 默认、系统、衬线、等宽；存储值分别为 `Default`、`System`、`Serif`、`Monospace` |
| `centered` | `true` | 将正文居中显示 |
| `enableCustomContentWidth` | `false` | 使用自定义最大宽度；关闭时为 1000 px |
| `customContentData` | `{unit: 'px', maxWidth: 1000, maxPercent: 50}` | `px` 范围 500–3000；`%` 范围 10–100，按阅读区域宽度计算 |
| `codeWrap` | `false` | 自动折行显示较长代码 |
| `zenMode` | `false` | 隐藏侧栏和常规控件，保留退出按钮；也可按 Esc 退出 |
| `enableCustomCSS` | `false` | 启用已保存的自定义样式 |
| `customCSS` | `''` | 点击「应用 CSS」后保存；「取消」恢复已保存的内容。样式中的外部资源可能产生网络请求 |
| `isOutlineExpandable` | `true` | 显示标题折叠控件；关闭后展示折叠的标题 |
| `sideCollapsed` | `false` | 记忆侧栏是否收起 |

本地文件访问是浏览器权限，不属于上述设置。设置页显示权限状态，并提供扩展详情入口。读取本地文档或目录前，需手动开启「允许访问文件网址」。

## 插件

`mdPlugins` 保存已开启的插件名称。下列插件默认全部开启，**PlantUML 除外**。「本地渲染插件」总开关不改变 PlantUML 的独立选择。

| 插件 | `mdPluginOptions` 中的选项及行为 |
| --- | --- |
| `Breaks` | 将软换行转换为 `<br>`；关闭后使用标准 Markdown 的软换行行为 |
| `Linkify` | `fuzzyLink: false`、`fuzzyIP: false`、`fuzzyEmail: true`，分别控制省略协议的域名、IP、邮箱识别；显式 URL 始终可识别。邮箱与相邻中文之间应留空白 |
| `Typographer` | 排版字符替换，例如 `(c)` → ©、`(TM)` → ™ |
| `Emoji` | 表情短代码，例如 `:smile:` |
| `Sup`、`Sub` | 上标 `^文字^`、下标 `~文字~` |
| `TOC` | `includeLevel: [1,2]`、`containerClass: 'table-of-contents'`、`markerPattern: '/^\\[\\[toc\\]\\]/im'`、`omitTag: '<!-- omit from toc -->'`、`listType: 'ul'`。支持正则字符串或 `/pattern/flags`；无效正则回退到默认标记。忽略注释可放在标题之前或标题文字之后 |
| `Ins`、`Mark` | 插入 `++文字++`、标记 `==文字==` |
| `Katex` | `enableBareBlocks`、`enableMathBlockInHtml`、`enableMathInlineInHtml`、`enableFencedBlocks`、`throwOnError` 默认均为 `false`；`errorColor: '#cc0000'`。支持 `$...$`、`$$...$$` 及开启的额外语法；错误时保留源码，标准公式解析路径在 `throwOnError` 开启时还会记录错误 |
| `Mermaid` | `theme: 'auto'`，还可选择 `default`、`dark`、`neutral`、`forest`；`json` 默认 `{"theme":"auto","startOnLoad":false}`。主题选择器优先，无效 JSON 对象使用默认值。严格安全、文本长度限制、禁止脚本交互和 HTML 标签由阅读器固定控制 |
| `PlantUML` | 默认关闭。将图表源码编码后，通过 SVG 图片请求发送至 **www.plantuml.com**；当前没有自定义服务器选项 |
| `Abbr`、`Deflist`、`Footnote` | 缩写、释义列表和 `[^name]` 脚注 |
| `FrontMatter` | `showMetadata: false`。识别文档开头的 YAML 风格 `---` / `---` 或 `...` 块；只将单行 `key: value` 项显示为表格，不是完整 YAML 解析器。关闭插件后按普通 Markdown 渲染原文 |
| `MultimdTable` | `rowspan`（`^^` 跨行合并）、`multiline`（行尾反斜线延续单元格）、`headerless`（无表头）、`multibody`（空行分隔表体）、`autolabel`（表格标题锚点）默认均为 `false` |
| `TaskLists` | `enabled`、`label`、`labelAfter` 默认均为 `false`。分别允许勾选、用标签包裹任务文字、将文字显示在复选框前；界面开启 `labelAfter` 时会同时启用 `label`。勾选仅改变显示，不写回文件 |
| `Alert` | `alertNames: ['important','note','tip','warning','caution']`，另可选 `info`、`danger`；`deep: false`。`infoContainer`、`tipContainer`、`successContainer`、`warningContainer`、`dangerContainer` 默认均为 `true`，控制对应的 `::: name` 容器 |

## 侧栏

大纲和文件筛选在本地完成。搜索大纲时，即使匹配项位于已折叠章节中，也会显示。目录可按名称，以及浏览器提供的文件大小、修改日期排序；文件夹置顶与点文件显示相互独立。目录筛选和排序只在当前页面有效，侧栏是否收起会持久保存。

阅读器侧栏使用 15 px 基础字号，大纲文字为 15 px；独立设置页的左侧菜单为 15 px，弹窗菜单为 14 px。

文件面板显示受支持的 Markdown 扩展名和子目录，不显示 `.txt` 文件。网页目录需提供可读取的 HTML 索引。浏览器目录列表无法辨认仅设置了系统隐藏属性、但名称不以点开头的文件。

## 兼容性

`charsetCompat`、`charset`、`maxOutlineExpandLevel`、`skipGuide` 是早期保存的占位键，保留读取兼容性，不控制当前行为。未实现的字符集选择器已移除；源文件应使用 UTF-8。旧的 `mode: 'zen'` 仍被识别为禅模式，界面使用 `zenMode`。

`language` 现已实际控制界面。旧的 `zh-*`、`zh_*` 值归一化为 `zh-CN`，`en-*`、`en_*` 归一化为 `en`，不支持的值归一化为 `auto`。恢复默认设置会回到自动模式。浏览器管理的扩展简介和快捷键说明独立跟随浏览器语言，不受手动界面语言影响。
