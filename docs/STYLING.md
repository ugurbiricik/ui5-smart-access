# Styling

All popover visuals are driven by a single stylesheet (`package/css/style.css`)
injected at runtime, plus a second targeted stylesheet that night mode
appends to `<head>`. This document explains the strategy, the visual
tokens, and how the popover stays visually isolated from the host app.

## Goals

1. **Zero configuration.** Consumers don't configure CSS; importing the
   package is enough.
2. **Isolation from the host app** — as much as the DOM allows. Host app
   CSS should not break the popover, and the popover should not style
   host content.
3. **Night mode support** — the popover must remain readable when the
   page switches to a dark theme, and the transition must be fast.

## Injection

`js/cssLoader.js` appends a single `<link rel="stylesheet">` to
`<head>` pointing to `css/style.css` (resolved via
`sap.ui.require.toUrl`). A module-level flag (`isCssLoaded`) guarantees
it runs only once per page, even if `openAccessPopover` is called many
times.

## Isolation strategy

Every rule in `style.css` is prefixed with the
`.abicsAccessibilityPopover` class, which is applied to the root
`<Popover>` control in `Popover.fragment.xml`:

```xml
<Popover class="abicsAccessibilityPopover" ...>
```

This yields selectors of the form:

```css
.abicsAccessibilityPopover .sapMPanel { … }
.abicsAccessibilityPopover .sapMSwt   { … }
```

so host-page CSS can't match our rules accidentally, and our rules
can't leak out. We still use `!important` on most properties because
UI5 theme CSS carries high specificity and loads late.

### The one thing isolation can't fully solve

UI5 Popovers render into a global static area
(`document.body > #sap-ui-static`). If the consumer has blanket global
CSS (for example `body *, button { font-family: … !important }`), it
will reach the popover no matter what class we apply. We can't prevent
that; see `fontsize.js` below for one concrete mitigation.

## Font-size isolation

The "Font size" feature scales the entire document by bumping
`html { font-size }`. Because the popover's own typography also uses
relative units, that would make the popover itself grow/shrink while
you're using it.

Mitigation — `style.css` pins popover text to an absolute value:

```css
.abicsAccessibilityPopover .sapMTitle,
.abicsAccessibilityPopover .sapMLabel,
.abicsAccessibilityPopover .sapMText,
.abicsAccessibilityPopover .sapMBtnContent,
.abicsAccessibilityPopover .sapMSwtLabel,
.abicsAccessibilityPopover .sapMSltLabel,
.abicsAccessibilityPopover .sapUiIcon {
  font-size: 14px !important;
}
.abicsAccessibilityPopover .popoverTitle {
  font-size: 16px !important;
}
```

This keeps the popover a stable target, which is important because the
user might zoom the page and then immediately click something inside
the popover.

## Design tokens (light mode)

| Purpose                | Value                                             |
|------------------------|---------------------------------------------------|
| Popover background     | `#f0f2f5`                                         |
| Panel card background  | `#ffffff`                                         |
| Panel card radius      | `12px`                                            |
| Panel card shadow      | `0 2px 6px rgba(0, 0, 0, 0.10)`                   |
| Primary accent         | `#3b82f6`                                         |
| Header text / icons    | `#1e3a8a` on gradient                             |
| Header gradient        | `linear-gradient(135deg, #1e3a8a, #3b82f6)`       |
| Active feature border  | `3px solid #3b82f6`                               |
| Active feature bg      | `rgba(59, 130, 246, 0.06)`                        |
| Reset All accent       | `#ef4444`                                         |
| Focus ring             | `2px solid #3b82f6` (with `outline-offset: 2px`)  |

## Design tokens (night mode)

Night mode adds a separate `<style id="popover-dark-mode-styles">`:

| Purpose                | Value                                             |
|------------------------|---------------------------------------------------|
| Popover background     | `#1e1e1e`                                         |
| Panel card background  | `#2b2b2b`                                         |
| Panel text / icons     | `#e0e0e0`                                         |
| Primary accent         | `#6b9eff`                                         |
| Header gradient        | `linear-gradient(135deg, #0f1a3a, #1e3a6a)`       |
| Active feature border  | `3px solid #6b9eff`                               |
| Active feature bg      | `rgba(107, 158, 255, 0.10)`                       |

