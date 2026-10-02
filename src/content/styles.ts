/* Reader stylesheet — injected as a <style> tag from the content script. */
const FONT_MANROPE = chrome.runtime.getURL('fonts/Manrope-Variable.ttf')
const FONT_CODE = chrome.runtime.getURL('fonts/SourceCodePro-Regular.ttf')

export const READER_CSS = String.raw`
@font-face {
  font-family: 'Manrope';
  src: url('${FONT_MANROPE}') format('truetype');
  font-weight: 200 800;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Source Code Pro';
  src: url('${FONT_CODE}') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
.markdang, .markdang *, .markdang *::before, .markdang *::after {
  box-sizing: border-box;
}
.markdang {
  --bg: #ffffff;
  --text: #1e305a;
  --muted: #60718c;
  --border: #dce4f0;
  --primary: #285bc9;
  --primary-soft: #edf3ff;
  --panel-bg: #f6f8fc;
  --code-bg: #f6f8fc;
  --code-border: #dce4f0;
  --quote-bg: #f6f8fc;
  --table-head: #edf3ff;
  --btn-bg: rgba(237, 243, 255, 0.9);
  --btn-text: #60718c;
  --btn-hover-bg: #edf3ff;
  --shadow: 0 1px 3px rgba(30, 48, 90, 0.08);
  --modal-bg: rgba(255, 255, 255, 0.75);
  background: var(--bg);
  color: var(--text);
  font-family: var(--mdg-font, 'Manrope', 'Noto Sans SC', 'Segoe UI', 'Microsoft YaHei', sans-serif);
  font-size: var(--mdg-font-size, 16px);
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.markdang[data-theme='dark'] {
  --bg: #111d32;
  --text: #f0f4fc;
  --muted: #a6b5cc;
  --border: #344966;
  --primary: #95b7ff;
  --primary-soft: rgba(149, 183, 255, 0.14);
  --panel-bg: #192943;
  --code-bg: #192943;
  --code-border: #344966;
  --quote-bg: #192943;
  --table-head: #1d3050;
  --btn-bg: rgba(25, 41, 67, 0.9);
  --btn-text: #a6b5cc;
  --btn-hover-bg: #22355a;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  --modal-bg: rgba(17, 29, 50, 0.6);
  color-scheme: dark;
}

.markdang-body {
  margin: 0 !important;
  padding: 0 !important;
  background: var(--bg, #fff);
}
.markdang-host {
  all: revert;
  display: none;
}
.markdang-content {
  max-width: var(--mdg-width, 1000px);
  margin: 0 auto;
  padding: 40px 56px 80px;
  outline: none;
}
.markdang:not(.markdang-centered) .markdang-content { margin-inline-start: 0; }
.markdang-content > *:first-child { margin-top: 0 !important; }
.markdang-content h1, .markdang-content h2, .markdang-content h3,
.markdang-content h4, .markdang-content h5, .markdang-content h6 {
  position: relative;
  font-weight: 650;
  line-height: 1.3;
  margin: 1.6em 0 0.7em;
  scroll-margin-top: 24px;
}
.markdang-content h1 { font-size: 1.9em; }
.markdang-content h2 { font-size: 1.45em; padding-bottom: 0.3em; border-bottom: 1px solid var(--border); }
.markdang-content h3 { font-size: 1.22em; }
.markdang-content h4 { font-size: 1.1em; }
.markdang-content h5 { font-size: 1em; }
.markdang-content h6 { font-size: 0.95em; color: var(--muted); }
.markdang-content .markdang__head-anchor {
  position: absolute;
  inset-inline-start: -0.75em;
  opacity: 0;
  text-decoration: none;
  color: var(--primary);
  transition: opacity 0.2s;
}
.markdang-content h1:hover .markdang__head-anchor,
.markdang-content h2:hover .markdang__head-anchor,
.markdang-content h3:hover .markdang__head-anchor,
.markdang-content h4:hover .markdang__head-anchor,
.markdang-content h5:hover .markdang__head-anchor,
.markdang-content h6:hover .markdang__head-anchor { opacity: 1; }
.markdang-content a { color: var(--primary); text-decoration: none; }
.markdang-content a:hover { text-decoration: underline; }
.markdang-content p { margin: 0.9em 0; }
.markdang-content img { max-width: 100%; border-radius: 6px; cursor: zoom-in; }
.markdang-content blockquote {
  margin: 1em 0;
  padding: 0.6em 1.1em;
  border-inline-start: 3px solid var(--primary);
  background: var(--quote-bg);
  border-radius: 0 8px 8px 0;
  color: inherit;
}
.markdang-content blockquote > :first-child { margin-top: 0; }
.markdang-content blockquote > :last-child { margin-bottom: 0; }

.markdang button:focus-visible, .markdang a:focus-visible, .markdang [role="button"]:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

/* toc container ([[TOC]]) */
.markdang-content .table-of-contents {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 18px;
  display: flow-root;
  font-size: 0.94em;
}
.markdang-content .table-of-contents ul {
  list-style: none;
  margin: 0;
  padding-inline-start: 1.05em;
}
.markdang-content .table-of-contents > ul { padding-inline-start: 0; }
.markdang-content .table-of-contents li { margin: 0.2em 0; }
.markdang-content .table-of-contents a { color: var(--text); text-decoration: none; }
.markdang-content .table-of-contents a:hover { color: var(--primary); }
.markdang-content ul, .markdang-content ol { padding-inline-start: 1.6em; }
.markdang-content li { margin: 0.3em 0; }
.markdang-content .contains-task-list { padding-inline-start: 1.2em; }
.markdang-content li.task-list-item { list-style: none; }
.markdang-content li.task-list-item .task-list-item-checkbox {
  margin-inline-end: 0.45em;
  accent-color: var(--primary);
  vertical-align: -1px;
}
.markdang-content li.task-list-item.enabled .task-list-item-checkbox { cursor: pointer; }
.markdang-content li.task-list-item.enabled label { cursor: pointer; }
.markdang-content .markdang__caption-anchor {
  margin-inline-end: 6px;
  color: var(--primary);
  text-decoration: none;
  opacity: 0.55;
}
.markdang-content .markdang__caption-anchor:hover { opacity: 1; }
.markdang-content hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.markdang-content table {
  border-collapse: collapse;
  margin: 1.2em auto;
  display: block;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.markdang-content th, .markdang-content td {
  border: 1px solid var(--border);
  padding: 0.45em 0.9em;
}
.markdang-content th { background: var(--table-head); font-weight: 600; }
.markdang-content code {
  font-family: 'Source Code Pro', ui-monospace, Consolas, 'JetBrains Mono', Menlo, monospace;
  font-size: 0.88em;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 5px;
  padding: 0.12em 0.4em;
}
.markdang-content pre.markdang__code-block {
  position: relative;
  background: var(--code-block-bg, var(--code-bg));
  border: 1px solid var(--code-block-border, var(--code-border));
  color: var(--code-block-text, var(--text));
  border-radius: 10px;
  padding: 14px 16px;
  overflow-x: auto;
  line-height: 1.55;
  font-size: 0.875em;
}
.markdang-content pre.markdang__code-block code {
  background: none;
  border: none;
  padding: 0;
  font-size: 1em;
  white-space: pre;
}
.markdang-code-wrap .markdang-content pre.markdang__code-block code {
  white-space: pre-wrap;
  word-break: break-all;
}
.markdang-content pre.markdang__front-matter {
  display: none;
}
.markdang-content table.markdang__front-matter {
  display: table;
}
.markdang-content kbd {
  border: 1px solid var(--code-border);
  border-bottom-width: 2px;
  border-radius: 5px;
  background: var(--code-bg);
  padding: 0.1em 0.45em;
  font-size: 0.85em;
}
.markdang-content mark {
  background: #fff07e;
  color: #24292f;
  border-radius: 3px;
  padding: 0 0.2em;
}
.markdang[data-theme='dark'] .markdang-content mark { background: #6b5b13; color: #e8e8e8; }

/* alerts — blockquote style (markdown-alert) and container style (markdang__alert) */
.markdang-content .markdown-alert,
.markdang-content .markdang__alert {
  margin: 1em 0;
  padding: 0.6em 1.1em;
  border-inline-start: 3px solid var(--primary);
  background: var(--quote-bg);
  border-radius: 0 8px 8px 0;
}
.markdang-content .markdown-alert > :first-child,
.markdang-content .markdang__alert > :first-child { margin-top: 0; }
.markdang-content .markdown-alert > :last-child,
.markdang-content .markdang__alert > :last-child { margin-bottom: 0; }
.markdang-content .markdown-alert-title,
.markdang-content .md-alert-title {
  font-weight: 650;
  margin: 0 0 0.2em;
  font-size: 0.92em;
}
.markdang-content .markdown-alert-important,
.markdang-content .markdang__alert--important { border-inline-start-color: #a371f7; }
.markdang-content .markdown-alert-note,
.markdang-content .markdown-alert-info,
.markdang-content .markdang__alert--info { border-inline-start-color: #539bf5; }
.markdang-content .markdown-alert-tip,
.markdang-content .markdown-alert-success,
.markdang-content .markdang__alert--tip,
.markdang-content .markdang__alert--success { border-inline-start-color: #57ab5a; }
.markdang-content .markdown-alert-warning,
.markdang-content .markdang__alert--warning { border-inline-start-color: #c69026; }
.markdang-content .markdown-alert-caution,
.markdang-content .markdown-alert-danger,
.markdang-content .markdang__alert--danger { border-inline-start-color: #e5534b; }
.markdang-content .markdown-alert-important .markdown-alert-title,
.markdang-content .markdang__alert--important .md-alert-title { color: #a371f7; }
.markdang-content .markdown-alert-note .markdown-alert-title,
.markdang-content .markdown-alert-info .markdown-alert-title,
.markdang-content .markdang__alert--info .md-alert-title { color: #539bf5; }
.markdang-content .markdown-alert-tip .markdown-alert-title,
.markdang-content .markdown-alert-success .markdown-alert-title,
.markdang-content .markdang__alert--tip .md-alert-title,
.markdang-content .markdang__alert--success .md-alert-title { color: #57ab5a; }
.markdang-content .markdown-alert-warning .markdown-alert-title,
.markdang-content .markdang__alert--warning .md-alert-title { color: #c69026; }
.markdang-content .markdown-alert-caution .markdown-alert-title,
.markdang-content .markdown-alert-danger .markdown-alert-title,
.markdang-content .markdang__alert--danger .md-alert-title { color: #e5534b; }

/* raw toggle — the hidden host <pre> is a body child, so the state class
   lives on body rather than on the reader root */
.markdang-raw .markdang-layout { display: none; }
.markdang-raw .markdang__side { display: none !important; }
.markdang-host { all: revert; display: none; }
.markdang-raw .markdang-host {
  display: block;
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 32px 80px;
  white-space: pre-wrap;
  font-size: 14px;
}
.markdang-host pre, .markdang-raw .markdang-host pre {
  font-family: 'Source Code Pro', ui-monospace, Consolas, Menlo, monospace;
}

/* katex + mermaid */
.markdang-content .katex-display { overflow-x: auto; overflow-y: hidden; }
.markdang-content pre.markdang__mermaid {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}
.markdang-content pre.markdang__mermaid svg { max-width: 100%; height: auto; }
.markdang-content pre.markdang__mermaid .markdang__mermaid-error {
  color: #e5534b;
  white-space: pre-wrap;
  text-align: start;
  font-size: 0.85em;
}
.markdang-content .markdang__plantuml {
  margin: 1.2em 0;
  text-align: center;
}
.markdang-content .markdang__plantuml img { max-width: 100%; height: auto; }

/* buttons */
.markdang__button-wrap {
  position: fixed;
  top: 14px;
  inset-inline-end: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 30;
}
.markdang__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 8px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: var(--btn-bg);
  color: var(--btn-text);
  backdrop-filter: blur(4px);
  box-shadow: var(--shadow);
  transition: background 0.12s, color 0.12s, transform 0.12s;
}
.markdang__btn:hover { background: var(--btn-hover-bg); color: var(--text); }
.markdang__btn:active { transform: scale(0.94); }
.markdang__btn svg { width: 100%; height: 100%; pointer-events: none; }
.markdang__btn--go-top {
  position: fixed;
  bottom: 18px;
  inset-inline-end: 14px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.markdang__btn--go-top.visible { opacity: 1; pointer-events: auto; }
.markdang__btn--copy {
  position: absolute;
  top: 8px;
  inset-inline-end: 8px;
  width: 28px;
  height: 28px;
  padding: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}
.markdang-content pre.markdang__code-block:hover .markdang__btn--copy { opacity: 1; }
.markdang__btn--copy.copied { color: #2da44e; opacity: 1; }

/* sidebar */
.markdang__side {
  position: fixed;
  top: 0;
  bottom: 0;
  inset-inline-start: 0;
  width: var(--mdg-side-width, 272px);
  background: var(--panel-bg);
  border-inline-end: 1px solid var(--border);
  z-index: 20;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease;
  font-size: 15px;
}
.markdang-side-collapsed .markdang__side {
  transform: translateX(-100%);
}
.markdang[data-side='right'] .markdang__side { inset-inline-start: auto; inset-inline-end: 0; }
.markdang-side-collapsed[data-side='right'] .markdang__side { transform: translateX(100%); }
.markdang__side-tabs {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  flex: none;
  position: relative;
}
.markdang__side .hidden { display: none !important; }
.markdang__side-menu {
  position: absolute;
  top: 48px;
  inset-inline-end: 6px;
  min-width: 168px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
  padding: 5px;
  z-index: 30;
}
.markdang__menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text);
  font-size: 0.95em;
  text-align: start;
  cursor: pointer;
}
.markdang__menu-item:hover { background: var(--primary-soft); color: var(--primary); }
.markdang__menu-item.checked { color: var(--primary); font-weight: 600; }
.markdang__menu-check { width: 14px; flex: none; color: var(--primary); font-weight: 700; }
.markdang__menu-title { padding: 6px 10px 3px; font-size: 0.74em; color: var(--muted); }
.markdang__side-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.markdang__side-tab svg { width: 100%; height: 100%; pointer-events: none; }
.markdang__side-tab:hover { color: var(--text); background: var(--primary-soft); }
.markdang__side-tab.active { background: var(--primary); color: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.18); }
.markdang__side-spacer { flex: 1; }
.markdang__side-action {
  width: 26px;
  height: 26px;
  padding: 5px;
}
.markdang__side-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.markdang__side-scroll {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px 6px 14px;
  scrollbar-width: thin;
}
.markdang__side-scroll::-webkit-scrollbar { width: 6px; }
.markdang__side-scroll::-webkit-scrollbar-thumb { border-radius: 3px; background: rgba(127,127,127,0.35); }
.markdang__outline-list, .markdang__folder-list { list-style: none; margin: 0; padding: 0; }
.markdang__outline-list li { margin: 0; }
.markdang__outline-list a {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  margin: 1px 0;
  border-radius: 8px;
  color: var(--muted);
  text-decoration: none;
  font-size: 1em;
  line-height: 1.4;
  margin-left: calc(10px + var(--mdg-indent, 0) * 12px);
  overflow: hidden;
  white-space: nowrap;
  transition: background 0.1s, color 0.1s;
}
.markdang__outline-list a:hover { color: var(--text); background: var(--primary-soft); }
.markdang__outline-list li.active > a {
  color: var(--primary);
  background: var(--primary-soft);
  font-weight: 600;
}
.markdang__outline-list .markdang__outline-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
.markdang__outline-list li.has-children > a { font-weight: 600; color: var(--text); }
.markdang__outline-list li.has-children.active > a { color: var(--primary); }
.markdang__outline-list li.fold-hidden,
.markdang__outline-list li.filter-hidden { display: none; }
.markdang__fold {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  margin-right: 4px;
  border-radius: 5px;
  color: var(--muted);
  cursor: pointer;
}
.markdang__fold:hover { color: var(--primary); background: var(--primary-soft); }
.markdang__fold svg { width: 10px; height: 10px; transition: transform 0.15s; }
.markdang__outline-list li.folded .markdang__fold svg { transform: rotate(90deg); }
.markdang__filter-row { padding: 4px 10px 8px; flex: none; }
.markdang__filter-row input {
  width: 100%;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.88em;
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.markdang__filter-row input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}
.markdang__panel-hint {
  padding: 18px 16px;
  font-size: 0.85em;
  color: var(--muted);
  line-height: 1.6;
}
.markdang__folder-list a {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin: 1px 0;
  border-radius: 8px;
  color: var(--muted);
  text-decoration: none;
  transition: background 0.1s, color 0.1s;
}
.markdang__folder-list a:hover { color: var(--text); background: var(--primary-soft); }
.markdang__folder-list li.active a { color: var(--primary); font-weight: 600; background: var(--primary-soft); }
.markdang__folder-badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 10px;
  font-weight: 700;
}
.markdang__folder-badge.is-dir { background: transparent; color: var(--muted); }
.markdang__folder-badge svg { width: 13px; height: 13px; }
.markdang__folder-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.markdang__folder-meta { margin-inline-start: auto; font-size: 0.72em; color: var(--muted); flex: none; }
.markdang__folder-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  padding: 2px 10px 8px;
  flex: none;
}
.markdang__folder-toolbar select {
  max-width: 84px;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.78em;
  outline: none;
}
.markdang__folder-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75em;
  color: var(--muted);
  white-space: nowrap;
  cursor: pointer;
}
.markdang__folder-toolbar input[type='checkbox'] { accent-color: var(--primary); margin: 0; }

/* body layout */
.markdang-layout {
  min-height: 100vh;
  transition: padding 0.25s ease;
}
.markdang-side-visible .markdang-layout {
  padding-inline-start: var(--mdg-side-width, 272px);
}
.markdang[data-side='right'].markdang-side-visible .markdang-layout {
  padding-inline-start: 0;
  padding-inline-end: var(--mdg-side-width, 272px);
}

/* zen mode */
.markdang-zen .markdang__side,
.markdang-zen .markdang__button-wrap > .markdang__btn:not(.markdang__btn--exit-zen) {
  display: none !important;
}
.markdang-zen .markdang-layout { padding: 0 !important; }
.markdang__btn--exit-zen { display: none; }
.markdang-zen .markdang__btn--exit-zen {
  display: flex;
  position: fixed;
  top: 14px;
  inset-inline-end: 14px;
  z-index: 40;
  width: auto;
  padding: 8px 14px;
  font-size: 13px;
  opacity: 0.85;
}
.markdang-zen .markdang__btn--exit-zen:hover { opacity: 1; }

/* image zoom modal */
.markdang__modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
  background: var(--modal-bg);
  backdrop-filter: blur(8px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.markdang__modal.opened { opacity: 1; pointer-events: auto; }
.markdang__modal img {
  max-width: 92vw;
  max-height: 92vh;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.35);
}

/* directory view */
.markdang__dir {
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}
.markdang__dir-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.35em;
  font-weight: 650;
  margin: 0 0 4px;
}
.markdang__dir-title svg { width: 22px; height: 22px; fill: var(--primary); }
.markdang__dir-sub { color: var(--muted); font-size: 0.85em; margin: 0 0 18px; }
.markdang__dir-list { list-style: none; margin: 0; padding: 0; }
.markdang__dir-list a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  transition: background 0.1s;
}
.markdang__dir-list a:hover { background: var(--primary-soft); }
.markdang__dir-list a:hover .markdang__dir-name { color: var(--primary); }
.markdang__dir-badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
  background: var(--primary-soft);
  color: var(--primary);
}
.markdang__dir-badge svg { width: 14px; height: 14px; }
.markdang__dir-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.markdang__dir-meta { margin-inline-start: auto; font-size: 0.75em; color: var(--muted); flex: none; }

/* print */
@media print {
  .markdang__side, .markdang__button-wrap, .markdang__btn { display: none !important; }
  .markdang-layout { padding: 0 !important; }
  .markdang-content { max-width: none !important; }
  .markdang-content pre.markdang__code-block code { white-space: pre-wrap; }
}

/* code block themes — light and dark are fully distinct (background +
   syntax palette), so the 浅/深色模式代码块主题 settings have a real,
   visible effect regardless of the page theme. The whole block (bg +
   base text color) follows the code theme, covering non-highlighted
   code too. */
.markdang[data-code='light'] {
  --code-block-bg: #f6f8fa;
  --code-block-border: #d0d7de;
  --code-block-text: #24292f;
}
.markdang[data-code='dark'] {
  --code-block-bg: #0d1117;
  --code-block-border: #30363d;
  --code-block-text: #c9d1d9;
}
.markdang[data-code='light'] .hljs { color: #24292f; }
.markdang[data-code='light'] .hljs-keyword, .markdang[data-code='light'] .hljs-selector-tag,
.markdang[data-code='light'] .hljs-literal, .markdang[data-code='light'] .hljs-doctag,
.markdang[data-code='light'] .hljs-name { color: #cf222e; }
.markdang[data-code='light'] .hljs-string, .markdang[data-code='light'] .hljs-regexp,
.markdang[data-code='light'] .hljs-addition { color: #0a3069; }
.markdang[data-code='light'] .hljs-title, .markdang[data-code='light'] .hljs-section,
.markdang[data-code='light'] .hljs-attribute, .markdang[data-code='light'] .hljs-selector-id { color: #8250df; }
.markdang[data-code='light'] .hljs-number, .markdang[data-code='light'] .hljs-symbol,
.markdang[data-code='light'] .hljs-bullet, .markdang[data-code='light'] .hljs-meta { color: #0550ae; }
.markdang[data-code='light'] .hljs-comment, .markdang[data-code='light'] .hljs-quote { color: #6e7781; }
.markdang[data-code='light'] .hljs-built_in, .markdang[data-code='light'] .hljs-type { color: #953800; }
.markdang[data-code='light'] .hljs-deletion { color: #82071e; }

.markdang[data-code='dark'] .hljs {
  color: #c9d1d9;
}
.markdang[data-code='dark'] .hljs-keyword, .markdang[data-code='dark'] .hljs-selector-tag,
.markdang[data-code='dark'] .hljs-literal, .markdang[data-code='dark'] .hljs-doctag,
.markdang[data-code='dark'] .hljs-name { color: #ff7b72; }
.markdang[data-code='dark'] .hljs-string, .markdang[data-code='dark'] .hljs-regexp,
.markdang[data-code='dark'] .hljs-addition { color: #a5d6ff; }
.markdang[data-code='dark'] .hljs-title, .markdang[data-code='dark'] .hljs-section,
.markdang[data-code='dark'] .hljs-attribute, .markdang[data-code='dark'] .hljs-selector-id { color: #d2a8ff; }
.markdang[data-code='dark'] .hljs-number, .markdang[data-code='dark'] .hljs-symbol,
.markdang[data-code='dark'] .hljs-bullet, .markdang[data-code='dark'] .hljs-meta { color: #79c0ff; }
.markdang[data-code='dark'] .hljs-comment, .markdang[data-code='dark'] .hljs-quote { color: #8b949e; }
.markdang[data-code='dark'] .hljs-built_in, .markdang[data-code='dark'] .hljs-type { color: #ffa657; }
.markdang[data-code='dark'] .hljs-deletion { color: #ffdcd7; }
`
