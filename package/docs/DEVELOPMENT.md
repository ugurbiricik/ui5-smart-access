# Development & publishing

How to develop `ui5-smart-access`, try changes in a consumer app **without
publishing**, and publish a new version to npm. For consuming the package inside
an app (dev + prod), see [INTEGRATION.md](./INTEGRATION.md).

## Repository layout

- `package/` — the npm package (published as `ui5-smart-access`)
- `test/` — a TypeScript UI5 app that consumes the package (demo + manual testing)

## Local development

Link the package into the test app so edits are picked up live:

```bash
cd package && npm link
cd ../test && npm link ui5-smart-access && npm install
```

Run the test app:

```bash
cd test && npx ui5 serve --port 8080
```

Open <http://localhost:8080/index.html> and hard-refresh (`Ctrl+Shift+R`) after
changes. In dev the `ui5-tooling-modules` middleware resolves the bare
`ui5-smart-access` import and serves its raw css/i18n/fragments straight from
`node_modules`, so a plain `npm link` is all you need.

## Unit tests

```bash
cd package && npm test        # Vitest + jsdom
```

## Try the latest package code in a consumer WITHOUT publishing

`npm link` is enough for the dev server, but a **production build** runs a fresh
`npm install` that does not follow the link. To test the current code through a
real build, use one of:

- **Local tarball (snapshot of the current code):**
  ```bash
  cd package && npm pack --pack-destination ../test
  # test/package.json → "ui5-smart-access": "file:ui5-smart-access-<version>.tgz"
  cd ../test && npm install
  ```
  Re-run (`npm pack` + `npm install`) after each change.
- **Directory dependency:** `"ui5-smart-access": "file:../package"` — installs a
  copy of the package directory on each `npm install`.

A Git dependency does **not** work here: the package lives in the `package/`
subfolder of the repository and npm cannot install a subdirectory of a Git repo.

## Publish a new version to npm

1. Bump the version in `package/package.json` (e.g. `1.2.0`). The `files`
   whitelist already limits the tarball to the runtime files and docs (`index.js`,
   `index.d.ts`, `*.fragment.xml`, `css`, `fragments`, `i18n`, `js`, `docs`,
   `Readme.md`) — check with `npm pack --dry-run`.
2. Authenticate (one-time) with an npm access token or `npm login`:
   ```bash
   # granular access token (with 2FA-bypass enabled):
   npm config set //registry.npmjs.org/:_authToken=<YOUR_TOKEN>
   # or interactively:
   npm login
   ```
3. Publish (the package is public):
   ```bash
   cd package && npm publish
   ```
4. Verify:
   ```bash
   npm view ui5-smart-access version   # should print the new version
   ```

If `npm publish` reports that the version already exists, bump to the next patch
and publish again. Never commit the token — a repo-level `.npmrc` is not tracked.

## Deploy a consumer to production (BTP / Work Zone)

When building a consumer for production, the `ui5-tooling-modules-task` must be
configured with `includeAssets` so the popover's css/i18n/fragments ship in the
build output — see the production sections of [INTEGRATION.md](./INTEGRATION.md).
