<p align="center">
  <img src="https://raw.githubusercontent.com/carboni-rob/carbon8r/main/assets/icon.png" width="120" alt="carbon8r logo" />
</p>

# next-carbon8r

[![npm](https://img.shields.io/npm/v/next-carbon8r?color=2ee6e6&label=npm)](https://www.npmjs.com/package/next-carbon8r)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/carboni-rob/carbon8r/blob/main/LICENSE)

Hold **Option/Alt** and click any element in your Next.js app to open its
source in your editor. Works with React 19, the App Router, and both
**Turbopack** and **webpack**.

Dev-only: a production `next build` emits neither the attributes nor the
overlay.

![carbon8r demo](https://raw.githubusercontent.com/carboni-rob/carbon8r/main/assets/demo.gif)

## Install

```sh
npm i -D next-carbon8r
```

## Setup

Two steps. Wrap your config:

```js
// next.config.mjs
import withCarbon8r from 'next-carbon8r'

export default withCarbon8r({
  // your existing config
})
```

…and render the overlay once, in your root layout:

```jsx
// app/layout.jsx
import { Carbon8r } from 'next-carbon8r/client'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Carbon8r />
      </body>
    </html>
  )
}
```

That's it — no editor configuration needed. Alt-click hands the file to
Next's own `/__nextjs_launch-editor` endpoint, the same one its error overlay
uses, which respects `$EDITOR` / `$REACT_EDITOR`.

For the Pages Router, render `<Carbon8r />` in `pages/_app.jsx` instead.

## How it works

A webpack/Turbopack loader parses each `.jsx`/`.tsx`/`.js` module and stamps
every **host** element (`<div>`, `<button>`, …) with its origin:

```html
<button data-carbon8r="app/components/Counter.jsx:8:5" data-carbon8r-name="Counter">
```

`withCarbon8r()` registers that loader for both bundlers and, because the App
Router renders host elements on the server, for the server compilation as
well as the client one. `<Carbon8r />` mounts a shadow-DOM overlay that draws
the Chrome DevTools box model on hover and turns Alt-click into an editor
jump.

Locations are emitted relative to the project root, which is exactly the form
Next's launch-editor endpoint resolves — so this package ships no dev
middleware of its own.

## Options

```js
export default withCarbon8r(nextConfig, {
  editor: 'vscode',
  quiet: true
})
```

| Option    | Default                    | Description                                                                                                                                     |
| --------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor`  | –                          | Open via a browser protocol URL instead of the dev server. Presets: `vscode`, `vscode-insiders`, `cursor`, `windsurf`, `zed`. Or pass a template containing `{file}`, `{line}`, `{column}`. Useful when the browser and the dev server are on different machines. |
| `test`    | `/\.(jsx\|tsx\|js\|mjs)$/` | Which modules get instrumented. `node_modules` is always excluded.                                                                              |
| `root`    | `process.cwd()`            | Absolute project root; locations are emitted relative to it.                                                                                    |
| `quiet`   | `false`                    | Silence the console banner on startup.                                                                                                          |
| `enabled` | `NODE_ENV !== 'production'` | Force instrumentation on or off.                                                                                                                |

A debug handle is exposed at `window.__CARBON8R__`
(`{ config, active, target, activate(), deactivate(), hrefFor(el) }`).

## Limitations

- **Host elements only.** Clicking a `<Button>` jumps to the root element
  inside `Button.jsx` (its definition), not the usage site.
- Styled-components/emotion tags (`const X = styled.div`) are capitalized, so
  they're currently skipped.
- Turbopack rules match on a glob, so the loader is invoked for every
  non-`node_modules` JS module. Files with no JSX bail before parsing.

## Related

- [`vite-plugin-carbon8r`](https://www.npmjs.com/package/vite-plugin-carbon8r) — the same workflow for
  **Vite**.
- [`carbon8r-core`](https://www.npmjs.com/package/carbon8r-core) — the shared transform and overlay
  runtime behind both packages, if you want to build another bundler
  integration.
- [`carbon8r-extension`](https://github.com/carboni-rob/carbon8r/tree/main/packages/carbon8r-extension) — companion Chrome
  extension: the same overlay for instrumented apps that don't inject the
  runtime, plus a box-model inspector for any page.

## License

MIT
