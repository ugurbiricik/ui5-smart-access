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
