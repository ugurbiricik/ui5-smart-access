import Fragment from "sap/ui/core/Fragment";

// These helpers are designed to be invoked via `.call(controllerCtx, ...)`
// from handlers inside popoverInternalController, so they can access
// `this._sFragmentId` and `this._oPopover`.

// Adds/removes the "activeFeature" style class on a panel by fragment-local ID.
export function toggleActiveFeatureClass(panelId, active) {
    const panel = Fragment.byId(this._sFragmentId, panelId);
    if (!panel) return;
    if (active) {
        panel.addStyleClass("activeFeature");
    } else {
        panel.removeStyleClass("activeFeature");
    }
}

// Sets the text of a control inside the popover to an i18n-resolved value.
export function updateTitleText(controlId, i18nKey) {
    const control = Fragment.byId(this._sFragmentId, controlId);
    if (!control || !this._oPopover) return;
    const bundle = this._oPopover.getModel("i18n").getResourceBundle();
    if (bundle) {
        control.setText(bundle.getText(i18nKey));
    }
}

// Swaps the icon of a control inside the popover (e.g. play/pause on a toggle).
export function updateIconSrc(controlId, src) {
    const control = Fragment.byId(this._sFragmentId, controlId);
    if (control && control.setSrc) {
        control.setSrc(src);
    }
}

// Walks up the control tree from the event source until it finds the
// surrounding sap.m.Popover, then closes it. Used by the header close button.
export function closePopoverFromEvent(oEvent) {
    let oPopover = oEvent.getSource().getParent();
    while (oPopover && !(oPopover.isA && oPopover.isA("sap.m.Popover"))) {
        oPopover = oPopover.getParent && oPopover.getParent();
    }
    if (oPopover && oPopover.close) {
        oPopover.close();
    }
}
