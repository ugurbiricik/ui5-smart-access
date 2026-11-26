import { describe, it, expect } from "vitest";
import {
    buildContrastColors,
    buildContrastSchemes,
    findSchemeId,
    schemeLabelKey,
    buildSwatchCss
} from "../js/contrastSwatches.js";
import { getContrastRatio, getWcagLevel } from "../js/contrast.js";

describe("getWcagLevel", () => {
    it("maps ratios to the WCAG 2.x thresholds", () => {
        expect(getWcagLevel(21)).toBe("AAA");
        expect(getWcagLevel(7)).toBe("AAA");
        expect(getWcagLevel(6.99)).toBe("AAA");
        expect(getWcagLevel(6.9)).toBe("AA");
        expect(getWcagLevel(4.5)).toBe("AA");
        expect(getWcagLevel(4.4)).toBe("AALarge");
        expect(getWcagLevel(3)).toBe("AALarge");
        expect(getWcagLevel(2.9)).toBe("fail");
        expect(getWcagLevel(1)).toBe("fail");
    });

    it("rounds like the displayed ratio, so 6.96 shown as 7.0:1 is AAA", () => {
        const { ratio, ratioText } = getContrastRatio("#ffffff", "#595959");
        expect(ratioText).toBe("7.0:1");
        expect(getWcagLevel(ratio)).toBe("AAA");
    });
});

describe("contrast schemes", () => {
    const schemes = buildContrastSchemes();

    it("starts with Off, ends with Custom, every entry has a label key", () => {
        expect(schemes[0].id).toBe("off");
        expect(schemes[schemes.length - 1].id).toBe("custom");
        schemes.forEach((s) => expect(s.labelKey).toMatch(/^contrast\.scheme\./));
    });

    it("every colour scheme carries its WCAG ratio and level", () => {
        const coloured = schemes.filter((s) => s.bg);
        expect(coloured.length).toBeGreaterThanOrEqual(4);
        coloured.forEach((s) => {
            expect(s.ratio).toBe(getContrastRatio(s.bg, s.text).ratioText);
            expect(s.level).toBe("AAA");
        });
    });

    it("off and custom have no ratio", () => {
        ["off", "custom"].forEach((id) => {
            const s = schemes.find((x) => x.id === id);
            expect(s.ratio).toBe("");
            expect(s.level).toBe("");
        });
    });

    it("findSchemeId matches presets case-insensitively and falls back to custom", () => {
        expect(findSchemeId("#000000", "#FFEB3B")).toBe("yellowOnBlack");
        expect(findSchemeId("#0A3D8F", "#ffffff")).toBe("whiteOnBlue");
        expect(findSchemeId("#123456", "#ffffff")).toBe("custom");
        expect(findSchemeId("", "")).toBe("custom");
    });

    it("schemeLabelKey resolves ids", () => {
        expect(schemeLabelKey("whiteOnBlack")).toBe("contrast.scheme.whiteOnBlack");
        expect(schemeLabelKey("nope")).toBe("");
    });
});

describe("contrast colours", () => {
    it("six named colours with a DOM key", () => {
        const colors = buildContrastColors();
        expect(colors.length).toBe(6);
        colors.forEach((c) => {
            expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
            expect(c.key).toBe(c.color.slice(1));
            expect(c.nameKey).toMatch(/^contrast\.color\./);
        });
    });

    it("swatch CSS paints every scheme and colour, pressed state included", () => {
        const css = buildSwatchCss(".pop");
        buildContrastSchemes().filter((s) => s.bg).forEach((s) => {
            expect(css).toContain(`.saScheme[data-sa-scheme="${s.id}"] .sapMBtnInner.sapMToggleBtnPressed`);
            expect(css).toContain(`background-color: ${s.bg} !important`);
            expect(css).toContain(`color: ${s.text} !important`);
        });
        buildContrastColors().forEach((c) => {
            expect(css).toContain(`.saSwatch[data-sa-color="${c.key}"]`);
        });
        expect(css.split("\n").every((l) => l.startsWith(".pop "))).toBe(true);
    });
});
