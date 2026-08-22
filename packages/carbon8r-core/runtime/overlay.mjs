// carbon8r overlay -- the shared runtime behind vite-plugin-carbon8r,
// next-carbon8r and the browser extension. Dev only.
// Hold Alt/Option to inspect; Alt/Option-click opens the source in your editor.

// Where an Alt-click sends the file when no editor protocol is configured.
// This default is the endpoint vite-plugin-carbon8r serves (and what the
// browser extension assumes); next-carbon8r overrides it with Next's own
// built-in launch-editor route, which spells the line parameter differently.
const DEFAULT_OPEN = { path: '/__carbon8r/open', lineParam: 'line' }

let installed = false

/**
 * Idempotent: React StrictMode runs mount effects twice in development, and
 * the overlay is meant to live for the whole session, so the second call is
 * a no-op rather than a second set of listeners.
 */
export function install(CONFIG) {
  if (installed || typeof document === 'undefined') return
  installed = true

  let active = false
  let current = null
  let pointed = null

  const host = document.createElement('div')
  host.setAttribute('data-carbon8r-overlay', '')
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '2147483647'
  })
  const shadow = host.attachShadow({ mode: 'open' })

  // All overlay styling goes through CSSOM property assignments, never <style>
  // elements or style="" attributes: pages with a strict Content-Security-Policy
  // (style-src without 'unsafe-inline') block those, which used to leave the
  // crosshair working but the overlay invisible. CSSOM is exempt from CSP.
  const LAYER_COLORS = {
    margin: 'rgba(246, 178, 107, 0.66)',
    border: 'rgba(255, 229, 153, 0.66)',
    padding: 'rgba(147, 196, 125, 0.55)',
    content: 'rgba(111, 168, 220, 0.66)'
  }
  const layers = {}
  for (const name of ['margin', 'border', 'padding', 'content']) {
    const el = document.createElement('div')
    el.className = 'layer ' + name
    Object.assign(el.style, {
      position: 'fixed',
      display: 'none',
      boxSizing: 'border-box',
      borderStyle: 'solid',
      borderWidth: '0',
      borderColor: name === 'content' ? 'transparent' : LAYER_COLORS[name],
      background: name === 'content' ? LAYER_COLORS.content : 'transparent'
    })
    layers[name] = el
  }
  const label = document.createElement('div')
  label.className = 'label'
  Object.assign(label.style, {
    position: 'fixed',
    display: 'none',
    background: '#0f172a',
    color: '#e2e8f0',
    font: '11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
    padding: '3px 8px',
    borderRadius: '5px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
    whiteSpace: 'nowrap',
    maxWidth: '70vw',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  })
  shadow.append(layers.margin, layers.border, layers.padding, layers.content, label)
  document.documentElement.appendChild(host)

  function parseTarget(el) {
    const raw = el.getAttribute('data-carbon8r')
    if (!raw) return null
    const match = /^(.*):(\d+):(\d+)$/.exec(raw)
    if (!match) return null
    return {
      file: match[1],
      line: Number(match[2]),
      column: Number(match[3]),
      component: el.getAttribute('data-carbon8r-name') || el.tagName.toLowerCase()
    }
  }

  function hrefFor(el) {
    const target = parseTarget(el)
    if (!target) return null
    if (CONFIG.template) {
      const abs = CONFIG.root.replace(/\/$/, '') + '/' + target.file
      return CONFIG.template
        .replace('{file}', abs)
        .replace('{line}', String(target.line))
        .replace('{column}', String(target.column))
    }
    const open = CONFIG.open ?? DEFAULT_OPEN
    return (
      open.path +
      '?file=' +
      encodeURIComponent(target.file) +
      '&' +
      (open.lineParam ?? DEFAULT_OPEN.lineParam) +
      '=' +
      target.line +
      '&column=' +
      target.column
    )
  }

  function placeLayer(el, left, top, width, height, ring) {
    Object.assign(el.style, {
      display: 'block',
      left: left + 'px',
      top: top + 'px',
      width: Math.max(0, width) + 'px',
      height: Math.max(0, height) + 'px',
      borderWidth: ring ? `${ring.top}px ${ring.right}px ${ring.bottom}px ${ring.left}px` : '0'
    })
  }

  // Document-level listeners see events from inside shadow trees retargeted to
  // the shadow host — the real element only appears in composedPath(). These
  // resolvers walk the composed path so apps rendered inside (open) shadow
  // roots work; for light-DOM pages the path is just target + ancestors, so
  // the behavior is identical to closest().
  function elementFromEvent(e) {
    const path = e.composedPath ? e.composedPath() : []
    if (path[0] instanceof Element) return path[0]
    return e.target instanceof Element ? e.target : null
  }

  function instrumentedFromEvent(e) {
    const path = e.composedPath ? e.composedPath() : []
    for (const node of path) {
      if (node instanceof Element && node.hasAttribute('data-carbon8r')) return node
    }
    const target = e.target instanceof Element ? e.target : null
    return target ? target.closest('[data-carbon8r]') : null
  }

  // display:contents wrappers and unstyled custom-element hosts have no box of
  // their own; walk toward the root (hopping shadow boundaries) for one.
  function renderedBox(el) {
    let node = el
    while (node instanceof Element) {
      const r = node.getBoundingClientRect()
      if (r.width || r.height) return node
      const root = node.getRootNode()
      node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
    }
    return el
  }

  function describe(el) {
    let s = el.tagName.toLowerCase()
    if (el.id) s += '#' + el.id
    for (const c of [...el.classList].slice(0, 2)) s += '.' + c
    if (el.classList.length > 2) s += '…'
    return s
  }

  function position() {
    if (!current || !current.isConnected) return clearTarget()
    let boxEl = current
    let rect = current.getBoundingClientRect()
    if (!rect.width && !rect.height) {
      boxEl = renderedBox(pointed ?? current)
      rect = boxEl.getBoundingClientRect()
    }
    const cs = getComputedStyle(boxEl)
    const px = (v) => parseFloat(v) || 0
    const sides = (prop, suffix = '') => ({
      top: px(cs[prop + 'Top' + suffix]),
      right: px(cs[prop + 'Right' + suffix]),
      bottom: px(cs[prop + 'Bottom' + suffix]),
      left: px(cs[prop + 'Left' + suffix])
    })
    const margin = sides('margin')
    // Negative margins pull layout but can't be drawn as a ring; clamp to 0.
    for (const k in margin) margin[k] = Math.max(0, margin[k])
    const border = sides('border', 'Width')
    const padding = sides('padding')

    // rect is the border box; grow outward for margin, shrink inward for the rest.
    placeLayer(
      layers.margin,
      rect.left - margin.left,
      rect.top - margin.top,
      rect.width + margin.left + margin.right,
      rect.height + margin.top + margin.bottom,
      margin
    )
    placeLayer(layers.border, rect.left, rect.top, rect.width, rect.height, border)
    const padBox = {
      left: rect.left + border.left,
      top: rect.top + border.top,
      width: rect.width - border.left - border.right,
      height: rect.height - border.top - border.bottom
    }
    placeLayer(layers.padding, padBox.left, padBox.top, padBox.width, padBox.height, padding)
    placeLayer(
      layers.content,
      padBox.left + padding.left,
      padBox.top + padding.top,
      padBox.width - padding.left - padding.right,
      padBox.height - padding.top - padding.bottom,
      null
    )

    const info = parseTarget(current)
    label.innerHTML = ''
    const name = document.createElement('b')
    Object.assign(name.style, { color: '#7dd3fc', fontWeight: '600' })
    if (info) {
      name.textContent = `<${info.component}> `
      label.append(name, `${info.file}:${info.line}:${info.column}`)
    } else {
      // Uninstrumented element: still a useful box-model inspector.
      name.textContent = describe(current) + ' '
      label.append(name, `${Math.round(rect.width)}×${Math.round(rect.height)}`)
    }
    const marginTop = rect.top - margin.top
    const marginBottom = rect.bottom + margin.bottom
    const labelTop = marginTop - 26
    Object.assign(label.style, {
      display: 'block',
      top: (labelTop < 4 ? marginBottom + 6 : labelTop) + 'px',
      left: Math.max(4, Math.min(rect.left - margin.left, window.innerWidth - 260)) + 'px'
    })
  }

  function setTarget(el, hovered = el) {
    if (el === current && hovered === pointed) return
    current = el
    pointed = hovered
    if (el) position()
    else clearTarget()
  }

  function clearTarget() {
    current = null
    pointed = null
    for (const name in layers) layers[name].style.display = 'none'
    label.style.display = 'none'
  }

  function activate() {
    if (active) return
    active = true
    document.documentElement.style.cursor = 'crosshair'
  }

  function deactivate() {
    if (!active) return
    active = false
    document.documentElement.style.cursor = ''
    clearTarget()
  }

  function open(el) {
    const href = hrefFor(el)
    if (!href) return
    if (CONFIG.template) {
      window.location.assign(href)
      return
    }
    fetch(href)
      .then((res) => {
        if (!res.ok)
          console.warn(
            `[carbon8r] the dev server did not open the editor (HTTP ${res.status})` +
              (CONFIG.hint ? ` — ${CONFIG.hint}` : '')
          )
      })
      .catch(() => {})
  }

  // Keyboard is the primary activation signal, but every mouse event also
  // carries the live modifier state in e.altKey. Trusting that flag keeps the
  // overlay in sync in environments where the Alt keydown/keyup never reaches
  // the page (webviews, automation, OS-level shortcut managers).
  function syncFromEvent(e) {
    if (e.altKey && !active) activate()
    else if (!e.altKey && active) deactivate()
    return active
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Alt' && !e.repeat) activate()
  })
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') deactivate()
  })
  window.addEventListener('blur', deactivate)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) deactivate()
  })

  document.addEventListener(
    'mousemove',
    (e) => {
      if (!syncFromEvent(e)) return
      // Prefer the instrumented ancestor (it carries a source location); fall
      // back to the raw element so the box-model inspector works on any page.
      const hovered = elementFromEvent(e)
      setTarget(hovered ? (instrumentedFromEvent(e) ?? hovered) : null, hovered)
    },
    { capture: true, passive: true }
  )

  window.addEventListener('scroll', () => active && position(), {
    capture: true,
    passive: true
  })
  window.addEventListener('resize', () => active && position(), { passive: true })

  // While engaged over a target, swallow the entire gesture family so neither
  // the app's handlers nor the browser's defaults run. contextmenu matters:
  // some environments turn Alt+click into a right-click, and preventing it here
  // is what stops the native context menu. Both click and contextmenu open the
  // editor, so those remapped setups still work.
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click', 'auxclick', 'contextmenu']) {
    window.addEventListener(
      type,
      (e) => {
        if (!syncFromEvent(e)) return
        // Only hijack input over instrumented elements — there a click opens
        // the source. Over anything else the overlay is purely visual, so
        // clicks (and native Alt+click behaviors) pass through untouched.
        const el = instrumentedFromEvent(e)
        if (!el) return
        e.preventDefault()
        e.stopImmediatePropagation()
        setTarget(el, elementFromEvent(e))
        if (type === 'click' || type === 'contextmenu') open(el)
      },
      { capture: true }
    )
  }

  // Debug/testing handle
  window.__CARBON8R__ = {
    version: CONFIG.version ?? 'unknown',
    config: CONFIG,
    get element() {
      return current
    },
    activate,
    deactivate,
    hrefFor,
    get active() {
      return active
    },
    get target() {
      return current ? parseTarget(current) : null
    }
  }

  if (!CONFIG.quiet)
    console.log(
      '%c[carbon8r]%c hold Alt/Option and click an element to open its source',
      'color:#7dd3fc;font-weight:bold',
      ''
    )
}
