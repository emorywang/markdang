import MarkdownIt from 'markdown-it'
import { full as emojiPlugin } from 'markdown-it-emoji'
import subPlugin from 'markdown-it-sub'
import supPlugin from 'markdown-it-sup'
import insPlugin from 'markdown-it-ins'
import markPlugin from 'markdown-it-mark'
import abbrPlugin from 'markdown-it-abbr'
import deflistPlugin from 'markdown-it-deflist'
import footnotePlugin from 'markdown-it-footnote'
import tasklistsPlugin from 'markdown-it-task-lists'
import multimdTablePlugin from 'markdown-it-multimd-table'
import containerPlugin from 'markdown-it-container'
import katexPlugin from '@traptitech/markdown-it-katex'
import katex from 'katex'
import { deflateRaw } from 'pako'
import hljs from 'highlight.js'
import { alert as mditAlert } from '@mdit/plugin-alert'
import type { Settings, MdPluginOptions } from '../shared/settings'

const FRONT_MATTER_KEY = 'mdReaderFrontMatter'

/* ---------------------------------------------------------------- *
 * bare math: \begin{env} ... \end{env} blocks without $$ wrappers
 * (the @traptitech katex plugin does not implement this option)
 * ---------------------------------------------------------------- */
function bareMathPlugin(md: MarkdownIt) {
  md.block.ruler.before('fence', 'md_reader_bare_math', (state, startLine, endLine, silent) => {
    const firstLine = state.src.slice(state.bMarks[startLine], state.eMarks[startLine])
    const match = firstLine.match(/^\s*\\begin\{([a-zA-Z*]+)\}/)
    if (!match) return false
    const env = match[1]
    let end = -1
    for (let line = startLine; line < endLine; line++) {
      const text = state.src.slice(state.bMarks[line], state.eMarks[line])
      if (text.includes(`\\end{${env}}`)) {
        end = line
        break
      }
    }
    if (end === -1) return false
    if (silent) return true
    const token = state.push('math_block', '', 0)
    token.content = state.src.slice(state.bMarks[startLine], state.eMarks[end]).trim()
    state.line = end + 1
    return true
  })
}

/* ---------------------------------------------------------------- *
 * math inside raw html tokens ($..$ inline, $$..$$ block)
 * ---------------------------------------------------------------- */
function htmlMathPlugin(md: MarkdownIt, opts: MdPluginOptions['Katex']) {
  const renderMath = (latex: string, display: boolean): string => {
    try {
      return katex.renderToString(latex, {
        displayMode: display,
        output: 'html',
        throwOnError: opts.throwOnError,
        errorColor: opts.errorColor,
      })
    } catch {
      return display
        ? `<span class="katex-display">${escapeHtml(latex)}</span>`
        : escapeHtml(latex)
    }
  }
  /* block option replaces $$..$$ inside html blocks; inline option
     replaces $..$ inside html blocks and html_inline tokens */
  const replaceBlock = (html: string): string =>
    html.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => renderMath(tex.trim(), true))
  const replaceInline = (html: string): string =>
    html.replace(/\$([^$\n]+?)\$/g, (_, tex) => renderMath(tex.trim(), false))

  md.core.ruler.push('md_reader_html_math', state => {
    state.tokens.forEach(token => {
      if (token.type === 'html_block') {
        if (opts.enableMathBlockInHtml) token.content = replaceBlock(token.content)
        if (opts.enableMathInlineInHtml) token.content = replaceInline(token.content)
      } else if (token.type === 'html_inline' && opts.enableMathInlineInHtml) {
        token.content = replaceInline(token.content)
      }
    })
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/* ---------------------------------------------------------------- *
 * PlantUML: deflate + the PlantUML text encoding, rendered through a
 * PlantUML server (opt-in plugin — enabling it sends the diagram
 * source to the configured server).
 * ---------------------------------------------------------------- */
const PLANTUML_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'

function plantumlEncode(text: string): string {
  const bytes = deflateRaw(text, { level: 9 })
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]
    const b2 = bytes[i + 1]
    const b3 = bytes[i + 2]
    out += PLANTUML_ALPHABET[b1 >> 2]
    out += PLANTUML_ALPHABET[((b1 & 0x3) << 4) | ((b2 ?? 0) >> 4)]
    out += PLANTUML_ALPHABET[((b2 ?? 0) & 0xf) << 2 | ((b3 ?? 0) >> 6)]
    out += PLANTUML_ALPHABET[(b3 ?? 0) & 0x3f]
  }
  return out
}

