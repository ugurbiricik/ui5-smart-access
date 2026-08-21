import Fragment from "sap/ui/core/Fragment";

import { loadCustomStyleOnce } from "./js/cssLoader.js";
import { createI18nModel } from "./js/i18nModel.js";
import {
    oSettingsModel,
    restoreSavedState,
    restoreActiveFeatureClasses
} from "./js/settingsModel.js";
import { popoverInternalController } from "./js/popoverController.js";
import { initFontSizer } from "./js/fontsize.js";
import { initTextToSpeech, stopReading } from "./js/textToSpeech.js";
import { initImageHider } from "./js/imageHider.js";
import { prefetchDarkTheme } from "./js/nightMode.js";
import { attachHoverHints, hideHint } from "./js/hoverHints.js";
import { buildColorBlindnessModes } from "./js/cbSwatches.js";
import { buildBigCursorColors } from "./js/bigCursor.js";
import { registerShortcuts, setShortcutContext } from "./js/keyboardShortcuts.js";

// Opens the popover using the given controller, anchored to `trigger`. Shared
// by the public entry point and the keyboard shortcut handler.
const openByTrigger = (controller, trigger) =>
    openAccessPopover(controller, { getSource: () => trigger });

// One-time setup: init feature modules and RE-APPLY saved preferences. Runs on
// page load (via initAccessibility) so persisted filters take effect
// immediately — NOT only after the popover is first opened. Idempotent.
let _initialized = false;
const ensureInitialized = () => {
    if (_initialized) return;
    _initialized = true;
    // Create the i18n model first so the localized labels below (and any
    // restored feature text) resolve instead of falling back to raw keys.
    createI18nModel();
    loadCustomStyleOnce();
    initFontSizer(oSettingsModel);
    initTextToSpeech(oSettingsModel);
    initImageHider();
    restoreSavedState();
    // Warm up the dark theme stylesheet cache so toggling night mode later is
    // near-instant (avoids a visible delay on panel chevrons etc.).
    prefetchDarkTheme();
    oSettingsModel.setProperty("/colorBlindnessModes", buildColorBlindnessModes());
    oSettingsModel.setProperty("/bigCursorColors", buildBigCursorColors());
};

