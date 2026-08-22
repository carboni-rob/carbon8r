export interface TransformResult {
  code: string
  map: object
}

/**
 * Adds `data-carbon8r="<relative>:<line>:<column>"` and
 * `data-carbon8r-name="<component>"` to every host JSX element.
 * Returns null when there is nothing to rewrite.
 */
export function injectLocations(
  code: string,
  file: string,
  root: string
): TransformResult | null

/** Absolute path to the overlay runtime source (`runtime/overlay.mjs`). */
export const overlayPath: string
