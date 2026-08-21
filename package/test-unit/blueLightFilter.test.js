import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../js/filterManager.js", () => ({
    setFilter: vi.fn(),
    removeFilter: vi.fn(),
    clearAllFilters: vi.fn()
}));

import { enableBlueLightFilter, disableBlueLightFilter } from "../js/blueLightFilter.js";
import { setFilter, removeFilter } from "../js/filterManager.js";

beforeEach(() => vi.clearAllMocks());

describe("blueLightFilter", () => {
    it("level 50 → brightness 0.95, sepia 0.3, hue -10", () => {
        enableBlueLightFilter(50);
        expect(setFilter).toHaveBeenCalledWith(
            "blueLightFilter",
            "brightness(0.95) sepia(0.3) hue-rotate(-10deg)"
        );
    });

    it("level 0 → neutral filter", () => {
        enableBlueLightFilter(0);
        expect(setFilter).toHaveBeenCalledWith(
            "blueLightFilter",
            "brightness(1) sepia(0) hue-rotate(0deg)"
        );
    });

    it("level 100 → strongest filter", () => {
        enableBlueLightFilter(100);
        expect(setFilter).toHaveBeenCalledWith(
            "blueLightFilter",
            "brightness(0.9) sepia(0.6) hue-rotate(-20deg)"
        );
    });

    it("defaults to level 50", () => {
        enableBlueLightFilter();
        expect(setFilter).toHaveBeenCalledWith(
            "blueLightFilter",
            "brightness(0.95) sepia(0.3) hue-rotate(-10deg)"
        );
    });

    it("disable removes the filter", () => {
        disableBlueLightFilter();
        expect(removeFilter).toHaveBeenCalledWith("blueLightFilter");
    });
});
