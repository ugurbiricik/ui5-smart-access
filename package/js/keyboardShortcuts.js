import Fragment from "sap/ui/core/Fragment";
import { oSettingsModel } from "./settingsModel.js";
import { popoverInternalController } from "./popoverController.js";

// Global keyboard shortcuts for the accessibility assistant. A single keydown
// listener on the document maps Alt+Shift+<letter> combos to features:
//   Alt+Shift+A         → open / close the assistant
//   any other feature   → open the assistant (if needed) and act on that row
//                         EXACTLY as if it had been clicked (same toggle /
//                         default-activation / flyout behaviour).
// Alt+Shift is used (not plain Alt) because Alt+<letter> triggers the browser
// menu-bar accelerators. The physical key `code` (e.g. "KeyF") is matched so
// the mapping stays correct regardless of the active keyboard layout.

let _openFn = null;      // (controller, trigger) => Promise<Popover>
let _controller = null;  // consumer controller (needed to open the popover)
let _trigger = null;     // control the popover anchors to (the launch button)
let _registered = false;

// Each shortcut maps to a feature panel. Pressing it fires that panel's header
// row — identical to a mouse click — so every feature behaves consistently
// (toggle on/off, activate a default value, or open its flyout).
const FEATURE_PANELS = {
    KeyF: "fontSizePanel",
    KeyR: "readingGuidePanel",
    KeyG: "bigCursorPanel",
    KeyL: "highlightLinksPanel",
    KeyV: "ttsPanel",
    KeyS: "colorBlindnessPanel",
    KeyB: "blueLightFilterPanel",
    KeyN: "nightModePanel",
    KeyK: "contrastModePanel",
    KeyM: "stopAnimationsPanel",
    KeyI: "toggleImagesPanel"
};

const isOpen = () => {
    const pop = popoverInternalController._oPopover;
    return !!(pop && pop.isOpen && pop.isOpen());
};

// Panels whose row opens a flyout (instead of an inline section). Their
// shortcut toggles that flyout open/closed.
const FLYOUT_PANELS = {
    contrastModePanel: "contrast",
    ttsPanel: "tts"
};

// True when the flyout is currently showing the given section.
const flyoutOpenFor = (key) => {
    const fly = popoverInternalController._oFlyout;
    return !!(fly && fly.isOpen && fly.isOpen()
        && oSettingsModel.getProperty("/activeFlyout") === key);
};

// Resolves once the popover is open, opening it first if needed. Resolves to
// null when there is no controller/anchor to open by (init never ran).
const ensureOpen = () => {
    if (isOpen()) return Promise.resolve(popoverInternalController._oPopover);
    if (!_openFn || !_controller || !_trigger) return Promise.resolve(null);
    return Promise.resolve(_openFn(_controller, _trigger)).then((oPop) => {
        if (!oPop) return null;
        if (oPop.isOpen && oPop.isOpen()) return oPop;
        return new Promise((resolve) => {
            oPop.attachEventOnce("afterOpen", () => resolve(oPop));
        });
    });
};

// Fires a feature row's header press (same as clicking it) and scrolls it into
// view. firePress goes through UI5's event system with proper focus handling,
// so flyout-opening rows (contrast) stay open — invoking the handler with a
// synthetic event instead would let the flyout auto-close.
const pressPanel = (panelId) => {
    const sFragmentId = popoverInternalController._sFragmentId;
    if (!sFragmentId) return;
    const panel = Fragment.byId(sFragmentId, panelId);
    if (!panel) return;
    const dom = panel.getDomRef && panel.getDomRef();
    if (dom && dom.scrollIntoView) dom.scrollIntoView({ block: "nearest" });
    const tb = panel.getHeaderToolbar && panel.getHeaderToolbar();
    if (tb && tb.firePress) tb.firePress();
};

const handleKey = (code) => {
    // Open / close the assistant.
    if (code === "KeyA") {
        if (isOpen()) {
            popoverInternalController._oPopover.close();
        } else {
            void ensureOpen();
        }
        return true;
    }
    // Any other feature: open the assistant, then click that row.
    if (FEATURE_PANELS[code]) {
        const panelId = FEATURE_PANELS[code];
        // Flyout-opening rows (contrast, read-aloud) don't toggle on press, so
        // make the shortcut toggle them: close if that flyout is already open.
        const flyoutKey = FLYOUT_PANELS[panelId];
        if (flyoutKey && flyoutOpenFor(flyoutKey)) {
            popoverInternalController.onCloseFlyout();
            return true;
        }
        void ensureOpen().then((oPop) => {
            if (!oPop) return;
            // Let a just-opened popover settle its focus before firing the row,
            // otherwise a flyout-opening row could auto-close.
            setTimeout(() => pressPanel(panelId), 50);
        });
        return true;
    }
    return false;
};

const onKeyDown = (e) => {
    if (e.repeat) return;
    // Require exactly Alt+Shift (no Ctrl/Meta) so we don't hijack other combos.
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    const code = e.code;
    if (!code) return;
    if (handleKey(code)) {
        e.preventDefault();
    }
};

// Stores the opener function plus the controller and anchor used to open the
// assistant via keyboard. Safe to call repeatedly (keeps the latest values).
export const setShortcutContext = (openFn, controller, trigger) => {
    if (openFn) _openFn = openFn;
    if (controller) _controller = controller;
    if (trigger) _trigger = trigger;
};

// Attaches the global keydown listener exactly once.
export const registerShortcuts = () => {
    if (_registered) return;
    document.addEventListener("keydown", onKeyDown, true);
    _registered = true;
};
