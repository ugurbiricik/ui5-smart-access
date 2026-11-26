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
    disableHoverRead
} from "./textToSpeech.js";
import { applyColorBlindness, resetColorBlindness } from "./colorBlindness.js";
import { enableBlueLightFilter, disableBlueLightFilter } from "./blueLightFilter.js";
import { toggleNightMode, disableNightMode, isNightModeActive } from "./nightMode.js";
import { toggleImages, areImagesHidden } from "./imageHider.js";
import {
    toggleContrastMode,
    applyCustomContrast,
    removeCustomContrast,
    getContrastRatio
} from "./contrast.js";
import {
    applyHighContrastTheme,
    disableHighContrastTheme,
    prefetchHighContrastThemes
} from "./highContrastTheme.js";
import { announce } from "./announcer.js";
import { applyTextSpacing, resetTextSpacing } from "./textSpacing.js";
import { setBigCursor, setBigCursorCustom, disableBigCursor } from "./bigCursor.js";
import { enableHighlightLinks, disableHighlightLinks } from "./highlightLinks.js";
import { enableStopAnimations, disableStopAnimations } from "./stopAnimations.js";
import { setReadingGuide, resetReadingGuide } from "./readingGuide.js";
import {
    setTypoZoom,
    setTypoFontPct,
    setTypoLineHeight,
    setTypoWordSpacing,
    setTypoLetterSpacing,
    setTypoAlign,
    isTypographyActive
} from "./typography.js";
import { resetAll } from "./resetAll.js";
import { getText } from "./i18nModel.js";
import { hideHint } from "./hoverHints.js";

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
const updateContrastPreview = () => {
    const bg = oSettingsModel.getProperty("/contrastBgColor");
    const text = oSettingsModel.getProperty("/contrastTextColor");
    const hasColors = !!(bg && text);
    if (hasColors) {
        const { ratioText, readable } = getContrastRatio(bg, text);
        oSettingsModel.setProperty("/contrastRatio", ratioText);
        oSettingsModel.setProperty(
            "/contrastReadable",
            readable ? getText("contrast.readable") : getText("contrast.notReadable")
        );
    }
    // Live-colour the preview box (empty draft → neutral). Setting inline
    // styles on existing elements is popover-safe (no DOM rebuild).
    const boxes = document.querySelectorAll(".abicsAccessibilityPopover .contrastPreviewBox");
    const texts = document.querySelectorAll(".abicsAccessibilityPopover .contrastPreviewText");
    boxes.forEach((box) => { box.style.backgroundColor = hasColors ? bg : ""; });
    texts.forEach((txt) => { txt.style.color = hasColors ? text : ""; });
};

const CONTRAST_PRESETS = {
    "yellow-black": { bg: "#FFFF00", text: "#000000" },
    "red-black": { bg: "#FF0000", text: "#000000" },
    "green-black": { bg: "#00FF00", text: "#000000" }
};

