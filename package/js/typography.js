import { injectStyle, removeStyle } from "./styleInjector.js";

// Combined typography controls for the "Font" flyout: zoom, font size,
// line height, word spacing, letter spacing and text alignment. All effects
// are applied to the host page but explicitly reset inside the accessibility
// popover so the panel itself is never distorted.

const STYLE_ID = "ui5-smart-access-typography";

const state = {
    zoom: 100,          // 50 .. 200  (page zoom, %)
    fontPct: 0,         // -50 .. 100 (root font-size change; negative shrinks)
    lineHeight: 0,      // 0 .. 100
    wordSpacing: 0,     // 0 .. 100
    letterSpacing: 0,   // 0 .. 100
    align: "none"       // none | left | center | right | justify
};

const buildCss = () => {
    const decls = [];
    if (state.lineHeight > 0) {
        decls.push(`line-height: ${(1.2 + (state.lineHeight / 100) * 1.2).toFixed(2)} !important;`);
    }
    if (state.wordSpacing > 0) {
        decls.push(`word-spacing: ${((state.wordSpacing / 100) * 0.5).toFixed(3)}em !important;`);
    }
    if (state.letterSpacing > 0) {
        decls.push(`letter-spacing: ${((state.letterSpacing / 100) * 0.3).toFixed(3)}em !important;`);
    }
    if (state.align && state.align !== "none") {
        decls.push(`text-align: ${state.align} !important;`);
    }
    if (!decls.length) return "";
    return (
        `body * { ${decls.join(" ")} }\n` +
        `.abicsAccessibilityPopover, .abicsAccessibilityPopover * {` +
        ` line-height: normal !important; word-spacing: normal !important;` +
        ` letter-spacing: normal !important; text-align: initial !important; }`
    );
};

const applyAll = () => {
    const css = buildCss();
    if (css) injectStyle(STYLE_ID, css); else removeStyle(STYLE_ID);

    // Root font-size scaling (popover text is isolated at a fixed size via CSS,
    // so it is unaffected). 0% => cleared.
    document.documentElement.style.fontSize =
        state.fontPct !== 0 ? `${(100 + state.fontPct * 0.5).toFixed(1)}%` : "";

    // Page zoom on <body>, counter-zoomed on the static UIArea so the popover
    // and flyout keep their normal size.
    const z = state.zoom / 100;
    document.body.style.zoom = z === 1 ? "" : String(z);
    const staticArea = document.getElementById("sap-ui-static");
    if (staticArea) staticArea.style.zoom = z === 1 ? "" : String(1 / z);
};

export const setTypoZoom = (v) => { state.zoom = v; applyAll(); };
export const setTypoFontPct = (v) => { state.fontPct = v; applyAll(); };
export const setTypoLineHeight = (v) => { state.lineHeight = v; applyAll(); };
export const setTypoWordSpacing = (v) => { state.wordSpacing = v; applyAll(); };
export const setTypoLetterSpacing = (v) => { state.letterSpacing = v; applyAll(); };
export const setTypoAlign = (v) => { state.align = v || "none"; applyAll(); };

export const resetTypography = () => {
    state.zoom = 100;
    state.fontPct = 0;
    state.lineHeight = 0;
    state.wordSpacing = 0;
    state.letterSpacing = 0;
    state.align = "none";
    applyAll();
};

export const isTypographyActive = () =>
    state.zoom !== 100 ||
    state.fontPct !== 0 ||
    state.lineHeight > 0 ||
    state.wordSpacing > 0 ||
    state.letterSpacing > 0 ||
    (state.align && state.align !== "none");
