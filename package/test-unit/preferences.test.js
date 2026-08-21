import { describe, it, expect, vi, afterEach } from "vitest";
import { savePref, loadPref, clearPrefs } from "../js/preferences.js";

const KEY = "ui5-smart-access-preferences";

describe("preferences (localStorage persistence)", () => {
    it("saves and loads a value", () => {
        savePref("a", 1);
        expect(loadPref("a")).toBe(1);
    });

    it("returns the default for a missing key", () => {
        expect(loadPref("missing", "def")).toBe("def");
    });

    it("returns a stored falsy value, not the default (hasOwnProperty)", () => {
        savePref("flag", false);
        expect(loadPref("flag", true)).toBe(false);
    });

    it("merges multiple keys into one blob", () => {
        savePref("a", 1);
        savePref("b", 2);
        expect(loadPref("a")).toBe(1);
        expect(loadPref("b")).toBe(2);
    });

    it("clearPrefs removes everything", () => {
        savePref("a", 1);
        clearPrefs();
        expect(loadPref("a", "gone")).toBe("gone");
    });

    it("survives corrupt JSON in storage (returns default)", () => {
        localStorage.setItem(KEY, "{not valid json");
        expect(loadPref("a", "fallback")).toBe("fallback");
    });
});

describe("preferences — degraded environments (must not throw)", () => {
    afterEach(() => vi.restoreAllMocks());

    it("savePref does not throw when setItem throws (quota / private mode)", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("QuotaExceededError");
        });
        expect(() => savePref("a", 1)).not.toThrow();
    });

    it("loadPref returns default when getItem throws", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new DOMException("SecurityError");
        });
        expect(loadPref("a", "safe")).toBe("safe");
    });

    it("clearPrefs does not throw when removeItem throws", () => {
        vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
            throw new DOMException("SecurityError");
        });
        expect(() => clearPrefs()).not.toThrow();
    });
});
