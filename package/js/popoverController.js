import { oSettingsModel, saveCurrentSettings, clearAllPrefs } from "./settingsModel.js";
import {
    toggleActiveFeatureClass,
    updateTitleText,
    closePopoverFromEvent
} from "./popoverHelpers.js";
import {
    onIncreaseFontSize as increaseFontSize,
    onDecreaseFontSize as decreaseFontSize,
    onResetFontSize as resetFontSize
} from "./fontsize.js";
import {
    startReading,
    stopReading,
    setTTSRate,
    setTTSVolume,
    enableHoverRead,
    disableHoverRead
} from "./textToSpeech.js";
import { applyColorBlindness, resetColorBlindness } from "./colorBlindness.js";
import { enableBlueLightFilter, disableBlueLightFilter } from "./blueLightFilter.js";
import { toggleNightMode } from "./nightMode.js";
import { toggleImages } from "./imageHider.js";
import {
    toggleContrastMode,
    applyCustomContrast,
    removeCustomContrast,
    getContrastRatio
} from "./contrast.js";
import { resetAll } from "./resetAll.js";
import { getText } from "./i18nModel.js";

// Keeps the contrast-preview model properties in sync with the selected
// foreground/background colors.
const updateContrastPreview = () => {
    const bg = oSettingsModel.getProperty("/contrastBgColor");
    const text = oSettingsModel.getProperty("/contrastTextColor");
    const { ratioText, readable } = getContrastRatio(bg, text);
    oSettingsModel.setProperty("/contrastRatio", ratioText);
    oSettingsModel.setProperty(
        "/contrastReadable",
        readable ? getText("contrast.readable") : getText("contrast.notReadable")
    );
};

const CONTRAST_PRESETS = {
    "yellow-black": { bg: "#FFFF00", text: "#000000" },
    "red-black": { bg: "#FF0000", text: "#000000" },
    "green-black": { bg: "#00FF00", text: "#000000" }
};

// Toggle helper for expand/collapse-only panels.
const togglePanelExpanded = (propertyPath) => {
    const expanded = oSettingsModel.getProperty(propertyPath);
    oSettingsModel.setProperty(propertyPath, !expanded);
    return !expanded;
};

