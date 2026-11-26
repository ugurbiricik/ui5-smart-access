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
