import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    initTextToSpeech,
    startReading,
    stopReading,
    enableHoverRead,
    disableHoverRead,
    isReadingActive
} from "../js/textToSpeech.js";

// A minimal settings model matching the JSONModel surface the module uses
// (single-level "/key" paths). Seeded with the runtime defaults.
const makeModel = (data = {}) => {
    const store = { ttsRate: 1, ttsVolume: 1, ttsPlaying: false, ttsHover: false, ...data };
    return {
        getProperty: (p) => store[String(p).replace(/^\//, "")],
        setProperty: (p, v) => { store[String(p).replace(/^\//, "")] = v; },
        _store: store
    };
};

const speak = () => window.speechSynthesis.speak;
const cancel = () => window.speechSynthesis.cancel;

describe("textToSpeech — full-page reading (startReading/stopReading)", () => {
    beforeEach(() => {
        // jsdom has no scrollIntoView; highlight() calls it inside speakNext.
        Element.prototype.scrollIntoView = vi.fn();
        window.speechSynthesis.speaking = false;
        window.speechSynthesis.pending = false;
        // Reset module singletons between tests.
        disableHoverRead();
        stopReading();
        initTextToSpeech(makeModel());
    });

    it("speaks the first block and its text is the first block's text", () => {
        document.body.innerHTML = "<p>Hello world</p><p>Second paragraph</p>";
        startReading();
        expect(speak()).toHaveBeenCalledTimes(1);
        expect(speak().mock.calls[0][0].text).toBe("Hello world");
    });

    it("excludes popover, sap-ui-static, aria-hidden and script subtrees", () => {
        document.body.innerHTML = `
            <div class="abicsAccessibilityPopover"><p>POPOVER</p></div>
            <div id="sap-ui-static"><p>STATIC</p></div>
            <p aria-hidden="true">HIDDEN</p>
            <script>SCRIPT</script>
            <p>First real block</p>
            <p>Second real block</p>
        `;
        startReading();
        // Excluded content sits first in document order, so if any of it leaked
        // through it would be the first thing spoken.
        expect(speak()).toHaveBeenCalledTimes(1);
        const spokenText = speak().mock.calls[0][0].text;
        expect(spokenText).toBe("First real block");
        expect(spokenText).not.toMatch(/POPOVER|STATIC|HIDDEN|SCRIPT/);
    });

    it("does not speak when the body has no readable text", () => {
        document.body.innerHTML = "";
        startReading();
        expect(speak()).not.toHaveBeenCalled();
    });

    it("volume is 0 when /ttsVolume is 0, but rate falls back to 1 when /ttsRate is 0 (|| asymmetry)", () => {
        // getVolume uses `v == null ? 1 : v` so a real 0 is honoured; getRate
        // uses `... || 1` so 0 is coerced to the default 1. This asymmetry is
        // intended (documented in source) — assert both branches.
        initTextToSpeech(makeModel({ ttsVolume: 0, ttsRate: 0 }));
        document.body.innerHTML = "<p>Some text</p>";
        startReading();
        const u = speak().mock.calls[0][0];
        expect(u.volume).toBe(0);
        expect(u.rate).toBe(1);
    });

    it("stopReading cancels the running speech synthesis", () => {
        window.speechSynthesis.speaking = true;
        stopReading();
        expect(cancel()).toHaveBeenCalledTimes(1);
    });

    it("marks the model as playing while reading and not playing when stopped", () => {
        const model = makeModel();
        initTextToSpeech(model);
        document.body.innerHTML = "<p>Reading now</p>";
        startReading();
        expect(model.getProperty("/ttsPlaying")).toBe(true);
        stopReading();
        expect(model.getProperty("/ttsPlaying")).toBe(false);
    });
});

describe("textToSpeech — hover / full-page mutual exclusion", () => {
    beforeEach(() => {
        Element.prototype.scrollIntoView = vi.fn();
        window.speechSynthesis.speaking = false;
        window.speechSynthesis.pending = false;
        disableHoverRead();
        stopReading();
        initTextToSpeech(makeModel());
    });

    it("startReading turns hover off (model /ttsHover = false)", () => {
        const model = makeModel({ ttsHover: true });
        initTextToSpeech(model);
        enableHoverRead();
        document.body.innerHTML = "<p>Now read the page</p>";
        startReading();
        expect(model.getProperty("/ttsHover")).toBe(false);
    });

    it("enableHoverRead stops a running full-page read", () => {
        document.body.innerHTML = "<p>Reading in progress</p>";
        startReading();
        expect(isReadingActive()).toBe(true);
        enableHoverRead();
        expect(isReadingActive()).toBe(false);
    });
});

describe("textToSpeech — hover reading (debounced)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Element.prototype.scrollIntoView = vi.fn();
        window.speechSynthesis.speaking = false;
        window.speechSynthesis.pending = false;
        initTextToSpeech(makeModel());
    });

    afterEach(() => {
        disableHoverRead();
        vi.useRealTimers();
    });

    it("speaks the hovered leaf element after the 300ms debounce", () => {
        document.body.innerHTML = '<p id="leaf">Hover me</p>';
        enableHoverRead();
        speak().mockClear();
        document.getElementById("leaf").dispatchEvent(
            new MouseEvent("mouseover", { bubbles: true })
        );
        expect(speak()).not.toHaveBeenCalled(); // still debouncing
        vi.advanceTimersByTime(300);
        expect(speak()).toHaveBeenCalledTimes(1);
    });

    it("hovering an empty wrapper (no own text) cancels immediately", () => {
        document.body.innerHTML = '<div id="wrap"><span>x</span></div>';
        enableHoverRead();
        window.speechSynthesis.speaking = true;
        cancel().mockClear();
        speak().mockClear();
        document.getElementById("wrap").dispatchEvent(
            new MouseEvent("mouseover", { bubbles: true })
        );
        expect(cancel()).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(300);
        expect(speak()).not.toHaveBeenCalled();
    });
});

describe("textToSpeech — degraded environment (no speechSynthesis)", () => {
    let mod;
    let saved;

    beforeEach(async () => {
        saved = window.speechSynthesis;
        delete window.speechSynthesis;
        vi.resetModules();
        mod = await import("../js/textToSpeech.js");
        // Restore for the rest of the suite; the freshly imported module already
        // captured synth = null at evaluation time.
        window.speechSynthesis = saved;
    });

    it("startReading and stopReading do not throw when unsupported", () => {
        mod.initTextToSpeech(makeModel());
        document.body.innerHTML = "<p>Text</p>";
        expect(() => mod.startReading()).not.toThrow();
        expect(() => mod.stopReading()).not.toThrow();
        // The re-imported module captured synth = null, so it must never reach
        // the (restored) speechSynthesis mock.
        expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
        expect(window.speechSynthesis.cancel).not.toHaveBeenCalled();
    });
});
