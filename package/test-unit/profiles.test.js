import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Fragment from "sap/ui/core/Fragment";
import Theming from "sap/ui/core/Theming";
import { popoverInternalController as c, DETAIL_PAGES } from "../js/popoverController.js";
import { oSettingsModel } from "../js/settingsModel.js";
import {
    PROFILES,
    PROFILE_IDS,
    SETTING_DEFAULTS,
    WATCHED_PATHS,
    snapshotKeys,
    profileMatches,
    isValidSnapshot
} from "../js/profiles.js";
import { LABELLED_GROUPS } from "../js/popoverHelpers.js";

const chipsXml = readFileSync(resolve(__dirname, "../fragments/ProfileChips.fragment.xml"), "utf8");
const popoverXml = readFileSync(resolve(__dirname, "../Popover.fragment.xml"), "utf8");
const i18n = Object.fromEntries(["i18n", "i18n_de", "i18n_en"].map((n) => [n, Object.fromEntries(
    readFileSync(resolve(__dirname, `../i18n/${n}.properties`), "utf8")
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
)]));
const STORE = "ui5-smart-access-preferences";
const stored = () => JSON.parse(localStorage.getItem(STORE) || "{}");
const get = (p) => oSettingsModel.getProperty(p);
const set = (p, v) => oSettingsModel.setProperty(p, v);
const read = (k) => get("/" + k);
const styleEl = (id) => document.getElementById(id);
const allKeys = Array.from(new Set(PROFILES.flatMap(snapshotKeys)));
const state = () => Object.fromEntries(allKeys.map((k) => [k, read(k)]));
const active = () => get("/profileActive");

let controls;

const setup = () => {
    controls = {};
    Object.values(DETAIL_PAGES).forEach((p) => {
        controls[p.panelId] = { addStyleClass: vi.fn(), removeStyleClass: vi.fn() };
    });
    Fragment.byId.mockImplementation((_frag, id) => controls[id] || null);
    c._sFragmentId = "frag";
    c._oPopover = { isOpen: () => true, close: vi.fn(), getDomRef: () => null };
    c.navToMain = vi.fn();
    c.onResetAllToolbarPress();
    set("/navPage", "main");
    localStorage.clear();
    Theming.setTheme.mockClear();
    c.initProfiles();
};

const press = (id) => {
    const src = { data: (k) => (k === "profile" ? id : undefined), setPressed: vi.fn() };
    c.onProfilePress({ getSource: () => src });
    return src;
};

describe("profile definitions", () => {
    it("has the four planned profiles in order", () => {
        expect(PROFILE_IDS).toEqual(["vision", "dyslexia", "seizureSafe", "focus"]);
    });

    it("only combines settings the model already has (no new filter code)", () => {
        const data = oSettingsModel.getData();
        PROFILES.forEach((p) => snapshotKeys(p).forEach((k) => {
            expect(Object.prototype.hasOwnProperty.call(data, k), `${p.id}.${k}`).toBe(true);
            expect(Object.prototype.hasOwnProperty.call(SETTING_DEFAULTS, k), `default ${k}`).toBe(true);
        }));
    });

    it("every profile changes something compared to the defaults", () => {
        PROFILES.forEach((p) => expect(profileMatches(p, (k) => SETTING_DEFAULTS[k]), p.id).toBe(false));
    });

    it("dyslexia reaches the WCAG 1.4.12 spacing minimums", () => {
        const v = PROFILES.find((p) => p.id === "dyslexia").values;
        expect(1.2 + (v.typoLineHeight / 100) * 1.2).toBeGreaterThanOrEqual(1.5);
        expect((v.typoLetterSpacing / 100) * 0.3).toBeGreaterThanOrEqual(0.12);
        expect((v.typoWordSpacing / 100) * 0.5).toBeGreaterThanOrEqual(0.16);
    });

    it("watches every path a profile sets", () => {
        PROFILES.forEach((p) => Object.keys(p.values).forEach((k) => expect(WATCHED_PATHS).toContain(k)));
    });

    it("isValidSnapshot rejects missing or partial snapshots", () => {
        const p = PROFILES[0];
        expect(isValidSnapshot(p, null)).toBe(false);
        expect(isValidSnapshot(p, { typoFontSize: 100 })).toBe(false);
        expect(isValidSnapshot(p, Object.fromEntries(snapshotKeys(p).map((k) => [k, SETTING_DEFAULTS[k]])))).toBe(true);
    });
});

