import { describe, it, expect } from "vitest";
import {
    openAccessPopover,
    initAccessibility,
    initAccessibilityShortcuts
} from "../index.js";

// Importing index pulls the whole module graph (all sap/* specifiers are
// aliased to mocks). We only exercise the argument-guard branches — the guards
// throw before Fragment.load / setShortcutContext run, so no full open occurs.

describe("openAccessPopover — argument validation", () => {
    it("rejects when the controller is missing/invalid", async () => {
        await expect(openAccessPopover(null, {})).rejects.toThrow(/controller/i);
    });

    it("rejects when the controller lacks getView()", async () => {
        await expect(openAccessPopover({}, {})).rejects.toThrow(/controller/i);
    });

    it("rejects when oEvent is missing/invalid", async () => {
        await expect(openAccessPopover({ getView() {} }, null)).rejects.toThrow(/oEvent/);
    });

    it("rejects when oEvent lacks getSource()", async () => {
        await expect(openAccessPopover({ getView() {} }, {})).rejects.toThrow(/oEvent/);
    });
});

describe("index — public API surface", () => {
    it("exports initAccessibility as a function", () => {
        expect(typeof initAccessibility).toBe("function");
    });

    it("exports initAccessibilityShortcuts as a function", () => {
        expect(typeof initAccessibilityShortcuts).toBe("function");
    });
});
