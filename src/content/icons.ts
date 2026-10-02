/* Icons: folder/outline/search/sliders/sun/chevron/fullscreen/copy ported from
   MarkDang C1 VI 02_icons (24 viewBox, 1.75 stroke). code/print/top/side/zen stay
   hand-drawn (no VI counterpart) with stroke aligned to 1.75. */
const G =
  '<g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
const wrap = (body: string) => `<svg viewBox="0 0 24 24">${G}${body}</g></svg>`

export const SVG = {
  folder: wrap('<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'),
  outline: wrap('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
  search: wrap('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>'),
  side: wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14"/>'),
  code: wrap('<path d="m8 7-5 5 5 5m8-10 5 5-5 5"/>'),
  print: wrap('<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>'),
  fullscreen: wrap('<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/>'),
  top: wrap('<path d="M12 19V5m-7 7 7-7 7 7"/>'),
  zen: wrap('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
  sun: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  chevron: wrap('<path d="m8 4 8 8-8 8"/>'),
  copy: wrap('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
  sliders: wrap('<path d="M4 6h16M4 12h16M4 18h16"/><rect x="7" y="4" width="3" height="4" rx="1"/><rect x="14" y="10" width="3" height="4" rx="1"/><rect x="8" y="16" width="3" height="4" rx="1"/>'),
}
