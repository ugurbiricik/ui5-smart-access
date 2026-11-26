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

### Launcher badge

The launcher shows how many features are active as a small badge in its top-right
corner (hidden when nothing is active) and its accessible name is extended to
e.g. "Barrierefreiheits-Assistent öffnen, 3 Funktionen aktiv" /
"Open accessibility assistant, 3 features active". The badge follows the SAP theme
(`--sapContent_Badge*`, incl. high-contrast themes) and updates live. It is attached
to the control passed to `initAccessibility` (or the button that opened the popover);
for an `sap.m.Button` it sits on the inner round/rect shape, so keep that element
free of `overflow: hidden` overrides.

### Profiles

The top of the main list offers four one-tap profiles. Each one only combines
existing features; no extra filters are involved:

| Profile | Applies |
|---|---|
| Sehschwäche / Low vision | Text 150 %, SAP high contrast black (`sap_horizon_hcb`), highlighted links, large black pointer |
| Legasthenie / Dyslexia | Line height 1.5, letter spacing 0.12em, word spacing 0.175em (WCAG 1.4.12), left-aligned, reading line |
| Epilepsie-sicher / Seizure safe | Animations stopped, colours 60 % desaturated (grayscale filter) |
| Konzentration / Focus | Reading mask, animations stopped |

A chip is shown as pressed (`aria-pressed`) while the current settings match the
profile. Pressing it again restores the settings the user had before the profile,
not just the defaults; settings outside the profile are left alone. Only one profile
is applied at a time: picking another one first undoes the previous one. The undo
snapshot is stored with the other preferences, so it survives a reload. Changing a
setting by hand releases the chip; "Reset all" clears the profile as well.

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
// Opens the assistant, anchored to the event source. Resolves to the sap.m.ResponsivePopover.
openAccessPopover(controller: Controller, oEvent: Event): Promise<unknown>;
// Recommended onInit entry point: re-applies saved prefs + registers Alt+Shift shortcuts.
initAccessibility(controller: Controller, oTrigger: Control): void;
```

## Layout

The assistant is a single `sap.m.ResponsivePopover` holding a `sap.m.NavContainer`:

- **Main list** — one row per feature. On/off features (night mode, highlight
  links, stop animations, hide images) toggle on click; features with settings
  (font, reading aid, big cursor, read aloud, colour blindness, blue filter,
  contrast) show a `›` and open their **detail page in the same popover**, with a
  back button in the header. Opening a row never changes the page by itself.
- **Desktop / tablet** — 360 px popover below the launcher; its height follows the
  current page and scrolls inside the viewport. "Reset all" stays pinned at the bottom.
- **Phone** — opens as a full-screen dialog (`ResponsivePopover` on `sap.ui.Device.system.phone`).
- **Focus** — opening a detail page focuses its first control; back returns focus
  to the row that opened it. `Esc` closes the assistant.
- **Contrast page** — SAP high-contrast theme as a segmented choice (Standard ·
  HC White · HC Black, applied at once), labelled colour schemes that show their
  WCAG contrast ratio and level (AAA / AA), and a collapsible "Custom colours"
  section with named colour buttons. Schemes and colours are toggle buttons
  (`aria-pressed`); a scheme is a draft until **Apply**, **Cancel** restores the
  state the page was opened with.
- **Hover hints** — on devices with a real hover pointer (`(hover: hover)`, mouse
  only, never touch or pen) a short description of a main-list row appears after
  600 ms beside the popover. It never covers the popover: if there is no room on
  either side it is not shown, and it disappears on click, key press, scroll and
  as soon as a detail page opens.
- **Keyboard shortcuts page** — the ⌨ button in the header of the main list opens
  a page listing every shortcut. Each row also exposes its shortcut through
  `aria-keyshortcuts`, so screen readers announce it.

| Shortcut | Action |
|---|---|
| `Alt+Shift+A` | open / close the assistant |
| `Alt+Shift+F` · `R` · `G` · `V` · `S` · `B` · `K` | open font · reading aid · big cursor · read aloud · colour blindness · blue filter · contrast page (again: back to the list) |
| `Alt+Shift+L` · `N` · `M` · `I` | toggle highlight links · night mode · stop animations · hide images |

## Theming

The popover takes its colours from the active SAP theme. `css/style.css` declares
`--sa-*` design tokens on `:root`, each bound to an SAP theme parameter, so Horizon,
Horizon Dark (night mode), High Contrast Black/White and custom themes built with the
UI Theme Designer are followed automatically, with no per-theme override.

| Token | SAP theme parameter | Used for |
|---|---|---|
| `--sa-bg`, `--sa-text`, `--sa-text-2` | `sapList_Background`, `sapList_TextColor`, `sapContent_LabelColor` | popover surface, row text, secondary text |
| `--sa-accent` | `sapContent_Selected_TextColor` | row icons, values, links |
| `--sa-header-bg`, `--sa-header-text`, `--sa-header-line` | `sapPageHeader_*` | flat popover header |
| `--sa-row-hover`, `--sa-row-active`, `--sa-row-active-line` | `sapList_Hover_Background`, `sapList_SelectionBackgroundColor`, `sapList_SelectionBorderColor` | row hover / active feature |
| `--sa-control-bg`, `--sa-control-hover`, `--sa-control-text`, `--sa-control-line` | `sapButton_Neutral_*`, `sapButton_Lite_BorderColor` | stepper buttons, selects |
| `--sa-emph-*`, `--sa-selected-*`, `--sa-danger-*` | `sapButton_Emphasized_*`, `sapButton_Selected_*`, `sapButton_Reject_*` | primary action, selected chip, Reset All |
| `--sa-track*`, `--sa-switch-*`, `--sa-field-*` | `sapSlider_*`, `sapButton_Track_*`/`Handle_*`, `sapField_*` | sliders, switches, hex input |
| `--sa-focus`, `--sa-scroll*`, `--sa-shadow*` | `sapContent_FocusColor`, `sapScrollBar_*`, `sapContent_Shadow0/2` | focus ring, scrollbar, hint shadow |

To restyle the popover without touching the theme, override a token after the
stylesheet is loaded, e.g. `:root { --sa-accent: #0a6ed1; }`.

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
