import { oSettingsModel, saveCurrentSettings, clearAllPrefs } from "./settingsModel.js";
import Fragment from "sap/ui/core/Fragment";
import { toggleActiveFeatureClass } from "./popoverHelpers.js";
import {
    fontStatus,
    readingGuideStatus,
    bigCursorStatus,
    ttsStatus,
    colorBlindnessStatus,
    blueLightFilterStatus,
    contrastStatus,
    toggleStatus
} from "./rowStatus.js";
import {
    onIncreaseFontSize as increaseFontSize,
    onDecreaseFontSize as decreaseFontSize,
    onResetFontSize as resetFontSize
} from "./fontsize.js";
import {
    startReading,
    stopReading,
    pauseReading,
    resumeReading,
    skipNext,
    skipPrev,
    isReadingActive,
    isReadingPaused,
    setTTSRate,
    setTTSVolume,
    enableHoverRead,
    disableHoverRead,
    speakSample
} from "./textToSpeech.js";
import { applyColorBlindness, resetColorBlindness } from "./colorBlindness.js";
import { enableBlueLightFilter, disableBlueLightFilter } from "./blueLightFilter.js";
import { toggleNightMode, disableNightMode, isNightModeActive } from "./nightMode.js";
import { toggleImages, areImagesHidden } from "./imageHider.js";
import {
    toggleContrastMode,
    applyCustomContrast,
    removeCustomContrast,
    getContrastRatio,
    getWcagLevel
} from "./contrast.js";
import { findSchemeId, buildSwatchCss } from "./contrastSwatches.js";
import {
    applyHighContrastTheme,
    disableHighContrastTheme,
    prefetchHighContrastThemes
} from "./highContrastTheme.js";
import { announce } from "./announcer.js";
import { applyTextSpacing, resetTextSpacing } from "./textSpacing.js";
import { setBigCursor, setBigCursorCustom, disableBigCursor, bigCursorPreviewSrc } from "./bigCursor.js";
import { enableHighlightLinks, disableHighlightLinks } from "./highlightLinks.js";
import { enableStopAnimations, disableStopAnimations } from "./stopAnimations.js";
import { setReadingGuide } from "./readingGuide.js";
import {
    setTypoZoom,
    setTypoFontSize,
    setTypoLineHeight,
    setTypoWordSpacing,
    setTypoLetterSpacing,
    setTypoAlign,
    isTypographyActive,
    previewCss
} from "./typography.js";
import { injectStyle } from "./styleInjector.js";
import { isDetailAtDefault } from "./detailDefaults.js";
import { resetAll } from "./resetAll.js";
import { BADGE_PATHS, countActiveFeatures } from "./launcherBadge.js";
import { getText } from "./i18nModel.js";
import { hideHint } from "./hoverHints.js";
import { shortcutKeys } from "./shortcutList.js";
import {
    getProfile,
    profileMatches,
    takeSnapshot,
    defaultsFor,
    isValidSnapshot,
    activeProfileMap,
    WATCHED_PATHS
} from "./profiles.js";

