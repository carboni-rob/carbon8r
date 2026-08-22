// carbon8r extension content script — configuration shim.
// build.mjs concatenates: presets.js + this file + the shared overlay from
// carbon8r-core wrapped in globalThis.__carbon8rRun, which calls the overlay's
// install() with __CARBON8R_CONFIG__. We define that global here and fill it
// from settings.
globalThis.__CARBON8R_CONFIG__ = { root: '', template: null, quiet: true, version: '__CARBON8R_EXT_VERSION__' }

// How long to wait for the page to install its own overlay before deciding
// it never will. The app's runtime mounts after its framework has hydrated,
// which is later than document_idle — so checking once, here, would always
// win the race and leave two overlays both intercepting clicks.
const APP_OVERLAY_GRACE_MS = 1500

const appHasOverlay = () => !!document.querySelector('[data-carbon8r-overlay]')

// In "auto" mode clicks go to the dev server's open-in-editor endpoint. The
// overlay defaults to the one vite-plugin-carbon8r serves; Next ships its own
// route instead, and spells the line parameter differently. Detect it from
// the DOM — a content script's globals are an isolated world, so the page's
// own __NEXT_DATA__ is not visible here.
function endpointForPage() {
  if (document.querySelector('script[src*="/_next/"]')) {
    return { path: '/__nextjs_launch-editor', lineParam: 'lineNumber' }
  }
  return null
}

function start(settings) {
  __CARBON8R_CONFIG__.root = settings.root
  __CARBON8R_CONFIG__.template =
    settings.editor === 'auto'
      ? null
      : settings.editor === 'custom'
        ? settings.customTemplate || null
        : globalThis.__CARBON8R_PRESETS__[settings.editor] ?? null

  if (!__CARBON8R_CONFIG__.template) {
    const endpoint = endpointForPage()
    if (endpoint) __CARBON8R_CONFIG__.open = endpoint
  }

  globalThis.__carbon8rRun()
}

chrome.storage.sync.get(
  { enabled: true, editor: 'auto', customTemplate: '', root: '' },
  (settings) => {
    if (!settings.enabled) return
    // The page already runs the plugin-injected overlay; don't double up —
    // two runtimes would both intercept clicks and open the editor twice.
    if (appHasOverlay()) return

    const observer = new MutationObserver(() => {
      if (!appHasOverlay()) return
      clearTimeout(timer)
      observer.disconnect()
    })
    observer.observe(document.documentElement, { childList: true })

    const timer = setTimeout(() => {
      observer.disconnect()
      if (!appHasOverlay()) start(settings)
    }, APP_OVERLAY_GRACE_MS)
  }
)