## Header rendering

The header is not a standard `<Bar>` — it's a `<ToolbarSpacer>`-based
layout inside `customHeader`, with the gradient applied to
`.sapMPopoverHeader` and every descendant forced to
`background: transparent !important` so the gradient isn't "broken" by
child elements with their own backgrounds.

## Panel types

Two kinds of panels live in the popover:

- **Expandable panels** — font size, TTS, color blindness, blue light,
  contrast. Have content visible on expand.
- **Switch-only panels** — night mode, toggle images. These carry a
  switch in the `headerToolbar` only. We hide `.sapMPanelContent` so no
  empty white strip appears:

  ```css
  .abicsAccessibilityPopover .nightModePanel > .sapMPanelContent,
  .abicsAccessibilityPopover .toggleImagesPanel > .sapMPanelContent,
  .abicsAccessibilityPopover .contrastModePanel > .sapMPanelContent {
    display: none !important;
  }
  ```

## Active feature indicator

`popoverHelpers.toggleActiveFeatureClass(panelId, active)` toggles a
`activeFeature` class on the `sap.m.Panel`. The class:

- Draws a 3px left border in the accent color.
- Tints the panel background a faint accent shade.
- Also tints the panel header toolbar so the indicator is visible even
  when the panel is collapsed.

Both light and dark tokens are defined, so the indicator is visible in
either theme.

## Night mode: theme-switch delay fix

The naive implementation (call `Theming.setTheme("sap_horizon_dark")`
and inject our dark styles) showed two artifacts on the first toggle:

1. A brief flash where panel chevrons and icons still used the blue
   accent from the light theme, because UI5 was still downloading the
   dark theme's CSS over HTTP.
2. After the dark theme loaded, the freshly-applied UI5 CSS sat later
   in `<head>` than our `<style>` tag, overriding some of our
   overrides.

Both are addressed in `js/nightMode.js`:

### Step 1 — Prefetch

When the popover first opens, `prefetchDarkTheme()` runs. It walks every
`<link id="sap-ui-theme-…">` and injects a matching

```html
<link rel="preload" as="style" href="…/sap_horizon_dark/…css">
```

The browser fetches and caches the dark CSS while the popover is open,
so by the time the user flips night mode on, the bytes are already
local.

### Step 2 — Re-append after theme change

`ensureThemeAppliedHandler()` attaches a handler to
`Theming.attachApplied`. Every time UI5 applies a theme, if night mode
is active, we re-append the `<style id="popover-dark-mode-styles">` to
the end of `<head>` so it sits *after* the theme's CSS and wins the
cascade.

### Step 3 — High-specificity selectors

The rules that target elements controlled by UI5's theme CSS (text and
icon colors) use `html body .abicsAccessibilityPopover …` to raise
specificity above the theme's default selectors. See `nightMode.js`
line 83 onwards.

Combined, these three measures make the toggle look instantaneous and
visually complete.

## Keyboard focus

Focus rings are explicit rather than relying on UI5's defaults, because
the popover accent changes between light and dark mode:

```css
.abicsAccessibilityPopover .sapMBtnInner:focus-visible,
.abicsAccessibilityPopover .sapMSltArrow:focus-visible,
.abicsAccessibilityPopover .sapMSwtInner:focus-visible,
.abicsAccessibilityPopover .sapMSliderHandle:focus-visible,
.abicsAccessibilityPopover .sapMTB:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

## `prefers-contrast: more`

The stylesheet provides an opt-in OS-level high-contrast override so
that users who have enabled high-contrast at the OS level get a plain
black-on-white popover automatically:

```css
@media (prefers-contrast: more) { … }
```

This is independent of the popover's built-in "Contrast mode" feature,
which affects the host page — `prefers-contrast` affects the popover
itself.

## Files

- `package/css/style.css` — the entire light-mode stylesheet.
- `package/js/cssLoader.js` — runtime injection.
- `package/js/nightMode.js` — runtime injection of the dark overrides
  plus prefetch and cascade-ordering logic.

Everything else (panel-specific layout) lives in the individual
fragment XML, not in CSS.
