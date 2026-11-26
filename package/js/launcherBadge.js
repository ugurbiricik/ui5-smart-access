import { oSettingsModel } from "./settingsModel.js";
import { getText } from "./i18nModel.js";

const FONT_DEFAULTS = { typoFontSize: 100, typoZoom: 100, typoLineHeight: 0, typoWordSpacing: 0, typoLetterSpacing: 0 };
const isSet = (v) => v !== undefined && v !== null && v !== "" && v !== "none";
const differs = (v, def) => v !== undefined && v !== null && Number(v) !== def;

const FEATURE_CHECKS = [
    (d) => Object.keys(FONT_DEFAULTS).some((k) => differs(d[k], FONT_DEFAULTS[k])) || isSet(d.typoAlign),
    (d) => d.contrastTheme === "hcb" || d.contrastTheme === "hcw" || !!d.contrastModeActive,
    (d) => !!d.nightModeActive,
    (d) => isSet(d.colorBlindnessType),
    (d) => !!d.blueLightFilterActive,
    (d) => !!d.ttsHover || !!d.ttsPlaying,
    (d) => isSet(d.readingGuideMode),
    (d) => !!d.highlightLinksActive,
    (d) => !!d.stopAnimationsActive,
    (d) => !!d.toggleImagesActive,
    (d) => isSet(d.bigCursorColor)
];

export const BADGE_PATHS = [
    "typoFontSize", "typoZoom", "typoLineHeight", "typoWordSpacing", "typoLetterSpacing", "typoAlign",
    "contrastTheme", "contrastModeActive", "nightModeActive", "colorBlindnessType",
    "blueLightFilterActive", "ttsHover", "ttsPlaying", "readingGuideMode",
    "highlightLinksActive", "stopAnimationsActive", "toggleImagesActive", "bigCursorColor"
];

export const countActiveFeatures = (data = {}) =>
    FEATURE_CHECKS.reduce((n, check) => n + (check(data) ? 1 : 0), 0);

export const activeFeaturesLabel = (count) =>
    count === 1 ? getText("launcher.activeOne") : getText("launcher.activeMany", [count]);

export const badgeText = (count) => (count > 99 ? "99+" : String(count));

const BADGE_CLASS = "saLauncherBadge";
const HOST_CLASS = "saLauncherBadgeHost";
const REL_CLASS = "saLauncherBadgeRel";
const ORIG_LABEL = "data-sa-orig-label";
const NO_LABEL = "\u0000";

const baseName = (oControl, oFocus) => {
    const tooltip = typeof oControl.getTooltip_AsString === "function" ? oControl.getTooltip_AsString() : "";
    const text = typeof oControl.getText === "function" ? oControl.getText() : "";
    const orig = oFocus.getAttribute(ORIG_LABEL);
    return (orig && orig !== NO_LABEL ? orig : "") || tooltip || text || getText("launcher.name");
};

const badgeHost = (oControl) => {
    const inner = typeof oControl.getDomRef === "function" ? oControl.getDomRef("inner") : null;
    return inner || oControl.getDomRef();
};

export const renderBadge = (oControl, count) => {
    const oRoot = oControl && typeof oControl.getDomRef === "function" ? oControl.getDomRef() : null;
    if (!oRoot) return;
    const oHost = badgeHost(oControl);
    const oFocus = (typeof oControl.getFocusDomRef === "function" && oControl.getFocusDomRef()) || oRoot;
    let oBadge = oHost.querySelector(":scope > ." + BADGE_CLASS);

    if (count > 0) {
        if (!oBadge) {
            oBadge = document.createElement("span");
            oBadge.className = BADGE_CLASS;
            oBadge.setAttribute("aria-hidden", "true");
            oHost.appendChild(oBadge);
        }
        oHost.classList.add(HOST_CLASS);
        if (!oHost.classList.contains(REL_CLASS) && window.getComputedStyle(oHost).position === "static") {
            oHost.classList.add(REL_CLASS);
        }
        oBadge.textContent = badgeText(count);
        if (!oFocus.hasAttribute(ORIG_LABEL)) {
            oFocus.setAttribute(ORIG_LABEL, oFocus.getAttribute("aria-label") ?? NO_LABEL);
        }
        oFocus.setAttribute("aria-label", baseName(oControl, oFocus) + ", " + activeFeaturesLabel(count));
        return;
    }

    if (oBadge) oBadge.remove();
    oHost.classList.remove(HOST_CLASS, REL_CLASS);
    if (oFocus.hasAttribute(ORIG_LABEL)) {
        const orig = oFocus.getAttribute(ORIG_LABEL);
        if (orig === NO_LABEL) oFocus.removeAttribute("aria-label");
        else oFocus.setAttribute("aria-label", orig);
        oFocus.removeAttribute(ORIG_LABEL);
    }
};

const currentCount = () => countActiveFeatures(
    Object.fromEntries(BADGE_PATHS.map((p) => [p, oSettingsModel.getProperty("/" + p)]))
);

const _attached = new Set();
let _bindings = null;

const refreshAll = () => {
    const count = currentCount();
    _attached.forEach((oControl) => {
        if (typeof oControl.isDestroyed === "function" && oControl.isDestroyed()) {
            _attached.delete(oControl);
            return;
        }
        renderBadge(oControl, count);
    });
};

const watchModel = () => {
    if (_bindings || typeof oSettingsModel.bindProperty !== "function") return;
    _bindings = BADGE_PATHS.map((p) => {
        const oBinding = oSettingsModel.bindProperty("/" + p);
        oBinding.attachChange(refreshAll);
        return oBinding;
    });
};

export const attachLauncherBadge = (oControl) => {
    if (!oControl || typeof oControl.addEventDelegate !== "function" || _attached.has(oControl)) return;
    _attached.add(oControl);
    oControl.addEventDelegate({
        onAfterRendering: () => renderBadge(oControl, currentCount())
    });
    watchModel();
    renderBadge(oControl, currentCount());
};

export const refreshLauncherBadges = refreshAll;

export const _resetLauncherBadgeForTests = () => {
    _attached.clear();
    if (_bindings) _bindings.forEach((b) => b.detachChange && b.detachChange(refreshAll));
    _bindings = null;
};
