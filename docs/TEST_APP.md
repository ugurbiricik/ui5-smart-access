# Test application

The `test/` directory holds a full UI5 application whose only job is to
exercise every feature of the popover in a realistic layout. It is the
fastest way to develop, test, and visually verify changes to the
package.

## What it contains

`test/` is a standard TypeScript-based UI5 application:

```
test/
├── webapp/
│   ├── Component.ts
│   ├── manifest.json
│   ├── index.html
│   ├── index-cdn.html
│   ├── controller/
│   │   ├── App.controller.ts
│   │   ├── BaseController.ts
│   │   └── Main.controller.ts
│   ├── view/
│   │   ├── App.view.xml
│   │   └── Main.view.xml
│   ├── model/
│   ├── i18n/
│   │   ├── i18n.properties        (German default)
│   │   ├── i18n_de.properties
│   │   └── i18n_en.properties
│   └── test/
│       └── unit/controller/Main.qunit.ts
├── ui5.yaml                       (dev + build middlewares)
├── ui5-dist.yaml                  (dist variant)
├── ui5-coverage.yaml              (coverage variant)
├── package.json                   (scripts, dependencies)
├── tsconfig.json
└── eslint.config.js
```

## The Main view

`Main.view.xml` renders a `Page` with an `IconTabBar` of seven tabs,
each carrying realistic content so every popover feature has something
to act on:

| Tab             | Content                                                    | Exercises                                |
|-----------------|------------------------------------------------------------|------------------------------------------|
| **Typography**  | Titles, paragraphs, lists, blockquote, code samples        | Font size, TTS, contrast, night mode     |
| **Images**      | `<img>`, `Avatar`, SVG, icons, CSS background images       | Toggle images, color blindness           |
| **Forms**       | Input, DatePicker, Select, Slider, CheckBox, RadioButton   | Contrast ratio on form controls          |
| **Table**       | `sap.m.Table` with 10 demo product rows                    | Night mode row striping, TTS             |
| **Lists**       | Standard `List` with avatars and status info               | Toggle images (avatars), TTS             |
| **Colors**      | Palette of named colors with hex codes                     | Color blindness filters, blue light      |
| **Buttons**     | All Button types + MessageToast/Dialog launchers           | Contrast, focus ring, dialogs            |

### Entry point

The `Page` header contains a single emphasized button:

```xml
<Button
    text="{i18n>openAccessibility}"
    press=".openAbicsAccessibilityPopover"
    icon="sap-icon://accessibility"
    type="Emphasized"/>
```

It calls into the consumer's controller, which calls the package's
public API:

```ts
// test/webapp/controller/Main.controller.ts
import { openAccessPopover } from "ui5-smart-access";

public openAbicsAccessibilityPopover(oEvent: UIEvent): void {
    void openAccessPopover(this, oEvent);
}
```

This is the **canonical usage example** of the package.

## Demo data

`Main.controller.onInit()` builds a `JSONModel` with three arrays:

- `products` — 10 rows with name, code, category, price and status.
- `tasks` — 5 rows with title, description, icon, and info state.
- `contacts` — 4 rows with name, role, email, city, phone, status.

Bound into the Table and Lists tabs so every feature has enough visual
surface to show its effect.

## Running locally

```bash
cd test
npx ui5 serve --port 8080
```

The server uses `test/ui5.yaml`, which enables:

- `ui5-tooling-transpile-middleware` — TypeScript / modern JS support.
- `ui5-middleware-livereload` — auto-reload on save.
- `ui5-tooling-modules-middleware` — resolves `ui5-smart-access` from
  `node_modules` for UI5's loader.

Open http://localhost:8080 and click the accessibility button in the
header to open the popover.

> **Port conflict?** If another process is already on 8080, the server
> fails with `EADDRINUSE`. Either kill the other process or pick a
> different port with `--port 8081`.

## Build

```bash
cd test
npm run build          # dev build, output in dist/
npm run build:opt      # self-contained build (bundles everything)
```

Build output lands in `test/dist/`. The `ui5-tooling-modules-task`
ensures the package is bundled into the build output so the `dist/`
app works standalone (no `node_modules` access at runtime).

## Lint & type-check

```bash
npm run lint           # ESLint over webapp/
npm run ts-typecheck   # tsc --noEmit
npm run ui5lint        # UI5-specific linter
```

All three should be clean before committing.

## Unit tests

A minimal QUnit test lives at
`webapp/test/unit/controller/Main.qunit.ts`:

- Instantiates the `Main` controller.
- Confirms the `openAbicsAccessibilityPopover` handler exists.

To run interactively, start the server and navigate to the test suite
URL shown in the server output, or use:

```bash
npm run test-runner
```

Which invokes `ui5-test-runner` against the mounted test suite.

## E2E (wdi5)

`test/webapp/test/e2e/` carries a `wdi5` harness.

```bash
npm run wdi5
```

This is intentionally lean — most UX verification still happens
manually using the rich layout above, because the popover's effects
(CSS filters, `speechSynthesis`, DOM style injection) are awkward to
assert from outside.

## Linking the package for development

The test app's `package.json` depends on `ui5-smart-access`. For local
development against the in-tree `package/` source, use `npm link`:

```bash
cd package
npm link

cd ../test
npm link ui5-smart-access
```

After linking, `test/node_modules/ui5-smart-access` is a symlink to
`package/`, and edits in `package/` are picked up live by the dev
server (via the livereload middleware).

See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full workflow.

## Why this approach

- **Real UI5 app, not a dummy page.** The package uses UI5 APIs
  (`Fragment.load`, `Theming`, `JSONModel`), so the test app must be
  real UI5 to exercise them meaningfully.
- **German as default, English override.** Mirrors the package's own
  i18n setup so "does the popover stay in German when the app is in
  German?" is directly visible.
- **Heterogeneous content.** Having forms, tables, colors, and images
  on different tabs means toggling a feature visibly affects multiple
  content types at once — regressions are easy to spot.
