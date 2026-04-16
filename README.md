# ui5-smart-access

[![npm](https://img.shields.io/npm/v/ui5-smart-access.svg)](https://www.npmjs.com/package/ui5-smart-access)

An accessibility popover for SAP UI5 applications. Plug in one button,
get a ready-made panel with:

- Font-size scaling
- Text-to-speech (full read + hover read)
- Color-blindness filters (protanopia, deuteranopia, tritanopia, achromatopsia)
- Blue-light filter (tunable 0–100 %)
- Night mode (swaps the UI5 theme + targeted popover dark styles)
- Image hider
- Contrast mode (toggle + custom bg/text colors with live WCAG ratio)
- Reset all

## Quick start

```bash
npm install ui5-smart-access
```

```ts
import { openAccessPopover } from "ui5-smart-access";

public openAccessibilityPopover(oEvent: UIEvent): void {
    void openAccessPopover(this, oEvent);
}
```

```xml
<Button icon="sap-icon://accessibility" press=".openAccessibilityPopover"/>
```

See [`package/Readme.md`](./package/Readme.md) for the full install
and configuration instructions (requires `ui5-tooling-modules`).

## Repository layout

```
ui5-smart-access/
├── package/   The npm package (what ships to npm as ui5-smart-access)
├── test/      A full UI5 test application that consumes the package
└── docs/      Developer documentation
```

## Documentation

| Document | Topic |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | High-level architecture and data flow |
| [docs/PACKAGE_STRUCTURE.md](./docs/PACKAGE_STRUCTURE.md) | File-by-file breakdown of `package/` |
| [docs/FEATURES.md](./docs/FEATURES.md) | Each accessibility feature explained |
| [docs/STYLING.md](./docs/STYLING.md) | CSS strategy, popover isolation, night-mode prefetch |
| [docs/PUBLIC_API.md](./docs/PUBLIC_API.md) | `openAccessPopover` reference |
| [docs/TEST_APP.md](./docs/TEST_APP.md) | The bundled test UI5 app |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Local setup, `npm link`, release |

## Development

```bash
# Link the package into the test app
cd package && npm link
cd ../test && npm link ui5-smart-access && npm install

# Run the test app
npx ui5 serve --port 8080
```

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for the full workflow.

## License

ISC
