import katexCss from 'katex/dist/katex.min.css?inline'
import { loadSettings, onSettingsChanged, type Settings, TEXT_SIZE_PX, FONT_STACKS, isMdRelevant } from '../shared/settings'
import { sendMessage, type DirEntry } from '../shared/ipc'
import { createRenderer, renderFrontMatterTable, slugify, mermaidThemeFor, COPY_SVG } from './markdown'
import { READER_CSS } from './styles'
import { SVG } from './icons'

const MD_EXT = /\.(md|mdx|mkd|markdown)$/i
const TXT_EXT = /\.txt$/i
let settingsSeq = 0

function getDirUrl(): string {
  return location.href.replace(/[^/]+$/, '')
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
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
  private root!: HTMLElement
  private content!: HTMLElement
  private outlineList!: HTMLElement
  private folderList!: HTMLElement
  private folderFilterRow!: HTMLElement
  private outlineFilterRow!: HTMLElement
  private rawText: string | null = null
  private mermaidReady = false
  private activePanel: Panel = 'outline'
  private folderEntries: DirEntry[] | null = null
  private folderError = false
  private folderQuery = ''
  private folderSortKey: 'name' | 'size' | 'date' = 'name'
  private folderSortAsc = true
  private foldersTop = true
  private showHidden = false
  private outlineQuery = ''
  private foldSet = new Set<string>()
  private headIds: string[] = []
  private headDepths: number[] = []
  private refreshTimer: number | null = null
  private isDirPage = false

  /* the document_start boot shim hides the raw <pre> (and shows a slow-
     render loading dot); call once the reader is up — or on any path
     that will not render — so the page never stays blank */
  private bootCleanup(rendered: boolean) {
    try {
      if (rendered) (window as any).__markdangRendered = true
    } catch {
      /* ignore */
    }
    try {
      ;(window as any).__markdangBootCleanup?.()
    } catch {
      /* ignore */
    }
  }

  async boot() {
    this.settings = await loadSettings()
    this.isDirPage = isDirListingPage()

    /* hidden probe tabs (opened by the background) only answer queries —
       directory pages still report their entries first */
    if (document.hidden) {
      if (isDirListingPage()) {
        sendMessage('dirEntries', { url: getDirUrl(), entries: collectDirEntries() })
      }
      chrome.runtime.onMessage.addListener((msg, _s, cb) => {
        if (msg?.action === 'getRawDoc') {
          const pre = getRawContainer()
          cb({ text: pre ? pre.textContent : document.body.innerText })
        }
        return false
      })
      this.bootCleanup(false)
      return
    }

    if (isDirListingPage()) {
      /* report to the cache so md pages can list this folder instantly */
      sendMessage('dirEntries', { url: location.href, entries: collectDirEntries() })
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
    onSettingsChanged(next => this.applySettingsChange(this.settings, next))
    chrome.runtime.onMessage.addListener((msg, _s, cb) => {
      if (msg?.action === 'getRawDoc') {
        const pre = getRawContainer()
        cb({ text: pre ? pre.textContent : document.body.innerText })
      }
      if (msg?.action === 'settingsToggle') this.toggleFromCommand(msg.data)
      return false
    })
    this.scheduleRefresh()
  }

  /* ------------------------------------------------------------ *
   * chrome (root layout, sidebar, buttons)
   * ------------------------------------------------------------ */
  private buildChrome() {
    document.head.appendChild(el('style', { id: 'markdang-style' }, [READER_CSS + '\n' + katexCss]))
    const pre = getRawContainer()
    this.rawText = pre?.textContent ?? null
    pre?.classList.add('markdang-host')

    this.root = el('div', { class: 'markdang' })
    const layout = el('div', { class: 'markdang-layout' })
    this.content = el('article', { class: 'markdang-content', tabindex: '-1' })
    layout.append(this.content)

    const side = this.buildSidebar()
    const buttons = el('div', { class: 'markdang__button-wrap' })

    const sideBtn = el('button', { class: 'markdang__btn', title: '展开/收起侧栏' }, [html('span', SVG.side)])
    sideBtn.addEventListener('click', () => this.patchSettings({ sideCollapsed: !this.settings.sideCollapsed }))
    const rawBtn = el('button', { class: 'markdang__btn', title: '原始内容' }, [html('span', SVG.code)])
    rawBtn.addEventListener('click', () => document.body.classList.toggle('markdang-raw'))
    const themeBtn = el('button', { class: 'markdang__btn', title: '切换深浅主题' }, [html('span', SVG.sun)])
    themeBtn.addEventListener('click', () => {
      /* one-click inversion: dark → light, light/auto → dark (auto lives in settings) */
      this.patchSettings({ pageTheme: this.resolveDark() ? 'light' : 'dark' })
    })
    const printBtn = el('button', { class: 'markdang__btn', title: '打印' }, [html('span', SVG.print)])
    printBtn.addEventListener('click', () => window.print())
    const fsBtn = el('button', { class: 'markdang__btn', title: '全屏' }, [html('span', SVG.fullscreen)])
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen().catch(() => {})
    })
    const goTop = el('button', { class: 'markdang__btn markdang__btn--go-top', title: '返回顶部' }, [html('span', SVG.top)])
    goTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
    const exitZen = el('button', { class: 'markdang__btn markdang__btn--exit-zen', title: '退出禅模式 (Esc)' }, [html('span', SVG.zen)])
    exitZen.addEventListener('click', () => this.patchSettings({ zenMode: false }))
    buttons.append(sideBtn, rawBtn, themeBtn, printBtn, fsBtn, exitZen, goTop)

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (this.settings.zenMode) this.patchSettings({ zenMode: false })
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
    const outlineInput = el('input', { type: 'search', placeholder: '筛选标题' })
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
    const folderInput = el('input', { type: 'search', placeholder: '搜索文件' })
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
    const folderTab = el('button', { class: 'markdang__side-tab', title: '目录' }, [html('span', SVG.folder)])
    const outlineTab = el('button', { class: 'markdang__side-tab active', title: '大纲' }, [html('span', SVG.outline)])
    const spacer = el('span', { class: 'markdang__side-spacer' })
    const searchBtn = el('button', { class: 'markdang__side-tab markdang__side-action', title: '搜索' }, [html('span', SVG.search)])
    const menuBtn = el('button', { class: 'markdang__side-tab markdang__side-action', title: '选项' }, [html('span', SVG.sliders)])
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
        menu.append(this.menuItem('展开全部', () => {
          this.foldSet.clear()
          this.syncOutline()
        }))
        menu.append(this.menuItem('折叠全部', () => {
          this.headIds.forEach(id => this.foldSet.add(id))
          this.syncOutline()
        }))
      } else {
        menu.append(this.menuTitle('排序方式'))
        ;([
          ['name', '按名称'],
          ['size', '按大小'],
          ['date', '按修改日期'],
        ] as const).forEach(([value, label]) => {
          menu.append(
            this.menuCheck(label, this.folderSortKey === value, () => {
              this.folderSortKey = value
              this.renderFolderList()
            }),
          )
        })
        menu.append(this.menuCheck('升序', this.folderSortAsc, () => {
          this.folderSortAsc = !this.folderSortAsc
          this.renderFolderList()
        }))
        menu.append(this.menuCheck('文件夹置顶', this.foldersTop, () => {
          this.foldersTop = !this.foldersTop
          this.renderFolderList()
        }))
        menu.append(this.menuCheck('显示隐藏文件', this.showHidden, () => {
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
    this.outlinePanelEl = outlinePanel
    this.folderPanelEl = folderPanel
    this.setActiveTab = setActive
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
    item.addEventListener('click', onToggle)
    return item
  }

  private menuTitle(label: string): HTMLElement {
    return el('div', { class: 'markdang__menu-title' }, [label])
  }

  private closeSideMenu?: () => void
  private outlinePanelEl!: HTMLElement
  private folderPanelEl!: HTMLElement
  private setActiveTab!: (panel: Panel) => void

  /* ------------------------------------------------------------ *
   * document rendering
   * ------------------------------------------------------------ */
  private renderDoc() {
    const dark = this.resolveDark()
    const renderer = createRenderer(this.settings, dark)
    const result = renderer.render(this.rawText ?? document.body.innerText)

    this.content.innerHTML = ''
    if (result.frontMatter) {
      this.content.appendChild(html('div', result.frontMatter))
    }
    this.content.appendChild(html('div', result.html))

    const firstHeading = this.content.querySelector('h1, h2, h3')
    if (firstHeading?.textContent?.trim()) {
      document.title = firstHeading.textContent.trim()
    }

    this.decorateHeadings()
    this.renderOutline()
    void this.renderMermaid(result.mermaidBlocks)
    this.bindContentEvents()
    this.bootCleanup(true)
  }

  /* idempotent heading decoration — anchors and ids are added at most once,
     so re-rendering the outline never accumulates stray '#' anchors */
  private decorateHeadings() {
    const seen = new Map<string, number>()
    const heads = this.content.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
    this.headIds = []
    this.headDepths = []
    heads.forEach(head => {
      const depth = Number(head.tagName.slice(1))
      const base = slugify(head.textContent ?? '')
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      const id = count === 0 ? base : `${base}-${count}`
      if (!head.querySelector('.markdang__head-anchor')) {
        const anchor = el('a', { class: 'markdang__head-anchor', href: `#${id}` }, ['#'])
        head.prepend(anchor)
      }
      if (head.id !== id) head.id = id
      this.headIds.push(id)
      this.headDepths.push(depth)
    })
  }

  private renderOutline() {
    this.outlineList.innerHTML = ''
    const heads = Array.from(this.content.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'))
    const lis: HTMLElement[] = []
    heads.forEach(head => {
      const depth = Number(head.tagName.slice(1))
      const clone = head.cloneNode(true) as HTMLElement
      clone.querySelector('.markdang__head-anchor')?.remove()
      const text = (clone.textContent ?? '').trim()
      const li = el('li', { 'data-depth': String(depth) })
      li.style.setProperty('--mdg-indent', String(depth - 1))
      const link = el('a', { href: `#${head.id}` }, [text])
      const index = heads.indexOf(head)
      const nextHead = heads[index + 1]
      const hasChildren = !!nextHead && Number(nextHead.tagName.slice(1)) > depth
      if (hasChildren) {
        li.classList.add('has-children')
      }
      if (this.settings.isOutlineExpandable && hasChildren) {
        const fold = el('span', { class: 'markdang__fold' }, [html('span', SVG.chevron)])
        fold.addEventListener('click', e => {
          e.preventDefault()
          e.stopPropagation()
          this.foldSet.has(head.id) ? this.foldSet.delete(head.id) : this.foldSet.add(head.id)
          this.syncOutline()
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
      const folded = this.foldSet.has(this.headIds[i] ?? '')
      li.classList.toggle('folded', folded)
      const filterHidden = !!this.outlineQuery && !li.textContent!.toLowerCase().includes(this.outlineQuery)
      li.classList.toggle('filter-hidden', filterHidden)
      li.classList.toggle('fold-hidden', filterHidden || ancestors.some(a => a.folded))
      ancestors.push({ depth, folded })
    })
  }

  private async renderMermaid(blocks: { code: string }[]) {
    if (!blocks.length) return
    const placeholders = this.content.querySelectorAll<HTMLElement>('pre.markdang__mermaid')
    try {
      /* lazy-load the mermaid bundle from the extension (web-accessible) */
      await import(/* @vite-ignore */ chrome.runtime.getURL('assets/mermaid.js'))
      const mermaid = (window as any).__markdangMermaid
      if (!mermaid) throw new Error('mermaid bundle missing')
      const dark = this.resolveDark()
      let config: Record<string, unknown> = {}
      try {
        config = JSON.parse(this.settings.mdPluginOptions.Mermaid.json || '{}')
      } catch {
        /* invalid json — fall back to defaults */
      }
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        ...config,
        theme: mermaidThemeFor(this.settings, dark) as 'dark' | 'default' | 'neutral' | 'forest',
      })
      this.mermaidReady = true
      let index = 0
      for (const placeholder of Array.from(placeholders)) {
        const code = decodeURIComponent(placeholder.dataset.mermaid ?? '')
        if (!code) continue
        try {
          const { svg } = await mermaid.render(`mdg-mermaid-${settingsSeq}-${index++}`, code)
          placeholder.innerHTML = svg
        } catch (err) {
          placeholder.innerHTML = `<code></code><div class="markdang__mermaid-error">${
            (err as Error)?.message ?? 'render error'
          }</div>`
        }
      }
    } catch (err) {
      console.error('[markdang] mermaid failed to load', err)
    }
  }

  private bindContentEvents() {
    /* code copy */
    this.content.querySelectorAll<HTMLButtonElement>('.markdang__btn--copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.parentElement?.querySelector('code')?.textContent ?? ''
        navigator.clipboard.writeText(code).then(() => {
          btn.classList.add('copied')
          setTimeout(() => btn.classList.remove('copied'), 1200)
        })
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
    const sub = el('p', { class: 'markdang__dir-sub' }, [
      `${entries.filter(e => !e.isDir).length} 个文件 · ${entries.filter(e => e.isDir).length} 个文件夹`,
    ])
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

  private renderDirList() {
    const list = this.dirListEl
    list.innerHTML = ''
    const entries = this.sortedFolderEntries()
    if (!entries.length) {
      list.append(el('li', { class: 'markdang__panel-hint' }, ['此文件夹没有 Markdown 文件']))
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
    this.folderList.innerHTML = ''
    this.folderList.append(el('li', { class: 'markdang__panel-hint' }, ['正在加载目录…']))
    const dirUrl = location.href.replace(/[^/]+$/, '')
    let entries: DirEntry[] | null = null
    if (location.protocol === 'file:') {
      entries = await sendMessage('listDir', { url: dirUrl })
      if (!entries) this.folderError = true
    } else {
      entries = await this.fetchHttpDir(dirUrl)
    }
    this.folderEntries = entries ?? []
    this.renderFolderList()
  }

  private async fetchHttpDir(dirUrl: string): Promise<DirEntry[] | null> {
    try {
      const res = await fetch(dirUrl, { credentials: 'same-origin' })
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
      const base = doc.createElement('base')
      base.href = dirUrl
      doc.head.appendChild(base)
      const entries = new Map<string, DirEntry>()
      doc.querySelectorAll('a[href]').forEach(a => {
        try {
          const url = new URL((a as HTMLAnchorElement).href)
          const name = decodeURIComponent(url.pathname.split('/').pop() ?? '')
          if (!name || url.pathname.endsWith('/')) return
          if (!MD_EXT.test(name)) return
          entries.set(url.href, { name, href: url.href, isDir: false })
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
          return (Date.parse(a.date ?? '') || 0 - (Date.parse(b.date ?? '') || 0)) * factor || collator.compare(a.name, b.name)
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
    const units: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, k: 1e3, M: 1e6, G: 1e9 }
    return parseFloat(match[1]) * (units[match[2].toUpperCase()] ?? 1)
  }

  private renderFolderList() {
    this.folderList.innerHTML = ''
    if (this.folderError && !this.folderEntries?.length) {
      this.folderList.append(el('li', { class: 'markdang__panel-hint' }, ['无法获取目录列表']))
      return
    }
    const entries = this.sortedFolderEntries()
    if (!entries.length) {
      this.folderList.append(el('li', { class: 'markdang__panel-hint' }, ['当前目录下未找到 Markdown 文件']))
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
    document.body.classList.toggle('task-label-on', !!s.mdPluginOptions.TaskLists.label)
    document.body.classList.toggle('task-label-after', !!s.mdPluginOptions.TaskLists.label && !!s.mdPluginOptions.TaskLists.labelAfter)
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

    /* entering reader modes that were off at boot needs a fresh boot */
    if (!beforeDoc && afterDoc) {
      location.reload()
      return
    }
    if (!beforeDir && afterDir && !afterDoc) {
      location.reload()
      return
    }
    /* leaving reader modes just tears the UI down — no reload, no races */
    if ((beforeDoc && !afterDoc) || (beforeDir && !afterDir)) {
      this.root.remove()
      document.body.classList.remove('markdang-raw')
      return
    }

    if (afterDoc && isMdRelevant(before, next)) {
      this.renderDoc()
    }
    if (before.isOutlineExpandable !== next.isOutlineExpandable) {
      this.renderOutline()
    }
    this.applyAppearance()
    this.scheduleRefresh()
  }

  private toggleFromCommand(patch: Record<string, unknown>) {
    const next: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch)) {
      if (value === 'toggle') {
        ;(next as any)[key] = !(this.settings as any)[key]
      } else {
        ;(next as any)[key] = value
      }
    }
    void this.patchSettings(next)
  }

  private async patchSettings(patch: Partial<Settings>) {
    await import('../shared/settings').then(m => m.saveSettings(patch))
  }

  /* ------------------------------------------------------------ *
   * auto refresh
   * ------------------------------------------------------------ */
  private scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    if (!this.settings.refresh || !isRenderableDoc(this.settings)) return
    const interval = Math.max(0.5, this.settings.refreshInterval || 0.5) * 1000
    this.refreshTimer = window.setTimeout(() => void this.poll(), interval)
  }

  private async poll() {
    try {
      let text: string | null = null
      if (location.protocol === 'file:') {
        text = await sendMessage('probeDoc', { url: location.href })
      } else {
        const res = await fetch(location.href, { credentials: 'same-origin', cache: 'no-store' })
        if (res.ok) text = await res.text()
      }
      if (text != null && this.rawText != null && text !== this.rawText) {
        this.rawText = text
        const pre = getRawContainer()
        if (pre) pre.textContent = text
        this.renderDoc()
      }
    } catch {
      /* network hiccup — keep polling */
    }
    this.scheduleRefresh()
  }
}

let booted = false
export async function bootReader() {
  if (booted) return
  booted = true
  const reader = new Reader()
  await reader.boot()
}
