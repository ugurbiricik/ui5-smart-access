import { injectStyle, removeStyle } from "./styleInjector.js";

// Makes links visually distinct (underline + highlight) and strengthens the
// keyboard focus indicator across the page. Links inside the popover are left
// untouched so the panel styling stays clean.
const STYLE_ID = "ui5-smart-access-highlight-links";

const CSS = `
    body a,
    body .sapMLnk,
    body .sapMLnkText {
        text-decoration: underline !important;
        outline: 2px solid #ffbf00 !important;
        outline-offset: 1px !important;
        background-color: rgba(255, 191, 0, 0.18) !important;
    }
    body *:focus {
        outline: 3px solid #1e3a8a !important;
        outline-offset: 2px !important;
    }
    .abicsAccessibilityPopover a,
    .abicsAccessibilityPopover .sapMLnk,
    .abicsAccessibilityPopover .sapMLnkText {
        background-color: transparent !important;
        outline: none !important;
    }
`;

export const enableHighlightLinks = () => injectStyle(STYLE_ID, CSS);
export const disableHighlightLinks = () => removeStyle(STYLE_ID);
