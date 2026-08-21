import { oSettingsModel, saveCurrentSettings, clearAllPrefs } from "./settingsModel.js";
import {
    toggleActiveFeatureClass,
    updateTitleText,
    updateIconSrc,
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
import { toggleNightMode } from "./nightMode.js";
import { toggleImages } from "./imageHider.js";
import {
    toggleContrastMode,
    applyCustomContrast,
    removeCustomContrast,
    getContrastRatio
} from "./contrast.js";
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
    onColorBlindnessToolbarPress() {
        togglePanelExpanded("/colorBlindnessExpanded");
    },

    // Read-aloud opens in the left flyout (grows with player + settings).
    onTTSOpenFlyout(oEvent) {
        oSettingsModel.setProperty("/activeFlyout", "tts");
        oSettingsModel.setProperty("/activeFlyoutTitle", getText("tts.title"));
        oSettingsModel.setProperty("/activeFlyoutIcon", "sap-icon://sound-loud");
        this._openFlyout(oEvent.getSource());
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
    // Row press opens the config flyout directly (no default applied, no inline
    // panel). Colours are chosen there and applied with SET; RESET clears it.
    onContrastModeToolbarPress(oEvent) {
        this.onContrastOpenFlyout(oEvent);
    },
    onContrastOpenFlyout(oEvent) {
        // Snapshot for CANCEL. No forced default — the draft stays as-is (empty
        // = neutral preview) so nothing changes until the user picks a colour.
        this._contrastSnapshot = {
            bg: oSettingsModel.getProperty("/contrastBgColor"),
            text: oSettingsModel.getProperty("/contrastTextColor"),
            underline: oSettingsModel.getProperty("/contrastUnderlineLinks"),
            active: oSettingsModel.getProperty("/contrastModeActive")
        };
        oSettingsModel.setProperty("/activeFlyout", "contrast");
        oSettingsModel.setProperty("/activeFlyoutTitle", getText("contrastMode.activate"));
        oSettingsModel.setProperty("/activeFlyoutIcon", "sap-icon://paint-bucket");
        this._openFlyout(oEvent.getSource());
        // Colour the preview once the flyout DOM exists.
        setTimeout(updateContrastPreview, 60);
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
        if (!bg || !text) { this.onCloseFlyout(); return; }
        applyCustomContrast(bg, text, oSettingsModel.getProperty("/contrastUnderlineLinks"));
        oSettingsModel.setProperty("/contrastModeActive", true);
        // Title stays fixed ("Kontrastmodus") — the row opens a config flyout, it
        // is not a plain on/off toggle, so no activate/deactivate flip.
        toggleActiveFeatureClass.call(this, "contrastModePanel", true);
        saveCurrentSettings();
        this.onCloseFlyout();
    },
    onContrastCancel() {
        const s = this._contrastSnapshot;
        if (s) {
            oSettingsModel.setProperty("/contrastBgColor", s.bg);
            oSettingsModel.setProperty("/contrastTextColor", s.text);
            oSettingsModel.setProperty("/contrastUnderlineLinks", s.underline);
            if (s.active) applyCustomContrast(s.bg, s.text, s.underline); else removeCustomContrast();
            oSettingsModel.setProperty("/contrastModeActive", !!s.active);
        }
        this.onCloseFlyout();
    },
    onContrastReset() {
        // Turn contrast off and restore the default (normal) white/black pair.
        removeCustomContrast();
        oSettingsModel.setProperty("/contrastModeActive", false);
        oSettingsModel.setProperty("/contrastBgColor", "#ffffff");
        oSettingsModel.setProperty("/contrastTextColor", "#000000");
        oSettingsModel.setProperty("/contrastUnderlineLinks", true);
        toggleActiveFeatureClass.call(this, "contrastModePanel", false);
        updateContrastPreview();
        saveCurrentSettings();
    },

    // ---- Font size ----
    onIncreaseFontSize() {
        increaseFontSize();
        toggleActiveFeatureClass.call(this, "fontSizePanel", oSettingsModel.getProperty("/fontStep") !== 0);
        saveCurrentSettings();
    },
    onDecreaseFontSize() {
        decreaseFontSize();
        toggleActiveFeatureClass.call(this, "fontSizePanel", oSettingsModel.getProperty("/fontStep") !== 0);
        saveCurrentSettings();
    },
    onResetFontSize() {
        resetFontSize();
        toggleActiveFeatureClass.call(this, "fontSizePanel", false);
        saveCurrentSettings();
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
        togglePanelExpanded("/textSpacingExpanded");
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
    onReadingGuideToolbarPress() {
        togglePanelExpanded("/readingGuideExpanded");
    },
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
    onBigCursorToggle() {
        const open = oSettingsModel.getProperty("/bigCursorExpanded");
        oSettingsModel.setProperty("/bigCursorExpanded", !open);
    },
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
    onHighlightLinksToolbarPress() {
        const active = !oSettingsModel.getProperty("/highlightLinksActive");
        oSettingsModel.setProperty("/highlightLinksActive", active);
        if (active) enableHighlightLinks(); else disableHighlightLinks();
        toggleActiveFeatureClass.call(this, "highlightLinksPanel", active);
        saveCurrentSettings();
    },

    // ---- Stop animations (WCAG 2.2.2) ----
    onStopAnimationsToolbarPress() {
        const active = !oSettingsModel.getProperty("/stopAnimationsActive");
        oSettingsModel.setProperty("/stopAnimationsActive", active);
        if (active) enableStopAnimations(); else disableStopAnimations();
        // Flip the label + icon: OFF → "stoppen"/pause, ON → "starten"/play.
        updateTitleText.call(this, "stopAnimationsTitle",
            active ? "stopAnimations.start" : "stopAnimations.title");
        updateIconSrc.call(this, "stopAnimationsIcon",
            active ? "sap-icon://media-play" : "sap-icon://media-pause");
        toggleActiveFeatureClass.call(this, "stopAnimationsPanel", active);
        saveCurrentSettings();
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

    // Header press TOGGLES the feature: off → activate a default mode and open
    // the inline panel (shows that mode's intensity); on → turn the correction
    // off and close. The mode can still be changed via "Advanced settings".
    onColorBlindnessToggle() {
        const current = oSettingsModel.getProperty("/colorBlindnessType");
        if (current === "none") {
            const modes = oSettingsModel.getProperty("/colorBlindnessModes");
            const first = (modes && modes.length) ? modes[0].key : "protanomaly";
            oSettingsModel.setProperty("/colorBlindnessType", first);
            applyColorBlindness(first, oSettingsModel.getProperty("/colorBlindnessIntensity"));
            oSettingsModel.setProperty("/colorBlindnessExpanded", true);
            toggleActiveFeatureClass.call(this, "colorBlindnessPanel", true);
        } else {
            oSettingsModel.setProperty("/colorBlindnessType", "none");
            applyColorBlindness("none", oSettingsModel.getProperty("/colorBlindnessIntensity"));
            oSettingsModel.setProperty("/colorBlindnessExpanded", false);
            toggleActiveFeatureClass.call(this, "colorBlindnessPanel", false);
        }
        saveCurrentSettings();
    },

    // ---- Left flyout (detailed settings) ----
    onColorBlindnessOpenFlyout(oEvent) {
        oSettingsModel.setProperty("/activeFlyout", "colorBlindness");
        oSettingsModel.setProperty("/activeFlyoutTitle", getText("colorBlindness.title"));
        oSettingsModel.setProperty("/activeFlyoutIcon", "sap-icon://palette");
        // A detail panel should never open "empty": if nothing is active yet,
        // default-select the first mode (still changeable afterwards).
        if (oSettingsModel.getProperty("/colorBlindnessType") === "none") {
            const modes = oSettingsModel.getProperty("/colorBlindnessModes");
            const first = (modes && modes.length) ? modes[0].key : "protanomaly";
            oSettingsModel.setProperty("/colorBlindnessType", first);
            applyColorBlindness(first, oSettingsModel.getProperty("/colorBlindnessIntensity"));
            toggleActiveFeatureClass.call(this, "colorBlindnessPanel", true);
            saveCurrentSettings();
        }
        this._openFlyout(oEvent.getSource());
    },

    // Opens the flyout beside the main popover and keeps it open while the user
    // interacts with the main popover (main popover added as an extra-content
    // area so it is not treated as an outside click).
    _openFlyout(oOpener) {
        if (!this._oFlyout) return;
        this._oFlyout.openBy(oOpener);
        const oPopup = this._oFlyout.oPopup;
        if (this._oPopover && oPopup && typeof oPopup.setExtraContent === "function") {
            oPopup.setExtraContent([this._oPopover]);
        }
    },
    onCloseFlyout() {
        if (this._oFlyout) {
            this._oFlyout.close();
        }
    },

    // ---- Font (typography) ----
    // Header press just expands/collapses the inline simple font-size control;
    // the full typography panel opens from the "Advanced settings" opener.
    onFontToggle() {
        const open = oSettingsModel.getProperty("/fontSizeExpanded");
        oSettingsModel.setProperty("/fontSizeExpanded", !open);
    },
    onFontSizeReset() {
        this._applyTypo("fontPct", 0);
    },

    // ---- Font (typography) flyout: zoom, size, line height, spacing, align ----
    onFontOpenFlyout(oEvent) {
        oSettingsModel.setProperty("/activeFlyout", "font");
        oSettingsModel.setProperty("/activeFlyoutTitle", getText("fontSize.title"));
        oSettingsModel.setProperty("/activeFlyoutIcon", "sap-icon://text");
        this._openFlyout(oEvent.getSource());
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

    // Re-syncs the toggle rows' labels/icons with the current settings. Called
    // once when the popover first opens so features switched on via keyboard
    // shortcut (while the panel was closed) show the correct state.
    syncFeatureLabels() {
        updateTitleText.call(this, "nightModeTitle",
            oSettingsModel.getProperty("/nightModeActive") ? "nightMode.deactivate" : "nightMode.activate");
        updateTitleText.call(this, "blueLightFilterTitle",
            oSettingsModel.getProperty("/blueLightFilterActive") ? "blueFilter.deactivate" : "blueFilter.activate");
        updateTitleText.call(this, "toggleImagesTitle",
            oSettingsModel.getProperty("/toggleImagesActive") ? "toggleImages.show" : "toggleImages.hide");
        // Contrast title stays fixed (config-flyout row, not an on/off toggle).
        const stopped = oSettingsModel.getProperty("/stopAnimationsActive");
        updateTitleText.call(this, "stopAnimationsTitle",
            stopped ? "stopAnimations.start" : "stopAnimations.title");
        updateIconSrc.call(this, "stopAnimationsIcon",
            stopped ? "sap-icon://media-play" : "sap-icon://media-pause");
    },

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
        oSettingsModel.setProperty("/fontSizeExpanded", false);
        oSettingsModel.setProperty("/colorBlindnessExpanded", false);
        oSettingsModel.setProperty("/blueLightFilterExpanded", false);
        oSettingsModel.setProperty("/nightModeActive", false);
        oSettingsModel.setProperty("/toggleImagesActive", false);
        oSettingsModel.setProperty("/contrastModeActive", false);
        oSettingsModel.setProperty("/textSpacingLevel", "none");
        oSettingsModel.setProperty("/readingGuideMode", "none");
        oSettingsModel.setProperty("/bigCursorColor", "none");
        oSettingsModel.setProperty("/highlightLinksActive", false);
        oSettingsModel.setProperty("/stopAnimationsActive", false);
        oSettingsModel.setProperty("/textSpacingExpanded", false);
        oSettingsModel.setProperty("/readingGuideExpanded", false);
        oSettingsModel.setProperty("/bigCursorExpanded", false);
        disableBigCursor();

        updateTitleText.call(this, "nightModeTitle", "nightMode.activate");
        updateTitleText.call(this, "blueLightFilterTitle", "blueFilter.activate");
        updateTitleText.call(this, "toggleImagesTitle", "toggleImages.hide");
        updateTitleText.call(this, "stopAnimationsTitle", "stopAnimations.title");
        updateIconSrc.call(this, "stopAnimationsIcon", "sap-icon://media-pause");
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
        oSettingsModel.setProperty("/activeFlyout", "");
        if (this._oFlyout) {
            this._oFlyout.close();
        }
        clearAllPrefs();
    },

    // ---- Close ----
    onPopoverClosePress: closePopoverFromEvent
};
