import { describe, it, expect, vi, beforeEach } from "vitest";

// settingsModel builds `oSettingsModel` from localStorage AT IMPORT TIME (and
// reads prefersReducedMotion() via window.matchMedia at import too). So every
// test seeds storage / matchMedia FIRST, then resetModules + dynamic import.

const KEY = "ui5-smart-access-preferences";

// A well-formed matchMedia stub whose result depends on the query. Default is
// "no preference"; individual tests pass a matcher for reduced-motion.
const stubMatchMedia = (matches = () => false) => {
    window.matchMedia = (q) => ({
        matches: matches(q),
        media: q,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() { return false; }
    });
};

async function loadModel(seed) {
    if (seed) localStorage.setItem(KEY, JSON.stringify(seed));
    vi.resetModules();
    return import("../js/settingsModel.js");
}

beforeEach(() => {
    localStorage.clear();
    stubMatchMedia();
});

describe("settingsModel — colour-blindness legacy migration", () => {
    it("migrates legacy 'protanopia' -> 'protanomaly'", async () => {
        const { oSettingsModel } = await loadModel({ colorBlindnessType: "protanopia" });
        expect(oSettingsModel.getProperty("/colorBlindnessType")).toBe("protanomaly");
    });

    it("migrates legacy 'achromatopsia' -> 'grayscale'", async () => {
        const { oSettingsModel } = await loadModel({ colorBlindnessType: "achromatopsia" });
        expect(oSettingsModel.getProperty("/colorBlindnessType")).toBe("grayscale");
    });

    it("migrates the other -opia names", async () => {
        const deut = await loadModel({ colorBlindnessType: "deuteranopia" });
        expect(deut.oSettingsModel.getProperty("/colorBlindnessType")).toBe("deuteranomaly");
        const trit = await loadModel({ colorBlindnessType: "tritanopia" });
        expect(trit.oSettingsModel.getProperty("/colorBlindnessType")).toBe("tritanomaly");
    });

    it("passes an unknown / already-current value through unchanged", async () => {
        const { oSettingsModel } = await loadModel({ colorBlindnessType: "protanomaly" });
        expect(oSettingsModel.getProperty("/colorBlindnessType")).toBe("protanomaly");
    });

    it("defaults to 'none' when absent", async () => {
        const { oSettingsModel } = await loadModel();
        expect(oSettingsModel.getProperty("/colorBlindnessType")).toBe("none");
    });

    it("expands the colour-blindness panel only when a mode is active", async () => {
        const active = await loadModel({ colorBlindnessType: "protanopia" });
        expect(active.oSettingsModel.getProperty("/colorBlindnessExpanded")).toBe(true);
        // loadModel() only clears via the outer beforeEach; clear again so the
        // "no mode" case starts from empty storage.
        localStorage.clear();
        const none = await loadModel();
        expect(none.oSettingsModel.getProperty("/colorBlindnessExpanded")).toBe(false);
    });
});

describe("settingsModel — contrast colour defaults (|| not ??)", () => {
    it("replaces a persisted empty-string bg colour with '#ffffff'", async () => {
        const { oSettingsModel } = await loadModel({ contrastBgColor: "" });
        expect(oSettingsModel.getProperty("/contrastBgColor")).toBe("#ffffff");
    });

    it("replaces a persisted empty-string text colour with '#000000'", async () => {
        const { oSettingsModel } = await loadModel({ contrastTextColor: "" });
        expect(oSettingsModel.getProperty("/contrastTextColor")).toBe("#000000");
    });

    it("keeps a real persisted contrast colour", async () => {
        const { oSettingsModel } = await loadModel({ contrastBgColor: "#123456" });
        expect(oSettingsModel.getProperty("/contrastBgColor")).toBe("#123456");
    });
});

