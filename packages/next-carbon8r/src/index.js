'use strict'

const path = require('node:path')

const PKG_VERSION = require('../package.json').version
const LOADER = require.resolve('./loader')

const DEFAULT_TEST = /\.(jsx|tsx|js|mjs)$/
const TURBOPACK_GLOB = '*.{jsx,tsx,js,mjs}'

const EDITOR_TEMPLATES = {
  vscode: 'vscode://file/{file}:{line}:{column}',
  'vscode-insiders': 'vscode-insiders://file/{file}:{line}:{column}',
  cursor: 'cursor://file/{file}:{line}:{column}',
  windsurf: 'windsurf://file/{file}:{line}:{column}',
  zed: 'zed://file/{file}:{line}:{column}'
}

/**
 * @param {import('next').NextConfig} [nextConfig]
 * @param {import('./index').Carbon8rOptions} [options]
 * @returns {import('next').NextConfig}
 */
function withCarbon8r(nextConfig = {}, options = {}) {
  const enabled = options.enabled ?? process.env.NODE_ENV !== 'production'
  if (!enabled) return nextConfig

  const root = options.root ? path.resolve(options.root) : process.cwd()
  const test = options.test ?? DEFAULT_TEST
  const template = options.editor
    ? EDITOR_TEMPLATES[options.editor] ?? options.editor
    : null

  const loaderOptions = { root }
  const clientConfig = {
    root,
    template,
    version: PKG_VERSION,
    quiet: options.quiet ?? false
  }

  return {
    ...nextConfig,

    // Inlined into both bundles so <Carbon8r /> needs no props.
    env: {
      ...nextConfig.env,
      NEXT_PUBLIC_CARBON8R_CONFIG: JSON.stringify(clientConfig)
    },

    ...turbopackConfig(nextConfig, loaderOptions),

    webpack(config, context) {
      // App Router renders host elements on the server, so the server
      // compilation needs the attributes just as much as the client one.
      config.module.rules.push({
        test,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [{ loader: LOADER, options: loaderOptions }]
      })
      return typeof nextConfig.webpack === 'function'
        ? nextConfig.webpack(config, context)
        : config
    }
  }
}

// `turbopack` is the top-level key from Next 15.3; older releases only know
// `experimental.turbo`. Writing the wrong one is silently ignored, so pick
// based on the Next actually installed.
function turbopackConfig(nextConfig, loaderOptions) {
  const rule = { loaders: [{ loader: LOADER, options: loaderOptions }] }

  if (supportsTopLevelTurbopack()) {
    const existing = nextConfig.turbopack ?? {}
    return {
      turbopack: {
        ...existing,
        rules: { ...existing.rules, [TURBOPACK_GLOB]: rule }
      }
    }
  }

  const experimental = nextConfig.experimental ?? {}
  const turbo = experimental.turbo ?? {}
  return {
    experimental: {
      ...experimental,
      turbo: { ...turbo, rules: { ...turbo.rules, [TURBOPACK_GLOB]: rule } }
    }
  }
}

function supportsTopLevelTurbopack() {
  try {
    const version = require('next/package.json').version
    const [major, minor] = version.split('.').map(Number)
    return major > 15 || (major === 15 && minor >= 3)
  } catch {
    return true
  }
}

module.exports = withCarbon8r
module.exports.withCarbon8r = withCarbon8r
module.exports.default = withCarbon8r
