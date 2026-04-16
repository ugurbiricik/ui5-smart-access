import JSONModel from "sap/ui/model/json/JSONModel";
import getPopoverModules from "./popoverModules.js";
import Fragment from "sap/ui/core/Fragment";
import { loadCustomStyleOnce } from "./js/cssLoader.js";
import { createI18nModel, getText } from "./js/i18nModel.js";
import {
    initFontSizer,
    onIncreaseFontSize,
    onDecreaseFontSize,
    onResetFontSize
} from "./js/fontsize.js";
import {
    initTextToSpeech,
    startReading,
    stopReading,
    setTTSRate,
    setTTSVolume,
    enableHoverRead,
    disableHoverRead
} from "./js/textToSpeech.js";
import {
    applyColorBlindness,
    resetColorBlindness
} from "./js/colorBlindness.js";
import {
    enableBlueLightFilter,
    disableBlueLightFilter
} from "./js/blueLightFilter.js";
import {
    toggleNightMode,
    prefetchDarkTheme
} from "./js/nightMode.js";
import {
    toggleImages,
    initImageHider
} from "./js/imageHider.js";
import {
    toggleContrastMode,
    applyCustomContrast,
    removeCustomContrast
} from "./js/contrast.js";
import { resetAll } from "./js/resetAll.js";
import { savePref, loadPref, clearPrefs } from "./js/preferences.js";

const PERSISTED_KEYS = [
    "fontStep", "ttsRate", "ttsVolume", "colorBlindnessType",
    "blueLightFilterLevel", "blueLightFilterActive", "nightModeActive"
];

function loadSavedSettings() {
    const saved = {};
    PERSISTED_KEYS.forEach(key => {
        const val = loadPref(key, undefined);
        if (val !== undefined) saved[key] = val;
    });
    return saved;
}

function saveCurrentSettings() {
    PERSISTED_KEYS.forEach(key => {
        savePref(key, oSettingsModel.getProperty("/" + key));
    });
}

const savedSettings = loadSavedSettings();

