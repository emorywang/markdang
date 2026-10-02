# 发布与上架清单

[English](publishing.md) · [README](../README.zh-CN.md)

仓库可以生成扩展 ZIP，当前不自动发布到浏览器商店。

1. 按[发布检查清单](development.zh-CN.md#发布检查清单)构建，在新浏览器配置中测试解压后的 ZIP。根目录必须直接包含 `manifest.json`。
2. 注册 Chrome Web Store 开发者账号，为相关账号启用两步验证，并核实联系信息。开发者账号及发布者身份与扩展产品名称是两个概念。
3. 明确单一用途：在浏览器中阅读和渲染 Markdown。准确说明 `storage`、内容脚本 URL 范围、本地文件访问、目录探测和可选刷新；不能因没有 `host_permissions` 就声称没有页面访问权限。
4. 提供公开的隐私声明 URL，例如仓库中的[中文声明](https://github.com/emorywang/markdang/blob/main/PRIVACY.zh-CN.md)或[英文声明](https://github.com/emorywang/markdang/blob/main/PRIVACY.md)，并确认商店接受该形式。披露用户主动开启的 PlantUML 及远程文档资源，不声称所有使用都完全离线。
5. 确认执行逻辑随包分发，检查最终 ZIP 是否含有远程 JavaScript、开发代码、版本不一致或缺少许可声明。
6. 按当前后台要求准备图标、截图、宣传素材、中英文说明和审核操作指引。展示本地权限设置及以纯文本提供的网页文档；说明 MDX 只按 Markdown 阅读，不执行 JSX。确认中英文界面、关于页及支持链接正确；打赏不是功能解锁条件。
7. 可先进行私密或不公开列表的安装测试；这些可见性选项同样需要政策审核。
8. 今后接入自动发布时，重新核对 Chrome Web Store API 和认证文档，不直接沿用旧示例。

提交前重新核对官方资料：

- [注册开发者账号](https://developer.chrome.com/docs/webstore/register)
- [准备扩展](https://developer.chrome.com/docs/webstore/prepare)
- [隐私声明要求](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [用户数据常见问题](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [最小权限原则](https://developer.chrome.com/docs/webstore/program-policies/permissions)
- [Manifest V3 要求](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
