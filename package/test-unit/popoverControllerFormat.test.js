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
        if (t === undefined) return key;
        return t.replace(/\{(\d)\}/g, (_m, i) => String(params[i]));
    }
}));

const { popoverInternalController: c } = await import("../js/popoverController.js");

describe("popoverController - formatTtsRate", () => {
    it('shows the default speed 1 as "Normal"', () => {
        expect(c.formatTtsRate(1)).toBe("Normal");
        expect(c.formatTtsRate(null)).toBe("Normal");
        expect(c.formatTtsRate(undefined)).toBe("Normal");
    });
    it("shows other speeds as a multiplier without float noise", () => {
        expect(c.formatTtsRate(1.5)).toBe("1.5×");
        expect(c.formatTtsRate(0.75)).toBe("0.75×");
        expect(c.formatTtsRate(1.2000000000000002)).toBe("1.2×");
    });
});

describe("popoverController - percentage formatters", () => {
    it("formatTtsVolume uses the language's percent format", () => {
        expect(c.formatTtsVolume(1)).toBe("100 %");
        expect(c.formatTtsVolume(0)).toBe("0 %");
        expect(c.formatTtsVolume(0.25)).toBe("25 %");
        expect(c.formatTtsVolume(null)).toBe("100 %");
        lang = "en";
        expect(c.formatTtsVolume(0.5)).toBe("50%");
        lang = "de";
    });
    it("formatPercent / formatPlusPercent", () => {
        expect(c.formatPercent(125)).toBe("125 %");
        expect(c.formatPercent(undefined)).toBe("0 %");
        expect(c.formatPlusPercent(20)).toBe("+20 %");
    });
});
