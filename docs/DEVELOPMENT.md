# Development

End-to-end guide for working on `ui5-smart-access` locally: setting up
the workspace, linking the package into the test app, making changes,
running quality checks, and publishing a release.

## Repository layout

```
ui5-smart-access/
├── package/          The npm package (what ships to npm)
├── test/             A UI5 app that consumes the package
├── docs/             Developer docs (this directory)
└── .gitignore
```

The package and the test app are **independent npm projects**. Each has
its own `package.json`, its own `node_modules`, and its own scripts.
They are wired together with `npm link` during development.

## Prerequisites

- **Node.js 20+** (matches the `@ui5/cli` baseline).
- **npm 10+**.
- A globally available `npx` (bundled with npm).

Optional:

- `git` for version control (obviously).
- A UI5-aware IDE (VS Code with the ESLint and UI5 plugins works well).

## First-time setup

```bash
# 1. Clone the repo
git clone git@github.com:ugurbiricik/ui5-smart-access.git
cd ui5-smart-access

# 2. Install the test app's dependencies
cd test
npm install

# 3. Register the package as a local npm link
cd ../package
npm link

# 4. Link it into the test app
cd ../test
npm link ui5-smart-access
```

After this:

- `test/node_modules/ui5-smart-access` is a symlink to `package/`.
- Any edit in `package/**` is picked up live by the dev server.

> The `package/` directory has no `package-lock.json` and no
> `node_modules` of its own — it has no runtime dependencies.

## Running the dev server

```bash
cd test
npx ui5 serve --port 8080
```

Then open http://localhost:8080 and click the accessibility button in
the app header. The `ui5-middleware-livereload` middleware reloads the
browser on file save.

If port 8080 is already in use:

```bash
npx ui5 serve --port 8081
```

## Development loop

1. Edit source under `package/**`.
2. The livereload middleware picks it up within 1–2 seconds.
3. The browser auto-reloads.
4. If you changed the fragment XML, a manual refresh may be needed
   because fragment caching can be aggressive.

### Working on CSS

`package/css/style.css` is loaded via a runtime-injected `<link>` tag
(not bundled). Changes show up on the next page reload. Night-mode
overrides live inline inside `package/js/nightMode.js` — edits there
also apply on reload.

### Working on a new feature

Follow the existing convention:

1. Add a fragment under `package/fragments/<Feature>Panel.fragment.xml`.
2. Add a JS module under `package/js/<feature>.js`.
3. Add event handlers to `package/js/popoverController.js`.
4. Add model keys to `package/js/settingsModel.js` (add to
   `PERSISTED_KEYS` if the state should survive reloads).
5. Reference the new fragment in `Popover.fragment.xml`.
6. Register its title/icon in `popoverModules.js`.
7. Add i18n keys to all three files in `package/i18n/`.
8. Update `docs/FEATURES.md`.

## Quality checks

From inside `test/`:

```bash
npm run lint           # ESLint
npm run ts-typecheck   # tsc --noEmit
npm run ui5lint        # UI5 linter
npm run build          # sanity-check the production build
```

All four should be clean before committing.

Watch out for:

- **`@typescript-eslint/no-floating-promises`** — wrap calls like
  `openAccessPopover(this, oEvent)` with `void …` or make the handler
  `async` and `await`.
- **`no-ambiguous-event-handler` (ui5lint)** — XML `press=` attributes
  must start with a `.` (`press=".onFoo"`), otherwise UI5 can't tell
  whether the handler is an event or a module path.

## Common commands

| Command                        | Where  | Does what                                  |
|--------------------------------|--------|--------------------------------------------|
| `npx ui5 serve --port 8080`    | `test/`| Launches dev server with livereload        |
| `npm run lint`                 | `test/`| ESLint pass                                |
| `npm run ts-typecheck`         | `test/`| TypeScript type check                      |
| `npm run ui5lint`              | `test/`| UI5-specific lint rules                    |
| `npm run build`                | `test/`| Production build to `test/dist/`           |
| `npm run test-runner`          | `test/`| Run QUnit test suite                       |

## Git conventions

- Current branch: `main`.
- Commit messages are **English only**, imperative tone, no AI
  references, no `Co-Authored-By: Claude` trailer.
- `.claude/` is ignored via root `.gitignore` and should never land in
  the repo.
- Build cache (`test/.ui5-tooling-modules/`) is ignored.

## Publishing a release

The package is published to npm as `ui5-smart-access`.

1. Make sure you're on `main` and everything is committed and pushed.
2. Update `package/package.json` `"version"` field (semver).
3. Run all checks from `test/` (lint, type-check, ui5lint, build).
4. Commit the version bump:

   ```bash
   git add package/package.json
   git commit -m "Bump package version to x.y.z"
   ```

5. Publish:

   ```bash
   cd package
   npm publish --access public
   ```

   A granular access token with **Bypass 2FA** enabled is required for
   non-interactive publishes.

6. Tag the release and push the tag:

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

> **Do not** publish without updating `package.json` — npm rejects the
> republish of an existing version.

## TypeScript consumers

The package exposes typings via `package/index.d.ts`. If the exported
signature changes, update both `index.js` and `index.d.ts` in the same
commit so the two stay in sync.

## Rebuilding the link

If the symlink breaks (for example after reinstalling `test/`'s
dependencies), re-link:

```bash
cd test
npm link ui5-smart-access
```

You do not need to re-run `npm link` in `package/` unless the package
name in `package.json` changed.

## Troubleshooting

| Symptom                                            | Likely cause                                               |
|----------------------------------------------------|------------------------------------------------------------|
| `EADDRINUSE: Port 8080 is already in use`          | Another `ui5 serve` is running. Kill it or use `--port`.   |
| Import `"ui5-smart-access"` not resolved at runtime| `ui5-tooling-modules-middleware` isn't in `ui5.yaml`.      |
| Changes to `package/` not reflecting in the browser| `npm link` wasn't run, or was undone by `npm install`.     |
| Fragment XML changes not showing                   | UI5 caches fragments — do a hard reload (`Ctrl+F5`).       |
| ESLint fails on `openAccessPopover(this, oEvent)`  | Prefix with `void` or make the handler `async`.            |
| ui5lint: ambiguous event handler                   | XML `press="foo"` must be `press=".foo"`.                  |
| Night mode chevrons flash blue on first toggle     | `prefetchDarkTheme()` isn't being called — confirm that `index.js` runs it on first open. |

## Next steps

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for the high-level design.
- See [FEATURES.md](./FEATURES.md) for adding or editing features.
- See [STYLING.md](./STYLING.md) for CSS conventions and night mode.
- See [PUBLIC_API.md](./PUBLIC_API.md) before changing the exported
  signature.
