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
    `;
    document.head.appendChild(style);
};

const removePopoverDarkMode = () => {
    const existingStyle = document.getElementById('popover-dark-mode-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
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
        Theming.setTheme("sap_horizon_dark");
    } else {
        removePopoverDarkMode();
        Theming.setTheme(originalTheme || "sap_horizon");
    }
    return isDarkMode;
};

export const disableNightMode = () => {
    if (isDarkMode) {
        removePopoverDarkMode();
        Theming.setTheme(originalTheme || "sap_horizon");
        isDarkMode = false;
    }
};

export const isNightModeActive = () => isDarkMode;
