# ui5-smart-access

An accessibility popover for SAP UI5 applications. Plug in one button, get
a ready-made panel with font scaling, text-to-speech, color-blindness
filters, blue-light filter, night mode, image hider, contrast mode and a
reset-all action.

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
import { openAccessPopover } from "ui5-smart-access";
import UIEvent from "sap/ui/base/Event";

/**
 * @namespace myapp.controller
 */
export default class Main extends BaseController {
    public openAccessibilityPopover(oEvent: UIEvent): void {
        void openAccessPopover(this, oEvent);
    }
}
```

View:

```xml
<Button
    icon="sap-icon://accessibility"
    press=".openAccessibilityPopover"
    type="Emphasized"/>
```

That's it. The popover opens anchored to the event source, injects its
own CSS and i18n, and remembers user preferences in `localStorage`.

## Documentation

Full documentation lives in the repository under
[`docs/`](https://github.com/ugurbiricik/ui5-smart-access/tree/main/docs):

- [ARCHITECTURE.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/ARCHITECTURE.md) — high-level architecture and data flow
- [PACKAGE_STRUCTURE.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/PACKAGE_STRUCTURE.md) — file-by-file breakdown
- [FEATURES.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/FEATURES.md) — each accessibility feature explained
- [STYLING.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/STYLING.md) — CSS strategy, popover isolation, night-mode prefetch
- [PUBLIC_API.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/PUBLIC_API.md) — `openAccessPopover` reference
- [TEST_APP.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/TEST_APP.md) — the bundled test app
- [DEVELOPMENT.md](https://github.com/ugurbiricik/ui5-smart-access/blob/main/docs/DEVELOPMENT.md) — local setup, `npm link`, release

## TypeScript

The package ships typings via `index.d.ts`:

```ts
import Controller from "sap/ui/core/mvc/Controller";
import Event from "sap/ui/base/Event";

export function openAccessPopover(
    controller: Controller,
    oEvent: Event
): Promise<void>;
```

## License

ISC
