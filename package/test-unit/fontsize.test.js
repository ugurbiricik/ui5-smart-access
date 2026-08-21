import { describe, it, expect, beforeEach } from "vitest";
import {
    initFontSizer,
    onIncreaseFontSize,
    onDecreaseFontSize,
    onResetFontSize
} from "../js/fontsize.js";

// A fake settings model backed by a plain object, matching the JSONModel API
// the module relies on (single-level "/key" paths).
const makeModel = (fontStep = 0) => {
    const store = { fontStep };
    return {
        getProperty: (p) => store[String(p).replace(/^\//, "")],
        setProperty: (p, v) => { store[String(p).replace(/^\//, "")] = v; },
        _store: store
    };
};

// NOTE: `_defaultFontSize` and `_settingsModel` are module-level and persist
// across tests in this file. The base font size is captured ONCE (first init),
// so we pin the root font-size to a known value before each test/init.
describe("fontsize", () => {
    beforeEach(() => {
        document.documentElement.style.fontSize = "16px";
    });

    // MUST run first: exercises the null-model guards before any init sets state.
    it("handlers are no-ops (no throw) before initFontSizer", () => {
        expect(() => onIncreaseFontSize()).not.toThrow();
        expect(() => onDecreaseFontSize()).not.toThrow();
        expect(() => onResetFontSize()).not.toThrow();
    });

    it("onIncreaseFontSize bumps the step and sets the root font-size", () => {
        const model = makeModel(0);
        initFontSizer(model);
        onIncreaseFontSize();
        expect(model.getProperty("/fontStep")).toBe(1);
        // source: `calc(${base} + ${step*2}px)` => calc(16px + 2px); jsdom => calc(18px)
        const fs = document.documentElement.style.fontSize;
        expect(fs).toContain("calc(");
        expect(fs).toContain("18px");
    });

    it("onDecreaseFontSize lowers the step and sets the root font-size", () => {
        const model = makeModel(0);
        initFontSizer(model);
        onDecreaseFontSize();
        expect(model.getProperty("/fontStep")).toBe(-1);
        // calc(16px + -2px) => jsdom normalizes to calc(14px)
        expect(document.documentElement.style.fontSize).toContain("14px");
    });

    it("increase clamps at the maximum step of 5", () => {
        const model = makeModel(5);
        initFontSizer(model);
        onIncreaseFontSize(); // 5 < 5 is false -> no change
        expect(model.getProperty("/fontStep")).toBe(5);
    });

    it("increase reaches the max from step 4", () => {
        const model = makeModel(4);
        initFontSizer(model);
        onIncreaseFontSize();
        expect(model.getProperty("/fontStep")).toBe(5);
    });

    it("decrease clamps at the minimum step of -3", () => {
        const model = makeModel(-3);
        initFontSizer(model);
        onDecreaseFontSize(); // -3 > -3 is false -> no change
        expect(model.getProperty("/fontStep")).toBe(-3);
    });

    it("decrease reaches the min from step -2", () => {
        const model = makeModel(-2);
        initFontSizer(model);
        onDecreaseFontSize();
        expect(model.getProperty("/fontStep")).toBe(-3);
    });

    it("onResetFontSize restores step 0 and the captured base font-size", () => {
        const model = makeModel(3);
        initFontSizer(model);
        onResetFontSize();
        expect(model.getProperty("/fontStep")).toBe(0);
        expect(document.documentElement.style.fontSize).toBe("16px");
    });
});
