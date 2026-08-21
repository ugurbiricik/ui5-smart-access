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
import { applyCustomContrast, getContrastRatio } from "./contrast.js";
import { buildContrastColors, buildContrastPresets } from "./contrastSwatches.js";
import { applyTextSpacing } from "./textSpacing.js";
import { setBigCursor, setBigCursorCustom, buildBigCursorColors } from "./bigCursor.js";
import { enableHighlightLinks } from "./highlightLinks.js";
import { enableStopAnimations } from "./stopAnimations.js";
import { setReadingGuide } from "./readingGuide.js";
import { prefersReducedMotion } from "./osPreferences.js";
import {
    setTypoZoom,
    setTypoFontPct,
    setTypoLineHeight,
    setTypoWordSpacing,
    setTypoLetterSpacing,
    setTypoAlign,
    isTypographyActive
} from "./typography.js";

// Keys that are persisted to localStorage so user choices survive reloads.
export const PERSISTED_KEYS = [
    "fontStep", "ttsRate", "ttsVolume", "colorBlindnessType",
    "blueLightFilterLevel", "blueLightFilterActive", "nightModeActive",
    "contrastModeActive", "contrastBgColor", "contrastTextColor",
    "contrastUnderlineLinks", "colorBlindnessIntensity",
    "readingGuideMode",
    "bigCursorColor", "bigCursorCustomColor", "highlightLinksActive", "stopAnimationsActive",
    "typoZoom", "typoFontPct", "typoLineHeight", "typoWordSpacing",
    "typoLetterSpacing", "typoAlign"
];

