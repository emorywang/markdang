import DOMPurify from 'dompurify'

/* Source documents are untrusted. Keep formatting and task checkboxes, but
   remove active content before it reaches the shared page DOM. */
export function sanitizeMarkdown(source: string): DocumentFragment {
  const clean = DOMPurify.sanitize(source, {
    FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed', 'base', 'meta', 'link', 'textarea', 'select', 'video', 'audio'],
    FORBID_ATTR: ['srcset', 'autofocus', 'formaction', 'form', 'ping'],
  })
  /* Reparse cleaned markup rather than adopting parser-created nodes across
     Chromium's isolated-world boundary, where handler lifetimes can differ. */
  const template = document.createElement('template')
  template.innerHTML = clean
  const fragment = template.content
  fragment.querySelectorAll('input').forEach(input => {
    if (input.type !== 'checkbox') input.remove()
  })
  fragment.querySelectorAll('a[target="_blank"]').forEach(link => link.setAttribute('rel', 'noopener noreferrer'))
  return fragment
}

export function sanitizeDiagram(svg: string): string {
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ['foreignObject'] })
}
