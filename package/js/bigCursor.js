import { injectStyle, removeStyle } from "./styleInjector.js";
import { getText } from "./i18nModel.js";

// Enlarged pointer for low-vision / motor users. Offered in a few colours plus
// a custom colour; each is an inline data-URI SVG arrow (no external asset).
// The popover itself keeps the default cursor.
const STYLE_ID = "ui5-smart-access-big-cursor";

// Each colour has: fill, a contrasting outline for the REAL cursor (so it stays
// visible on any page background), and a preview outline in its OWN colour (so
// the swatch reads as a solid, consistently-sized arrow on the light panel bg;
// white uses a grey outline since white would vanish).
const COLORS = {
    black: { fill: "#111827", stroke: "#ffffff", previewStroke: "#111827" },
    white: { fill: "#ffffff", stroke: "#111827", previewStroke: "#94a3b8" },
    blue: { fill: "#2563eb", stroke: "#ffffff", previewStroke: "#2563eb" },
    green: { fill: "#16a34a", stroke: "#ffffff", previewStroke: "#16a34a" }
};

// The arrow path's bounding box is roughly x:0–13, y:0–20. The real cursor
// keeps viewBox "0 0 24 24" so the tip stays at the 0,0 hotspot; the preview
// swatch uses a shifted viewBox so the arrow is visually CENTRED in its box.
const CURSOR_VIEWBOX = "0 0 24 24";
const PREVIEW_VIEWBOX = "-5.5 -2 24 24";
const ARROW_PATH = "M0 0 L0 18 L4.5 13.5 L7.5 20 L10 19 L7 12.5 L13 12.5 Z";

const buildSvg = (fill, stroke, size, viewBox) =>
    "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">` +
        `<path d="${ARROW_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>` +
        `</svg>`
    );

// A rainbow-filled arrow marks the "custom colour" entry (opens the picker).
const rainbowArrow = () =>
    "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="${PREVIEW_VIEWBOX}">` +
        `<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="#f43f5e"/><stop offset="0.33" stop-color="#facc15"/>` +
        `<stop offset="0.66" stop-color="#22c55e"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>` +
        `<path d="${ARROW_PATH}" fill="url(#c)" stroke="rgba(0,0,0,0.35)" stroke-width="1.2"/></svg>`
    );

export const BIG_CURSOR_KEYS = Object.keys(COLORS);

// Preview swatches for the panel (built fresh so labels follow the language),
// with a trailing "custom" (rainbow) entry that opens a colour picker.
export const buildBigCursorColors = () =>
    BIG_CURSOR_KEYS.map((key) => ({
        key,
        label: getText("bigCursor." + key),
        preview: buildSvg(COLORS[key].fill, COLORS[key].previewStroke, 34, PREVIEW_VIEWBOX)
    })).concat([{ key: "custom", label: getText("bigCursor.custom"), preview: rainbowArrow() }]);

const applyCursor = (fill, stroke) => {
    const cursor = buildSvg(fill, stroke, 36, CURSOR_VIEWBOX);
    injectStyle(
        STYLE_ID,
        `body, body * { cursor: url("${cursor}") 0 0, auto !important; }\n` +
        `.abicsAccessibilityPopover, .abicsAccessibilityPopover * { cursor: auto !important; }`
    );
};

// Applies a named colour as the enlarged page cursor. Unknown/"none" clears.
export const setBigCursor = (key) => {
    const c = COLORS[key];
    if (!c) {
        removeStyle(STYLE_ID);
        return;
    }
    applyCursor(c.fill, c.previewStroke);
};

// Applies an arbitrary custom colour (own-colour outline).
export const setBigCursorCustom = (hex) => {
    if (!hex) {
        removeStyle(STYLE_ID);
        return;
    }
    applyCursor(hex, hex);
};

export const disableBigCursor = () => removeStyle(STYLE_ID);
