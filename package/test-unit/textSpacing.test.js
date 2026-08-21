import { describe, it, expect, beforeEach } from "vitest";
import { applyTextSpacing, resetTextSpacing } from "../js/textSpacing.js";

const STYLE_ID = "ui5-smart-access-text-spacing";
const css = () => {
    const el = document.getElementById(STYLE_ID);
    return el ? el.textContent : null;
};

describe("textSpacing", () => {
    beforeEach(() => resetTextSpacing());

    it("applyTextSpacing('moderate') injects the WCAG-target values", () => {
        applyTextSpacing("moderate");
        const text = css();
        expect(text).toBeTruthy();
        // LEVELS.moderate = { line: 1.8, letter: 0.12, word: 0.16, para: 2 }
        expect(text).toContain("line-height: 1.8 !important;");
        expect(text).toContain("letter-spacing: 0.12em !important;");
        expect(text).toContain("word-spacing: 0.16em !important;");
        expect(text).toContain("margin-bottom: 2em !important;");
    });

    it("applyTextSpacing('light') injects the light-tier values", () => {
        applyTextSpacing("light");
        const text = css();
        // LEVELS.light = { line: 1.5, letter: 0.06, word: 0.1, para: 1.5 }
        expect(text).toContain("line-height: 1.5 !important;");
        expect(text).toContain("letter-spacing: 0.06em !important;");
        expect(text).toContain("word-spacing: 0.1em !important;");
        expect(text).toContain("margin-bottom: 1.5em !important;");
    });

    it("applyTextSpacing('heavy') injects the heavy-tier values", () => {
        applyTextSpacing("heavy");
        const text = css();
        // LEVELS.heavy = { line: 2.2, letter: 0.18, word: 0.24, para: 2.5 }
        expect(text).toContain("line-height: 2.2 !important;");
        expect(text).toContain("letter-spacing: 0.18em !important;");
        expect(text).toContain("word-spacing: 0.24em !important;");
        expect(text).toContain("margin-bottom: 2.5em !important;");
    });

    it("includes the popover reset block", () => {
        applyTextSpacing("moderate");
        const text = css();
        expect(text).toContain(".abicsAccessibilityPopover, .abicsAccessibilityPopover *");
        expect(text).toContain("line-height: normal !important;");
        expect(text).toContain("letter-spacing: normal !important;");
        expect(text).toContain("word-spacing: normal !important;");
    });

    it("applyTextSpacing('none') removes any injected style", () => {
        applyTextSpacing("moderate");
        expect(css()).toBeTruthy();
        applyTextSpacing("none");
        expect(css()).toBeNull();
    });

    it("an unknown level removes any injected style", () => {
        applyTextSpacing("moderate");
        applyTextSpacing("gargantuan");
        expect(css()).toBeNull();
    });

    it("resetTextSpacing removes the style", () => {
        applyTextSpacing("heavy");
        resetTextSpacing();
        expect(css()).toBeNull();
    });
});