describe("profile chips fragment", () => {
    const toggles = chipsXml.split("<ToggleButton").slice(1).map((t) => t.split("/>")[0]);

    it("renders one ToggleButton per profile with pressed state, press handler and a description tooltip", () => {
        expect(toggles).toHaveLength(4);
        PROFILE_IDS.forEach((id, i) => {
            const t = toggles[i];
            expect(t).toContain(`custom:profile="${id}"`);
            expect(t).toContain(`text="{i18n>profile.${id}}"`);
            expect(t).toContain(`pressed="{= !!\${settings>/profileActive/${id}} }"`);
            expect(t).toContain('press=".onProfilePress"');
            expect(t).toMatch(/icon="sap-icon:\/\/[\w-]+"/);
            expect(t).toContain(`tooltip="{i18n>profile.${id}.desc}"`);
        });
    });

    it("sits at the top of the main page as a labelled group, outside the row groups", () => {
        const main = popoverXml.match(/<VBox id="saMainPage"[^>]*>\s*([^\n]+)/)[1];
        expect(main).toContain("fragments.ProfileChips");
        expect(chipsXml).toMatch(/<VBox id="saGroupProfiles"[^>]*>\s*<Title id="saGroupProfilesTitle" text="\{i18n>group\.profiles\}" level="H3"/);
        expect(LABELLED_GROUPS[0]).toBe("saGroupProfiles");
    });

    it("has every profile text in all three bundles", () => {
        const keys = ["group.profiles", "announce.profileOn", "announce.profileOff"]
            .concat(PROFILE_IDS.flatMap((id) => [`profile.${id}`, `profile.${id}.desc`]));
        Object.entries(i18n).forEach(([file, bundle]) => keys.forEach((k) => expect(bundle[k], `${file}:${k}`).toBeTruthy()));
        expect(i18n.i18n_de["profile.seizureSafe"]).toBe("Epilepsie-sicher");
        expect(i18n.i18n_de["profile.vision"]).toBe("Sehschwäche");
        expect(i18n.i18n_de["profile.dyslexia"]).toBe("Legasthenie");
        expect(i18n.i18n_de["profile.focus"]).toBe("Konzentration");
    });
});

describe("applying and undoing a profile with one click", () => {
    beforeEach(setup);

    it.each(PROFILE_IDS)("%s: click applies all its values, second click restores defaults", (id) => {
        const before = state();
        const profile = PROFILES.find((p) => p.id === id);
        const src1 = press(id);
        Object.entries(profile.values).forEach(([k, v]) => expect(read(k), k).toBe(v));
        expect(active()[id]).toBe(true);
        expect(src1.setPressed).toHaveBeenLastCalledWith(true);
        expect(get("/profileId")).toBe(id);
        expect(stored().profileId).toBe(id);
        expect(stored().profileSnapshot).toEqual(Object.fromEntries(snapshotKeys(profile).map((k) => [k, before[k]])));

        const src2 = press(id);
        expect(state()).toEqual(before);
        expect(active()[id]).toBe(false);
        expect(src2.setPressed).toHaveBeenLastCalledWith(false);
        expect(get("/profileId")).toBe("");
        expect(stored().profileSnapshot).toBe(null);
    });

    it("vision applies the real effects (font, HCB theme, links, cursor) and removes them on undo", () => {
        press("vision");
        expect(Theming.setTheme).toHaveBeenLastCalledWith("sap_horizon_hcb");
        expect(styleEl("ui5-smart-access-highlight-links")).not.toBeNull();
        expect(styleEl("ui5-smart-access-big-cursor")).not.toBeNull();
        expect(controls.fontSizePanel.addStyleClass).toHaveBeenCalledWith("activeFeature");
        press("vision");
        expect(Theming.setTheme).toHaveBeenLastCalledWith("sap_horizon");
        expect(styleEl("ui5-smart-access-highlight-links")).toBeNull();
        expect(styleEl("ui5-smart-access-big-cursor")).toBeNull();
        expect(read("contrastTheme")).toBe("");
    });

    it("dyslexia injects spacing CSS and the reading line, undo removes both", () => {
        press("dyslexia");
        const css = styleEl("ui5-smart-access-typography").textContent;
        expect(css).toContain("line-height: 1.50");
        expect(css).toContain("letter-spacing: 0.120em");
        expect(css).toContain("text-align: left");
        expect(read("readingGuideMode")).toBe("guide");
        press("dyslexia");
        expect(styleEl("ui5-smart-access-typography")?.textContent || "").toBe("");
        expect(read("readingGuideMode")).toBe("none");
    });

    it("seizure-safe stops animations and desaturates, undo brings both back", () => {
        press("seizureSafe");
        expect(styleEl("ui5-smart-access-stop-animations")).not.toBeNull();
        expect(read("colorBlindnessType")).toBe("grayscale");
        expect(read("colorBlindnessIntensity")).toBe(60);
        press("seizureSafe");
        expect(styleEl("ui5-smart-access-stop-animations")).toBeNull();
        expect(read("colorBlindnessType")).toBe("none");
        expect(read("colorBlindnessIntensity")).toBe(100);
    });
});

