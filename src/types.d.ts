declare module 'markdown-it-container' {
  import type MarkdownIt from 'markdown-it'
  const container: MarkdownIt.PluginWithOptions<{
    render?: (tokens: any[], idx: number) => string
    marker?: string
    validate?: (params: string) => boolean
  }>
  export default container
}
interface Window {
  __markdangRendered?: boolean
  __markdangBootCleanup?: () => void
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
declare module 'markdown-it-front-matter' {
  import type MarkdownIt from 'markdown-it'
  const plugin: (handler: (content: string) => void) => void
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
