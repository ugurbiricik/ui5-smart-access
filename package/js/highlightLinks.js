import { injectStyle, removeStyle } from "./styleInjector.js";

// Makes links visually distinct and strengthens the keyboard focus indicator
// across the page. Instead of a hard box outline, links get a soft rounded
// "highlighter" pill + a clean offset underline + bold weight — clearly
// visible but tidy. Links inside the popover are left untouched.
const STYLE_ID = "ui5-smart-access-highlight-links";

const CSS = `
    body a,
    body .sapMLnk,
    body .sapMLnkText {
        text-decoration: underline !important;
        text-decoration-color: #f59e0b !important;
        text-decoration-thickness: 2px !important;
        text-underline-offset: 3px !important;
        background-color: rgba(245, 158, 11, 0.15) !important;
        border-radius: 5px !important;
        padding: 0.1em 0.3em !important;
        font-weight: 600 !important;
        box-decoration-break: clone !important;
        -webkit-box-decoration-break: clone !important;
        transition: background-color 0.15s ease !important;
    }
    body a:hover,
    body .sapMLnk:hover,
    body .sapMLnkText:hover {
        background-color: rgba(245, 158, 11, 0.3) !important;
        text-decoration-color: #d97706 !important;
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
        padding: 0 !important;
        border-radius: 0 !important;
        font-weight: inherit !important;
    }
`;

export const enableHighlightLinks = () => injectStyle(STYLE_ID, CSS);
export const disableHighlightLinks = () => removeStyle(STYLE_ID);
