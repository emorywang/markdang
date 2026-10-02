import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const mkdtempSync = p => fs.mkdtempSync(p)
const OUT = path.resolve('docs/screenshots')
const EXT = path.resolve('extension')
const furl = p => pathToFileURL(path.resolve(p)).href
const DEMO = furl('demo/full-feature-test.md')

fs.mkdirSync(OUT, { recursive: true })

const ctx = await chromium.launchPersistentContext(mkdtempSync(path.join(os.tmpdir(), 'mdg-shot2-')), {
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--no-first-run'],
})

const mgr = await ctx.newPage()
await mgr.goto('chrome://extensions')
await mgr.waitForLoadState('domcontentloaded')
const extId = await mgr.evaluate(
  () =>
    new Promise(res =>
      chrome.developerPrivate.getExtensionsInfo(l => res(l.find(e => e.name.includes('MarkDang'))?.id)),
    ),
)
await mgr.evaluate(
  id => new Promise(res => chrome.developerPrivate.updateExtensionConfiguration({ extensionId: id, fileAccess: true }, res)),
  extId,
)
const storage = await ctx.newPage()
await storage.goto(`chrome-extension://${extId}/src/popup/index.html`)
const setStorage = data => storage.evaluate(d => chrome.storage.local.set(d), data)

const page = await ctx.newPage()
await page.setViewportSize({ width: 1280, height: 860 })

/* 1. light reader with outline; mermaid svg proves the lazy-load chain */
await page.goto(DEMO)
await page.waitForSelector('.markdang-content', { timeout: 10000 })
await page.waitForSelector('pre.markdang__mermaid svg', { timeout: 15000 }).catch(() => {})
await page.screenshot({ path: path.join(OUT, 'reader-light.png') })

/* 2. folder tab panel */
await page.goto(furl('../test-md/b.md'))
await page.waitForSelector('.markdang-content', { timeout: 10000 })
await page.click('.markdang__side-tab:first-child')
await page.waitForSelector('.markdang__folder-list li a', { timeout: 10000 })
await page.screenshot({ path: path.join(OUT, 'sidebar-folder-tab.png') })

/* 3. dark theme + folded outline (native dark render, incl. mermaid) */
await setStorage({ isOutlineExpandable: true, pageTheme: 'dark' })
await page.goto(DEMO)
await page.waitForSelector('.markdang-content', { timeout: 10000 })
await page.waitForSelector('pre.markdang__mermaid svg', { timeout: 15000 }).catch(() => {})
await page.click('.markdang__outline-list li:first-child .markdang__fold')
await page.screenshot({ path: path.join(OUT, 'reader-dark-outline.png') })
await setStorage({ pageTheme: 'light' })

/* 4. directory view */
await page.goto(furl('../test-md/'))
await page.waitForSelector('.markdang__dir', { timeout: 10000 })
await page.screenshot({ path: path.join(OUT, 'folder-view.png') })

/* 5. options page */
await page.setViewportSize({ width: 1100, height: 900 })
await page.goto(`chrome-extension://${extId}/src/options/index.html`)
await page.waitForSelector('.options', { timeout: 8000 })
await page.screenshot({ path: path.join(OUT, 'options-page.png') })

/* 6. popup at its real size, plugins section */
await page.setViewportSize({ width: 400, height: 600 })
await page.goto(`chrome-extension://${extId}/src/popup/index.html`)
await page.waitForSelector('.options.popup-mode', { timeout: 8000 })
await page.click('.popup-mode .rail-nav button:has-text("插件")')
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(OUT, 'popup-plugins.png') })

console.log('screenshots saved to ' + OUT)
await ctx.close()
