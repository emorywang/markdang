import type { DeepPartial, Settings } from './settings'

export interface DirEntry {
  name: string
  href: string
  isDir: boolean
  size?: string
  date?: string
}

export type ProbeKind = 'dir' | 'doc'
export type IpcMap = {
  listDir: { url: string }
  dirEntries: { entries: DirEntry[] }
  probeDoc: { url: string }
  probeStatus: Record<string, never>
  docContent: { text: string }
  settingsPatch: DeepPartial<Settings>
}

type IpcResponses = {
  listDir: DirEntry[]
  dirEntries: boolean
  probeDoc: string
  probeStatus: ProbeKind
  docContent: boolean
  settingsPatch: { settings: Settings } | { error: string }
}

export function sendMessage<K extends keyof IpcMap>(action: K, data: IpcMap[K]): Promise<IpcResponses[K] | null> {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ action, data }, response => {
        resolve(chrome.runtime.lastError ? null : response ?? null)
      })
    } catch {
      resolve(null)
    }
  })
}
