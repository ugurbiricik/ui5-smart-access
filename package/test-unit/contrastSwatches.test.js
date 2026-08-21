import { describe, it, expect } from "vitest";
import { buildContrastColors, buildContrastPresets } from "../js/contrastSwatches.js";

describe("contrastSwatches", () => {
    it("builds a colour list ending with a custom entry", () => {
        const colors = buildContrastColors();
        expect(colors.length).toBe(7);
        expect(colors[colors.length - 1].color).toBe("custom");
    });

    it("every colour swatch is an inline SVG data URI", () => {
        for (const c of buildContrastColors()) {
            expect(c.preview.startsWith("data:image/svg+xml,")).toBe(true);
            expect(decodeURIComponent(c.preview)).toContain("<svg");
        }
    });

    it("non-custom swatches embed their own colour", () => {
        for (const c of buildContrastColors()) {
            if (c.color !== "custom") {
                expect(decodeURIComponent(c.preview).toLowerCase()).toContain(c.color.toLowerCase());
            }
        }
    });

    it("builds presets each with bg, text and a data-URI preview", () => {
        const presets = buildContrastPresets();
        expect(presets.length).toBeGreaterThanOrEqual(3);
        for (const p of presets) {
            expect(p.bg).toMatch(/^#/);
            expect(p.text).toMatch(/^#/);
            expect(p.preview.startsWith("data:image/svg+xml,")).toBe(true);
        }
    });
});