// Load + wire the popover (and its flyout) once, storing the promise on the
// controller. Idempotent, and safe to call from onInit (via initAccessibility)
// to warm the fragment in the background — so the first open is instant even on
// a cold page load, where the fragment/css/i18n otherwise only start loading on
// the first click (a visible 2-3s delay in a deployed app).
const ensurePopoverLoaded = (controller) => {
    if (controller._pPopover) {
        return controller._pPopover;
    }

    const oView = controller.getView();
    const sFragmentId = oView.getId();
    const i18nModel = createI18nModel();

    controller._pPopover = Fragment.load({
        id: sFragmentId,
        name: "ui5-smart-access.Popover",
        controller: popoverInternalController
    }).then((oPopover) => {
        if (!oPopover) {
            throw new Error("Popover Fragment could not be loaded!");
        }
        // Apply our own models BEFORE adding the popover to the view.
        // addDependent makes the popover inherit the host app's models,
        // including its own "i18n" ResourceModel. If we add first, the
        // fragment's {i18n>...} bindings propagate against the host bundle
        // (which lacks our keys) and flood the console with "text not
        // found" assertions until our model is set. Setting first means the
        // first propagation already resolves against our bundle.
        oPopover.setModel(oSettingsModel, "settings");
        oPopover.setModel(i18nModel, "i18n");

        oView.addDependent(oPopover);

        popoverInternalController._oPopover = oPopover;
        popoverInternalController._sFragmentId = sFragmentId;

        restoreActiveFeatureClasses(sFragmentId);
        // Sync the toggle labels/icons with the current state so features
        // switched on via keyboard before the first open read correctly.
        popoverInternalController.syncFeatureLabels();

        // The Select's dropdown renders outside the popover DOM, so its
        // items can't be reached by our `.abicsAccessibilityPopover` rules.
        // Tag its picker with a scoped class so we can restyle ONLY our
        // dropdown (never the host app's selects).
        try {
            const oRGSelect = Fragment.byId(sFragmentId, "readingGuideSelect");
            if (oRGSelect && typeof oRGSelect.getPicker === "function") {
                oRGSelect.getPicker().addStyleClass("saSelectPicker");
            }
        } catch (e) {
            /* dropdown styling is best-effort */
        }

        oPopover.attachAfterClose(() => {
            stopReading();
            hideHint();
            if (popoverInternalController._oFlyout) {
                popoverInternalController._oFlyout.close();
            }
        });

        // Wire per-feature hover hints once the panels have a DOM ref.
        oPopover.attachAfterOpen(function _hintsOnce() {
            attachHoverHints(sFragmentId);
            oPopover.detachAfterOpen(_hintsOnce);
        });

        // Left flyout popover for detailed feature settings.
        const sFlyoutId = sFragmentId + "-fly";
        Fragment.load({
            id: sFlyoutId,
            name: "ui5-smart-access.Flyout",
            controller: popoverInternalController
        }).then((oFlyout) => {
            // Same ordering as the popover: set our models first so the
            // flyout's bindings never resolve against the host "i18n" model.
            oFlyout.setModel(oSettingsModel, "settings");
            oFlyout.setModel(i18nModel, "i18n");
            oView.addDependent(oFlyout);
            popoverInternalController._oFlyout = oFlyout;
            popoverInternalController._sFlyoutId = sFlyoutId;
        });

        return oPopover;
    }).catch((err) => {
        controller._pPopover = null;
        console.error("[ui5-smart-access] Failed to load popover fragment:", err);
        throw err;
    });

    return controller._pPopover;
};

// Public entry point. Wires the popover to the consumer's controller and
// opens it anchored to the event source.
export const openAccessPopover = async (controller, oEvent) => {
    if (!controller || typeof controller.getView !== "function") {
        throw new Error("The controller parameter must be a UI5 Controller!");
    }
    if (!oEvent || typeof oEvent.getSource !== "function") {
        throw new Error("The oEvent parameter must be a UI5 Event!");
    }

    // Enable the global Alt+Shift+<key> shortcuts (idempotent) and remember the
    // controller + trigger so they can re-open the assistant later.
    setShortcutContext(openByTrigger, controller, oEvent.getSource());
    registerShortcuts();
    ensureInitialized();

    // Capture the launcher control now. UI5 resets the event after the press
    // handler returns, so oEvent.getSource() can be null by the time the popover
    // promise resolves.
    const oSource = oEvent.getSource();

    const oPopover = await ensurePopoverLoaded(controller);

    oPopover.openBy(oSource);
    return oPopover;
};

// Call once from the consumer's onInit. Does two things without opening the
// popover: (1) re-applies saved preferences immediately on page load (so a
// persisted night mode / contrast / colour filter is visible right away, not
// only after the assistant is first opened); (2) enables the global
// Alt+Shift+<key> shortcuts (so keyboard-only users can open it with
// Alt+Shift+A). `oTrigger` is the control the popover anchors to — the launcher.
export const initAccessibility = (controller, oTrigger) => {
    ensureInitialized();
    setShortcutContext(openByTrigger, controller, oTrigger);
    registerShortcuts();
    // Warm the popover fragment in the background so the first open is instant
    // even on a cold page load — otherwise the fragment/css/i18n only start
    // loading on the first click, blocking the UI for 2-3s in a deployed app.
    ensurePopoverLoaded(controller).catch(() => { /* first open will retry */ });
};

// Backwards-compatible alias. `initAccessibility` is the preferred name.
export const initAccessibilityShortcuts = (controller, oTrigger) =>
    initAccessibility(controller, oTrigger);
