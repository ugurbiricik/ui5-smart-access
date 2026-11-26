import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Fragment from "sap/ui/core/Fragment";
import { popoverInternalController as c, DETAIL_PAGES } from "../js/popoverController.js";
import { oSettingsModel } from "../js/settingsModel.js";
import { DETAIL_DEFAULTS, isDetailAtDefault } from "../js/detailDefaults.js";
import { previewCss } from "../js/typography.js";
import { initTextToSpeech } from "../js/textToSpeech.js";

initTextToSpeech(oSettingsModel);

const dir = resolve(__dirname, "../fragments");
const read = (name) => readFileSync(resolve(dir, name + ".fragment.xml"), "utf8");
const popover = readFileSync(resolve(__dirname, "../Popover.fragment.xml"), "utf8");
const pageFragments = [...popover.matchAll(/fragments\.(\w+Page)"/g)].map((m) => m[1]);
const footer = read("DetailFooter");
const STORE = "ui5-smart-access-preferences";
const stored = () => JSON.parse(localStorage.getItem(STORE) || "{}");
const readModel = (p) => oSettingsModel.getProperty(p);

const panel = () => ({ addStyleClass: vi.fn(), removeStyleClass: vi.fn(), getDomRef: () => null });
const src = (data, extra = {}) => ({ data: (k) => data[k], setPressed: vi.fn(), ...extra });

const setDefaults = () => {
    Object.values(DETAIL_DEFAULTS).forEach((defaults) => {
        Object.entries(defaults).forEach(([p, v]) => oSettingsModel.setProperty(p, v));
    });
};

beforeEach(() => {
    const controls = {};
    Fragment.byId.mockImplementation((_f, id) => {
        if (id === "saNav") return { getCurrentPage: () => null, to: vi.fn(), backToTop: vi.fn() };
        return (controls[id] = controls[id] || panel());
    });
    c._sFragmentId = "frag";
    c._oPopover = { isOpen: () => true, getModel: () => null, getDomRef: () => null, close: vi.fn() };
    setDefaults();
    oSettingsModel.setProperty("/navPage", "main");
});

describe("detail page template (fragments)", () => {
    it("the popover hosts one page per detail key", () => {
        expect(pageFragments).toHaveLength(Object.keys(DETAIL_PAGES).length);
        Object.values(DETAIL_PAGES).forEach((p) => {
            expect(pageFragments.some((f) => read(f).includes(`id="${p.pageId}"`)), p.pageId).toBe(true);
        });
    });

    it("every page follows preview → controls → footer", () => {
        pageFragments.forEach((name) => {
            const xml = read(name);
            expect(xml, name).toMatch(/class="saPage saDetailPage saTpl/);
            const preview = xml.indexOf("saPreview ");
            const foot = Math.max(xml.indexOf("fragments.DetailFooter"), xml.indexOf("saDetailFooter"));
            expect(preview, name).toBeGreaterThan(-1);
            expect(foot, name).toBeGreaterThan(preview);
            const firstControl = xml.search(/<(Slider|SegmentedButton|ToggleButton|List|Switch|Button)\s/);
            expect(firstControl, name).toBeGreaterThan(preview);
            expect(xml.lastIndexOf("<Slider\u0020"), name).toBeLessThan(foot);
            expect(xml, name).toContain("i18n>detail.preview");
        });
    });

    it("the shared footer offers Restore defaults + Done", () => {
        expect(footer).toContain('text="{i18n>detail.reset}"');
        expect(footer).toContain('press=".onDetailReset"');
        expect(footer).toContain("formatter: '.fmtDetailCanReset'");
        expect(footer).toMatch(/text="\{i18n>detail\.done\}" type="Emphasized" press="\.onDetailDone"/);
        const contrast = read("ContrastModePage");
        expect(contrast).toContain('press=".onDetailReset"');
        expect(contrast).toContain('press=".onContrastSet"');
        expect(contrast).toContain('press=".onContrastCancel"');
    });

    it("−/+ buttons exist only for the font size", () => {
        pageFragments.forEach((name) => {
            const steppers = [...read(name).matchAll(/<Button icon="sap-icon:\/\/(less|add)"[^>]*>/g)].map((m) => m[0]);
            if (name === "FontSizePage") {
                expect(steppers, name).toHaveLength(2);
                steppers.forEach((b) => expect(b).toContain('custom:typo="fontSize"'));
            } else {
                expect(steppers, name).toHaveLength(0);
            }
        });
    });

    it("every slider is labelled, has a step and reports changes (keyboard included)", () => {
        let count = 0;
        pageFragments.forEach((name) => {
            const xml = read(name);
            [...xml.matchAll(/<Slider [\s\S]*?"\s*\/?>/g)].forEach(([tag]) => {
                count++;
                const id = (tag.match(/ id="(\w+)"/) || [])[1];
                expect(id, tag).toBeTruthy();
                expect(tag, id).toMatch(/ step="[\d.]+"/);
                expect(tag, id).toMatch(/ change="\.\w+"/);
                const labelled = (tag.match(/ariaLabelledBy="([\w ]+)"/) || [])[1];
                expect(labelled, id).toBeTruthy();
                labelled.split(" ").forEach((ref) => expect(xml, `${id} → ${ref}`).toContain(`id="${ref}"`));
                expect(xml, id).toContain(`labelFor="${id}"`);
            });
        });
        expect(count).toBe(9);
    });

    it("the font size shows the real value (not the old 0-based offset)", () => {
        const xml = read("FontSizePage");
        expect(xml).not.toContain("typoFontPct");
        expect(xml).toContain("{path: 'settings>/typoFontSize', formatter: '.formatPercent'}");
        [100, 125, 150, 175, 200].forEach((v) => {
            expect(xml).toContain(`pressed="{= \${settings>/typoFontSize} === ${v}}"`);
        });
        expect(read("FontSizePanel")).toContain("'settings>/typoFontSize'");
    });

    it("every handler and formatter named in the pages exists on the controller", () => {
        pageFragments.concat(["DetailFooter"]).forEach((name) => {
            const xml = read(name);
            [...xml.matchAll(/(?:press|change|liveChange|selectionChange)="\.(\w+)"/g)].forEach((m) => {
                expect(typeof c[m[1]], `${name}: ${m[1]}`).toBe("function");
            });
            [...xml.matchAll(/formatter: '\.(\w+)'/g)].forEach((m) => {
                expect(typeof c[m[1]], `${name}: ${m[1]}`).toBe("function");
            });
        });
    });

    it("every i18n key used by the pages exists in all bundles", () => {
        const bundles = ["i18n.properties", "i18n_de.properties", "i18n_en.properties"].map((f) =>
            readFileSync(resolve(__dirname, "../i18n", f), "utf8"));
        pageFragments.concat(["DetailFooter"]).forEach((name) => {
            [...read(name).matchAll(/i18n>([\w.]+)/g)].forEach((m) => {
                bundles.forEach((b) => expect(b, `${name}: ${m[1]}`).toMatch(new RegExp(`^${m[1].replace(/\./g, "\\.")}=`, "m")));
            });
        });
    });
});

describe("detail defaults", () => {
    it("covers every detail page", () => {
        expect(Object.keys(DETAIL_DEFAULTS).sort()).toEqual(Object.keys(DETAIL_PAGES).sort());
    });

    it("isDetailAtDefault compares numbers, strings and empty values", () => {
        const at = (values) => (p) => values[p];
        expect(isDetailAtDefault("font", at({ "/typoFontSize": 100, "/typoZoom": 100, "/typoAlign": "none" }))).toBe(true);
        expect(isDetailAtDefault("font", at({ "/typoFontSize": 125 }))).toBe(false);
        expect(isDetailAtDefault("contrast", at({ "/contrastBgColor": "#FFFFFF", "/contrastTextColor": "#000000", "/contrastUnderlineLinks": true }))).toBe(true);
        expect(isDetailAtDefault("unknown", at({}))).toBe(true);
    });

    it("fmtDetailCanReset follows the open page", () => {
        expect(c.fmtDetailCanReset("font")).toBe(false);
        oSettingsModel.setProperty("/typoLineHeight", 20);
        expect(c.fmtDetailCanReset("font")).toBe(true);
        expect(c.fmtDetailCanReset("readingGuide")).toBe(false);
    });
});

describe("Restore defaults per page", () => {
    const dirty = {
        font: () => {
            c.onFontSizePreset({ getSource: () => src({ value: "150" }) });
            c.onTypoSliderChange({ getSource: () => src({ typo: "lineHeight" }), getParameter: () => 40 });
            c.onTypoAlignChange({ getParameter: () => ({ getKey: () => "justify" }) });
        },
        readingGuide: () => c.onReadingGuideSelect({ getParameter: () => ({ getKey: () => "mask" }) }),
        bigCursor: () => c.onBigCursorSelect({ getSource: () => src({}, { getBindingContext: () => ({ getProperty: () => "blue" }) }) }),
        tts: () => {
            c.onTtsRatePreset({ getSource: () => src({ value: "1.5" }) });
            oSettingsModel.setProperty("/ttsVolume", 0.4);
        },
        colorBlindness: () => {
            c.onColorBlindnessSelect({ getSource: () => ({ getBindingContext: () => ({ getObject: () => ({ key: "grayscale" }) }) }) });
            c.onColorBlindnessIntensityChange({ getParameter: () => 40 });
        },
        blueLightFilter: () => c.onBlueLightFilterPreset({ getSource: () => src({ value: "75" }) }),
        contrast: () => {
            oSettingsModel.setProperty("/contrastBgColor", "#ffff00");
            c.onContrastSet();
        }
    };

    Object.keys(DETAIL_PAGES).forEach((key) => {
        it(`${key}: changes are undone and the button disables itself`, () => {
            dirty[key]();
            expect(isDetailAtDefault(key, readModel), key).toBe(false);
            oSettingsModel.setProperty("/navPage", key);
            c.onDetailReset();
            expect(isDetailAtDefault(key, readModel), key).toBe(true);
            expect(c.fmtDetailCanReset(key)).toBe(false);
        });
    });

    it("restoring the font page clears the page effects too", () => {
        dirty.font();
        expect(document.documentElement.style.fontSize).toBe("150%");
        c.resetDetail("font");
        expect(document.documentElement.style.fontSize).toBe("");
        expect(document.getElementById("ui5-smart-access-typography")).toBeNull();
        expect(stored().typoFontSize).toBe(100);
    });

    it("restoring the filter pages removes the page filter", () => {
        dirty.colorBlindness();
        dirty.blueLightFilter();
        expect(document.documentElement.style.filter).not.toBe("");
        c.resetDetail("colorBlindness");
        c.resetDetail("blueLightFilter");
        expect(document.documentElement.style.filter).toBe("");
    });

    it("Done goes back to the list without changing anything", () => {
        dirty.font();
        const spy = vi.spyOn(c, "navToMain");
        c.onDetailDone();
        expect(spy).toHaveBeenCalled();
        expect(readModel("/typoFontSize")).toBe(150);
    });
});

describe("presets and sliders", () => {
    it("font size presets set the real percentage, stay pressed and persist", () => {
        const s = src({ value: "125" });
        c.onFontSizePreset({ getSource: () => s });
        expect(readModel("/typoFontSize")).toBe(125);
        expect(document.documentElement.style.fontSize).toBe("125%");
        expect(s.setPressed).toHaveBeenCalledWith(true);
        expect(stored().typoFontSize).toBe(125);
        c.onFontSizePreset({ getSource: () => s });
        expect(readModel("/typoFontSize")).toBe(125);
    });

    it("−/+ step the font size by 5 within 50–200", () => {
        oSettingsModel.setProperty("/typoFontSize", 195);
        c.onTypoInc({ getSource: () => src({ typo: "fontSize" }) });
        expect(readModel("/typoFontSize")).toBe(200);
        c.onTypoInc({ getSource: () => src({ typo: "fontSize" }) });
        expect(readModel("/typoFontSize")).toBe(200);
        oSettingsModel.setProperty("/typoFontSize", 55);
        c.onTypoDec({ getSource: () => src({ typo: "fontSize" }) });
        c.onTypoDec({ getSource: () => src({ typo: "fontSize" }) });
        expect(readModel("/typoFontSize")).toBe(50);
    });

    it("live slider moves update page + preview, the final change persists", () => {
        c.onTypoSliderLive({ getSource: () => src({ typo: "fontSize" }), getParameter: () => 175 });
        expect(document.documentElement.style.fontSize).toBe("175%");
        expect(document.getElementById("ui5-smart-access-font-preview").textContent).toContain("font-size: 24.5px");
        expect(stored().typoFontSize).toBeUndefined();
        c.onTypoSliderChange({ getSource: () => src({ typo: "fontSize" }), getParameter: () => 175 });
        expect(stored().typoFontSize).toBe(175);
    });

    it("slider values are clamped and rounded (keyboard Home/End/PageUp)", () => {
        c.onTypoSliderChange({ getSource: () => src({ typo: "zoom" }), getParameter: () => 999 });
        expect(readModel("/typoZoom")).toBe(200);
        c.onTypoSliderChange({ getSource: () => src({ typo: "letterSpacing" }), getParameter: () => -5 });
        expect(readModel("/typoLetterSpacing")).toBe(0);
        c.onTypoSliderChange({ getSource: () => src({ typo: "nope" }), getParameter: () => 5 });
    });

    it("blue light presets switch the filter on at that strength; slider to 0 turns it off", () => {
        c.onBlueLightFilterPreset({ getSource: () => src({ value: "25" }) });
        expect(readModel("/blueLightFilterActive")).toBe(true);
        expect(readModel("/blueLightFilterLevel")).toBe(25);
        expect(document.documentElement.style.filter).toContain("sepia");
        c.onBlueLightFilterSliderChange({ getParameter: () => 0 });
        expect(readModel("/blueLightFilterActive")).toBe(false);
        expect(document.documentElement.style.filter).toBe("");
        c.onBlueLightFilterSwitch({ getParameter: () => true });
        expect(readModel("/blueLightFilterLevel")).toBe(50);
        expect(document.documentElement.style.filter).toContain("sepia");
    });

    it("tts speed presets and the sample", () => {
        c.onTtsRatePreset({ getSource: () => src({ value: "0.75" }) });
        expect(readModel("/ttsRate")).toBe(0.75);
        expect(stored().ttsRate).toBe(0.75);
        window.speechSynthesis.speak.mockClear();
        c.onTtsSample();
        expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
        const utterance = window.speechSynthesis.speak.mock.calls[0][0];
        expect(utterance.rate).toBe(0.75);
    });

    it("reading aid uses the segmented button key", () => {
        c.onReadingGuideSelect({ getParameter: () => ({ getKey: () => "guide" }) });
        expect(readModel("/readingGuideMode")).toBe("guide");
        expect(document.getElementById("ui5-smart-access-reading-guide")).not.toBeNull();
        c.onReadingGuideSelect({ getParameter: () => null });
        expect(readModel("/readingGuideMode")).toBe("guide");
    });

    it("big cursor: Off chip clears, custom chip keeps the pressed state honest", () => {
        c.onBigCursorSelect({ getSource: () => src({}, { getBindingContext: () => ({ getProperty: () => "green" }) }) });
        expect(readModel("/bigCursorColor")).toBe("green");
        const off = src({});
        c.onBigCursorOff({ getSource: () => off });
        expect(readModel("/bigCursorColor")).toBe("none");
        expect(off.setPressed).toHaveBeenCalledWith(true);
        const custom = src({}, { getBindingContext: () => ({ getProperty: () => "custom" }) });
        c.onBigCursorSelect({ getSource: () => custom });
        expect(custom.setPressed).toHaveBeenCalledWith(false);
        expect(c.fmtBigCursorPreview("green")).toMatch(/^data:image\/svg\+xml,/);
        expect(c.fmtBigCursorPreview("none")).toContain(encodeURIComponent('width="20"'));
    });
});

describe("font preview css", () => {
    it("mirrors the page formulas and caps the size", () => {
        const css = previewCss(".x", { fontSize: 150, zoom: 100, lineHeight: 50, wordSpacing: 0, letterSpacing: 100, align: "left" });
        expect(css).toContain("font-size: 21px");
        expect(css).toContain("line-height: 1.80");
        expect(css).toContain("letter-spacing: 0.300em");
        expect(css).toContain("text-align: left");
        expect(css).not.toContain("word-spacing");
        expect(previewCss(".x", { fontSize: 200, zoom: 200 })).toContain("font-size: 42px");
        expect(previewCss(".x", {})).toContain("font-size: 14px");
    });
});
