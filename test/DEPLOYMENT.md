# Deploying the test app to BTP (Work Zone)

This deploys the `ui5-smart-access` demo/test app to **SAP BTP Cloud Foundry**
as an HTML5-repo app behind the managed approuter, so the package can be
validated in a real production environment (not just `ui5 serve`).

It is a **frontend-only** MTA (no CAP backend, no HANA) modeled on a standard
Work Zone deployment.

## What gets deployed

| Deploy file | Purpose |
|---|---|
| `mta.yaml` | MTA descriptor — html5 module + app/destination content deployers + services |
| `ui5-dist.yaml` | Production build config (transpile + **ui5-tooling-modules** + `ui5-task-zipper`) |
| `webapp/xs-app.json` | Managed-approuter routing (UI5 `/resources` → CDN, rest → html5-apps-repo) |
| `xs-security.json` | XSUAA (app auth for Work Zone) |
| `webapp/manifest.json` | `sap.cloud.service` + `crossNavigation` inbound (the Work Zone tile) |

**MTA modules:** `ui5smartaccess` (the built UI, html5) · `ui5sa-app-deployer`
(uploads the zip to the HTML5 repo) · `ui5sa-destinations` (subaccount
destinations Work Zone reads).
**Resources:** `ui5sa-auth` (xsuaa) · `ui5sa-destination` · `ui5sa-html5-repo-host`
· `ui5sa-html5-runtime`.

## The critical bit — shipping the package assets

The popover loads its **css, i18n and 15 fragments** at runtime via
`sap.ui.require.toUrl` / `Fragment.load`. `ui5-tooling-modules` bundles only the
JS by default, so `ui5-dist.yaml` configures `includeAssets` for
`ui5-smart-access`. Without it the build contains only `thirdparty/ui5-smart-access.js`
and the popover 404s in the deployed app (dev still works because the middleware
serves the assets live from `node_modules`).

Two more requirements make the bundled package resolve at runtime in Work Zone:

- **Task order** — `ui5-tooling-modules-task` runs `afterTask: ui5-tooling-transpile-task`
  in `ui5-dist.yaml`, so the transpiled `import "ui5-smart-access"` is rewritten to the
  bundled path. With the wrong order the app fails with `failed to load ui5-smart-access.js`.
- **`resourceRoots`** — `webapp/manifest.json` maps `"ui5-smart-access": "./thirdparty/ui5-smart-access"`.
  The task rewrites the JS import and `toUrl(...)` calls but NOT `Fragment.load({name:"..."})`
  names, so this mapping is what makes the fragments resolve locally instead of 404-ing on the CDN.

## Dev vs prod config (`ui5.yaml` vs `ui5-dist.yaml`)

The two configs are split by environment on purpose:

- **`ui5.yaml` — dev only** (`ui5 serve`): only `server.customMiddleware`.
  Everything is resolved live from `node_modules`, so nothing is bundled.
- **`ui5-dist.yaml` — prod only** (`ui5 build --config ui5-dist.yaml`): only
  `builder.customTasks`. This is what `npm run build`, `npm run build:mta` and
  `mbt build` all use.

| Need | Dev (`ui5 serve`) | Prod (`ui5 build`) |
|---|---|---|
| TS → JS | `ui5-tooling-transpile-middleware` (in-memory) | `ui5-tooling-transpile-task` (baked in) |
| `ui5-smart-access` import | `ui5-tooling-modules-middleware` (live from `node_modules`) | `ui5-tooling-modules-task` (baked in) |
| Package assets (css/i18n/fragments) | served live by the middleware → **no `includeAssets`** | `node_modules` is gone → **`includeAssets` required** (else the popover 404s) |
| Live reload | `ui5-middleware-livereload` | — |
| html5-repo zip | — | `ui5-task-zipper` |
| `resourceRoots` (manifest) | not needed (resolved live) | required for FLP / Work Zone (`Fragment.load` names) |

In short: dev streams everything from `node_modules` through middleware; prod has
no `node_modules`, so transpilation, the import **and the package's raw assets**
must be baked into the bundle — that is exactly what `includeAssets` +
`ui5-task-zipper` add on top of the dev setup.

## Prerequisites

- `cf` CLI logged in to the target subaccount, e.g. trial:
  ```bash
  cf login -a https://api.cf.us10-001.hana.ondemand.com
  cf target        # verify org/space before every deploy
  ```
- CF plugins: `cf install-plugin -f multiapps` and `cf install-plugin -f html5-plugin`
- [`mbt`](https://github.com/SAP/cloud-mta-build-tool) (Cloud MTA Build Tool) and Node.js
- **`ui5-smart-access` published to npm** at the version referenced in
  `package.json` — the production build runs a fresh `npm install`, which pulls
  the package from the registry (it does not follow `npm link`). See
  [../package/docs/DEVELOPMENT.md](../package/docs/DEVELOPMENT.md).

## Build & deploy

```bash
cd test
npm install                                   # sync lockfile (pulls ui5-smart-access from npm)
mbt build                                      # → mta_archives/ui5-smart-access-test_1.0.0.mtar
cf deploy mta_archives/ui5-smart-access-test_1.0.0.mtar -f
```

`cf deploy` creates/binds the services, uploads the UI to the HTML5 repo and
registers the Work Zone destinations. Check status:

```bash
cf mta ui5-smart-access-test
cf html5-list -di ui5sa-html5-repo-host-key -u   # confirm the UI was uploaded
```

## Open it

The app runs behind the managed approuter and appears via a **Work Zone** site.
Assign the `UI5 Smart Access Viewer` role collection to your user and add the
app's tile (semantic object `SmartAccess` / action `display`) to a Work Zone
site, then open it from the launchpad.

## Remove

```bash
cf undeploy ui5-smart-access-test --delete-services --delete-service-keys -f
```
