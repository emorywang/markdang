import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchExtension } from './browser.mjs'

const output = path.resolve('artifacts/store-screenshots')
const samples = {
  en: {
    appearance: 'Appearance', checklist: 'Review checklist',
    document: `# Project notes

A few notes, code snippets, and a checklist kept beside the project.

## Working with Markdown

Markdown keeps documentation close to the code. Headings provide structure; lists and tables keep the details easy to scan.

> [!NOTE]
> These are example notes. The original file stays unchanged while you read it.

## Code snippets

\`\`\`js
const files = ['README.md', 'design.md', 'release.md']
const notes = files.filter(file => file.endsWith('.md'))

for (const file of notes) {
  console.log(file)
}
\`\`\`

## Review checklist

- [x] Read the changes
- [x] Check the documentation
- [ ] Publish the release

## Math and diagrams

A weighted average can be written as $\\bar{x}=\\frac{\\sum_i w_i x_i}{\\sum_i w_i}$.

\`\`\`mermaid
flowchart LR
  Draft --> Review --> Release
\`\`\`

| File | Purpose |
| --- | --- |
| README.md | Start here |
| design.md | Design notes |
| release.md | Release checklist |

## Reading options

Use the outline to move between sections. Change the theme and text size to suit the document, or enter zen mode for a quieter view.
`,
  },
  'zh-CN': {
    appearance: '外观', checklist: '检查清单',
    document: `# 项目笔记

把说明、代码片段和检查清单放在项目旁边，查阅时更方便。

## 用 Markdown 整理文档

Markdown 让文档与代码保存在一起。用标题组织章节，用列表和表格说明细节，便于查找和维护。

> [!NOTE]
> 这是示例笔记。阅读和勾选任务不会修改原始文件。

## 代码片段

\`\`\`js
const files = ['README.md', 'design.md', 'release.md']
const notes = files.filter(file => file.endsWith('.md'))

for (const file of notes) {
  console.log(file)
}
\`\`\`

## 检查清单

- [x] 查看代码差异
- [x] 核对文档
- [ ] 发布新版本

## 公式与图表

加权平均数可以写为 $\\bar{x}=\\frac{\\sum_i w_i x_i}{\\sum_i w_i}$。

\`\`\`mermaid
flowchart LR
  草稿 --> 审查 --> 发布
\`\`\`

| 文件 | 用途 |
| --- | --- |
| README.md | 项目说明 |
| design.md | 设计笔记 |
| release.md | 发布清单 |

## 阅读选项

通过大纲切换章节，按文档调整主题和字号；需要专注阅读时，可以进入禅模式。
`,
  },
}

for (const [locale, sample] of Object.entries(samples)) {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'markdang-store-'))
  let context
  try {
    const directory = path.join(output, locale)
    await fs.mkdir(directory, { recursive: true })
    const document = path.join(fixture, 'README.md')
    await fs.writeFile(document, sample.document)
    await fs.writeFile(path.join(fixture, 'design.md'), '# Design notes\n')
    await fs.writeFile(path.join(fixture, 'release.md'), '# Release checklist\n')
    await fs.mkdir(path.join(fixture, 'guides'))
    await fs.writeFile(path.join(fixture, 'guides', 'setup.md'), '# Setup\n')
    const launched = await launchExtension({ language: locale })
    context = launched.context
    const options = await context.newPage()
    await options.setViewportSize({ width: 1280, height: 800 })
    await options.goto(`chrome-extension://${launched.extId}/src/options/index.html`)
    await options.waitForSelector('.options')
    await options.evaluate(() => chrome.runtime.sendMessage({ action: 'settingsPatch', data: { pageTheme: 'light', refresh: false, mdPluginOptions: { TaskLists: { enabled: true } } } }))
    const page = await context.newPage()
    await page.setViewportSize({ width: 1280, height: 800 })
    const capture = async (target, name) => {
      assert.equal(await target.evaluate(() => document.querySelector('.markdang')?.lang ?? document.documentElement.lang), locale)
      await target.evaluate(() => document.fonts.ready)
      await target.screenshot({ path: path.join(directory, `${name}.png`), animations: 'disabled' })
    }
    await page.goto(pathToFileURL(document).href)
    await page.waitForSelector('.markdang-content')
    await page.waitForSelector('pre.markdang__mermaid svg')
    await capture(page, '01-reading-light')
    await page.locator('.markdang-content h2').filter({ hasText: sample.checklist }).evaluate(heading => heading.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await capture(page, '02-math-diagrams')
    await options.evaluate(() => chrome.runtime.sendMessage({ action: 'settingsPatch', data: { pageTheme: 'dark' } }))
    await page.waitForFunction(() => document.querySelector('.markdang')?.getAttribute('data-theme') === 'dark')
    await page.locator('.markdang-content h1').first().scrollIntoViewIfNeeded()
    await capture(page, '03-reading-dark')
    await options.evaluate(() => chrome.runtime.sendMessage({ action: 'settingsPatch', data: { pageTheme: 'light' } }))
    await page.waitForFunction(() => document.querySelector('.markdang')?.getAttribute('data-theme') === 'light')
    await page.locator('.markdang__side-tab').first().click()
    await page.waitForSelector('.markdang__folder-list li a')
    await capture(page, '04-folder-navigation')
    await options.getByRole('button', { name: sample.appearance, exact: true }).click()
    await capture(options, '05-settings')
    console.log(`Store screenshots captured: ${locale} (5 × 1280 × 800)`)
  } finally {
    await context?.close()
    await fs.rm(fixture, { recursive: true, force: true })
  }
}
