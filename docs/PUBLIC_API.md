# Public API

The package exports exactly **one** function, `openAccessPopover`.
Everything else is internal.

## Installation

```bash
npm install ui5-smart-access
```

The package ships as ES modules (`"type": "module"`, `"main": "index.js"`)
with TypeScript typings (`"types": "index.d.ts"`).

## `ui5-tooling-modules`

UI5 apps don't natively load packages from `node_modules`. Add the
`ui5-tooling-modules` middleware and builder task to your consumer
project so the import is resolved at dev-server and build time.

`ui5.yaml` (consumer application):

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

See the consumer's own `test/ui5.yaml` for a complete example.

## Function signature

```ts
// package/index.d.ts
import Controller from "sap/ui/core/mvc/Controller";
import Event from "sap/ui/base/Event";

export function openAccessPopover(
    controller: Controller,
    oEvent: Event
): Promise<void>;
```

### Parameters

| Name         | Type                     | Description                               |
|--------------|--------------------------|-------------------------------------------|
| `controller` | `sap.ui.core.mvc.Controller` | The consumer's controller (`this`).   |
| `oEvent`     | `sap.ui.base.Event`      | The event that triggered the opening. The popover anchors itself to `oEvent.getSource()`. |

### Returns

A `Promise<void>` that resolves once the popover has been opened.
Rejects if the fragment cannot be loaded or inputs are invalid.

### Throws

- `"The controller parameter must be a UI5 Controller!"` — the
  `controller` argument doesn't expose `getView()`.
- `"The oEvent parameter must be a UI5 Event!"` — the `oEvent`
  argument doesn't expose `getSource()`.

## What `openAccessPopover` does

1. Validates both arguments.
2. **On the first call per controller** (cached in `controller._pPopover`):
   - Injects the popover stylesheet (`loadCustomStyleOnce`).
   - Initializes the feature modules (`fontsize`, `textToSpeech`,
     `imageHider`).
   - Restores previously-persisted settings from `localStorage`
     (`restoreSavedState`).
   - Prefetches the dark theme CSS (`prefetchDarkTheme`).
   - Loads `Popover.fragment.xml`, attaches the shared settings and
     i18n models, and adds it as a dependent of the consumer's view.
3. Binds a fresh `modules` model so panel titles and icons are correct.
4. Opens the popover anchored to `oEvent.getSource()`.

## TypeScript usage

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

The leading `void` is recommended if your `eslint.config.js` enables
`@typescript-eslint/no-floating-promises`. Alternatively, make the
handler `async` and `await` the call.

Corresponding `view.xml`:

```xml
<Button
    icon="sap-icon://accessibility"
    press=".openAccessibilityPopover"
    tooltip="{i18n>accessibility.openPopover}"/>
```

## JavaScript usage

```js
sap.ui.define([
    "./BaseController",
    "ui5-smart-access"
], function (BaseController, { openAccessPopover }) {
    "use strict";

    return BaseController.extend("myapp.controller.Main", {
        openAccessibilityPopover(oEvent) {
            openAccessPopover(this, oEvent);
        }
    });
});
```

## Invocation anchor

The popover opens relative to whichever control fired the event.
Typically that's a toolbar button in the app shell:

```xml
<Button
    icon="sap-icon://accessibility"
    press=".openAccessibilityPopover"/>
```

Multiple triggers are fine — the popover is only created once per
controller, but it will re-anchor to whichever control fired the most
recent event.

## Models

The popover internally sets three models on itself:

| Model name   | Purpose                                                      |
|--------------|--------------------------------------------------------------|
| `settings`   | Two-way bindings for every feature's state.                  |
| `i18n`       | Popover text labels (German default, English alternative).   |
| `modules`    | Array of panel descriptors (title, icon, fragment name).     |

These are **scoped to the popover only**. The host application's own
models are untouched.

## Persistence

Some settings survive a reload. The list is defined in
`package/js/settingsModel.js` as `PERSISTED_KEYS`:

- `fontStep`
- `ttsRate`
- `ttsVolume`
- `colorBlindnessType`
- `blueLightFilterLevel`
- `blueLightFilterActive`
- `nightModeActive`

They are stored under per-key `localStorage` entries by
`js/preferences.js`. Clearing them via "Reset all" also clears
`localStorage`.

`imageHider` uses its own legacy key (`eye-able-images-hidden`) — see
`FEATURES.md` for the note on migrating this.

## Lifecycle

- The popover is added as a **dependent** of the consumer's view via
  `oView.addDependent(oPopover)`. It is therefore destroyed together
  with the view.
- `attachAfterClose(stopReading)` is wired in `index.js` so text-to-
  speech always stops when the popover closes.

## Internationalization

Supported languages out of the box:

- German (`i18n_de.properties`) — default bundle (`i18n.properties`)
- English (`i18n_en.properties`)

The active bundle is selected automatically based on UI5's configured
language (`sap.ui.getCore().getConfiguration().getLanguage()` at the
time `createI18nModel()` runs).

Additional languages can be added by PR — drop a new
`i18n_<lang>.properties` into `package/i18n/`.

## Accessibility attributes

- The popover has `role="dialog"` and `aria-label` from i18n.
- Every feature toggle has a `tooltip` bound through i18n.
- Focus rings are explicit (see [STYLING.md](./STYLING.md)).
- The `prefers-contrast: more` media query swaps the popover to a
  strict black-on-white palette.

## Versioning

This package follows semver:

- **Patch** — bug fixes, style tweaks, i18n additions.
- **Minor** — new features (new panel, new toggle), new exports.
- **Major** — breaking changes to `openAccessPopover`'s signature or
  to `settings` model paths consumed externally.

## Anti-usage

- Do **not** import any `package/js/*` module directly from a consumer.
  Those are internal; contract is not stable.
- Do **not** attempt to re-use the popover fragment standalone — it
  relies on the models and initialization performed by `openAccessPopover`.
