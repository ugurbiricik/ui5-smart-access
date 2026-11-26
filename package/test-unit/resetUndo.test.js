import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Fragment from "sap/ui/core/Fragment";
import {
    popoverInternalController as c,
    DETAIL_PAGES,
    RESET_UNDO_MS,
    RESET_SNAPSHOT_KEYS
} from "../js/popoverController.js";
import { oSettingsModel, PERSISTED_KEYS } from "../js/settingsModel.js";
import { BADGE_PATHS } from "../js/launcherBadge.js";

const frag = readFileSync(resolve(__dirname, "../fragments/ResetAllPanel.fragment.xml"), "utf8");
const popoverXml = readFileSync(resolve(__dirname, "../Popover.fragment.xml"), "utf8");
const css = readFileSync(resolve(__dirname, "../css/style.css"), "utf8");
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
const canReset = () => c.fmtCanResetAll(...BADGE_PATHS.map((p) => get("/" + p)));

let controls;
let footerClasses;
let delegate;

const button = () => ({ focus: vi.fn() });

const setup = () => {
    controls = {};
    footerClasses = new Set();
    delegate = null;
    Object.values(DETAIL_PAGES).forEach((p) => {
        controls[p.panelId] = { addStyleClass: vi.fn(), removeStyleClass: vi.fn() };
    });
    ["nightModePanel", "toggleImagesPanel", "highlightLinksPanel", "stopAnimationsPanel", "textSpacingPanel"].forEach((id) => {
        controls[id] = { addStyleClass: vi.fn(), removeStyleClass: vi.fn() };
    });
    const footerDom = document.createElement("div");
    document.body.appendChild(footerDom);
    controls.resetAllFooter = {
        toggleStyleClass: (cls, on) => (on ? footerClasses.add(cls) : footerClasses.delete(cls)),
        addEventDelegate: vi.fn((d) => { delegate = d; }),
        getDomRef: () => footerDom
    };
    controls.resetUndoButton = button();
    controls.resetAllButton = button();
    Fragment.byId.mockImplementation((_frag, id) => controls[id] || null);
    c._sFragmentId = "frag";
    c._oPopover = { isOpen: () => true, close: vi.fn(), getDomRef: () => null };
    c.navToMain = vi.fn();
    c._undoWiredFooter = null;
    c._closeResetUndo(false);
    c._resetEverything();
    set("/navPage", "main");
    localStorage.clear();
    c.initProfiles();
};

const activateSome = () => {
    c._applyTypo("fontSize", 150);
    c.setNightMode(true);
    c.setHighlightLinks(true);
    c._setReadingGuideMode("mask");
    c._setBlueLightFilterLevel(70);
    set("/colorBlindnessIntensity", 60);
    c._applySettingValues({ colorBlindnessType: "deuteranomaly" });
    c.setImagesHidden(true);
};

const snapshotOf = () => Object.fromEntries(RESET_SNAPSHOT_KEYS.map((k) => [k, get("/" + k)]));

beforeEach(() => {
    vi.useFakeTimers();
    setup();
});

afterEach(() => {
    c._closeResetUndo(false);
    vi.useRealTimers();
});

describe("Reset All footer markup", () => {
    it("sits at the end of the main page as a footer, not as a red toolbar", () => {
        const main = popoverXml.match(/<VBox id="saMainPage"[\s\S]*?<\/VBox>\s*<core:Fragment fragmentName="ui5-smart-access.fragments.FontSizePage"/)[0];
        expect(main.trim().split("\n").filter((l) => l.includes("core:Fragment")).slice(-2)[0]).toContain("ResetAllPanel");
        expect(popoverXml).not.toContain("resetAllToolbar");
        expect(frag).toContain('class="saDetailFooter saMainFooter"');
        expect(css).not.toMatch(/danger/);
    });

    it("reset button is a secondary button, enabled from the active-feature count", () => {
        const btn = frag.match(/<Button\s+id="resetAllButton"[\s\S]*?\/>/)[0];
        expect(btn).not.toMatch(/type="(Reject|Emphasized|Negative)"/);
        expect(btn).toContain("formatter: '.fmtCanResetAll'");
        const parts = [...btn.match(/parts: \[([^\]]*)\]/)[1].matchAll(/settings>\/(\w+)/g)].map((m) => m[1]);
        expect(parts).toEqual(BADGE_PATHS);
    });

    it("undo text and button are only visible while the undo window is open", () => {
        expect(frag).toMatch(/id="resetAllButton"[\s\S]*?visible="\{= !\$\{settings>\/resetUndoOpen\}\}"/);
        expect(frag).toMatch(/id="resetUndoText"[\s\S]*?visible="\{settings>\/resetUndoOpen\}"/);
        expect(frag).toMatch(/id="resetUndoButton"[\s\S]*?press="\.onResetUndo"[\s\S]*?visible="\{settings>\/resetUndoOpen\}"/);
        expect(frag).toContain('ariaDescribedBy="resetUndoText"');
    });

    it("countdown bar runs 5 s and pauses with the timer", () => {
        expect(RESET_UNDO_MS).toBe(5000);
        expect(css).toMatch(/\.saMainFooter\.saUndoPending::before[\s\S]*?animation: saUndoCountdown 5s linear forwards/);
        expect(css).toMatch(/\.saMainFooter\.saUndoPaused::before \{\s*animation-play-state: paused;/);
    });

    it("every bundle has the footer texts", () => {
        Object.entries(i18n).forEach(([n, p]) => {
            ["resetAll.title", "resetAll.done", "resetAll.undo", "announce.resetAll", "announce.resetUndone"].forEach((k) => {
                expect(p[k], `${n} ${k}`).toBeTruthy();
            });
        });
        expect(i18n.i18n_de["resetAll.undo"]).toBe("Rückgängig");
        expect(i18n.i18n_en["resetAll.undo"]).toBe("Undo");
    });
});

