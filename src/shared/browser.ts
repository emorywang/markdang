export function extensionDetailsUrl(id: string, userAgent: string): string {
  const browser = /\bEdg(?:A)?\//.test(userAgent) ? 'edge' : 'chrome'
  return `${browser}://extensions/?id=${encodeURIComponent(id)}`
}
