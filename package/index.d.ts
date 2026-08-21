import Controller from "sap/ui/core/mvc/Controller";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";

export function openAccessPopover(controller: Controller, oEvent: Event): Promise<unknown>;

/**
 * Call once from the consumer's onInit. Re-applies saved preferences on page
 * load (so a persisted night mode / contrast / colour filter shows immediately,
 * not only after the assistant is first opened) and enables the global
 * Alt+Shift+<key> keyboard shortcuts. `oTrigger` is the control the popover
 * anchors to — typically the launch button.
 */
export function initAccessibility(controller: Controller, oTrigger: Control): void;

/** @deprecated Use initAccessibility — kept as a backwards-compatible alias. */
export function initAccessibilityShortcuts(controller: Controller, oTrigger: Control): void;
