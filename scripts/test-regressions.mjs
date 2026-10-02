import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchExtension } from './browser.mjs'

const { context, extId } = await launchExtension()
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'markdang-regressions-'))
let assertions = 0
const ok = (name, result) => { assert.ok(result, name); assertions++; console.log(`PASS  ${name}`) }
try {
  const storage = await context.newPage()
  await storage.goto(`chrome-extension://${extId}/src/popup/index.html`)
  const patch = data => storage.evaluate(data => chrome.runtime.sendMessage({ action: 'settingsPatch', data }), data)
  const get = () => storage.evaluate(() => chrome.storage.local.get(null))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const file = path.join(temp, 'document.md')
  const goto = async source => {
    await fs.writeFile(file, source)
    await page.goto(pathToFileURL(file).href)
    await page.waitForSelector('.markdang-content')
  }

  await Promise.all([patch({ textSize: 'Large' }), patch({ codeWrap: true }), patch({ mdPluginOptions: { Katex: { enableBareBlocks: true } } }), patch({ mdPluginOptions: { TOC: { listType: 'ol' } } })])
  const saved = await get()
  ok('simultaneous settings patches all survive', saved.textSize === 'Large' && saved.codeWrap && saved.mdPluginOptions.Katex.enableBareBlocks && saved.mdPluginOptions.TOC.listType === 'ol')
  await patch({ textSize: 'Medium', codeWrap: false, mdPluginOptions: { Katex: { enableBareBlocks: false }, TOC: { listType: 'ul' } } })

  await goto('# Before\n\nOriginal text')
  await patch({ refresh: true, refreshInterval: 0.5 })
  await fs.writeFile(file, '# After\n\nFirst edit')
  await page.waitForFunction(() => document.querySelector('.markdang-content h1')?.textContent?.includes('After'), null, { timeout: 15000 })
  await fs.writeFile(file, '# Again\n\nSecond edit')
  await page.waitForFunction(() => document.querySelector('.markdang-content h1')?.textContent?.includes('Again'), null, { timeout: 15000 })
  ok('local auto refresh observes successive edits', true)
  await patch({ refresh: false })
  await page.waitForTimeout(700)
  ok('probe tabs are closed after local refresh', context.pages().filter(p => p.url().includes('markdang-probe=')).length === 0)

  await patch({ enable: false })
  await page.waitForFunction(() => !document.querySelector('.markdang') && getComputedStyle(document.querySelector('pre')).display !== 'none')
  ok('disabling reader restores visible raw source', await page.locator('pre').isVisible())
  await patch({ enable: true })
  await page.waitForSelector('.markdang-content')
  ok('reenabling an already open document boots the reader', true)

  await goto('# Security\n\n<img src="missing" onerror="window.markdangAttack=true">\n\n<form action="https://example.com"><input name="secret"></form>\n\n<a href="javascript:alert(1)">bad link</a>\n\n<style>body{display:none}</style>\n\n```foo"onclick="alert(1)\ncode\n```')
  const safe = await page.evaluate(() => ({ attack: !!window.markdangAttack, handlers: document.querySelectorAll('.markdang-content [onerror],.markdang-content [onclick]').length, forms: document.querySelectorAll('.markdang-content form,.markdang-content input:not([type=checkbox]),.markdang-content style').length, badLinks: document.querySelectorAll('.markdang-content a[href^="javascript:"]').length }))
  ok('untrusted HTML and fence attributes cannot introduce active content', !safe.attack && !safe.handlers && !safe.forms && !safe.badLinks)
  await patch({ mdPluginOptions: { FrontMatter: { showMetadata: true } } })
  await goto('---\ntitle: <img src=x onerror=alert(1)>\n---\n# Metadata')
  ok('metadata HTML is displayed literally', (await page.locator('.markdang__front-matter').textContent()).includes('<img') && await page.locator('.markdang__front-matter img').count() === 0)

  await goto('[[TOC]]\n\n# Same\n\n## Same\n\n## **中文** `code`\n\n### Child')
  const links = await page.evaluate(() => [...document.querySelectorAll('.table-of-contents a')].every(a => document.getElementById(decodeURIComponent(a.hash.slice(1)))))
  ok('TOC fragments resolve to actual headings', links)
  await goto('<h1 id="same">Raw HTML</h1>\n\n[[TOC]]\n\n# Same')
  ok('raw HTML headings cannot take a Markdown TOC destination', await page.evaluate(() => {
    const link = document.querySelector('.table-of-contents a')
    const heads = [...document.querySelectorAll('.markdang-content h1')]
    return new Set(heads.map(head => head.id)).size === heads.length && document.getElementById(decodeURIComponent(link.hash.slice(1)))?.textContent === '#Same'
  }))
  await patch({ mdPluginOptions: { TOC: { markerPattern: '/[/' } } })
  await page.waitForSelector('.table-of-contents')
  ok('invalid marker regex does not break the reader', await page.locator('.markdang-content h1').count() === 1)

  await patch({ pageTheme: 'auto' })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() => document.querySelector('.markdang')?.dataset.theme === 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction(() => document.querySelector('.markdang')?.dataset.theme === 'light')
  ok('Auto theme responds to live system color changes', true)

  await patch({ zenMode: true })
  await page.waitForSelector('.markdang-zen')
  ok('zen exit button is actually visible through its ancestors', await page.locator('.markdang__btn--exit-zen').isVisible())
  await page.locator('.markdang__btn--exit-zen').click()
  await page.waitForFunction(() => !document.querySelector('.markdang').classList.contains('markdang-zen'))
  ok('zen exit button exits without keyboard input', true)

  await goto('# Diagram\n\n```mermaid\nflowchart LR\nA[Start] --> B[End]\n```')
  await page.waitForSelector('.markdang__mermaid svg', { timeout: 15000 })
  await patch({ mdPluginOptions: { Mermaid: { json: '{"securityLevel":"loose","secure":[],"startOnLoad":true}' } } })
  await page.waitForSelector('.markdang__mermaid svg', { timeout: 15000 })
  ok('custom Mermaid JSON retains safe rendering', await page.locator('.markdang__mermaid svg').count() === 1)

  await patch({ mdPluginOptions: { TaskLists: { enabled: true, label: true, labelAfter: true } } })
  await goto('- [ ] **Parent** `code`\n  - [x] Child')
  ok('task labels preserve formatted content and nested list layout', await page.evaluate(() => {
    const parent = document.querySelector('.task-list-item')
    const child = parent.querySelector('.task-list-item')
    return parent.querySelectorAll('strong').length === 1 && parent.querySelectorAll('code').length === 1 && child.getBoundingClientRect().top > parent.querySelector('label').getBoundingClientRect().top
  }))

  /* Rapid UI edits used to share one debounce timer, losing the first edit. */
  await storage.getByRole('button', { name: '通用', exact: true }).click()
  await storage.getByRole('switch', { name: '渲染文件夹路径', exact: true }).click()
  await storage.getByRole('switch', { name: '将 .txt 文件视为 Markdown 渲染', exact: true }).click()
  await storage.waitForFunction(async () => { const s = await chrome.storage.local.get(['enableFolderUrl', 'enableTxtExt']); return s.enableFolderUrl === false && s.enableTxtExt === false })
  ok('rapid changes to two different controls both persist', true)
  await storage.getByRole('button', { name: '插件', exact: true }).click()
  await storage.getByRole('switch', { name: '本地渲染插件', exact: true }).click()
  await storage.getByRole('switch', { name: '本地渲染插件', exact: true }).click()
  await storage.waitForFunction(async () => { const s = await chrome.storage.local.get('mdPlugins'); return s.mdPlugins?.length === 18 && !s.mdPlugins.includes('PlantUML') })
  ok('bulk plugin toggle does not enable PlantUML', true)
  ok('no unexpected page errors during regressions', errors.length === 0)
  console.log(`${assertions} regression checks passed`)
} finally {
  await context.close()
  await fs.rm(temp, { recursive: true, force: true })
}
