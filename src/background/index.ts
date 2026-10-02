import type { DirEntry } from '../shared/ipc'

/* ------------------------------------------------------------------ *
 * file:// directory & document access
 *
 * Content scripts cannot fetch `file:` URLs, so readers ask the
 * background to open the target in an inactive tab; the injected
 * script there either reports directory entries (dir pages) or
 * answers a raw-document query (md/txt pages), then the tab is
 * closed. Dir and doc probes are strictly separated: the tab-load
 * handler only queries documents, and entry reports only resolve
 * directory probes — they can never clobber each other.
 * ------------------------------------------------------------------ */

const PROBE_TIMEOUT = 8000

type ProbeKind = 'dir' | 'doc'

interface Probe {
  kind: ProbeKind
  waiters: ((result: any) => void)[]
  tabId?: number
  timer?: ReturnType<typeof setTimeout>
}

const dirCache = new Map<string, DirEntry[]>()
const docCache = new Map<string, string | null>()
const probes = new Map<string, Probe>()

function settle(url: string, result: any) {
  const probe = probes.get(url)
  if (!probe) return
  probe.waiters.forEach(wait => wait(result))
  probes.delete(url)
  if (probe.tabId !== undefined) chrome.tabs.remove(probe.tabId).catch(() => {})
}

function requestViaTab<T>(url: string, kind: ProbeKind): Promise<T | null> {
  if (!url.startsWith('file:')) return Promise.resolve(null)
  const cache = kind === 'dir' ? dirCache : docCache
  if (cache.has(url)) return Promise.resolve((cache.get(url) ?? null) as T | null)

  return new Promise(resolve => {
    const existing = probes.get(url)
    if (existing) {
      if (existing.kind !== kind) return resolve(null) // conflicting probe in flight
      existing.waiters.push(resolve)
      return
    }
    const probe: Probe = { kind, waiters: [resolve] }
    probes.set(url, probe)
    probe.timer = setTimeout(() => settle(url, cache.get(url) ?? null), PROBE_TIMEOUT)
    chrome.tabs.create({ url, active: false }, tab => {
      if (tab?.id === undefined) {
        clearTimeout(probe.timer)
        settle(url, null)
        return
      }
      probe.tabId = tab.id
    })
  })
}

chrome.runtime.onMessage.addListener(({ action, data }, _sender, callback) => {
  switch (action) {
    case 'listDir': {
      const url: string = data?.url ?? ''
      requestViaTab<DirEntry[]>(url, 'dir').then(callback)
      return true
    }
    case 'dirEntries': {
      const url: string = data?.url ?? ''
      const probe = probes.get(url)
      /* only directory probes accept entry reports */
      if (Array.isArray(data?.entries) && (!probe || probe.kind === 'dir')) {
        dirCache.set(url, data.entries)
        settle(url, data.entries)
      }
      callback?.(true)
      return true
    }
    case 'docContent': {
      const url: string = data?.url ?? ''
      const probe = probes.get(url)
      if (probe?.kind === 'doc' && typeof data?.text === 'string') {
        docCache.set(url, data.text)
        settle(url, data.text)
      }
      callback?.(true)
      return true
    }
    case 'probeDoc': {
      const url: string = data?.url ?? ''
      requestViaTab<string | null>(url, 'doc').then(callback)
      return true
    }
    default:
      return false
  }
})

/* when a probed md/txt tab finishes loading, ask it for its raw source */
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== 'complete') return
  chrome.tabs
    .get(tabId)
    .then(tab => {
      const url = tab.url ?? tab.pendingUrl
      const probe = url ? probes.get(url) : undefined
      if (!url || !probe || probe.kind !== 'doc' || probe.tabId !== tabId) return
      chrome.tabs
        .sendMessage(tabId, { action: 'getRawDoc' })
        .then((res: any) => {
          if (res && typeof res?.text === 'string') {
            docCache.set(url, res.text)
            settle(url, res.text)
          }
        })
        .catch(() => {})
    })
    .catch(() => {})
})

/* keyboard shortcuts */
const CYCLE: string[] = ['light', 'dark', 'auto']

chrome.commands.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return
  const patch: Record<string, unknown> = {}
  if (command === 'toggleSide') patch.sideCollapsed = 'toggle'
  if (command === 'toggleCentered') patch.centered = 'toggle'
  if (command === 'toggleRefresh') patch.refresh = 'toggle'
  if (command === 'toggleTheme') {
    const { pageTheme } = await chrome.storage.local.get('pageTheme')
    patch.pageTheme = CYCLE[(CYCLE.indexOf((pageTheme as string) ?? 'auto') + 1) % CYCLE.length]
  }
  chrome.tabs.sendMessage(tab.id, { action: 'settingsToggle', data: patch }).catch(() => {})
})