function plantumlSvg(code: string): string {
  const encoded = plantumlEncode(code)
  return `<img src="https://www.plantuml.com/plantuml/svg/${encoded}" alt="PlantUML diagram" />`
}

/* ---------------------------------------------------------------- *
 * TOC — custom plugin so every store option is honored:
 * includeLevel / containerClass / markerPattern / omitTag / listType
 * Builds a properly nested list (sub-lists live inside the parent li).
 * ---------------------------------------------------------------- */
function tocPlugin(md: MarkdownIt, opts: MdPluginOptions['TOC']) {
  const flag = opts.markerPattern.match(/\/([a-z]*)$/)?.[1] ?? 'im'
  const marker = new RegExp(opts.markerPattern.replace(/^\/(.*)\/[a-z]*$/, '$1'), flag)

  md.core.ruler.push('md_reader_toc', tokenState => {
    const tokens = tokenState.tokens

    /* collect headings, skipping those right after the omit tag */
    const headings: { level: number; content: string }[] = []
    let omitNext = false
    tokens.forEach((token, i) => {
      if (token.type === 'html_block' && opts.omitTag && token.content.includes(opts.omitTag)) {
        omitNext = true
        return
      }
      if (token.type === 'heading_open') {
        const level = Number(token.tag.slice(1))
        const inline = tokens[i + 1]
        const content = (inline?.content ?? '').trim()
        const omit = omitNext
        omitNext = false
        if (!omit && opts.includeLevel.includes(level) && content) {
          headings.push({ level, content })
        }
      }
    })

    /* find the marker paragraph and replace it with the toc list */
    const index = tokens.findIndex(t => t.type === 'inline' && marker.test(t.content))
    if (index === -1) return
    if (tokens[index - 1]?.type !== 'paragraph_open' || tokens[index + 1]?.type !== 'paragraph_close') return

    const seen = new Map<string, number>()
    const idOf = (content: string) => {
      const base = slugify(content)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      return count === 0 ? base : `${base}-${count}`
    }

    const tag = opts.listType
    const minLevel = headings.length ? Math.min(...headings.map(h => h.level)) : 1
    let html = `<div class="${opts.containerClass}">\n`
    let depth = 0
    headings.forEach(({ level, content }) => {
      const d = Math.min(level - minLevel + 1, 6)
      if (d > depth) {
        /* the previous li stays open so the sub-list nests inside it */
        html += `<${tag}>\n`.repeat(d - depth)
        depth = d
      } else if (d < depth) {
        html += `</li>\n</${tag}>\n`.repeat(depth - d)
        html += `</li>\n`
        depth = d
      } else {
        html += `</li>\n`
      }
      html += `<li><a href="#${idOf(content)}">${md.utils.escapeHtml(content)}</a>`
    })
    html += `</li>\n</${tag}>\n`.repeat(depth)
    html += `</div>`

    const open = new tokenState.Token('html_block', '', 0)
    open.content = html
    tokens.splice(index - 1, 3, open)
  })
}

export function slugify(content: string): string {
  return encodeURIComponent(content.trim().toLowerCase().replace(/\s+/g, '-'))
}

/* ---------------------------------------------------------------- *
 * GitHub-style blockquote alerts (`> [!NOTE]`) come from
 * @mdit/plugin-alert; the `::: name` containers come from
 * markdown-it-container. Each honors its own settings switches.
 * ---------------------------------------------------------------- */