export const DETAIL_PAGES = {
    font: { pageId: "saPageFont", panelId: "fontSizePanel", titleKey: "fontSize.title" },
    readingGuide: { pageId: "saPageReadingGuide", panelId: "readingGuidePanel", titleKey: "readingGuide.title" },
    bigCursor: { pageId: "saPageBigCursor", panelId: "bigCursorPanel", titleKey: "bigCursor.title" },
    tts: { pageId: "saPageTts", panelId: "ttsPanel", titleKey: "tts.title" },
    colorBlindness: { pageId: "saPageColorBlindness", panelId: "colorBlindnessPanel", titleKey: "colorBlindness.title" },
    blueLightFilter: { pageId: "saPageBlueLightFilter", panelId: "blueLightFilterPanel", titleKey: "blueFilter.title" },
    contrast: { pageId: "saPageContrast", panelId: "contrastModePanel", titleKey: "contrastMode.title" }
};

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
    navToDetail(key) {
        const page = DETAIL_PAGES[key];
        const nav = this._byId("saNav");
        const target = page && this._byId(page.pageId);
        if (!nav || !target) return;
        hideHint();
        if (this.getCurrentPageKey() === "main") {
            const scroller = scrollContainerOf(this._oPopover);
            this._mainScrollTop = scroller ? scroller.scrollTop : 0;
        }
        if (key === "contrast") this._prepareContrastPage();
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
            const page = this._navOrigin && DETAIL_PAGES[this._navOrigin];
            this._navOrigin = null;
            const panel = page && this._byId(page.panelId);
            target = panel && panel.getHeaderToolbar && panel.getHeaderToolbar();
        } else {
            if (this.getCurrentPageKey() === "contrast") updateContrastPreview();
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
            enableBlueLightFilter(oSettingsModel.getProperty("/blueLightFilterLevel"));
        } else {
            disableBlueLightFilter();
        }
        oSettingsModel.setProperty("/blueLightFilterActive", on);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", on);
        saveCurrentSettings();
        announce(getText(on ? "announce.blueFilterOn" : "announce.blueFilterOff"));
    },
    onBlueLightFilterSliderChange(e) {
        const level = e.getParameter("value");
        oSettingsModel.setProperty("/blueLightFilterLevel", level);
        enableBlueLightFilter(level);
        oSettingsModel.setProperty("/blueLightFilterActive", level > 0);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", level > 0);
        saveCurrentSettings();
    },
    onBlueLightFilterReset() {
        // Reset restores the DEFAULT intensity (50%), not zero — the filter
        // stays on at its initial level.
        oSettingsModel.setProperty("/blueLightFilterLevel", 50);
        enableBlueLightFilter(50);
        oSettingsModel.setProperty("/blueLightFilterActive", true);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", true);
        saveCurrentSettings();
    },
    _stepBlueLightFilter(delta) {
        let v = oSettingsModel.getProperty("/blueLightFilterLevel") + delta;
        v = Math.max(0, Math.min(100, v));
        oSettingsModel.setProperty("/blueLightFilterLevel", v);
        enableBlueLightFilter(v);
        oSettingsModel.setProperty("/blueLightFilterActive", v > 0);
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", v > 0);
        saveCurrentSettings();
    },
    onBlueLightFilterDecrease() {
        this._stepBlueLightFilter(-10);
    },
    onBlueLightFilterIncrease() {
        this._stepBlueLightFilter(10);
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
        this._contrastSnapshot = {
            bg: oSettingsModel.getProperty("/contrastBgColor"),
            text: oSettingsModel.getProperty("/contrastTextColor"),
            underline: oSettingsModel.getProperty("/contrastUnderlineLinks"),
            active: oSettingsModel.getProperty("/contrastModeActive"),
            theme: oSettingsModel.getProperty("/contrastTheme")
        };
        prefetchHighContrastThemes();
    },
    // SAP native high-contrast theme (HCB / HCW). Applies immediately (unlike
    // the custom colours, which wait for SET) because it is a single, fixed,
    // WCAG-compliant choice with a live preview being pointless. Mutually
    // exclusive with night mode and with custom-colour contrast.
    onContrastHighContrast(oEvent) {
        const variant = oEvent.getSource().data("variant");
        if (!variant) return;
        // Night mode owns the theme too — turn it off first.
        if (oSettingsModel.getProperty("/nightModeActive")) {
            disableNightMode();
            oSettingsModel.setProperty("/nightModeActive", false);
            toggleActiveFeatureClass.call(this, "nightModePanel", false);
        }
        // Drop any custom-colour CSS contrast so the two don't stack.
        removeCustomContrast();
        applyHighContrastTheme(variant);
        oSettingsModel.setProperty("/contrastTheme", variant);
        oSettingsModel.setProperty("/contrastModeActive", true);
        toggleActiveFeatureClass.call(this, "contrastModePanel", true);
        saveCurrentSettings();
        announce(getText(variant === "hcb" ? "announce.contrastHcb" : "announce.contrastHcw"));
        this.navToMain();
    },
    // Selections update the DRAFT + preview only; the page changes on SET.
    onContrastPresetSelect(oEvent) {
        const ctx = oEvent.getSource().getBindingContext("settings");
        if (!ctx) return;
        oSettingsModel.setProperty("/contrastBgColor", ctx.getProperty("bg"));
        oSettingsModel.setProperty("/contrastTextColor", ctx.getProperty("text"));
        updateContrastPreview();
    },
    onContrastBgSelect(oEvent) {
        const ctx = oEvent.getSource().getBindingContext("settings");
        if (!ctx) return;
        const color = ctx.getProperty("color");
        if (color === "custom") { this._openContrastColorPicker(oEvent.getSource(), "/contrastBgColor"); return; }
        oSettingsModel.setProperty("/contrastBgColor", color);
        updateContrastPreview();
    },
    onContrastTextSelect(oEvent) {
        const ctx = oEvent.getSource().getBindingContext("settings");
        if (!ctx) return;
        const color = ctx.getProperty("color");
        if (color === "custom") { this._openContrastColorPicker(oEvent.getSource(), "/contrastTextColor"); return; }
        oSettingsModel.setProperty("/contrastTextColor", color);
        updateContrastPreview();
    },
    _openContrastColorPicker(oOpener, path) {
        this._contrastColorPath = path;
        sap.ui.require(["sap/ui/unified/ColorPickerPopover"], (ColorPickerPopover) => {
            if (!this._contrastColorPicker) {
                this._contrastColorPicker = new ColorPickerPopover({
                    displayMode: "Simplified",
                    change: (oEvent) => {
                        oSettingsModel.setProperty(this._contrastColorPath, pickedHex(oEvent, this._contrastColorPicker));
                        updateContrastPreview();
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
        // Nothing chosen → just close (don't apply an empty contrast).
        if (!bg || !text) { this.navToMain(); return; }
        // Custom colours and a native HC theme are mutually exclusive.
        disableHighContrastTheme();
        oSettingsModel.setProperty("/contrastTheme", "");
        applyCustomContrast(bg, text, oSettingsModel.getProperty("/contrastUnderlineLinks"));
        oSettingsModel.setProperty("/contrastModeActive", true);
        // Title stays fixed ("Kontrastmodus") — the row opens a config flyout, it
        // is not a plain on/off toggle, so no activate/deactivate flip.
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
    // Value displays: "1.0x" for speed, "100%" for volume.
    formatTtsRate(v) {
        return (v == null ? 1 : v).toFixed(1) + "x";
    },
    formatTtsVolume(v) {
        return Math.round((v == null ? 1 : v) * 100) + "%";
    },
    _ttsMap: {
        rate: { path: "/ttsRate", min: 0.5, max: 2, step: 0.1, set: setTTSRate },
        volume: { path: "/ttsVolume", min: 0, max: 1, step: 0.1, set: setTTSVolume }
    },
    onTtsStep(oEvent) {
        const src = oEvent.getSource();
        const m = this._ttsMap[src.data("tts")];
        if (!m) return;
        const dir = parseInt(src.data("dir"), 10) || 0;
        let v = Math.round((oSettingsModel.getProperty(m.path) + dir * m.step) * 100) / 100;
        v = Math.max(m.min, Math.min(m.max, v));
        oSettingsModel.setProperty(m.path, v);
        m.set(v);
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
    onReadingGuideChange(e) {
        const mode = e.getParameter("selectedItem").getKey();
        oSettingsModel.setProperty("/readingGuideMode", mode);
        setReadingGuide(mode);
        toggleActiveFeatureClass.call(this, "readingGuidePanel", mode !== "none");
        saveCurrentSettings();
    },
    onReadingGuideReset() {
        oSettingsModel.setProperty("/readingGuideMode", "none");
        resetReadingGuide();
        toggleActiveFeatureClass.call(this, "readingGuidePanel", false);
        saveCurrentSettings();
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
        if (key === "custom") { this._openBigCursorColorPicker(oEvent.getSource()); return; }
        const current = oSettingsModel.getProperty("/bigCursorColor");
        // Clicking the active colour again turns the big cursor off.
        const next = current === key ? "none" : key;
        oSettingsModel.setProperty("/bigCursorColor", next);
        if (next === "none") disableBigCursor(); else setBigCursor(next);
        toggleActiveFeatureClass.call(this, "bigCursorPanel", next !== "none");
        saveCurrentSettings();
    },
    onBigCursorReset() {
        oSettingsModel.setProperty("/bigCursorColor", "none");
        disableBigCursor();
        toggleActiveFeatureClass.call(this, "bigCursorPanel", false);
        saveCurrentSettings();
    },

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
    _stepColorBlindnessIntensity(delta) {
        let v = oSettingsModel.getProperty("/colorBlindnessIntensity") + delta;
        v = Math.max(0, Math.min(100, v));
        oSettingsModel.setProperty("/colorBlindnessIntensity", v);
        applyColorBlindness(oSettingsModel.getProperty("/colorBlindnessType"), v);
        saveCurrentSettings();
    },
    onColorBlindnessIntensityDecrease() {
        this._stepColorBlindnessIntensity(-10);
    },
    onColorBlindnessIntensityIncrease() {
        this._stepColorBlindnessIntensity(10);
    },
    onColorBlindnessIntensityReset() {
        oSettingsModel.setProperty("/colorBlindnessIntensity", 100);
        applyColorBlindness(oSettingsModel.getProperty("/colorBlindnessType"), 100);
        saveCurrentSettings();
    },

    // ---- Font (typography) ----
    onFontSizeReset() {
        this._applyTypo("fontPct", 0);
    },

    _typoMap: {
        zoom: { path: "/typoZoom", set: setTypoZoom, min: 50, max: 200, step: 10 },
        fontPct: { path: "/typoFontPct", set: setTypoFontPct, min: -50, max: 100, step: 10 },
        lineHeight: { path: "/typoLineHeight", set: setTypoLineHeight, min: 0, max: 100, step: 10 },
        wordSpacing: { path: "/typoWordSpacing", set: setTypoWordSpacing, min: 0, max: 100, step: 10 },
        letterSpacing: { path: "/typoLetterSpacing", set: setTypoLetterSpacing, min: 0, max: 100, step: 10 }
    },
    _applyTypo(prop, value) {
        const m = this._typoMap[prop];
        if (!m) return;
        const v = Math.max(m.min, Math.min(m.max, value));
        oSettingsModel.setProperty(m.path, v);
        m.set(v);
        this._afterTypoChange();
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
    onTypoDec(e) {
        this._stepTypo(e.getSource().data("typo"), -1);
    },
    onTypoInc(e) {
        this._stepTypo(e.getSource().data("typo"), 1);
    },
    onTypoAlign(e) {
        const align = e.getSource().data("align");
        oSettingsModel.setProperty("/typoAlign", align);
        setTypoAlign(align);
        this._afterTypoChange();
    },

    fmtFontStatus: fontStatus,
    fmtReadingGuideStatus: readingGuideStatus,
    fmtBigCursorStatus: bigCursorStatus,
    fmtTtsStatus: ttsStatus,
    fmtColorBlindnessStatus: colorBlindnessStatus,
    fmtBlueLightFilterStatus: blueLightFilterStatus,
    fmtContrastStatus: contrastStatus,
    fmtToggleStatus: toggleStatus,

    // ---- Reset all ----
    onResetAllToolbarPress() {
        resetAll();
        oSettingsModel.setProperty("/fontStep", 0);
        oSettingsModel.setProperty("/typoZoom", 100);
        oSettingsModel.setProperty("/typoFontPct", 0);
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
        this.navToMain();
        clearAllPrefs();
        announce(getText("announce.resetAll"), true);
    },

    // ---- Close ----
    onPopoverClosePress() {
        if (this._oPopover) this._oPopover.close();
    }
};
