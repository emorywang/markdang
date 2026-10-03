/* Boot shim — injected at document_start, before the first paint.
   For markdown candidate pages it hides the raw <pre> so the user never
   sees unstyled source, shows a loading dot only if rendering is slow,
   and falls back to the raw text after 4s if the reader never renders. */
(function () {
  try {
    var contentType = document.contentType || '';
    if (!/^text\/(plain|markdown|x-markdown)\b/.test(contentType)) return;

    var style = document.createElement('style');
    style.id = 'markdang-boot-style';
    style.textContent = 'pre{visibility:hidden !important}';
    (document.head || document.documentElement).appendChild(style);

    var loading = document.createElement('div');
    loading.id = 'markdang-boot-loading';
    loading.innerHTML =
      '<style>#markdang-boot-loading{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:9999;pointer-events:none}#markdang-boot-loading.show{display:flex}#markdang-boot-loading .mdg-dot{width:11px;height:11px;border-radius:50%;background:#4f46e5;animation:mdgBootPulse 1s ease-in-out infinite}@keyframes mdgBootPulse{0%,100%{transform:scale(.55);opacity:.35}50%{transform:scale(1);opacity:1}}</style><div class="mdg-dot"></div>';
    (document.body || document.documentElement).appendChild(loading);

    var done = false;
    function cleanup() {
      if (done) return;
      done = true;
      style.remove();
      loading.remove();
    }
    window.__markdangBootCleanup = cleanup;

    /* reveal the loading dot only when rendering is actually slow */
    setTimeout(function () {
      if (!window.__markdangRendered) loading.classList.add('show');
    }, 250);

    /* fallback: if the reader never renders, bring the raw text back */
    setTimeout(cleanup, 4000);
  } catch (e) {
    /* never break the host page because of the shim */
  }
})();
