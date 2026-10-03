/* One-off visual check: real popup width (400x600) + About section + reader sidebar top. */
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { launchExtension } from './browser.mjs'
import path from 'node:path'

const furl = p => pathToFileURL(path.resolve(p)).href
const OUT = path.resolve('artifacts')
fs.mkdirSync(OUT, { recursive: true })

const { context: context, extId } = await launchExtension()

const popup = await context.newPage()
await popup.setViewportSize({ width: 400, height: 600 })
await popup.goto(`chrome-extension://${extId}/src/popup/index.html`)
await popup.waitForSelector('.options.popup-mode', { timeout: 8000 })
await popup.screenshot({ path: path.join(OUT, 'check-popup-400.png') })

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
