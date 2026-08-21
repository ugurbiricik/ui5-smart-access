# ui5-smart-access

An accessibility popover for SAP UI5 applications. Plug in one button, get a
ready-made panel: font & typography, text-to-speech, colour-blindness modes,
blue-light filter, universal night mode (darkens UI5 controls **and** the host
page), page-wide contrast, reading guide/mask, big cursor, link & focus highlight,
stop-animations, image hider, global keyboard shortcuts (`Alt+Shift+<key>`) and
reset-all. Pure client-side — no backend, preferences saved in `localStorage`,
German i18n by default with English alternate.

## Install

```bash
npm install ui5-smart-access
npm install --save-dev ui5-tooling-modules
```

`ui5-smart-access` is a plain-ESM package; a UI5 app resolves the bare import with
[`ui5-tooling-modules`](https://www.npmjs.com/package/ui5-tooling-modules). It also
loads its css/i18n/fragments at runtime, so the **build** must copy those raw assets
(`includeAssets`) — otherwise it works in `ui5 serve` but 404s once deployed.

### `ui5.yaml`

```yaml
builder:
  customTasks:
    - name: ui5-tooling-modules-task
      afterTask: replaceVersion            # TypeScript apps: afterTask: ui5-tooling-transpile-task
      configuration:
        includeAssets:
          ui5-smart-access:
            - "*.fragment.xml"
            - "fragments/**"
            - "css/**"
            - "i18n/**"
server:
  customMiddleware:
    - name: ui5-tooling-modules-middleware
      afterMiddleware: compression
```

- **Dev** (`ui5 serve`): only the middleware is needed — it serves the package and
  its assets live from `node_modules`, so dev needs no `includeAssets`.
- **Prod** (`ui5 build`): the task bakes the JS **and** the raw assets into the bundle.
  **TypeScript apps** must run the task `afterTask: ui5-tooling-transpile-task`, or the
  transpiled import isn't rewritten (`failed to load ui5-smart-access.js`).
- **CAP**: integrate in the UI5 module under `app/<name>/` exactly as above; a CAP UI is
  usually classic AMD JS, which needs no transpile step.

## Usage

In the controller of the view that hosts the launcher button:

```js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "ui5-smart-access"
], function (Controller, SmartAccess) {
  "use strict";
  return Controller.extend("my.app.controller.Main", {
    onInit: function () {
      // Re-apply saved prefs + enable Alt+Shift shortcuts; pass the launcher control.
      SmartAccess.initAccessibility(this, this.byId("accessBtn"));
    },
    onOpenAccessibility: function (oEvent) {
      SmartAccess.openAccessPopover(this, oEvent);
    }
  });
});
```

```xml
<Button id="accessBtn" icon="sap-icon://accessibility" press=".onOpenAccessibility" />
```

TypeScript is identical — `import { openAccessPopover, initAccessibility } from "ui5-smart-access"`;
types ship via `index.d.ts`. `openAccessPopover` is `async`, so call it as
`void openAccessPopover(this, oEvent)` if ESLint flags floating promises.
`initAccessibility` is optional but recommended: without it, saved preferences
re-apply and the keyboard shortcuts activate only after the first open.

## Deployment (BTP / SAP Build Work Zone)

A standard html5-apps-repo / managed-approuter deployment. Only three
package-specific things matter:

1. **`includeAssets`** on `ui5-tooling-modules-task` (the `ui5.yaml` snippet above)
   — bundles the popover's css/i18n/fragments, otherwise they 404.
2. **Task order (TypeScript only):** the modules task must run `afterTask: ui5-tooling-transpile-task`.
3. **`resourceRoots`** in your app's `manifest.json` — makes `Fragment.load` names
   resolve to the bundled copy instead of 404-ing against the UI5 CDN:

```json
{
  "sap.ui5": {
    "resourceRoots": {
      "ui5-smart-access": "./thirdparty/ui5-smart-access"
    }
  }
}
```

Then build and deploy as usual:

```bash
npm install
mbt build                                   # -> mta_archives/<app>_<version>.mtar
cf deploy mta_archives/<app>_<version>.mtar -f
```

## API

```ts
// Opens the assistant, anchored to the event source. Resolves to the sap.m.Popover.
openAccessPopover(controller: Controller, oEvent: Event): Promise<unknown>;
// Recommended onInit entry point: re-applies saved prefs + registers Alt+Shift shortcuts.
initAccessibility(controller: Controller, oTrigger: Control): void;
```

## Develop & publish

- **Link into an app:** `cd package && npm link`, then `cd ../<app> && npm link ui5-smart-access`.
  `npm link` covers `ui5 serve`; a production build runs a fresh `npm install` that does
  not follow the link, so to test current code through a build use
  `npm pack` + a `"ui5-smart-access": "file:...tgz"` dependency.
- **Publish:** bump `version` in `package.json`, then from `package/` run `npm publish`
  (authenticate once with `npm login` or an access token). `files` limits the tarball to
  the runtime files + this README — verify with `npm pack --dry-run`.

## License

ISC
