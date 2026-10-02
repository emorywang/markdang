import mermaid from 'mermaid'
// Loaded lazily via chrome.runtime.getURL('assets/mermaid.js') only when a
// document actually contains mermaid blocks — keeps the main bundle lean.
;(window as any).__markdangMermaid = mermaid
