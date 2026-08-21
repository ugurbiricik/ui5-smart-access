import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion, prefersDark, prefersMoreContrast } from "../js/osPreferences.js";

const origMatchMedia = window.matchMedia;
afterEach(() => { window.matchMedia = origMatchMedia; });

describe("osPreferences", () => {
    it("returns true when the media query matches", () => {
        window.matchMedia = vi.fn(() => ({ matches: true }));
        expect(prefersReducedMotion()).toBe(true);
    });

    it("returns false when it does not match", () => {
        window.matchMedia = vi.fn(() => ({ matches: false }));
        expect(prefersReducedMotion()).toBe(false);
    });

    it("passes the correct media query strings", () => {
        const spy = vi.fn(() => ({ matches: false }));
        window.matchMedia = spy;
        prefersReducedMotion();
        prefersDark();
        prefersMoreContrast();
        expect(spy).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
        expect(spy).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
        expect(spy).toHaveBeenCalledWith("(prefers-contrast: more)");
    });

    it("degrades to false when matchMedia is unavailable", () => {
        window.matchMedia = undefined;
        expect(prefersReducedMotion()).toBe(false);
        expect(prefersDark()).toBe(false);
        expect(prefersMoreContrast()).toBe(false);
    });
});
