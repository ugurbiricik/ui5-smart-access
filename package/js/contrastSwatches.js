// Inline data-URI swatches for the contrast-mode panel (no external assets).

// Single colour chip.
const colorSquare = (color) =>
    "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">` +
        `<rect width="28" height="28" rx="6" fill="${color}" stroke="rgba(0,0,0,0.15)"/></svg>`
    );

// Preset chip: background fill with a sample "A" in the text colour.
const presetSquare = (bg, text) =>
    "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">` +
        `<rect width="36" height="36" rx="8" fill="${bg}" stroke="rgba(0,0,0,0.15)"/>` +
        `<text x="18" y="25" font-size="20" font-family="Arial" text-anchor="middle" fill="${text}">A</text></svg>`
    );

// Rainbow chip for the "custom colour" entry (opens the colour picker).
const rainbowSquare = () =>
    "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">` +
        `<defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="#f43f5e"/><stop offset="0.25" stop-color="#facc15"/>` +
        `<stop offset="0.5" stop-color="#22c55e"/><stop offset="0.75" stop-color="#3b82f6"/>` +
        `<stop offset="1" stop-color="#a855f7"/></linearGradient></defs>` +
        `<rect width="28" height="28" rx="6" fill="url(#r)" stroke="rgba(0,0,0,0.15)"/></svg>`
    );

// Six selectable colours (shared by background + text pickers).
const COLORS = ["#000000", "#ffffff", "#7f1d1d", "#facc15", "#22c55e", "#2563eb"];

// Four ready-made high-contrast combinations.
const PRESETS = [
    { bg: "#1e3a8a", text: "#facc15" },
    { bg: "#7f1d1d", text: "#22c55e" },
    { bg: "#000000", text: "#ffffff" },
    { bg: "#ffffff", text: "#000000" }
];

export const buildContrastColors = () =>
    COLORS.map((color) => ({ color, preview: colorSquare(color) }))
        .concat([{ color: "custom", preview: rainbowSquare() }]);

export const buildContrastPresets = () =>
    PRESETS.map((p) => ({ bg: p.bg, text: p.text, preview: presetSquare(p.bg, p.text) }));
