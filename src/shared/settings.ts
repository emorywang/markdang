import { sendMessage } from './ipc'
import { normalizeLanguage, type Language } from './i18n'

/* Storage keys remain stable; old and partial records are normalized on read. */

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
  language: Language
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
    language: 'auto',
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

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function mergeKnown(base: unknown, patch: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(patch) ? [...patch] : [...base]
  if (isRecord(base)) {
    const source = isRecord(patch) ? patch : {}
    return Object.fromEntries(Object.entries(base).map(([key, value]) => [
      key, mergeKnown(value, Object.hasOwn(source, key) ? source[key] : undefined),
    ]))
  }
  if (typeof patch !== typeof base || (typeof patch === 'number' && !Number.isFinite(patch))) return base
  return patch
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
function choice<T extends string>(value: T, values: readonly T[], fallback: T): T {
  return values.includes(value) ? value : fallback
}

export function normalizeSettings(value: unknown): Settings {
  const s = mergeKnown(defaultSettings(), value) as Settings
  s.language = normalizeLanguage(s.language)
  s.mdPlugins = [...new Set(s.mdPlugins.filter(name => MD_PLUGIN_LIST.includes(name as typeof MD_PLUGIN_LIST[number])))]
  s.pageTheme = choice(s.pageTheme, ['auto', 'light', 'dark'], 'auto')
  s.codeBlockDayTheme = choice(s.codeBlockDayTheme, ['light', 'dark'], 'light')
  s.codeBlockNightTheme = choice(s.codeBlockNightTheme, ['light', 'dark'], 'dark')
  s.textSize = choice(s.textSize, TEXT_SIZES, 'Medium')
  s.textFont = choice(s.textFont, FONTS, 'Default')
  s.mode = choice(s.mode, ['normal', 'zen'], 'normal')
  s.refreshInterval = clamp(s.refreshInterval, 0.5, 600)
  s.maxOutlineExpandLevel = Math.round(clamp(s.maxOutlineExpandLevel, 1, 6))
  s.customContentData.unit = choice(s.customContentData.unit, ['px', '%'], 'px')
  s.customContentData.maxWidth = clamp(s.customContentData.maxWidth, 500, 3000)
  s.customContentData.maxPercent = clamp(s.customContentData.maxPercent, 10, 100)
  const opts = s.mdPluginOptions
  opts.TOC.includeLevel = [...new Set(opts.TOC.includeLevel.filter(n => Number.isInteger(n) && n >= 1 && n <= 6))].sort()
  opts.TOC.listType = choice(opts.TOC.listType, ['ul', 'ol'], 'ul')
  opts.Mermaid.theme = choice(opts.Mermaid.theme, ['auto', 'default', 'dark', 'neutral', 'forest'], 'auto')
  opts.Katex.errorColor = /^#[0-9a-f]{6}$/i.test(opts.Katex.errorColor) ? opts.Katex.errorColor : '#cc0000'
  opts.Alert.alertNames = [...new Set(opts.Alert.alertNames.filter(name =>
    ['important', 'note', 'tip', 'warning', 'caution', 'info', 'danger'].includes(name),
  ))]
  return s
}

export function mergeSettings(base: Settings, patch: unknown): Settings {
  return normalizeSettings(mergeKnown(base, patch))
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(null)
  return normalizeSettings(stored)
}

export async function saveSettings(patch: DeepPartial<Settings>): Promise<Settings> {
  const response = await sendMessage('settingsPatch', patch)
  if (!response || 'error' in response) throw new Error(response?.error ?? 'Could not save settings')
  return response.settings
}

/* The service worker serializes these writes across all extension pages. */
export async function persistSettings(patch: unknown): Promise<Settings> {
  if (!isRecord(patch)) throw new TypeError('Settings patch must be an object')
  const next = mergeSettings(await loadSettings(), patch)
  const changed = Object.fromEntries(Object.keys(next).filter(key => Object.hasOwn(patch, key)).map(key =>
    [key, next[key as keyof Settings]],
  ))
  await chrome.storage.local.set(changed)
  return next
}

export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const listener = (_changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local') void loadSettings().then(cb).catch(error => console.error('[markdang] settings', error))
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

/* markdown-it behaves differently when these settings change */
export const MD_RELEVANT_KEYS: (keyof Settings)[] = [
  'mdPlugins',
  'mdPluginOptions',
  'pageTheme',
]

export function isMdRelevant(before: Settings, after: Settings): boolean {
  return MD_RELEVANT_KEYS.some(key => {
    const a = JSON.stringify(before[key])
    const b = JSON.stringify(after[key])
    return a !== b
  })
}
