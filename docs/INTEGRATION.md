# Integration guide

How to add `ui5-smart-access` to a UI5 app — for plain (JavaScript) UI5,
TypeScript UI5, and UI5 inside a CAP project — in both the **development** and
**production** setups. For what each file does, see [FILES.md](./FILES.md).

---

## 1. The one thing you must know

`ui5-smart-access` is a normal npm package (plain ES modules). A UI5 app can't
load a bare `import ... from "ui5-smart-access"` on its own, so the app resolves
it with **[`ui5-tooling-modules`](https://www.npmjs.com/package/ui5-tooling-modules)**:

- **dev** → `ui5-tooling-modules-middleware` (serves the bundled module on the fly)
- **prod** → `ui5-tooling-modules-task` (bundles it into `ui5 build` output)

The package's CSS, fragments and i18n ship as raw files and are resolved at
runtime via `sap.ui.require.toUrl("ui5-smart-access/...")` — `ui5-tooling-modules`
exposes them under that namespace. There is **no backend and no build step inside
the package itself**.

### Install

```sh
npm install ui5-smart-access
npm install --save-dev ui5-tooling-modules   # dev + build resolver
```

### Use it (same for every setup)

In the controller of the view that hosts the launcher button:

```js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "ui5-smart-access"
], function (Controller, { openAccessPopover, initAccessibility }) {
  "use strict";
  return Controller.extend("my.app.controller.Main", {
    onInit: function () {
      // Re-applies saved preferences on page load + enables the global
      // Alt+Shift+<key> shortcuts. Pass the control the popover anchors to.
      initAccessibility(this, this.byId("accessBtn"));
    },
    onOpenAccessibility: function (oEvent) {
      openAccessPopover(this, oEvent);
    }
  });
});
```

```xml
<!-- a launcher button anywhere in the view -->
<Button id="accessBtn" icon="sap-icon://accessibility" press=".onOpenAccessibility" />
```

`initAccessibility` is optional but recommended (without it, saved filters only
re-apply the first time the popover is opened). `openAccessPopover` is all that's
strictly required.

---

## 2. Plain UI5 (JavaScript)

### Dev

Add the middleware to `ui5.yaml`:

```yaml
server:
  customMiddleware:
    - name: ui5-tooling-modules-middleware
      afterMiddleware: compression
```

Run `ui5 serve`. That's it.

### Prod

Add the task to `ui5.yaml`:

```yaml
builder:
  customTasks:
    - name: ui5-tooling-modules-task
      afterTask: replaceVersion
```

`ui5 build --clean-dest` now bundles `ui5-smart-access` into `dist/`. Deploy
`dist/` as usual (static hosting, ABAP repo, HTML5 app repo, …).

---

## 3. TypeScript UI5

Same as plain UI5, plus TS transpilation (most TS UI5 apps already have
[`ui5-tooling-transpile`](https://www.npmjs.com/package/ui5-tooling-transpile)).

`ui5.yaml`:

```yaml
builder:
  customTasks:
    - name: ui5-tooling-transpile-task
      afterTask: replaceVersion
    - name: ui5-tooling-modules-task
      afterTask: replaceVersion
server:
  customMiddleware:
    - name: ui5-tooling-transpile-middleware
      afterMiddleware: compression
    - name: ui5-tooling-modules-middleware
      afterMiddleware: compression
```

Notes:

- Types ship with the package (`index.d.ts`), so `import { openAccessPopover, initAccessibility } from "ui5-smart-access"` is fully typed.
- `openAccessPopover` is `async`; if your ESLint has `@typescript-eslint/no-floating-promises`, call it as `void openAccessPopover(this, oEvent);`.
- If your `tsconfig.json` uses `"moduleResolution": "Node"`/`"Bundler"`, no path alias is needed. With stricter setups add `"paths": { "ui5-smart-access": ["./node_modules/ui5-smart-access/index.d.ts"] }`.

```ts
import Controller from "sap/ui/core/mvc/Controller";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import { openAccessPopover, initAccessibility } from "ui5-smart-access";

export default class Main extends Controller {
  public onInit(): void {
    initAccessibility(this, this.byId("accessBtn") as Control);
  }
  public onOpenAccessibility(oEvent: Event): void {
    void openAccessPopover(this, oEvent);
  }
}
```

---

## 4. UI5 inside a CAP project

In CAP, the UI5 app lives under `app/<appName>/` with its **own** `package.json`
and `ui5.yaml`. Integration happens in that UI5 module — CAP itself needs no
changes.

Install into the UI5 app:

```sh
cd app/<appName>
npm install ui5-smart-access
npm install --save-dev ui5-tooling-modules
```

Add the middleware + task to `app/<appName>/ui5.yaml` exactly as in §2/§3.

### Dev

- Serve the UI5 app through UI5 tooling so its middleware runs — either
  `cd app/<appName> && ui5 serve`, or a `cds watch` setup that mounts the UI5
  app via [`cds-plugin-ui5`](https://www.npmjs.com/package/cds-plugin-ui5)
  (which honours the app's `ui5.yaml` middlewares, so `ui5-tooling-modules`
  applies). Point the app's data source at the running CAP service as usual.
- Avoid opening the app through a plain CAP static file server that bypasses UI5
  tooling — the bare `ui5-smart-access` import won't resolve there.

### Prod

- Build the UI5 app with `ui5 build --clean-dest` (the `ui5-tooling-modules-task`
  bundles the package), then let the CAP/MTA build package the app:
  `mbt build` / `cds build` wires the built UI5 app into the HTML5 app repo /
  approuter. No runtime dependency on the package remains — it's baked into the
  built app.

---

## 5. Dev vs prod at a glance

| | Dev | Prod |
|---|---|---|
| Resolver | `ui5-tooling-modules-middleware` (serve) | `ui5-tooling-modules-task` (build) |
| TS | `ui5-tooling-transpile-middleware` | `ui5-tooling-transpile-task` |
| Command | `ui5 serve` / `cds watch` | `ui5 build --clean-dest` (+ `mbt`/`cds build` for CAP) |
| Package files | served on demand | bundled into `dist/` |

---

## 6. Troubleshooting

- **`Cannot find module "ui5-smart-access"` / bare-import error at runtime** →
  `ui5-tooling-modules` middleware (dev) or task (build) isn't active for the app.
- **Popover opens but is unstyled / icons missing** → the raw assets couldn't be
  resolved; confirm the app is served/built through UI5 tooling (not a bypassing
  static server) and that `ui5-tooling-modules` is configured.
- **Deleted/changed a version and CSS looks stale** → the stylesheet cache-bust is
  version-based; a hard refresh (Ctrl+Shift+R) picks up local edits during dev.
- **Saved settings don't apply until the popover is opened** → call
  `initAccessibility(this, oTrigger)` in `onInit`.
