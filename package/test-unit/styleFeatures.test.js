import { describe, it, expect, beforeEach } from "vitest";
import { enableHighlightLinks, disableHighlightLinks } from "../js/highlightLinks.js";
import { enableStopAnimations, disableStopAnimations } from "../js/stopAnimations.js";

const HL_ID = "ui5-smart-access-highlight-links";
const SA_ID = "ui5-smart-access-stop-animations";
const byId = (id) => document.getElementById(id);

describe("highlightLinks", () => {
    beforeEach(() => disableHighlightLinks());

    it("enableHighlightLinks injects a <style> with the link highlight rule", () => {
        enableHighlightLinks();
        const el = byId(HL_ID);
        expect(el).toBeTruthy();
        expect(el.tagName).toBe("STYLE");
        // Links get an amber underline + soft pill background.
        expect(el.textContent).toContain("text-decoration-color: #f59e0b !important;");
        expect(el.textContent).toContain("body a,");
        // Popover links are explicitly left untouched.
        expect(el.textContent).toContain(".abicsAccessibilityPopover a,");
    });

    it("disableHighlightLinks removes the style", () => {
        enableHighlightLinks();
        disableHighlightLinks();
        expect(byId(HL_ID)).toBeNull();
    });
});

describe("stopAnimations", () => {
    beforeEach(() => disableStopAnimations());

    it("enableStopAnimations injects a <style> collapsing animation durations", () => {
        enableStopAnimations();
        const el = byId(SA_ID);
        expect(el).toBeTruthy();
        expect(el.tagName).toBe("STYLE");
        expect(el.textContent).toContain("animation-duration: 0.001s !important;");
        expect(el.textContent).toContain("transition-duration: 0.001s !important;");
    });

    it("disableStopAnimations removes the style", () => {
        enableStopAnimations();
        disableStopAnimations();
        expect(byId(SA_ID)).toBeNull();
    });
});
