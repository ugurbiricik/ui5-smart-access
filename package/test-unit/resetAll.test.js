import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock every feature module resetAll.js pulls in, so we can assert resetAll()
// fans out to exactly the expected reset/disable calls. Factories are hoisted
// by vi.mock, so each export is a fresh vi.fn().
vi.mock("../js/fontsize.js", () => ({ onResetFontSize: vi.fn() }));
vi.mock("../js/textToSpeech.js", () => ({
    stopReading: vi.fn(),
    setTTSRate: vi.fn(),
    setTTSVolume: vi.fn(),
    disableHoverRead: vi.fn()
}));
vi.mock("../js/colorBlindness.js", () => ({ resetColorBlindness: vi.fn() }));
vi.mock("../js/blueLightFilter.js", () => ({ disableBlueLightFilter: vi.fn() }));
vi.mock("../js/nightMode.js", () => ({ disableNightMode: vi.fn() }));
vi.mock("../js/imageHider.js", () => ({ showImages: vi.fn() }));
vi.mock("../js/contrast.js", () => ({
    removeCustomContrast: vi.fn(),
    isContrastModeActive: vi.fn(() => false),
    toggleContrastMode: vi.fn()
}));
vi.mock("../js/filterManager.js", () => ({ clearAllFilters: vi.fn() }));
vi.mock("../js/textSpacing.js", () => ({ resetTextSpacing: vi.fn() }));
vi.mock("../js/bigCursor.js", () => ({ disableBigCursor: vi.fn() }));
vi.mock("../js/highlightLinks.js", () => ({ disableHighlightLinks: vi.fn() }));
vi.mock("../js/stopAnimations.js", () => ({ disableStopAnimations: vi.fn() }));
vi.mock("../js/readingGuide.js", () => ({ resetReadingGuide: vi.fn() }));
vi.mock("../js/typography.js", () => ({ resetTypography: vi.fn() }));

import { resetAll } from "../js/resetAll.js";
import { onResetFontSize } from "../js/fontsize.js";
import { stopReading, setTTSRate, setTTSVolume, disableHoverRead } from "../js/textToSpeech.js";
import { resetColorBlindness } from "../js/colorBlindness.js";
import { disableBlueLightFilter } from "../js/blueLightFilter.js";
import { disableNightMode } from "../js/nightMode.js";
import { showImages } from "../js/imageHider.js";
import { removeCustomContrast, isContrastModeActive, toggleContrastMode } from "../js/contrast.js";
import { clearAllFilters } from "../js/filterManager.js";
import { resetTextSpacing } from "../js/textSpacing.js";
import { disableBigCursor } from "../js/bigCursor.js";
import { disableHighlightLinks } from "../js/highlightLinks.js";
import { disableStopAnimations } from "../js/stopAnimations.js";
import { resetReadingGuide } from "../js/readingGuide.js";
import { resetTypography } from "../js/typography.js";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("resetAll — fans out to every feature reset", () => {
    it("calls each feature's reset/disable handler", () => {
        isContrastModeActive.mockReturnValue(false);
        resetAll();

        expect(onResetFontSize).toHaveBeenCalledTimes(1);
        expect(stopReading).toHaveBeenCalledTimes(1);
        expect(disableHoverRead).toHaveBeenCalledTimes(1);
        expect(resetColorBlindness).toHaveBeenCalledTimes(1);
        expect(disableBlueLightFilter).toHaveBeenCalledTimes(1);
        expect(clearAllFilters).toHaveBeenCalledTimes(1);
        expect(disableNightMode).toHaveBeenCalledTimes(1);
        expect(showImages).toHaveBeenCalledTimes(1);
        expect(removeCustomContrast).toHaveBeenCalledTimes(1);
        expect(resetTextSpacing).toHaveBeenCalledTimes(1);
        expect(disableBigCursor).toHaveBeenCalledTimes(1);
        expect(disableHighlightLinks).toHaveBeenCalledTimes(1);
        expect(disableStopAnimations).toHaveBeenCalledTimes(1);
        expect(resetReadingGuide).toHaveBeenCalledTimes(1);
        expect(resetTypography).toHaveBeenCalledTimes(1);
    });

    it("resets the TTS rate and volume back to 1", () => {
        isContrastModeActive.mockReturnValue(false);
        resetAll();
        expect(setTTSRate).toHaveBeenCalledWith(1);
        expect(setTTSVolume).toHaveBeenCalledWith(1);
    });
});

describe("resetAll — contrast-mode toggle guard", () => {
    it("toggles contrast mode OFF only when it is currently active", () => {
        isContrastModeActive.mockReturnValue(true);
        resetAll();
        expect(toggleContrastMode).toHaveBeenCalledTimes(1);
    });

    it("does NOT toggle contrast mode when it is inactive", () => {
        isContrastModeActive.mockReturnValue(false);
        resetAll();
        expect(toggleContrastMode).not.toHaveBeenCalled();
    });
});
