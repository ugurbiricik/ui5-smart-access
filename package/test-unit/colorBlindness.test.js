import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the filter side-effects. The factory re-runs on every resetModules,
// so both colorBlindness.js and this file always see the same fresh spies.
vi.mock("../js/filterManager.js", () => ({
    setFilter: vi.fn(),
    removeFilter: vi.fn(),
    clearAllFilters: vi.fn()
}));

// Full-strength protanomaly matrix + identity, mirrored from the source, used to
// derive the expected interpolated `values` strings.
const IDENTITY = "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
const PROTAN_FULL = "0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0";
const PROTAN_HALF = "0.784 0.217 0 0 0 0.279 0.721 0 0 0 0 0.121 0.879 0 0 0 0 0 1 0";

const cbValues = (type) =>
    document.getElementById("sa-cb-" + type).querySelector("feColorMatrix").getAttribute("values");

let applyColorBlindness, resetColorBlindness, setFilter, removeFilter;

beforeEach(async () => {
    // A fresh module per test so the module-level `svgInjected` flag starts
    // false (the SVG is otherwise wiped from <body> by the global afterEach).
    vi.resetModules();
    ({ setFilter, removeFilter } = await import("../js/filterManager.js"));
    ({ applyColorBlindness, resetColorBlindness } = await import("../js/colorBlindness.js"));
});

describe("colorBlindness — grayscale (CSS filter)", () => {
    it("maps intensity to grayscale(t) via setFilter", () => {
        applyColorBlindness("grayscale", 50);
        expect(setFilter).toHaveBeenCalledWith("colorBlindness", "grayscale(0.5)");
    });

    it("clamps intensity above 100 to 1", () => {
        applyColorBlindness("grayscale", 150);
        expect(setFilter).toHaveBeenCalledWith("colorBlindness", "grayscale(1)");
    });

    it("clamps intensity below 0 to 0", () => {
        applyColorBlindness("grayscale", -20);
        expect(setFilter).toHaveBeenCalledWith("colorBlindness", "grayscale(0)");
    });
});

describe("colorBlindness — matrix simulation (SVG feColorMatrix)", () => {
    it("injects the SVG and applies the full matrix at 100%", () => {
        applyColorBlindness("protanomaly", 100);
        expect(document.getElementById("ui5-smart-access-cb-filters")).toBeTruthy();
        expect(cbValues("protanomaly")).toBe(PROTAN_FULL);
        expect(setFilter).toHaveBeenCalledWith("colorBlindness", "url(#sa-cb-protanomaly)");
    });

    it("uses the identity matrix at 0% (filter still set to the url)", () => {
        applyColorBlindness("protanomaly", 0);
        expect(cbValues("protanomaly")).toBe(IDENTITY);
        expect(setFilter).toHaveBeenCalledWith("colorBlindness", "url(#sa-cb-protanomaly)");
    });

    it("element-wise lerps toward identity at 50%", () => {
        applyColorBlindness("protanomaly", 50);
        expect(cbValues("protanomaly")).toBe(PROTAN_HALF);
    });

    it("injects the SVG only once across multiple matrix applications", () => {
        applyColorBlindness("protanomaly", 100);
        applyColorBlindness("deuteranomaly", 100);
        expect(document.querySelectorAll("#ui5-smart-access-cb-filters").length).toBe(1);
    });
});

describe("colorBlindness — disabling / unknown types", () => {
    it("removes the filter for type 'none'", () => {
        applyColorBlindness("none", 100);
        expect(removeFilter).toHaveBeenCalledWith("colorBlindness");
        expect(setFilter).not.toHaveBeenCalled();
    });

    it("removes the filter for an empty/falsy type", () => {
        applyColorBlindness("", 100);
        expect(removeFilter).toHaveBeenCalledWith("colorBlindness");
    });

    it("removes the filter for an unknown type", () => {
        applyColorBlindness("bogus", 100);
        expect(removeFilter).toHaveBeenCalledWith("colorBlindness");
        expect(setFilter).not.toHaveBeenCalled();
    });

    it("resetColorBlindness removes the filter", () => {
        resetColorBlindness();
        expect(removeFilter).toHaveBeenCalledWith("colorBlindness");
    });
});
