import { pathToFileURL } from 'node:url'
import { launchExtension } from './browser.mjs'
import path from 'node:path'
import http from 'node:http'
import { readFile } from 'node:fs/promises'

const furl = p => pathToFileURL(path.resolve(p)).href
const EXT = path.resolve('extension')
const ROOT = path.resolve('.')
const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond, extra })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' | ' + extra : ''}`)
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname
    const file = path.resolve(ROOT, '.' + decodeURIComponent(pathname))
    if (!file.startsWith(ROOT + path.sep)) throw new Error('Invalid fixture path')
    const body = await readFile(file)
    res.setHeader('content-type', /\.(txt|md)$/i.test(pathname) ? 'text/plain' : 'text/html')
    res.end(body)
  } catch {
    res.statusCode = 404
    res.end('nf')
  }
})
await new Promise(res => server.listen(0, '127.0.0.1', res))
const origin = `http://127.0.0.1:${server.address().port}`

const { context: context, extId } = await launchExtension()

const manifestText = await readFile(path.join(EXT, 'manifest.json'), 'utf8')
const manifest = JSON.parse(manifestText)
ok('manifest: no api host, no account bridge', !manifestText.includes('mdreaderapi') && !manifestText.includes('auth-bridge'))
ok('manifest: host_permissions empty', (manifest.host_permissions ?? []).length === 0)

const storagePage = await context.newPage()
await storagePage.goto(`chrome-extension://${extId}/src/popup/index.html`)
const setStorage = data => storagePage.evaluate(d => chrome.storage.local.set(d), data)

const page = await context.newPage()
const goto = async url => {
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
}
const waitForReader = () => page.waitForSelector('.markdang-content', { timeout: 10000 }).catch(() => null)

/* ---- 1. http md rendering ---- */
await goto(`${origin}/tests/fixtures/a.md`)
await waitForReader()
const content = await page.$('.markdang-content')
ok('http: reader renders', !!content)
if (content) {
  const style = await content.evaluate(el => {
    const cs = getComputedStyle(el)
    return { w: cs.maxWidth, f: cs.fontSize }
  })
  ok('http: default width 1000px', style.w === '1000px', style.w)
  ok('http: default font 18px (Medium)', style.f === '18px', style.f)
  ok('http: sidebar tabs present', (await page.$$('.markdang__side-tab')).length >= 2)
}

/* ---- 2. settings applied ---- */
await setStorage({
  textSize: 'Large',
  enableCustomContentWidth: true,
  customContentData: { unit: 'px', maxWidth: 1200, maxPercent: 50 },
  enableCustomCSS: true,
  customCSS: '.markdang-content{letter-spacing:2px}',
  codeWrap: true,
})
await goto(`${origin}/tests/fixtures/a.md`)
await waitForReader()
const c2 = await page.$('.markdang-content')
if (c2) {
  const style = await c2.evaluate(el => {
    const cs = getComputedStyle(el)
    return { w: cs.maxWidth, f: cs.fontSize, ls: cs.letterSpacing }
  })
  ok('settings: width 1200px', style.w === '1200px', style.w)
  ok('settings: font Large=20px', style.f === '20px', style.f)
  ok('settings: custom css applied', style.ls === '2px', style.ls)
  ok('settings: code wrap class', await page.evaluate(() => document.querySelector('.markdang').classList.contains('markdang-code-wrap') || document.body.classList.contains('code-wrap')))
}
await setStorage({ textSize: 'Normal', enableCustomContentWidth: false, enableCustomCSS: false, codeWrap: false })

/* ---- 3. popup (full settings ui) & options page ---- */
await goto(`chrome-extension://${extId}/src/popup/index.html`)
await page.waitForSelector('.options.popup-mode', { timeout: 8000 }).catch(() => null)
ok('popup: full settings ui in popup', !!(await page.$('.options.popup-mode')))
ok('popup: enable switch', !!(await page.$('.popup-mode .switch')))
ok('popup: open options page button', !!(await page.$('.popup-mode .rail button[title*="独立"]')))
const popupText = await page.evaluate(() => document.body.textContent)
ok('popup: settings sections reachable', popupText.includes('通用') && popupText.includes('外观') && popupText.includes('插件'))

