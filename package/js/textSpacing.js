import { injectStyle, removeStyle } from "./styleInjector.js";

// Text spacing tiers. Values meet or exceed WCAG 2.1 SC 1.4.12 targets at the
// "moderate" level (line-height >= 1.5x, letter-spacing >= 0.12em,
// word-spacing >= 0.16em, paragraph spacing >= 2em) and scale up/down around it.
const STYLE_ID = "ui5-smart-access-text-spacing";

const LEVELS = {
    none: null,
    light: { line: 1.5, letter: 0.06, word: 0.1, para: 1.5 },
    moderate: { line: 1.8, letter: 0.12, word: 0.16, para: 2 },
    heavy: { line: 2.2, letter: 0.18, word: 0.24, para: 2.5 }
};

// Applies spacing to host content. A trailing reset rule restores normal
// spacing inside the accessibility popover (class specificity beats `body *`),
// so the panel itself stays compact.
const buildCss = (v) => `
    body * {
        line-height: ${v.line} !important;
        letter-spacing: ${v.letter}em !important;
        word-spacing: ${v.word}em !important;
    }
    body p {
        margin-bottom: ${v.para}em !important;
    }
    .abicsAccessibilityPopover, .abicsAccessibilityPopover * {
        line-height: normal !important;
        letter-spacing: normal !important;
        word-spacing: normal !important;
    }
`;

export const applyTextSpacing = (level) => {
    const v = LEVELS[level];
    if (!v) {
        removeStyle(STYLE_ID);
        return;
    }
    injectStyle(STYLE_ID, buildCss(v));
};

export const resetTextSpacing = () => removeStyle(STYLE_ID);
