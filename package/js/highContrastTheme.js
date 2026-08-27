import Theming from "sap/ui/core/Theming";

// SAP's built-in, WCAG-compliant high-contrast themes. Unlike the custom-colour
// contrast (an injected CSS override that fights the cascade), these repaint
// EVERY UI5 control natively — no coverage gaps on form fields, icons, etc.
// The mechanism mirrors nightMode.js (Theming.setTheme + preload).
const THEMES = {
    hcb: "sap_horizon_hcb",
    hcw: "sap_horizon_hcw"
};

let activeVariant = null; // "hcb" | "hcw" | null
let baseTheme = null;     // the normal theme to restore when turning HC off
let preloaded = false;

// Only OUR own high-contrast themes are treated as non-restorable; a host app
// whose base theme is e.g. sap_horizon_dark keeps it.
const isHcTheme = (t) => /_(hcb|hcw)$/.test(t || "");

// Warm the HCB/HCW stylesheet caches so the first switch is near-instant
// (no HTTP round-trip mid-toggle → no visible flash on icons/controls). Called
// lazily when the contrast flyout first opens, not on every page load.
export const prefetchHighContrastThemes = () => {
    if (preloaded) return;
    const links = document.querySelectorAll('link[id^="sap-ui-theme-"]');
    links.forEach((link) => {
        const src = link.href || "";
        if (!src) return;
        Object.values(THEMES).forEach((theme) => {
            const href = src.replace(/\/themes\/[^/]+\//, "/themes/" + theme + "/");
            if (href === src) return;
            const preload = document.createElement("link");
            preload.rel = "preload";
            preload.as = "style";
            preload.href = href;
            preload.setAttribute("data-ui5-smart-access", "hc-preload");
            document.head.appendChild(preload);
        });
    });
    preloaded = true;
};

export const applyHighContrastTheme = (variant) => {
    const theme = THEMES[variant];
    if (!theme) return null;
    // Capture the theme to return to only on the FIRST activation, and never
    // capture one of our own HC themes (avoids trapping the user in HC).
    if (activeVariant === null) {
        const current = Theming.getTheme();
        baseTheme = isHcTheme(current) ? "sap_horizon" : current;
    }
    activeVariant = variant;
    Theming.setTheme(theme);
    return variant;
};

export const disableHighContrastTheme = () => {
    if (activeVariant === null) return;
    activeVariant = null;
    Theming.setTheme(baseTheme || "sap_horizon");
};

export const isHighContrastThemeActive = () => activeVariant !== null;

export const getHighContrastVariant = () => activeVariant;
