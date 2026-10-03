# Chrome 商店填写文案

[English](store-listing.md) · [上架步骤](publishing.zh-CN.md)

将对应段落填入后台同名字段，适用于 1.0.0。名称与简短说明来自扩展包，单独修改本文不会修改安装元数据。权限与审核说明建议使用英文版本提交。

## 名称

MarkDang

## 简短说明

码刻档 —— 在浏览器中舒适阅读 Markdown。无账号、无订阅、无遥测。

## 详细说明

MarkDang（码刻档）在 Chrome 中把 Markdown 文件呈现为便于阅读的页面，提供大纲、代码高亮、公式和图表。

我做这个工具，是为了在浏览器里直接阅读项目文档和笔记。打开本地文件或原始 Markdown 链接，就能按大纲浏览章节，不必切换到编辑器。

主要功能：

- 阅读 .md、.markdown、.mdx 和 .mkd 文件，可另行开启 .txt 支持。
- 浅色、深色及跟随系统主题，可调整字体、正文宽度和自定义 CSS。
- 表格、任务列表、提示块、脚注、KaTeX 公式和 Mermaid 图表。
- 文档大纲，以及本地目录或带目录索引的网页文件夹浏览。
- 原始源码视图、禅模式、打印样式、代码复制、图片缩放和可选自动刷新。
- 英文与简体中文界面，可跟随浏览器语言，也可手动选择。

阅读本地文件前，请在 Chrome 扩展详情中开启“允许访问文件网址”。网页文档需要支持的文件后缀，并以纯文本或 Markdown 提供。MDX 只按 Markdown 显示，不执行 JSX、导入语句或 JavaScript。勾选任务只改变当前显示，不修改原始文件。

无账号、无订阅、无广告、无遥测。渲染组件与字体随扩展分发，偏好保存在本地浏览器配置中。网页文档、远程图片和自定义 CSS 仍可能请求其主机。PlantUML 默认关闭；主动开启后，图表源码会发送给 www.plantuml.com 渲染。

代码按 PolyForm Noncommercial 1.0.0 提供，个人与非商业用途可依照许可证使用，商业用途需单独授权。打赏完全自愿，不是功能解锁条件。

项目与文档：https://github.com/emorywang/markdang
问题反馈：https://github.com/emorywang/markdang/issues

## 单一用途说明

在浏览器中阅读和渲染 Markdown 文档。大纲、文件浏览、代码高亮、公式、图表、主题及刷新选项均服务于文档阅读。

## storage 权限说明

storage 用于在 chrome.storage.local 保存阅读偏好、插件选项、界面语言和用户 CSS。设置留在本地浏览器配置中，不使用 Chrome Sync，不持久保存文档内容，不将偏好发送给开发者。

## 页面访问范围说明

内容脚本识别 HTTP(S) 网站和本地文件网址中支持的 Markdown，以及可选纯文本文件。文档可能位于任意域名，无法预先列出所有主机；普通 HTML 网页不转换。本地访问也用于 Chrome 目录列表，需要用户另行开启“允许访问文件网址”。扩展读取当前文档，使用文件浏览时读取其父目录索引。本地刷新和目录读取可能短暂打开仅针对这些资源的后台标签，读取后关闭。不枚举无关标签，不记录浏览历史。manifest 没有单独的 host_permissions 字段，文档页面访问来自内容脚本的匹配规则。

## 远程代码

选择 No, I am not using remote code。

全部执行用 JavaScript 随包分发，Mermaid 按需从扩展自身网址加载。不从远程服务器下载或执行 JavaScript 或 WebAssembly。PlantUML 从 www.plantuml.com 返回图像，不是远程执行代码；文档图片和用户 CSS 可请求外部资源，但不引入远程 JavaScript。

## 数据使用

按当前处理范围选择 Website content（网站内容）和 Web history（网络浏览记录），包括本地处理。

网站内容：文档文本及其代码、公式、图表和目录条目用于显示文档。只有用户开启默认关闭的 PlantUML，才会把相应图表源码发送给 www.plantuml.com。

网络浏览记录：仅使用当前文档及相关目录、资源的 URL，用于渲染、相对链接、目录浏览和可选刷新。不记录历史、不监控无关浏览、不申请 history 权限。

不定向收集身份、健康、财务、认证、位置或行为跟踪信息；不出售数据、不用于阅读之外的用途、不用于信用或借贷评估。核对并确认后台的三项用途声明。

## 隐私声明网址

https://github.com/emorywang/markdang/blob/main/PRIVACY.md

中文版：https://github.com/emorywang/markdang/blob/main/PRIVACY.zh-CN.md。合并后确认两个 main 链接公开可读。

## 审核操作说明

无需账号、付款、授权码或测试凭据。界面支持英文和简体中文，自动模式将中文浏览器语言映射为简体中文，其余语言显示英文。

1. 安装后打开纯文本文档 https://raw.githubusercontent.com/emorywang/markdang/main/demo/review-sample.md，确认标题、代码、表格、公式和 Mermaid 图表。
2. 用大纲切换章节，切换浅深色主题，查看源码，尝试打印或禅模式；Esc 可退出禅模式。
3. 从弹窗进入完整设置，在“常规”中切换界面语言，确认设置和已打开阅读页更新；检查关于页支持链接。
4. 将示例保存为 review-sample.md，在 chrome://extensions 的 MarkDang 详情中开启“允许访问文件网址”，将文件拖入 Chrome。同目录放另一个 .md 文件，通过文件夹标签浏览。
5. 在“插件”开启任务列表，重新加载示例，检查复选框。勾选仅改变页面，刷新后恢复。
6. 自动刷新默认关闭，开启后编辑并保存本地文件，确认更新。后台探测标签可能短暂打开，读取后关闭。
7. PlantUML 默认关闭，与本地插件批量开关分开，设置中披露会发送图表源码给 www.plantuml.com。主要阅读测试无需开启，不用机密源码测试外部服务。

扩展没有遥测和开发者运营的文档后端。远程文档/图片请求和可选 PlantUML 已在隐私声明披露。MDX 不执行 JSX 或 JavaScript，普通 HTML 网页不自动转换。

## 其他字段

| 字段 | 填写 |
| --- | --- |
| 建议分类 | Tools / 工具 |
| Homepage | https://github.com/emorywang/markdang |
| Support | https://github.com/emorywang/markdang/issues |
| Official URL | 没有已验证归属的网站时留空 |
| Distribution | Public；实际分发地区 |
| 测试账号 | 无 |
| Mature content | 不勾选；产品不提供成人内容 |
| 宣传视频 | 可选 |
