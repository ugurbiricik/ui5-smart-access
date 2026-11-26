import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import Fragment from "sap/ui/core/Fragment";
import { popoverInternalController as c } from "../js/popoverController.js";
import { oSettingsModel } from "../js/settingsModel.js";
import { isNightModeActive, disableNightMode } from "../js/nightMode.js";
import { areImagesHidden, showImages } from "../js/imageHider.js";

const dir = resolve(__dirname, "../fragments");
const popover = readFileSync(resolve(__dirname, "../Popover.fragment.xml"), "utf8");
const mainRows = [...popover.matchAll(/fragments\.(\w+Panel)"/g)].map((m) => m[1]).filter((n) => n !== "ResetAllPanel");
const read = (name) => readFileSync(resolve(dir, name + ".fragment.xml"), "utf8");

describe("main list row model (fragments)", () => {
    it("has 11 rows, each icon · fixed title · bound status · Switch or chevron", () => {
        expect(mainRows).toHaveLength(11);
        mainRows.forEach((name) => {
            const xml = read(name);
            expect(xml, name).toMatch(/<Title id="\w+Title" text="\{i18n>[\w.]+\}"/);
            expect(xml, name).toMatch(/<Text id="\w+Status" text="\{(path|parts): [^"]*formatter: '\.fmt\w+Status'\}"/);
            const hasSwitch = /<Switch /.test(xml);
            const hasChevron = /slim-arrow-right/.test(xml);
            expect(hasSwitch !== hasChevron, name).toBe(true);
            expect(xml, name).toMatch(/ariaLabelledBy="\w+Title \w+Status"/);
        });
    });

    it("no row title is an activate/deactivate verb", () => {
        mainRows.forEach((name) => {
            expect(read(name), name).not.toMatch(/\.(activate|deactivate|show|hide|start)\}/);
        });
        readdirSync(resolve(__dirname, "../i18n")).forEach((f) => {
            const txt = readFileSync(resolve(__dirname, "../i18n", f), "utf8");
            expect(txt, f).not.toMatch(/^(\w+)\.(activate|deactivate)=/m);
        });
    });

    it("every formatter named in the fragments exists on the controller", () => {
        mainRows.forEach((name) => {
            [...read(name).matchAll(/formatter: '\.(\w+)'/g)].forEach((m) => {
                expect(typeof c[m[1]], m[1]).toBe("function");
            });
        });
    });
});

const panel = () => ({ addStyleClass: vi.fn(), removeStyleClass: vi.fn() });

describe("on/off rows (Switch + row press)", () => {
    let panels;
    beforeEach(() => {
        panels = {};
        Fragment.byId.mockImplementation((_f, id) => (panels[id] = panels[id] || panel()));
        c._sFragmentId = "frag";
        c._oPopover = { isOpen: () => true, getModel: () => null, getDomRef: () => null };
        disableNightMode();
        showImages();
        ["/nightModeActive", "/highlightLinksActive", "/stopAnimationsActive", "/toggleImagesActive"]
            .forEach((p) => oSettingsModel.setProperty(p, false));
    });

    const rowEvent = (feature, srcControl) => ({
        getSource: () => ({ data: () => feature }),
        getParameter: (n) => (n === "srcControl" ? srcControl : undefined)
    });
    const switchEvent = (feature, state) => ({
        getSource: () => ({ data: () => feature }),
        getParameter: (n) => (n === "state" ? state : undefined)
    });

    it("row press flips the feature and the model the Switch is bound to", () => {
        c.onFeatureRowPress(rowEvent("highlightLinks"));
        expect(oSettingsModel.getProperty("/highlightLinksActive")).toBe(true);
        expect(panels.highlightLinksPanel.addStyleClass).toHaveBeenCalledWith("activeFeature");
        c.onFeatureRowPress(rowEvent("highlightLinks"));
        expect(oSettingsModel.getProperty("/highlightLinksActive")).toBe(false);
    });

    it("a tap on the Switch itself is left to the Switch change (no double toggle)", () => {
        const sw = { isA: (t) => t === "sap.m.Switch" };
        c.onFeatureRowPress(rowEvent("stopAnimations", sw));
        expect(oSettingsModel.getProperty("/stopAnimationsActive")).toBe(false);
        c.onFeatureSwitchChange(switchEvent("stopAnimations", true));
        expect(oSettingsModel.getProperty("/stopAnimationsActive")).toBe(true);
    });

    it("Switch change sets (not toggles) night mode and keeps theme state in sync", () => {
        c.onFeatureSwitchChange(switchEvent("nightMode", true));
        expect(isNightModeActive()).toBe(true);
        c.onFeatureSwitchChange(switchEvent("nightMode", true));
        expect(isNightModeActive()).toBe(true);
        expect(oSettingsModel.getProperty("/nightModeActive")).toBe(true);
        c.onFeatureSwitchChange(switchEvent("nightMode", false));
        expect(isNightModeActive()).toBe(false);
        expect(oSettingsModel.getProperty("/nightModeActive")).toBe(false);
    });

    it("images: switch sets hidden state, keyboard shortcut path toggles", () => {
        c.onFeatureSwitchChange(switchEvent("toggleImages", true));
        expect(areImagesHidden()).toBe(true);
        expect(oSettingsModel.getProperty("/toggleImagesActive")).toBe(true);
        c.onToggleImagesToolbarPress();
        expect(areImagesHidden()).toBe(false);
        expect(oSettingsModel.getProperty("/toggleImagesActive")).toBe(false);
    });

    it("ignores unknown features", () => {
        expect(() => c.onFeatureRowPress(rowEvent("nope"))).not.toThrow();
        expect(() => c.onFeatureSwitchChange(switchEvent("nope", true))).not.toThrow();
    });
});

describe("colour-blindness row applies nothing until a mode is picked", () => {
    beforeEach(() => {
        const pages = {};
        Fragment.byId.mockImplementation((_f, id) => {
            if (id === "saNav") return { getCurrentPage: () => null, to: vi.fn(), backToTop: vi.fn() };
            return (pages[id] = pages[id] || { getDomRef: () => null, ...panel() });
        });
        c._sFragmentId = "frag";
        c._oPopover = { isOpen: () => true, getModel: () => null, getDomRef: () => null };
        oSettingsModel.setProperty("/colorBlindnessType", "none");
        oSettingsModel.setProperty("/colorBlindnessIntensity", 100);
        oSettingsModel.setProperty("/navPage", "main");
    });

    it("pressing the row only navigates", () => {
        c.onNavToDetail({ getSource: () => ({ data: () => "colorBlindness" }) });
        expect(oSettingsModel.getProperty("/navPage")).toBe("colorBlindness");
        expect(oSettingsModel.getProperty("/colorBlindnessType")).toBe("none");
        expect(document.documentElement.style.filter).toBe("");
    });

    it("moving the intensity slider with no mode keeps the page unfiltered", () => {
        c.onColorBlindnessIntensityChange({ getParameter: () => 40 });
        expect(document.documentElement.style.filter).toBe("");
    });

    it("selecting a mode applies it, selecting it again turns it off", () => {
        const ctx = { getBindingContext: () => ({ getObject: () => ({ key: "grayscale" }) }) };
        c.onColorBlindnessSelect({ getSource: () => ctx });
        expect(document.documentElement.style.filter).toContain("grayscale");
        c.onColorBlindnessSelect({ getSource: () => ctx });
        expect(document.documentElement.style.filter).toBe("");
        expect(oSettingsModel.getProperty("/colorBlindnessType")).toBe("none");
    });
});
