import Theming from "sap/ui/core/Theming";

let isDarkMode = false;
let originalTheme = null;

const applyPopoverDarkMode = () => {
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

        /* All text & icons inside popover */
        .abicsAccessibilityPopover .sapMTitle,
        .abicsAccessibilityPopover .sapMLabel,
        .abicsAccessibilityPopover .sapMText,
        .abicsAccessibilityPopover .sapMBtnContent,
        .abicsAccessibilityPopover .sapUiIcon,
        .abicsAccessibilityPopover .sapMPanelExpandableIcon {
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

export const toggleNightMode = () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        if (!originalTheme) {
            originalTheme = Theming.getTheme();
        }
        Theming.setTheme("sap_horizon_dark");
        applyPopoverDarkMode();
    } else {
        Theming.setTheme(originalTheme || "sap_horizon");
        removePopoverDarkMode();
    }
    return isDarkMode;
};

export const disableNightMode = () => {
    if (isDarkMode) {
        Theming.setTheme(originalTheme || "sap_horizon");
        removePopoverDarkMode();
        isDarkMode = false;
    }
};

export const isNightModeActive = () => isDarkMode;
