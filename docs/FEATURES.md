# Features

Every accessibility feature the popover offers, how it is implemented,
and what state it touches.

Each feature follows the same contract:

1. A fragment under `package/fragments/` provides the panel UI.
2. A JS module under `package/js/` implements the effect.
3. A handler on `popoverController.js` wires the two together.
4. The relevant model path in `settingsModel.js` is updated; if it is
   in `PERSISTED_KEYS`, it is written to `localStorage`.

## Font size

| Aspect | Value |
|---|---|
| Fragment         | `fragments/FontSizePanel.fragment.xml` |
| Implementation   | `js/fontsize.js` |
| Handlers         | `onIncreaseFontSize`, `onDecreaseFontSize`, `onResetFontSize` |
| Model keys       | `fontStep` (persisted), `fontSizeExpanded` |
| DOM target       | `document.documentElement.style.fontSize` |

### Behaviour
- On first use, the original `html { font-size }` is read from computed
  style and cached as `_defaultFontSize`.
- Each "larger" press increases `fontStep` by 1 (max +5); "smaller"
  decreases (min −3).
- Applied as `calc(<defaultSize> + (step * 2)px)` on `<html>`, so all
  relative (`em`, `rem`, `%`) sizes scale automatically.
- The popover itself is **not** affected — `style.css` pins its text
  elements to `font-size: 14px !important`, so the popover remains a
  stable target regardless of the page-level zoom.
- Warning: changing the font size is done via `<html>` inline style.
  Modifying anything else inside the popover or doing DOM work in
  `fontsize.js` causes the popover to close, so keep the module minimal.

### Persistence
`fontStep` is restored by `settingsModel.restoreSavedState()` by simply
replaying `onIncreaseFontSize` / `onDecreaseFontSize` N times.

## Text to speech

| Aspect | Value |
|---|---|
| Fragment       | `fragments/TextToSpeechPanel.fragment.xml` |
| Implementation | `js/textToSpeech.js` |
| Handlers       | `onTTSStart`, `onTTSStop`, `onTTSRateChange`, `onTTSVolumeChange`, `onTTSHoverChange` |
| Model keys     | `ttsRate`, `ttsVolume` (persisted), `ttsHover`, `ttsExpanded` |
| API used       | `window.speechSynthesis` |

### Behaviour
- **Full read.** `startReading()` constructs a
  `SpeechSynthesisUtterance` from `document.body.innerText`, applies
  rate/volume from the model, and speaks it.
- **Hover read.** When toggled, a `mouseover` listener on `document.body`
  speaks the hovered element's `innerText` (debounced 300 ms).
- `stopReading()` cancels any in-flight speech.
- `initTextToSpeech(model)` wires the shared settings model in.
- Gracefully no-ops on browsers without `speechSynthesis`.

### Cleanup
`index.js` calls `stopReading()` in the popover's `afterClose` event so
speech always stops when the popover closes.

## Color blindness

| Aspect | Value |
|---|---|
| Fragment       | `fragments/ColorBlindnessPanel.fragment.xml` |
| Implementation | `js/colorBlindness.js` + `js/filterManager.js` |
| Handlers       | `onColorBlindnessChange`, `onColorBlindnessReset` |
| Model keys     | `colorBlindnessType` (persisted), `colorBlindnessExpanded` |
| DOM target     | `<html>` CSS `filter` (via `filterManager`) |

### Behaviour
- Injects a hidden inline `<svg>` containing four `<filter>` definitions:
  protanopia, deuteranopia, tritanopia (color matrices) and a CSS
  grayscale for achromatopsia.
- Applies one of `url(#protanopia)` etc. as a CSS filter on
  `document.documentElement`, via the shared `filterManager`.
- `'none'` removes the filter.

### Interaction with blue-light filter
Both features push into the same `document.documentElement.style.filter`
property. `filterManager` keeps them under separate keys and composes
the final `filter` string, so they stack without overwriting each other.

## Blue light filter

| Aspect | Value |
|---|---|
| Fragment       | `fragments/BlueLightFilterPanel.fragment.xml` |
| Implementation | `js/blueLightFilter.js` + `js/filterManager.js` |
| Handlers       | `onBlueLightFilterToolbarPress`, `onBlueLightFilterSliderChange`, `onBlueLightFilterReset` |
| Model keys     | `blueLightFilterLevel` (persisted), `blueLightFilterActive` (persisted), `blueLightFilterExpanded` |
| DOM target     | `<html>` CSS `filter` (via `filterManager`) |

### Behaviour
Computes a combined filter from the slider level (0–100):

```
brightness(1 − level × 0.001)
sepia(level × 0.006)
hue-rotate(−20deg × level/100)
```

Applied via `filterManager.setFilter('blueLightFilter', …)`. Pressing
the toolbar toggles the filter on/off and flips `blueLightFilterActive`.

## Night mode

