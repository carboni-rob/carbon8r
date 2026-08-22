# Releasing

Each package versions and ships independently. Tags are per package:

```
next-carbon8r@0.1.1
vite-plugin-carbon8r@0.2.0
carbon8r-core@1.0.0
carbon8r-extension@0.3.0
```

The older `v0.1.0`–`v0.2.1` tags are the historical umbrella scheme, kept as-is.
They date from when `vite-plugin-carbon8r` was the only package, so `v0.1.x`
tracks its versions; `v0.2.0` and `v0.2.1` cover several packages at once,
which is exactly why the scheme was dropped.

## Order matters

`carbon8r-core` holds the transform and the overlay, and both plugins depend on
it. **Publish core first** — publishing a plugin that requires an unpublished
core version leaves it uninstallable (npm reports a 404 on the missing
dependency, not a helpful error).

Only publish what actually changed. A release touching just `next-carbon8r`
does not need core or the Vite plugin republished.

## Steps

1. Bump the version in the package's `package.json`. Core's hosts depend on
   `^1.0.0`, so a core **minor** reaches them without touching either plugin; a
   core major means bumping both.
2. `npm install --package-lock-only` to sync the lockfile.
3. Open a PR and merge to `main`.
4. Publish from `main`:
   ```sh
   npm publish -w <package>
   ```
   This account uses a passkey for publishing, so this step is interactive and
   has to be run by a human — it cannot be scripted or delegated.
5. Tag the merge commit and push:
   ```sh
   git tag -a "<package>@<version>" <full-sha> -m "<package> <version>"
   git push origin "<package>@<version>"
   ```
   `gh release create --target <short-sha>` rejects short SHAs with a 422; tag
   locally against the full SHA and use `--verify-tag`.
6. Cut the release for the package that changed:
   ```sh
   gh release create "<package>@<version>" --verify-tag --notes-file notes.md
   ```
   Open the notes with a `📦 npm:` line linking the published version, then
   `## Added` / `## Fixed` / `## Changed`.

## Verify what actually shipped

The version number only proves a publish happened. Pull the artifact back down
and check the code is in it:

```sh
npm pack <package>@<version> && tar -xzf <package>-<version>.tgz
```

`carbon8r-extension` is not published to npm — it is loaded unpacked from
`packages/carbon8r-extension/dist`. It is still tagged, and `build.mjs` stamps
its version into the content script and manifest from `package.json`.
