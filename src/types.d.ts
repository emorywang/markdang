declare module 'markdown-it-container' {
  import type MarkdownIt from 'markdown-it'
  const container: MarkdownIt.PluginWithOptions<{
    render?: (tokens: import('markdown-it/lib/token.mjs').default[], idx: number) => string
    marker?: string
    validate?: (params: string) => boolean
  }>
  export default container
}
interface Window {
  __markdangRendered?: boolean
  __markdangBootCleanup?: () => void
  __markdangMermaid?: typeof import('mermaid').default
}
declare module 'markdown-it-emoji' {
  import type MarkdownIt from 'markdown-it'
  export const full: MarkdownIt.PluginSimple
  export const light: MarkdownIt.PluginSimple
  export const bare: MarkdownIt.PluginSimple
}
declare module 'markdown-it-sub' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
declare module 'markdown-it-sup' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
declare module 'markdown-it-ins' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
declare module 'markdown-it-mark' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
declare module 'markdown-it-abbr' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
declare module 'markdown-it-deflist' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
declare module 'markdown-it-footnote' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginWithOptions<{ enabled?: boolean; label?: boolean; labelAfter?: boolean }>
  export default plugin
}
declare module 'katex/dist/katex.min.css?inline' {
  const css: string
  export default css
}
