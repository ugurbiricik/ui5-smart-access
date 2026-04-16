# ui5-smart-access — Documentation

This directory contains developer documentation for the `ui5-smart-access`
npm package and its bundled test application.

## Table of contents

| Document | Topic |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level architecture, module graph and data flow |
| [PACKAGE_STRUCTURE.md](./PACKAGE_STRUCTURE.md) | File-by-file breakdown of the `package/` source tree |
| [FEATURES.md](./FEATURES.md) | Each accessibility feature (font size, TTS, night mode, …) explained |
| [STYLING.md](./STYLING.md) | CSS strategy, popover isolation, theme prefetch, visual design tokens |
| [PUBLIC_API.md](./PUBLIC_API.md) | How to consume the package (`openAccessPopover`) |
| [TEST_APP.md](./TEST_APP.md) | The `test/` UI5 app used to exercise the popover |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local setup, `npm link` workflow, build & release |

## Quick glossary

- **Popover** — the `sap.m.Popover` rendered by `Popover.fragment.xml`; hosts
  all feature panels.
- **Feature panel** — a `sap.m.Panel` inside the popover, one per
  accessibility feature.
- **Feature module** — a JS file under `package/js/` that implements one
  feature's behaviour (e.g. `nightMode.js`, `textToSpeech.js`).
- **Settings model** — the shared `JSONModel` exported by
  `js/settingsModel.js`; backs two-way bindings in the fragment.
- **Popover controller** — the plain-object controller (not a UI5 class)
  passed to `Fragment.load`. Defined in `js/popoverController.js`.
