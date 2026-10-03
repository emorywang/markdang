import katexCss from 'katex/dist/katex.min.css?raw'
import { loadSettings, saveSettings, onSettingsChanged, type Settings, TEXT_SIZE_PX, FONT_STACKS, isMdRelevant, isRecord } from '../shared/settings'
import { sendMessage, type DirEntry } from '../shared/ipc'
import { createRenderer, slugify, uniqueHeadingId, mermaidThemeFor } from './markdown'
import { sanitizeMarkdown, sanitizeDiagram } from './sanitize'
import { READER_CSS } from './styles'
import { SVG } from './icons'
import { createTranslator, resolveLocale, type MessageKey } from '../shared/i18n'

const MD_EXT = /\.(md|mdx|mkd|markdown)$/i
const TXT_EXT = /\.txt$/i

/* Chromium supports WOFF2. Load bundled fonts when needed instead of
   inlining three copies of every font into each document's script. */
const katexStyles = katexCss.replace(/src:url\(fonts\/([^)]+\.woff2)\)[^}]*}/g, (_source, font: string) =>
  `src:url("${chrome.runtime.getURL(`fonts/katex/${font}`)}") format("woff2")}`,
)

function getDirUrl(): string {
  return new URL('./', location.href).href
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  if (tag === 'button') {
    node.setAttribute('type', 'button')
    if (attrs.title) node.setAttribute('aria-label', attrs.title)
  }
  for (const child of children) {
    node.append(child instanceof Node ? child : document.createTextNode(child))
  }
  return node
}

function html<K extends keyof HTMLElementTagNameMap>(tag: K, htmlString: string): HTMLElementTagNameMap[K] {
  const node = el(tag)
  node.innerHTML = htmlString
  return node
}

export function isDirListingPage(): boolean {
  return location.protocol === 'file:' && document.contentType === 'text/html' && !!document.querySelector('#tbody')
}

function isRenderableDoc(s: Settings): boolean {
  const contentType = document.contentType
  if (contentType === 'text/markdown' || contentType === 'text/x-markdown') return true
  if (contentType !== 'text/plain') return false
  if (MD_EXT.test(location.pathname)) return true
  return s.enableTxtExt && TXT_EXT.test(location.pathname)
}

function getRawContainer(): HTMLElement | null {
  return document.body.querySelector('pre')
}

function collectDirEntries(): DirEntry[] {
  const entries: DirEntry[] = []
  const seen = new Set<string>()
  document.querySelectorAll<HTMLAnchorElement>('#tbody tr, table tr').forEach(row => {
    const link = row.querySelector<HTMLAnchorElement>('a[href]')
    if (!link || !link.getAttribute('href')) return
    try {
      const url = new URL(link.href)
      if (seen.has(url.href)) return
      const isDir = url.pathname.endsWith('/')
      const rawName = url.pathname.split('/').filter(Boolean).pop() ?? ''
      const name = decodeURIComponent(rawName)
      if (!name) return
      if (!isDir && !MD_EXT.test(name)) return
      seen.add(url.href)
      const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent!.trim())
      /* chrome listing: name / size / date */
      entries.push({
        name,
        href: url.href,
        isDir,
        size: isDir ? '' : cells[1] ?? '',
        date: cells[2] ?? '',
      })
    } catch {
      /* ignore malformed rows */
    }
  })
  return entries
}

type Panel = 'folder' | 'outline'

class Reader {
  private settings!: Settings
  private t = createTranslator()
  private labels: { node: HTMLElement; key: MessageKey; attribute: 'title' | 'placeholder' }[] = []
  private root!: HTMLElement
  private content!: HTMLElement
  private outlineList!: HTMLElement
  private folderList!: HTMLElement
  private folderFilterRow!: HTMLElement
  private outlineFilterRow!: HTMLElement
  private rawText: string | null = null
  private rawContainer: HTMLElement | null = null
  private renderVersion = 0
  private mermaidQueue: Promise<void> = Promise.resolve()
  private polling = false
  private activePanel: Panel = 'outline'
  private folderEntries: DirEntry[] | null = null
  private folderError = false
  private folderLoading = false
  private folderQuery = ''
  private folderSortKey: 'name' | 'size' | 'date' = 'name'
  private folderSortAsc = true
  private foldersTop = true
  private showHidden = false
  private outlineQuery = ''
  private foldSet = new Set<string>()
  private headIds: string[] = []
  private refreshTimer: number | null = null
  private isDirPage = false

  /* the document_start boot shim hides the raw <pre> (and shows a slow-
     render loading dot); call once the reader is up — or on any path
     that will not render — so the page never stays blank */
  private bootCleanup(rendered: boolean) {
    try {
      if (rendered) window.__markdangRendered = true
    } catch {
      /* ignore */
    }
    try {
      ;window.__markdangBootCleanup?.()
    } catch {
      /* ignore */
    }
  }

