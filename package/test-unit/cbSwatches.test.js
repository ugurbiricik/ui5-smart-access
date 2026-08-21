import { describe, it, expect } from "vitest";
import { buildColorBlindnessModes } from "../js/cbSwatches.js";

describe("cbSwatches - buildColorBlindnessModes", () => {
    it("builds exactly four modes in the expected order", () => {
        const modes = buildColorBlindnessModes();
        expect(modes.length).toBe(4);
        expect(modes.map((m) => m.key)).toEqual([
            "protanomaly",
            "deuteranomaly",
            "tritanomaly",
            "grayscale"
        ]);
    });

    it("each mode has title, sub and icon", () => {
        for (const m of buildColorBlindnessModes()) {
            expect(typeof m.title).toBe("string");
            expect(typeof m.sub).toBe("string");
            expect(typeof m.icon).toBe("string");
        }
    });

    it("each icon is an inline SVG data URI decoding to an <svg>", () => {
        for (const m of buildColorBlindnessModes()) {
            expect(m.icon.startsWith("data:image/svg+xml,")).toBe(true);
            expect(decodeURIComponent(m.icon)).toContain("<svg");
        }
    });

    it("each swatch draws 20 circles (18 dots + clip circle + background circle)", () => {
        for (const m of buildColorBlindnessModes()) {
            const decoded = decodeURIComponent(m.icon);
            const circles = decoded.match(/<circle/g) || [];
            expect(circles.length).toBe(20);
        }
    });

    it("title and sub fall back to their i18n keys when no i18n model exists", () => {
        const modes = buildColorBlindnessModes();
        const prot = modes.find((m) => m.key === "protanomaly");
        expect(prot.title).toBe("colorBlindness.protanomaly.title");
        expect(prot.sub).toBe("colorBlindness.protanomaly.sub");
        const gray = modes.find((m) => m.key === "grayscale");
        expect(gray.title).toBe("colorBlindness.grayscale.title");
        expect(gray.sub).toBe("colorBlindness.grayscale.sub");
    });
});
