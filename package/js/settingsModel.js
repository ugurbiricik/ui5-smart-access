import JSONModel from "sap/ui/model/json/JSONModel";
import Fragment from "sap/ui/core/Fragment";
import { savePref, loadPref, clearPrefs } from "./preferences.js";
import {
    initFontSizer,
    onIncreaseFontSize,
    onDecreaseFontSize
} from "./fontsize.js";
import { applyColorBlindness } from "./colorBlindness.js";
import { enableBlueLightFilter } from "./blueLightFilter.js";
import { toggleNightMode } from "./nightMode.js";

// Keys that are persisted to localStorage so user choices survive reloads.
export const PERSISTED_KEYS = [
    "fontStep", "ttsRate", "ttsVolume", "colorBlindnessType",
    "blueLightFilterLevel", "blueLightFilterActive", "nightModeActive"
];

const loadSavedSettings = () => {
    const saved = {};
    PERSISTED_KEYS.forEach((key) => {
        const val = loadPref(key, undefined);
        if (val !== undefined) saved[key] = val;
    });
    return saved;
};

const savedSettings = loadSavedSettings();

// Single shared settings model used by the popover controller and feature
// handlers. Exported as a module singleton so every importer sees the
// same instance.
export const oSettingsModel = new JSONModel({
    fontStep: savedSettings.fontStep ?? 0,
    ttsRate: savedSettings.ttsRate ?? 1,
    ttsVolume: savedSettings.ttsVolume ?? 1,
    ttsHover: false,
    colorBlindnessType: savedSettings.colorBlindnessType ?? 'none',
    blueLightFilterLevel: savedSettings.blueLightFilterLevel ?? 50,
    blueLightFilterActive: savedSettings.blueLightFilterActive ?? false,
    fontSizeExpanded: false,
    ttsExpanded: false,
    colorBlindnessExpanded: false,
    blueLightFilterExpanded: false,
    nightModeActive: false,
    toggleImagesActive: false,
    contrastModeActive: false,
    contrastModeExpanded: false,
    contrastBgColor: "#000000",
    contrastTextColor: "#FFFFFF",
    contrastRatio: "21:1",
    contrastReadable: "LESBAR?",
    contrastUnderlineLinks: true
});

export const saveCurrentSettings = () => {
    PERSISTED_KEYS.forEach((key) => {
        savePref(key, oSettingsModel.getProperty("/" + key));
    });
};

export const clearAllPrefs = () => clearPrefs();

// Re-applies the previously saved settings (font size, color blindness,
// blue-light filter, night mode) at popover init so the app state matches
// what the user had last time.
export const restoreSavedState = () => {
    const fontStep = oSettingsModel.getProperty("/fontStep");
    if (fontStep !== 0) {
        initFontSizer(oSettingsModel);
        for (let i = 0; i < Math.abs(fontStep); i++) {
            if (fontStep > 0) onIncreaseFontSize();
            else onDecreaseFontSize();
        }
    }

    const colorBlindnessType = oSettingsModel.getProperty("/colorBlindnessType");
    if (colorBlindnessType !== 'none') {
        applyColorBlindness(colorBlindnessType);
    }

    const blueLightFilterActive = oSettingsModel.getProperty("/blueLightFilterActive");
    if (blueLightFilterActive) {
        enableBlueLightFilter(oSettingsModel.getProperty("/blueLightFilterLevel"));
    }

    if (savedSettings.nightModeActive) {
        toggleNightMode();
        oSettingsModel.setProperty("/nightModeActive", true);
    }
};

// Marks the relevant panels as active (blue left border) when the popover
// opens, reflecting features that are currently on.
export const restoreActiveFeatureClasses = (sFragmentId) => {
    if (oSettingsModel.getProperty("/nightModeActive")) {
        const panel = Fragment.byId(sFragmentId, "nightModePanel");
        if (panel) panel.addStyleClass("activeFeature");
    }
    if (oSettingsModel.getProperty("/blueLightFilterActive")) {
        const panel = Fragment.byId(sFragmentId, "blueLightFilterPanel");
        if (panel) panel.addStyleClass("activeFeature");
    }
};
