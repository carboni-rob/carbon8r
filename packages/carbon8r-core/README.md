<p align="center">
  <img src="https://raw.githubusercontent.com/carboni-rob/carbon8r/main/assets/icon.png" width="120" alt="carbon8r logo" />
</p>

# carbon8r-core

[![npm](https://img.shields.io/npm/v/carbon8r-core?color=2ee6e6&label=npm)](https://www.npmjs.com/package/carbon8r-core)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/carboni-rob/carbon8r/blob/main/LICENSE)

Shared internals for [carbon8r](https://github.com/carboni-rob/carbon8r).
You almost certainly want one of the host packages instead:

- [`vite-plugin-carbon8r`](https://www.npmjs.com/package/vite-plugin-carbon8r) — **Vite**
- [`next-carbon8r`](https://www.npmjs.com/package/next-carbon8r) — **Next.js** (App Router, Turbopack
  and webpack)
- [`carbon8r-extension`](https://github.com/carboni-rob/carbon8r/tree/main/packages/carbon8r-extension) — companion Chrome extension

This package holds the two pieces both of them (and the browser extension)
would otherwise duplicate:

- `injectLocations(code, file, root)` — the Babel-based JSX transform that
  stamps source locations onto host elements.
- `carbon8r-core/overlay` — the shadow-DOM overlay runtime, exporting
  `install(config)`.

## Overlay config

```js
install({
  root,              // absolute project root (only needed for `template`)
  template,          // editor protocol URL with {file} {line} {column}, or null
  open,              // { path, lineParam } dev-server endpoint; defaults to
                     // { path: '/__carbon8r/open', lineParam: 'line' }
  hint,              // extra text for the "could not open editor" warning
  quiet,             // suppress the startup console banner
  version
})
```

## Versioning

Released at 1.0 deliberately: the surface is two exports, and the host
packages depend on `^1.0.0` so core can ship minors without a coordinated
release across every package. A breaking change here is a major bump.

## License

MIT
