import type { DirEntry, ProbeKind } from '../shared/ipc'
import { isRecord, persistSettings } from '../shared/settings'

const PROBE_TIMEOUT = 8000
type ProbeResult = DirEntry[] | string | null
interface Probe {
  key: string
  kind: ProbeKind
  tabUrl: string
  tabId?: number
  timer?: ReturnType<typeof setTimeout>
  waiters: ((result: ProbeResult) => void)[]
}
const probes = new Map<string, Probe>()

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'install') return
  void chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html?welcome') }).catch(error => {
    console.warn('[markdang] could not open the welcome page', error)
  })
})

function closeTab(id: number) {
  void chrome.tabs.remove(id).catch(() => {})
}

function settle(probe: Probe, result: ProbeResult) {
  if (probes.get(probe.key) !== probe) return
  clearTimeout(probe.timer)
  probes.delete(probe.key)
  for (const wait of probe.waiters) wait(result)
  if (probe.tabId !== undefined) closeTab(probe.tabId)
}

function canonicalFileUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'file:') return null
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

function authorizedUrl(value: unknown, sender: chrome.runtime.MessageSender, kind: ProbeKind): string | null {
  if (typeof value !== 'string' || sender.frameId !== 0 || sender.tab?.id === undefined) return null
  const source = canonicalFileUrl(sender.url ?? '')
  const target = canonicalFileUrl(value)
  if (!source || !target) return null
  const expected = kind === 'dir' ? new URL('./', source).href : source
  return target === expected ? target : null
}

function requestViaTab(url: string, kind: ProbeKind): Promise<ProbeResult> {
  const key = `${kind}:${url}`
  return new Promise(resolve => {
    const existing = probes.get(key)
    if (existing) {
      existing.waiters.push(resolve)
      return
    }
    const tabUrl = new URL(url)
    tabUrl.hash = `markdang-probe=${crypto.randomUUID()}`
    const probe: Probe = { key, kind, tabUrl: tabUrl.href, waiters: [resolve] }
    probes.set(key, probe)
    probe.timer = setTimeout(() => settle(probe, null), PROBE_TIMEOUT)
    void chrome.tabs.create({ url: probe.tabUrl, active: false }).then(tab => {
      if (tab.id === undefined) return settle(probe, null)
      if (probes.get(key) !== probe) return closeTab(tab.id)
      probe.tabId = tab.id
    }).catch(() => settle(probe, null))
  })
}

function senderProbe(sender: chrome.runtime.MessageSender): Probe | undefined {
  if (sender.frameId !== 0 || sender.tab?.id === undefined) return
  for (const probe of probes.values()) {
    if (probe.tabUrl === sender.url && (probe.tabId === undefined || probe.tabId === sender.tab.id)) {
      probe.tabId = sender.tab.id
      return probe
    }
  }
}

let settingsWrites: Promise<unknown> = Promise.resolve()
chrome.runtime.onMessage.addListener((message: unknown, sender, callback) => {
  if (!isRecord(message) || sender.id !== chrome.runtime.id) return false
  const { action, data } = message
  if (action === 'settingsPatch') {
    const write = settingsWrites.then(() => persistSettings(data))
    settingsWrites = write.catch(() => {})
    void write.then(settings => callback({ settings }), error => callback({ error: String(error) }))
    return true
  }
  if (action === 'probeStatus') {
    callback(senderProbe(sender)?.kind ?? null)
    return false
  }
  if (!isRecord(data)) return false
  if (action === 'listDir' || action === 'probeDoc') {
    const kind = action === 'listDir' ? 'dir' : 'doc'
    const url = authorizedUrl(data.url, sender, kind)
    if (!url) {
      callback(null)
      return false
    }
    void requestViaTab(url, kind).then(callback)
    return true
  }
  const probe = senderProbe(sender)
  if (action === 'docContent' && probe?.kind === 'doc' && typeof data.text === 'string') {
    settle(probe, data.text)
    callback(true)
  } else if (action === 'dirEntries' && probe?.kind === 'dir' && Array.isArray(data.entries)) {
    const entries = data.entries.filter((entry: unknown): entry is DirEntry =>
      isRecord(entry) && typeof entry.name === 'string' && typeof entry.href === 'string' &&
      typeof entry.isDir === 'boolean' && canonicalFileUrl(entry.href) !== null,
    )
    settle(probe, entries)
    callback(true)
  } else return false
  return false
})

chrome.tabs.onRemoved.addListener(id => {
  for (const probe of probes.values()) if (probe.tabId === id) settle(probe, null)
})

chrome.commands.onCommand.addListener(command => {
  void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab?.id === undefined) return
    return chrome.tabs.sendMessage(tab.id, { action: 'command', command })
  }).catch(() => {})
})