describe("Reset All enabled state", () => {
    it("is disabled when nothing is active", () => {
        expect(canReset()).toBe(false);
    });

    it("is enabled as soon as one feature is on and disabled again after reset", () => {
        c.setHighlightLinks(true);
        expect(canReset()).toBe(true);
        c.onResetAllToolbarPress();
        expect(canReset()).toBe(false);
    });

    it("counts each kind of feature", () => {
        const cases = [
            ["/typoFontSize", 125], ["/typoAlign", "left"], ["/contrastTheme", "hcb"], ["/nightModeActive", true],
            ["/colorBlindnessType", "protanomaly"], ["/blueLightFilterActive", true], ["/ttsHover", true],
            ["/ttsPlaying", true], ["/readingGuideMode", "guide"], ["/highlightLinksActive", true],
            ["/stopAnimationsActive", true], ["/toggleImagesActive", true], ["/bigCursorColor", "black"]
        ];
        const defaults = Object.fromEntries(BADGE_PATHS.map((p) => [p, get("/" + p)]));
        cases.forEach(([path, value]) => {
            const vals = BADGE_PATHS.map((p) => ("/" + p === path ? value : defaults[p]));
            expect(c.fmtCanResetAll(...vals), path).toBe(true);
        });
    });
});

describe("Reset All with undo", () => {
    it("resets everything, opens the undo window and focuses Undo", () => {
        activateSome();
        c.onResetAllToolbarPress();
        expect(get("/typoFontSize")).toBe(100);
        expect(get("/nightModeActive")).toBe(false);
        expect(document.documentElement.classList.contains("abics-night-mode")).toBe(false);
        expect(get("/resetUndoOpen")).toBe(true);
        expect(footerClasses.has("saUndoPending")).toBe(true);
        vi.advanceTimersByTime(0);
        expect(controls.resetUndoButton.focus).toHaveBeenCalled();
    });

    it("Undo within 5 s restores every setting and its persistence", () => {
        activateSome();
        const before = snapshotOf();
        const prefsBefore = stored();
        c.onResetAllToolbarPress();
        expect(stored()).toEqual({});
        vi.advanceTimersByTime(RESET_UNDO_MS - 100);
        c.onResetUndo();
        expect(snapshotOf()).toEqual(before);
        PERSISTED_KEYS.forEach((k) => expect(stored()[k], k).toEqual(prefsBefore[k]));
        expect(get("/resetUndoOpen")).toBe(false);
        expect(canReset()).toBe(true);
        expect(controls.nightModePanel.addStyleClass).toHaveBeenCalledWith("activeFeature");
        vi.advanceTimersByTime(0);
        expect(controls.resetAllButton.focus).toHaveBeenCalled();
    });

    it("restores the DOM effects (typography, filters, images)", () => {
        activateSome();
        const htmlFont = document.getElementById("ui5-smart-access-typography")?.textContent;
        c.onResetAllToolbarPress();
        c.onResetUndo();
        expect(document.getElementById("ui5-smart-access-typography")?.textContent).toBe(htmlFont);
        expect(get("/toggleImagesActive")).toBe(true);
        expect(get("/blueLightFilterActive")).toBe(true);
        expect(get("/blueLightFilterLevel")).toBe(70);
        expect(get("/colorBlindnessIntensity")).toBe(60);
    });

    it("restores the high-contrast theme, profile record, hover reading and TTS values", () => {
        c._applySettingValues({ contrastTheme: "hcw" });
        set("/ttsRate", 1.5);
        set("/ttsVolume", 0.5);
        c.onTTSHoverChange({ getParameter: () => true });
        c.applyProfile("focus");
        const before = snapshotOf();
        c.onResetAllToolbarPress();
        expect(get("/contrastTheme")).toBe("");
        expect(get("/profileId")).toBe("");
        c.onResetUndo();
        expect(snapshotOf()).toEqual(before);
        expect(get("/profileActive").focus).toBe(true);
    });

    it("after 5 s the undo window closes and the reset stays", () => {
        activateSome();
        c.onResetAllToolbarPress();
        vi.advanceTimersByTime(RESET_UNDO_MS);
        expect(get("/resetUndoOpen")).toBe(false);
        expect(footerClasses.has("saUndoPending")).toBe(false);
        c.onResetUndo();
        expect(get("/typoFontSize")).toBe(100);
        expect(canReset()).toBe(false);
    });

    it("hovering the footer pauses the countdown, leaving resumes the rest", () => {
        activateSome();
        c.onResetAllToolbarPress();
        vi.advanceTimersByTime(2000);
        delegate.onmouseover({});
        expect(footerClasses.has("saUndoPaused")).toBe(true);
        vi.advanceTimersByTime(10000);
        expect(get("/resetUndoOpen")).toBe(true);
        delegate.onmouseout({ relatedTarget: null });
        expect(footerClasses.has("saUndoPaused")).toBe(false);
        vi.advanceTimersByTime(2900);
        expect(get("/resetUndoOpen")).toBe(true);
        vi.advanceTimersByTime(200);
        expect(get("/resetUndoOpen")).toBe(false);
    });

    it("keyboard focus inside the footer pauses, mouse focus does not", () => {
        activateSome();
        c.onResetAllToolbarPress();
        delegate.onfocusin({ target: { matches: () => false } });
        vi.advanceTimersByTime(RESET_UNDO_MS);
        expect(get("/resetUndoOpen")).toBe(false);

        activateSome();
        c.onResetAllToolbarPress();
        delegate.onfocusin({ target: { matches: (q) => q === ":focus-visible" } });
        vi.advanceTimersByTime(60000);
        expect(get("/resetUndoOpen")).toBe(true);
        delegate.onfocusout({ relatedTarget: null });
        vi.advanceTimersByTime(RESET_UNDO_MS);
        expect(get("/resetUndoOpen")).toBe(false);
    });

    it("moving the pointer between footer children does not resume", () => {
        activateSome();
        c.onResetAllToolbarPress();
        const inner = document.createElement("span");
        controls.resetAllFooter.getDomRef().appendChild(inner);
        delegate.onmouseover({});
        delegate.onmouseout({ relatedTarget: inner });
        vi.advanceTimersByTime(60000);
        expect(get("/resetUndoOpen")).toBe(true);
    });

    it("switching a feature on during the window drops the undo offer", () => {
        activateSome();
        c.onResetAllToolbarPress();
        c.setStopAnimations(true);
        expect(get("/resetUndoOpen")).toBe(false);
        c.onResetUndo();
        expect(get("/typoFontSize")).toBe(100);
        expect(get("/stopAnimationsActive")).toBe(true);
    });

    it("a feature switching itself off (e.g. reading ends) keeps the offer", () => {
        set("/ttsPlaying", true);
        c.onResetAllToolbarPress();
        set("/ttsPlaying", false);
        expect(get("/resetUndoOpen")).toBe(true);
    });

    it("opening a detail page drops the undo offer", () => {
        activateSome();
        c.onResetAllToolbarPress();
        controls.saNav = { getCurrentPage: () => null, to: vi.fn() };
        controls.saPageFont = {};
        c.navToDetail("font");
        expect(get("/resetUndoOpen")).toBe(false);
        expect(controls.saNav.to).toHaveBeenCalled();
    });

    it("expiry moves keyboard focus out of the footer back to the main list", () => {
        const main = document.createElement("div");
        const first = document.createElement("button");
        main.appendChild(first);
        document.body.appendChild(main);
        controls.saMainPage = { getDomRef: () => main };
        const footerDom = controls.resetAllFooter.getDomRef();
        const undoEl = document.createElement("button");
        footerDom.appendChild(undoEl);
        activateSome();
        c.onResetAllToolbarPress();
        undoEl.focus();
        vi.advanceTimersByTime(RESET_UNDO_MS);
        vi.advanceTimersByTime(1);
        expect(document.activeElement).toBe(first);
    });

    it("the delegate is wired only once per footer", () => {
        activateSome();
        c.onResetAllToolbarPress();
        c.onResetUndo();
        c.onResetAllToolbarPress();
        expect(controls.resetAllFooter.addEventDelegate).toHaveBeenCalledTimes(1);
    });

    it("Undo without an open window does nothing", () => {
        expect(() => c.onResetUndo()).not.toThrow();
        expect(canReset()).toBe(false);
    });
});