// Resolve the picked colour from a ColorPickerPopover `change` event. Prefer
// the event's own colour params (colorString/hex/rgb); fall back to the
// control's getColorString(). Returns a "#rrggbb" string.
const pickedHex = (oEvent, picker) => {
    const p = (oEvent && oEvent.getParameters && oEvent.getParameters()) || {};
    const hx = (n) => Number(n).toString(16).padStart(2, "0");
    if (p.r != null && p.g != null && p.b != null) return "#" + hx(p.r) + hx(p.g) + hx(p.b);
    if (p.hex) return "#" + String(p.hex).replace(/^#/, "");
    if (p.colorString) return p.colorString;
    return picker && picker.getColorString ? picker.getColorString() : "";
};

// Keeps the contrast-preview model properties in sync with the selected
// foreground/background colors.
const LEVEL_STATE = { AAA: "Success", AA: "Success", AALarge: "Warning", fail: "Error" };

const updateContrastPreview = () => {
    const bg = oSettingsModel.getProperty("/contrastBgColor");
    const text = oSettingsModel.getProperty("/contrastTextColor");
    const theme = oSettingsModel.getProperty("/contrastTheme");
    const scheme = oSettingsModel.getProperty("/contrastScheme") || "off";
    const hasColors = !!(bg && text) && !theme && scheme !== "off";
    if (bg && text) {
        const { ratioText, readable } = getContrastRatio(bg, text);
        oSettingsModel.setProperty("/contrastRatio", ratioText);
        oSettingsModel.setProperty(
            "/contrastReadable",
            readable ? getText("contrast.readable") : getText("contrast.notReadable")
        );
    }
    if (theme) {
        oSettingsModel.setProperty("/contrastInfo", getText("contrast.info.theme", [getText("contrast." + theme)]));
        oSettingsModel.setProperty("/contrastInfoState", "None");
    } else if (hasColors) {
        const { ratio, ratioText } = getContrastRatio(bg, text);
        const level = getWcagLevel(ratio);
        oSettingsModel.setProperty("/contrastInfo", getText("contrast.info.ratio", [ratioText, getText("contrast.level." + level)]));
        oSettingsModel.setProperty("/contrastInfoState", LEVEL_STATE[level]);
    } else {
        oSettingsModel.setProperty("/contrastInfo", getText("contrast.info.off"));
        oSettingsModel.setProperty("/contrastInfoState", "None");
    }
    // Live-colour the preview box (empty draft → neutral). Setting inline
    // styles on existing elements is popover-safe (no DOM rebuild).
    const boxes = document.querySelectorAll(".abicsAccessibilityPopover .contrastPreviewBox");
    const texts = document.querySelectorAll(".abicsAccessibilityPopover .contrastPreviewText");
    boxes.forEach((box) => { box.style.backgroundColor = hasColors ? bg : ""; });
    texts.forEach((txt) => { txt.style.color = hasColors ? text : ""; });
};

const FONT_PREVIEW_STYLE_ID = "ui5-smart-access-font-preview";

const updateFontPreview = () => {
    injectStyle(
        FONT_PREVIEW_STYLE_ID,
        previewCss(".abicsAccessibilityPopover .saPreviewFont .saPreviewFontSample.sapMText", {
            fontSize: oSettingsModel.getProperty("/typoFontSize"),
            zoom: oSettingsModel.getProperty("/typoZoom"),
            lineHeight: oSettingsModel.getProperty("/typoLineHeight"),
            wordSpacing: oSettingsModel.getProperty("/typoWordSpacing"),
            letterSpacing: oSettingsModel.getProperty("/typoLetterSpacing"),
            align: oSettingsModel.getProperty("/typoAlign")
        })
    );
};

const syncPressed = (oSource, bPressed) => {
    if (oSource && typeof oSource.setPressed === "function") oSource.setPressed(!!bPressed);
};

const SWATCH_STYLE_ID = "ui5-smart-access-contrast-swatches";

export const DETAIL_PAGES = {
    font: { pageId: "saPageFont", panelId: "fontSizePanel", titleKey: "fontSize.title" },
    readingGuide: { pageId: "saPageReadingGuide", panelId: "readingGuidePanel", titleKey: "readingGuide.title" },
    bigCursor: { pageId: "saPageBigCursor", panelId: "bigCursorPanel", titleKey: "bigCursor.title" },
    tts: { pageId: "saPageTts", panelId: "ttsPanel", titleKey: "tts.title" },
    colorBlindness: { pageId: "saPageColorBlindness", panelId: "colorBlindnessPanel", titleKey: "colorBlindness.title" },
    blueLightFilter: { pageId: "saPageBlueLightFilter", panelId: "blueLightFilterPanel", titleKey: "blueFilter.title" },
    contrast: { pageId: "saPageContrast", panelId: "contrastModePanel", titleKey: "contrastMode.title" }
};

export const INFO_PAGES = {
    shortcuts: { pageId: "saPageShortcuts", titleKey: "shortcuts.title", returnFocusId: "shortcutsButton" }
};

const navPageFor = (key) => DETAIL_PAGES[key] || INFO_PAGES[key] || null;

export const RESET_UNDO_MS = 5000;

export const RESET_SNAPSHOT_KEYS = [
    "fontStep", "typoZoom", "typoFontSize", "typoLineHeight", "typoWordSpacing", "typoLetterSpacing", "typoAlign",
    "ttsRate", "ttsVolume", "ttsHover",
    "colorBlindnessType", "colorBlindnessIntensity",
    "blueLightFilterLevel", "blueLightFilterActive",
    "nightModeActive", "toggleImagesActive",
    "contrastModeActive", "contrastTheme", "contrastBgColor", "contrastTextColor", "contrastUnderlineLinks",
    "textSpacingLevel", "readingGuideMode", "bigCursorColor", "bigCursorCustomColor",
    "highlightLinksActive", "stopAnimationsActive",
    "profileId", "profileSnapshot"
];

const FOCUSABLE = "[tabindex='0'], button:not([disabled]), input:not([disabled]), select:not([disabled])";

const scrollContainerOf = (oPopover) => {
    const dom = oPopover && oPopover.getDomRef && oPopover.getDomRef();
    if (!dom) return null;
    return dom.querySelector(".sapMPopoverCont, .sapMDialogSection");
};

// The object passed as `controller` to Fragment.load for the popover.
// `this` inside each handler refers to this object and carries runtime
// refs `_oPopover` and `_sFragmentId` set by openAccessPopover.
export const popoverInternalController = {

    _byId(sId) {
        return this._sFragmentId ? Fragment.byId(this._sFragmentId, sId) : null;
    },
    getCurrentPageKey() {
        return oSettingsModel.getProperty("/navPage") || "main";
    },
    onNavToDetail(oEvent) {
        this.navToDetail(oEvent.getSource().data("page"));
    },
    onShowShortcuts() {
        this.navToDetail("shortcuts");
    },
    fmtShortcutTitle(titleKey) {
        return titleKey ? getText(titleKey) : "";
    },
    fmtShortcutKeys(code) {
        return code ? shortcutKeys(code) : "";
    },
    navToDetail(key) {
        const page = navPageFor(key);
        const nav = this._byId("saNav");
        const target = page && this._byId(page.pageId);
        if (!nav || !target) return;
        hideHint();
        if (this.isResetUndoOpen()) this._closeResetUndo(false);
        if (this.getCurrentPageKey() === "main") {
            const scroller = scrollContainerOf(this._oPopover);
            this._mainScrollTop = scroller ? scroller.scrollTop : 0;
        }
        if (key === "contrast") this._prepareContrastPage();
        if (key === "font") updateFontPreview();
        this._navOrigin = key;
        oSettingsModel.setProperty("/navTitle", getText(page.titleKey));
        oSettingsModel.setProperty("/navPage", key);
        if (nav.getCurrentPage() !== target) nav.to(target);
    },
    onNavBack() {
        this.navToMain();
    },
    navToMain(bInstant) {
        const nav = this._byId("saNav");
        oSettingsModel.setProperty("/navPage", "main");
        if (!nav) return;
        const main = this._byId("saMainPage");
        if (nav.getCurrentPage() === main) return;
        if (bInstant) {
            this._navOrigin = null;
            this._mainScrollTop = 0;
        }
        nav.backToTop();
    },
    onNavigate() {
        hideHint();
        const scroller = scrollContainerOf(this._oPopover);
        if (scroller) scroller.scrollTop = 0;
    },
    onAfterNavigate(oEvent) {
        const to = oEvent.getParameter("to");
        const toMain = to === this._byId("saMainPage");
        let target = null;
        if (toMain) {
            const scroller = scrollContainerOf(this._oPopover);
            if (scroller) scroller.scrollTop = this._mainScrollTop || 0;
            const page = this._navOrigin && navPageFor(this._navOrigin);
            this._navOrigin = null;
            if (page && page.panelId) {
                const panel = this._byId(page.panelId);
                target = panel && panel.getHeaderToolbar && panel.getHeaderToolbar();
            } else if (page && page.returnFocusId) {
                target = this._byId(page.returnFocusId);
            }
        } else {
            if (this.getCurrentPageKey() === "contrast") updateContrastPreview();
            if (this.getCurrentPageKey() === "font") updateFontPreview();
            const dom = to && to.getDomRef();
            target = dom && dom.querySelector(FOCUSABLE);
        }
        if (!target) return;
        setTimeout(() => {
            if (this._oPopover && this._oPopover.isOpen()) target.focus();
        }, 0);
    },

    // ---- Blue light filter ----
    onBlueLightFilterSwitch(oEvent) {
        const on = oEvent.getParameter("state");
        if (on) {
            if (!(oSettingsModel.getProperty("/blueLightFilterLevel") > 0)) {
                oSettingsModel.setProperty("/blueLightFilterLevel", 50);
            }
            enableBlueLightFilter(oSettingsModel.getProperty("/blueLightFilterLevel"));
        } else {
            disableBlueLightFilter();
        }
        oSettingsModel.setProperty("/blueLightFilterActive", on);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", on);
        saveCurrentSettings();
        announce(getText(on ? "announce.blueFilterOn" : "announce.blueFilterOff"));
    },
    _setBlueLightFilterLevel(level) {
        const v = Math.max(0, Math.min(100, Math.round(level)));
        oSettingsModel.setProperty("/blueLightFilterLevel", v);
        if (v > 0) enableBlueLightFilter(v); else disableBlueLightFilter();
        oSettingsModel.setProperty("/blueLightFilterActive", v > 0);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", v > 0);
        saveCurrentSettings();
    },
    onBlueLightFilterSliderChange(e) {
        this._setBlueLightFilterLevel(e.getParameter("value"));
    },
    onBlueLightFilterPreset(oEvent) {
        const src = oEvent.getSource();
        this._setBlueLightFilterLevel(Number(src.data("value")));
        syncPressed(src, true);
    },
    _resetBlueLightFilter() {
        disableBlueLightFilter();
        oSettingsModel.setProperty("/blueLightFilterLevel", 50);
        oSettingsModel.setProperty("/blueLightFilterActive", false);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", false);
        saveCurrentSettings();
    },

    _toggleFeatures: {
        nightMode: { path: "/nightModeActive", set: "setNightMode" },
        highlightLinks: { path: "/highlightLinksActive", set: "setHighlightLinks" },
        stopAnimations: { path: "/stopAnimationsActive", set: "setStopAnimations" },
        toggleImages: { path: "/toggleImagesActive", set: "setImagesHidden" }
    },
    setFeature(key, on) {
        const f = this._toggleFeatures[key];
        if (!f) return;
        this[f.set](!!on);
    },
    toggleFeature(key) {
        const f = this._toggleFeatures[key];
        if (!f) return;
        this.setFeature(key, !oSettingsModel.getProperty(f.path));
    },
    onFeatureRowPress(oEvent) {
        const src = oEvent.getParameter && oEvent.getParameter("srcControl");
        if (src && typeof src.isA === "function" && src.isA("sap.m.Switch")) return;
        this.toggleFeature(oEvent.getSource().data("feature"));
    },
    onFeatureSwitchChange(oEvent) {
        this.setFeature(oEvent.getSource().data("feature"), oEvent.getParameter("state"));
    },

    // ---- Night mode ----
    setNightMode(on) {
        if (on === isNightModeActive()) {
            oSettingsModel.setProperty("/nightModeActive", on);
            return;
        }
        // Night mode and the native high-contrast themes both own the UI5 theme,
        // so they are mutually exclusive: turning night mode on clears any active
        // HC theme first (and its contrast row state).
        if (on) this._clearHighContrastTheme();
        const active = toggleNightMode();
        oSettingsModel.setProperty("/nightModeActive", active);
        toggleActiveFeatureClass.call(this, "nightModePanel", active);
        saveCurrentSettings();
        announce(getText(active ? "announce.nightModeOn" : "announce.nightModeOff"));
    },
    onNightModeToolbarPress() {
        this.toggleFeature("nightMode");
    },

    // Turns off a native HC theme (if any) and resets the contrast row's state.
    // Shared by night mode (mutual exclusivity) and the custom-contrast path.
    _clearHighContrastTheme() {
        if (!oSettingsModel.getProperty("/contrastTheme")) return;
        disableHighContrastTheme();
        oSettingsModel.setProperty("/contrastTheme", "");
        oSettingsModel.setProperty("/contrastModeActive", false);
        toggleActiveFeatureClass.call(this, "contrastModePanel", false);
    },

    // ---- Toggle images ----
    setImagesHidden(on) {
        if (on === areImagesHidden()) {
            oSettingsModel.setProperty("/toggleImagesActive", on);
            return;
        }
        const active = toggleImages();
        oSettingsModel.setProperty("/toggleImagesActive", active);
        toggleActiveFeatureClass.call(this, "toggleImagesPanel", active);
        announce(getText(active ? "announce.imagesHidden" : "announce.imagesShown"));
    },
    onToggleImagesToolbarPress() {
        this.toggleFeature("toggleImages");
    },

    // ---- Contrast mode ----
    _prepareContrastPage() {
        const theme = oSettingsModel.getProperty("/contrastTheme") || "";
        const active = !!oSettingsModel.getProperty("/contrastModeActive");
        const bg = oSettingsModel.getProperty("/contrastBgColor");
        const text = oSettingsModel.getProperty("/contrastTextColor");
        const scheme = !theme && active ? findSchemeId(bg, text) : "off";
        this._contrastSnapshot = {
            bg,
            text,
            underline: oSettingsModel.getProperty("/contrastUnderlineLinks"),
            active,
            theme
        };
        oSettingsModel.setProperty("/contrastScheme", scheme);
        oSettingsModel.setProperty("/contrastCustomOpen", scheme === "custom");
        injectStyle(SWATCH_STYLE_ID, buildSwatchCss(".abicsAccessibilityPopover"));
        updateContrastPreview();
        prefetchHighContrastThemes();
    },
    _setContrastTheme(variant) {
        if (variant === "hcb" || variant === "hcw") {
            if (oSettingsModel.getProperty("/nightModeActive")) {
                disableNightMode();
                oSettingsModel.setProperty("/nightModeActive", false);
                toggleActiveFeatureClass.call(this, "nightModePanel", false);
            }
            removeCustomContrast();
            applyHighContrastTheme(variant);
            oSettingsModel.setProperty("/contrastTheme", variant);
            oSettingsModel.setProperty("/contrastModeActive", true);
            oSettingsModel.setProperty("/contrastScheme", "off");
            toggleActiveFeatureClass.call(this, "contrastModePanel", true);
            announce(getText(variant === "hcb" ? "announce.contrastHcb" : "announce.contrastHcw"));
        } else {
            if (!oSettingsModel.getProperty("/contrastTheme")) return;
            disableHighContrastTheme();
            oSettingsModel.setProperty("/contrastTheme", "");
            oSettingsModel.setProperty("/contrastModeActive", false);
            toggleActiveFeatureClass.call(this, "contrastModePanel", false);
            announce(getText("announce.contrastOff"));
        }
        saveCurrentSettings();
        updateContrastPreview();
    },
    onContrastThemeSelect(oEvent) {
        const item = oEvent.getParameter("item");
        const key = item ? item.getKey() : oEvent.getParameter("key");
        this._setContrastTheme(key);
    },
    _selectContrastScheme(id) {
        if (id !== "off" && oSettingsModel.getProperty("/contrastTheme")) this._setContrastTheme("std");
        oSettingsModel.setProperty("/contrastScheme", id);
        if (id === "custom") {
            oSettingsModel.setProperty("/contrastCustomOpen", true);
        } else if (id !== "off") {
            const hit = (oSettingsModel.getProperty("/contrastSchemes") || []).find((s) => s.id === id);
            if (hit) {
                oSettingsModel.setProperty("/contrastBgColor", hit.bg);
                oSettingsModel.setProperty("/contrastTextColor", hit.text);
            }
        }
        updateContrastPreview();
    },
    onContrastSchemeSelect(oEvent) {
        const src = oEvent.getSource();
        const ctx = src.getBindingContext("settings");
        if (!ctx) return;
        this._selectContrastScheme(ctx.getProperty("id"));
        syncPressed(src, true);
    },
    _pickContrastColor(path, color) {
        if (oSettingsModel.getProperty("/contrastTheme")) this._setContrastTheme("std");
        oSettingsModel.setProperty(path, color);
        oSettingsModel.setProperty("/contrastScheme", "custom");
        updateContrastPreview();
    },
    onContrastBgSelect(oEvent) {
        const src = oEvent.getSource();
        const ctx = src.getBindingContext("settings");
        if (!ctx) return;
        this._pickContrastColor("/contrastBgColor", ctx.getProperty("color"));
        syncPressed(src, true);
    },
    onContrastTextSelect(oEvent) {
        const src = oEvent.getSource();
        const ctx = src.getBindingContext("settings");
        if (!ctx) return;
        this._pickContrastColor("/contrastTextColor", ctx.getProperty("color"));
        syncPressed(src, true);
    },
    _openContrastColorPicker(oOpener, path) {
        this._contrastColorPath = path;
        sap.ui.require(["sap/ui/unified/ColorPickerPopover"], (ColorPickerPopover) => {
            if (!this._contrastColorPicker) {
                this._contrastColorPicker = new ColorPickerPopover({
                    displayMode: "Simplified",
                    change: (oEvent) => {
                        const hex = pickedHex(oEvent, this._contrastColorPicker);
                        if (hex) this._pickContrastColor(this._contrastColorPath, hex.toLowerCase());
                    }
                });
            }
            this._contrastColorPicker.setColorString(oSettingsModel.getProperty(path));
            this._contrastColorPicker.openBy(oOpener);
        });
    },
    onContrastCustomBg(oEvent) { this._openContrastColorPicker(oEvent.getSource(), "/contrastBgColor"); },
    onContrastCustomText(oEvent) { this._openContrastColorPicker(oEvent.getSource(), "/contrastTextColor"); },
    onUnderlineLinksToggle(oEvent) {
        oSettingsModel.setProperty("/contrastUnderlineLinks", oEvent.getParameter("state"));
        updateContrastPreview();
    },
    onContrastSet() {
        const bg = oSettingsModel.getProperty("/contrastBgColor");
        const text = oSettingsModel.getProperty("/contrastTextColor");
        const scheme = oSettingsModel.getProperty("/contrastScheme") || "off";
        if (oSettingsModel.getProperty("/contrastTheme")) {
            saveCurrentSettings();
            this.navToMain();
            return;
        }
        if (scheme === "off" || !bg || !text) {
            const wasActive = !!oSettingsModel.getProperty("/contrastModeActive");
            removeCustomContrast();
            oSettingsModel.setProperty("/contrastModeActive", false);
            toggleActiveFeatureClass.call(this, "contrastModePanel", false);
            saveCurrentSettings();
            if (wasActive) announce(getText("announce.contrastOff"));
            this.navToMain();
            return;
        }
        disableHighContrastTheme();
        oSettingsModel.setProperty("/contrastTheme", "");
        applyCustomContrast(bg, text, oSettingsModel.getProperty("/contrastUnderlineLinks"));
        oSettingsModel.setProperty("/contrastModeActive", true);
        toggleActiveFeatureClass.call(this, "contrastModePanel", true);
        saveCurrentSettings();
        announce(getText("announce.contrastOn"));
        this.navToMain();
    },
    onContrastCancel() {
        const s = this._contrastSnapshot;
        if (s) {
            oSettingsModel.setProperty("/contrastBgColor", s.bg);
            oSettingsModel.setProperty("/contrastTextColor", s.text);
            oSettingsModel.setProperty("/contrastUnderlineLinks", s.underline);
            oSettingsModel.setProperty("/contrastTheme", s.theme || "");
            if (s.theme) {
                removeCustomContrast();
                applyHighContrastTheme(s.theme);
            } else if (s.active) {
                disableHighContrastTheme();
                applyCustomContrast(s.bg, s.text, s.underline);
            } else {
                disableHighContrastTheme();
                removeCustomContrast();
            }
            oSettingsModel.setProperty("/contrastModeActive", !!s.active);
            toggleActiveFeatureClass.call(this, "contrastModePanel", !!s.active);
            saveCurrentSettings();
            updateContrastPreview();
        }
        this.navToMain();
    },
    onContrastReset() {
        // Turn contrast off and restore the default (normal) white/black pair.
        removeCustomContrast();
        disableHighContrastTheme();
        oSettingsModel.setProperty("/contrastTheme", "");
        oSettingsModel.setProperty("/contrastModeActive", false);
        oSettingsModel.setProperty("/contrastBgColor", "#ffffff");
        oSettingsModel.setProperty("/contrastTextColor", "#000000");
        oSettingsModel.setProperty("/contrastUnderlineLinks", true);
        oSettingsModel.setProperty("/contrastScheme", "off");
        oSettingsModel.setProperty("/contrastCustomOpen", false);
        toggleActiveFeatureClass.call(this, "contrastModePanel", false);
        updateContrastPreview();
        saveCurrentSettings();
        announce(getText("announce.contrastOff"));
    },

    // ---- Font size ----
    onIncreaseFontSize() {
        increaseFontSize();
        toggleActiveFeatureClass.call(this, "fontSizePanel", oSettingsModel.getProperty("/fontStep") !== 0);
        saveCurrentSettings();
        announce(getText("announce.fontIncreased"));
    },
    onDecreaseFontSize() {
        decreaseFontSize();
        toggleActiveFeatureClass.call(this, "fontSizePanel", oSettingsModel.getProperty("/fontStep") !== 0);
        saveCurrentSettings();
        announce(getText("announce.fontDecreased"));
    },
    onResetFontSize() {
        resetFontSize();
        toggleActiveFeatureClass.call(this, "fontSizePanel", false);
        saveCurrentSettings();
        announce(getText("announce.fontReset"));
    },

    // ---- Text to speech ----
    onTTSStart() {
        startReading();
        toggleActiveFeatureClass.call(this, "ttsPanel", true);
    },
    // Play/pause toggle: start when stopped, pause when playing, resume when
    // paused (resumes from where it left off, not from the start).
    onTTSPlayPause() {
        if (isReadingActive() && !isReadingPaused()) {
            pauseReading();
        } else if (isReadingActive() && isReadingPaused()) {
            resumeReading();
        } else {
            startReading();
        }
        toggleActiveFeatureClass.call(this, "ttsPanel", isReadingActive());
    },
    onTTSPrev() {
        skipPrev();
        toggleActiveFeatureClass.call(this, "ttsPanel", isReadingActive());
    },
    onTTSNext() {
        skipNext();
        toggleActiveFeatureClass.call(this, "ttsPanel", isReadingActive());
    },
    onTTSStop() {
        stopReading();
        toggleActiveFeatureClass.call(this, "ttsPanel", oSettingsModel.getProperty("/ttsHover") === true);
    },
    onTTSRateChange(e) {
        setTTSRate(e.getParameter("value"));
        saveCurrentSettings();
    },
    onTTSVolumeChange(e) {
        setTTSVolume(e.getParameter("value"));
        saveCurrentSettings();
    },
    formatTtsRate(v) {
        const rate = v == null ? 1 : Number(v);
        if (rate === 1) return getText("tts.normal");
        return String(Math.round(rate * 100) / 100) + "\u00d7";
    },
    formatTtsVolume(v) {
        return getText("status.percent", [Math.round((v == null ? 1 : v) * 100)]);
    },
    formatPercent(v) {
        return getText("status.percent", [Math.round(Number(v) || 0)]);
    },
    formatPlusPercent(v) {
        return "+" + getText("status.percent", [Math.round(Number(v) || 0)]);
    },
    onTtsRatePreset(oEvent) {
        const src = oEvent.getSource();
        const v = Number(src.data("value"));
        oSettingsModel.setProperty("/ttsRate", v);
        setTTSRate(v);
        saveCurrentSettings();
        syncPressed(src, true);
    },
    onTtsSample() {
        speakSample(getText("detail.sample"));
    },
    _resetTts() {
        stopReading();
        oSettingsModel.setProperty("/ttsRate", 1);
        oSettingsModel.setProperty("/ttsVolume", 1);
        setTTSRate(1);
        setTTSVolume(1);
        if (oSettingsModel.getProperty("/ttsHover")) {
            oSettingsModel.setProperty("/ttsHover", false);
            disableHoverRead();
        }
        toggleActiveFeatureClass.call(this, "ttsPanel", false);
        saveCurrentSettings();
    },
    onTTSHoverChange(e) {
        const active = e.getParameter("state");
        oSettingsModel.setProperty("/ttsHover", active);
        if (active) enableHoverRead(); else disableHoverRead();
        toggleActiveFeatureClass.call(this, "ttsPanel", active);
    },

    // ---- Text spacing (WCAG 1.4.12) ----
    onTextSpacingToolbarPress() {
        oSettingsModel.setProperty("/textSpacingExpanded", !oSettingsModel.getProperty("/textSpacingExpanded"));
    },
    onTextSpacingChange(e) {
        const level = e.getParameter("selectedItem").getKey();
        oSettingsModel.setProperty("/textSpacingLevel", level);
        applyTextSpacing(level);
        toggleActiveFeatureClass.call(this, "textSpacingPanel", level !== "none");
        saveCurrentSettings();
    },
    onTextSpacingReset() {
        oSettingsModel.setProperty("/textSpacingLevel", "none");
        resetTextSpacing();
        toggleActiveFeatureClass.call(this, "textSpacingPanel", false);
        saveCurrentSettings();
    },

    // ---- Reading aid (guide / mask) ----
    _setReadingGuideMode(mode) {
        oSettingsModel.setProperty("/readingGuideMode", mode);
        setReadingGuide(mode);
        toggleActiveFeatureClass.call(this, "readingGuidePanel", mode !== "none");
        saveCurrentSettings();
    },
    onReadingGuideSelect(e) {
        const item = e.getParameter("item");
        if (item) this._setReadingGuideMode(item.getKey());
    },

    // ---- Big cursor (selectable colours + custom) ----
    _openBigCursorColorPicker(oOpener) {
        sap.ui.require(["sap/ui/unified/ColorPickerPopover"], (ColorPickerPopover) => {
            if (!this._bigCursorColorPicker) {
                this._bigCursorColorPicker = new ColorPickerPopover({
                    displayMode: "Simplified",
                    change: (oEvent) => {
                        const hex = pickedHex(oEvent, this._bigCursorColorPicker);
                        oSettingsModel.setProperty("/bigCursorCustomColor", hex);
                        oSettingsModel.setProperty("/bigCursorColor", "custom");
                        setBigCursorCustom(hex);
                        toggleActiveFeatureClass.call(this, "bigCursorPanel", true);
                        saveCurrentSettings();
                    }
                });
            }
            this._bigCursorColorPicker.setColorString(oSettingsModel.getProperty("/bigCursorCustomColor"));
            this._bigCursorColorPicker.openBy(oOpener);
        });
    },
    onBigCursorSelect(oEvent) {
        const ctx = oEvent.getSource().getBindingContext("settings");
        const key = ctx ? ctx.getProperty("key") : oEvent.getSource().data("cursor");
        // The custom (rainbow) chip always opens the colour picker.
        if (key === "custom") {
            syncPressed(oEvent.getSource(), oSettingsModel.getProperty("/bigCursorColor") === "custom");
            this._openBigCursorColorPicker(oEvent.getSource());
            return;
        }
        const current = oSettingsModel.getProperty("/bigCursorColor");
        // Clicking the active colour again turns the big cursor off.
        const next = current === key ? "none" : key;
        oSettingsModel.setProperty("/bigCursorColor", next);
        if (next === "none") disableBigCursor(); else setBigCursor(next);
        toggleActiveFeatureClass.call(this, "bigCursorPanel", next !== "none");
        saveCurrentSettings();
    },
    onBigCursorOff(oEvent) {
        this._resetBigCursor();
        syncPressed(oEvent && oEvent.getSource(), true);
    },
    _resetBigCursor() {
        oSettingsModel.setProperty("/bigCursorColor", "none");
        disableBigCursor();
        toggleActiveFeatureClass.call(this, "bigCursorPanel", false);
        saveCurrentSettings();
    },
    fmtBigCursorPreview: bigCursorPreviewSrc,

    // ---- Highlight links + focus ----
    setHighlightLinks(active) {
        oSettingsModel.setProperty("/highlightLinksActive", active);
        if (active) enableHighlightLinks(); else disableHighlightLinks();
        toggleActiveFeatureClass.call(this, "highlightLinksPanel", active);
        saveCurrentSettings();
        announce(getText(active ? "announce.highlightLinksOn" : "announce.highlightLinksOff"));
    },
    onHighlightLinksToolbarPress() {
        this.toggleFeature("highlightLinks");
    },

    // ---- Stop animations (WCAG 2.2.2) ----
    setStopAnimations(active) {
        oSettingsModel.setProperty("/stopAnimationsActive", active);
        if (active) enableStopAnimations(); else disableStopAnimations();
        toggleActiveFeatureClass.call(this, "stopAnimationsPanel", active);
        saveCurrentSettings();
        announce(getText(active ? "announce.animationsStopped" : "announce.animationsStarted"));
    },
    onStopAnimationsToolbarPress() {
        this.toggleFeature("stopAnimations");
    },

    // ---- Color blindness (mode cards + intensity) ----
    onColorBlindnessSelect(e) {
        const ctx = e.getSource().getBindingContext("settings");
        if (!ctx) return;
        const key = ctx.getObject().key;
        const current = oSettingsModel.getProperty("/colorBlindnessType");
        // Clicking the active card again turns the correction off.
        const next = current === key ? "none" : key;
        oSettingsModel.setProperty("/colorBlindnessType", next);
        applyColorBlindness(next, oSettingsModel.getProperty("/colorBlindnessIntensity"));
        toggleActiveFeatureClass.call(this, "colorBlindnessPanel", next !== "none");
        saveCurrentSettings();
    },
    onColorBlindnessIntensityChange(e) {
        const value = e.getParameter("value");
        oSettingsModel.setProperty("/colorBlindnessIntensity", value);
        applyColorBlindness(oSettingsModel.getProperty("/colorBlindnessType"), value);
        saveCurrentSettings();
    },
    _resetColorBlindness() {
        oSettingsModel.setProperty("/colorBlindnessType", "none");
        oSettingsModel.setProperty("/colorBlindnessIntensity", 100);
        applyColorBlindness("none", 100);
        toggleActiveFeatureClass.call(this, "colorBlindnessPanel", false);
        saveCurrentSettings();
    },

    // ---- Font (typography) ----
    _typoMap: {
        zoom: { path: "/typoZoom", set: setTypoZoom, min: 50, max: 200, step: 5 },
        fontSize: { path: "/typoFontSize", set: setTypoFontSize, min: 50, max: 200, step: 5 },
        lineHeight: { path: "/typoLineHeight", set: setTypoLineHeight, min: 0, max: 100, step: 5 },
        wordSpacing: { path: "/typoWordSpacing", set: setTypoWordSpacing, min: 0, max: 100, step: 5 },
        letterSpacing: { path: "/typoLetterSpacing", set: setTypoLetterSpacing, min: 0, max: 100, step: 5 }
    },
    _setTypo(prop, value) {
        const m = this._typoMap[prop];
        if (!m) return false;
        const v = Math.max(m.min, Math.min(m.max, Math.round(Number(value))));
        if (!Number.isFinite(v)) return false;
        oSettingsModel.setProperty(m.path, v);
        m.set(v);
        updateFontPreview();
        return true;
    },
    _applyTypo(prop, value) {
        if (this._setTypo(prop, value)) this._afterTypoChange();
    },
    _stepTypo(prop, dir) {
        const m = this._typoMap[prop];
        if (!m) return;
        this._applyTypo(prop, oSettingsModel.getProperty(m.path) + dir * m.step);
    },
    _afterTypoChange() {
        toggleActiveFeatureClass.call(this, "fontSizePanel", isTypographyActive());
        saveCurrentSettings();
    },
    onTypoSliderChange(e) {
        this._applyTypo(e.getSource().data("typo"), e.getParameter("value"));
    },
    onTypoSliderLive(e) {
        this._setTypo(e.getSource().data("typo"), e.getParameter("value"));
    },
    onTypoDec(e) {
        this._stepTypo(e.getSource().data("typo"), -1);
    },
    onTypoInc(e) {
        this._stepTypo(e.getSource().data("typo"), 1);
    },
    onFontSizePreset(oEvent) {
        const src = oEvent.getSource();
        this._applyTypo("fontSize", Number(src.data("value")));
        syncPressed(src, true);
    },
    _setTypoAlign(align) {
        const v = align || "none";
        oSettingsModel.setProperty("/typoAlign", v);
        setTypoAlign(v);
        updateFontPreview();
        this._afterTypoChange();
    },
    onTypoAlignChange(e) {
        const item = e.getParameter("item");
        if (item) this._setTypoAlign(item.getKey());
    },
    _resetTypography() {
        Object.keys(this._typoMap).forEach((prop) => {
            const m = this._typoMap[prop];
            const v = prop === "zoom" || prop === "fontSize" ? 100 : 0;
            oSettingsModel.setProperty(m.path, v);
            m.set(v);
        });
        this._setTypoAlign("none");
    },

    _detailResetters: {
        font: "_resetTypography",
        readingGuide: "_resetReadingGuide",
        bigCursor: "_resetBigCursor",
        tts: "_resetTts",
        colorBlindness: "_resetColorBlindness",
        blueLightFilter: "_resetBlueLightFilter",
        contrast: "onContrastReset"
    },
    _resetReadingGuide() {
        this._setReadingGuideMode("none");
    },
    resetDetail(key) {
        const fn = this._detailResetters[key];
        if (!fn) return false;
        this[fn]();
        if (key !== "contrast") announce(getText("announce.detailReset"));
        return true;
    },
    onDetailReset() {
        this.resetDetail(this.getCurrentPageKey());
    },
    onDetailDone() {
        this.navToMain();
    },
    fmtDetailCanReset(navPage) {
        return !isDetailAtDefault(navPage, (path) => oSettingsModel.getProperty(path));
    },

    fmtFontStatus: fontStatus,
    fmtReadingGuideStatus: readingGuideStatus,
    fmtBigCursorStatus: bigCursorStatus,
    fmtTtsStatus: ttsStatus,
    fmtColorBlindnessStatus: colorBlindnessStatus,
    fmtBlueLightFilterStatus: blueLightFilterStatus,
    fmtContrastStatus: contrastStatus,
    fmtI18n(key) {
        return key ? getText(key) : "";
    },
    fmtSchemeRatio(id, ratio, level) {
        if (id === "off") return getText("contrast.schemeOffHint");
        if (id === "custom") return getText("contrast.schemeCustomHint");
        return ratio ? ratio + " · " + getText("contrast.levelShort." + level) : "";
    },
    fmtSchemeTooltip(labelKey, ratio, level) {
        const label = labelKey ? getText(labelKey) : "";
        if (!ratio) return label;
        return getText("contrast.schemeTooltip", [label, ratio, getText("contrast.level." + level)]);
    },
    fmtToggleStatus: toggleStatus,

    // ---- Profiles ----
    _readSetting(key) {
        return oSettingsModel.getProperty("/" + key);
    },
    refreshProfiles() {
        oSettingsModel.setProperty("/profileActive", activeProfileMap((k) => this._readSetting(k)));
    },
    initProfiles() {
        if (!this._profileBindings && typeof oSettingsModel.bindProperty === "function") {
            const refresh = () => this.refreshProfiles();
            this._profileBindings = WATCHED_PATHS.map((p) => {
                const oBinding = oSettingsModel.bindProperty("/" + p);
                oBinding.attachChange(refresh);
                return oBinding;
            });
        }
        this.refreshProfiles();
    },
    _typoSettingProps: {
        typoZoom: "zoom",
        typoFontSize: "fontSize",
        typoLineHeight: "lineHeight",
        typoWordSpacing: "wordSpacing",
        typoLetterSpacing: "letterSpacing"
    },
    _applyContrastValues(values) {
        const pick = (k) => (Object.prototype.hasOwnProperty.call(values, k) ? values[k] : this._readSetting(k));
        ["contrastBgColor", "contrastTextColor", "contrastUnderlineLinks"].forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(values, k)) oSettingsModel.setProperty("/" + k, values[k]);
        });
        const theme = values.contrastTheme;
        if (theme === "hcb" || theme === "hcw") {
            this._setContrastTheme(theme);
            return;
        }
        disableHighContrastTheme();
        oSettingsModel.setProperty("/contrastTheme", "");
        const bg = pick("contrastBgColor");
        const text = pick("contrastTextColor");
        const active = !!pick("contrastModeActive") && !!bg && !!text;
        if (active) {
            applyCustomContrast(bg, text, pick("contrastUnderlineLinks"));
            oSettingsModel.setProperty("/contrastRatio", getContrastRatio(bg, text).ratioText);
        } else {
            removeCustomContrast();
        }
        oSettingsModel.setProperty("/contrastModeActive", active);
        toggleActiveFeatureClass.call(this, "contrastModePanel", active);
    },
    _applySettingValues(values) {
        const has = (k) => Object.prototype.hasOwnProperty.call(values, k);
        let typo = false;
        Object.keys(this._typoSettingProps).forEach((k) => {
            if (has(k) && this._setTypo(this._typoSettingProps[k], values[k])) typo = true;
        });
        if (has("typoAlign")) {
            const align = values.typoAlign || "none";
            oSettingsModel.setProperty("/typoAlign", align);
            setTypoAlign(align);
            updateFontPreview();
            typo = true;
        }
        if (typo) this._afterTypoChange();
        if (has("contrastTheme")) this._applyContrastValues(values);
        if (has("nightModeActive")) this.setNightMode(!!values.nightModeActive);
        if (has("highlightLinksActive") && !!values.highlightLinksActive !== !!this._readSetting("highlightLinksActive")) {
            this.setHighlightLinks(!!values.highlightLinksActive);
        }
        if (has("stopAnimationsActive") && !!values.stopAnimationsActive !== !!this._readSetting("stopAnimationsActive")) {
            this.setStopAnimations(!!values.stopAnimationsActive);
        }
        if (has("bigCursorCustomColor")) oSettingsModel.setProperty("/bigCursorCustomColor", values.bigCursorCustomColor);
        if (has("bigCursorColor")) {
            const color = values.bigCursorColor || "none";
            oSettingsModel.setProperty("/bigCursorColor", color);
            if (color === "none") disableBigCursor();
            else if (color === "custom") setBigCursorCustom(this._readSetting("bigCursorCustomColor"));
            else setBigCursor(color);
            toggleActiveFeatureClass.call(this, "bigCursorPanel", color !== "none");
        }
        if (has("readingGuideMode")) this._setReadingGuideMode(values.readingGuideMode || "none");
        if (has("colorBlindnessType") || has("colorBlindnessIntensity")) {
            if (has("colorBlindnessType")) oSettingsModel.setProperty("/colorBlindnessType", values.colorBlindnessType || "none");
            if (has("colorBlindnessIntensity")) oSettingsModel.setProperty("/colorBlindnessIntensity", values.colorBlindnessIntensity);
            const type = this._readSetting("colorBlindnessType");
            applyColorBlindness(type, this._readSetting("colorBlindnessIntensity"));
            toggleActiveFeatureClass.call(this, "colorBlindnessPanel", type !== "none");
        }
        saveCurrentSettings();
        this.refreshProfiles();
    },
    _storedSnapshot(profile) {
        const snap = this._readSetting("profileSnapshot");
        return this._readSetting("profileId") === profile.id && isValidSnapshot(profile, snap) ? snap : null;
    },
    _setProfileRecord(id, snapshot) {
        oSettingsModel.setProperty("/profileId", id);
        oSettingsModel.setProperty("/profileSnapshot", snapshot);
    },
    applyProfile(id) {
        const profile = getProfile(id);
        if (!profile) return false;
        const read = (k) => this._readSetting(k);
        let snapshot = this._storedSnapshot(profile);
        if (!snapshot) {
            const prev = getProfile(this._readSetting("profileId"));
            const prevSnap = prev && this._storedSnapshot(prev);
            if (prevSnap && profileMatches(prev, read)) this._applySettingValues(prevSnap);
            snapshot = takeSnapshot(profile, read);
        }
        this._setProfileRecord(id, snapshot);
        this._applySettingValues(profile.values);
        announce(getText("announce.profileOn", [getText("profile." + id)]), true);
        return true;
    },
    undoProfile(id) {
        const profile = getProfile(id);
        if (!profile) return false;
        const snapshot = this._storedSnapshot(profile) || defaultsFor(profile);
        this._setProfileRecord("", null);
        this._applySettingValues(snapshot);
        announce(getText("announce.profileOff", [getText("profile." + id)]), true);
        return true;
    },
    toggleProfile(id) {
        const profile = getProfile(id);
        if (!profile) return false;
        return profileMatches(profile, (k) => this._readSetting(k)) ? this.undoProfile(id) : this.applyProfile(id);
    },
    onProfilePress(oEvent) {
        const src = oEvent.getSource();
        this.toggleProfile(src.data("profile"));
        const active = oSettingsModel.getProperty("/profileActive") || {};
        syncPressed(src, !!active[src.data("profile")]);
    },

    // ---- Reset all ----
    fmtCanResetAll(...values) {
        return countActiveFeatures(Object.fromEntries(BADGE_PATHS.map((p, i) => [p, values[i]]))) > 0;
    },
    onResetAllToolbarPress() {
        const snapshot = Object.fromEntries(RESET_SNAPSHOT_KEYS.map((k) => [k, this._readSetting(k)]));
        this._resetEverything();
        this._offerResetUndo(snapshot);
    },
    _resetEverything() {
        resetAll();
        oSettingsModel.setProperty("/fontStep", 0);
        oSettingsModel.setProperty("/typoZoom", 100);
        oSettingsModel.setProperty("/typoFontSize", 100);
        oSettingsModel.setProperty("/typoLineHeight", 0);
        oSettingsModel.setProperty("/typoWordSpacing", 0);
        oSettingsModel.setProperty("/typoLetterSpacing", 0);
        oSettingsModel.setProperty("/typoAlign", "none");
        oSettingsModel.setProperty("/ttsRate", 1);
        oSettingsModel.setProperty("/ttsVolume", 1);
        oSettingsModel.setProperty("/ttsHover", false);
        oSettingsModel.setProperty("/colorBlindnessType", 'none');
        oSettingsModel.setProperty("/colorBlindnessIntensity", 100);
        oSettingsModel.setProperty("/blueLightFilterLevel", 50);
        oSettingsModel.setProperty("/blueLightFilterActive", false);
        oSettingsModel.setProperty("/nightModeActive", false);
        oSettingsModel.setProperty("/toggleImagesActive", false);
        oSettingsModel.setProperty("/contrastModeActive", false);
        oSettingsModel.setProperty("/contrastTheme", "");
        oSettingsModel.setProperty("/textSpacingLevel", "none");
        oSettingsModel.setProperty("/readingGuideMode", "none");
        oSettingsModel.setProperty("/bigCursorColor", "none");
        oSettingsModel.setProperty("/highlightLinksActive", false);
        oSettingsModel.setProperty("/stopAnimationsActive", false);
        oSettingsModel.setProperty("/textSpacingExpanded", false);
        this._setProfileRecord("", null);
        disableBigCursor();

        toggleActiveFeatureClass.call(this, "nightModePanel", false);
        toggleActiveFeatureClass.call(this, "toggleImagesPanel", false);
        toggleActiveFeatureClass.call(this, "contrastModePanel", false);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", false);
        toggleActiveFeatureClass.call(this, "textSpacingPanel", false);
        toggleActiveFeatureClass.call(this, "readingGuidePanel", false);
        toggleActiveFeatureClass.call(this, "bigCursorPanel", false);
        toggleActiveFeatureClass.call(this, "highlightLinksPanel", false);
        toggleActiveFeatureClass.call(this, "stopAnimationsPanel", false);
        toggleActiveFeatureClass.call(this, "colorBlindnessPanel", false);
        toggleActiveFeatureClass.call(this, "fontSizePanel", false);
        toggleActiveFeatureClass.call(this, "ttsPanel", false);
        this.refreshProfiles();
        this.navToMain();
        clearAllPrefs();
    },
    _offerResetUndo(snapshot) {
        this._clearUndoClock();
        this._resetUndoSnapshot = snapshot;
        this._undoRemaining = RESET_UNDO_MS;
        this._undoHover = false;
        this._undoKeyboardFocus = false;
        this._wireResetUndoFooter();
        this._watchActivationDuringUndo();
        oSettingsModel.setProperty("/resetUndoOpen", true);
        this._setUndoFooterClass("saUndoPending", true);
        this._setUndoFooterClass("saUndoPaused", false);
        this._startUndoClock();
        announce(getText("announce.resetAll"), true);
        const undo = this._byId("resetUndoButton");
        if (undo && this._oPopover && this._oPopover.isOpen()) {
            setTimeout(() => {
                if (oSettingsModel.getProperty("/resetUndoOpen") && this._oPopover.isOpen()) undo.focus();
            }, 0);
        }
    },
    isResetUndoOpen() {
        return !!oSettingsModel.getProperty("/resetUndoOpen");
    },
    onResetUndo() {
        const snapshot = this._resetUndoSnapshot;
        this._closeResetUndo(false);
        if (!snapshot) return;
        this._restoreResetSnapshot(snapshot);
        announce(getText("announce.resetUndone"), true);
        const reset = this._byId("resetAllButton");
        if (reset && this._oPopover && this._oPopover.isOpen()) {
            setTimeout(() => {
                if (this._oPopover.isOpen()) reset.focus();
            }, 0);
        }
    },
    _restoreResetSnapshot(snap) {
        const step = Number(snap.fontStep) || 0;
        for (let i = 0; i < Math.abs(step); i++) {
            if (step > 0) increaseFontSize(); else decreaseFontSize();
        }
        oSettingsModel.setProperty("/ttsRate", snap.ttsRate);
        oSettingsModel.setProperty("/ttsVolume", snap.ttsVolume);
        setTTSRate(snap.ttsRate);
        setTTSVolume(snap.ttsVolume);
        if (snap.ttsHover) {
            oSettingsModel.setProperty("/ttsHover", true);
            enableHoverRead();
            toggleActiveFeatureClass.call(this, "ttsPanel", true);
        }
        oSettingsModel.setProperty("/blueLightFilterLevel", snap.blueLightFilterLevel);
        if (snap.blueLightFilterActive) {
            enableBlueLightFilter(snap.blueLightFilterLevel);
            oSettingsModel.setProperty("/blueLightFilterActive", true);
            toggleActiveFeatureClass.call(this, "blueLightFilterPanel", true);
        }
        if (snap.textSpacingLevel && snap.textSpacingLevel !== "none") {
            oSettingsModel.setProperty("/textSpacingLevel", snap.textSpacingLevel);
            applyTextSpacing(snap.textSpacingLevel);
            toggleActiveFeatureClass.call(this, "textSpacingPanel", true);
        }
        if (snap.toggleImagesActive) this.setImagesHidden(true);
        this._setProfileRecord(snap.profileId || "", snap.profileSnapshot || null);
        this._applySettingValues({
            typoZoom: snap.typoZoom,
            typoFontSize: snap.typoFontSize,
            typoLineHeight: snap.typoLineHeight,
            typoWordSpacing: snap.typoWordSpacing,
            typoLetterSpacing: snap.typoLetterSpacing,
            typoAlign: snap.typoAlign,
            contrastBgColor: snap.contrastBgColor,
            contrastTextColor: snap.contrastTextColor,
            contrastUnderlineLinks: snap.contrastUnderlineLinks,
            contrastModeActive: snap.contrastModeActive,
            contrastTheme: snap.contrastTheme || "",
            nightModeActive: snap.nightModeActive,
            highlightLinksActive: snap.highlightLinksActive,
            stopAnimationsActive: snap.stopAnimationsActive,
            bigCursorCustomColor: snap.bigCursorCustomColor,
            bigCursorColor: snap.bigCursorColor,
            readingGuideMode: snap.readingGuideMode,
            colorBlindnessType: snap.colorBlindnessType,
            colorBlindnessIntensity: snap.colorBlindnessIntensity
        });
    },
    _closeResetUndo(bMoveFocus) {
        const footer = this._byId("resetAllFooter");
        const dom = footer && footer.getDomRef && footer.getDomRef();
        const hadFocus = !!(bMoveFocus && dom && dom.contains(document.activeElement));
        this._clearUndoClock();
        this._resetUndoSnapshot = null;
        this._undoHover = false;
        this._undoKeyboardFocus = false;
        this._setUndoFooterClass("saUndoPending", false);
        this._setUndoFooterClass("saUndoPaused", false);
        oSettingsModel.setProperty("/resetUndoOpen", false);
        if (hadFocus) this._focusMainStart();
    },
    _focusMainStart() {
        const main = this._byId("saMainPage");
        const dom = main && main.getDomRef && main.getDomRef();
        const target = dom && dom.querySelector(FOCUSABLE);
        if (!target) return;
        setTimeout(() => {
            if (this._oPopover && this._oPopover.isOpen()) target.focus();
        }, 0);
    },
    _expireResetUndo() {
        this._undoTimer = null;
        this._closeResetUndo(true);
    },
    _startUndoClock() {
        if (this._undoTimer || !this._resetUndoSnapshot || this._undoHover || this._undoKeyboardFocus) return;
        this._undoStartedAt = Date.now();
        this._undoTimer = setTimeout(() => this._expireResetUndo(), Math.max(0, this._undoRemaining));
        this._setUndoFooterClass("saUndoPaused", false);
    },
    _pauseUndoClock() {
        if (!this._undoTimer) return;
        clearTimeout(this._undoTimer);
        this._undoTimer = null;
        this._undoRemaining -= Date.now() - this._undoStartedAt;
        this._setUndoFooterClass("saUndoPaused", true);
    },
    _clearUndoClock() {
        if (this._undoTimer) clearTimeout(this._undoTimer);
        this._undoTimer = null;
    },
    _setUndoFooterClass(cls, on) {
        const footer = this._byId("resetAllFooter");
        if (!footer || typeof footer.toggleStyleClass !== "function") return;
        footer.toggleStyleClass(cls, on);
    },
    _setUndoHold(kind, on) {
        if (!this._resetUndoSnapshot) return;
        this[kind] = on;
        if (this._undoHover || this._undoKeyboardFocus) this._pauseUndoClock();
        else this._startUndoClock();
    },
    _watchActivationDuringUndo() {
        if (this._undoBindings || typeof oSettingsModel.bindProperty !== "function") return;
        const check = () => {
            if (!this._resetUndoSnapshot) return;
            const data = Object.fromEntries(BADGE_PATHS.map((p) => [p, oSettingsModel.getProperty("/" + p)]));
            if (countActiveFeatures(data) > 0) this._closeResetUndo(false);
        };
        this._undoBindings = BADGE_PATHS.map((p) => {
            const oBinding = oSettingsModel.bindProperty("/" + p);
            oBinding.attachChange(check);
            return oBinding;
        });
    },
    _wireResetUndoFooter() {
        const footer = this._byId("resetAllFooter");
        if (!footer || footer === this._undoWiredFooter || typeof footer.addEventDelegate !== "function") return;
        this._undoWiredFooter = footer;
        const leaves = (e) => {
            const dom = footer.getDomRef();
            return !(dom && e.relatedTarget && dom.contains(e.relatedTarget));
        };
        footer.addEventDelegate({
            onmouseover: () => this._setUndoHold("_undoHover", true),
            onmouseout: (e) => { if (leaves(e)) this._setUndoHold("_undoHover", false); },
            onfocusin: (e) => {
                const t = e.target;
                const keyboard = !!(t && typeof t.matches === "function" && t.matches(":focus-visible"));
                this._setUndoHold("_undoKeyboardFocus", keyboard);
            },
            onfocusout: (e) => { if (leaves(e)) this._setUndoHold("_undoKeyboardFocus", false); }
        });
    },

    // ---- Close ----
    onPopoverClosePress() {
        if (this._oPopover) this._oPopover.close();
    }
};