const oSettingsModel = new JSONModel({
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

function toggleActiveFeatureClass(panelId, active) {
    const panel = Fragment.byId(this._sFragmentId, panelId);
    if (panel) {
        if (active) {
            panel.addStyleClass("activeFeature");
        } else {
            panel.removeStyleClass("activeFeature");
        }
    }
}

function updateTitleText(controlId, i18nKey) {
    const control = Fragment.byId(this._sFragmentId, controlId);
    if (control && this._oPopover) {
        const bundle = this._oPopover.getModel("i18n").getResourceBundle();
        if (bundle) {
            control.setText(bundle.getText(i18nKey));
        }
    }
}

const popoverInternalController = {
    onFontSizeToolbarPress: function () {
        const expanded = oSettingsModel.getProperty("/fontSizeExpanded");
        oSettingsModel.setProperty("/fontSizeExpanded", !expanded);
    },
    onTTSToolbarPress: function () {
        const expanded = oSettingsModel.getProperty("/ttsExpanded");
        oSettingsModel.setProperty("/ttsExpanded", !expanded);
    },
    onColorBlindnessToolbarPress: function () {
        const expanded = oSettingsModel.getProperty("/colorBlindnessExpanded");
        oSettingsModel.setProperty("/colorBlindnessExpanded", !expanded);
    },
    onBlueLightFilterToolbarPress: function () {
        const expanded = oSettingsModel.getProperty("/blueLightFilterExpanded");
        oSettingsModel.setProperty("/blueLightFilterExpanded", !expanded);

        updateTitleText.call(this, "blueLightFilterTitle",
            !expanded ? "blueFilter.deactivate" : "blueFilter.activate"
        );

        if (!expanded) {
            enableBlueLightFilter(oSettingsModel.getProperty("/blueLightFilterLevel"));
            oSettingsModel.setProperty("/blueLightFilterActive", true);
        } else {
            disableBlueLightFilter();
            oSettingsModel.setProperty("/blueLightFilterActive", false);
        }
        toggleActiveFeatureClass.call(this, "blueLightFilterPanel", !expanded);
        saveCurrentSettings();
    },
    onNightModeToolbarPress: function () {
        const active = toggleNightMode();
        oSettingsModel.setProperty("/nightModeActive", active);
        updateTitleText.call(this, "nightModeTitle",
            active ? "nightMode.deactivate" : "nightMode.activate"
        );
        toggleActiveFeatureClass.call(this, "nightModePanel", active);
        saveCurrentSettings();
    },
    onToggleImagesToolbarPress: function () {
        const active = toggleImages();
        oSettingsModel.setProperty("/toggleImagesActive", active);
        updateTitleText.call(this, "toggleImagesTitle",
            active ? "toggleImages.show" : "toggleImages.hide"
        );
        toggleActiveFeatureClass.call(this, "toggleImagesPanel", active);
    },
    onContrastModeToolbarPress: function () {
        const active = toggleContrastMode();
        oSettingsModel.setProperty("/contrastModeActive", active);
        updateTitleText.call(this, "contrastModeTitle",
            active ? "contrastMode.deactivate" : "contrastMode.activate"
        );
        toggleActiveFeatureClass.call(this, "contrastModePanel", active);
    },
    onResetAllToolbarPress: function () {
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
        clearPrefs();
    },
    onIncreaseFontSize: function () {
        onIncreaseFontSize();
        saveCurrentSettings();
    },
    onDecreaseFontSize: function () {
        onDecreaseFontSize();
        saveCurrentSettings();
    },
    onResetFontSize: function () {
        onResetFontSize();
        saveCurrentSettings();
    },
    onTTSStart: startReading,
    onTTSStop: stopReading,
    onTTSRateChange: function (e) {
        setTTSRate(e.getParameter("value"));
        saveCurrentSettings();
    },
    onTTSVolumeChange: function (e) {
        setTTSVolume(e.getParameter("value"));
        saveCurrentSettings();
    },
    onTTSHoverChange: function (e) {
        const active = e.getParameter("state");
        oSettingsModel.setProperty("/ttsHover", active);
        if (active) enableHoverRead(); else disableHoverRead();
    },
    onColorBlindnessChange: function (e) {
        const type = e.getParameter("selectedItem").getKey();
        oSettingsModel.setProperty("/colorBlindnessType", type);
        applyColorBlindness(type);
        saveCurrentSettings();
    },
    onColorBlindnessReset: function () {
        oSettingsModel.setProperty("/colorBlindnessType", "none");
        resetColorBlindness();
        saveCurrentSettings();
    },
    onBlueLightFilterSliderChange: function (e) {
        const level = e.getParameter("value");
        oSettingsModel.setProperty("/blueLightFilterLevel", level);
        enableBlueLightFilter(level);
        saveCurrentSettings();
    },
    onBlueLightFilterReset: function () {
        oSettingsModel.setProperty("/blueLightFilterLevel", 0);
        disableBlueLightFilter();
        saveCurrentSettings();
    },
    onContrastPresetPress: function (oEvent) {
        const customData = oEvent.getSource().getCustomData();
        if (!customData || !customData.length) return;
        const key = customData[0].getValue();
        let bg = "#000000", text = "#FFFFFF";
        if (key === "yellow-black") { bg = "#FFFF00"; text = "#000000"; }
        if (key === "red-black") { bg = "#FF0000"; text = "#000000"; }
        if (key === "green-black") { bg = "#00FF00"; text = "#000000"; }
        oSettingsModel.setProperty("/contrastBgColor", bg);
        oSettingsModel.setProperty("/contrastTextColor", text);
        updateContrastPreview();
    },
    onContrastApply: function () {
        applyCustomContrast(
            oSettingsModel.getProperty("/contrastBgColor"),
            oSettingsModel.getProperty("/contrastTextColor"),
            oSettingsModel.getProperty("/contrastUnderlineLinks")
        );
        oSettingsModel.setProperty("/contrastModeActive", true);
    },
    onContrastReset: function () {
        removeCustomContrast();
        oSettingsModel.setProperty("/contrastBgColor", "#000000");
        oSettingsModel.setProperty("/contrastTextColor", "#FFFFFF");
        oSettingsModel.setProperty("/contrastUnderlineLinks", true);
        oSettingsModel.setProperty("/contrastModeActive", false);
        updateContrastPreview();
    },
    onUnderlineLinksToggle: function (oEvent) {
        oSettingsModel.setProperty("/contrastUnderlineLinks", oEvent.getParameter("selected"));
        updateContrastPreview();
    },
    onPopoverClosePress: function (oEvent) {
        let oPopover = oEvent.getSource().getParent();
        while (oPopover && !(oPopover.isA && oPopover.isA("sap.m.Popover"))) {
            oPopover = oPopover.getParent && oPopover.getParent();
        }
        if (oPopover && oPopover.close) {
            oPopover.close();
        }
    }
};

function restoreSavedState() {
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
}

function restoreActiveFeatureClasses(sFragmentId) {
    if (oSettingsModel.getProperty("/nightModeActive")) {
        const panel = Fragment.byId(sFragmentId, "nightModePanel");
        if (panel) panel.addStyleClass("activeFeature");
    }
    if (oSettingsModel.getProperty("/blueLightFilterActive")) {
        const panel = Fragment.byId(sFragmentId, "blueLightFilterPanel");
        if (panel) panel.addStyleClass("activeFeature");
    }
}

export const openAccessPopover = async (controller, oEvent) => {
    if (!controller || typeof controller.getView !== "function") {
        throw new Error("The controller parameter must be a UI5 Controller!");
    }
    if (!oEvent || typeof oEvent.getSource !== "function") {
        throw new Error("The oEvent parameter must be a UI5 Event!");
    }
    const oView = controller.getView();
    const sFragmentId = oView.getId();

    if (!controller._pPopover) {
        loadCustomStyleOnce();
        initFontSizer(oSettingsModel);
        initTextToSpeech(oSettingsModel);
        initImageHider();
        restoreSavedState();
        // Warm up the dark theme stylesheet cache so that toggling night mode
        // later is near-instant (avoids a visible delay on panel chevrons etc.).
        prefetchDarkTheme();

        const i18nModel = createI18nModel();

        controller._pPopover = Fragment.load({
            id: sFragmentId,
            name: "ui5-smart-access.Popover",
            controller: popoverInternalController
        }).then((oPopover) => {
            if (!oPopover) {
                throw new Error("Popover Fragment could not be loaded!");
            }
            oView.addDependent(oPopover);

            oPopover.setModel(oSettingsModel, "settings");
            oPopover.setModel(i18nModel, "i18n");

            popoverInternalController._oPopover = oPopover;
            popoverInternalController._sFragmentId = sFragmentId;

            restoreActiveFeatureClasses(sFragmentId);

            oPopover.attachAfterClose(() => {
                stopReading();
            });

            return oPopover;
        }).catch((err) => {
            controller._pPopover = null;
            console.error("[ui5-smart-access] Failed to load popover fragment:", err);
            throw err;
        });
    }

    const oPopover = await controller._pPopover;

    oPopover.setModel(new JSONModel({ items: getPopoverModules() }), "modules");
    oPopover.openBy(oEvent.getSource());
};

function updateContrastPreview() {
    const bg = oSettingsModel.getProperty("/contrastBgColor");
    const text = oSettingsModel.getProperty("/contrastTextColor");
    const ratio = getContrastRatio(bg, text);
    oSettingsModel.setProperty("/contrastRatio", ratio.ratioText);
    oSettingsModel.setProperty("/contrastReadable", ratio.readable ? getText("contrast.readable") : getText("contrast.notReadable"));
}

function getContrastRatio(bg, text) {
    function luminance(hex) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const rgb = [0, 1, 2].map(i => parseInt(c.substr(i * 2, 2), 16) / 255);
        const lum = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    }
    const l1 = luminance(bg);
    const l2 = luminance(text);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return { ratioText: ratio.toFixed(1) + ":1", readable: ratio >= 4.5 };
}
