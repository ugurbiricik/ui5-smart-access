import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Fragment from "sap/ui/core/Fragment";
import Theming from "sap/ui/core/Theming";
import { popoverInternalController as c, DETAIL_PAGES } from "../js/popoverController.js";
import { oSettingsModel } from "../js/settingsModel.js";
import { contrastStatus } from "../js/rowStatus.js";

const xml = readFileSync(resolve(__dirname, "../fragments/ContrastModePage.fragment.xml"), "utf8");
const i18nFiles = ["i18n", "i18n_de", "i18n_en"].map((n) =>
    readFileSync(resolve(__dirname, `../i18n/${n}.properties`), "utf8"));
const STORE = "ui5-smart-access-preferences";
const stored = () => JSON.parse(localStorage.getItem(STORE) || "{}");
const get = (p) => oSettingsModel.getProperty(p);
const set = (p, v) => oSettingsModel.setProperty(p, v);
const css = () => document.getElementById("ui5-smart-access-contrast");

let controls;
let nav;

const setup = () => {
    controls = {};
    const main = { id: "saMainPage", getDomRef: () => null };
    controls.saMainPage = main;
    Object.values(DETAIL_PAGES).forEach((p) => {
        controls[p.pageId] = { id: p.pageId, getDomRef: () => null };
        controls[p.panelId] = { addStyleClass: vi.fn(), removeStyleClass: vi.fn(), getHeaderToolbar: () => null };
    });
    let current = main;
    nav = {
        getCurrentPage: () => current,
        to: vi.fn((page) => { current = page; }),
        backToTop: vi.fn(() => { current = main; })
    };
    controls.saNav = nav;
    Fragment.byId.mockImplementation((_frag, id) => controls[id] || null);
    c._sFragmentId = "frag";
    c._oPopover = { isOpen: () => true, close: vi.fn(), getDomRef: () => null };
    c.onContrastReset();
    set("/nightModeActive", false);
    set("/navPage", "main");
    localStorage.clear();
    Theming.setTheme.mockClear();
};

const card = (id) => {
    const scheme = get("/contrastSchemes").find((s) => s.id === id);
    const src = {
        setPressed: vi.fn(),
        getBindingContext: () => ({ getProperty: (k) => scheme[k] })
    };
    return { getSource: () => src, src };
};
const swatch = (color) => {
    const src = { setPressed: vi.fn(), getBindingContext: () => ({ getProperty: () => color }) };
    return { getSource: () => src, src };
};
const theme = (key) => ({ getParameter: (n) => (n === "item" ? { getKey: () => key } : undefined) });

