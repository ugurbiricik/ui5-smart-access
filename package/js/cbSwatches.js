import { getText } from "./i18nModel.js";

// Generates small Ishihara-style preview swatches (a circle filled with
// coloured dots) as inline data-URI SVGs — no external assets. Each colour
// deficiency mode gets a palette that hints at the affected hues.

const DOTS = [
    [20, 6, 4.5], [11, 9, 3.5], [29, 9, 3.5], [6, 16, 3.5], [20, 13, 4],
    [34, 16, 3.5], [14, 16, 3], [26, 16, 3], [9, 23, 4], [20, 20, 4.5],
    [31, 23, 4], [15, 24, 3], [25, 24, 3], [6, 30, 3], [20, 28, 4],
    [34, 30, 3], [12, 32, 3.5], [28, 32, 3.5]
];

const PALETTES = {
    protanomaly: ["#b6763a", "#8a8f3a", "#c9a24a", "#9a7a4a", "#b58f5a", "#7a8a3a", "#c8b46a", "#a76a5a"],
    deuteranomaly: ["#6a9a4a", "#8aae5a", "#a7b96a", "#5a8a3a", "#9ab56a", "#6a9a5a", "#b5c57a", "#7a9a4a"],
    tritanomaly: ["#3a9a9a", "#5aabab", "#7abdbd", "#4a8a9a", "#6aacac", "#8acccc", "#5a9a8a", "#4a9aaa"],
    grayscale: ["#8a8a8a", "#a5a5a5", "#6a6a6a", "#9a9a9a", "#7a7a7a", "#b5b5b5", "#5a5a5a", "#909090"]
};

const makeSwatch = (palette) => {
    const dots = DOTS.map(
        (d, i) => `<circle cx='${d[0]}' cy='${d[1]}' r='${d[2]}' fill='${palette[i % palette.length]}'/>`
    ).join("");
    const svg =
        "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>" +
        "<defs><clipPath id='c'><circle cx='20' cy='20' r='19'/></clipPath></defs>" +
        "<circle cx='20' cy='20' r='19.5' fill='#eef0f3'/>" +
        `<g clip-path='url(#c)'>${dots}</g></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
};

const SWATCHES = {
    protanomaly: makeSwatch(PALETTES.protanomaly),
    deuteranomaly: makeSwatch(PALETTES.deuteranomaly),
    tritanomaly: makeSwatch(PALETTES.tritanomaly),
    grayscale: makeSwatch(PALETTES.grayscale)
};

// Built fresh each time the popover opens so titles reflect the current
// language (i18n is ready by then).
export const buildColorBlindnessModes = () => [
    { key: "protanomaly", title: getText("colorBlindness.protanomaly.title"), sub: getText("colorBlindness.protanomaly.sub"), icon: SWATCHES.protanomaly },
    { key: "deuteranomaly", title: getText("colorBlindness.deuteranomaly.title"), sub: getText("colorBlindness.deuteranomaly.sub"), icon: SWATCHES.deuteranomaly },
    { key: "tritanomaly", title: getText("colorBlindness.tritanomaly.title"), sub: getText("colorBlindness.tritanomaly.sub"), icon: SWATCHES.tritanomaly },
    { key: "grayscale", title: getText("colorBlindness.grayscale.title"), sub: getText("colorBlindness.grayscale.sub"), icon: SWATCHES.grayscale }
];
