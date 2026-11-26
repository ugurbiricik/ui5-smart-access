import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const load = (file) => Object.fromEntries(
    readFileSync(resolve(__dirname, "../i18n", file), "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const bundles = { de: load("i18n_de.properties"), en: load("i18n_en.properties") };
let lang = "de";

vi.mock("../js/i18nModel.js", () => ({
    getText: (key, params = []) => {
        const t = bundles[lang][key];
        if (t === undefined) throw new Error("missing i18n key " + key);
        return t.replace(/\{(\d)\}/g, (_m, i) => String(params[i]));
    }
}));

const s = await import("../js/rowStatus.js");

describe("row status lines (de)", () => {
    it("font: Standard when nothing changed, otherwise the changed values", () => {
        lang = "de";
        expect(s.fontStatus(0, 100, 0, 0, 0, "none")).toBe("Standard");
        expect(s.fontStatus(20, 100, 0, 0, 0, "none")).toBe("Schrift 120 %");
        expect(s.fontStatus(-10, 150, 0, 10, 0, "left")).toBe("Schrift 90 % · Zoom 150 % · Abstände angepasst · Ausrichtung");
        expect(s.fontStatus(undefined, undefined, undefined, undefined, undefined, undefined)).toBe("Standard");
    });

    it("reading aid, cursor, tts", () => {
        expect(s.readingGuideStatus("none")).toBe("Aus");
        expect(s.readingGuideStatus("mask")).toBe("Lesemaske");
        expect(s.bigCursorStatus("none")).toBe("Aus");
        expect(s.bigCursorStatus("red")).toBe("Rot");
        expect(s.bigCursorStatus("custom")).toBe("Eigene Farbe");
        expect(s.ttsStatus(false, false)).toBe("Aus");
        expect(s.ttsStatus(false, true)).toBe("Hover-Lesen an");
        expect(s.ttsStatus(true, true)).toBe("Liest vor");
    });

    it("colour filters show mode and strength only when on", () => {
        expect(s.colorBlindnessStatus("none", 100)).toBe("Aus");
        expect(s.colorBlindnessStatus("deuteranomaly", 80)).toBe("Grünschwäche · 80 %");
        expect(s.colorBlindnessStatus("bogus", 80)).toBe("Aus");
        expect(s.blueLightFilterStatus(false, 50)).toBe("Aus");
        expect(s.blueLightFilterStatus(true, 35)).toBe("An · 35 %");
    });

    it("contrast names the HC theme or the custom ratio", () => {
        expect(s.contrastStatus(false, "", "21:1")).toBe("Aus");
        expect(s.contrastStatus(true, "hcb", "21:1")).toBe("Hoher Kontrast Schwarz");
        expect(s.contrastStatus(true, "", "19.6:1")).toBe("Eigene Farben · 19.6:1");
    });

    it("on/off rows", () => {
        expect(s.toggleStatus(true)).toBe("An");
        expect(s.toggleStatus(false)).toBe("Aus");
        expect(s.toggleStatus(undefined)).toBe("Aus");
    });
});

describe("row status lines (en)", () => {
    it("uses the English bundle and percent format", () => {
        lang = "en";
        expect(s.fontStatus(0, 120, 0, 0, 0, "none")).toBe("Zoom 120%");
        expect(s.colorBlindnessStatus("grayscale", 100)).toBe("Grayscale · 100%");
        expect(s.toggleStatus(true)).toBe("On");
        lang = "de";
    });
});
