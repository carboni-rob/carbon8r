'use strict'

const { injectLocations } = require('carbon8r-core')

/**
 * webpack / Turbopack loader that stamps source locations onto host JSX
 * elements. Registered with `enforce: 'pre'` (webpack) and as a Turbopack
 * rule, so it always sees the original JSX rather than compiler output.
 *
 * @this {import('webpack').LoaderContext<{ root?: string }>}
 */
module.exports = function carbon8rLoader(source, inputMap) {
  this.cacheable?.(true)

  // The webpack rule carries an `exclude`, but Turbopack rules match on a
  // glob with no way to exclude, so the guard has to live here too.
  if (this.resourcePath.includes('node_modules')) {
    return this.callback(null, source, inputMap)
  }

  const { root } = this.getOptions?.() ?? {}
  const result = injectLocations(
    source,
    this.resourcePath,
    root || this.rootContext || process.cwd()
  )

  // Nothing to stamp — hand the module back untouched so we stay invisible
  // to the rest of the chain.
  if (!result) return this.callback(null, source, inputMap)

  this.callback(null, result.code, result.map)
}
