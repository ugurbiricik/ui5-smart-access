import JSONModel from "sap/ui/model/json/JSONModel";
import Fragment from "sap/ui/core/Fragment";

import getPopoverModules from "./popoverModules.js";
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

// Public entry point. Wires the popover to the consumer's controller and
// opens it anchored to the event source.
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
        // Warm up the dark theme stylesheet cache so toggling night mode later
        // is near-instant (avoids a visible delay on panel chevrons etc.).
        prefetchDarkTheme();

        const i18nModel = createI18nModel();
        oSettingsModel.setProperty("/colorBlindnessModes", buildColorBlindnessModes());
        oSettingsModel.setProperty("/bigCursorColors", buildBigCursorColors());

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
                oView.addDependent(oFlyout);
                oFlyout.setModel(oSettingsModel, "settings");
                oFlyout.setModel(i18nModel, "i18n");
                popoverInternalController._oFlyout = oFlyout;
                popoverInternalController._sFlyoutId = sFlyoutId;
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
