import { describe, it, expect } from "vitest";
import { popoverInternalController } from "../js/popoverController.js";

// Importing the controller pulls in the whole feature graph; the four aliased
// sap/* mocks cover the bare specifiers. We only exercise the pure formatters
// here (not the ~40 DOM event handlers).
const c = popoverInternalController;

describe("popoverController - formatTtsRate", () => {
    it('formats 1 as "1.0x"', () => {
        expect(c.formatTtsRate(1)).toBe("1.0x");
    });
    it('formats 1.5 as "1.5x"', () => {
        expect(c.formatTtsRate(1.5)).toBe("1.5x");
    });
    it('treats null as the default 1 -> "1.0x"', () => {
        expect(c.formatTtsRate(null)).toBe("1.0x");
    });
    it('treats undefined as the default 1 -> "1.0x"', () => {
        expect(c.formatTtsRate(undefined)).toBe("1.0x");
    });
});

describe("popoverController - formatTtsVolume", () => {
    it('formats 1 as "100%"', () => {
        expect(c.formatTtsVolume(1)).toBe("100%");
    });
    it('formats 0 as "0%"', () => {
        expect(c.formatTtsVolume(0)).toBe("0%");
    });
    it('formats 0.25 as "25%"', () => {
        expect(c.formatTtsVolume(0.25)).toBe("25%");
    });
    it('treats null as the default 1 -> "100%"', () => {
        expect(c.formatTtsVolume(null)).toBe("100%");
    });
});
