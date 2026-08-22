import fs from 'node:fs'
import path from 'node:path'
import { injectLocations, overlayPath } from 'carbon8r-core'
import launch from 'launch-editor'

const RUNTIME_PUBLIC_ID = '/@carbon8r/runtime'
const RUNTIME_RESOLVED_ID = '\0' + RUNTIME_PUBLIC_ID

const PKG_VERSION = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version

const EDITOR_TEMPLATES = {
  vscode: 'vscode://file/{file}:{line}:{column}',
  'vscode-insiders': 'vscode-insiders://file/{file}:{line}:{column}',
  cursor: 'cursor://file/{file}:{line}:{column}',
  windsurf: 'windsurf://file/{file}:{line}:{column}',
  zed: 'zed://file/{file}:{line}:{column}'
}

/**
 * @param {object} [options]
 * @param {string} [options.editor] By default the dev server opens files with
 *   launch-editor (auto-detects the running editor, respects $EDITOR /
 *   $LAUNCH_EDITOR). Pass a preset name ('vscode', 'vscode-insiders',
 *   'cursor', 'windsurf', 'zed') or a URL template containing {file}, {line},
 *   {column} to open via a browser protocol URL instead.
 * @returns {import('vite').Plugin}
 */
export default function carbon8r(options = {}) {
  let root = process.cwd()
  const template = options.editor
    ? EDITOR_TEMPLATES[options.editor] ?? options.editor
    : null

  return {
    name: 'vite-plugin-carbon8r',
    apply: 'serve',
    enforce: 'pre',

    configResolved(config) {
      root = config.root
    },

    configureServer(server) {
      server.middlewares.use('/__carbon8r/open', (req, res) => {
        const params = new URL(req.url, 'http://localhost').searchParams
        const file = params.get('file') ?? ''
        const line = Number(params.get('line')) || 1
        const column = Number(params.get('column')) || 1
        const abs = path.resolve(root, file)
        if (abs !== root && !abs.startsWith(root + path.sep)) {
          res.statusCode = 403
          res.end('file outside project root')
          return
        }
        launch(`${abs}:${line}:${column}`, undefined, (fileName, errorMsg) => {
          server.config.logger.warn(
            `[carbon8r] could not open ${fileName} in an editor` +
              (errorMsg ? `: ${errorMsg}` : '') +
              ` — set the plugin's \`editor\` option or $LAUNCH_EDITOR`
          )
        })
        res.statusCode = 204
        res.end()
      })
    },

    transform(code, id) {
      const file = id.split('?')[0]
      if (!/\.[jt]sx$/.test(file)) return
      if (file.includes('node_modules')) return
      return injectLocations(code, file, root)
    },

    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module', src: RUNTIME_PUBLIC_ID },
          injectTo: 'body'
        }
      ]
    },

    resolveId(id) {
      if (id === RUNTIME_PUBLIC_ID) return RUNTIME_RESOLVED_ID
    },

    load(id) {
      if (id !== RUNTIME_RESOLVED_ID) return
      // The shared runtime exports install(); the virtual module is just its
      // source with a call appended. It defaults to the /__carbon8r/open
      // endpoint served above, so no `open` override is needed here.
      const source = fs.readFileSync(overlayPath, 'utf8')
      const config = {
        root,
        template,
        version: PKG_VERSION,
        hint: 'is vite-plugin-carbon8r running here? Otherwise configure an editor protocol.'
      }
      return `${source}\ninstall(${JSON.stringify(config)})\n`
    }
  }
}
