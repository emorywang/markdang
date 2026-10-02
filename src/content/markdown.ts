import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
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

interface RenderEnv { frontMatter?: string }

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
  md.core.ruler.push('md_reader_html_math', state => {
    for (const token of state.tokens) {
      if (token.type !== 'html_block') continue
      const template = document.createElement('template')
      template.innerHTML = token.content
      const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      while (walker.nextNode()) nodes.push(walker.currentNode as Text)
      for (const node of nodes) {
        if (node.parentElement?.closest('pre, code, script, style, textarea')) continue
        const pattern = /(?<!\\)\$\$([\s\S]+?)\$\$|(?<![\\$])\$([^$\n]+?)\$(?!\$)/g
        const fragment = document.createDocumentFragment()
        let last = 0
        for (const match of node.data.matchAll(pattern)) {
          const display = match[1] !== undefined
          if (display ? !opts.enableMathBlockInHtml : !opts.enableMathInlineInHtml) continue
          fragment.append(document.createTextNode(node.data.slice(last, match.index)))
          const math = document.createElement('span')
          try {
            math.innerHTML = katex.renderToString((match[1] ?? match[2]).trim(), {
              displayMode: display, output: 'html', throwOnError: opts.throwOnError,
              errorColor: opts.errorColor, trust: false,
            })
          } catch {
            math.className = 'katex-error'
            math.textContent = match[0]
          }
          fragment.append(math)
          last = match.index + match[0].length
        }
        if (last) {
          fragment.append(document.createTextNode(node.data.slice(last)))
          node.replaceWith(fragment)
        }
      }
      token.content = template.innerHTML
    }
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
export function slugify(content: string): string {
  return content.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '') || 'section'
}

export function uniqueHeadingId(base: string, used: Set<string>): string {
  let id = base
  let suffix = 1
  while (used.has(id)) id = `${base}-${suffix++}`
  used.add(id)
  return id
}

function headingIdsPlugin(md: MarkdownIt) {
  md.core.ruler.push('markdang_heading_ids', state => {
    const used = new Set<string>()
    state.tokens.forEach((token, index) => {
      if (token.type === 'heading_open') {
        token.attrSet('id', uniqueHeadingId(slugify(state.tokens[index + 1]?.content ?? ''), used))
      }
    })
  })
}

function tocPlugin(md: MarkdownIt, opts: MdPluginOptions['TOC']) {
  let marker: RegExp
  try {
    const literal = opts.markerPattern.match(/^\/([\s\S]*)\/([a-z]*)$/)
    marker = literal ? new RegExp(literal[1], literal[2].replace(/[gy]/g, '')) : new RegExp(opts.markerPattern, 'im')
  } catch {
    marker = /^\[\[toc\]\]$/im
  }

  md.core.ruler.push('md_reader_toc', state => {
    type Heading = { level: number; content: string; id: string; children: Heading[] }
    const roots: Heading[] = []
    const stack: Heading[] = []
    let omitNext = false
    state.tokens.forEach((token, index) => {
      if (token.type === 'html_block' && opts.omitTag && token.content.includes(opts.omitTag)) {
        omitNext = true
      }
      if (token.type !== 'heading_open') return
      const inline = state.tokens[index + 1]
      const omitted = omitNext || (!!opts.omitTag && (inline?.content ?? '').includes(opts.omitTag))
      omitNext = false
      const level = Number(token.tag.slice(1))
      if (omitted || !opts.includeLevel.includes(level)) return
      const content = inline?.children?.map(child =>
        ['text', 'code_inline', 'image', 'math_inline'].includes(child.type) ? child.content :
          ['softbreak', 'hardbreak'].includes(child.type) ? ' ' : '',
      ).join('') ?? inline?.content ?? ''
      const heading: Heading = { level, content, id: token.attrGet('id') ?? '', children: [] }
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
      ;(stack.at(-1)?.children ?? roots).push(heading)
      stack.push(heading)
    })
    const list = (headings: Heading[]): string => headings.length
      ? `<${opts.listType}>${headings.map(h =>
          `<li><a href="#${encodeURIComponent(h.id)}">${md.utils.escapeHtml(h.content)}</a>${list(h.children)}</li>`,
        ).join('')}</${opts.listType}>` : ''
    const output = `<div class="${md.utils.escapeHtml(opts.containerClass)}">${list(roots)}</div>`
    for (let index = state.tokens.length - 2; index >= 1; index--) {
      const token = state.tokens[index]
      if (token.type !== 'inline' || !marker.test(token.content.trim())) continue
      if (state.tokens[index - 1].type !== 'paragraph_open' || state.tokens[index + 1].type !== 'paragraph_close') continue
      const replacement = new state.Token('html_block', '', 0)
      replacement.content = output
      state.tokens.splice(index - 1, 3, replacement)
    }
  })
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
      render(tokens: Token[], idx: number) {
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
  md.block.ruler.before('blockquote', 'md_reader_front_matter', (state, startLine, endLine, silent) => {
    if (startLine !== 0 || state.blkIndent !== 0) return false
    if (state.src.slice(state.bMarks[0], state.eMarks[0]).trim() !== '---') return false
    for (let line = 1; line < endLine; line++) {
      if (!/^(---|\.\.\.)\s*$/.test(state.src.slice(state.bMarks[line], state.eMarks[line]))) continue
      if (silent) return true
      ;(state.env as RenderEnv).frontMatter = state.src.slice(state.bMarks[1], state.bMarks[line])
      state.line = line + 1
      return true
    }
    return false
  })
}

export function renderFrontMatterTable(raw: string): string {
  const rows = raw
    .split('\n')
    .map(line => line.match(/^([^:#{[]+):\s*(.*)$/))
    .filter(Boolean) as RegExpMatchArray[]
  if (!rows.length) return ''
  const body = rows
    .map(([, key, value]) => `<tr><td>${escapeHtml(key.trim())}</td><td>${escapeHtml(value.trim())}</td></tr>`)
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

export function createRenderer(settings: Settings) {
  const md: MarkdownIt = new MarkdownIt({
    html: true,
    breaks: settings.mdPlugins.includes('Breaks'),
    linkify: settings.mdPlugins.includes('Linkify'),
    typographer: settings.mdPlugins.includes('Typographer'),

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
    md.use(katexPlugin, { output: 'html', throwOnError: options.Katex.throwOnError, errorColor: options.Katex.errorColor, trust: false })
    if (options.Katex.enableBareBlocks) bareMathPlugin(md)
    if (options.Katex.enableMathInlineInHtml || options.Katex.enableMathBlockInHtml) {
      htmlMathPlugin(md, options.Katex)
    }
  }
  if (on('MultimdTable')) md.use(multimdTablePlugin, { ...options.MultimdTable })
  if (on('TaskLists')) md.use(tasklistsPlugin, { ...options.TaskLists })
  md.use(headingIdsPlugin)
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
          trust: false,
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
        return `<pre class="markdang__code-block"><code class="hljs" lang="${md.utils.escapeHtml(language)}">${
          hljs.highlight(token.content, { language, ignoreIllegals: true }).value
        }</code><button class="markdang__btn markdang__btn--copy" title="Copy" aria-label="Copy code" type="button">${COPY_SVG}</button></pre>`
      } catch {
        /* fall through to plain */
      }
    }
    return `<pre class="markdang__code-block"><code class="${md.utils.escapeHtml(info)}">${md.utils.escapeHtml(
      token.content,
    )}</code><button class="markdang__btn markdang__btn--copy" title="Copy" aria-label="Copy code" type="button">${COPY_SVG}</button></pre>`
  }


  const render = (source: string): RenderResult => {
    mermaidBlocks.length = 0
    const env: RenderEnv = {}
    let body = md.render(source, env)
    const frontRaw = env.frontMatter
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
