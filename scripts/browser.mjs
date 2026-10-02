import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

export const ROOT = fileURLToPath(new URL('../', import.meta.url))
export async function launchExtension({ language } = {}) {
  const extension = path.join(ROOT, 'extension')
  if (!fs.existsSync(path.join(extension, 'manifest.json'))) throw new Error('Run npm run build before browser tests')
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'markdang-test-'))
  let context
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      ...(process.env.MARKDANG_BROWSER_PATH ? { executablePath: process.env.MARKDANG_BROWSER_PATH } : {}),
      headless: process.env.MARKDANG_HEADLESS !== 'false',
      colorScheme: 'light',
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-first-run'],
    })
    /* Tests never disclose fixture content to a remote diagram/image server. */
    await context.route(/^https?:/, route => {
      const host = new URL(route.request().url()).hostname
      return ['127.0.0.1', 'localhost', '[::1]'].includes(host) ? route.continue() : route.abort()
    })
    let worker = context.serviceWorkers()[0]
    worker ??= await context.waitForEvent('serviceworker', { timeout: 15000 })
    const extId = new URL(worker.url()).hostname
    if (language) await worker.evaluate(language => chrome.storage.local.set({ language }), language)
    const manager = await context.newPage()
    await manager.goto('chrome://extensions')
    const error = await manager.evaluate(id => new Promise(resolve => {
      chrome.developerPrivate.updateExtensionConfiguration({ extensionId: id, fileAccess: true }, () => resolve(chrome.runtime.lastError?.message))
    }), extId)
    await manager.close()
    if (error) throw new Error(`Could not grant local file access: ${error}`)
    const close = context.close.bind(context)
    context.close = async (...args) => {
      try { await close(...args) } finally { fs.rmSync(profile, { recursive: true, force: true }) }
    }
    return { context, extId }
  } catch (error) {
    await context?.close()
    fs.rmSync(profile, { recursive: true, force: true })
    throw new Error(`Browser tests require Playwright Chromium. Run: npx playwright-core install chromium. ${error}`)
  }
}
