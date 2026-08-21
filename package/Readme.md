# ui5-smart-access

An accessibility popover for SAP UI5 applications. Plug in one button, get
a ready-made panel with font & typography controls, text-to-speech,
colour-blindness correction modes (with intensity), a blue-light filter,
universal night mode (darkens UI5 controls **and** the host page's own
markup), page-wide contrast mode, a reading aid (guide/mask), a big
cursor, link & focus highlighting, stop-animations, an image hider, global
keyboard shortcuts (`Alt+Shift+<key>`) and a reset-all action.

## Install

```bash
npm install ui5-smart-access
npm install --save-dev ui5-tooling-modules
```

The consumer app resolves the package with
[`ui5-tooling-modules`](https://www.npmjs.com/package/ui5-tooling-modules). The
popover also loads its CSS, i18n and fragments at runtime, so the **build** has to
copy those raw assets as well (`includeAssets`) — without it the popover works in
`ui5 serve` but 404s once the app is built and deployed.

`ui5.yaml`:

```yaml
builder:
  customTasks:
    - name: ui5-tooling-modules-task
      afterTask: replaceVersion
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

> **TypeScript app?** The modules task must run **after** the transpile task —
> use `afterTask: ui5-tooling-transpile-task` instead of `replaceVersion`.
>
> **Deploying to Fiori Launchpad / SAP Build Work Zone?** Also map the package in
> your `manifest.json` (`sap.ui5`):
> `"resourceRoots": { "ui5-smart-access": "./thirdparty/ui5-smart-access" }`.
>
> The dev + production config for plain UI5, TypeScript and CAP is in the
> **[Integration guide](https://github.com/ugurbiricik/ui5-smart-access/blob/main/package/docs/INTEGRATION.md)**,
> and the full BTP / Work Zone deployment walkthrough is in the
> **[Deployment guide](https://github.com/ugurbiricik/ui5-smart-access/blob/main/package/docs/DEPLOYMENT.md)**
> (both bundled with this package under `docs/`).

## Usage

TypeScript:

```ts
import BaseController from "./BaseController";
import { openAccessPopover, initAccessibility } from "ui5-smart-access";
import UIEvent from "sap/ui/base/Event";

/**
 * @namespace myapp.controller
 */
export default class Main extends BaseController {
    public onInit(): void {
        // Re-apply saved preferences on page load and enable the global
        // Alt+Shift keyboard shortcuts. Pass the control the popover anchors to.
        initAccessibility(this, this.byId("accessButton"));
    }

    public openAccessibilityPopover(oEvent: UIEvent): void {
        void openAccessPopover(this, oEvent);
    }
}
```

View:

```xml
<Button
    id="accessButton"
    icon="sap-icon://accessibility"
    press=".openAccessibilityPopover"
    type="Emphasized"/>
```

That's it. The popover opens anchored to the event source, injects its
own CSS and i18n, and remembers user preferences in `localStorage`.
`initAccessibility` is optional but recommended: without it, saved
preferences are only re-applied the first time the popover is opened, and
the keyboard shortcuts aren't active until then either.

The i18n bundle is German by default with English as the alternate; the
active language is picked from the browser (`navigator.languages`).

## Documentation

These guides ship inside the package (under `docs/`) and are also on GitHub:

- [INTEGRATION.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/package/docs/INTEGRATION.md) — integrate into plain UI5, TypeScript UI5, and CAP (dev + production)
- [DEPLOYMENT.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/package/docs/DEPLOYMENT.md) — deploy an app that uses the package to BTP / SAP Build Work Zone
- [DEVELOPMENT.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/package/docs/DEVELOPMENT.md) — local development, testing without publishing, and publishing to npm
- [FILES.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/package/docs/FILES.md) — one-line description of every source file
- [test/DEPLOYMENT.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/test/DEPLOYMENT.md) — a complete, worked BTP / Work Zone deployment of the demo app, end to end

## TypeScript

The package ships typings via `index.d.ts`:

```ts
import Controller from "sap/ui/core/mvc/Controller";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";

// Opens the assistant. Resolves to the created sap.m.Popover control.
export function openAccessPopover(
    controller: Controller,
    oEvent: Event
): Promise<unknown>;

// Recommended onInit entry point: re-applies saved prefs + registers shortcuts.
export function initAccessibility(
    controller: Controller,
    oTrigger: Control
): void;

// Deprecated alias for initAccessibility.
export function initAccessibilityShortcuts(
    controller: Controller,
    oTrigger: Control
): void;
```

## License

ISC
