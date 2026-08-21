import { describe, it, expect, beforeEach } from "vitest";
import { setFilter, removeFilter, clearAllFilters } from "../js/filterManager.js";

const filter = () => document.documentElement.style.filter;

// activeFilters is module-level state shared across tests — reset each time.
beforeEach(() => clearAllFilters());

describe("filterManager", () => {
    it("sets a single filter", () => {
        setFilter("a", "grayscale(1)");
        expect(filter()).toBe("grayscale(1)");
    });

    it("combines multiple filters space-joined", () => {
        setFilter("a", "grayscale(1)");
        setFilter("b", "blur(2px)");
        expect(filter()).toBe("grayscale(1) blur(2px)");
    });

    it("removes one filter, keeps the rest", () => {
        setFilter("a", "grayscale(1)");
        setFilter("b", "blur(2px)");
        removeFilter("a");
        expect(filter()).toBe("blur(2px)");
    });

    it("drops falsy values from the combined string", () => {
        setFilter("a", "grayscale(1)");
        setFilter("b", "");
        expect(filter()).toBe("grayscale(1)");
    });

    it("clearAllFilters empties everything and is idempotent", () => {
        setFilter("a", "grayscale(1)");
        clearAllFilters();
        expect(filter()).toBe("");
        clearAllFilters();
        expect(filter()).toBe("");
    });
});
