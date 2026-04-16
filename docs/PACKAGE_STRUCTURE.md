# Package structure

Reference for every file under `package/`. Use this as a lookup when you
need to find where a piece of behaviour lives.

## File tree

```
package/
├── index.js                    Public API entry (openAccessPopover)
├── index.d.ts                  TypeScript typings for the public API
├── package.json                npm metadata (name, version, main, types)
├── popoverModules.js           Returns the module list bound to the "modules" model
├── Popover.fragment.xml        Root popover fragment (header + panels + footer)
├── Readme.md                   npm-visible README
├── css/
│   └── style.css               All popover styling (light theme)
├── fragments/
│   ├── FontSizePanel.fragment.xml
│   ├── TextToSpeechPanel.fragment.xml
│   ├── ColorBlindnessPanel.fragment.xml
│   ├── BlueLightFilterPanel.fragment.xml
│   ├── NightModePanel.fragment.xml
│   ├── ToggleImagesPanel.fragment.xml
│   ├── ContrastModePanel.fragment.xml
│   └── ResetAllPanel.fragment.xml
├── i18n/
│   ├── i18n.properties         default (German)
│   ├── i18n_de.properties      German
│   └── i18n_en.properties      English
└── js/
    ├── blueLightFilter.js
    ├── colorBlindness.js
    ├── contrast.js
    ├── cssLoader.js
    ├── filterManager.js
    ├── fontsize.js
    ├── i18nModel.js
    ├── imageHider.js
    ├── nightMode.js
    ├── popoverController.js
    ├── popoverHelpers.js
    ├── preferences.js
    ├── resetAll.js
    ├── settingsModel.js
    └── textToSpeech.js
```

## Top-level files

### `index.js`
Public entry point. Defines and exports `openAccessPopover`. Contains
**no** feature logic — only orchestration:

1. Validate inputs.
2. On first call per consumer controller, lazy-init feature modules and
   load the popover fragment via `Fragment.load`.
3. Set `settings` and `i18n` models on the popover, restore active
   feature classes.
4. `openBy(oEvent.getSource())`.

Safe to import multiple times; the internal settings model is a
module-level singleton.

### `index.d.ts`
TypeScript declaration for `openAccessPopover`. Allows consumers to
`import { openAccessPopover } from "ui5-smart-access"` with proper types.

### `popoverModules.js`
Returns the array of panel descriptors bound to the popover's `modules`
JSONModel (titles, icons, fragment names). Kept separate so adding or
reordering panels doesn't touch `index.js`.

### `Popover.fragment.xml`
The root popover fragment:

- `customHeader` — gradient title bar + close button.
- `content` — `<core:Fragment>` tags for each of the seven feature
  panels.
- `footer` — `<Toolbar class="resetAllToolbar">` wrapping the Reset All
  fragment. The toolbar wrapper prevents the button from overflowing
  the popover footer.

Applies class `abicsAccessibilityPopover` so every style rule can scope
itself to the popover only.

## `fragments/` — one XML fragment per feature panel

All fragments share the same convention:

- Root control: `<Panel>` with `expandable` / `expanded` bound to a
  `/xxxExpanded` property in `settingsModel`.
- Header toolbar: title text and expand/collapse press handler.
- `<content>`: controls specific to the feature (switches, sliders,
  selects, etc.).
- IDs are fragment-local; resolved via `Fragment.byId(sFragmentId, id)`.

## `i18n/`

- `i18n.properties` — default bundle (German labels).
- `i18n_de.properties` / `i18n_en.properties` — per-language overrides.

Loaded by `js/i18nModel.js` as a `ResourceModel` and attached to the
popover as `"i18n"`. The host app's own i18n is unaffected.

## `css/style.css`

All popover styling. Everything is scoped under
`.abicsAccessibilityPopover` so host app CSS can't accidentally style
popover internals (and vice versa). Loaded by `cssLoader.js`.

## `js/` — runtime modules

### Entry-level glue

| File | Role |
|---|---|
| `popoverController.js` | Event handlers referenced from XML fragments. |
| `popoverHelpers.js`    | `toggleActiveFeatureClass`, `updateTitleText`, `closePopoverFromEvent`. |
| `settingsModel.js`     | Shared `JSONModel`, persistence, state restore. |
| `cssLoader.js`         | `loadCustomStyleOnce` — injects `css/style.css` via `<link>`. |
| `i18nModel.js`         | Builds the popover's `ResourceModel`, exposes `getText`. |
| `preferences.js`       | `savePref`, `loadPref`, `clearPrefs` — `localStorage` wrapper. |

### Feature modules

| File | Responsibility |
|---|---|
| `fontsize.js`        | Incremental text scaling on content elements (not inside popover). |
| `textToSpeech.js`    | `speechSynthesis` wrapper with rate/volume/hover-read. |
| `colorBlindness.js`  | Applies SVG filters for protanopia/deuteranopia/tritanopia. |
| `blueLightFilter.js` | Overlay with tunable warm tint (0–100 % level). |
| `nightMode.js`       | Switches UI5 theme to `sap_horizon_dark` + popover dark CSS; prefetch. |
| `imageHider.js`      | Hides `<img>` and CSS background-image on page (excluding popover icons). |
| `contrast.js`        | High-contrast full-page filter + custom bg/text colors + WCAG ratio util. |
| `filterManager.js`   | Coordinates CSS `filter:` chains so color-blindness and blue-light can coexist. |
| `resetAll.js`        | Removes every feature effect from the DOM (used by `onResetAllToolbarPress`). |

## Import graph (abridged)

```
index.js
 ├── popoverModules.js
 ├── js/cssLoader.js
 ├── js/i18nModel.js
 ├── js/settingsModel.js ──► js/preferences.js
 │                      ──► js/fontsize.js
 │                      ──► js/colorBlindness.js ──► js/filterManager.js
 │                      ──► js/blueLightFilter.js ──► js/filterManager.js
 │                      ──► js/nightMode.js
 ├── js/popoverController.js ──► js/settingsModel.js
 │                         ──► js/popoverHelpers.js
 │                         ──► js/fontsize.js
 │                         ──► js/textToSpeech.js
 │                         ──► js/colorBlindness.js
 │                         ──► js/blueLightFilter.js
 │                         ──► js/nightMode.js
 │                         ──► js/imageHider.js
 │                         ──► js/contrast.js
 │                         ──► js/resetAll.js
 │                         ──► js/i18nModel.js
 ├── js/fontsize.js
 ├── js/textToSpeech.js
 ├── js/imageHider.js
 └── js/nightMode.js
```

There are no circular imports. `settingsModel.js` is imported by several
modules but never imports from `popoverController.js`, keeping the
direction clean.