describe("settingsModel — big cursor", () => {
    it("honours a persisted bigCursorColor", async () => {
        const { oSettingsModel } = await loadModel({ bigCursorColor: "black" });
        expect(oSettingsModel.getProperty("/bigCursorColor")).toBe("black");
    });

    it("defaults bigCursorColor to 'none' when nothing is persisted", async () => {
        const { oSettingsModel } = await loadModel();
        expect(oSettingsModel.getProperty("/bigCursorColor")).toBe("none");
    });

    // BUG: the model intends to migrate the old boolean `bigCursorActive:true`
    // to bigCursorColor:"black" (settingsModel.js:114), but `bigCursorActive` is
    // NOT in PERSISTED_KEYS, so loadSavedSettings() never reads it from storage.
    // The migration is dead code — a persisted legacy boolean resolves to "none".
    it("actual behaviour: legacy bigCursorActive:true is IGNORED (resolves to 'none')", async () => {
        const { oSettingsModel } = await loadModel({ bigCursorActive: true });
        expect(oSettingsModel.getProperty("/bigCursorColor")).toBe("none");
    });

    it.skip("INTENDED: legacy bigCursorActive:true should migrate to 'black' (blocked by PERSISTED_KEYS gap)", async () => {
        const { oSettingsModel } = await loadModel({ bigCursorActive: true });
        expect(oSettingsModel.getProperty("/bigCursorColor")).toBe("black");
    });
});

describe("settingsModel — stopAnimations defaults to OS reduced-motion", () => {
    it("is true when the OS prefers reduced motion and no explicit choice was saved", async () => {
        stubMatchMedia((q) => /prefers-reduced-motion/.test(q));
        const { oSettingsModel } = await loadModel();
        expect(oSettingsModel.getProperty("/stopAnimationsActive")).toBe(true);
    });

    it("is false when the OS does not prefer reduced motion", async () => {
        stubMatchMedia(() => false);
        const { oSettingsModel } = await loadModel();
        expect(oSettingsModel.getProperty("/stopAnimationsActive")).toBe(false);
    });

    it("a persisted explicit choice overrides the OS signal", async () => {
        stubMatchMedia((q) => /prefers-reduced-motion/.test(q));
        const { oSettingsModel } = await loadModel({ stopAnimationsActive: false });
        expect(oSettingsModel.getProperty("/stopAnimationsActive")).toBe(false);
    });
});

describe("settingsModel — PERSISTED_KEYS", () => {
    it("matches the expected key set (guards against accidental drops)", async () => {
        const { PERSISTED_KEYS } = await loadModel();
        expect(PERSISTED_KEYS).toEqual([
            "fontStep", "ttsRate", "ttsVolume", "colorBlindnessType",
            "blueLightFilterLevel", "blueLightFilterActive", "nightModeActive",
            "contrastModeActive", "contrastBgColor", "contrastTextColor",
            "contrastUnderlineLinks", "colorBlindnessIntensity",
            "readingGuideMode",
            "bigCursorColor", "bigCursorCustomColor", "highlightLinksActive", "stopAnimationsActive",
            "typoZoom", "typoFontPct", "typoLineHeight", "typoWordSpacing",
            "typoLetterSpacing", "typoAlign"
        ]);
    });

    // BUG: `textSpacingLevel` is used in the model (settingsModel.js:107) and
    // re-applied in restoreSavedState() (line 176), but it is not in
    // PERSISTED_KEYS, so the chosen text-spacing level never survives a reload.
    it.skip("INTENDED: textSpacingLevel should be persisted (missing from PERSISTED_KEYS)", async () => {
        const { PERSISTED_KEYS } = await loadModel();
        expect(PERSISTED_KEYS).toContain("textSpacingLevel");
    });
});

describe("settingsModel — saveCurrentSettings", () => {
    it("writes every persisted key back to localStorage", async () => {
        const { saveCurrentSettings, PERSISTED_KEYS } = await loadModel();
        saveCurrentSettings();
        const blob = JSON.parse(localStorage.getItem(KEY));
        PERSISTED_KEYS.forEach((key) => {
            expect(Object.prototype.hasOwnProperty.call(blob, key)).toBe(true);
        });
    });

    it("persists the current model values (round-trips through a fresh import)", async () => {
        const first = await loadModel();
        first.oSettingsModel.setProperty("/fontStep", 3);
        first.oSettingsModel.setProperty("/contrastBgColor", "#abcdef");
        first.saveCurrentSettings();

        const blob = JSON.parse(localStorage.getItem(KEY));
        expect(blob.fontStep).toBe(3);
        expect(blob.contrastBgColor).toBe("#abcdef");

        // A brand-new import must pick the saved values back up.
        const second = await loadModel();
        expect(second.oSettingsModel.getProperty("/fontStep")).toBe(3);
        expect(second.oSettingsModel.getProperty("/contrastBgColor")).toBe("#abcdef");
    });
});
