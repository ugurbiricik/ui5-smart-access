import { describe, it, expect, beforeEach } from "vitest";
import {
    BIG_CURSOR_KEYS,
    buildBigCursorColors,
    setBigCursor,
    setBigCursorCustom,
    disableBigCursor
} from "../js/bigCursor.js";

const STYLE_ID = "ui5-smart-access-big-cursor";
const styleEl = () => document.getElementById(STYLE_ID);

describe("bigCursor - keys and swatch builder", () => {
    it("BIG_CURSOR_KEYS is the exact colour list", () => {
        expect(BIG_CURSOR_KEYS).toEqual(["black", "white", "blue", "green"]);
    });

    it("buildBigCursorColors returns one entry per key plus a trailing custom entry", () => {
        const list = buildBigCursorColors();
        expect(list.length).toBe(BIG_CURSOR_KEYS.length + 1);
        expect(list[list.length - 1].key).toBe("custom");
        // The named entries preserve order.
        expect(list.slice(0, BIG_CURSOR_KEYS.length).map((e) => e.key)).toEqual(BIG_CURSOR_KEYS);
    });

    it("every preview is an inline SVG data URI that decodes to an <svg>", () => {
        for (const e of buildBigCursorColors()) {
            expect(e.preview.startsWith("data:image/svg+xml,")).toBe(true);
            expect(decodeURIComponent(e.preview)).toContain("<svg");
        }
    });

    it("the black swatch embeds its own fill colour #111827", () => {
        const black = buildBigCursorColors().find((e) => e.key === "black");
        expect(decodeURIComponent(black.preview)).toContain('fill="#111827"');
    });

    it("the green swatch embeds its own fill colour #16a34a", () => {
        const green = buildBigCursorColors().find((e) => e.key === "green");
        expect(decodeURIComponent(green.preview)).toContain('fill="#16a34a"');
    });

    it("labels fall back to their i18n keys when no i18n model exists", () => {
        const black = buildBigCursorColors().find((e) => e.key === "black");
        const custom = buildBigCursorColors().find((e) => e.key === "custom");
        expect(black.label).toBe("bigCursor.black");
        expect(custom.label).toBe("bigCursor.custom");
    });
});

describe("bigCursor - setBigCursor (named colours)", () => {
    beforeEach(() => disableBigCursor());

    it("injects a <style> with a cursor url() rule and a popover-excluding cursor:auto rule", () => {
        setBigCursor("black");
        const el = styleEl();
        expect(el).toBeTruthy();
        expect(el.tagName).toBe("STYLE");
        expect(el.textContent).toContain("cursor: url(");
        expect(el.textContent).toContain(".abicsAccessibilityPopover");
        expect(el.textContent).toContain("cursor: auto");
    });

    it('removes the style for "none"', () => {
        setBigCursor("blue");
        expect(styleEl()).toBeTruthy();
        setBigCursor("none");
        expect(styleEl()).toBeNull();
    });

    it("does not inject for an unknown key", () => {
        setBigCursor("chartreuse");
        expect(styleEl()).toBeNull();
    });
});

describe("bigCursor - setBigCursorCustom / disableBigCursor", () => {
    beforeEach(() => disableBigCursor());

    it("injects a cursor style for a valid hex", () => {
        setBigCursorCustom("#abcdef");
        expect(styleEl()).toBeTruthy();
        expect(styleEl().textContent).toContain("cursor: url(");
    });

    it("removes the style for an empty value", () => {
        setBigCursorCustom("#abcdef");
        expect(styleEl()).toBeTruthy();
        setBigCursorCustom("");
        expect(styleEl()).toBeNull();
    });

    it("disableBigCursor removes an active cursor style", () => {
        setBigCursor("green");
        expect(styleEl()).toBeTruthy();
        disableBigCursor();
        expect(styleEl()).toBeNull();
    });
});
