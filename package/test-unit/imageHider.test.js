import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    toggleImages,
    initImageHider,
    showImages,
    areImagesHidden,
    stopImageObserver
} from "../js/imageHider.js";

const STORAGE_KEY = "ui5-smart-access-images-hidden";

describe("imageHider — toggleImages / persistence", () => {
    beforeEach(() => {
        // Reset module singleton (imagesHidden + observer) between tests.
        showImages();
        stopImageObserver();
        localStorage.clear();
    });

    it("hides matching images and returns true, then shows them and returns false", () => {
        document.body.innerHTML = '<img id="page" src="x.png">';
        const img = document.getElementById("page");

        expect(toggleImages()).toBe(true);
        expect(img.style.visibility).toBe("hidden");
        expect(areImagesHidden()).toBe(true);

        expect(toggleImages()).toBe(false);
        expect(img.style.visibility).toBe("");
        expect(areImagesHidden()).toBe(false);
    });

    it("persists the hidden state to localStorage", () => {
        document.body.innerHTML = '<img id="page" src="x.png">';
        toggleImages();
        expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
        toggleImages();
        expect(localStorage.getItem(STORAGE_KEY)).toBe("false");
    });

    it("initImageHider re-hides on load when the stored pref is 'true'", () => {
        localStorage.setItem(STORAGE_KEY, "true");
        document.body.innerHTML = '<img id="page" src="x.png">';
        initImageHider();
        expect(document.getElementById("page").style.visibility).toBe("hidden");
        expect(areImagesHidden()).toBe(true);
    });

    it("initImageHider leaves images visible when the stored pref is absent", () => {
        document.body.innerHTML = '<img id="page" src="x.png">';
        initImageHider();
        expect(document.getElementById("page").style.visibility).toBe("");
        expect(areImagesHidden()).toBe(false);
    });

    it("keeps popover BUTTON icons visible but hides popover DECORATIVE images (shouldSkip)", () => {
        // shouldSkip: page elements are always hidden; inside the popover only
        // elements inside a `.sapMBtn` are skipped (icon-only control buttons),
        // while decorative popover images are still hidden.
        document.body.innerHTML = `
            <img id="page" src="x.png">
            <div class="abicsAccessibilityPopover">
                <span id="deco" class="sapUiIcon"></span>
                <div class="sapMBtn"><span id="btnIcon" class="sapMBtnIcon"></span></div>
            </div>
        `;
        toggleImages();
        expect(document.getElementById("page").style.visibility).toBe("hidden");
        expect(document.getElementById("deco").style.visibility).toBe("hidden");
        expect(document.getElementById("btnIcon").style.visibility).toBe("");
    });
});

describe("imageHider — degraded storage (must not throw)", () => {
    beforeEach(() => {
        showImages();
        stopImageObserver();
    });

    afterEach(() => vi.restoreAllMocks());

    it("initImageHider does not throw when getItem throws", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new DOMException("SecurityError");
        });
        expect(() => initImageHider()).not.toThrow();
    });

    it("toggleImages does not throw when setItem throws", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("QuotaExceededError");
        });
        document.body.innerHTML = '<img id="page" src="x.png">';
        expect(() => toggleImages()).not.toThrow();
    });
});
