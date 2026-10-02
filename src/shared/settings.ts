/* Settings schema — storage keys are part of the public contract; upgrades forward-merge with defaults. */

export const TEXT_SIZES = ['Tiny', 'Small', 'Normal', 'Medium', 'Large', 'Extra Large'] as const
export type TextSize = (typeof TEXT_SIZES)[number]
export const TEXT_SIZE_PX: Record<TextSize, number> = {
  Tiny: 12,
  Small: 14,
  Normal: 16,
  Medium: 18,
  Large: 20,
  'Extra Large': 24,
}

export const FONTS = ['Default', 'System', 'Serif', 'Monospace'] as const
export type FontKey = (typeof FONTS)[number]
export const FONT_STACKS: Record<FontKey, string> = {
  Default: '',
  System:
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  Serif: "Georgia, 'Times New Roman', 'Songti SC', SimSun, serif",
  Monospace: "ui-monospace, Consolas, 'JetBrains Mono', Menlo, monospace",
}

export type Theme = 'light' | 'dark' | 'auto'
export type CodeTheme = 'light' | 'dark'
export type Mode = 'normal' | 'zen'

export interface MdPluginOptions {
  Linkify: { fuzzyLink: boolean; fuzzyIP: boolean; fuzzyEmail: boolean }
  TOC: {
    includeLevel: number[]
    containerClass: string
    markerPattern: string
    omitTag: string
    listType: 'ul' | 'ol'
  }
  Katex: {
    enableBareBlocks: boolean
    enableMathBlockInHtml: boolean
    enableMathInlineInHtml: boolean
    enableFencedBlocks: boolean
    throwOnError: boolean
    errorColor: string
  }
  Mermaid: { theme: 'auto' | 'default' | 'dark' | 'neutral' | 'forest'; json: string }
  MultimdTable: {
    rowspan: boolean
    multiline: boolean
    headerless: boolean
    multibody: boolean
    autolabel: boolean
  }
  TaskLists: { enabled: boolean; label: boolean; labelAfter: boolean }
  Alert: {
    alertNames: string[]
    deep: boolean
    infoContainer: boolean
    tipContainer: boolean
    successContainer: boolean
    warningContainer: boolean
    dangerContainer: boolean
  }
  FrontMatter: { showMetadata: boolean }
}

export interface Settings {
  /* general */
  enable: boolean
  enableFolderUrl: boolean
  enableTxtExt: boolean
  centered: boolean
  enableCustomContentWidth: boolean
  customContentData: { unit: 'px' | '%'; maxWidth: number; maxPercent: number }
  codeWrap: boolean
  refresh: boolean
  refreshInterval: number
  charsetCompat: boolean
  charset: string
  language: string
  /* appearance */
  pageTheme: Theme
  codeBlockDayTheme: CodeTheme
  codeBlockNightTheme: CodeTheme
  zenMode: boolean
  textFont: FontKey
  textSize: TextSize
  customCSS: string
  enableCustomCSS: boolean
  isOutlineExpandable: boolean
  maxOutlineExpandLevel: number
  sideCollapsed: boolean
  /* plugins */
  mdPlugins: string[]
  mdPluginOptions: MdPluginOptions
  /* misc */
  mode: Mode
  skipGuide: boolean
}

export const MD_PLUGIN_LIST = [
  'Breaks',
  'Linkify',
  'Typographer',
  'Emoji',
  'Sup',
  'Sub',
  'TOC',
  'Ins',
  'Mark',
  'Katex',
  'Mermaid',
  'PlantUML',
  'Abbr',
  'Deflist',
  'Footnote',
  'FrontMatter',
  'MultimdTable',
  'TaskLists',
  'Alert',
] as const

export const DEFAULT_MD_PLUGINS: string[] = MD_PLUGIN_LIST.filter(n => n !== 'PlantUML')

export function defaultSettings(): Settings {
  return {
    enable: true,
    enableFolderUrl: true,
    enableTxtExt: true,
    centered: true,
    enableCustomContentWidth: false,
    customContentData: { unit: 'px', maxWidth: 1000, maxPercent: 50 },
    codeWrap: false,
    refresh: false,
    refreshInterval: 0.5,
    charsetCompat: false,
    charset: 'utf-8',
    language: chrome?.i18n?.getUILanguage?.() ?? 'en',
    pageTheme: 'auto',
    codeBlockDayTheme: 'light',
    codeBlockNightTheme: 'dark',
    zenMode: false,
    textFont: 'Default',
    textSize: 'Medium',
    customCSS: '',
    enableCustomCSS: false,
    isOutlineExpandable: true,
    maxOutlineExpandLevel: 6,
    sideCollapsed: false,
    mdPlugins: [...DEFAULT_MD_PLUGINS],
    mdPluginOptions: {
      Linkify: { fuzzyLink: false, fuzzyIP: false, fuzzyEmail: true },
      TOC: {
        includeLevel: [1, 2],
        containerClass: 'table-of-contents',
        markerPattern: '/^\\[\\[toc\\]\\]/im',
        omitTag: '<!-- omit from toc -->',
        listType: 'ul',
      },
      Katex: {
        enableBareBlocks: false,
        enableMathBlockInHtml: false,
        enableMathInlineInHtml: false,
        enableFencedBlocks: false,
        throwOnError: false,
        errorColor: '#cc0000',
      },
      Mermaid: { theme: 'auto', json: '{\n  "theme": "auto",\n  "startOnLoad": false\n}' },
      MultimdTable: {
        rowspan: false,
        multiline: false,
        headerless: false,
        multibody: false,
        autolabel: false,
      },
      TaskLists: { enabled: false, label: false, labelAfter: false },
      Alert: {
        alertNames: ['important', 'note', 'tip', 'warning', 'caution'],
        deep: false,
        infoContainer: true,
        tipContainer: true,
        successContainer: true,
        warningContainer: true,
        dangerContainer: true,
      },
      FrontMatter: { showMetadata: false },
    },
    mode: 'normal',
    skipGuide: false,
  }
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

function mergeDefaults(base: Settings, patch: DeepPartial<Settings>): Settings {
  const out: Settings = { ...base }
  for (const key of Object.keys(base) as (keyof Settings)[]) {
    const value = (patch as any)[key]
    if (value === undefined) continue
    const fallback = base[key]
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
      ;(out as any)[key] = { ...(fallback as object), ...(value as object) }
    } else {
      ;(out as any)[key] = value
    }
  }
  return out
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(null)
  return mergeDefaults(defaultSettings(), stored as DeepPartial<Settings>)
}

export async function saveSettings(patch: DeepPartial<Settings>): Promise<Settings> {
  const current = await loadSettings()
  const next = mergeDefaults(current, patch)
  await chrome.storage.local.set(next as unknown as Record<string, unknown>)
  return next
}

export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const listener = async () => cb(await loadSettings())
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

/* markdown-it behaves differently when these settings change */
export const MD_RELEVANT_KEYS: (keyof Settings)[] = [
  'mdPlugins',
  'mdPluginOptions',
  'pageTheme',
  'codeWrap',
]

export function isMdRelevant(before: Settings, after: Settings): boolean {
  return MD_RELEVANT_KEYS.some(key => {
    const a = JSON.stringify(before[key])
    const b = JSON.stringify(after[key])
    return a !== b
  })
}
