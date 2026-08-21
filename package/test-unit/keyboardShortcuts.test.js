import { describe, it, expect, vi, beforeEach } from "vitest";
import Fragment from "sap/ui/core/Fragment";
import { registerShortcuts, setShortcutContext } from "../js/keyboardShortcuts.js";
import { popoverInternalController } from "../js/popoverController.js";

const dispatch = (opts) => {
    const e = new KeyboardEvent("keydown", { cancelable: true, bubbles: true, ...opts });
    document.dispatchEvent(e);
    return e;
};

// Registration idempotency MUST be checked before any other test triggers the
// (module-level, one-shot) registration — hence its own leading describe.
describe("keyboardShortcuts — registration", () => {
    it("attaches exactly one keydown listener and is idempotent", () => {
        const add = vi.spyOn(document, "addEventListener");
        registerShortcuts();
        registerShortcuts();
        const keydownRegs = add.mock.calls.filter((c) => c[0] === "keydown");
        expect(keydownRegs.length).toBe(1);
    });
});

describe("keyboardShortcuts — Alt+Shift+A open/close", () => {
    beforeEach(() => {
        registerShortcuts(); // no-op after the first call
        popoverInternalController._oPopover = null;
        popoverInternalController._oFlyout = null;
        popoverInternalController._sFragmentId = undefined;
    });

    it("opens the assistant when it is closed", () => {
        const oPop = { isOpen: () => true };
        const openFn = vi.fn(() => Promise.resolve(oPop));
        const controller = { id: "ctrl" };
        const trigger = { id: "btn" };
        setShortcutContext(openFn, controller, trigger);

        const e = dispatch({ code: "KeyA", altKey: true, shiftKey: true });

        expect(openFn).toHaveBeenCalledWith(controller, trigger);
        expect(e.defaultPrevented).toBe(true);
    });

    it("closes the assistant when it is open", () => {
        const close = vi.fn();
        popoverInternalController._oPopover = { isOpen: () => true, close };
        const openFn = vi.fn();
        setShortcutContext(openFn, {}, {});

        const e = dispatch({ code: "KeyA", altKey: true, shiftKey: true });

        expect(close).toHaveBeenCalledTimes(1);
        expect(openFn).not.toHaveBeenCalled();
        expect(e.defaultPrevented).toBe(true);
    });
});

describe("keyboardShortcuts — mapped feature panel", () => {
    beforeEach(() => {
        registerShortcuts();
        popoverInternalController._oPopover = null;
        popoverInternalController._oFlyout = null;
        popoverInternalController._sFragmentId = undefined;
    });

    it("Alt+Shift+F opens the assistant and fires the font-size panel header", async () => {
        vi.useFakeTimers();
        const firePress = vi.fn();
        const scrollIntoView = vi.fn();
        const panel = {
            getDomRef: () => ({ scrollIntoView }),
            getHeaderToolbar: () => ({ firePress })
        };
        Fragment.byId.mockReturnValue(panel);

        const oPop = { isOpen: () => true };
        popoverInternalController._oPopover = oPop;      // already open → ensureOpen resolves at once
        popoverInternalController._sFragmentId = "frag";
        const openFn = vi.fn(() => Promise.resolve(oPop));
        setShortcutContext(openFn, {}, {});

        const e = dispatch({ code: "KeyF", altKey: true, shiftKey: true });
        expect(e.defaultPrevented).toBe(true);

        await Promise.resolve();       // let ensureOpen().then schedule the 50ms timer
        await vi.runAllTimersAsync();  // run pressPanel

        expect(Fragment.byId).toHaveBeenCalledWith("frag", "fontSizePanel");
        expect(scrollIntoView).toHaveBeenCalled();
        expect(firePress).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});

describe("keyboardShortcuts — guards (ignored combos)", () => {
    beforeEach(() => {
        registerShortcuts();
        popoverInternalController._oPopover = null;
        popoverInternalController._oFlyout = null;
        popoverInternalController._sFragmentId = undefined;
    });

    const expectIgnored = (opts) => {
        const openFn = vi.fn();
        setShortcutContext(openFn, {}, {});
        const e = dispatch(opts);
        expect(openFn).not.toHaveBeenCalled();
        expect(e.defaultPrevented).toBe(false);
    };

    it("ignores the combo without Shift", () => {
        expectIgnored({ code: "KeyA", altKey: true, shiftKey: false });
    });

    it("ignores the combo when Ctrl is held", () => {
        expectIgnored({ code: "KeyA", altKey: true, shiftKey: true, ctrlKey: true });
    });

    it("ignores the combo when Meta is held", () => {
        expectIgnored({ code: "KeyA", altKey: true, shiftKey: true, metaKey: true });
    });

    it("ignores auto-repeat events", () => {
        expectIgnored({ code: "KeyA", altKey: true, shiftKey: true, repeat: true });
    });

    it("ignores an unmapped key code", () => {
        expectIgnored({ code: "KeyZ", altKey: true, shiftKey: true });
    });
});
