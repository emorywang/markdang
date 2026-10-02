/* Every settings option must have an observable effect on the demo page. */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchExtension } from './browser.mjs'

const furl = p => pathToFileURL(path.resolve(p)).href
const DEMO = furl('demo/full-feature-test.md')
const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' | ' + extra : ''}`)
}

const { context: ctx, extId } = await launchExtension({ language: 'zh-CN' })

const store = await ctx.newPage()
await store.goto(`chrome-extension://${extId}/src/popup/index.html`)
const set = data => store.evaluate(d => chrome.storage.local.set(d), data)
const get = () => store.evaluate(() => chrome.storage.local.get(null))

const page = await ctx.newPage()
const gotoDemo = async () => {
  await page.goto(DEMO)
  await page.waitForSelector('.markdang-content', { timeout: 10000 })
}
const evalInPage = fn => page.evaluate(fn)

/* ---------- katex: bare + html block + html inline ---------- */
await gotoDemo()
const baseline = await evalInPage(() => ({
  display: document.querySelectorAll('.markdang-content .katex-display').length,
  total: document.querySelectorAll('.markdang-content .katex').length,
}))
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    Katex: {
      enableBareBlocks: true,
      enableMathBlockInHtml: true,
      enableMathInlineInHtml: true,
      enableFencedBlocks: true,
      throwOnError: false,
      errorColor: '#cc0000',
    },
  },
})
await gotoDemo()
const enabled = await evalInPage(() => ({
  display: document.querySelectorAll('.markdang-content .katex-display').length,
  total: document.querySelectorAll('.markdang-content .katex').length,
}))
ok('katex: bare block adds a display formula', enabled.display > baseline.display, `${baseline.display} -> ${enabled.display}`)
ok('katex: html math adds formulas', enabled.total > baseline.total, `${baseline.total} -> ${enabled.total}`)
ok('katex: fenced math no longer a plain code block', (await evalInPage(() => document.querySelectorAll('.markdang-content pre.markdang__code-block code.math').length)) === 0)
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    Katex: {
      enableBareBlocks: false,
      enableMathBlockInHtml: false,
      enableMathInlineInHtml: false,
      enableFencedBlocks: false,
      throwOnError: false,
      errorColor: '#cc0000',
    },
  },
})

/* ---------- alert containers individually ---------- */
await gotoDemo()
const containersOn = await evalInPage(() => document.querySelectorAll('.markdang-content .markdang__alert').length)
ok('alert: containers render by default', containersOn >= 5, String(containersOn))
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    Alert: {
      alertNames: ['important', 'note', 'tip', 'warning', 'caution'],
      deep: false,
      infoContainer: false,
      tipContainer: false,
      successContainer: false,
      warningContainer: false,
      dangerContainer: false,
    },
  },
})
await gotoDemo()
const containersOff = await evalInPage(() => document.querySelectorAll('.markdang-content .markdang__alert').length)
ok('alert: containers vanish when all switches off', containersOff === 0, String(containersOff))
const githubStillOn = await evalInPage(() => document.querySelectorAll('.markdang-content .markdown-alert').length)
ok('alert: github blockquote alerts unaffected', githubStillOn >= 5, String(githubStillOn))
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    Alert: {
      alertNames: ['important', 'note', 'tip', 'warning', 'caution'],
      deep: false,
      infoContainer: true,
      tipContainer: true,
      successContainer: true,
      warningContainer: true,
      dangerContainer: true,
    },
  },
})

/* ---------- alert names filter ---------- */
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    Alert: {
      alertNames: ['note'],
      deep: false,
      infoContainer: true,
      tipContainer: true,
      successContainer: true,
      warningContainer: true,
      dangerContainer: true,
    },
  },
})
await gotoDemo()
const namesState = await evalInPage(() => ({
  note: document.querySelectorAll('.markdang-content .markdown-alert-note').length,
  caution: document.querySelectorAll('.markdang-content .markdown-alert-caution').length,
}))
ok('alert: name filter keeps note, drops caution', namesState.note >= 1 && namesState.caution === 0, JSON.stringify(namesState))
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    Alert: {
      alertNames: ['important', 'note', 'tip', 'warning', 'caution'],
      deep: false,
      infoContainer: true,
      tipContainer: true,
      successContainer: true,
      warningContainer: true,
      dangerContainer: true,
    },
  },
})

/* ---------- multimd table options ---------- */
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    MultimdTable: { rowspan: true, multiline: true, headerless: true, multibody: true, autolabel: true },
  },
})
await gotoDemo()
const table = await evalInPage(() => {
  const tables = document.querySelectorAll('.markdang-content table')
  let rowspan = 0
  let caption = 0
  let bodies = 0
  let headerless = false
  tables.forEach(t => {
    t.querySelectorAll('[rowspan]').forEach(() => rowspan++)
    if (t.querySelector('caption')) caption++
    bodies += t.querySelectorAll('tbody').length
    if (!t.querySelector('thead')) headerless = true
  })
  return { rowspan, caption, bodies, headerless, count: tables.length }
})
ok('multimd: rowspan merges vertically', table.rowspan >= 1, JSON.stringify(table))
ok('multimd: caption label rendered', table.caption >= 1)
ok('multimd: autolabel adds anchor id (latin label)', await evalInPage(() => !!document.querySelector('.markdang-content caption#prototypetable')))
ok('multimd: autolabel renders caption anchor link', (await evalInPage(() => document.querySelectorAll('.markdang-content .markdang__caption-anchor').length)) >= 1)
ok('multimd: multiple table bodies', table.bodies >= 3, `bodies=${table.bodies}`)
ok('multimd: headerless table', table.headerless)
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    MultimdTable: { rowspan: false, multiline: false, headerless: false, multibody: false, autolabel: false },
  },
})
await gotoDemo()
const autolabelOff = await evalInPage(() =>
  Array.from(document.querySelectorAll('.markdang-content caption')).some(c => c.id !== ''),
)
ok('multimd: autolabel off -> no caption ids', !autolabelOff)

