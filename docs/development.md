# Development guide

[简体中文](development.zh-CN.md) · [README](../README.md)

Use Node.js 22.12 or later (Node.js 24 LTS recommended) and npm. Run commands from the repository root.

```bash
npm ci
npm run check          # TypeScript, unit tests, and a clean production build
npx playwright-core install chromium
npm run test:e2e       # Browser feature, interaction, option, regression, and language suites
npm run zip            # Rebuild and package dist/markdang-v<version>.zip
```

On Linux, `npx playwright-core install --with-deps chromium` also installs required browser libraries. CI uses this setup. The browser suites load the unpacked extension in Playwright's full Chromium channel and use a fresh profile for each suite. They grant file-URL access through the browser's extension management page. Test data lives in `tests/fixtures/` and `demo/full-feature-test.md`; no files outside this repository are required. Remote requests from fixtures are blocked.

To use a compatible browser executable instead:

```powershell
$env:MARKDANG_BROWSER_PATH = 'C:\path\to\chrome.exe'
npm run test:e2e
```

```bash
MARKDANG_BROWSER_PATH=/path/to/chromium npm run test:e2e
```

Recent branded Chrome/Edge versions restrict command-line extension loading. Prefer Playwright Chromium. Set `MARKDANG_HEADLESS=false` for visible-browser debugging.

## During development

For a quick manual test of a PR, download the **markdang-…** package under **Artifacts** in its successful Actions run. Extract the download, then extract the `markdang-v<version>.zip` inside it. Load the folder containing `manifest.json` at `chrome://extensions` or `edge://extensions`, enable local file access, and open a Markdown file. Disable any older MarkDang installation while testing. Keep the extracted folder in place.

The separate **popup-previews-…** artifact contains Chinese and English About screenshots at 400 × 600 in light and dark modes.

`npm run dev` rebuilds on source changes. After each build, click **Reload** for the unpacked extension and reload the document tab. This is a build watcher, not a Vite web server or browser hot-reload system.

`npm run typecheck` and `npm run test:unit` run independently. Browser suites require an existing `extension/` build. `npm run screenshots` refreshes README screenshots; `node scripts/check-visual.mjs` writes review images under ignored `artifacts/`.

## Adding or changing behavior

Update the schema/defaults, relevant UI, settings reference, and a representative regression test together. Send partial settings patches rather than complete snapshots. Do not add controls for unimplemented behavior or claim coverage based on a fixed assertion count. Existing storage keys are retained where practical; retired placeholders are documented explicitly.

Maintain complete text pairs in `src/shared/i18n.ts` and update both language versions of related documents. Original Markdown, filenames, and code are outside interface translation.

CI actions are pinned to reviewed release commits. When updating them, verify the upstream release and change both its commit SHA and version comment.

## Release checklist

1. Run `npm ci`, `npm run check`, and `npm run test:e2e`.
2. Review English/Chinese interfaces, light/dark reader views, the actual 400 × 600 popup, keyboard navigation, and local-file permission guidance. Check language persistence, live reader labels, and the About support links.
3. Update the version in `package.json`, its lockfile root, and `public/manifest.json` (`version` and `version_name`). The build rejects mismatches.
4. Update both language versions of the changelog and run `npm run zip`.
5. Extract the ZIP and load **its extraction directory**, which contains `manifest.json` at its root. Test it in a fresh browser profile before distributing it.
6. Upload the ZIP to a GitHub Release or Chrome Web Store. For store submission, review [the publishing checklist](publishing.md).
