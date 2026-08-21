# File reference

A one-line description of every source file in the `ui5-smart-access` package
(`package/`). For how to install and wire the package into an app, see
[INTEGRATION.md](./INTEGRATION.md).

## Entry & fragments (`package/`)

| File | What it does |
|------|--------------|
| `index.js` | Public entry. Exports `openAccessPopover`, `initAccessibility`, `initAccessibilityShortcuts`. Runs one-time init (`ensureInitialized`: restore saved prefs, load styles/i18n, prefetch dark theme), loads the popover + flyout fragments, registers keyboard shortcuts, opens the popover. |
| `index.d.ts` | TypeScript type declarations for the three exports. |
| `Popover.fragment.xml` | The main popover: 11 feature rows + an "Alles zurücksetzen" footer. |
| `Flyout.fragment.xml` | The left flyout for detailed settings (font, read-aloud, colour-blindness, contrast, reading aid); the visible section is switched by the `activeFlyout` model property. |

## State, wiring & utilities (`package/js/`)

| File | What it does |
|------|--------------|
| `settingsModel.js` | The shared `oSettingsModel` (JSONModel singleton), `PERSISTED_KEYS`, save/restore of saved state, and legacy-key migration. |
| `popoverController.js` | All event handlers for the popover **and** flyout (`popoverInternalController`). |
| `popoverHelpers.js` | Small helpers called via `.call(ctx)`: toggle the active-row class, set a row's title/icon, close the popover. |
| `preferences.js` | `localStorage` persistence (`savePref`/`loadPref`/`clearPrefs`), guarded against blocked storage. |
| `cssLoader.js` | Injects `css/style.css` once (version-based cache-bust). |
| `i18nModel.js` | Creates the i18n `ResourceModel`, detects the browser language (`en`/`de`, default `de`), `getText`. |
| `styleInjector.js` | Inject/remove a scoped `<style>` element — the popover-safe way features restyle the host page. |
| `filterManager.js` | Combines the `documentElement` CSS `filter` shared by colour-blindness + blue-light. |
| `osPreferences.js` | Reads OS signals: `prefers-reduced-motion` / `-color-scheme` / `-contrast`. |
| `keyboardShortcuts.js` | One global `keydown` listener mapping `Alt+Shift+<key>` to each feature (mirrors a click on its row). |
| `hoverHints.js` | The dark tooltip shown when hovering a feature row (title + description + shortcut). |
| `resetAll.js` | Resets/disables every feature (used by "Alles zurücksetzen"). |

## Feature modules (`package/js/`)

| File | What it does |
|------|--------------|
| `fontsize.js` | Legacy font-size step helpers + `onResetFontSize` (font sizing is now owned by `typography.js`). |
| `typography.js` | Root font-size %, body zoom (+ counter-zoom for the popover), line-height, word/letter spacing, text alignment. |
| `textToSpeech.js` | Read-aloud engine: full-page reading segment-by-segment with a green highlight (popover excluded), plus hover-read with an amber highlight; rate/volume, pause/resume, prev/next. |
| `colorBlindness.js` | Colour-vision correction via interpolated SVG `feColorMatrix` filters (+ CSS grayscale), 0–100 intensity. |
| `blueLightFilter.js` | Warm/dimming `brightness`+`sepia`+`hue-rotate` filter by level. |
| `nightMode.js` | Universal dark mode: swaps to `sap_horizon_dark`, tags `<html>.saNightMode`, injects popover + host-page dark stylesheets, gives images a light backing. |
| `imageHider.js` | Hides page images (and in-popover feature icons/swatches, keeping control-button icons). |
| `contrast.js` | Page-wide high-contrast recolour (bg/text/border/fill/inputs) excluding the popover; WCAG ratio helper. |
| `bigCursor.js` | Enlarged cursor in selectable / custom colours (SVG `cursor:` data-URI). |
| `highlightLinks.js` | Highlights links (amber pill + underline) and strengthens focus. |
| `stopAnimations.js` | Freezes CSS animations/transitions (WCAG 2.2.2), defaults from `prefers-reduced-motion`. |
| `readingGuide.js` | Reading ruler / dimming mask that follows the pointer. |
| `textSpacing.js` | WCAG 1.4.12 spacing presets. **Not mounted** (superseded by typography; kept for reference). |
| `cbSwatches.js` | Builds the colour-blindness mode list + Ishihara-style swatch data-URIs. |
| `contrastSwatches.js` | Builds the contrast preset + colour-swatch data-URIs. |

## Panel fragments (`package/fragments/`)

Each `*Panel.fragment.xml` is one row in the popover (or a flyout section):
`FontSizePanel`, `ReadingGuidePanel`, `BigCursorPanel`, `HighlightLinksPanel`,
`TextToSpeechPanel`, `ColorBlindnessPanel`, `BlueLightFilterPanel`,
`NightModePanel`, `ContrastModePanel`, `StopAnimationsPanel`, `ToggleImagesPanel`,
and `ResetAllPanel` (footer). `TextSpacingPanel` exists but is **not** included in
`Popover.fragment.xml`.

## Assets

| Path | What it does |
|------|--------------|
| `css/style.css` | All popover/flyout styling (loaded at runtime via `cssLoader.js`). |
| `i18n/i18n.properties` + `i18n_de` / `i18n_en` | UI texts — German default, English alternate. |

## Tests (`package/test-unit/`)

Vitest + jsdom unit tests (`*.test.js`), with `sap/*` mocks under
`test-unit/mocks/` and global stubs in `setup.js`. Run with `npm test` inside
`package/`. Excluded from the published package.
