// Builds dist/ for "Load unpacked". The content script is the shared overlay
// from carbon8r-core (single source of truth), wrapped so the shim can decide
// at runtime whether to start it.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, 'dist')
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8')

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(dist)

// The core runtime is an ES module, but a content script is a classic script:
// drop the one `export` keyword so the body can be inlined into a function.
const overlaySource = read('../carbon8r-core/runtime/overlay.mjs')
const overlay = overlaySource.replace('export function install', 'function install')
if (overlay === overlaySource) throw new Error('could not un-export the core overlay')

fs.writeFileSync(
  path.join(dist, 'content.js'),
  read('src/presets.js') +
    '\n' +
    read('src/shim.js') +
    '\nglobalThis.__carbon8rRun = function () {\n' +
    overlay +
    '\ninstall(globalThis.__CARBON8R_CONFIG__)\n' +
    '}\n'
)
fs.writeFileSync(path.join(dist, 'presets.js'), read('src/presets.js'))
fs.copyFileSync(path.join(here, 'manifest.json'), path.join(dist, 'manifest.json'))
fs.copyFileSync(path.join(here, 'src/popup.html'), path.join(dist, 'popup.html'))
fs.copyFileSync(path.join(here, 'src/popup.js'), path.join(dist, 'popup.js'))
fs.cpSync(path.join(here, 'icons'), path.join(dist, 'icons'), { recursive: true })
console.log('built ' + dist)
