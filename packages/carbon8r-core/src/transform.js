'use strict'

const path = require('node:path')
const { parse } = require('@babel/parser')
const MagicString = require('magic-string')

// Cheap gate before paying for a full parse: a file with no `<Tag` can't
// contain JSX, and Next compiles plenty of plain .js/.mjs that never do.
const LOOKS_LIKE_JSX = /<[a-zA-Z]/

/**
 * Adds `data-carbon8r="<relative>:<line>:<column>"` to every host JSX element.
 * Returns null when there is nothing to rewrite.
 *
 * @param {string} code
 * @param {string} file absolute path of the module being transformed
 * @param {string} root absolute project root; locations are emitted relative to it
 * @returns {{ code: string, map: object } | null}
 */
function injectLocations(code, file, root) {
  if (!LOOKS_LIKE_JSX.test(code)) return null

  let ast
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true
    })
  } catch {
    return null
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

  if (!count) return null
  return { code: s.toString(), map: s.generateMap({ source: file, hires: true }) }
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

// Absolute path to the overlay runtime source. vite-plugin-carbon8r serves it
// as a virtual module and the browser extension inlines it into its content
// script, so both need the file itself rather than an import.
const overlayPath = path.join(__dirname, '..', 'runtime', 'overlay.mjs')

module.exports = { injectLocations, overlayPath }
