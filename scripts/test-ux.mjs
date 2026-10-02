import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchExtension } from './browser.mjs'

const furl = p => pathToFileURL(path.resolve(p)).href
const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' | ' + extra : ''}`)
}

const { context: ctx, extId } = await launchExtension()

const page = await ctx.newPage()
await page.goto(furl('tests/fixtures/a.md'))
await page.waitForSelector('.markdang-content', { timeout: 10000 })

const sideState = () =>
  page.evaluate(() => {
    const side = document.querySelector('.markdang__side')
    if (!side) return 'missing'
    const rect = side.getBoundingClientRect()
    return rect.width > 0 && rect.left >= -1 ? 'visible' : 'hidden'
  })

/* 1. side collapse -> reopen (user complaint #2) */
await page.click('.markdang__btn[title="展开/收起侧栏"]')
await page.waitForTimeout(400)
ok('ux: side collapsed on first click', (await sideState()) === 'hidden')
ok('ux: action buttons still visible after collapse', await page.evaluate(() => {
  const btn = document.querySelector('.markdang__btn[title="原始内容"]')
  return btn && btn.getBoundingClientRect().width > 0
}))
await page.click('.markdang__btn[title="展开/收起侧栏"]')
await page.waitForTimeout(400)
ok('ux: side reopens on second click', (await sideState()) === 'visible')

/* 2. raw toggle (user complaint #3) */
await page.click('.markdang__btn[title="原始内容"]')
await page.waitForTimeout(200)
const rawState = await page.evaluate(() => {
  const layout = document.querySelector('.markdang-layout')
  const host = document.querySelector('.markdang-host')
  return {
    rawOn: document.body.classList.contains('markdang-raw'),
    layoutHidden: !layout || getComputedStyle(layout).display === 'none',
    hostVisible: !!host && host.getBoundingClientRect().height > 50,
  }
})
ok('ux: raw mode shows source', rawState.rawOn && rawState.layoutHidden && rawState.hostVisible, JSON.stringify(rawState))
await page.click('.markdang__btn[title="原始内容"]')
await page.waitForTimeout(200)
ok('ux: raw toggle restores reader', await page.evaluate(() => !document.body.classList.contains('markdang-raw')))

/* 3. theme toggle button: one-click inversion */
const themes = []
for (let i = 0; i < 4; i++) {
  await page.click('.markdang__btn[title="切换深浅主题"]')
  await page.waitForTimeout(300)
  themes.push(await page.evaluate(() => document.querySelector('.markdang').dataset.theme))
}
ok('ux: theme toggles dark/light alternately', themes[0] === 'dark' && themes[1] === 'light' && themes[2] === 'dark' && themes[3] === 'light', themes.join(','))

/* 4. folder tab deterministic across repeated opens */
const uxStorage = await ctx.newPage()
await uxStorage.goto(`chrome-extension://${extId}/src/popup/index.html`)
const setStorage = data => uxStorage.evaluate(d => chrome.storage.local.set(d), data)
let failures = 0
for (let i = 0; i < 5; i++) {
  await page.goto(furl('tests/fixtures/a.md'))
  await page.waitForSelector('.markdang-content', { timeout: 10000 })
  await page.click('.markdang__side-tab:first-child')
  await page.waitForSelector('.markdang__folder-list li a', { timeout: 8000 }).catch(() => null)
  const count = await page.$$eval('.markdang__folder-list li', els => els.length)
  if (count !== 4) failures++   /* subfolder + 3 md files */
}
ok('ux: folder tab lists folder+3 files on every attempt (5x)', failures === 0, `failures=${failures}`)

/* 5. zen mode: exit button obvious + Esc works */
await setStorage({ zenMode: true })
await page.waitForTimeout(400)
ok('ux: zen shows exit button', await page.evaluate(() => {
  const btn = document.querySelector('.markdang__btn--exit-zen')
  if (!btn) return false
  const cs = getComputedStyle(btn)
  return cs.display !== 'none' && Number(cs.opacity) > 0.5
}))
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
ok('ux: Esc exits zen', await page.evaluate(() => !document.querySelector('.markdang').classList.contains('markdang-zen')))

/* 6. settings-driven collapse + storage reactivity */
await setStorage({ sideCollapsed: true })
await page.waitForTimeout(400)
ok('ux: sideCollapsed setting hides side', await page.evaluate(() => document.querySelector('.markdang').classList.contains('markdang-side-collapsed')))
await setStorage({ sideCollapsed: false })
await page.waitForTimeout(400)
ok('ux: sideCollapsed=false restores side', await page.evaluate(() => !document.querySelector('.markdang').classList.contains('markdang-side-collapsed')))

