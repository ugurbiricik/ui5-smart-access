# Deploying an app that uses ui5-smart-access (BTP / Work Zone)

This guide covers deploying a UI5 app that consumes `ui5-smart-access` to **SAP BTP
Cloud Foundry** as an HTML5-apps-repo app behind the managed approuter — the setup
used by **SAP Build Work Zone**. For wiring the package into the app (dev + build
config) see [INTEGRATION.md](./INTEGRATION.md); this guide is about turning that
built app into a deployed Work Zone tile.

Deploying `ui5-smart-access` itself is nothing special — it is a normal dependency
that `ui5-tooling-modules` bundles into your app. There are only **three
package-specific things** to get right; everything else is a standard Work Zone
deployment.

## 1. The three package-specific requirements

| # | Requirement | Where | Why |
|---|---|---|---|
| 1 | `includeAssets` on `ui5-tooling-modules-task` | your production build config (`ui5.yaml` / `ui5-dist.yaml`) | the popover loads its css/i18n/fragments at runtime; the task bundles only JS by default, so without this they 404 in the deployed app |
| 2 | Task order (**TypeScript apps only**) | production build config | `ui5-tooling-modules-task` must run `afterTask: ui5-tooling-transpile-task`, otherwise the transpiled import is not rewritten → `failed to load ui5-smart-access.js` |
| 3 | `resourceRoots` mapping | `manifest.json` (`sap.ui5`) | `"ui5-smart-access": "./thirdparty/ui5-smart-access"` — the task rewrites the JS import and `toUrl(...)` calls but **not** `Fragment.load({ name })` names, so the fragments need this to resolve locally instead of 404-ing against the UI5 CDN |

Classic **AMD JavaScript** apps need #1 and #3 but not #2 (there is no transpile
step — the task rewrites the module reference inside `sap.ui.define([...])`
directly). See [INTEGRATION.md](./INTEGRATION.md) for the exact yaml per app type
(plain UI5, TypeScript, CAP).

## 2. What a Work Zone deployment consists of

Beyond your app itself, a managed-approuter / html5-apps-repo deployment needs:

| File | Purpose |
|---|---|
| `mta.yaml` | MTA descriptor — the html5 module (your built UI) + content deployers + services |
| production build config (e.g. `ui5-dist.yaml`) | `ui5 build` config: transpile (if TS) → `ui5-tooling-modules` (**with `includeAssets`**) → `ui5-task-zipper` |
| `xs-app.json` | managed-approuter routing (UI5 `/resources` → CDN, everything else → html5-apps-repo) |
| `xs-security.json` | XSUAA (Work Zone requires authentication) |
| `manifest.json` | `sap.cloud.service` + a `crossNavigation` inbound (the Work Zone tile) — plus the `resourceRoots` mapping above |

Typical MTA services: `xsuaa`, `destination`, and `html5-apps-repo`
(app-host + app-runtime).

## 3. Build & deploy

Prerequisites:

- `cf` CLI logged in to the target subaccount (`cf login -a <api-endpoint>`; run
  `cf target` to verify org/space before every deploy)
- CF plugins: `cf install-plugin -f multiapps` and `cf install-plugin -f html5-plugin`
- [`mbt`](https://github.com/SAP/cloud-mta-build-tool) (Cloud MTA Build Tool) and Node.js
- `ui5-smart-access` **published to npm** at the version in your `package.json` —
  the build runs a fresh `npm install` from the registry (it does **not** follow
  `npm link`)

```bash
npm install
mbt build                                  # → mta_archives/<app>_<version>.mtar
cf deploy mta_archives/<app>_<version>.mtar -f
```

`cf deploy` creates/binds the services, uploads the UI to the html5-apps-repo and
registers the Work Zone destinations. Afterwards, assign the app's role collection
to your user and add its tile to a Work Zone site, then open it from the launchpad.

## 4. Dev vs prod — why `includeAssets` is production-only

| Need | Dev (`ui5 serve`) | Prod (`ui5 build`) |
|---|---|---|
| TS → JS | `ui5-tooling-transpile-middleware` (in-memory) | `ui5-tooling-transpile-task` (baked in) |
| `ui5-smart-access` import | `ui5-tooling-modules-middleware` (live from `node_modules`) | `ui5-tooling-modules-task` (baked in) |
| Package assets (css/i18n/fragments) | served live by the middleware → **no `includeAssets`** | `node_modules` is gone → **`includeAssets` required** (else the popover 404s) |
| Live reload | `ui5-middleware-livereload` | — |
| html5-repo zip | — | `ui5-task-zipper` |
| `resourceRoots` (manifest) | not needed (resolved live) | required for FLP / Work Zone (`Fragment.load` names) |

In short: in `ui5 serve` the `ui5-tooling-modules` middleware streams the package —
**and its raw assets** — live from `node_modules`, so dev needs no `includeAssets`.
A deployed app has no `node_modules`, so the build must bake in the JS, the
(transpiled) import **and** the raw assets.

## 5. Validated live

This exact setup — a frontend-only MTA with `mta.yaml`, `xs-security.json`,
`xs-app.json` and a production `ui5-dist.yaml` (transpile → `ui5-tooling-modules`
with `includeAssets` → `ui5-task-zipper`) — has been deployed end-to-end and
confirmed working on SAP Build Work Zone, for both a TypeScript UI5 app and a
classic AMD JavaScript app inside a CAP project.