const ALERT_CONTAINER_COLORS: Record<string, string> = {
  info: 'info',
  tip: 'tip',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

function containerAlertPlugin(md: MarkdownIt, enabled: Record<string, boolean>) {
  Object.entries(ALERT_CONTAINER_COLORS).forEach(([name, color]) => {
    if (!enabled[name]) return
    md.use(containerPlugin, name, {
      render(tokens: any[], idx: number) {
        return tokens[idx].nesting === 1
          ? `<div class="markdang__alert markdang__alert--${color}"><p class="markdown-alert-title">${name}</p>\n`
          : '</div>\n'
      },
    })
  })
}

/* ---------------------------------------------------------------- *
 * Front matter capture
 * ---------------------------------------------------------------- */
function frontMatterPlugin(md: MarkdownIt) {
  const handler = (content: string) => {
    ;(md as any)[FRONT_MATTER_KEY] = content
  }
  /* same fence as markdown-it-front-matter uses */
  md.block.ruler.before(
    'blockquote',
    'md_reader_front_matter',
    (state, startLine, endLine, silent) => {
      if (startLine !== 0 || silent) return false
      const firstLine = state.src.slice(state.bMarks[startLine], state.eMarks[startLine])
      if (!firstLine.trim().startsWith('---')) return false
      for (let line = startLine + 1; line < endLine; line++) {
        const lineText = state.src.slice(state.bMarks[line], state.eMarks[line])
        if (/^(---|\.\.\.)\s*$/.test(lineText)) {
          handler(state.src.slice(state.bMarks[1], state.bMarks[line]))
          state.line = line + 1
          return true
        }
      }
      return false
    },
    { alt: [] },
  )
  md.frontMatter = handler
}

declare module 'markdown-it' {
  interface MarkdownIt {
    frontMatter?: (content: string) => void
  }
}

export function renderFrontMatterTable(raw: string): string {
  const rows = raw
    .split('\n')
    .map(line => line.match(/^([^:#{[]+):\s*(.*)$/))
    .filter(Boolean) as RegExpMatchArray[]
  if (!rows.length) return ''
  const body = rows
    .map(([, key, value]) => `<tr><td>${key.trim()}</td><td>${value.trim()}</td></tr>`)
    .join('\n')
  return `<table class="markdang__front-matter"><tbody>${body}</tbody></table>`
}

/* ---------------------------------------------------------------- *
 * Renderer factory
 * ---------------------------------------------------------------- */
export interface RenderResult {
  html: string
  mermaidBlocks: { code: string }[]
  frontMatter: string | null
}

export function createRenderer(settings: Settings, dark: boolean) {
  const md: MarkdownIt = new MarkdownIt({
    html: true,
    breaks: settings.mdPlugins.includes('Breaks'),
    linkify: settings.mdPlugins.includes('Linkify'),
    typographer: settings.mdPlugins.includes('Typographer'),
    highlight(code, language) {
      if (language && hljs.getLanguage(language)) {
        try {
          return `<pre class="markdang__code-block"><code class="hljs" lang="${language}">${
            hljs.highlight(code, { language, ignoreIllegals: true }).value
          }</code><button class="markdang__btn markdang__btn--copy" title="Copy">${COPY_SVG}</button></pre>`
        } catch {
          /* fall through to plain */
        }
      }
      return `<pre class="markdang__code-block"><code class="${language}">${md.utils.escapeHtml(
        code,
      )}</code><button class="markdang__btn markdang__btn--copy" title="Copy">${COPY_SVG}</button></pre>`
    },
  })

  const options = settings.mdPluginOptions
  const on = (name: string) => settings.mdPlugins.includes(name)

  if (on('Linkify')) md.linkify.set({ fuzzyLink: options.Linkify.fuzzyLink, fuzzyIP: options.Linkify.fuzzyIP, fuzzyEmail: options.Linkify.fuzzyEmail })
  if (on('Emoji')) md.use(emojiPlugin)
  if (on('Sup')) md.use(supPlugin)
  if (on('Sub')) md.use(subPlugin)
  if (on('Ins')) md.use(insPlugin)
  if (on('Mark')) md.use(markPlugin)
  if (on('Abbr')) md.use(abbrPlugin)
  if (on('Deflist')) md.use(deflistPlugin)
  if (on('Footnote')) md.use(footnotePlugin)
  if (on('Katex')) {
    md.use(katexPlugin, { output: 'html' })
    if (options.Katex.enableBareBlocks) bareMathPlugin(md)
    if (options.Katex.enableMathInlineInHtml || options.Katex.enableMathBlockInHtml) {
      htmlMathPlugin(md, options.Katex)
    }
  }
  if (on('MultimdTable')) md.use(multimdTablePlugin, { ...options.MultimdTable })
  if (on('TaskLists')) md.use(tasklistsPlugin, { ...options.TaskLists })
  if (on('TOC')) md.use(tocPlugin, options.TOC)
  if (on('Alert')) {
    /* blockquote alerts: @mdit/plugin-alert (alertNames/deep supported) */
    md.use(mditAlert, {
      alertNames: options.Alert.alertNames,
      deep: options.Alert.deep,
    })
    /* ::: name containers */
    containerAlertPlugin(md, {
      info: options.Alert.infoContainer,
      tip: options.Alert.tipContainer,
      success: options.Alert.successContainer,
      warning: options.Alert.warningContainer,
      danger: options.Alert.dangerContainer,
    })
  }
  if (on('FrontMatter')) {
    frontMatterPlugin(md)
  }

  const mermaidBlocks: { code: string }[] = []

  /* unified fence renderer: mermaid placeholders, math fences, plantuml, code */
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    const info = token.info.trim().split(/\s+/)[0]
    const language = info
    if (on('Mermaid') && info === 'mermaid') {
      mermaidBlocks.push({ code: token.content })
      const code = md.utils.escapeHtml(token.content)
      return `<pre class="markdang__mermaid" data-mermaid="${encodeURIComponent(
        token.content,
      )}"><code>${code}</code></pre>`
    }
    if (on('Katex') && options.Katex.enableFencedBlocks && info === 'math') {
      try {
        return `<p class="katex-block">${katex.renderToString(token.content, {
          displayMode: true,
          output: 'html',
          throwOnError: options.Katex.throwOnError,
          errorColor: options.Katex.errorColor,
        })}</p>`
      } catch (err) {
        return `<p class="katex-block katex-error">${md.utils.escapeHtml(token.content)}</p>`
      }
    }
    if (on('PlantUML') && info === 'plantuml') {
      return `<div class="markdang__plantuml">${plantumlSvg(token.content)}</div>`
    }
    if (language && hljs.getLanguage(language)) {
      try {
        return `<pre class="markdang__code-block"><code class="hljs" lang="${language}">${
          hljs.highlight(token.content, { language, ignoreIllegals: true }).value
        }</code><button class="markdang__btn markdang__btn--copy" title="Copy">${COPY_SVG}</button></pre>`
      } catch {
        /* fall through to plain */
      }
    }
    return `<pre class="markdang__code-block"><code class="${info}">${md.utils.escapeHtml(
      token.content,
    )}</code><button class="markdang__btn markdang__btn--copy" title="Copy">${COPY_SVG}</button></pre>`
  }


  const render = (source: string): RenderResult => {
    mermaidBlocks.length = 0
    ;(md as any)[FRONT_MATTER_KEY] = null
    const withoutFront = on('FrontMatter') ? source : source.replace(/^---[\s\S]+?---\n/, '')
    let body = md.render(withoutFront)
    const frontRaw = (md as any)[FRONT_MATTER_KEY] as string | null
    const frontHtml =
      on('FrontMatter') && frontRaw && options.FrontMatter.showMetadata
        ? renderFrontMatterTable(frontRaw)
        : ''

    /* autolabel: give every captioned table a working anchor. The plugin
       leaves the id empty for non-latin labels, so derive one and prepend
       a visible link — without the option the caption stays plain. */
    if (on('MultimdTable') && options.MultimdTable.autolabel) {
      let tableIndex = 0
      body = body.replace(
        /<caption id="([^"]*)"([^>]*)>/g,
        (_, id: string, rest: string) => {
          const anchorId = id || `table-${++tableIndex}`
          return `<caption id="${anchorId}"${rest}><a class="markdang__caption-anchor" href="#${anchorId}" title="Anchor">#</a>`
        },
      )
    }

    return { html: body, mermaidBlocks: [...mermaidBlocks], frontMatter: frontHtml }
  }

  return { render, md }
}

export const COPY_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>'

export function mermaidThemeFor(settings: Settings, dark: boolean): string {
  const configured = settings.mdPluginOptions.Mermaid.theme
  if (configured !== 'auto') return configured
  return dark ? 'dark' : 'default'
}
