import type { Plugin } from 'vite'

export interface Carbon8rOptions {
  /**
   * By default the dev server opens files with launch-editor (auto-detects
   * the running editor, respects $EDITOR / $LAUNCH_EDITOR). Pass a preset
   * name or a URL template containing {file}, {line}, {column} to open via
   * a browser protocol URL instead.
   */
  editor?: 'vscode' | 'vscode-insiders' | 'cursor' | 'windsurf' | 'zed' | (string & {})
}

/**
 * Option/Alt-click any element in the browser to open its source in your
 * editor. Dev-only; production builds are untouched.
 */
export default function carbon8r(options?: Carbon8rOptions): Plugin
