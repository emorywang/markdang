# 架构说明 / Architecture

## 总览 / Overview

```
┌────────────────────────── Chrome/Edge ──────────────────────────┐
│                                                                 │
│  ┌── Content Script (IIFE, 每个页面实例) ─────────────────────┐  │
│  │ index.ts     启动分发：md 页 / 目录页 / 隐藏探针页          │  │
│  │ reader.ts    Reader 类：布局、按钮、侧栏、设置响应、轮询    │  │
│  │ markdown.ts  markdown-it 管线（19 插件 + 自研 TOC/告警/…)  │  │
│  │ dir-listing  Chrome 目录页 #tbody 解析                      │  │
│  │ styles.ts    阅读器全部样式（注入 <style>，CSS 变量双主题）  │  │
│  └──────────────┬──────────────────────────────────────────────┘  │
│                 │ chrome.runtime.sendMessage                       │
│  ┌── Service Worker (IIFE) ─────────┐   ┌── Options/Popup (ESM) ┐ │
│  │ listDir   file:// 目录隐藏标签页  │   │ 完整设置组件 (Preact)  │ │
│  │ probeDoc  file:// 文档源码探测    │   │ chrome.storage.local   │ │
│  │ commands  快捷键 → settingsToggle │   └────────────────────────┘ │
│  └───────────────────────────────────┘                              │
│                 chrome.storage.onChanged（设置实时响应）             │
└──────────────────────────────────────────────────────────────────┘
```

## 关键设计 / Key decisions

### 1. 设置即真相 / Settings as the single source of truth

`src/shared/settings.ts` 定义统一的 settings schema 与默认值。
读取时与 `chrome.storage.local` 做**深合并**（前向兼容新键）；
内容脚本监听 `storage.onChanged`，按变更键分类响应：
markdown 相关键 → 重新渲染文档；外观键 → CSS 类/变量切换；模式键 → 卸载 UI 或重载。

### 2. file:// 访问的三通道 / Three channels for file:// access

内容脚本无法 fetch `file:` URL（无论权限），因此后台用**隐藏标签页**做代理：

| 通道 | 发起方 | 流程 |
| --- | --- | --- |
| 目录列表 `listDir` | md 页侧栏 | 后台开隐藏标签页 → 目录页内容脚本上报 `dirEntries` → 关闭标签页，结果缓存 |
| 文档源码 `probeDoc` | 自动刷新 | 后台开隐藏标签页 → `tabs.onUpdated` 完成后发 `getRawDoc` → 内容脚本回报 `<pre>` 原文 → 关闭 |

两类探针**严格隔离**（各自的缓存/等待队列/上报通道），并识别 `document.hidden`
——隐藏页只做应答不上报 UI，目录页仍需先上报条目。HTTP(S) 页面不走后台：
侧栏直接 `fetch` 同源父目录（`DOMParser` + `<base>` 解析锚点），自动刷新直接
`fetch(location.href)`。

### 3. 幂等标题装饰 / Idempotent heading decoration

标题锚点与 id 只在 `decorateHeadings()` 插入一次，且插入前检查是否已存在；
大纲（`renderOutline`）从装饰后的 DOM 重建、永不改写正文——
这杜绝了「反复切换折叠导致标题前 `#` 无限累积」的回归。

### 4. 大纲折叠 / Outline folding

扁平 `li` 列表 + `data-depth`。折叠状态存于 `Set<headId>`；
`syncOutline()` 单趟栈扫描同时完成折叠与筛选：栈中维护当前祖先链的
`(depth, folded)`，每项先按 depth 弹栈再判定「任意折叠祖先 ⇒ 隐藏」，
均摊 O(1)（旧实现逐项回溯兄弟节点，O(n²) 且会误判兄弟子树）。
父级条目加粗（`has-children`），便于快速定位章节。

### 5. 渲染管线 / Markdown pipeline

`createRenderer(settings, dark)` 每次按设置构建独立的 markdown-it 实例：
- 19 个插件按开关装载；带齿轮选项的插件把设置对象直接展开传入
- 渲染层自研扩展：**TOC**（层级/容器类/正则/忽略标签/列表类型，真嵌套列表）、
  **裸公式**（`\begin{env}..\end{env}` 块规则）、**HTML 内公式**（core 阶段替换
  html_block/html_inline 中的 `$..$`/`$$..$$`）、**围栏公式**（```math）、
  **PlantUML**（raw deflate + PlantUML 字母表编码 → 服务器 SVG）
- Mermaid 围栏输出占位元素；阅读器仅在存在占位时按需加载扩展包内的 mermaid 引擎（web_accessible_resources），`initialize` 后逐块渲染，错误可见

### 6. 打包约束 / Bundling constraints

- 内容脚本与 MV3 Service Worker **禁止 `import` 语句** → 三段式构建，
  这两类入口以 `format: 'iife'` + `inlineDynamicImports` 输出单文件
- Chromium 拒绝含 U+FFFE/U+FFFF 的文件（“非 UTF-8”），mermaid 内含裸非字符
  → 构建后 `scripts/build.mjs` 自动转义
- KaTeX 字体经 `?inline` + 高 `assetsInlineLimit` 打进 JS，manifest 零 CSS 条目

### 6b. 首屏防闪烁 / First-paint boot shim

主内容脚本在 `document_end` 注入，晚于浏览器对原始文本的首帧渲染（FOUC）。
解决方案是双内容脚本：

- **`boot.js`（document_start，约 1KB）**：命中 markdown 候选页面（text/plain
  /markdown/x-markdown）时同步注入样式隐藏原始 `<pre>`；250ms 后仍未渲染完
  成才显示居中加载点；4 秒兜底自动恢复原文
- **`content.js`（document_end）**：正常启动；渲染完成或判定不渲染时清理
  boot 痕迹——任何失败路径（禁用、非渲染类型、异常）都会立即恢复原文，
  不会出现永久空白

### 7. 隐私 / Privacy

manifest 无 `host_permissions`；唯一的网络路径是可选开启的 PlantUML
服务器渲染。目录探测、自动刷新均发生在本地文件或当前页面同源。
