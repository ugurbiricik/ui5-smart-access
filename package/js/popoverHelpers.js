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

export const ROW_GROUPS = ["saGroupVision", "saGroupReading", "saGroupMotion"];

export const LABELLED_GROUPS = ["saGroupProfiles"].concat(ROW_GROUPS);

export function labelRowGroups(sFragmentId) {
    LABELLED_GROUPS.forEach((groupId) => {
        const group = Fragment.byId(sFragmentId, groupId);
        const title = Fragment.byId(sFragmentId, groupId + "Title");
        if (!group || !title) return;
        const apply = () => {
            const dom = group.getDomRef();
            if (!dom) return;
            dom.setAttribute("role", "group");
            dom.setAttribute("aria-labelledby", title.getId());
        };
        group.addEventDelegate({ onAfterRendering: apply });
        apply();
    });
}
