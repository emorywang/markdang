/* One-off visual check: real popup width (800x600) + About section + reader sidebar top. */
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const furl = p => pathToFileURL(path.resolve(p)).href
const EXT = path.resolve('extension')
const OUT = path.resolve('..')

const context = await chromium.launchPersistentContext(mkdtempSync(path.join(os.tmpdir(), 'mdg-check-')), {
  executablePath: EDGE,
  headless: true,
  args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--no-first-run'],
})

const mgr = await context.newPage()
await mgr.goto('chrome://extensions')
await mgr.waitForLoadState('domcontentloaded')
const extId = await mgr.evaluate(() => new Promise(res => chrome.developerPrivate.getExtensionsInfo(l => res(l.find(e => e.name.includes('MarkDang'))?.id))))
await mgr.evaluate(id => new Promise(res => chrome.developerPrivate.updateExtensionConfiguration({ extensionId: id, fileAccess: true }, res)), extId)

/* 1. popup at real popup size 800x600 */
const popup = await context.newPage()
await popup.setViewportSize({ width: 800, height: 600 })
await popup.goto(`chrome-extension://${extId}/src/popup/index.html`)
await popup.waitForSelector('.options.popup-mode', { timeout: 8000 })
await popup.screenshot({ path: path.join(OUT, 'check-popup-800.png') })

/* 2. options About section (full page 1100) */
const opts = await context.newPage()
await opts.setViewportSize({ width: 1100, height: 900 })
await opts.goto(`chrome-extension://${extId}/src/options/index.html`)
await opts.waitForSelector('.options', { timeout: 8000 })
await opts.click('.rail-nav button:nth-child(4)')
await opts.waitForSelector('.about', { timeout: 5000 })
await opts.screenshot({ path: path.join(OUT, 'check-about.png') })

/* 2b. plugins section: shared card + bigger gear */
await opts.click('.rail-nav button:nth-child(3)')
await opts.waitForSelector('.plugin-block', { timeout: 5000 })
await opts.screenshot({ path: path.join(OUT, 'check-plugins.png') })

/* 3. reader sidebar top (no brand row) */
const page = await context.newPage()
await page.setViewportSize({ width: 1280, height: 500 })
await page.goto(furl('demo/full-feature-test.md'))
await page.waitForSelector('.markdang-content', { timeout: 10000 })
await page.screenshot({ path: path.join(OUT, 'check-reader-top.png') })

await context.close()
console.log('checks saved')
