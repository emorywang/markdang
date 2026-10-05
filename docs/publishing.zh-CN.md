# 合并、Release 与 Chrome 商店上架

[English](publishing.md) · [README](../README.zh-CN.md) · [商店填写文案](store-listing.zh-CN.md) · [来源核查](provenance.zh-CN.md)

适用于当前 1.0.1，核对日期为 2026-10-05。CI 负责检查、构建和打包；合并不会自动创建 Release，也不会自动提交商店。开发者账号已注册后，按下面顺序操作即可。

## 1. 合并已验证的 PR

1. 打开当前[待合并的 PR](https://github.com/emorywang/markdang/pulls)，确认最新提交的 Build 检查通过。
2. 点击合并按钮。下拉菜单中可选择 **Squash and merge**，将这次完整改良合并成一个提交；普通 **Merge pull request** 也可以。
3. 确认合并，进入 [Actions](https://github.com/emorywang/markdang/actions/workflows/build.yml)，等这次 **main** 构建通过。

正式发布包应来自合并后的 main 构建。已有商店条目时，在原条目中更新版本，保留扩展 ID、用户设置和更新通道。

## 2. 下载真正的扩展 ZIP

在成功的 main 构建页面底部，下载 **markdang-…** artifact。先解压下载文件，取出里面的 `markdang-v1.0.1.zip`。这个内层 ZIP 才是 Release 和商店使用的扩展包。

内层 ZIP 第一层应直接包含 `manifest.json`、`assets/`、`icons/`、`_locales/` 和许可文件。不要上传外层 artifact ZIP，也不要上传 GitHub 自动提供的 Source code ZIP。

最初的 1.0.0 上架资料包仍提供可复用的品牌素材和填写文案，其中的扩展 ZIP 是旧版本。发布时使用当前 main 的 CI 包，同时检查截图和文案是否需要更新。

需要自行构建时，使用 Node.js 22.12+，推荐 24 LTS，在仓库运行：

```bash
npm ci
npm run check
npx playwright-core install chromium
npm run test:e2e
node scripts/zip.mjs
```

输出为 `dist/markdang-v1.0.1.zip`。Linux 浏览器安装可能需要 `npx playwright-core install --with-deps chromium`。平时只想重新构建并打包，运行 `npm run zip`。

## 3. 创建 GitHub Release

1. 打开 [Releases](https://github.com/emorywang/markdang/releases)，选择 **Draft a new release**。
2. 新建标签 **v1.0.1**，Target 选择合并后的 **main**。标签若已存在，先核对提交，不覆盖已发布标签。
3. 标题填写 **MarkDang v1.0.1**，根据当前中英文更新日志填写 Release notes。
4. 在附件区上传内层 `markdang-v1.0.1.zip`。如附校验文件，必须根据实际上传的包计算，不能沿用另一个构建的校验值。
5. 点击 **Publish release**。正式稳定版无需勾选 pre-release。

Windows PowerShell 计算 SHA-256：

```powershell
Get-FileHash .\markdang-v1.0.1.zip -Algorithm SHA256
```

macOS/Linux 可运行 `shasum -a 256 markdang-v1.0.1.zip`。用户可下载 Release ZIP，解压后通过“加载已解压的扩展程序”安装；ZIP 本身不能像安装程序一样双击安装。

## 4. 在 Chrome 商店建立条目

已有 Chrome 商店条目时，打开原条目并上传新包，不再创建新条目。下列步骤适用于首次提交。

1. 用已注册的账号打开 [Developer Dashboard](https://chrome.google.com/webstore/devconsole)。核实联系邮箱，完成账号要求的两步验证和身份资料。
2. 选择 **Add new item / 新增项目**，上传内层扩展 ZIP。记下新生成的 MarkDang 扩展 ID。
3. 在 **Package** 中核对产品名 MarkDang、版本 1.0.1 和 Manifest V3。
4. 进入 **Store listing / 商店详情**，建议分类选 **Tools / 工具**，默认语言选 English。
5. 英文页粘贴英文详细说明，上传 `screenshots/en/` 的 5 张图。简体中文页使用中文版说明和 `screenshots/zh-CN/`。
6. 包内还有 `zh_TW` 安装元数据。如果后台出现繁体中文项，使用资料包附带的繁体商店说明和中文截图；阅读界面仍明确说明只有英文与简体中文。
7. 上传图标及宣传图，填写项目主页和支持地址，保存。

名称和简短说明来自 `manifest.json` 及 `_locales`，详细说明在后台填写。发布者名称、联系邮箱与法定身份使用你自己的真实资料；免费扩展和自愿打赏不能自动决定后台的 trader 身份选项。

| 后台位置 | 资料包文件 | 规格 |
| --- | --- | --- |
| Store icon | `images/icon-128.png` | 128 × 128 PNG，透明边距 |
| Small promo tile | `images/promo-440x280.png` | 440 × 280 RGB PNG，必需 |
| Marquee promo tile | `images/promo-1400x560.png` | 1400 × 560 RGB PNG，可选 |
| Localized screenshots | `screenshots/en/`、`screenshots/zh-CN/` | 每种语言 5 张，1280 × 800 RGB PNG |
| Detailed description | `listing/description-en.txt`、`description-zh-CN.txt` | 可直接粘贴 |
| Test instructions | `listing/reviewer-instructions-en.txt` | 无需测试账号 |

宣传图为所有语言共用，截图可以按语言上传，视频可留空。Homepage 填 `https://github.com/emorywang/markdang`，Support 填 `https://github.com/emorywang/markdang/issues`。**Official URL** 用于已验证归属的网站，没有时留空，不把 GitHub 域名当成自己拥有的域名。

## 5. 准确填写隐私与权限

进入 **Privacy practices / 隐私权做法**，对照[填写文案](store-listing.zh-CN.md)，使用英文版本供审核阅读。

- **Single purpose**：在浏览器中阅读和渲染 Markdown 文档；大纲、目录、公式、图表和外观设置均服务于此。
- **storage**：只在 `chrome.storage.local` 保存偏好和自定义 CSS，不使用 Chrome Sync。
- **页面访问范围**：解释文档后缀、`file:///*`、当前文档/父目录读取和可选刷新。没有单独的 `host_permissions` 字段，也必须披露内容脚本的页面访问。
- **Remote code**：选择 **No**。执行用 JavaScript 随包分发，Mermaid 从扩展自身加载；PlantUML 图片、文档数据、图片和 CSS 不等于远程 JavaScript。
- **Data usage**：按当前处理范围选择 **Website content / 网站内容** 和 **Web history / 网络浏览记录**。前者包含文档文本和图表；后者限定当前文档及相关目录、资源的 URL。扩展不记录浏览历史，不申请 `history` 权限。
- **用途声明**：不出售数据、不用于无关用途、不用于信用或借贷评估。核对后台对应的三项声明后勾选。
- **Privacy policy URL**：`https://github.com/emorywang/markdang/blob/main/PRIVACY.md`。先合并，再用无痕窗口确认公开可读且说明当前版本。

本地处理也需要披露。不要因为没有遥测就声明完全不处理数据。当前版本不定向收集身份、健康、财务、认证、位置或行为跟踪信息，不为不存在的能力额外勾选。

PlantUML 默认关闭，用户开启后才会把图表源码通过 HTTPS 发给 `www.plantuml.com`，压缩编码不是加密。远程文档、图片和自定义 CSS 也可能请求其主机；界面、商店说明和隐私声明须保持一致。

## 6. 提交审核并发布

1. 在 **Test instructions** 粘贴英文审核指引。扩展无需账号、付款或授权码。
2. 在 **Distribution** 选择 **Public**，地区按实际计划选择。Unlisted 和 Private 也需要审核，不必额外建立测试条目。
3. 保存各栏目，处理后台指出的必填项，选择 **Submit for review**。
4. 建议取消“审核通过后自动发布”。通过后核对详情，再点击 **Publish**；延后发布需在审核通过后 30 天内完成。
5. 上线后用商店安装版确认本地权限、阅读、语言、主题和支持链接，再将商店安装链接加入两份 README。

商店版和本地加载版可能有不同 ID，设置不会自动迁移。验证商店版时先停用旧的本地版本。

## 后续更新

继续更新同一个商店条目。同步递增 `package.json`、锁文件和 `manifest.json` 的版本，`version_name` 与之对应；完成检查后上传新 ZIP，例如 1.0.1，并建立对应新 Release。保留旧的已发布 tag 和附件。

## 官方资料

- [提交与延后发布](https://developer.chrome.com/docs/webstore/publish)
- [图片要求](https://developer.chrome.com/docs/webstore/images)
- [商店详情及本地化](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [分类说明](https://developer.chrome.com/docs/webstore/best-practices#choose_your_extensions_category_well)
- [本地数据处理及隐私](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [远程执行代码](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [Edge 提交与可选审核说明](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- [Edge 版本更新](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/update-extension)
- [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

后台字段可能调整，以当前页面的必填项为准。本指南不替代商店审核。
