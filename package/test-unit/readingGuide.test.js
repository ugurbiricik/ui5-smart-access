import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    setReadingGuide,
    resetReadingGuide,
    getReadingGuideMode
} from "../js/readingGuide.js";

const GUIDE_ID = "ui5-smart-access-reading-guide";
const MASK_TOP_ID = "ui5-smart-access-mask-top";
const MASK_BOTTOM_ID = "ui5-smart-access-mask-bottom";

const $ = (id) => document.getElementById(id);

describe("readingGuide", () => {
    beforeEach(() => {
        // Reset module state (mode + mousemove handler) left over from prior tests.
        resetReadingGuide();
    });

    afterEach(() => {
        resetReadingGuide();
        vi.restoreAllMocks();
    });

    it("'guide' mode appends a single ruler overlay and reflects the mode", () => {
        setReadingGuide("guide");
        expect($(GUIDE_ID)).toBeTruthy();
        expect($(GUIDE_ID).getAttribute("data-ui5-smart-access")).toBe("reading-aid");
        expect($(MASK_TOP_ID)).toBeNull();
        expect($(MASK_BOTTOM_ID)).toBeNull();
        expect(getReadingGuideMode()).toBe("guide");
    });

    it("'mask' mode appends top and bottom dimming overlays", () => {
        setReadingGuide("mask");
        expect($(MASK_TOP_ID)).toBeTruthy();
        expect($(MASK_BOTTOM_ID)).toBeTruthy();
        expect($(GUIDE_ID)).toBeNull();
        expect(getReadingGuideMode()).toBe("mask");
    });

    it("switching modes tears down the previous overlays", () => {
        setReadingGuide("guide");
        expect($(GUIDE_ID)).toBeTruthy();
        setReadingGuide("mask");
        expect($(GUIDE_ID)).toBeNull();
        expect($(MASK_TOP_ID)).toBeTruthy();
    });

    it("'none' / resetReadingGuide removes every overlay and resets the mode", () => {
        setReadingGuide("mask");
        setReadingGuide("none");
        expect($(GUIDE_ID)).toBeNull();
        expect($(MASK_TOP_ID)).toBeNull();
        expect($(MASK_BOTTOM_ID)).toBeNull();
        expect(getReadingGuideMode()).toBe("none");

        setReadingGuide("guide");
        resetReadingGuide();
        expect($(GUIDE_ID)).toBeNull();
        expect(getReadingGuideMode()).toBe("none");
    });

    it("attaches a mousemove listener for 'guide' and removes it on teardown", () => {
        const add = vi.spyOn(document, "addEventListener");
        const remove = vi.spyOn(document, "removeEventListener");
        setReadingGuide("guide");
        const addedMove = add.mock.calls.filter((c) => c[0] === "mousemove");
        expect(addedMove.length).toBe(1);
        const handler = addedMove[0][1];

        setReadingGuide("none");
        expect(remove).toHaveBeenCalledWith("mousemove", handler);
    });

    it("positions the guide ruler at clientY - 2 on mousemove", () => {
        setReadingGuide("guide");
        document.dispatchEvent(new MouseEvent("mousemove", { clientY: 100 }));
        expect($(GUIDE_ID).style.top).toBe("98px");
    });

    it("shrinks the top mask above the pointer strip on mousemove", () => {
        setReadingGuide("mask");
        document.dispatchEvent(new MouseEvent("mousemove", { clientY: 200 }));
        // STRIP_HEIGHT is 80, so the readable strip starts 40px above clientY.
        expect($(MASK_TOP_ID).style.height).toBe("160px");
    });
});
