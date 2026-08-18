// Builds dist/ for "Load unpacked". The content script is the shared overlay
// from vite-plugin-carbon8r (single source of truth), wrapped so the shim can
// decide at runtime whether to start it.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, 'dist')
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8')

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(dist)

const overlay = read('../vite-plugin-carbon8r/runtime/overlay.js')
fs.writeFileSync(
  path.join(dist, 'content.js'),
  read('src/presets.js') +
    '\n' +
    read('src/shim.js') +
    '\nglobalThis.__carbon8rRun = function () {\n' +
    overlay +
    '\n}\n'
)
fs.writeFileSync(path.join(dist, 'presets.js'), read('src/presets.js'))
fs.copyFileSync(path.join(here, 'manifest.json'), path.join(dist, 'manifest.json'))
fs.copyFileSync(path.join(here, 'src/popup.html'), path.join(dist, 'popup.html'))
fs.copyFileSync(path.join(here, 'src/popup.js'), path.join(dist, 'popup.js'))
console.log('built ' + dist)
