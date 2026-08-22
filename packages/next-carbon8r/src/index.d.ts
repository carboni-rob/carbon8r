import type { NextConfig } from 'next'

export interface Carbon8rOptions {
  /**
   * By default Alt-click hands the file to Next's own dev endpoint
   * (`/__nextjs_launch-editor`), which respects `$EDITOR` / `$REACT_EDITOR`.
   * Pass a preset name or a URL template containing {file}, {line}, {column}
   * to open via a browser protocol URL instead — useful when the browser and
   * the dev server are not on the same machine.
   */
  editor?: 'vscode' | 'vscode-insiders' | 'cursor' | 'windsurf' | 'zed' | (string & {})
  /**
   * Which modules get instrumented. Defaults to `/\.(jsx|tsx|js|mjs)$/`,
   * excluding `node_modules`.
   */
  test?: RegExp
  /**
   * Absolute project root. Source locations are emitted relative to it.
   * Defaults to `process.cwd()`, which is the project directory under
   * `next dev`.
   */
  root?: string
  /** Silence the console banner the overlay prints on startup. */
  quiet?: boolean
  /**
   * Force the instrumentation on or off. Defaults to on only outside
   * production builds.
   */
  enabled?: boolean
}

/**
 * Wraps a Next.js config so JSX host elements carry their source location in
 * development. Registers the loader for both webpack and Turbopack; a
 * production `next build` is left untouched.
 */
export function withCarbon8r(nextConfig?: NextConfig, options?: Carbon8rOptions): NextConfig
export default withCarbon8r
