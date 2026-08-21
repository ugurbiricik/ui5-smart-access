import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// i18nModel caches its model in a module-level `i18nModel` singleton, and
// createI18nModel() reads navigator.languages at call time. Reset modules per
// test so each import starts with a null (uncreated) model.

const setLanguages = (langs) => {
    Object.defineProperty(navigator, "languages", { value: langs, configurable: true });
};

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    vi.doUnmock("sap/ui/model/resource/ResourceModel");
});

describe("getText — identity fallback", () => {
    it("returns the key unchanged before any model is created", async () => {
        const { getText } = await import("../js/i18nModel.js");
        expect(getText("some.key")).toBe("some.key");
    });

    it("still returns the key after createI18nModel (echo bundle never differs)", async () => {
        const { createI18nModel, getText } = await import("../js/i18nModel.js");
        createI18nModel();
        // The ResourceModel mock echoes the key, so getText's
        // "text !== key" guard is false and it falls back to the key.
        expect(getText("another.key")).toBe("another.key");
    });

    it("returns the key when getResourceBundle throws", async () => {
        vi.doMock("sap/ui/model/resource/ResourceModel", () => ({
            default: class {
                getResourceBundle() { throw new Error("bundle unavailable"); }
            }
        }));
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { createI18nModel, getText } = await import("../js/i18nModel.js");
        createI18nModel();
        expect(getText("x")).toBe("x");
        expect(errSpy).toHaveBeenCalled();
    });
});

describe("createI18nModel — browser language detection (via public behaviour)", () => {
    it("returns a model and is idempotent (caches the same instance)", async () => {
        setLanguages(["de-DE", "de"]);
        const { createI18nModel } = await import("../js/i18nModel.js");
        const a = createI18nModel();
        const b = createI18nModel();
        expect(a).toBeTruthy();
        expect(b).toBe(a);
    });

    it.each([
        ["en-US supported", ["en-US"]],
        ["fr first then de fallback in list", ["fr", "de"]],
        ["fr only -> de fallback", ["fr"]],
        ["empty list -> de fallback", []]
    ])("does not throw for navigator.languages = %s", async (_label, langs) => {
        setLanguages(langs);
        const { createI18nModel } = await import("../js/i18nModel.js");
        expect(() => createI18nModel()).not.toThrow();
        expect(createI18nModel()).toBeTruthy();
    });

    it("getI18nModel is null until createI18nModel is called", async () => {
        setLanguages(["en"]);
        const { getI18nModel, createI18nModel } = await import("../js/i18nModel.js");
        expect(getI18nModel()).toBeNull();
        createI18nModel();
        expect(getI18nModel()).toBeTruthy();
    });
});

describe("changeLanguage", () => {
    it("rebuilds the model for a supported language", async () => {
        setLanguages(["de"]);
        const { createI18nModel, changeLanguage, getI18nModel } = await import("../js/i18nModel.js");
        const first = createI18nModel();
        changeLanguage("en");
        const rebuilt = getI18nModel();
        expect(rebuilt).toBeTruthy();
        expect(rebuilt).not.toBe(first);
    });

    it("ignores an unsupported language (keeps the existing model)", async () => {
        setLanguages(["de"]);
        const { createI18nModel, changeLanguage, getI18nModel } = await import("../js/i18nModel.js");
        const first = createI18nModel();
        changeLanguage("xx");
        expect(getI18nModel()).toBe(first);
    });
});
