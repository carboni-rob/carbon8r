// carbon8r overlay — injected by vite-plugin-carbon8r, dev server only.
// Hold Alt/Option to inspect; Alt/Option-click opens the source in your editor.
const CONFIG = __CARBON8R_CONFIG__

let active = false
let current = null

const host = document.createElement('div')
host.setAttribute('data-carbon8r-overlay', '')
Object.assign(host.style, {
  position: 'fixed',
  inset: '0',
  pointerEvents: 'none',
  zIndex: '2147483647'
})
const shadow = host.attachShadow({ mode: 'open' })

const style = document.createElement('style')
style.textContent = `
  .layer {
    position: fixed;
    display: none;
    box-sizing: border-box;
    border: 0 solid transparent;
  }
  .margin  { border-color: rgba(246, 178, 107, 0.66); }
  .border  { border-color: rgba(255, 229, 153, 0.66); }
  .padding { border-color: rgba(147, 196, 125, 0.55); }
  .content { background: rgba(111, 168, 220, 0.66); }
  .label {
    position: fixed;
    display: none;
    background: #0f172a;
    color: #e2e8f0;
    font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 3px 8px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    white-space: nowrap;
    max-width: 70vw;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .label b { color: #7dd3fc; font-weight: 600; }
`
const layers = {}
for (const name of ['margin', 'border', 'padding', 'content']) {
  const el = document.createElement('div')
  el.className = 'layer ' + name
  layers[name] = el
}
const label = document.createElement('div')
label.className = 'label'
shadow.append(style, layers.margin, layers.border, layers.padding, layers.content, label)
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
  return (
    '/__carbon8r/open?file=' +
    encodeURIComponent(target.file) +
    '&line=' +
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

function describe(el) {
  let s = el.tagName.toLowerCase()
  if (el.id) s += '#' + el.id
  for (const c of [...el.classList].slice(0, 2)) s += '.' + c
  if (el.classList.length > 2) s += '…'
  return s
}

function position() {
  if (!current || !current.isConnected) return clearTarget()
  const rect = current.getBoundingClientRect()
  const cs = getComputedStyle(current)
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

function setTarget(el) {
  if (el === current) return
  current = el
  if (el) position()
  else clearTarget()
}

function clearTarget() {
  current = null
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
          `[carbon8r] dev server did not open the editor (HTTP ${res.status}) — ` +
            'is vite-plugin-carbon8r running here? Otherwise configure an editor protocol.'
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
    const target = e.target instanceof Element ? e.target : null
    setTarget(target ? (target.closest('[data-carbon8r]') ?? target) : null)
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
      const el = e.target instanceof Element ? e.target.closest('[data-carbon8r]') : null
      if (!el) return
      e.preventDefault()
      e.stopImmediatePropagation()
      setTarget(el)
      if (type === 'click' || type === 'contextmenu') open(el)
    },
    { capture: true }
  )
}

// Debug/testing handle
window.__CARBON8R__ = {
  config: CONFIG,
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