// Map legacy colour-blindness keys (v1.1.x used the -opia/achromatopsia names)
// onto the current -omaly/grayscale keys so saved preferences still apply.
const CB_TYPE_MIGRATION = {
    protanopia: "protanomaly",
    deuteranopia: "deuteranomaly",
    tritanopia: "tritanomaly",
    achromatopsia: "grayscale"
};
const migrateCbType = (t) => CB_TYPE_MIGRATION[t] || t;

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
    // Whether the read-aloud is actively speaking (drives the play/pause icon).
    ttsPlaying: false,
    colorBlindnessType: migrateCbType(savedSettings.colorBlindnessType) ?? 'none',
    colorBlindnessIntensity: savedSettings.colorBlindnessIntensity ?? 100,
    colorBlindnessModes: [],

    // Left flyout popover: which detailed feature it currently shows.
    activeFlyout: "",
    activeFlyoutTitle: "",
    activeFlyoutIcon: "",
    blueLightFilterLevel: savedSettings.blueLightFilterLevel ?? 50,
    blueLightFilterActive: savedSettings.blueLightFilterActive ?? false,
    fontSizeExpanded: false,
    // Open the inline panel on load if a colour-correction mode is already active.
    colorBlindnessExpanded: (migrateCbType(savedSettings.colorBlindnessType) ?? "none") !== "none",
    blueLightFilterExpanded: false,
    nightModeActive: false,
    toggleImagesActive: false,
    contrastModeActive: savedSettings.contrastModeActive ?? false,
    // Default to a normal (non-jarring) high-contrast pair: white bg / black
    // text. This also lets the user change just ONE colour (the other keeps its
    // sensible default). NOTE: use || (not ??) so a persisted empty string ""
    // from an earlier build is also replaced by the default.
    contrastBgColor: savedSettings.contrastBgColor || "#ffffff",
    contrastTextColor: savedSettings.contrastTextColor || "#000000",
    contrastRatio: "21:1",
    contrastReadable: "",
    contrastUnderlineLinks: savedSettings.contrastUnderlineLinks ?? true,
    // Selectable colours + ready-made presets for the contrast panel.
    contrastColors: buildContrastColors(),
    contrastPresets: buildContrastPresets(),

    // Text spacing (WCAG 1.4.12): none | light | moderate | heavy
    textSpacingLevel: savedSettings.textSpacingLevel ?? "none",
    textSpacingExpanded: false,
    // Reading aid: none | guide | mask
    readingGuideMode: savedSettings.readingGuideMode ?? "none",
    readingGuideExpanded: false,
    // Enlarged pointer: 'none' | black | white | red | blue | green.
    // Migrates the old boolean (true → black).
    bigCursorColor: savedSettings.bigCursorColor ?? (savedSettings.bigCursorActive ? "black" : "none"),
    bigCursorCustomColor: savedSettings.bigCursorCustomColor ?? "#3b82f6",
    bigCursorExpanded: false,
    bigCursorColors: [],
    // Link + focus highlighting
    highlightLinksActive: savedSettings.highlightLinksActive ?? false,
    // Stop animations (WCAG 2.2.2). Defaults to the OS reduced-motion signal
    // when the user has not made an explicit choice yet.
    stopAnimationsActive: savedSettings.stopAnimationsActive ?? prefersReducedMotion(),

    // Font panel (typography)
    typoZoom: savedSettings.typoZoom ?? 100,
    typoFontPct: savedSettings.typoFontPct ?? 0,
    typoLineHeight: savedSettings.typoLineHeight ?? 0,
    typoWordSpacing: savedSettings.typoWordSpacing ?? 0,
    typoLetterSpacing: savedSettings.typoLetterSpacing ?? 0,
    typoAlign: savedSettings.typoAlign ?? "none"
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
    // Font panel (typography) — re-apply saved values.
    setTypoZoom(oSettingsModel.getProperty("/typoZoom"));
    setTypoFontPct(oSettingsModel.getProperty("/typoFontPct"));
    setTypoLineHeight(oSettingsModel.getProperty("/typoLineHeight"));
    setTypoWordSpacing(oSettingsModel.getProperty("/typoWordSpacing"));
    setTypoLetterSpacing(oSettingsModel.getProperty("/typoLetterSpacing"));
    setTypoAlign(oSettingsModel.getProperty("/typoAlign"));

    const colorBlindnessType = oSettingsModel.getProperty("/colorBlindnessType");
    if (colorBlindnessType !== 'none') {
        applyColorBlindness(colorBlindnessType, oSettingsModel.getProperty("/colorBlindnessIntensity"));
    }

    const blueLightFilterActive = oSettingsModel.getProperty("/blueLightFilterActive");
    if (blueLightFilterActive) {
        enableBlueLightFilter(oSettingsModel.getProperty("/blueLightFilterLevel"));
    }

    if (savedSettings.nightModeActive) {
        toggleNightMode();
        oSettingsModel.setProperty("/nightModeActive", true);
    }

    const cbg = oSettingsModel.getProperty("/contrastBgColor");
    const ctext = oSettingsModel.getProperty("/contrastTextColor");
    if (oSettingsModel.getProperty("/contrastModeActive") && cbg && ctext) {
        // Re-apply the saved custom background/text contrast.
        applyCustomContrast(cbg, ctext, oSettingsModel.getProperty("/contrastUnderlineLinks"));
        oSettingsModel.setProperty("/contrastRatio", getContrastRatio(cbg, ctext).ratioText);
    }

    const textSpacingLevel = oSettingsModel.getProperty("/textSpacingLevel");
    if (textSpacingLevel && textSpacingLevel !== "none") {
        applyTextSpacing(textSpacingLevel);
    }

    const bigCursorColor = oSettingsModel.getProperty("/bigCursorColor");
    if (bigCursorColor === "custom") {
        setBigCursorCustom(oSettingsModel.getProperty("/bigCursorCustomColor"));
    } else if (bigCursorColor && bigCursorColor !== "none") {
        setBigCursor(bigCursorColor);
    }
    if (oSettingsModel.getProperty("/highlightLinksActive")) enableHighlightLinks();
    if (oSettingsModel.getProperty("/stopAnimationsActive")) enableStopAnimations();

    const readingGuideMode = oSettingsModel.getProperty("/readingGuideMode");
    if (readingGuideMode && readingGuideMode !== "none") {
        setReadingGuide(readingGuideMode);
    }
};

// Marks the relevant panels as active (blue left border) when the popover
// opens, reflecting features that are currently on.
export const restoreActiveFeatureClasses = (sFragmentId) => {
    const markActive = (panelId) => {
        const panel = Fragment.byId(sFragmentId, panelId);
        if (panel) panel.addStyleClass("activeFeature");
    };

    if (oSettingsModel.getProperty("/nightModeActive")) markActive("nightModePanel");
    if (oSettingsModel.getProperty("/blueLightFilterActive")) markActive("blueLightFilterPanel");
    if (oSettingsModel.getProperty("/contrastModeActive")) markActive("contrastModePanel");
    if (isTypographyActive()) markActive("fontSizePanel");
    if (oSettingsModel.getProperty("/readingGuideMode") !== "none") markActive("readingGuidePanel");
    if (oSettingsModel.getProperty("/bigCursorColor") !== "none") markActive("bigCursorPanel");
    if (oSettingsModel.getProperty("/highlightLinksActive")) markActive("highlightLinksPanel");
    if (oSettingsModel.getProperty("/stopAnimationsActive")) markActive("stopAnimationsPanel");
};
