# ui5-smart-access

[![npm](https://img.shields.io/npm/v/ui5-smart-access.svg)](https://www.npmjs.com/package/ui5-smart-access)

An accessibility popover for SAP UI5 applications. Plug in one button,
get a ready-made panel with:

- Font & typography (zoom, font size, line height, word/letter spacing, alignment)
- Text-to-speech (full read + hover read, speed/volume)
- Color-blindness correction modes with adjustable intensity
- Blue-light filter (tunable 0–100 %)
- Night mode (universal: swaps the UI5 theme + darkens the popover **and** the host page's own markup)
- Contrast mode (page-wide custom bg/text colours with live WCAG ratio, chosen in a flyout)
- Reading aid (guide line / dimming mask)
- Big cursor (selectable colours + custom)
- Highlight links & focus
- Stop animations (WCAG 2.2.2)
- Image hider
- Keyboard shortcuts (global `Alt+Shift+<key>`)
- Reset all

## Quick start

```bash
npm install ui5-smart-access
```

```ts
import { openAccessPopover, initAccessibility } from "ui5-smart-access";

// In your controller's onInit: re-apply saved prefs on page load and
// enable the Alt+Shift keyboard shortcuts. Pass the launcher control.
public onInit(): void {
    initAccessibility(this, this.byId("accessButton"));
}

public openAccessibilityPopover(oEvent: UIEvent): void {
    void openAccessPopover(this, oEvent);
}
```

```xml
<Button id="accessButton" icon="sap-icon://accessibility" press=".openAccessibilityPopover"/>
```

See [`package/Readme.md`](./package/Readme.md) for the full install
and configuration instructions (requires `ui5-tooling-modules`).

## Repository layout

```
ui5-smart-access/
├── package/   The npm package (ships to npm as ui5-smart-access)
└── test/      A full UI5 test application that consumes the package
```

## Documentation

Everything — install, dev/prod config, deployment, API and publishing — is in a
single document: **[package/Readme.md](./package/Readme.md)** (also the page shown
on npm).

## Development

```bash
# Link the package into the test app
cd package && npm link
cd ../test && npm link ui5-smart-access && npm install

# Run the test app
npx ui5 serve --port 8080

# Run the package unit tests
cd package && npm test
```

## License

ISC