describe("undo restores the user's own previous settings", () => {
    beforeEach(setup);

    it("keeps a non-default font size, night mode and custom contrast", () => {
        c._setTypo("fontSize", 125);
        c.setNightMode(true);
        set("/contrastBgColor", "#fdf6e3");
        set("/contrastTextColor", "#1d2d3e");
        set("/contrastModeActive", true);
        const before = state();

        press("vision");
        expect(read("nightModeActive")).toBe(false);
        expect(read("contrastTheme")).toBe("hcb");

        press("vision");
        expect(state()).toEqual(before);
        expect(styleEl("ui5-smart-access-contrast")).not.toBeNull();
        expect(Theming.setTheme).toHaveBeenLastCalledWith("sap_horizon_dark");
    });

    it("leaves a setting on when it was already on before the profile", () => {
        c.setStopAnimations(true);
        press("focus");
        expect(read("readingGuideMode")).toBe("mask");
        press("focus");
        expect(read("readingGuideMode")).toBe("none");
        expect(read("stopAnimationsActive")).toBe(true);
    });

    it("does not touch settings outside the profile", () => {
        c._setBlueLightFilterLevel(30);
        press("dyslexia");
        press("dyslexia");
        expect(read("blueLightFilterActive")).toBe(true);
        expect(read("blueLightFilterLevel")).toBe(30);
    });
});

describe("switching and manual changes", () => {
    beforeEach(setup);

    it("picking another profile first undoes the previous one", () => {
        const before = state();
        press("vision");
        press("dyslexia");
        expect(active()).toEqual({ vision: false, dyslexia: true, seizureSafe: false, focus: false });
        expect(read("typoFontSize")).toBe(100);
        expect(read("contrastTheme")).toBe("");
        press("dyslexia");
        expect(state()).toEqual(before);
    });

    it("focus after seizure-safe ends with only focus values, undo returns to the start", () => {
        const before = state();
        press("seizureSafe");
        press("focus");
        expect(read("colorBlindnessType")).toBe("none");
        expect(read("stopAnimationsActive")).toBe(true);
        expect(read("readingGuideMode")).toBe("mask");
        press("focus");
        expect(state()).toEqual(before);
    });

    it("a manual change un-presses the chip; the next click re-applies, the one after restores the original state", () => {
        const before = state();
        press("vision");
        c._applyTypo("fontSize", 175);
        expect(active().vision).toBe(false);
        press("vision");
        expect(read("typoFontSize")).toBe(150);
        expect(active().vision).toBe(true);
        press("vision");
        expect(state()).toEqual(before);
    });

    it("a manual change leaves the profile's settings alone when another profile is picked", () => {
        press("seizureSafe");
        c._resetColorBlindness();
        press("dyslexia");
        expect(read("stopAnimationsActive")).toBe(true);
        expect(read("readingGuideMode")).toBe("guide");
    });

    it("settings that match a profile by hand light the chip; its click turns those settings off", () => {
        c._setReadingGuideMode("mask");
        c.setStopAnimations(true);
        expect(active().focus).toBe(true);
        press("focus");
        expect(read("readingGuideMode")).toBe("none");
        expect(read("stopAnimationsActive")).toBe(false);
        expect(active().focus).toBe(false);
    });

    it("Reset all clears the active profile and its stored snapshot", () => {
        press("dyslexia");
        c.onResetAllToolbarPress();
        expect(get("/profileId")).toBe("");
        expect(get("/profileSnapshot")).toBe(null);
        expect(Object.values(active()).some(Boolean)).toBe(false);
        expect(stored()).toEqual({});
    });

    it("detail page Restore defaults also un-presses the chip", () => {
        press("dyslexia");
        c.resetDetail("font");
        expect(active().dyslexia).toBe(false);
    });

    it("ignores unknown profile ids", () => {
        expect(c.toggleProfile("nope")).toBe(false);
        expect(c.applyProfile("nope")).toBe(false);
        expect(c.undoProfile("nope")).toBe(false);
    });

    it("a corrupt stored snapshot falls back to defaults on undo", () => {
        press("vision");
        set("/profileSnapshot", { typoFontSize: 125 });
        press("vision");
        expect(read("typoFontSize")).toBe(100);
        expect(read("contrastTheme")).toBe("");
    });
});