/* ---------- tasklists ---------- */
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    TaskLists: { enabled: true, label: true, labelAfter: true },
  },
})
await gotoDemo()
const taskLabel = await evalInPage(() => {
  const li = document.querySelector('.markdang-content li.task-list-item')
  const input = li?.querySelector('.task-list-item-checkbox')
  const label = li?.querySelector('label')
  return {
    hasLabel: !!label,
    enabled: li?.classList.contains('enabled'),
    bullets: getComputedStyle(li).listStyleType,
    labelBeforeInput: !!input && !!label && label.getBoundingClientRect().left < input.getBoundingClientRect().left,
  }
})
ok('tasklist: interactive + label present', taskLabel.hasLabel && taskLabel.enabled, JSON.stringify(taskLabel))
ok('tasklist: no list bullets', taskLabel.bullets === 'none')
ok('tasklist: option on -> text before checkbox', taskLabel.labelBeforeInput)
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    TaskLists: { enabled: true, label: true, labelAfter: false },
  },
})
await gotoDemo()
const checkboxFirst = await evalInPage(() => {
  const li = document.querySelector('.markdang-content li.task-list-item')
  const input = li?.querySelector('.task-list-item-checkbox')
  const label = li?.querySelector('label')
  if (!input || !label) return false
  const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
  if (!text) return false
  const range = document.createRange()
  range.selectNodeContents(text)
  return input.getBoundingClientRect().right <= range.getBoundingClientRect().left
})
ok('tasklist: option off -> checkbox before text', checkboxFirst)
await set({
  mdPluginOptions: {
    ...(await get()).mdPluginOptions,
    TaskLists: { enabled: false, label: false, labelAfter: false },
  },
})

/* ---------- plantuml ---------- */
const DEFAULT_PLUGINS = ['Breaks', 'Linkify', 'Typographer', 'Emoji', 'Sup', 'Sub', 'TOC', 'Ins', 'Mark', 'Katex', 'Mermaid', 'Abbr', 'Deflist', 'Footnote', 'FrontMatter', 'MultimdTable', 'TaskLists', 'Alert']
await set({ mdPlugins: [...DEFAULT_PLUGINS, 'PlantUML'] })
await gotoDemo()
ok('plantuml: image rendered from server url', (await evalInPage(() => document.querySelectorAll('.markdang-content .markdang__plantuml img[src*="plantuml"]').length)) === 1)
await set({ mdPlugins: DEFAULT_PLUGINS })

/* ---------- linkify email ---------- */
await set({ mdPlugins: ['Linkify'], mdPluginOptions: { ...(await get()).mdPluginOptions, Linkify: { fuzzyLink: false, fuzzyIP: false, fuzzyEmail: true } } })
await gotoDemo()
const emailLinked = await evalInPage(() => document.querySelectorAll('.markdang-content a[href^="mailto:"]').length)
await set({ mdPluginOptions: { ...(await get()).mdPluginOptions, Linkify: { fuzzyLink: false, fuzzyIP: false, fuzzyEmail: false } } })
await gotoDemo()
const emailPlain = await evalInPage(() => document.querySelectorAll('.markdang-content a[href^="mailto:"]').length)
ok('linkify: email toggles with fuzzyEmail', emailLinked >= 1 && emailPlain === 0, `${emailLinked} -> ${emailPlain}`)
await set({ mdPlugins: DEFAULT_PLUGINS })

/* ---------- code theme readability: light page + dark day theme ---------- */
await set({ pageTheme: 'light', codeBlockDayTheme: 'dark' })
await gotoDemo()
const codeStyle = await evalInPage(() => {
  const pre = document.querySelector('.markdang-content pre.markdang__code-block')
  return { bg: getComputedStyle(pre).backgroundColor, color: getComputedStyle(pre.querySelector('code')).color }
})
ok('code: dark theme on light page -> light text', codeStyle.bg === 'rgb(13, 17, 23)' && codeStyle.color === 'rgb(201, 209, 217)', JSON.stringify(codeStyle))
await set({ pageTheme: 'light', codeBlockDayTheme: 'light' })
await gotoDemo()
const codeLight = await evalInPage(() => {
  const pre = document.querySelector('.markdang-content pre.markdang__code-block')
  return { bg: getComputedStyle(pre).backgroundColor, color: getComputedStyle(pre.querySelector('code')).color }
})
ok('code: light theme on light page -> dark text', codeLight.bg === 'rgb(246, 248, 250)' && codeLight.color === 'rgb(36, 41, 47)', JSON.stringify(codeLight))

await page.close()
await store.close()
await ctx.close()

const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
