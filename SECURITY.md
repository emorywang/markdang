# 安全策略 / Security Policy

## 支持版本 / Supported versions

| 版本 Version | 支持 Support |
| --- | --- |
| 1.0.x | 是 |

## 报告漏洞 / Reporting a vulnerability

**请勿使用公开 Issue 报告安全漏洞。**
请使用 GitHub 的「Private vulnerability reporting」私下报告，通常 72 小时内回应。

Do **not** open public issues for security vulnerabilities — use GitHub's
Private vulnerability reporting instead.

## 攻击面说明 / Attack surface notes

- 扩展不运行远程代码；manifest CSP 为默认严格策略
- Mermaid `securityLevel: loose` 仅影响 `mermaid` 代码块内的图定义渲染
  （与官方 Mermaid 在网页中嵌入的行为一致）
- PlantUML 插件（默认关闭）会把图表源码发送到你配置的服务器
