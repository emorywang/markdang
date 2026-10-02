import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchExtension } from './browser.mjs'

const { context, extId } = await launchExtension()
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'markdang-i18n-'))
let assertions = 0
const ok = (name, value) => { assert.ok(value, name); assertions++; console.log(`PASS  ${name}`) }
try {
  const options = await context.newPage()
  await options.goto(`chrome-extension://${extId}/src/options/index.html`)
  await options.waitForSelector('.options')
  const browserLanguage = await options.evaluate(() => chrome.i18n.getUILanguage())
  const automatic = /^zh(?:[-_]|$)/i.test(browserLanguage) ? 'zh-CN' : 'en'
  await options.waitForFunction(lang => document.documentElement.lang === lang, automatic)
  ok('a fresh install selects Auto and follows the browser UI language', await options.locator('select[aria-label]').inputValue() === 'auto')
  ok('native extension metadata is localized without exposing message tokens', await options.evaluate(() => !chrome.runtime.getManifest().description.includes('__MSG_')))

  const chooseLanguage = async language => {
    await options.locator('.rail-nav button').first().click()
    await options.locator('select[aria-label]').selectOption(language)
    const locale = language === 'auto' ? automatic : language
    await options.waitForFunction(locale => document.documentElement.lang === locale, locale)
    await options.waitForFunction(language => new Promise(resolve => chrome.storage.local.get('language', s => resolve(s.language === language))), language)
  }
  await chooseLanguage('en')
  ok('English settings title and navigation are translated', await options.title() === 'MarkDang · Settings' && await options.getByRole('button', { name: 'Appearance', exact: true }).isVisible())

  const popup = await context.newPage()
  await popup.setViewportSize({ width: 400, height: 600 })
  await popup.goto(`chrome-extension://${extId}/src/popup/index.html`)
  await popup.waitForSelector('.popup-mode')
  const file = path.join(temp, 'document.md')
  await fs.writeFile(file, '# Heading\n\n## Child\n\n- [ ] Keep state\n\n```js\nconst value = 1\n```\n')
  await options.evaluate(() => chrome.runtime.sendMessage({ action: 'settingsPatch', data: { mdPluginOptions: { TaskLists: { enabled: true } } } }))
  const reader = await context.newPage()
  const errors = []
  for (const page of [options, popup, reader]) page.on('pageerror', error => errors.push(error.message))
  await reader.goto(pathToFileURL(file).href)
  await reader.waitForSelector('.markdang-content')
  await reader.locator('.task-list-item input').check()
  await reader.getByRole('button', { name: 'Toggle section: Heading', exact: true }).click()
  await reader.evaluate(() => { window.markdangContentSnapshot = document.querySelector('.markdang-content').firstElementChild })

  await chooseLanguage('zh-CN')
  await popup.waitForFunction(() => document.documentElement.lang === 'zh-CN')
  await reader.waitForFunction(() => document.querySelector('.markdang')?.lang === 'zh-CN')
  ok('language updates an already open popup', await popup.getByRole('button', { name: '通用', exact: true }).isVisible())
  ok('reader controls and search prompts update live', await reader.getByRole('button', { name: '原始内容', exact: true }).isVisible() && await reader.locator('input[placeholder="筛选标题"]').count() === 1)
  ok('switching language preserves document nodes and checked tasks', await reader.evaluate(() => window.markdangContentSnapshot === document.querySelector('.markdang-content').firstElementChild && document.querySelector('.task-list-item input').checked))
  ok('switching language preserves outline folds and updates their accessible labels', await reader.locator('.markdang__outline-list li').first().evaluate(li => li.classList.contains('folded')) && await reader.getByRole('button', { name: '折叠/展开 Heading', exact: true }).count() === 1)

  await options.getByRole('button', { name: '关于', exact: true }).click()
  const chineseSupport = await options.locator('.support a').evaluateAll(links => links.map(a => ({ href: a.href, rel: a.rel, target: a.target })))
  ok('Chinese About offers Afdian and Ko-fi as external links', chineseSupport.length === 2 && chineseSupport.some(a => a.href === 'https://afdian.com/a/emory') && chineseSupport.some(a => a.href === 'https://ko-fi.com/emorywang') && chineseSupport.every(a => a.target === '_blank' && a.rel.includes('noopener') && a.rel.includes('noreferrer')))
  ok('Chinese About links to the Chinese privacy policy', (await options.getByRole('link', { name: '隐私声明' }).getAttribute('href')).endsWith('/PRIVACY.zh-CN.md'))

  await chooseLanguage('en')
  await popup.waitForFunction(() => document.documentElement.lang === 'en')
  await reader.waitForFunction(() => document.querySelector('.markdang')?.lang === 'en')
  ok('reader copy controls use the selected language', await reader.getByRole('button', { name: 'Copy code', exact: true }).count() === 1)
  await options.getByRole('button', { name: 'About', exact: true }).click()
  ok('English About shows a concise Ko-fi support message', await options.locator('.support p').innerText() === 'Buy me a coffee to support my work.' && await options.locator('.support a').count() === 1 && await options.locator('.support a').getAttribute('href') === 'https://ko-fi.com/emorywang')

  for (const section of ['General', 'Appearance', 'Plugins', 'About']) {
    await options.getByRole('button', { name: section, exact: true }).click()
    if (section === 'Plugins') for (const gear of await options.locator('button.gear').all()) await gear.click()
    const text = (await options.locator('main').innerText()).replaceAll('简体中文', '').replaceAll('码刻档', '')
    ok(`${section} and its expanded options have complete English text`, !/\p{Script=Han}/u.test(text))
  }

  ok('settings and reader sidebars use larger, independent text', await options.locator('.rail-nav button').first().evaluate(b => Number.parseFloat(getComputedStyle(b).fontSize) >= 15) && await reader.locator('.markdang__outline-list a').first().evaluate(a => Number.parseFloat(getComputedStyle(a).fontSize) >= 15))
  const fits = () => popup.evaluate(() => {
    const width = innerWidth
    return document.documentElement.scrollWidth <= width && [...document.querySelectorAll('.rail button')].every(b => b.getBoundingClientRect().right <= width)
  })
  for (const section of ['General', 'Appearance', 'Plugins', 'About']) {
    await popup.getByRole('button', { name: section, exact: true }).click()
    ok(`English popup ${section} fits within 400 px`, await fits())
  }
  ok('popup menu text is at least 14 px', await popup.locator('.rail-nav button').first().evaluate(b => Number.parseFloat(getComputedStyle(b).fontSize) >= 14))

  await popup.close()
  const reopened = await context.newPage()
  await reopened.goto(`chrome-extension://${extId}/src/popup/index.html`)
  await reopened.waitForSelector('.popup-mode')
  ok('manual language survives reopening the popup', await reopened.locator('select[aria-label]').inputValue() === 'en')
  await options.getByRole('button', { name: 'General', exact: true }).click()
  await options.getByRole('button', { name: 'Reset settings', exact: true }).click()
  await options.waitForFunction(() => document.querySelector('select[aria-label]')?.value === 'auto')
  ok('reset returns to Auto and the browser language', await options.evaluate(() => document.documentElement.lang) === automatic)
  ok('language changes do not cause page errors', errors.length === 0)
  console.log(`Language regression checks passed: ${assertions}`)
} finally {
  await context.close()
  await fs.rm(temp, { recursive: true, force: true })
}
