import { describe, it, expect, beforeEach } from "vitest";
import {
    getContrastRatio,
    applyCustomContrast,
    removeCustomContrast,
    isContrastModeActive,
    toggleContrastMode
} from "../js/contrast.js";

describe("getContrastRatio (WCAG luminance math)", () => {
    it("white on black is the maximum 21:1", () => {
        expect(getContrastRatio("#ffffff", "#000000")).toEqual({ ratioText: "21.0:1", readable: true });
    });

    it("is symmetric (order of bg/text does not matter)", () => {
        expect(getContrastRatio("#000000", "#ffffff").ratioText).toBe("21.0:1");
    });

    it("expands 3-digit hex the same as 6-digit", () => {
        expect(getContrastRatio("#fff", "#000")).toEqual(getContrastRatio("#ffffff", "#000000"));
    });

    it("flags a low-contrast pair as not readable", () => {
        const r = getContrastRatio("#777777", "#888888");
        expect(r.readable).toBe(false);
    });

    it("ratioText always has one decimal and ends with :1", () => {
        expect(getContrastRatio("#123456", "#abcdef").ratioText).toMatch(/^\d+\.\d:1$/);
    });

    it("readable is true exactly at/above WCAG AA 4.5:1", () => {
        // black on white grey #767676 is ~4.54:1 (a known AA boundary colour)
        const r = getContrastRatio("#ffffff", "#767676");
        expect(parseFloat(r.ratioText)).toBeGreaterThanOrEqual(4.5);
        expect(r.readable).toBe(true);
    });
});

describe("applyCustomContrast / removeCustomContrast (DOM side effects)", () => {
    beforeEach(() => removeCustomContrast());

    it("injects a page-wide style excluding #sap-ui-static", () => {
        applyCustomContrast("#ffff00", "#000000", false);
        const style = document.getElementById("ui5-smart-access-contrast");
        expect(style).toBeTruthy();
        expect(style.textContent).toContain("#ffff00");
        expect(style.textContent).toContain("#000000");
        expect(style.textContent).toContain(":not(#sap-ui-static)");
        expect(isContrastModeActive()).toBe(true);
    });

    it("adds an underline rule only when underlineLinks is true", () => {
        applyCustomContrast("#ffffff", "#000000", true);
        expect(document.getElementById("ui5-smart-access-contrast").textContent)
            .toContain("text-decoration: underline");
        applyCustomContrast("#ffffff", "#000000", false);
        expect(document.getElementById("ui5-smart-access-contrast").textContent)
            .not.toContain("text-decoration: underline");
    });

    it("covers form fields (no input exclusion)", () => {
        applyCustomContrast("#ffffff", "#000000", false);
        const css = document.getElementById("ui5-smart-access-contrast").textContent;
        expect(css).not.toContain(":not(input)");
    });

    it("removeCustomContrast clears the style and deactivates", () => {
        applyCustomContrast("#ffffff", "#000000", false);
        removeCustomContrast();
        expect(document.getElementById("ui5-smart-access-contrast")).toBeNull();
        expect(isContrastModeActive()).toBe(false);
        expect(document.body.style.filter).toBe("");
    });
});

describe("toggleContrastMode (legacy invert path)", () => {
    beforeEach(() => {
        document.body.style.filter = "";
        if (isContrastModeActive()) removeCustomContrast();
    });

    it("toggles the invert/grayscale filter on and off", () => {
        const on = toggleContrastMode();
        expect(on).toBe(true);
        expect(document.body.style.filter).toBe("invert(1) grayscale(1)");
        const off = toggleContrastMode();
        expect(off).toBe(false);
        expect(document.body.style.filter).toBe("");
    });
});
