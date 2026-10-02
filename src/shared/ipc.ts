export interface DirEntry {
  name: string
  href: string
  isDir: boolean
  size?: string
  date?: string
}

export type IpcMap = {
  /* content asks the background for a directory listing */
  listDir: { url: string }
  /* a hidden directory tab reports its entries back */
  dirEntries: { url: string; entries: DirEntry[] }
  /* background probes a hidden md tab for its raw text (auto refresh) */
  getRawDoc: Record<string, never>
  getRawDocResult: { text: string | null }
  /* content asks the background to re-probe its own document source */
  probeDoc: { url: string }
  /* content asks for re-fetch of its own document (auto refresh) */
  fetchDoc: { url: string }
  fetchDocResult: { text: string | null }
}

export type IpcAction = keyof IpcMap

export function sendMessage<K extends IpcAction>(
  action: K,
  data: IpcMap[K],
): Promise<any> {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ action, data }, res => {
        void chrome.runtime.lastError
        resolve(res)
      })
    } catch {
      resolve(null)
    }
  })
}