// The object passed as `controller` to Fragment.load for the popover.
// `this` inside each handler refers to this object and carries runtime
// refs `_oPopover` and `_sFragmentId` set by openAccessPopover.
export const popoverInternalController = {

    // ---- Expand/collapse ----
    onFontSizeToolbarPress() {
        togglePanelExpanded("/fontSizeExpanded");
    },
    onTTSToolbarPress() {
        togglePanelExpanded("/ttsExpanded");
    },
    onColorBlindnessToolbarPress() {
        togglePanelExpanded("/colorBlindnessExpanded");
    },

    // ---- Blue light filter ----
    onBlueLightFilterToolbarPress() {
        const nowExpanded = togglePanelExpanded("/blueLightFilterExpanded");
        updateTitleText.call(this, "blueLightFilterTitle",
            nowExpanded ? "blueFilter.deactivate" : "blueFilter.activate");
        if (nowExpanded) {
            enableBlueLightFilter(oSettingsModel.getProperty("/blueLightFilterLevel"));
            oSettingsModel.setProperty("/blueLightFilterActive", true);
        } else {
            disableBlueLightFilter();
            oSettingsModel.setProperty("/blueLightFilterActive", false);
        }
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", nowExpanded);
        saveCurrentSettings();
    },
    onBlueLightFilterSliderChange(e) {
        const level = e.getParameter("value");
        oSettingsModel.setProperty("/blueLightFilterLevel", level);
        enableBlueLightFilter(level);
        saveCurrentSettings();
    },
    onBlueLightFilterReset() {
        oSettingsModel.setProperty("/blueLightFilterLevel", 0);
        disableBlueLightFilter();
        saveCurrentSettings();
    },

    // ---- Night mode ----
    onNightModeToolbarPress() {
        const active = toggleNightMode();
        oSettingsModel.setProperty("/nightModeActive", active);
        updateTitleText.call(this, "nightModeTitle",
            active ? "nightMode.deactivate" : "nightMode.activate");
        toggleActiveFeatureClass.call(this, "nightModePanel", active);
        saveCurrentSettings();
    },

    // ---- Toggle images ----
    onToggleImagesToolbarPress() {
        const active = toggleImages();
        oSettingsModel.setProperty("/toggleImagesActive", active);
        updateTitleText.call(this, "toggleImagesTitle",
            active ? "toggleImages.show" : "toggleImages.hide");
        toggleActiveFeatureClass.call(this, "toggleImagesPanel", active);
    },

    // ---- Contrast mode ----
    onContrastModeToolbarPress() {
        const active = toggleContrastMode();
        oSettingsModel.setProperty("/contrastModeActive", active);
        updateTitleText.call(this, "contrastModeTitle",
            active ? "contrastMode.deactivate" : "contrastMode.activate");
        toggleActiveFeatureClass.call(this, "contrastModePanel", active);
    },
    onContrastPresetPress(oEvent) {
        const customData = oEvent.getSource().getCustomData();
        if (!customData || !customData.length) return;
        const key = customData[0].getValue();
        const preset = CONTRAST_PRESETS[key] || { bg: "#000000", text: "#FFFFFF" };
        oSettingsModel.setProperty("/contrastBgColor", preset.bg);
        oSettingsModel.setProperty("/contrastTextColor", preset.text);
        updateContrastPreview();
    },
    onContrastApply() {
        applyCustomContrast(
            oSettingsModel.getProperty("/contrastBgColor"),
            oSettingsModel.getProperty("/contrastTextColor"),
            oSettingsModel.getProperty("/contrastUnderlineLinks")
        );
        oSettingsModel.setProperty("/contrastModeActive", true);
    },
    onContrastReset() {
        removeCustomContrast();
        oSettingsModel.setProperty("/contrastBgColor", "#000000");
        oSettingsModel.setProperty("/contrastTextColor", "#FFFFFF");
        oSettingsModel.setProperty("/contrastUnderlineLinks", true);
        oSettingsModel.setProperty("/contrastModeActive", false);
        updateContrastPreview();
    },
    onUnderlineLinksToggle(oEvent) {
        oSettingsModel.setProperty("/contrastUnderlineLinks", oEvent.getParameter("selected"));
        updateContrastPreview();
    },

    // ---- Font size ----
    onIncreaseFontSize() {
        increaseFontSize();
        saveCurrentSettings();
    },
    onDecreaseFontSize() {
        decreaseFontSize();
        saveCurrentSettings();
    },
    onResetFontSize() {
        resetFontSize();
        saveCurrentSettings();
    },

    // ---- Text to speech ----
    onTTSStart: startReading,
    onTTSStop: stopReading,
    onTTSRateChange(e) {
        setTTSRate(e.getParameter("value"));
        saveCurrentSettings();
    },
    onTTSVolumeChange(e) {
        setTTSVolume(e.getParameter("value"));
        saveCurrentSettings();
    },
    onTTSHoverChange(e) {
        const active = e.getParameter("state");
        oSettingsModel.setProperty("/ttsHover", active);
        if (active) enableHoverRead(); else disableHoverRead();
    },

    // ---- Color blindness ----
    onColorBlindnessChange(e) {
        const type = e.getParameter("selectedItem").getKey();
        oSettingsModel.setProperty("/colorBlindnessType", type);
        applyColorBlindness(type);
        saveCurrentSettings();
    },
    onColorBlindnessReset() {
        oSettingsModel.setProperty("/colorBlindnessType", "none");
        resetColorBlindness();
        saveCurrentSettings();
    },

    // ---- Reset all ----
    onResetAllToolbarPress() {
        resetAll();
        oSettingsModel.setProperty("/fontStep", 0);
        oSettingsModel.setProperty("/ttsRate", 1);
        oSettingsModel.setProperty("/ttsVolume", 1);
        oSettingsModel.setProperty("/ttsHover", false);
        oSettingsModel.setProperty("/colorBlindnessType", 'none');
        oSettingsModel.setProperty("/blueLightFilterLevel", 50);
        oSettingsModel.setProperty("/blueLightFilterActive", false);
        oSettingsModel.setProperty("/fontSizeExpanded", false);
        oSettingsModel.setProperty("/ttsExpanded", false);
        oSettingsModel.setProperty("/colorBlindnessExpanded", false);
        oSettingsModel.setProperty("/blueLightFilterExpanded", false);
        oSettingsModel.setProperty("/nightModeActive", false);
        oSettingsModel.setProperty("/toggleImagesActive", false);
        oSettingsModel.setProperty("/contrastModeActive", false);

        updateTitleText.call(this, "nightModeTitle", "nightMode.activate");
        updateTitleText.call(this, "blueLightFilterTitle", "blueFilter.activate");
        updateTitleText.call(this, "toggleImagesTitle", "toggleImages.hide");
        updateTitleText.call(this, "contrastModeTitle", "contrastMode.activate");
        toggleActiveFeatureClass.call(this, "nightModePanel", false);
        toggleActiveFeatureClass.call(this, "toggleImagesPanel", false);
        toggleActiveFeatureClass.call(this, "contrastModePanel", false);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", false);
        clearAllPrefs();
    },

    // ---- Close ----
    onPopoverClosePress: closePopoverFromEvent
};