/* code theme: dark page + light night theme -> light code background */
await setStorage({ pageTheme: 'dark', codeBlockNightTheme: 'light' })
await goto(furl('tests/fixtures/a.md'))
await waitForReader()
const codeBg = await page.evaluate(() => {
  const pre = document.querySelector('.markdang__code-block')
  return pre ? getComputedStyle(pre).backgroundColor : ''
})
ok('settings: night code theme light -> light bg', codeBg === 'rgb(246, 248, 250)', codeBg)
await setStorage({ pageTheme: 'auto', codeBlockNightTheme: 'dark' })

await goto(`chrome-extension://${extId}/src/options/index.html`)
await page.waitForSelector('.options', { timeout: 8000 }).catch(() => null)
const optText = await page.evaluate(() => document.body.textContent)
ok('options: four sections', ['通用', '外观', '插件', '关于'].every(t => optText.includes(t)))
ok('options: txt toggle', optText.includes('.txt 文件视为 Markdown'))
ok('options: outline collapse toggle', optText.includes('开启大纲折叠'))
ok('options: no account ui', !optText.includes('登录') && !optText.includes('订阅'))
/* switch to the plugins section, then expand the TOC plugin gear */
await page.click('.rail button:has-text("插件")')
await page.waitForTimeout(250)
const tocBlock = page.locator('.plugin-block', { hasText: '[[TOC]]' })
await tocBlock.locator('.gear').click()
await page.waitForTimeout(300)
ok('options: plugin gear expands', (await page.$$('.plugin-options')).length > 0)

/* ---- 4. file:// md render ---- */
await goto(furl('tests/fixtures/a.md'))
await waitForReader()
ok('file: reader renders', !!(await page.$('.markdang-content')))
const bootState = await page.evaluate(() => ({
  cleaned: !document.getElementById('markdang-boot-style') && !document.getElementById('markdang-boot-loading'),
}))
ok('file: boot shim cleaned up after render', bootState.cleaned, JSON.stringify(bootState))

/* ---- 5. folder tab ---- */
await page.click('.markdang__side-tab:first-child')
await page.waitForSelector('.markdang__folder-list li a', { timeout: 10000 }).catch(() => null)
const folderItems = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.markdang__folder-list li')).map(li => li.textContent.trim()),
)
ok('folder: 3 md files listed', folderItems.filter(t => t.startsWith('M')).length === 3, JSON.stringify(folderItems))
ok('folder: current file highlighted', await page.evaluate(() => !!document.querySelector('.markdang__folder-list li.active')))
await Promise.all([
  page.waitForURL('**/b.md', { timeout: 10000 }),
  page.click('.markdang__folder-list a[href*="b.md"]'),
])
await page.waitForLoadState('domcontentloaded')
await waitForReader()
ok('folder: click b.md switches and renders', (await page.evaluate(() => document.title)) === 'B 文档', await page.evaluate(() => document.title))

/* ---- 6. outline collapse (bug: stray # anchors) ---- */
await goto(furl('demo/full-feature-test.md'))
await waitForReader()
const heads = await page.$$eval('.markdang-content h1, .markdang-content h2, .markdang-content h3, .markdang-content h4, .markdang-content h5, .markdang-content h6', els => els.length)
const anchors0 = await page.$$eval('.markdang__head-anchor', els => els.length)
ok('outline: one anchor per heading initially', anchors0 === heads, `anchors=${anchors0} heads=${heads}`)
/* toggle outline collapse off and on via settings, then re-render happens */
await setStorage({ isOutlineExpandable: true })
await page.waitForTimeout(400)
await setStorage({ isOutlineExpandable: false })
await page.waitForTimeout(400)
await setStorage({ isOutlineExpandable: true })
await page.waitForTimeout(400)
const anchors1 = await page.$$eval('.markdang__head-anchor', els => els.length)
ok('bugfix: no stray # anchors after repeated toggles', anchors1 === heads, `anchors=${anchors1} heads=${heads}`)
const carets = await page.$$eval('.markdang__fold', els => els.length)
ok('outline: carets present when enabled', carets > 0, String(carets))
await page.click('.markdang__outline-list li:first-child .markdang__fold')
const foldedState = await page.evaluate(() => {
  const lis = Array.from(document.querySelectorAll('.markdang__outline-list li'))
  return { folded: lis[0].classList.contains('folded'), hidden: lis.filter(l => l.classList.contains('fold-hidden')).length }
})
ok('outline: folding hides descendants', foldedState.folded && foldedState.hidden > 0, JSON.stringify(foldedState))
await page.click('.markdang__outline-list li:first-child .markdang__fold')
ok('outline: unfold restores', (await page.$$eval('.markdang__outline-list li.fold-hidden', els => els.length)) === 0)