  async boot() {
    this.isDirPage = isDirListingPage()
    const probe = await sendMessage('probeStatus', {})
    if (probe) {
      if (probe === 'dir' && this.isDirPage) {
        await sendMessage('dirEntries', { entries: collectDirEntries() })
      } else if (probe === 'doc') {
        await sendMessage('docContent', { text: getRawContainer()?.textContent ?? document.body.innerText })
      }
      this.bootCleanup(false)
      return
    }
    this.settings = await loadSettings()
    this.t = createTranslator(this.settings.language)
    onSettingsChanged(next => this.applySettingsChange(this.settings, next))

    if (isDirListingPage()) {
      if (!this.settings.enableFolderUrl || !this.settings.enable) {
        this.bootCleanup(false)
        return
      }
      this.buildChrome()
      this.renderDirView()
    } else if (this.settings.enable && isRenderableDoc(this.settings)) {
      this.buildChrome()
      this.renderDoc()
    } else {
      this.bootCleanup(false)
      return
    }

    this.applyAppearance()
    chrome.runtime.onMessage.addListener(msg => {
      if (msg?.action === 'command') this.toggleFromCommand(msg.command)
      return false
    })
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.settings.pageTheme !== 'auto') return
      if (!this.isDirPage) this.renderDoc()
      this.applyAppearance()
    })
    this.scheduleRefresh()
  }

  /* ------------------------------------------------------------ *
   * chrome (root layout, sidebar, buttons)
   * ------------------------------------------------------------ */
  private label<T extends HTMLElement>(node: T, key: MessageKey, attribute: 'title' | 'placeholder' = 'title'): T {
    this.labels.push({ node, key, attribute })
    node.setAttribute(attribute, this.t(key))
    if (node.tagName === 'BUTTON') node.setAttribute('aria-label', this.t(key))
    return node
  }

  private applyLanguage() {
    this.root.lang = resolveLocale(this.settings.language)
    this.labels.forEach(({ node, key, attribute }) => {
      node.setAttribute(attribute, this.t(key))
      if (node.tagName === 'BUTTON') node.setAttribute('aria-label', this.t(key))
    })
    this.closeSideMenu?.()
    this.renderOutline()
    this.updateContentLabels()
    this.renderFolderList()
    if (this.dirSubtitle) this.dirSubtitle.textContent = this.directoryCounts()
  }

  private updateContentLabels() {
    const labels: [string, MessageKey][] = [
      ['.markdang__head-anchor', 'headingLink'],
      ['.markdang__caption-anchor', 'captionLink'],
      ['.markdang__btn--copy', 'copyCode'],
    ]
    for (const [selector, key] of labels) {
      this.content.querySelectorAll<HTMLElement>(selector).forEach(node => {
        node.title = this.t(key)
        node.setAttribute('aria-label', this.t(key))
      })
    }
  }

  private buildChrome() {
    document.head.appendChild(el('style', { id: 'markdang-style' }, [READER_CSS + '\n' + katexStyles]))
    const pre = getRawContainer()
    this.rawContainer = pre
    this.rawText = pre?.textContent ?? document.body.innerText
    if (this.isDirPage) {
      const host = el('div', { class: 'markdang-host' })
      host.append(...Array.from(document.body.childNodes))
      document.body.append(host)
    } else pre?.classList.add('markdang-host')

    this.root = el('div', { class: 'markdang' })
    this.root.lang = resolveLocale(this.settings.language)
    const layout = el('div', { class: 'markdang-layout' })
    this.content = el('article', { class: 'markdang-content', tabindex: '-1' })
    layout.append(this.content)

    const side = this.buildSidebar()
    const buttons = el('div', { class: 'markdang__button-wrap' })

    const sideBtn = this.label(el('button', { class: 'markdang__btn' }, [html('span', SVG.side)]), 'sidebarToggle')
    sideBtn.addEventListener('click', () => this.patchSettings({ sideCollapsed: !this.settings.sideCollapsed }))
    const rawBtn = this.label(el('button', { class: 'markdang__btn' }, [html('span', SVG.code)]), 'rawSource')
    rawBtn.addEventListener('click', () => document.body.classList.toggle('markdang-raw'))
    const themeBtn = this.label(el('button', { class: 'markdang__btn' }, [html('span', SVG.sun)]), 'themeToggle')
    themeBtn.addEventListener('click', () => {
      /* one-click inversion: dark → light, light/auto → dark (auto lives in settings) */
      this.patchSettings({ pageTheme: this.resolveDark() ? 'light' : 'dark' })
    })
    const printBtn = this.label(el('button', { class: 'markdang__btn' }, [html('span', SVG.print)]), 'print')
    printBtn.addEventListener('click', () => window.print())
    const fsBtn = this.label(el('button', { class: 'markdang__btn' }, [html('span', SVG.fullscreen)]), 'fullscreen')
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen().catch(() => {})
    })
    const goTop = this.label(el('button', { class: 'markdang__btn markdang__btn--go-top' }, [html('span', SVG.top)]), 'backToTop')
    goTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
    const exitZen = this.label(el('button', { class: 'markdang__btn markdang__btn--exit-zen' }, [html('span', SVG.zen)]), 'exitZen')
    exitZen.addEventListener('click', () => this.patchSettings({ zenMode: false, mode: 'normal' }))
    buttons.append(sideBtn, rawBtn, themeBtn, printBtn, fsBtn, exitZen, goTop)

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (this.settings.zenMode || this.settings.mode === 'zen') this.patchSettings({ zenMode: false, mode: 'normal' })
        this.root.querySelector('.markdang__modal')?.remove()
        this.closeSideMenu?.()
      }
    })
    document.addEventListener('scroll', () => {
      goTop.classList.toggle('visible', (document.documentElement.scrollTop ?? 0) >= 480)
    })

    this.root.append(layout, side, buttons)
    document.body.classList.add('markdang-body')
    document.body.prepend(this.root)
    this.root.classList.add('ready')
  }

  private buildSidebar(): HTMLElement {
    const side = el('aside', { class: 'markdang__side' })

    /* outline panel */
    this.outlineList = el('ul', { class: 'markdang__outline-list' })
    this.outlineFilterRow = el('div', { class: 'markdang__filter-row hidden' })
    const outlineInput = this.label(el('input', { type: 'search' }), 'filterHeadings', 'placeholder')
    outlineInput.addEventListener('input', () => {
      this.outlineQuery = outlineInput.value.trim().toLowerCase()
      this.syncOutline()
    })
    this.outlineFilterRow.append(outlineInput)
    const outlineScroll = el('div', { class: 'markdang__side-scroll' }, [this.outlineList])
    const outlinePanel = el('div', { class: 'markdang__side-panel' }, [
      this.outlineFilterRow,
      outlineScroll,
    ])

    /* folder panel */
    this.folderList = el('ul', { class: 'markdang__folder-list' })
    this.folderFilterRow = el('div', { class: 'markdang__filter-row hidden' })
    const folderInput = this.label(el('input', { type: 'search' }), 'searchFiles', 'placeholder')
    folderInput.addEventListener('input', () => {
      this.folderQuery = folderInput.value.trim().toLowerCase()
      this.renderFolderList()
    })
    this.folderFilterRow.append(folderInput)
    const folderScroll = el('div', { class: 'markdang__side-scroll' }, [this.folderList])
    const folderPanel = el('div', { class: 'markdang__side-panel hidden' }, [
      this.folderFilterRow,
      folderScroll,
    ])

    /* tab bar: [folder][outline] ... [search][options] — mirrors the
       official reader layout */
    const tabs = el('div', { class: 'markdang__side-tabs' })
    const folderTab = this.label(el('button', { class: 'markdang__side-tab' }, [html('span', SVG.folder)]), 'folder')
    const outlineTab = this.label(el('button', { class: 'markdang__side-tab active' }, [html('span', SVG.outline)]), 'outline')
    const spacer = el('span', { class: 'markdang__side-spacer' })
    const searchBtn = this.label(el('button', { class: 'markdang__side-tab markdang__side-action' }, [html('span', SVG.search)]), 'search')
    const menuBtn = this.label(el('button', { class: 'markdang__side-tab markdang__side-action' }, [html('span', SVG.sliders)]), 'options')
    tabs.append(folderTab, outlineTab, spacer, searchBtn, menuBtn)

    /* dropdown menu (options depend on the active panel) */
    const menu = el('div', { class: 'markdang__side-menu' })
    menu.style.display = 'none'
    const closeMenu = () => {
      menu.style.display = 'none'
      menuBtn.classList.remove('active')
      document.removeEventListener('click', onDocClick, true)
    }
    const onDocClick = (e: Event) => {
      if (!menu.contains(e.target as Node) && !menuBtn.contains(e.target as Node)) closeMenu()
    }
    this.closeSideMenu = closeMenu
    const openMenu = () => {
      menu.innerHTML = ''
      if (this.activePanel === 'outline') {
        menu.append(this.menuItem(this.t('expandAll'), () => {
          this.foldSet.clear()
          this.syncOutline()
        }))
        menu.append(this.menuItem(this.t('collapseAll'), () => {
          this.headIds.forEach(id => this.foldSet.add(id))
          this.syncOutline()
        }))
      } else {
        menu.append(this.menuTitle(this.t('sortBy')))
        ;([
          ['name', this.t('sortName')],
          ['size', this.t('sortSize')],
          ['date', this.t('sortDate')],
        ] as const).forEach(([value, label]) => {
          menu.append(
            this.menuCheck(label, this.folderSortKey === value, () => {
              this.folderSortKey = value
              this.renderFolderList()
            }),
          )
        })
        menu.append(this.menuCheck(this.t('ascending'), this.folderSortAsc, () => {
          this.folderSortAsc = !this.folderSortAsc
          this.renderFolderList()
        }))
        menu.append(this.menuCheck(this.t('foldersFirst'), this.foldersTop, () => {
          this.foldersTop = !this.foldersTop
          this.renderFolderList()
        }))
        menu.append(this.menuCheck(this.t('showHidden'), this.showHidden, () => {
          this.showHidden = !this.showHidden
          this.renderFolderList()
        }))
      }
      menu.style.display = ''
      menuBtn.classList.add('active')
      document.addEventListener('click', onDocClick, true)
    }
    menuBtn.addEventListener('click', e => {
      e.stopPropagation()
      menu.style.display === 'none' ? openMenu() : closeMenu()
    })

    const toggleSearch = () => {
      const row = this.activePanel === 'folder' ? this.folderFilterRow : this.outlineFilterRow
      const showing = !row.classList.contains('hidden')
      row.classList.toggle('hidden', showing)
      searchBtn.classList.toggle('active', !showing)
      if (!showing) (row.querySelector('input') as HTMLInputElement)?.focus()
    }
    searchBtn.addEventListener('click', toggleSearch)

    const setActive = (panel: Panel) => {
      this.closeSideMenu?.()
      this.activePanel = panel
      folderTab.classList.toggle('active', panel === 'folder')
      outlineTab.classList.toggle('active', panel === 'outline')
      folderPanel.classList.toggle('hidden', panel !== 'folder')
      outlinePanel.classList.toggle('hidden', panel !== 'outline')
      if (panel === 'folder') void this.loadFolder()
    }
    folderTab.addEventListener('click', () => setActive('folder'))
    outlineTab.addEventListener('click', () => setActive('outline'))

    side.append(tabs, outlinePanel, folderPanel, menu)
    return side
  }

  private menuItem(label: string, onClick: () => void): HTMLElement {
    const item = el('button', { class: 'markdang__menu-item' }, [label])
    item.addEventListener('click', () => {
      onClick()
      this.closeSideMenu?.()
    })
    return item
  }

  private menuCheck(label: string, checked: boolean, onToggle: () => void): HTMLElement {
    const item = el('button', { class: `markdang__menu-item${checked ? ' checked' : ''}` }, [
      el('span', { class: 'markdang__menu-check' }, [checked ? '✓' : '']),
      label,
    ])
    item.setAttribute('aria-pressed', String(checked))
    item.addEventListener('click', () => {
      onToggle()
      this.closeSideMenu?.()
    })
    return item
  }

  private menuTitle(label: string): HTMLElement {
    return el('div', { class: 'markdang__menu-title' }, [label])
  }

  private closeSideMenu?: () => void

  /* ------------------------------------------------------------ *
   * document rendering
   * ------------------------------------------------------------ */
  private renderDoc() {
    const version = ++this.renderVersion
    const renderer = createRenderer(this.settings)
    const result = renderer.render(this.rawText ?? document.body.innerText)

    this.content.innerHTML = ''
    if (result.frontMatter) {
      const front = el('div')
      front.append(sanitizeMarkdown(result.frontMatter))
      this.content.append(front)
    }
    const body = el('div')
    body.append(sanitizeMarkdown(result.html))
    this.content.append(body)

    const firstHeading = this.content.querySelector('h1, h2, h3')
    if (firstHeading?.textContent?.trim()) {
      document.title = firstHeading.textContent.trim()
    }

    this.decorateHeadings()
    this.renderOutline()
    this.updateContentLabels()
    this.mermaidQueue = this.mermaidQueue.then(() => this.renderMermaid(result.mermaidBlocks, version))
    this.bindContentEvents()
    this.bootCleanup(true)
  }

  /* idempotent heading decoration — anchors and ids are added at most once,
     so re-rendering the outline never accumulates stray '#' anchors */
  private decorateHeadings() {
    const seen = new Set<string>()
    const heads = this.content.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
    /* Keep the renderer's TOC destinations stable when raw HTML headings
       reuse the same ID, even when the raw heading appears first. */
    heads.forEach(head => {
      if (head.hasAttribute('data-markdang-heading')) seen.add(head.id)
    })
    this.headIds = []
    heads.forEach(head => {
      const base = head.id || slugify(head.textContent ?? '')
      const id = head.hasAttribute('data-markdang-heading') ? head.id : uniqueHeadingId(base, seen)
      head.removeAttribute('data-markdang-heading')
      if (!head.querySelector('.markdang__head-anchor')) {
        const anchor = el('a', { class: 'markdang__head-anchor', href: `#${encodeURIComponent(id)}`, 'aria-label': this.t('headingLink') }, ['#'])
        head.prepend(anchor)
      }
      if (head.id !== id) head.id = id
      this.headIds.push(id)
    })
  }

  private renderOutline() {
    this.outlineList.innerHTML = ''
    const heads = Array.from(this.content.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'))
    const lis: HTMLElement[] = []
    heads.forEach((head, index) => {
      const depth = Number(head.tagName.slice(1))
      const clone = head.cloneNode(true) as HTMLElement
      clone.querySelector('.markdang__head-anchor')?.remove()
      const text = (clone.textContent ?? '').trim()
      const li = el('li', { 'data-depth': String(depth) })
      li.style.setProperty('--mdg-indent', String(depth - 1))
      const link = el('a', { href: `#${encodeURIComponent(head.id)}` }, [text])
      const nextHead = heads[index + 1]
      const hasChildren = !!nextHead && Number(nextHead.tagName.slice(1)) > depth
      if (hasChildren) {
        li.classList.add('has-children')
      }
      if (this.settings.isOutlineExpandable && hasChildren) {
        const fold = el('span', { class: 'markdang__fold', role: 'button', tabindex: '0', 'aria-label': this.t('foldHeading', { title: text }) }, [html('span', SVG.chevron)])
        fold.addEventListener('click', e => {
          e.preventDefault()
          e.stopPropagation()
          this.foldSet.has(head.id) ? this.foldSet.delete(head.id) : this.foldSet.add(head.id)
          this.syncOutline()
        })
        fold.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            fold.click()
          }
        })
        link.prepend(fold)
      }
      li.append(link)
      this.outlineList.append(li)
      lis.push(li)
    })
    this.outlineLiElements = lis
    this.syncOutline()
  }

  private outlineLiElements: HTMLElement[] = []

  /* single-pass fold + filter sync: a stack of (depth, folded) tracks the
     ancestor chain, so each item is classified in O(1) amortized instead of
     walking previous siblings (which also misjudged sibling subtrees) */
  private syncOutline() {
    const ancestors: { depth: number; folded: boolean }[] = []
    this.outlineLiElements.forEach((li, i) => {
      const depth = Number(li.dataset.depth ?? 1)
      while (ancestors.length && ancestors[ancestors.length - 1].depth >= depth) ancestors.pop()
      const folded = this.settings.isOutlineExpandable && this.foldSet.has(this.headIds[i] ?? '')
      li.classList.toggle('folded', folded)
      li.querySelector('.markdang__fold')?.setAttribute('aria-expanded', String(!folded))
      const filterHidden = !!this.outlineQuery && !li.textContent!.toLowerCase().includes(this.outlineQuery)
      li.classList.toggle('filter-hidden', filterHidden)
      li.classList.toggle('fold-hidden', filterHidden || (!this.outlineQuery && ancestors.some(a => a.folded)))
      ancestors.push({ depth, folded })
    })
  }

  private async renderMermaid(blocks: { code: string }[], version: number) {
    if (!blocks.length || version !== this.renderVersion) return
    const placeholders = this.content.querySelectorAll<HTMLElement>('pre.markdang__mermaid')
    try {
      /* lazy-load the mermaid bundle from the extension (web-accessible) */
      await import(/* @vite-ignore */ chrome.runtime.getURL('assets/mermaid.js'))
      if (version !== this.renderVersion) return
      const mermaid = window.__markdangMermaid
      if (!mermaid) throw new Error('mermaid bundle missing')
      const dark = this.resolveDark()
      let config: Record<string, unknown> = {}
      try {
        const parsed: unknown = JSON.parse(this.settings.mdPluginOptions.Mermaid.json || '{}')
        if (isRecord(parsed)) config = parsed
      } catch {
        /* invalid json — fall back to defaults */
      }
      mermaid.initialize({
        ...config,
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        maxTextSize: 50000,
        htmlLabels: false,
        flowchart: { ...(isRecord(config.flowchart) ? config.flowchart : {}), htmlLabels: false },
        secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize', 'suppressErrorRendering', 'htmlLabels'],
        theme: mermaidThemeFor(this.settings, dark) as 'dark' | 'default' | 'neutral' | 'forest',
      })
      let index = 0
      for (const placeholder of Array.from(placeholders)) {
        const code = decodeURIComponent(placeholder.dataset.mermaid ?? '')
        if (!code) continue
        try {
          const { svg } = await mermaid.render(`mdg-mermaid-${version}-${index++}`, code)
          if (version !== this.renderVersion || !placeholder.isConnected) return
          placeholder.innerHTML = sanitizeDiagram(svg)
        } catch (err) {
          if (version !== this.renderVersion || !placeholder.isConnected) return
          placeholder.replaceChildren(el('code', {}, [code]), el('div', { class: 'markdang__mermaid-error' }, [err instanceof Error ? err.message : this.t('renderError')]))
        }
      }
    } catch (err) {
      console.error('[markdang] mermaid failed to load', err)
    }
  }

  private bindContentEvents() {
    /* code copy */
    this.content.querySelectorAll<HTMLButtonElement>('.markdang__btn--copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.parentElement?.querySelector('code')?.textContent ?? ''
        try {
          if (navigator.clipboard) await navigator.clipboard.writeText(code)
          else {
            const text = el('textarea')
            text.value = code
            text.style.position = 'fixed'
            text.style.opacity = '0'
            this.root.append(text)
            text.select()
            const copied = document.execCommand('copy')
            text.remove()
            if (!copied) throw new Error('Clipboard unavailable')
          }
          btn.classList.add('copied')
          setTimeout(() => btn.classList.remove('copied'), 1200)
        } catch {
          btn.title = this.t('copyFailed')
          btn.setAttribute('aria-label', this.t('copyFailed'))
        }
      })
    })
    /* image zoom */
    this.content.querySelectorAll<HTMLImageElement>('img').forEach(img => {
      img.addEventListener('click', () => {
        const modal = el('div', { class: 'markdang__modal' })
        const zoomed = document.createElement('img')
        zoomed.src = img.src
        modal.append(zoomed)
        modal.addEventListener('click', () => modal.remove())
        this.root.append(modal)
        requestAnimationFrame(() => modal.classList.add('opened'))
      })
    })
  }

  /* ------------------------------------------------------------ *
   * directory view (file:// folder pages)
   * ------------------------------------------------------------ */
  private renderDirView() {
    const entries = collectDirEntries()
    this.folderEntries = entries
    this.rawText = null
    this.content.innerHTML = ''
    const dirName = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() ?? '/')
    const container = el('div', { class: 'markdang__dir' })
    const title = el('h1', { class: 'markdang__dir-title' }, [html('span', SVG.folder), dirName])
    const sub = el('p', { class: 'markdang__dir-sub' }, [this.directoryCounts()])
    this.dirSubtitle = sub
    const list = el('ul', { class: 'markdang__dir-list' })
    this.dirListEl = list
    container.append(title, sub, list)
    this.content.append(container)
    this.renderDirList()
    document.title = dirName
    this.outlineList!.innerHTML = ''
    this.renderFolderIntoSidebar(entries)
    this.bootCleanup(true)
  }

  private dirListEl!: HTMLElement
  private dirSubtitle?: HTMLElement

  private directoryCounts(): string {
    const entries = this.folderEntries ?? []
    return this.t('directoryCounts', {
      files: entries.filter(entry => !entry.isDir).length,
      folders: entries.filter(entry => entry.isDir).length,
    })
  }

  private renderDirList() {
    const list = this.dirListEl
    list.innerHTML = ''
    const entries = this.sortedFolderEntries()
    if (!entries.length) {
      list.append(el('li', { class: 'markdang__panel-hint' }, [this.t('directoryEmpty')]))
      return
    }
    entries.forEach(entry => {
      const link = el('a', { href: entry.href })
      const badge = el('span', { class: `markdang__dir-badge${entry.isDir ? ' is-dir' : ''}` })
      if (entry.isDir) badge.innerHTML = SVG.folder
      else badge.textContent = 'M'
      link.append(badge, el('span', { class: 'markdang__dir-name' }, [entry.name + (entry.isDir ? '/' : '')]))
      if (entry.size) link.append(el('span', { class: 'markdang__dir-meta' }, [entry.size]))
      list.append(el('li', {}, [link]))
    })
  }

  /* ------------------------------------------------------------ *
   * folder panel
   * ------------------------------------------------------------ */
  private async loadFolder() {
    if (this.folderEntries) {
      this.renderFolderList()
      return
    }
    this.folderLoading = true
    this.renderFolderList()
    const dirUrl = getDirUrl()
    let entries: DirEntry[] | null = null
    if (location.protocol === 'file:') {
      entries = await sendMessage('listDir', { url: dirUrl })
      if (!entries) this.folderError = true
    } else {
      entries = await this.fetchHttpDir(dirUrl)
      if (!entries) this.folderError = true
    }
    this.folderEntries = entries ?? []
    this.folderLoading = false
    this.renderFolderList()
  }

  private async fetchHttpDir(dirUrl: string): Promise<DirEntry[] | null> {
    try {
      const res = await fetch(dirUrl, { credentials: 'same-origin', signal: AbortSignal.timeout(8000) })
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
      const entries = new Map<string, DirEntry>()
      doc.querySelectorAll('a[href]').forEach(a => {
        try {
          const url = new URL(a.getAttribute('href') ?? '', dirUrl)
          if (url.origin !== location.origin || url.href === dirUrl || !url.pathname.startsWith(new URL(dirUrl).pathname)) return
          const relative = url.pathname.slice(new URL(dirUrl).pathname.length).replace(/\/$/, '')
          if (!relative || relative.includes('/')) return
          const isDir = url.pathname.endsWith('/')
          const name = decodeURIComponent(relative)
          if (!isDir && !MD_EXT.test(name)) return
          entries.set(url.href, { name, href: url.href, isDir })
        } catch {
          /* skip */
        }
      })
      return Array.from(entries.values())
    } catch {
      return null
    }
  }

  private sortedFolderEntries(): DirEntry[] {
    let entries = this.folderEntries ?? []
    if (!this.showHidden) entries = entries.filter(e => !e.name.startsWith('.'))
    if (this.folderQuery) {
      entries = entries.filter(e => e.name.toLowerCase().includes(this.folderQuery))
    }
    const dir = (list: DirEntry[]) => {
      const factor = this.folderSortAsc ? 1 : -1
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
      return list.sort((a, b) => {
        if (this.folderSortKey === 'size') {
          return (this.parseSize(a.size) - this.parseSize(b.size)) * factor || collator.compare(a.name, b.name)
        }
        if (this.folderSortKey === 'date') {
          return ((Date.parse(a.date ?? '') || 0) - (Date.parse(b.date ?? '') || 0)) * factor || collator.compare(a.name, b.name) * factor
        }
        return collator.compare(a.name, b.name) * factor
      })
    }
    const dirs = entries.filter(e => e.isDir)
    const files = entries.filter(e => !e.isDir)
    if (!this.foldersTop) return dir([...entries])
    return [...dir(dirs), ...dir(files)]
  }

  private parseSize(text?: string): number {
    if (!text) return 0
    const match = text.match(/^([\d.]+)\s*([kMGTP]?B?)$/i)
    if (!match) return 0
    const units: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, PB: 1e15, K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15 }
    return parseFloat(match[1]) * (units[match[2].toUpperCase()] ?? 1)
  }

  private renderFolderList() {
    if (this.isDirPage && this.dirListEl) this.renderDirList()
    this.folderList.innerHTML = ''
    if (this.folderLoading) {
      this.folderList.append(el('li', { class: 'markdang__panel-hint' }, [this.t('directoryLoading')]))
      return
    }
    if (this.folderError && !this.folderEntries?.length) {
      this.folderList.append(el('li', { class: 'markdang__panel-hint' }, [this.t('directoryError')]))
      return
    }
    const entries = this.sortedFolderEntries()
    if (!entries.length) {
      this.folderList.append(el('li', { class: 'markdang__panel-hint' }, [this.t('folderEmpty')]))
      return
    }
    entries.forEach(entry => {
      const li = el('li')
      const link = el('a', { href: entry.href })
      const badge = el('span', { class: `markdang__folder-badge${entry.isDir ? ' is-dir' : ''}` })
      if (entry.isDir) badge.innerHTML = SVG.folder
      else badge.textContent = 'M'
      link.append(badge, el('span', { class: 'markdang__folder-name' }, [entry.name]))
      if (entry.size) link.append(el('span', { class: 'markdang__folder-meta' }, [entry.size]))
      try {
        const url = new URL(entry.href)
        if (url.href === location.href) li.classList.add('active')
      } catch {
        /* skip */
      }
      li.append(link)
      this.folderList.append(li)
    })
  }

  private renderFolderIntoSidebar(entries: DirEntry[]) {
    this.folderEntries = entries
    if (this.activePanel === 'folder') this.renderFolderList()
  }

  /* ------------------------------------------------------------ *
   * settings application
   * ------------------------------------------------------------ */
  private applyAppearance() {
    const s = this.settings
    const dark = this.resolveDark()
    const theme = s.pageTheme === 'auto' ? (dark ? 'dark' : 'light') : s.pageTheme
    this.root.dataset.theme = theme
    const codeTheme = theme === 'dark' ? s.codeBlockNightTheme : s.codeBlockDayTheme
    this.root.dataset.code = codeTheme
    this.root.classList.toggle('markdang-centered', s.centered)
    this.root.classList.toggle('markdang-code-wrap', s.codeWrap)
    this.root.classList.toggle('markdang-side-visible', !s.sideCollapsed && s.mode !== 'zen')
    this.root.classList.toggle('markdang-side-collapsed', s.sideCollapsed)
    this.root.classList.toggle('markdang-zen', s.mode === 'zen' || s.zenMode)
    this.applyCustomCss()
    this.root.style.setProperty('--mdg-font-size', `${TEXT_SIZE_PX[s.textSize] ?? 16}px`)
    const font = FONT_STACKS[s.textFont]
    if (font) this.root.style.setProperty('--mdg-font', font)
    else this.root.style.removeProperty('--mdg-font')
    const sideWidth = '272px'
    this.root.style.setProperty('--mdg-side-width', sideWidth)
    if (s.enableCustomContentWidth) {
      const { unit, maxWidth, maxPercent } = s.customContentData
      this.root.style.setProperty(
        '--mdg-width',
        unit === '%' ? `${maxPercent}%` : `${maxWidth}px`,
      )
    } else {
      this.root.style.setProperty('--mdg-width', '1000px')
    }
  }

  private resolveDark(): boolean {
    return (
      this.settings.pageTheme === 'dark' ||
      (this.settings.pageTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    )
  }

  private applyCustomCss() {
    const { enableCustomCSS, customCSS } = this.settings
    const active = enableCustomCSS && !!customCSS.trim()
    let style = document.getElementById('markdang-custom-css') as HTMLStyleElement | null
    if (!active) {
      style?.remove()
      return
    }
    if (!style) {
      style = document.createElement('style')
      style.id = 'markdang-custom-css'
      document.head.append(style)
    }
    if (style.textContent !== customCSS) style.textContent = customCSS
  }

  private applySettingsChange(before: Settings, next: Settings) {
    const beforeDoc = before.enable && isRenderableDoc(before)
    const afterDoc = next.enable && isRenderableDoc(next)
    const beforeDir = before.enable && before.enableFolderUrl && this.isDirPage
    const afterDir = next.enable && next.enableFolderUrl && this.isDirPage
    this.settings = next
    this.t = createTranslator(next.language)

    if (beforeDoc !== afterDoc || beforeDir !== afterDir) {
      if (this.refreshTimer) clearTimeout(this.refreshTimer)
      location.reload()
      return
    }
    if (!this.root) return

    if (before.language !== next.language) this.applyLanguage()

    if (afterDoc && isMdRelevant(before, next)) {
      this.renderDoc()
    }
    if (before.isOutlineExpandable !== next.isOutlineExpandable) {
      this.renderOutline()
    }
    this.applyAppearance()
    this.scheduleRefresh()
  }

  private toggleFromCommand(command: string) {
    if (command === 'toggleSide') this.patchSettings({ sideCollapsed: !this.settings.sideCollapsed })
    if (command === 'toggleCentered') this.patchSettings({ centered: !this.settings.centered })
    if (command === 'toggleRefresh') this.patchSettings({ refresh: !this.settings.refresh })
    if (command === 'toggleTheme') {
      const cycle = ['light', 'dark', 'auto'] as const
      this.patchSettings({ pageTheme: cycle[(cycle.indexOf(this.settings.pageTheme) + 1) % cycle.length] })
    }
  }

  private async patchSettings(patch: Partial<Settings>) {
    try {
      await saveSettings(patch)
    } catch (error) {
      console.error('[markdang] could not save settings', error)
    }
  }

  /* ------------------------------------------------------------ *
   * auto refresh
   * ------------------------------------------------------------ */
  private scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    if (!this.settings.enable || !this.settings.refresh || !isRenderableDoc(this.settings) || this.polling) return
    const interval = Math.max(0.5, this.settings.refreshInterval || 0.5) * 1000
    this.refreshTimer = window.setTimeout(() => void this.poll(), interval)
  }

  private async poll() {
    this.polling = true
    try {
      let text: string | null = null
      if (location.protocol === 'file:') {
        text = await sendMessage('probeDoc', { url: location.href })
      } else {
        const res = await fetch(location.href, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8000) })
        if (res.ok && /^text\/(plain|markdown|x-markdown)\b/i.test(res.headers.get('content-type') ?? '')) text = await res.text()
      }
      if (text != null && this.rawText != null && text !== this.rawText) {
        this.rawText = text
        const pre = this.rawContainer
        if (pre) pre.textContent = text
        this.renderDoc()
      }
    } catch {
      /* network hiccup — keep polling */
    }
    this.polling = false
    this.scheduleRefresh()
  }
}

let booted = false
export async function bootReader() {
  if (booted) return
  booted = true
  const reader = new Reader()
  try {
    await reader.boot()
  } catch (error) {
    window.__markdangBootCleanup?.()
    document.querySelector('.markdang')?.remove()
    document.querySelectorAll('.markdang-host').forEach(node => node.classList.remove('markdang-host'))
    document.getElementById('markdang-style')?.remove()
    document.getElementById('markdang-custom-css')?.remove()
    document.body.classList.remove('markdang-body', 'markdang-raw', 'task-label-on', 'task-label-after')
    console.error('[markdang] could not start reader', error)
  }
}
