# Architecture

This document describes how `ui5-smart-access` is wired together: the
module boundaries, the flow of data and control at runtime, and the
reasoning behind the key structural decisions.

## High-level view

```
                       Host UI5 Application
                                |
                                | (imports)
                                v
+-------------------------------------------------------------+
|                         package/index.js                    |
|                   (public API: openAccessPopover)           |
+-------------------------------------------------------------+
                                |
                                | Fragment.load({ controller })
                                v
+-------------------------------------------------------------+
|                        Popover.fragment.xml                 |
|  - customHeader (title + close button)                      |
|  - content: 7 feature panels (separate fragments)           |
|  - footer: ResetAll toolbar                                 |
+-------------------------------------------------------------+
                                |
                                | press / change events
                                v
+-------------------------------------------------------------+
|                    js/popoverController.js                  |
|          (plain object passed to Fragment.load)             |
+-------------------------------------------------------------+
          |                     |                    |
          |                     |                    |
          v                     v                    v
+------------------+   +------------------+   +------------------+
| Feature modules  |   |  settingsModel   |   | popoverHelpers   |
| (fontsize, tts,  |   |   (JSONModel +   |   | (class toggles,  |
|  nightMode, …)   |   |    persistence)  |   |  title updates,  |
|                  |   |                  |   |  close helper)   |
+------------------+   +------------------+   +------------------+
          |                     |
          v                     v
+------------------+   +------------------+
|   DOM / <head>   |   |   localStorage   |
|  (styles, attrs, |   |   (preferences)  |
|  speechSynthesis)|   |                  |
+------------------+   +------------------+
```

## Module boundaries

### `index.js` (public entry point)

- Exports exactly one symbol: `openAccessPopover(controller, oEvent)`.
- Lazily loads the fragment the first time it is called per consumer
  controller (caches it on `controller._pPopover`).
- Sets the `settings` and `i18n` models on the popover, and restores
  saved user preferences.
- Does **no** feature logic itself — it only wires things up.

### `js/popoverController.js` (controller object)

- Contains every `onXxxPress` / `onXxxChange` handler referenced from XML.
- Never touches the DOM directly; delegates to feature modules.
- Uses `popoverHelpers.js` for the few cross-cutting UI operations
  (active-feature class, title text, close).
- Is a **plain object**, not a UI5 `Controller` subclass. UI5
  `Fragment.load` accepts any object whose methods match the event
  handler names in the XML.

### `js/settingsModel.js` (state)

- Creates and exports the `JSONModel` used by all two-way bindings.
- Defines `PERSISTED_KEYS` (the subset persisted to `localStorage`).
- Exposes:
  - `oSettingsModel` — the shared model instance (module singleton).
  - `saveCurrentSettings()` — writes all persisted keys to storage.
  - `clearAllPrefs()` — wipes stored preferences.
  - `restoreSavedState()` — re-applies feature effects on popover init.
  - `restoreActiveFeatureClasses(sFragmentId)` — restores visual state.

### Feature modules (`js/fontsize.js`, `js/textToSpeech.js`, …)

Each feature module is self-contained:

- Owns its effect on the DOM (injecting styles, setting filters, calling
  `speechSynthesis`, etc.).
- Exposes a small API: an `init*` function (where needed) plus the
  verbs the controller calls (`toggle…`, `enable…`, `apply…`, …).
- Holds its own private module-level state where appropriate
  (e.g. `nightMode.js` tracks `isDarkMode` locally).

### `js/popoverHelpers.js` (UI glue)

- Pure UI helpers that need a fragment ID / popover reference.
- Invoked as `helper.call(controllerCtx, …)` so `this._sFragmentId`
  and `this._oPopover` are available.

### `js/i18nModel.js` & `i18n/*.properties`

- Builds a `ResourceModel` with the popover's own bundle.
- Exposes `getText(key)` for non-binding lookups (e.g. contrast preview).

### `js/cssLoader.js` & `css/style.css`

- Loads the popover stylesheet exactly once via a `<link>` tag appended
  to `<head>`.
- `style.css` defines the entire light-theme look (gradient header,
  card panels, active-feature indicator, etc.).

## Data flow: a user toggles night mode

```
1. User clicks the NightMode toolbar.
2. XML: press=".onNightModeToolbarPress" fires.
3. popoverController.onNightModeToolbarPress():
     a. Calls nightMode.toggleNightMode()
          -> flips local isDarkMode flag
          -> applyPopoverDarkMode()  (injects <style> at end of <head>)
          -> Theming.setTheme("sap_horizon_dark")
     b. Writes /nightModeActive in settingsModel.
     c. popoverHelpers.updateTitleText.call(this, …)    (i18n swap)
     d. popoverHelpers.toggleActiveFeatureClass.call(this, …)
     e. settingsModel.saveCurrentSettings()   (persists to localStorage)
4. UI5 fires Theming.applied once the new theme CSS is loaded.
5. nightMode.onThemeApplied re-appends our <style> to keep cascade order.
```

Every feature follows the same shape: controller handler → feature module
→ model update → helpers for visual side-effects → persistence.

## Why this shape?

- **Single source of truth.** `settingsModel` is a singleton module
  export. Bindings in XML always read/write the same instance.
- **Controller is a plain object.** Fragment-based controllers don't
  need to extend `sap.ui.core.mvc.Controller`; a POJO is lighter and
  easier to unit-test.
- **Feature modules are framework-agnostic.** They only touch DOM and
  Web APIs (except `nightMode` which uses UI5's `Theming`). This keeps
  the implementation portable and testable.
- **CSS injected at runtime.** Consumers don't need to configure a build
  step to pick up the popover stylesheet; `cssLoader` handles it.
- **Popover mounted on the consumer's view (`addDependent`).** This
  ensures the popover participates in the consumer's model lifecycle
  and gets destroyed with the view.

## Cross-cutting concerns

| Concern | Where it lives |
|---|---|
| Persistence (localStorage) | `js/preferences.js` |
| i18n resolution            | `js/i18nModel.js` + `i18n/*.properties` |
| CSS injection              | `js/cssLoader.js` + `css/style.css` |
| Popover DOM queries        | `Fragment.byId` inside `popoverHelpers.js` |
| Theme preload              | `prefetchDarkTheme()` in `nightMode.js` |
| Cleanup on close           | `attachAfterClose(stopReading)` in `index.js` |
