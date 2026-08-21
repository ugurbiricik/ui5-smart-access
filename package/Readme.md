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
```

Make sure your UI5 consumer project is configured with
[`ui5-tooling-modules`](https://www.npmjs.com/package/ui5-tooling-modules)
so imports from `node_modules` resolve at dev-server and build time.

`ui5.yaml`:

```yaml
builder:
  customTasks:
    - name: ui5-tooling-modules-task
      afterTask: replaceVersion
server:
  customMiddleware:
    - name: ui5-tooling-modules-middleware
      afterMiddleware: compression
```

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

Full documentation lives in the repository under
[`docs/`](https://github.com/ugurbiricik/ui5-smart-access/tree/main/docs):

- [INTEGRATION.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/INTEGRATION.md) — integrate into plain UI5, TypeScript UI5, and CAP (dev + prod)
- [FILES.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/FILES.md) — one-line description of every source file

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
