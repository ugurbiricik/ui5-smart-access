import Theming from "sap/ui/core/Theming";

let isDarkMode = false;
let originalTheme = null;
let darkThemePreloaded = false;

// Preload sap_horizon_dark CSS into browser cache so that switching themes
// is near-instant (no HTTP round-trip during the toggle). Without this, UI5
// downloads the dark theme on first toggle which causes a visible delay on
// icons, panel chevrons, buttons etc.
const preloadDarkTheme = () => {
    if (darkThemePreloaded) return;
    const links = document.querySelectorAll('link[id^="sap-ui-theme-"]');
    links.forEach((link) => {
        const src = link.href || "";
        if (!src) return;
        const darkHref = src.replace(/\/themes\/[^/]+\//, "/themes/sap_horizon_dark/");
        if (darkHref === src) return;
        const preload = document.createElement("link");
        preload.rel = "preload";
        preload.as = "style";
        preload.href = darkHref;
        preload.setAttribute("data-ui5-smart-access", "dark-preload");
        document.head.appendChild(preload);
    });
    darkThemePreloaded = true;
};

// The UI5 sap_horizon_dark theme only darkens UI5 controls. To also cover
// non-UI5 / custom-HTML content (raw text, plain elements, images, form
// fields) — like an Eye-Able-style universal dark mode — we inject a
// supplementary host-page stylesheet and tag <html> with `saNightMode` so
// consumers can dark-theme their own custom markup via that hook too.
// Conservative on backgrounds: we do NOT blanket-override element backgrounds
// (that would wipe intentional colours, e.g. a colour-swatch demo). We darken
// the page base + text + inputs, and give images a light backing so
// transparent dark logos don't vanish on the dark page.
const HOST_DARK_CSS = `
    html.saNightMode body {
        background-color: #121212 !important;
        color: #e4e4e4 !important;
    }
    html.saNightMode :where(p,span,li,dd,dt,td,th,caption,label,figcaption,
        blockquote,small,strong,em,b,i,h1,h2,h3,h4,h5,h6,legend,summary,cite,
        address,time):not([class*="sap"]) {
        color: #e4e4e4 !important;
    }
    html.saNightMode a:not([class*="sap"]) {
        color: #6b9eff !important;
    }
    html.saNightMode :where(input,textarea,select):not([class*="sap"]) {
        background-color: #1c1c1c !important;
        color: #e4e4e4 !important;
        border-color: #444 !important;
    }
    /* Light backing so transparent dark logos stay visible; opaque photos hide
       it and just get slightly rounded corners. Popover images are excluded. */
    html.saNightMode img:not(#sap-ui-static *) {
        background-color: #f3f3f3 !important;
        border-radius: 6px !important;
    }
`;

const applyHostDarkMode = () => {
    removeHostDarkMode();
    document.documentElement.classList.add('saNightMode');
    const style = document.createElement('style');
    style.id = 'host-dark-mode-styles';
    style.textContent = HOST_DARK_CSS;
    document.head.appendChild(style);
};

const removeHostDarkMode = () => {
    document.documentElement.classList.remove('saNightMode');
    const existing = document.getElementById('host-dark-mode-styles');
    if (existing) existing.remove();
};

// Call this as early as possible (e.g. when popover first opens) so the
// dark theme CSS is already cached when the user toggles night mode.
export const prefetchDarkTheme = () => {
    preloadDarkTheme();
};

export const toggleNightMode = () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        if (!originalTheme) {
            originalTheme = Theming.getTheme();
        }
        // Safety net: also preload here in case prefetchDarkTheme wasn't called
        preloadDarkTheme();
        applyHostDarkMode();
        Theming.setTheme("sap_horizon_dark");
    } else {
        removeHostDarkMode();
        Theming.setTheme(originalTheme || "sap_horizon");
    }
    return isDarkMode;
};

export const disableNightMode = () => {
    if (isDarkMode) {
        removeHostDarkMode();
        Theming.setTheme(originalTheme || "sap_horizon");
        isDarkMode = false;
    }
};

export const isNightModeActive = () => isDarkMode;