describe("contrast page fragment", () => {
    it("has no sap.m.Image left; schemes and swatches are ToggleButtons", () => {
        expect(xml).not.toMatch(/<Image[\s>]/);
        expect(xml).not.toContain(".onContrastPresetSelect");
        const toggles = xml.split("<ToggleButton").slice(1).map((t) => t.split("</ToggleButton>")[0]);
        expect(toggles.length).toBe(3);
        toggles.forEach((t) => {
            expect(t).toMatch(/pressed="\{=/);
            expect(t).toMatch(/tooltip="\{/);
        });
        expect(toggles[0]).toContain('press=".onContrastSchemeSelect"');
        expect(toggles[1]).toContain('press=".onContrastBgSelect"');
        expect(toggles[2]).toContain('press=".onContrastTextSelect"');
    });

    it("scheme cards show a label and the WCAG ratio", () => {
        expect(xml).toMatch(/<ToggleButton\s+text="\{path: 'settings>labelKey', formatter: '\.fmtI18n'\}"/);
        expect(xml).toContain("formatter: '.fmtSchemeRatio'");
        expect(xml).toContain('text="{settings>/contrastInfo}"');
    });

    it("SAP HC themes sit in a labelled SegmentedButton", () => {
        expect(xml).toMatch(/<SegmentedButton id="contrastThemeSeg"[\s\S]*?ariaLabelledBy="contrastThemeLabel"/);
        ["std", "hcw", "hcb"].forEach((k) => expect(xml).toContain(`<SegmentedButtonItem key="${k}" text="{i18n>`));
    });

    it("custom colours live in a collapsible panel", () => {
        expect(xml).toMatch(/<Panel id="contrastCustomPanel" expandable="true" expanded="\{settings>\/contrastCustomOpen\}"/);
    });

    it("every footer action has a text label", () => {
        const buttons = [...xml.matchAll(/<Button\b[\s\S]*?\/>/g)].map((m) => m[0]);
        expect(buttons.length).toBe(5);
        buttons.forEach((b) => expect(b).toMatch(/text="\{i18n>/));
        expect(xml).toMatch(/text="\{i18n>contrast\.cancel\}" press="\.onContrastCancel"/);
        expect(xml).toMatch(/text="\{i18n>contrast\.set\}" type="Emphasized" press="\.onContrastSet"/);
    });

    it("every i18n key used by the page exists in all three bundles", () => {
        const keys = new Set([...xml.matchAll(/i18n>([\w.]+)/g)].map((m) => m[1]));
        get("/contrastSchemes").forEach((s) => {
            keys.add(s.labelKey);
            if (s.level) { keys.add("contrast.level." + s.level); keys.add("contrast.levelShort." + s.level); }
        });
        get("/contrastColors").forEach((col) => keys.add(col.nameKey));
        ["AAA", "AA", "AALarge", "fail"].forEach((l) => { keys.add("contrast.level." + l); keys.add("contrast.levelShort." + l); });
        ["contrast.info.ratio", "contrast.info.theme", "contrast.info.off", "contrast.schemeTooltip",
            "contrast.schemeOffHint", "contrast.schemeCustomHint"].forEach((k) => keys.add(k));
        i18nFiles.forEach((f) => keys.forEach((k) => expect(f, k).toMatch(new RegExp("^" + k.replace(/\./g, "\\.") + "=", "m"))));
    });
});

describe("contrast page behaviour", () => {
    beforeEach(setup);

    it("opening the page with nothing active selects Off and applies nothing", () => {
        c.navToDetail("contrast");
        expect(get("/contrastScheme")).toBe("off");
        expect(get("/contrastCustomOpen")).toBe(false);
        expect(get("/contrastInfo")).toBe("contrast.info.off");
        expect(css()).toBeNull();
        expect(document.getElementById("ui5-smart-access-contrast-swatches").textContent).toContain("data-sa-scheme");
    });

    it("a scheme card is a draft: preview + ratio, page unchanged until Apply", () => {
        c.navToDetail("contrast");
        const e = card("yellowOnBlack");
        c.onContrastSchemeSelect(e);
        expect(e.src.setPressed).toHaveBeenCalledWith(true);
        expect(get("/contrastBgColor")).toBe("#000000");
        expect(get("/contrastTextColor")).toBe("#ffeb3b");
        expect(get("/contrastInfo")).toBe("contrast.info.ratio");
        expect(get("/contrastInfoState")).toBe("Success");
        expect(css()).toBeNull();
        c.onContrastSet();
        expect(css().textContent).toContain("#ffeb3b");
        expect(get("/contrastModeActive")).toBe(true);
        expect(stored().contrastBgColor).toBe("#000000");
        expect(get("/navPage")).toBe("main");
    });

    it("reopening shows the applied scheme selected", () => {
        c.navToDetail("contrast");
        c.onContrastSchemeSelect(card("whiteOnBlue"));
        c.onContrastSet();
        c.navToDetail("contrast");
        expect(get("/contrastScheme")).toBe("whiteOnBlue");
    });

    it("Off + Apply turns an active custom contrast off", () => {
        c.navToDetail("contrast");
        c.onContrastSchemeSelect(card("whiteOnBlack"));
        c.onContrastSet();
        c.navToDetail("contrast");
        c.onContrastSchemeSelect(card("off"));
        c.onContrastSet();
        expect(css()).toBeNull();
        expect(get("/contrastModeActive")).toBe(false);
        expect(stored().contrastModeActive).toBe(false);
        expect(controls.contrastModePanel.removeStyleClass).toHaveBeenCalledWith("activeFeature");
    });

    it("a colour swatch switches to Custom, opens nothing else and rates the pair", () => {
        c.navToDetail("contrast");
        c.onContrastSchemeSelect(card("custom"));
        expect(get("/contrastCustomOpen")).toBe(true);
        const e = swatch("#7f1d1d");
        c.onContrastTextSelect(e);
        expect(e.src.setPressed).toHaveBeenCalledWith(true);
        expect(get("/contrastScheme")).toBe("custom");
        expect(get("/contrastTextColor")).toBe("#7f1d1d");
        expect(get("/contrastInfoState")).toBe("Success");
        c.onContrastBgSelect(swatch("#0a3d8f"));
        expect(get("/contrastInfoState")).toBe("Error");
        expect(get("/contrastReadable")).toBe("contrast.notReadable");
    });

    it("an HC theme applies at once, stays on the page and clears the scheme", () => {
        c.navToDetail("contrast");
        c.onContrastSchemeSelect(card("whiteOnBlack"));
        c.onContrastThemeSelect(theme("hcb"));
        expect(Theming.setTheme).toHaveBeenLastCalledWith("sap_horizon_hcb");
        expect(get("/contrastTheme")).toBe("hcb");
        expect(get("/contrastScheme")).toBe("off");
        expect(get("/contrastInfo")).toBe("contrast.info.theme");
        expect(stored().contrastTheme).toBe("hcb");
        expect(get("/navPage")).toBe("contrast");
        c.onContrastSet();
        expect(get("/contrastTheme")).toBe("hcb");
        expect(css()).toBeNull();
    });

    it("an HC theme turns night mode off", () => {
        c.navToDetail("contrast");
        set("/nightModeActive", true);
        c.onContrastThemeSelect(theme("hcw"));
        expect(get("/nightModeActive")).toBe(false);
        expect(get("/contrastTheme")).toBe("hcw");
    });

    it("picking a scheme while an HC theme is on returns to the standard theme", () => {
        c.navToDetail("contrast");
        c.onContrastThemeSelect(theme("hcw"));
        Theming.setTheme.mockClear();
        c.onContrastSchemeSelect(card("darkOnCream"));
        expect(Theming.setTheme).toHaveBeenCalledWith("sap_horizon");
        expect(get("/contrastTheme")).toBe("");
        expect(get("/contrastScheme")).toBe("darkOnCream");
    });

    it("Standard turns the HC theme off", () => {
        c.navToDetail("contrast");
        c.onContrastThemeSelect(theme("hcb"));
        c.onContrastThemeSelect(theme("std"));
        expect(get("/contrastTheme")).toBe("");
        expect(get("/contrastModeActive")).toBe(false);
        expect(stored().contrastTheme).toBe("");
    });

    it("Cancel undoes a live HC theme and the draft colours", () => {
        c.navToDetail("contrast");
        c.onContrastSchemeSelect(card("whiteOnBlue"));
        c.onContrastSet();
        c.navToDetail("contrast");
        c.onContrastThemeSelect(theme("hcb"));
        c.onContrastCancel();
        expect(get("/contrastTheme")).toBe("");
        expect(get("/contrastModeActive")).toBe(true);
        expect(css().textContent).toContain("#0a3d8f");
        expect(stored().contrastTheme).toBe("");
        expect(get("/contrastRatio")).toBe("10.1:1");
    });

    it("Restore defaults clears scheme, theme and custom colours", () => {
        c.navToDetail("contrast");
        c.onContrastSchemeSelect(card("custom"));
        c.onContrastBgSelect(swatch("#ffeb3b"));
        c.onDetailReset();
        expect(get("/contrastScheme")).toBe("off");
        expect(get("/contrastCustomOpen")).toBe(false);
        expect(get("/contrastBgColor")).toBe("#ffffff");
    });
});

describe("scheme formatters", () => {
    it("card ratio line names the level; Off and Custom get a hint", () => {
        expect(c.fmtSchemeRatio("whiteOnBlack", "21.0:1", "AAA")).toBe("21.0:1 · contrast.levelShort.AAA");
        expect(c.fmtSchemeRatio("off", "", "")).toBe("contrast.schemeOffHint");
        expect(c.fmtSchemeRatio("custom", "", "")).toBe("contrast.schemeCustomHint");
    });

    it("tooltip carries label, ratio and level", () => {
        expect(c.fmtSchemeTooltip("contrast.scheme.whiteOnBlack", "21.0:1", "AAA")).toBe("contrast.schemeTooltip");
        expect(c.fmtSchemeTooltip("contrast.scheme.off", "", "")).toBe("contrast.scheme.off");
        expect(c.fmtI18n("")).toBe("");
    });

    it("row status names the applied scheme", () => {
        expect(contrastStatus(true, "", "21.0:1", "#000000", "#ffffff")).toBe("contrast.scheme.whiteOnBlack · 21.0:1");
        expect(contrastStatus(true, "", "5.0:1", "#123456", "#ffffff")).toBe("status.contrastCustom · 5.0:1");
        expect(contrastStatus(true, "hcw", "", "", "")).toBe("contrast.hcw");
        expect(contrastStatus(false, "", "21.0:1", "#000000", "#ffffff")).toBe("status.off");
    });
});
