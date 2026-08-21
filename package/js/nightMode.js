import Theming from "sap/ui/core/Theming";

let isDarkMode = false;
let originalTheme = null;
let themeAppliedHandlerAttached = false;
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

// Re-apply dark mode styles after a theme change so our <style> element
// stays at the END of <head> and wins the cascade. Otherwise UI5's async
// theme CSS load causes a visible delay on panel chevrons, icons etc.
const onThemeApplied = () => {
    if (!isDarkMode) return;
    const style = document.getElementById('popover-dark-mode-styles');
    if (style) {
        document.head.appendChild(style);
    } else {
        applyPopoverDarkMode();
    }
};

const applyPopoverDarkMode = () => {
    // Remove any existing style first to avoid duplicates
    removePopoverDarkMode();
    const style = document.createElement('style');
    style.id = 'popover-dark-mode-styles';
    style.textContent = `
        /* Popover background & scroll area */
        .abicsAccessibilityPopover .sapMPopoverScroll,
        .abicsAccessibilityPopover .sapMPopoverCont {
            background-color: #1e1e1e !important;
        }

        /* Header */
        .abicsAccessibilityPopover .sapMPopoverHeader {
            background: linear-gradient(135deg, #0f1a3a, #1e3a6a) !important;
        }

        .abicsAccessibilityPopover .sapMPopoverHeader * {
            background: transparent !important;
            color: #ffffff !important;
        }

        /* Panel cards */
        .abicsAccessibilityPopover .sapMPanel {
            background-color: #2b2b2b !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
            border-color: #444 !important;
        }

        /* Panel header toolbar */
        .abicsAccessibilityPopover .sapMPanel .sapMTB.sapMPanelHeaderTB {
            background-color: #2b2b2b !important;
        }

        /* Panel content (expanded panels like FontSize) */
        .abicsAccessibilityPopover .sapMPanelContent {
            background-color: #2b2b2b !important;
        }

        /* All text & icons inside popover (high specificity to beat theme CSS) */
        html body .abicsAccessibilityPopover .sapMTitle,
        html body .abicsAccessibilityPopover .sapMLabel,
        html body .abicsAccessibilityPopover .sapMText,
        html body .abicsAccessibilityPopover .sapMBtnContent,
        html body .abicsAccessibilityPopover .sapUiIcon,
        html body .abicsAccessibilityPopover .sapMPanelExpandableIcon,
        html body .abicsAccessibilityPopover .sapMPanelWithExpandableIcon .sapMPanelExpandableIcon,
        html body .abicsAccessibilityPopover .sapMPanelHdr .sapUiIcon {
            color: #e0e0e0 !important;
            background-color: transparent !important;
        }

        /* Buttons inside panels */
        .abicsAccessibilityPopover .sapMPanelContent .sapMBtnInner {
            border-color: #6b9eff !important;
            background-color: transparent !important;
            color: #e0e0e0 !important;
        }

        .abicsAccessibilityPopover .sapMPanelContent .sapMBtnInner:hover {
            background-color: rgba(107, 158, 255, 0.15) !important;
        }

        .abicsAccessibilityPopover .sapMPanelContent .sapMBtnInner .sapUiIcon {
            color: #e0e0e0 !important;
        }

        /* Select dropdown */
        .abicsAccessibilityPopover .sapMPanelContent .sapMSlt {
            border-color: #6b9eff !important;
            background-color: transparent !important;
            color: #e0e0e0 !important;
        }

        /* Switch */
        .abicsAccessibilityPopover .sapMSwtLabel {
            background-color: #6b9eff !important;
            color: #ffffff !important;
        }

        .abicsAccessibilityPopover .sapMSwtOff .sapMSwtLabel {
            background-color: #555555 !important;
        }

        .abicsAccessibilityPopover .sapMSwtInner .sapMSwtHandle {
            background-color: #ffffff !important;
        }

        /* Slider */
        .abicsAccessibilityPopover .sapMSliderInner {
            background-color: #444 !important;
        }

        .abicsAccessibilityPopover .sapMSliderProgress {
            background-color: #6b9eff !important;
        }

        /* Active feature indicator (dark mode version) */
        .abicsAccessibilityPopover .sapMPanel.activeFeature {
            border-left: 3px solid #6b9eff !important;
            background-color: rgba(107, 158, 255, 0.1) !important;
        }

        .abicsAccessibilityPopover .sapMPanel.activeFeature .sapMPanelContent,
        .abicsAccessibilityPopover .sapMPanel.activeFeature .sapMTB.sapMPanelHeaderTB {
            background-color: rgba(107, 158, 255, 0.1) !important;
        }

        /* Footer toolbar (Reset All) */
        .abicsAccessibilityPopover .resetAllToolbar {
            background-color: transparent !important;
        }

        .abicsAccessibilityPopover .resetAllButton .sapMBtnInner {
            border-color: #ef4444 !important;
            color: #ef4444 !important;
            background-color: transparent !important;
        }

        .abicsAccessibilityPopover .resetAllButton .sapMBtnInner .sapUiIcon {
            color: #ef4444 !important;
        }

        .abicsAccessibilityPopover .resetAllButton .sapMBtnInner:hover {
            background-color: rgba(239, 68, 68, 0.15) !important;
        }

        /* Close button */
        .abicsAccessibilityPopover .closePopoverButton .sapMBtnInner {
            background-color: transparent !important;
        }

        .abicsAccessibilityPopover .closePopoverButton .sapMBtnIcon {
            color: #ffffff !important;
        }

        /* VBox, HBox, Toolbar backgrounds */
        .abicsAccessibilityPopover .sapMVBox,
        .abicsAccessibilityPopover .sapMHBox,
        .abicsAccessibilityPopover .sapMTB {
            background-color: transparent !important;
        }

        /* Popover wrapper */
        .abicsAccessibilityPopover .sapMPopoverWrapper {
            background-color: #1e1e1e !important;
        }

        /* Slim scrollbar — lighter accent thumb on the dark background.
           Firefox uses the standard prop; Chromium/Safari use the webkit thumb
           (their standard props are reset to auto in style.css, so setting
           scrollbar-color here would re-disable the pseudo-elements). */
        @supports not selector(::-webkit-scrollbar) {
            .abicsAccessibilityPopover .sapMPopoverScroll,
            .abicsAccessibilityPopover .sapMPopoverCont {
                scrollbar-color: rgba(107, 158, 255, 0.5) transparent !important;
            }
        }
        .abicsAccessibilityPopover .sapMPopoverScroll::-webkit-scrollbar-thumb,
        .abicsAccessibilityPopover .sapMPopoverCont::-webkit-scrollbar-thumb {
            background-color: rgba(107, 158, 255, 0.45) !important;
        }
        .abicsAccessibilityPopover .sapMPopoverScroll::-webkit-scrollbar-thumb:hover,
        .abicsAccessibilityPopover .sapMPopoverCont::-webkit-scrollbar-thumb:hover {
            background-color: rgba(107, 158, 255, 0.6) !important;
        }
    `;
    document.head.appendChild(style);
};

const removePopoverDarkMode = () => {
    const existingStyle = document.getElementById('popover-dark-mode-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
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

const ensureThemeAppliedHandler = () => {
    if (themeAppliedHandlerAttached) return;
    Theming.attachApplied(onThemeApplied);
    themeAppliedHandlerAttached = true;
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
        ensureThemeAppliedHandler();
        applyPopoverDarkMode();
        applyHostDarkMode();
        Theming.setTheme("sap_horizon_dark");
    } else {
        removePopoverDarkMode();
        removeHostDarkMode();
        Theming.setTheme(originalTheme || "sap_horizon");
    }
    return isDarkMode;
};

export const disableNightMode = () => {
    if (isDarkMode) {
        removePopoverDarkMode();
        removeHostDarkMode();
        Theming.setTheme(originalTheme || "sap_horizon");
        isDarkMode = false;
    }
};

export const isNightModeActive = () => isDarkMode;
