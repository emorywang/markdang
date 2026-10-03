# Merge, release, and publish to Chrome

[简体中文](publishing.zh-CN.md) · [README](../README.md) · [Store form text](store-listing.md) · [Source review](provenance.md)

For the current 1.0.0 package; checked on 2026-10-03. CI checks, builds, and packages the extension. Merging does not create a Release or submit to a store. These steps assume the publisher account is already registered.

## 1. Merge the checked PR

1. Open [PR #1](https://github.com/emorywang/markdang/pull/1) and confirm Build passed for its latest commit.
2. Merge it. **Squash and merge**, when available, keeps this complete change in one commit; **Merge pull request** also works.
3. Open [Actions](https://github.com/emorywang/markdang/actions/workflows/build.yml) and wait for the new **main** build to pass.

The earlier fixes and publication preparation share one PR. Merge once, then use the package from main.

## 2. Download the extension ZIP

Download the successful main run's **markdang-…** artifact. Extract that download and take out `markdang-v1.0.0.zip`. This inner ZIP is the package for Release attachments and the store.

Its root contains `manifest.json`, `assets/`, `icons/`, `_locales/`, and notices. Do not upload the outer artifact archive or GitHub's automatically generated Source code ZIP.

The kit's `package/markdang-v1.0.0.zip` can be used for inspection and a store draft. Prefer the main CI package after merging for publication. Further source changes may require new screenshots or copy.

To build locally, use Node.js 22.12+ (24 LTS recommended):

```bash
npm ci
npm run check
npx playwright-core install chromium
npm run test:e2e
node scripts/zip.mjs
```

Output: `dist/markdang-v1.0.0.zip`. Linux browser setup may require `npx playwright-core install --with-deps chromium`. For a routine fresh build and ZIP, run `npm run zip`.

## 3. Create a GitHub Release

1. Open [Releases](https://github.com/emorywang/markdang/releases) and choose **Draft a new release**.
2. Create **v1.0.0**, targeting merged **main**. If the tag exists, check its target; do not overwrite a published tag.
3. Use **MarkDang v1.0.0** and the kit's bilingual release notes.
4. Attach the inner extension ZIP. Calculate any accompanying checksum from that exact ZIP, rather than copying another build's checksum.
5. Choose **Publish release**. A stable release does not need the pre-release option.

Use `Get-FileHash .\markdang-v1.0.0.zip -Algorithm SHA256` in PowerShell or `shasum -a 256 markdang-v1.0.0.zip` on macOS/Linux. Users can extract the Release ZIP and load it as an unpacked extension. The ZIP is not a double-click installer.

## 4. Create the store item

1. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) with the registered account. Verify the contact email and complete required two-step verification and identity details.
2. Choose **Add new item**, upload the inner ZIP, and record the new MarkDang item ID.
3. Under **Package**, confirm MarkDang, version 1.0.0, and Manifest V3.
4. In **Store listing**, use **Tools** as the suggested category and English as the default language.
5. Add the English description and five `screenshots/en/` images; add the Simplified Chinese description and `screenshots/zh-CN/` images to that locale.
6. The package also contains `zh_TW` installation metadata. If that locale appears, use the supplied Traditional Chinese listing and Chinese screenshots. State that the reading interface supports English and Simplified Chinese.
7. Upload the icon and promotional images, enter homepage and support URLs, and save.

The package supplies the name and short description through its manifest and locale catalogs. Enter the detailed description in the dashboard. Use the publisher's actual display name, email, and legal identity. Free distribution and optional donations do not determine trader status by themselves.

| Store field | Kit file | Specification |
| --- | --- | --- |
| Store icon | `images/icon-128.png` | 128 × 128 PNG with transparent padding |
| Small promo tile | `images/promo-440x280.png` | 440 × 280 RGB PNG; required |
| Marquee promo tile | `images/promo-1400x560.png` | 1400 × 560 RGB PNG; optional |
| Localized screenshots | `screenshots/en/`, `screenshots/zh-CN/` | Five per locale, 1280 × 800 RGB PNG |
| Detailed description | `listing/description-en.txt`, `description-zh-CN.txt` | Ready to paste |
| Test instructions | `listing/reviewer-instructions-en.txt` | No test account required |

Promotional tiles are shared across locales; screenshots can be localized. Video is optional. Homepage: `https://github.com/emorywang/markdang`; Support: `https://github.com/emorywang/markdang/issues`. **Official URL** is for a site with verified ownership; leave it blank if unavailable. A GitHub homepage is not ownership of the GitHub domain.

## 5. Complete privacy practices

Use the English [store form text](store-listing.md):

- **Single purpose:** read and render Markdown documents. Outlines, file browsing, formulas, diagrams, and appearance settings support that purpose.
- **storage:** save preferences and custom CSS in `chrome.storage.local`, without Chrome Sync.
- **Page access:** explain document suffixes, `file:///*`, current-document/parent-directory reads, and optional refresh. Disclose content-script access even without a separate `host_permissions` field.
- **Remote code:** select **No**. Executable JavaScript is bundled; Mermaid loads from the extension. PlantUML images, document data, images, and CSS are not remote JavaScript.
- **Data usage:** select **Website content** and **Web history** for the current handling scope. These cover document/diagram text and current-document/directory/resource URLs. The extension does not record browsing history or request `history` permission.
- **Use certifications:** data is not sold, used for unrelated purposes, or used for creditworthiness or lending decisions.
- **Privacy policy URL:** `https://github.com/emorywang/markdang/blob/main/PRIVACY.md`. Merge first, then check the public, current page in a signed-out window.

Local processing requires disclosure. No telemetry does not mean no data handling. The extension does not specifically collect identity, health, financial, authentication, location, or behavioral-tracking data; do not declare collection features it does not have.

PlantUML is off by default. Enabling it sends diagram source over HTTPS to `www.plantuml.com`; compressed encoding is not encryption. Remote documents, images, and custom CSS may also request their hosts. Keep the UI, listing, and privacy policy consistent.

## 6. Submit and publish

1. Paste the English **Test instructions**. There is no login, payment, or license key.
2. Under **Distribution**, choose **Public** and intended regions. Unlisted and Private also require review; a separate test item is unnecessary.
3. Save each section, resolve missing required fields, and choose **Submit for review**.
4. Prefer deferred publication by clearing automatic publishing. After approval, check the listing and choose **Publish** within 30 days.
5. Install the store version and check local access, reading, languages, themes, and support links. Add the store install link to both READMEs.

Store and unpacked versions can have different IDs, so their settings do not automatically migrate. Disable the unpacked version while checking the store installation.

## Updates

Update the same store item. Increment `package.json`, the lockfile, and `manifest.json` consistently, including `version_name`. Check and upload the new ZIP, such as 1.0.1, then create its Release. Preserve published tags and assets.

## Official references

- [Submission and deferred publication](https://developer.chrome.com/docs/webstore/publish)
- [Image requirements](https://developer.chrome.com/docs/webstore/images)
- [Listing and localization](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Categories](https://developer.chrome.com/docs/webstore/best-practices#choose_your_extensions_category_well)
- [Privacy and local handling](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Remote hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

Dashboard labels may change; follow its current required fields. This guide does not replace store review.
