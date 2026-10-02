# 安全政策

[English](SECURITY.md) · [README](README.zh-CN.md)

安全修复面向最新发布版本和当前 `main` 分支。

不要在公开 Issue 中发布敏感文档、凭据或漏洞利用细节。请使用 [GitHub 私密漏洞报告](https://github.com/emorywang/markdang/security/advisories/new)。如 GitHub 提示该功能未启用，可发公开 Issue 请求私密联系渠道，**但不要披露漏洞**。项目不承诺固定响应时间。

## 安全边界

- 文档 HTML 插入页面前经 DOMPurify 清理，元数据和生成的属性值会转义；活动嵌入和表单会移除。
- Mermaid 固定使用 `securityLevel: 'strict'` 和安全配置，SVG 也会清理。文档指令及自定义 JSON 不能启用 JavaScript 回调。
- 本地探测校验发起请求及报告结果的标签页。文档只可请求自身或其直接父目录，不能读取任意本地文件。
- 可执行依赖随扩展打包，不加载远程 JavaScript。扩展默认 CSP 提供额外保护，但不能替代对页面 DOM 中文档内容的清理。
- 远程图片、主动开启的 PlantUML、自定义 CSS 的外部资源可能产生网络请求，详见[隐私声明](PRIVACY.zh-CN.md)。