| Aspect | Value |
|---|---|
| Fragment       | `fragments/NightModePanel.fragment.xml` |
| Implementation | `js/nightMode.js` |
| Handlers       | `onNightModeToolbarPress` |
| Model keys     | `nightModeActive` (persisted) |
| Affects        | UI5 theme (`sap_horizon` ↔ `sap_horizon_dark`), popover dark `<style>` |

### Behaviour
1. First call to `toggleNightMode()` remembers the original theme.
2. Calls `Theming.setTheme("sap_horizon_dark")` to turn the whole host
   app dark.
3. Injects a targeted `<style id="popover-dark-mode-styles">` element
   that overrides popover colors (backgrounds, icons, borders,
   switches, slider, buttons).
4. Toggling off removes the style and restores the original theme.

### Theme-switch delay fix
`Theming.setTheme` downloads the dark library CSS over HTTP on first
use, which visibly delayed chevron/icon colors. Two safeguards:

- **`prefetchDarkTheme()`** runs when the popover first opens. It finds
  every `<link id="sap-ui-theme-*">` and inserts a matching
  `<link rel="preload" as="style" href=".../sap_horizon_dark/...">`
  so the browser caches the dark CSS up-front.
- **`Theming.attachApplied`** runs once and re-appends the dark
  `<style>` to the end of `<head>` after every theme swap, so our
  overrides win the cascade against UI5's freshly-applied theme CSS.

Selectors use `html body .abicsAccessibilityPopover …` to raise
specificity above anything the theme might apply.

See [STYLING.md](./STYLING.md) for the full night-mode rule set.

## Toggle images

| Aspect | Value |
|---|---|
| Fragment       | `fragments/ToggleImagesPanel.fragment.xml` |
| Implementation | `js/imageHider.js` |
| Handlers       | `onToggleImagesToolbarPress` |
| Model keys     | `toggleImagesActive` |
| Persistence    | Own key `"eye-able-images-hidden"` in `localStorage` (legacy) |

### Behaviour
- Selects all `img, svg, .sapMImg, .sapMBtnIcon, .sapUiIcon, .sapFAvatar,
  .sapMIllustratedMessage-illu` plus any element with an inline
  `background-image`.
- Sets `visibility: hidden` (preserves layout) except where
  `el.closest(".abicsAccessibilityPopover")` — so popover's own icons
  remain visible.
- Also descends into open Shadow DOMs of icon-bearing controls.
- A `MutationObserver` re-hides newly-added images (debounced 100 ms)
  while the feature is active.

### Persistence
Uses a dedicated localStorage key rather than `PERSISTED_KEYS` because
it was introduced before the generic preferences layer. Consider
migrating for consistency in a future change.

## Contrast mode

| Aspect | Value |
|---|---|
| Fragment       | `fragments/ContrastModePanel.fragment.xml` |
| Implementation | `js/contrast.js` |
| Handlers       | `onContrastModeToolbarPress`, `onContrastPresetPress`, `onContrastApply`, `onContrastReset`, `onUnderlineLinksToggle` |
| Model keys     | `contrastModeActive`, `contrastModeExpanded`, `contrastBgColor`, `contrastTextColor`, `contrastRatio`, `contrastReadable`, `contrastUnderlineLinks` |

### Behaviour
- **Simple toggle:** `toggleContrastMode()` applies a full-page
  `invert(1) grayscale(1)` on `document.body` plus black/white
  background/foreground.
- **Custom contrast:** `applyCustomContrast(bg, text, underlineLinks)`
  sets explicit colors and optionally underlines every `<a>`.
- **Preset buttons** map keys (`yellow-black`, `red-black`,
  `green-black`) to bg/text pairs via a lookup table in
  `popoverController.js`.
- **WCAG ratio preview.** `getContrastRatio(bg, text)` returns
  `{ ratioText, readable }` — the latter true for ratios ≥ 4.5:1.

## Reset all

| Aspect | Value |
|---|---|
| Fragment       | `fragments/ResetAllPanel.fragment.xml` |
| Implementation | `js/resetAll.js` |
| Handler        | `onResetAllToolbarPress` |

Calls every feature's disable/reset in sequence, plus
`filterManager.clearAllFilters()`, then resets every model key to its
default value and calls `clearAllPrefs()` to wipe localStorage.

## At-a-glance feature / module map

| Feature             | Fragment                          | JS module             |
|---------------------|-----------------------------------|-----------------------|
| Font size           | `FontSizePanel.fragment.xml`      | `fontsize.js`         |
| Text to speech      | `TextToSpeechPanel.fragment.xml`  | `textToSpeech.js`     |
| Color blindness     | `ColorBlindnessPanel.fragment.xml`| `colorBlindness.js`   |
| Blue light filter   | `BlueLightFilterPanel.fragment.xml`| `blueLightFilter.js` |
| Night mode          | `NightModePanel.fragment.xml`     | `nightMode.js`        |
| Toggle images       | `ToggleImagesPanel.fragment.xml`  | `imageHider.js`       |
| Contrast mode       | `ContrastModePanel.fragment.xml`  | `contrast.js`         |
| Reset all           | `ResetAllPanel.fragment.xml`      | `resetAll.js`         |
