import { describe, it, expect, beforeEach } from "vitest";
import {
    setTypoZoom,
    setTypoFontPct,
    setTypoLineHeight,
    setTypoWordSpacing,
    setTypoLetterSpacing,
    setTypoAlign,
    resetTypography,
    isTypographyActive
} from "../js/typography.js";

const STYLE_ID = "ui5-smart-access-typography";
const css = () => {
    const el = document.getElementById(STYLE_ID);
    return el ? el.textContent : null;
};

describe("typography", () => {
    // Module-level `state` persists across tests within this file; reset it.
    beforeEach(() => resetTypography());

    it("is inactive at defaults", () => {
        expect(isTypographyActive()).toBe(false);
        expect(css()).toBeNull();
    });

    it("setTypoLineHeight makes it active and injects the computed line-height", () => {
        setTypoLineHeight(50);
        expect(isTypographyActive()).toBe(true);
        // (1.2 + (50/100)*1.2).toFixed(2) === "1.80"
        expect(css()).toContain("line-height: 1.80 !important;");
    });

    it("setTypoWordSpacing injects the computed em value", () => {
        setTypoWordSpacing(100);
        // ((100/100)*0.5).toFixed(3) === "0.500"
        expect(css()).toContain("word-spacing: 0.500em !important;");
    });

    it("setTypoLetterSpacing injects the computed em value", () => {
        setTypoLetterSpacing(100);
        // ((100/100)*0.3).toFixed(3) === "0.300"
        expect(css()).toContain("letter-spacing: 0.300em !important;");
    });

    it("setTypoFontPct sets and clears the root font-size", () => {
        setTypoFontPct(100);
        // (100 + 100*0.5).toFixed(1) === "150.0%"; jsdom normalizes to "150%"
        expect(document.documentElement.style.fontSize).toBe("150%");
        setTypoFontPct(0);
        expect(document.documentElement.style.fontSize).toBe("");
    });

    it("setTypoZoom scales body and counter-zooms the static UIArea", () => {
        const staticArea = document.createElement("div");
        staticArea.id = "sap-ui-static";
        document.body.appendChild(staticArea);
        setTypoZoom(200);
        expect(document.body.style.zoom).toBe("2");
        expect(staticArea.style.zoom).toBe("0.5");
    });

    it("setTypoAlign('center') injects text-align:center and 'none' removes it", () => {
        setTypoAlign("center");
        expect(css()).toContain("text-align: center !important;");
        setTypoAlign("none");
        // With no other active feature, the empty CSS removes the style entirely.
        expect(css()).toBeNull();
        expect(isTypographyActive()).toBe(false);
    });

    it("the injected CSS carries the popover reset block", () => {
        setTypoLineHeight(50);
        expect(css()).toContain(".abicsAccessibilityPopover");
        expect(css()).toContain("line-height: normal !important;");
    });

    it("resetTypography clears everything", () => {
        const staticArea = document.createElement("div");
        staticArea.id = "sap-ui-static";
        document.body.appendChild(staticArea);
        setTypoLineHeight(50);
        setTypoFontPct(100);
        setTypoZoom(200);
        resetTypography();
        expect(isTypographyActive()).toBe(false);
        expect(css()).toBeNull();
        expect(document.documentElement.style.fontSize).toBe("");
        expect(document.body.style.zoom).toBe("");
        expect(staticArea.style.zoom).toBe("");
    });
});
