import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import MagicString from 'magic-string'
import launch from 'launch-editor'

const RUNTIME_PUBLIC_ID = '/@carbon8r/runtime'
const RUNTIME_RESOLVED_ID = '\0' + RUNTIME_PUBLIC_ID

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
      const runtimePath = new URL('../runtime/overlay.js', import.meta.url)
      const source = fs.readFileSync(runtimePath, 'utf8')
      return source.replace(
        '__CARBON8R_CONFIG__',
        JSON.stringify({ root, template })
      )
    }
  }
}

function injectLocations(code, file, root) {
  let ast
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true
    })
  } catch {
    return
  }

  const rel = path.relative(root, file).split(path.sep).join('/')
  const s = new MagicString(code)
  let count = 0

  walk(ast.program, [], (node, ancestors) => {
    if (node.type !== 'JSXOpeningElement') return
    const name = node.name
    // Host elements only (<div>, <button>, ...). Adding data-* props to
    // components (<Button>) would leak unknown props into their prop objects.
    if (name.type !== 'JSXIdentifier' || !/^[a-z]/.test(name.name)) return

    const { line, column } = node.loc.start
    const component = enclosingComponentName(ancestors) || basename(file)
    s.appendLeft(
      name.end,
      ` data-carbon8r="${escapeAttr(rel)}:${line}:${column + 1}"` +
        ` data-carbon8r-name="${escapeAttr(component)}"`
    )
    count++
  })

  if (!count) return
  return { code: s.toString(), map: s.generateMap({ hires: true }) }
}

function walk(node, ancestors, cb) {
  cb(node, ancestors)
  ancestors.push(node)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child.type === 'string') walk(child, ancestors, cb)
      }
    } else if (value && typeof value.type === 'string') {
      walk(value, ancestors, cb)
    }
  }
  ancestors.pop()
}

// Nearest enclosing function that has a resolvable name, e.g.
// `function App()`, `const Button = () => ...`, `class Foo { render() }`.
function enclosingComponentName(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = ancestors[i]
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'ClassDeclaration' ||
      node.type === 'ClassExpression'
    ) {
      if (node.id?.name) return node.id.name
    } else if (
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      if (node.id?.name) return node.id.name
      const parent = ancestors[i - 1]
      if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        return parent.id.name
      }
    }
  }
  return null
}

function basename(file) {
  return path.basename(file).replace(/\.[^.]+$/, '')
}

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
