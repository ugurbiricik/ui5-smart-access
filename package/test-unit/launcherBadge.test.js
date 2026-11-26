import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const load = (file) => Object.fromEntries(
    readFileSync(resolve(__dirname, "../i18n", file), "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const bundles = { de: load("i18n_de.properties"), en: load("i18n_en.properties"), base: load("i18n.properties") };
let lang = "de";

vi.mock("../js/i18nModel.js", () => ({
    getText: (key, params = []) => {
        const t = bundles[lang][key];
        if (t === undefined) throw new Error("missing i18n key " + key);
        return t.replace(/\{(\d)\}/g, (_m, i) => String(params[i]));
    }
}));

const { oSettingsModel } = await import("../js/settingsModel.js");
const b = await import("../js/launcherBadge.js");

const DEFAULTS = {
    typoFontSize: 100, typoZoom: 100, typoLineHeight: 0, typoWordSpacing: 0, typoLetterSpacing: 0, typoAlign: "none",
    contrastTheme: "", contrastModeActive: false, nightModeActive: false, colorBlindnessType: "none",
    blueLightFilterActive: false, ttsHover: false, ttsPlaying: false, readingGuideMode: "none",
    highlightLinksActive: false, stopAnimationsActive: false, toggleImagesActive: false, bigCursorColor: "none"
};

const makeButton = ({ tooltip = "Barrierefreiheits-Assistent öffnen", inner = true } = {}) => {
    const root = document.createElement("button");
    root.id = "fab";
    root.setAttribute("aria-label", tooltip);
    const innerEl = document.createElement("span");
    innerEl.id = "fab-inner";
    root.appendChild(innerEl);
    document.body.appendChild(root);
    const delegates = [];
    return {
        root,
        innerEl,
        delegates,
        getDomRef: (suffix) => (suffix ? (suffix === "inner" && inner ? innerEl : null) : root),
        getFocusDomRef: () => root,
        getTooltip_AsString: () => tooltip,
        addEventDelegate: (d) => delegates.push(d),
        isDestroyed: () => false,
        rerender() {
            root.setAttribute("aria-label", tooltip);
            root.removeAttribute("data-sa-orig-label");
            innerEl.replaceChildren();
            innerEl.className = "";
            delegates.forEach((d) => d.onAfterRendering && d.onAfterRendering());
        }
    };
};

const badge = (btn) => btn.innerEl.querySelector(".saLauncherBadge");

beforeEach(() => {
    lang = "de";
    b._resetLauncherBadgeForTests();
    Object.entries(DEFAULTS).forEach(([k, v]) => oSettingsModel.setProperty("/" + k, v));
});

describe("countActiveFeatures", () => {
    it("is 0 for defaults and for an empty object", () => {
        expect(b.countActiveFeatures(DEFAULTS)).toBe(0);
        expect(b.countActiveFeatures({})).toBe(0);
        expect(b.countActiveFeatures()).toBe(0);
    });

    it("counts each main-list feature once", () => {
        const all = {
            ...DEFAULTS, typoFontSize: 125, typoZoom: 150, typoAlign: "left", contrastTheme: "hcb", contrastModeActive: true,
            nightModeActive: true, colorBlindnessType: "protanomaly", blueLightFilterActive: true, ttsHover: true, ttsPlaying: true,
            readingGuideMode: "mask", highlightLinksActive: true, stopAnimationsActive: true, toggleImagesActive: true,
            bigCursorColor: "red"
        };
        expect(b.countActiveFeatures(all)).toBe(11);
    });

    it("treats any typography deviation as the single font feature", () => {
        expect(b.countActiveFeatures({ ...DEFAULTS, typoLetterSpacing: 2 })).toBe(1);
        expect(b.countActiveFeatures({ ...DEFAULTS, typoZoom: 90 })).toBe(1);
        expect(b.countActiveFeatures({ ...DEFAULTS, typoAlign: "justify", typoFontSize: 80 })).toBe(1);
        expect(b.countActiveFeatures({ ...DEFAULTS, typoFontSize: "100" })).toBe(0);
    });

    it("contrast: HC theme or custom colours count once", () => {
        expect(b.countActiveFeatures({ ...DEFAULTS, contrastTheme: "hcw" })).toBe(1);
        expect(b.countActiveFeatures({ ...DEFAULTS, contrastModeActive: true })).toBe(1);
    });

    it("off-values are not counted", () => {
        expect(b.countActiveFeatures({ ...DEFAULTS, readingGuideMode: "", bigCursorColor: null, colorBlindnessType: undefined })).toBe(0);
    });
});

describe("labels", () => {
    it("de singular / plural", () => {
        lang = "de";
        expect(b.activeFeaturesLabel(1)).toBe("1 Funktion aktiv");
        expect(b.activeFeaturesLabel(3)).toBe("3 Funktionen aktiv");
    });

    it("en singular / plural", () => {
        lang = "en";
        expect(b.activeFeaturesLabel(1)).toBe("1 feature active");
        expect(b.activeFeaturesLabel(3)).toBe("3 features active");
    });

    it("default bundle is German and has every launcher key", () => {
        lang = "base";
        expect(b.activeFeaturesLabel(2)).toBe("2 Funktionen aktiv");
        ["de", "en", "base"].forEach((l) => {
            ["launcher.name", "launcher.activeOne", "launcher.activeMany"].forEach((k) => expect(bundles[l][k]).toBeTruthy());
        });
    });

    it("badge text caps at 99+", () => {
        expect(b.badgeText(3)).toBe("3");
        expect(b.badgeText(100)).toBe("99+");
    });
});

describe("attachLauncherBadge", () => {
    it("hidden at 0: no badge element, aria-label untouched", () => {
        const btn = makeButton();
        b.attachLauncherBadge(btn);
        expect(badge(btn)).toBeNull();
        expect(btn.root.getAttribute("aria-label")).toBe("Barrierefreiheits-Assistent öffnen");
    });

    it("shows the count and extends the accessible name, live on model change", () => {
        const btn = makeButton();
        b.attachLauncherBadge(btn);
        oSettingsModel.setProperty("/nightModeActive", true);
        expect(badge(btn).textContent).toBe("1");
        expect(badge(btn).getAttribute("aria-hidden")).toBe("true");
        expect(btn.innerEl.classList.contains("saLauncherBadgeHost")).toBe(true);
        expect(btn.root.getAttribute("aria-label")).toBe("Barrierefreiheits-Assistent öffnen, 1 Funktion aktiv");

        oSettingsModel.setProperty("/bigCursorColor", "red");
        oSettingsModel.setProperty("/typoFontSize", 150);
        expect(badge(btn).textContent).toBe("3");
        expect(btn.root.getAttribute("aria-label")).toBe("Barrierefreiheits-Assistent öffnen, 3 Funktionen aktiv");
        expect(btn.innerEl.querySelectorAll(".saLauncherBadge").length).toBe(1);
    });

    it("back to 0 removes the badge and restores the original label", () => {
        const btn = makeButton();
        b.attachLauncherBadge(btn);
        oSettingsModel.setProperty("/highlightLinksActive", true);
        oSettingsModel.setProperty("/highlightLinksActive", false);
        expect(badge(btn)).toBeNull();
        expect(btn.innerEl.classList.contains("saLauncherBadgeHost")).toBe(false);
        expect(btn.root.getAttribute("aria-label")).toBe("Barrierefreiheits-Assistent öffnen");
        expect(btn.root.hasAttribute("data-sa-orig-label")).toBe(false);
    });

    it("removes aria-label again when the control had none", () => {
        const btn = makeButton();
        btn.root.removeAttribute("aria-label");
        b.attachLauncherBadge(btn);
        oSettingsModel.setProperty("/toggleImagesActive", true);
        expect(btn.root.getAttribute("aria-label")).toBe("Barrierefreiheits-Assistent öffnen, 1 Funktion aktiv");
        oSettingsModel.setProperty("/toggleImagesActive", false);
        expect(btn.root.hasAttribute("aria-label")).toBe(false);
    });

    it("shows state restored before attach (saved preferences on page load)", () => {
        oSettingsModel.setProperty("/stopAnimationsActive", true);
        oSettingsModel.setProperty("/contrastTheme", "hcb");
        const btn = makeButton();
        b.attachLauncherBadge(btn);
        expect(badge(btn).textContent).toBe("2");
    });

    it("survives a re-render of the launcher", () => {
        const btn = makeButton();
        b.attachLauncherBadge(btn);
        oSettingsModel.setProperty("/readingGuideMode", "guide");
        btn.rerender();
        expect(badge(btn).textContent).toBe("1");
        expect(btn.root.getAttribute("aria-label")).toBe("Barrierefreiheits-Assistent öffnen, 1 Funktion aktiv");
    });

    it("falls back to the root element and to the i18n name without tooltip", () => {
        const btn = makeButton({ tooltip: "", inner: false });
        btn.root.removeAttribute("aria-label");
        lang = "en";
        b.attachLauncherBadge(btn);
        oSettingsModel.setProperty("/ttsHover", true);
        expect(btn.root.querySelector(":scope > .saLauncherBadge").textContent).toBe("1");
        expect(btn.root.classList.contains("saLauncherBadgeRel")).toBe(true);
        expect(btn.root.getAttribute("aria-label")).toBe("Accessibility, 1 feature active");
    });

    it("attaches once per control, ignores invalid input, updates several launchers", () => {
        const one = makeButton();
        const two = makeButton();
        b.attachLauncherBadge(one);
        b.attachLauncherBadge(one);
        b.attachLauncherBadge(two);
        b.attachLauncherBadge(null);
        b.attachLauncherBadge({});
        expect(one.delegates.length).toBe(1);
        oSettingsModel.setProperty("/blueLightFilterActive", true);
        expect(badge(one).textContent).toBe("1");
        expect(badge(two).textContent).toBe("1");
    });

    it("skips controls that are not rendered yet and renders them after rendering", () => {
        const btn = makeButton();
        const realGet = btn.getDomRef;
        btn.getDomRef = () => null;
        oSettingsModel.setProperty("/nightModeActive", true);
        expect(() => b.attachLauncherBadge(btn)).not.toThrow();
        btn.getDomRef = realGet;
        btn.delegates[0].onAfterRendering();
        expect(badge(btn).textContent).toBe("1");
    });

    it("drops destroyed controls", () => {
        const btn = makeButton();
        b.attachLauncherBadge(btn);
        btn.isDestroyed = () => true;
        oSettingsModel.setProperty("/nightModeActive", true);
        expect(badge(btn)).toBeNull();
    });
});
