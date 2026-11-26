import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../css/style.css"), "utf8");

let hints;
let Fragment;
let oSettingsModel;
const originalRect = HTMLElement.prototype.getBoundingClientRect;
let matches;

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

const buildPopover = (popLeft) => {
    const pop = document.createElement("div");
    pop.className = "abicsAccessibilityPopover";
    pop.getBoundingClientRect = () => rect(popLeft, 100, 360, 600);
    const row = document.createElement("div");
    row.getBoundingClientRect = () => rect(popLeft + 16, 200, 328, 48);
    pop.appendChild(row);
    document.body.appendChild(pop);
    Fragment.byId.mockImplementation((_f, id) => (id === "fontSizePanel" ? { getDomRef: () => row } : null));
    return row;
};

const enter = (el, pointerType = "mouse") => {
    const e = new Event("pointerenter");
    e.pointerType = pointerType;
    el.dispatchEvent(e);
};

const tip = () => document.querySelector(".abicsHoverHint");
const visible = () => !!(tip() && tip().classList.contains("visible") && tip().style.visibility === "visible");

beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    matches = true;
    window.matchMedia = vi.fn((q) => ({ matches: q === "(hover: hover)" ? matches : false, media: q }));
    window.innerWidth = 1920;
    window.innerHeight = 960;
    Fragment = (await import("sap/ui/core/Fragment")).default;
    oSettingsModel = (await import("../js/settingsModel.js")).oSettingsModel;
    oSettingsModel.setProperty("/navPage", "main");
    hints = await import("../js/hoverHints.js");
    HTMLElement.prototype.getBoundingClientRect = function () {
        return this.classList && this.classList.contains("abicsHoverHint") ? rect(0, 0, 280, 90) : rect(0, 0, 0, 0);
    };
});

afterEach(() => {
    vi.useRealTimers();
    HTMLElement.prototype.getBoundingClientRect = originalRect;
});

describe("hover hints", () => {
    it("waits 600 ms before showing on a mouse hover", () => {
        const row = buildPopover(1400);
        hints.attachHoverHints("frag");
        enter(row);
        vi.advanceTimersByTime(599);
        expect(visible()).toBe(false);
        vi.advanceTimersByTime(1);
        expect(visible()).toBe(true);
        expect(tip().textContent).not.toMatch(/Alt/);
    });

    it("never shows for touch or pen pointers", () => {
        const row = buildPopover(1400);
        hints.attachHoverHints("frag");
        enter(row, "touch");
        enter(row, "pen");
        vi.advanceTimersByTime(2000);
        expect(visible()).toBe(false);
    });

    it("never shows on devices without hover", () => {
        matches = false;
        const row = buildPopover(1400);
        hints.attachHoverHints("frag");
        enter(row);
        vi.advanceTimersByTime(2000);
        expect(visible()).toBe(false);
        expect(css).toMatch(/@media \(hover: none\)\s*\{\s*\.abicsHoverHint\s*\{\s*display: none;/);
    });

    it("is cancelled when the pointer leaves or presses before the delay", () => {
        const row = buildPopover(1400);
        hints.attachHoverHints("frag");
        enter(row);
        vi.advanceTimersByTime(300);
        row.dispatchEvent(new Event("pointerleave"));
        vi.advanceTimersByTime(1000);
        expect(visible()).toBe(false);
        enter(row);
        vi.advanceTimersByTime(300);
        row.dispatchEvent(new Event("pointerdown"));
        vi.advanceTimersByTime(1000);
        expect(visible()).toBe(false);
    });

    it("does not show once a detail page is open", () => {
        const row = buildPopover(1400);
        hints.attachHoverHints("frag");
        enter(row);
        oSettingsModel.setProperty("/navPage", "font");
        vi.advanceTimersByTime(1000);
        expect(visible()).toBe(false);
        enter(row);
        vi.advanceTimersByTime(1000);
        expect(visible()).toBe(false);
    });

    it("hideHint cancels a pending hint", () => {
        const row = buildPopover(1400);
        hints.attachHoverHints("frag");
        enter(row);
        hints.hideHint();
        vi.advanceTimersByTime(1000);
        expect(visible()).toBe(false);
    });

    it("sits left of the popover, or flips right when the left is too narrow", () => {
        const row = buildPopover(1400);
        hints.attachHoverHints("frag");
        enter(row);
        vi.advanceTimersByTime(600);
        expect(parseFloat(tip().style.left) + 280).toBeLessThanOrEqual(1400);
        expect(tip().classList.contains("flip")).toBe(false);
        hints.hideHint();
        document.body.innerHTML = "";
        const row2 = buildPopover(100);
        hints.attachHoverHints("frag2");
        enter(row2);
        vi.advanceTimersByTime(600);
        expect(parseFloat(tip().style.left)).toBeGreaterThanOrEqual(460);
        expect(tip().classList.contains("flip")).toBe(true);
    });

    it("placeHint never overlaps the popover", () => {
        const tipRect = { width: 280, height: 90 };
        const left = hints.placeHint({ left: 1400, right: 1760, top: 200, height: 48 }, tipRect, 1920, 960);
        expect(left.side).toBe("left");
        expect(left.left + 280).toBeLessThanOrEqual(1400);
        const right = hints.placeHint({ left: 100, right: 460, top: 200, height: 48 }, tipRect, 1920, 960);
        expect(right.side).toBe("right");
        expect(right.left).toBeGreaterThanOrEqual(460);
        expect(hints.placeHint({ left: 15, right: 375, top: 200, height: 48 }, tipRect, 390, 844)).toBeNull();
        const low = hints.placeHint({ left: 1400, right: 1760, top: 940, height: 48 }, tipRect, 1920, 960);
        expect(low.top + 90).toBeLessThanOrEqual(952);
    });

    it("stays hidden when there is no room beside the popover", () => {
        window.innerWidth = 390;
        const row = buildPopover(15);
        hints.attachHoverHints("frag");
        enter(row);
        vi.advanceTimersByTime(1000);
        expect(visible()).toBe(false);
    });
});