/* ---- 7. txt as markdown ---- */
await goto(furl('tests/fixtures/notes.txt'))
await waitForReader()
ok('txt: rendered by default', !!(await page.$('.markdang-content')))
await setStorage({ enableTxtExt: false })
await page.waitForFunction(() => !document.querySelector('.markdang') && !document.getElementById('markdang-boot-style'))
ok('txt: not rendered when disabled', !(await page.$('.markdang-content')))
await setStorage({ enableTxtExt: true })
await page.waitForSelector('.markdang-content')

/* ---- 8. directory view ---- */
await goto(furl('tests/fixtures/'))
await waitForReader()
ok('dir: folder page rendered as browser view', !!(await page.$('.markdang__dir')))
const dirItems = await page.$$eval('.markdang__dir-list li', els => els.length)
ok('dir: lists subfolder + 3 md files (notes.txt filtered)', dirItems === 4, String(dirItems))

/* ---- 9. zen mode ---- */
await setStorage({ zenMode: true })
await page.waitForTimeout(300)
ok('zen: class applied', await page.evaluate(() => document.querySelector('.markdang').classList.contains('markdang-zen')))
await setStorage({ zenMode: false })

/* ---- 10. demo page: toc nesting, alerts, tasklists, katex extras ---- */
await goto(furl('demo/full-feature-test.md'))
await waitForReader()
ok('demo: toc container rendered', !!(await page.$('.markdang-content .table-of-contents')))
ok('demo: toc nests sub-lists', !!(await page.$('.markdang-content .table-of-contents ul ul')))
ok('demo: github alert styled', !!(await page.$('.markdang-content .markdown-alert-note')))
ok('demo: container alert styled', !!(await page.$('.markdang-content .markdang__alert--info')))
ok('demo: tasklist has no bullets', await page.evaluate(() => {
  const li = document.querySelector('.markdang-content li.task-list-item')
  return li && getComputedStyle(li).listStyleType === 'none'
}))
ok('demo: katex inline+block rendered', (await page.$$eval('.markdang-content .katex', els => els.length)) >= 2)
ok(
  'demo: mermaid lazy-loads and renders svg',
  await page
    .waitForSelector('.markdang-content pre.markdang__mermaid svg', { timeout: 15000 })
    .then(() => true)
    .catch(() => false),
)
const cur = await storagePage.evaluate(() => chrome.storage.local.get('mdPluginOptions'))
await setStorage({
  mdPluginOptions: {
    ...cur.mdPluginOptions,
    Katex: { ...cur.mdPluginOptions?.Katex, enableBareBlocks: true, enableMathInlineInHtml: true },
  },
})
await goto(furl('demo/full-feature-test.md'))
await waitForReader()
ok('demo: katex bare block renders when enabled', (await page.$$eval('.markdang-content .katex-display', els => els.length)) >= 2)
const restored = await storagePage.evaluate(() => chrome.storage.local.get('mdPluginOptions'))
await setStorage({
  mdPluginOptions: {
    ...restored.mdPluginOptions,
    Katex: { ...restored.mdPluginOptions?.Katex, enableBareBlocks: false, enableMathInlineInHtml: false },
  },
})

/* ---- 11. disabled ---- */
await setStorage({ enable: false })
await page.waitForFunction(() => !document.querySelector('.markdang') && !document.getElementById('markdang-boot-style'))
await goto(furl('tests/fixtures/a.md'))
await page.waitForLoadState('domcontentloaded').catch(() => {})
ok('disabled: no reader', !(await page.$('.markdang-content')))
await setStorage({ enable: true })
await page.waitForSelector('.markdang-content')

await page.close()
await storagePage.close()
await context.close()
server.close()

const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
