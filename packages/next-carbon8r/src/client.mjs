'use client'

import { useEffect } from 'react'

// Inlined by withCarbon8r() through Next's `env` config. Undefined when the
// wrapper is absent, which makes this component inert.
const RAW_CONFIG = process.env.NEXT_PUBLIC_CARBON8R_CONFIG

// Inlined by Next; '' when the app sets no basePath.
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || ''

// Next's dev server already exposes an open-in-editor route, and it resolves
// the path against the project root -- the same relative form the loader
// stamps -- so carbon8r needs no middleware of its own. It spells the line
// parameter `lineNumber`, unlike the Vite plugin's own endpoint.
const OPEN = {
  path: BASE_PATH + '/__nextjs_launch-editor',
  lineParam: 'lineNumber'
}
const HINT =
  'set $EDITOR / $REACT_EDITOR, or pass an `editor` option to withCarbon8r().'

/**
 * Mounts the carbon8r overlay. Render once, in the root layout.
 */
export function Carbon8r() {
  useEffect(() => {
    // Written out literally rather than hoisted to a const: bundlers
    // substitute NODE_ENV inline, so a production build folds this to
    // `if (true) return` and drops the overlay chunk altogether instead of
    // emitting one that is never fetched.
    if (process.env.NODE_ENV === 'production') return
    if (!RAW_CONFIG) return

    let cancelled = false
    import('carbon8r-core/overlay').then(
      ({ install }) => {
        if (!cancelled) install({ ...JSON.parse(RAW_CONFIG), open: OPEN, hint: HINT })
      },
      (err) => console.error('[carbon8r] failed to load the overlay', err)
    )
    return () => {
      cancelled = true
    }
  }, [])

  return null
}

export default Carbon8r
