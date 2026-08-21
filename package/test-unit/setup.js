import { vi, afterEach } from "vitest";

// jsdom lacks these; provide safe defaults so modules that touch them at import
// time don't blow up. Individual tests override as needed.
if (!window.matchMedia) {
    window.matchMedia = vi.fn((q) => ({
        matches: false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {}
    }));
}

window.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
    speaking: false,
    pending: false,
    paused: false
};
global.SpeechSynthesisUtterance = class {
    constructor(text) {
        this.text = text;
    }
};

// The UI5 AMD-ish global used by i18nModel/cssLoader/colour pickers.
global.sap = global.sap || {};
global.sap.ui = global.sap.ui || {};
global.sap.ui.require = Object.assign((_deps, _cb) => {}, { toUrl: (p) => "/" + p });

afterEach(() => {
    try { localStorage.clear(); } catch (e) { /* storage may be stubbed */ }
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
});