/* 7. store-matching sidebar layout (fresh page with nested headings, outline tab) */
await page.goto(furl('demo/full-feature-test.md'))
await page.waitForSelector('.markdang-content', { timeout: 10000 })
ok('ux: tab bar has search + options icons', await page.evaluate(() => {
  const tabs = document.querySelectorAll('.markdang__side-tabs .markdang__side-tab')
  return tabs.length === 4
}))
ok('ux: filter row hidden until search clicked', await page.evaluate(() => document.querySelector('.markdang__filter-row')?.classList.contains('hidden')))
await page.click('.markdang__side-tab[title="搜索"]')
await page.waitForTimeout(200)
ok('ux: search icon reveals filter row', await page.evaluate(() => !document.querySelector('.markdang__filter-row')?.classList.contains('hidden')))
await page.click('.markdang__side-tab[title="选项"]')
await page.waitForTimeout(250)
const menuOutline = await page.evaluate(() => document.querySelector('.markdang__side-menu')?.textContent ?? '')
ok('ux: options menu has expand/collapse all', menuOutline.includes('展开全部') && menuOutline.includes('折叠全部'))
await page.keyboard.press('Escape')
await page.waitForTimeout(150)
await page.click('.markdang__side-tab[title="目录"]')
await page.waitForSelector('.markdang__folder-list li a', { timeout: 8000 }).catch(() => null)
await page.click('.markdang__side-tab[title="选项"]')
await page.waitForTimeout(250)
const menuFolder = await page.evaluate(() => document.querySelector('.markdang__side-menu')?.textContent ?? '')
ok('ux: folder menu has sort options', menuFolder.includes('排序方式') && menuFolder.includes('按名称') && menuFolder.includes('文件夹置顶'))
await page.keyboard.press('Escape')
await page.waitForTimeout(150)
await page.click('.markdang__side-tab:nth-child(2)')
await page.waitForTimeout(200)
ok('ux: parent outline items bold', await page.evaluate(() => {
  const li = document.querySelector('.markdang__outline-list li.has-children > a')
  return li && Number(getComputedStyle(li).fontWeight) >= 600
}))

/* 8. raw mode: sidebar gone, buttons stay, no overlap */
await page.click('.markdang__btn[title="原始内容"]')
await page.waitForTimeout(250)
const rawLayout = await page.evaluate(() => {
  const side = document.querySelector('.markdang__side')
  const host = document.querySelector('.markdang-host')
  const btn = document.querySelector('.markdang__btn[title="原始内容"]')
  const hostRect = host?.getBoundingClientRect()
  return {
    sideHidden: !side || getComputedStyle(side).display === 'none',
    btnVisible: !!btn && btn.getBoundingClientRect().width > 0,
    hostOnScreen: !!hostRect && hostRect.left >= 0 && hostRect.width > 300,
  }
})
ok('ux: raw hides sidebar, keeps buttons, no overlap', rawLayout.sideHidden && rawLayout.btnVisible && rawLayout.hostOnScreen, JSON.stringify(rawLayout))
await page.click('.markdang__btn[title="原始内容"]')

/* 9. dark mode button icons visible (stroke icons keep fill=none) */
await setStorage({ pageTheme: 'dark' })
await page.goto(furl('tests/fixtures/a.md'))
await page.waitForSelector('.markdang-content', { timeout: 10000 })
const darkBtn = await page.evaluate(() => {
  const btn = document.querySelector('.markdang__btn[title="原始内容"]')
  const path = btn?.querySelector('svg path')
  const iconColor = getComputedStyle(btn).color
  return {
    color: iconColor,
    pathFill: path ? getComputedStyle(path).fill : 'missing',
    theme: document.querySelector('.markdang').dataset.theme,
    raw: document.body.classList.contains('markdang-raw'),
    url: location.pathname,
  }
})
ok('ux: dark buttons light icon color', darkBtn.color === 'rgb(166, 181, 204)', JSON.stringify(darkBtn))
ok('ux: stroke icon keeps fill none', darkBtn.pathFill === 'none', darkBtn.pathFill)
await setStorage({ pageTheme: 'light' })

/* 10. popup plugin cards uniform insets */
await page.goto(`chrome-extension://${extId}/src/popup/index.html`)
await page.waitForSelector('.options.popup-mode', { timeout: 8000 })
await page.goto(`chrome-extension://${extId}/src/popup/index.html`)
await page.waitForSelector('.options.popup-mode', { timeout: 8000 })
await page.click('.popup-mode .rail button:has-text("插件")')
await page.waitForTimeout(300)
const insets = await page.evaluate(() => {
  const fields = Array.from(document.querySelectorAll('.popup-mode .plugin-block .field'))
  const paddings = fields.slice(0, 3).map(f => getComputedStyle(f).paddingLeft + '/' + getComputedStyle(f).paddingRight)
  return { count: fields.length, paddings, unique: new Set(paddings).size === 1 }
})
ok('ux: popup plugin cards uniform padding', insets.count >= 3 && insets.unique, JSON.stringify(insets))

await page.close()
await uxStorage.close()
await ctx.close()

const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
