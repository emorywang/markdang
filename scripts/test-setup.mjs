import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchExtension } from './browser.mjs'

let assertions = 0
const ok = (name, value) => { assert.ok(value, name); assertions++; console.log(`PASS  ${name}`) }
const server = http.createServer((req, res) => {
  const html = req.url === '/ordinary.md'
  res.setHeader('Content-Type', html ? 'text/html' : 'text/plain')
  res.end(html
    ? '<!doctype html><html><head><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"></head><body>Ordinary HTML</body></html>'
    : '# Reading sample\n\nA public test document.\n')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
let context
try {
  // Observe the actual install event before changing a browser permission,
  // which can reload the extension and close its own pages.
  const extension = await launchExtension({ language: 'en', fileAccess: null })
  context = extension.context
  const { extId } = extension
  const welcomeUrl = `chrome-extension://${extId}/src/options/index.html?welcome`
  const openCurrentWelcome = async () => {
    const page = await context.newPage()
    for (let attempt = 0; ; attempt++) {
      try {
        await page.goto(welcomeUrl)
        await page.waitForSelector('.setup-card')
        return page
      } catch (error) {
        // The native settings callback can finish before an extension reload.
        // Retry only this transient navigation failure, for at most five seconds.
        if (attempt >= 50 || !String(error).includes('ERR_BLOCKED_BY_CLIENT')) throw error
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
  let welcome
  for (let i = 0; i < 100 && !welcome; i++) {
    welcome = context.pages().find(page => page.url() === welcomeUrl)
    if (!welcome) await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(welcome, `first install opens the welcome page; tabs: ${context.pages().map(page => page.url()).join(', ')}`)
  await welcome.waitForSelector('.setup-card')
  const manager = await context.newPage()
  await manager.goto('chrome://extensions')
  const denyError = await manager.evaluate(id => new Promise(resolve => {
    chrome.developerPrivate.updateExtensionConfiguration({ extensionId: id, fileAccess: false }, () => resolve(chrome.runtime.lastError?.message))
  }), extId)
  assert.equal(denyError, undefined)
  // Chromium can close the first-install tab when reloading the extension.
  // Open a current extension page to exercise the store's denied-access state.
  try {
    welcome = await openCurrentWelcome()
  } catch (error) {
    const state = await manager.evaluate(() => new Promise(resolve => {
      chrome.developerPrivate.getExtensionsInfo({ includeDisabled: true, includeTerminated: true }, extensions => resolve(extensions.map(info => ({
        id: info.id, name: info.name, state: info.state, location: info.location,
        path: info.path, disableReasons: info.disableReasons,
        runtimeErrors: info.runtimeErrors, manifestErrors: info.manifestErrors,
      }))))
    }))
    console.error('Extensions after file-access change:', JSON.stringify(state))
    throw error
  }
  await manager.close()
  const errors = []
  welcome.on('pageerror', error => errors.push(error.message))
  await welcome.waitForFunction(() => document.documentElement.lang === 'en')
  ok('first install explains web and local reading separately', await welcome.getByRole('heading', { name: 'Read web documents' }).count() === 1 && await welcome.getByRole('heading', { name: 'Read local documents' }).count() === 1)
  ok('welcome offers a public Markdown sample without loading it automatically', await welcome.getByRole('link', { name: 'Open sample document' }).getAttribute('href') === 'https://raw.githubusercontent.com/emorywang/markdang/main/demo/review-sample.md')
  await welcome.waitForFunction(() => document.querySelector('.file-access-status')?.textContent.includes('Enable'))
  ok('denied file access is shown accurately', !await welcome.evaluate(() => chrome.extension.isAllowedFileSchemeAccess()))

  const local = await context.newPage()
  await local.goto(pathToFileURL(path.resolve('tests/fixtures/a.md')).href)
  ok('local documents are not intercepted before the user grants access', await local.locator('.markdang').count() === 0 && await local.locator('#markdang-favicon').count() === 0)

  const previews = path.resolve('artifacts/setup')
  await fs.mkdir(previews, { recursive: true })
  const set = data => welcome.evaluate(data => chrome.storage.local.set(data), data)
  for (const language of ['en', 'zh-CN']) {
    await set({ language })
    await welcome.waitForFunction(language => document.documentElement.lang === language, language)
    for (const scheme of ['light', 'dark']) {
      await welcome.emulateMedia({ colorScheme: scheme })
      await welcome.evaluate(() => document.fonts.ready)
      ok(`${language} welcome in ${scheme} mode fits the viewport`, await welcome.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await welcome.screenshot({ path: path.join(previews, `welcome-${language}-${scheme}.png`), fullPage: true, animations: 'disabled' })
    }
  }
  await set({ language: 'en' })
  await welcome.waitForFunction(() => document.documentElement.lang === 'en')
  const opened = context.waitForEvent('page')
  await welcome.getByRole('button', { name: 'Extension details', exact: true }).click()
  const details = await opened
  await details.waitForURL(`chrome://extensions/?id=${extId}`)
  ok('permission button opens details for the current installed extension', details.url() === `chrome://extensions/?id=${extId}`)
  const permissionError = await details.evaluate(id => new Promise(resolve => {
    chrome.developerPrivate.updateExtensionConfiguration({ extensionId: id, fileAccess: true }, () => resolve(chrome.runtime.lastError?.message))
  }), extId)
  assert.equal(permissionError, undefined)
  welcome = await openCurrentWelcome()
  welcome.on('pageerror', error => errors.push(error.message))
  await welcome.bringToFront()
  await welcome.waitForFunction(() => document.querySelector('.file-access-status')?.textContent.includes('is allowed'))
  ok('returning from extension details refreshes the permission status', await welcome.evaluate(() => chrome.extension.isAllowedFileSchemeAccess()))
  await details.close()

  const expectedIcon = `chrome-extension://${extId}/icons/icon-32.png`
  const iconLoads = page => page.evaluate(async () => {
    const image = new Image()
    image.src = document.querySelector('#markdang-favicon').href
    try { await image.decode(); return image.naturalWidth === 32 && image.naturalHeight === 32 } catch { return false }
  })
  await local.reload()
  await local.waitForSelector('#markdang-favicon', { state: 'attached' })
  ok('a reloaded local document renders after access is granted', await local.locator('.markdang-content').count() === 1)
  ok('local reading uses the bundled MarkDang favicon', await local.locator('#markdang-favicon').getAttribute('href') === expectedIcon && await iconLoads(local))

  const web = await context.newPage()
  await web.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const icon = document.createElement('link')
      icon.rel = 'shortcut icon'
      icon.href = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'
      document.head.append(icon)
    }, { once: true })
  })
  await web.goto(`${origin}/sample.md`)
  await web.waitForSelector('#markdang-favicon', { state: 'attached' })
  ok('web reading replaces previous icon candidates with MarkDang', await web.locator('link[rel~="icon"]').count() === 1 && await web.locator('#markdang-favicon').getAttribute('href') === expectedIcon)
  ok('the packaged favicon is readable from a web document', await iconLoads(web))
  await local.goto(pathToFileURL(path.resolve('tests/fixtures')).href + '/')
  await local.waitForSelector('#markdang-favicon', { state: 'attached' })
  ok('rendered directory pages use the same MarkDang favicon', await local.locator('#markdang-favicon').getAttribute('href') === expectedIcon && await iconLoads(local))

  await web.goto(`${origin}/ordinary.md`)
  await web.waitForFunction(() => !document.getElementById('markdang-boot-style'))
  ok('ordinary HTML retains its original favicon', await web.locator('#markdang-favicon').count() === 0 && (await web.locator('link[rel~="icon"]').first().getAttribute('href')).startsWith('data:'))
  await set({ enable: false })
  await web.goto(`${origin}/disabled.md`)
  await web.waitForFunction(() => !document.getElementById('markdang-boot-style'))
  ok('disabled reading does not install a MarkDang favicon', await web.locator('.markdang').count() === 0 && await web.locator('#markdang-favicon').count() === 0)
  await welcome.getByRole('button', { name: 'Open settings', exact: true }).click()
  ok('welcome leads to the existing settings page', await welcome.getByRole('heading', { name: 'General', exact: true }).count() === 1)
  ok('setup does not produce page errors', errors.length === 0)
  console.log(`Setup and favicon checks passed: ${assertions}`)
} finally {
  await context?.close()
  await new Promise(resolve => server.close(resolve))
}
