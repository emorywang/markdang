import { test } from 'node:test'
import assert from 'node:assert/strict'

type Listener = (message: unknown, sender: chrome.runtime.MessageSender, callback: (value: unknown) => void) => boolean
let listener: Listener
let created: { id: number; url: string }[] = []
let removed: number[] = []
let stored: Record<string, unknown> = {}
let id = 10
const sender: chrome.runtime.MessageSender = { id: 'test', frameId: 0, tab: { id: 1 } as chrome.tabs.Tab, url: 'file:///docs/a.md' }
globalThis.chrome = {
  runtime: { id: 'test', onMessage: { addListener: (value: Listener) => { listener = value } } },
  storage: { local: { get: async () => structuredClone(stored), set: async (patch: Record<string, unknown>) => { stored = { ...stored, ...patch } } } },
  tabs: {
    create: async ({ url }: { url: string }) => { const tab = { id: id++, url }; created.push(tab); return tab },
    remove: async (tabId: number) => { removed.push(tabId) },
    onRemoved: { addListener: () => {} },
  },
  commands: { onCommand: { addListener: () => {} } },
} as unknown as typeof chrome
await import('../../src/background/index')
const send = (action: string, data: unknown, source = sender): Promise<unknown> => new Promise(resolve => {
  const pending = listener({ action, data }, source, resolve)
  if (!pending && !['probeStatus', 'docContent', 'dirEntries', 'probeDoc', 'listDir'].includes(action)) resolve(null)
})
const flush = () => new Promise<void>(resolve => queueMicrotask(resolve))
const reportSender = (tab: { id: number; url: string }): chrome.runtime.MessageSender => ({ id: 'test', frameId: 0, tab: tab as chrome.tabs.Tab, url: tab.url })

test('worker serializes simultaneous partial settings writes', async () => {
  stored = {}
  await Promise.all([
    send('settingsPatch', { textSize: 'Large' }),
    send('settingsPatch', { codeWrap: true }),
    send('settingsPatch', { mdPluginOptions: { Katex: { enableBareBlocks: true } } }),
    send('settingsPatch', { mdPluginOptions: { TOC: { listType: 'ol' } } }),
  ])
  assert.equal(stored.textSize, 'Large')
  assert.equal(stored.codeWrap, true)
  const options = stored.mdPluginOptions as { Katex: { enableBareBlocks: boolean }; TOC: { listType: string } }
  assert.equal(options.Katex.enableBareBlocks, true)
  assert.equal(options.TOC.listType, 'ol')
})

test('local document polls are fresh and ordinary tabs are not probes', async () => {
  created = []; removed = []
  const first = send('probeDoc', { url: 'file:///docs/a.md' })
  await flush()
  const tab1 = created[0]
  assert.equal(await send('probeStatus', {}, sender), null)
  assert.equal(await send('probeStatus', {}, reportSender(tab1)), 'doc')
  await send('docContent', { text: 'first' }, reportSender(tab1))
  assert.equal(await first, 'first')
  const second = send('probeDoc', { url: 'file:///docs/a.md' })
  await flush()
  const tab2 = created[1]
  assert.notEqual(tab1.url, tab2.url)
  await send('docContent', { text: 'second' }, reportSender(tab2))
  assert.equal(await second, 'second')
  assert.deepEqual(removed, [tab1.id, tab2.id])
})

test('a document can probe only itself or its immediate parent', async () => {
  const count = created.length
  assert.equal(await send('probeDoc', { url: 'file:///private/secret.md' }), null)
  assert.equal(await send('listDir', { url: 'file:///' }), null)
  assert.equal(created.length, count)
})

test('completed probe timers cannot settle the next request', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const first = send('probeDoc', { url: 'file:///docs/a.md' })
  await flush()
  const tab1 = created.at(-1)!
  await send('docContent', { text: 'first' }, reportSender(tab1))
  assert.equal(await first, 'first')
  t.mock.timers.tick(7000)
  const second = send('probeDoc', { url: 'file:///docs/a.md' })
  await flush()
  const tab2 = created.at(-1)!
  t.mock.timers.tick(1001)
  assert.equal(await send('probeStatus', {}, reportSender(tab2)), 'doc')
  await send('docContent', { text: 'fresh' }, reportSender(tab2))
  assert.equal(await second, 'fresh')
})

test('timeout closes the probe tab and resolves its callers', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const request = send('probeDoc', { url: 'file:///docs/a.md' })
  await flush()
  const tab = created.at(-1)!
  t.mock.timers.tick(8001)
  assert.equal(await request, null)
  assert.ok(removed.includes(tab.id))
})
