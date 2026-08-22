// carbon8r extension content script — configuration shim.
// build.mjs concatenates: presets.js + this file + the shared overlay from
// carbon8r-core wrapped in globalThis.__carbon8rRun, which calls the overlay's
// install() with __CARBON8R_CONFIG__. We define that global here and fill it
// from settings. Leaving `open` unset keeps the overlay's default endpoint,
// which is the one vite-plugin-carbon8r serves.
globalThis.__CARBON8R_CONFIG__ = { root: '', template: null, quiet: true, version: 'extension-0.2.2' }

chrome.storage.sync.get(
  { enabled: true, editor: 'auto', customTemplate: '', root: '' },
  (settings) => {
    if (!settings.enabled) return
    // The page already runs the plugin-injected overlay; don't double up —
    // two runtimes would both intercept clicks and open the editor twice.
    if (document.querySelector('[data-carbon8r-overlay]')) return
    __CARBON8R_CONFIG__.root = settings.root
    __CARBON8R_CONFIG__.template =
      settings.editor === 'auto'
        ? null
        : settings.editor === 'custom'
          ? settings.customTemplate || null
          : globalThis.__CARBON8R_PRESETS__[settings.editor] ?? null
    globalThis.__carbon8rRun()
  }
)
