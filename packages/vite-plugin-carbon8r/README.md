<p align="center">
  <img src="https://raw.githubusercontent.com/carboni-rob/carbon8r/main/assets/icon.png" width="120" alt="carbon8r logo" />
</p>

# vite-plugin-carbon8r

[![npm](https://img.shields.io/npm/v/vite-plugin-carbon8r?color=2ee6e6&label=npm)](https://www.npmjs.com/package/vite-plugin-carbon8r)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/carboni-rob/carbon8r/blob/main/LICENSE)

Option/Alt-click any element in the browser to open its source in your editor
— a jump-to-source tool that works with **React 19**.

Hold <kbd>Option</kbd> (<kbd>Alt</kbd>) and hover: elements are highlighted
with DevTools-style box-model colors (blue content, green padding, orange
margin) plus the component name and `file:line:column`. Click to open that
exact position in your editor. Elements without source info still get the
box-model inspector.

## Why React 19 needs this

Runtime-only tools (LocatorJS, click-to-component, …) read
`fiber._debugSource`, which **React 19 removed**. This plugin instead injects
the source location at build time as a `data-carbon8r` attribute on every host
JSX element — no React internals involved, so it keeps working.

## Install

```sh
npm install -D vite-plugin-carbon8r
```

## Usage

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import carbon8r from 'vite-plugin-carbon8r'

export default defineConfig({
  plugins: [react(), carbon8r()]
})
```

That's the entire setup. The plugin only runs on the dev server
(`apply: 'serve'`) — production builds are completely untouched.

## Options

By default, clicks are sent to the dev server, which opens your editor with
[launch-editor](https://github.com/yyx990803/launch-editor) — it auto-detects
the running editor and respects `$EDITOR` / `$LAUNCH_EDITOR`. To force a
specific editor via a protocol URL instead:

```js
carbon8r({
  // Preset: 'vscode', 'vscode-insiders', 'cursor', 'windsurf', 'zed'
  editor: 'cursor',
  // ...or any template:
  editor: 'myeditor://open?file={file}&line={line}&col={column}'
})
```

## How it works

1. **Transform** (dev-only, `enforce: 'pre'`): parses `.jsx`/`.tsx` with
   `@babel/parser` and appends `data-carbon8r="src/File.jsx:3:5"` and
   `data-carbon8r-name` to host elements (lowercase tags only, so no unknown
   props leak into your components).
2. **Runtime overlay**: injected into `index.html`, rendered in a shadow root,
   immune to app CSS. While Alt is engaged over an instrumented element, the
   whole gesture family (down/up/click/contextmenu) is intercepted so neither
   your app's handlers nor the native context menu fire. Clicks hit a small
   dev-server endpoint (`/__carbon8r/open`, path-guarded to the project root)
   that launches your editor server-side.

A debug handle is exposed at `window.__CARBON8R__`.

A companion Chrome extension (same overlay, for instrumented apps that don't
inject the runtime, plus a box-model inspector for any page) lives in the same
monorepo as `carbon8r-extension`.

## Acknowledgements

The hold-Option-and-click workflow was pioneered by
[LocatorJS](https://github.com/infi-pc/locatorjs) (Michael Musil) — carbon8r
is an independent implementation of that idea for React 19, sharing no code
with it. Box-model colors are the classic Chrome DevTools palette.

## License

MIT © Roberto Carboni
