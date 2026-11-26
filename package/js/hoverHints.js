import Fragment from "sap/ui/core/Fragment";
import { getText } from "./i18nModel.js";
import { oSettingsModel } from "./settingsModel.js";

// Per-feature hover hints: on mouse-enter of a panel a dark tooltip opens to
// the left showing the feature title and a short description. Implemented as a
// single pointer-events:none DOM overlay so it can never steal focus or close
// the main popover.

const HINTS = [
    { panelId: "fontSizePanel", titleKey: "fontSize.title", descKey: "hint.fontSize" },
    { panelId: "readingGuidePanel", titleKey: "readingGuide.title", descKey: "hint.readingGuide" },
    { panelId: "bigCursorPanel", titleKey: "bigCursor.title", descKey: "hint.bigCursor" },
    { panelId: "highlightLinksPanel", titleKey: "highlightLinks.title", descKey: "hint.highlightLinks" },
    { panelId: "ttsPanel", titleKey: "tts.title", descKey: "hint.tts" },
    { panelId: "colorBlindnessPanel", titleKey: "colorBlindness.title", descKey: "hint.colorBlindness" },
    { panelId: "blueLightFilterPanel", titleKey: "blueFilter.title", descKey: "hint.blueLightFilter" },
    { panelId: "nightModePanel", titleKey: "nightMode.title", descKey: "hint.nightMode" },
    { panelId: "contrastModePanel", titleKey: "contrastMode.title", descKey: "hint.contrastMode" },
    { panelId: "stopAnimationsPanel", titleKey: "stopAnimations.title", descKey: "hint.stopAnimations" },
    { panelId: "toggleImagesPanel", titleKey: "toggleImages.title", descKey: "hint.toggleImages" }
];

export const HINT_DELAY_MS = 600;
export const HOVER_QUERY = "(hover: hover)";

const MARGIN = 14;
const EDGE = 8;

const attachedFragments = new Set();
let tooltipEl = null;
let pendingTimer = null;

export const canHover = () =>
    typeof window.matchMedia === "function" && window.matchMedia(HOVER_QUERY).matches;

const isMouse = (e) => !e || !e.pointerType || e.pointerType === "mouse";

const onMainPage = () => (oSettingsModel.getProperty("/navPage") || "main") === "main";

const ensureTooltip = () => {
    if (tooltipEl && tooltipEl.isConnected) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "abicsHoverHint";
    tooltipEl.setAttribute("role", "tooltip");
    tooltipEl.setAttribute("aria-hidden", "true");
    tooltipEl.innerHTML =
        '<div class="abicsHoverHintTitle"></div>' +
        '<div class="abicsHoverHintDesc"></div>';
    document.body.appendChild(tooltipEl);
    return tooltipEl;
};

const clearPending = () => {
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
};

const isShown = (dom) => {
    if (!dom || !dom.isConnected) return false;
    const rect = dom.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
};

export const placeHint = (anchorRect, tipRect, viewportWidth, viewportHeight) => {
    const needed = tipRect.width + MARGIN;
    const spaceLeft = anchorRect.left - EDGE;
    const spaceRight = viewportWidth - anchorRect.right - EDGE;
    let side = null;
    if (spaceLeft >= needed) side = "left";
    else if (spaceRight >= needed) side = "right";
    if (!side) return null;
    const left = side === "left"
        ? anchorRect.left - MARGIN - tipRect.width
        : anchorRect.right + MARGIN;
    const centre = anchorRect.top + anchorRect.height / 2;
    const top = Math.max(EDGE, Math.min(centre - tipRect.height / 2, viewportHeight - tipRect.height - EDGE));
    return { side, left, top };
};

const showHint = (panelDom, hint) => {
    if (!onMainPage() || !isShown(panelDom)) return;
    const tip = ensureTooltip();
    tip.querySelector(".abicsHoverHintTitle").textContent = getText(hint.titleKey);
    tip.querySelector(".abicsHoverHintDesc").textContent = getText(hint.descKey);

    // Measure with content applied, then choose the side automatically based on
    // available space. The host app decides where the trigger button lives, so
    // the popover may sit on either edge of the screen — never hard-code a side.
    tip.style.visibility = "hidden";
    tip.classList.add("visible");
    const popover = panelDom.closest(".abicsAccessibilityPopover") || panelDom;
    const popRect = popover.getBoundingClientRect();
    const rowRect = panelDom.getBoundingClientRect();
    const anchor = { left: popRect.left, right: popRect.right, top: rowRect.top, height: rowRect.height };
    const pos = placeHint(anchor, tip.getBoundingClientRect(), window.innerWidth, window.innerHeight);
    if (!pos) {
        tip.classList.remove("visible", "flip");
        tip.style.visibility = "";
        return;
    }
    tip.classList.toggle("flip", pos.side === "right");
    tip.style.left = `${pos.left}px`;
    tip.style.top = `${pos.top}px`;
    tip.style.visibility = "visible";
};

export const hideHint = () => {
    clearPending();
    if (tooltipEl) tooltipEl.classList.remove("visible");
};

const scheduleHint = (dom, hint, e) => {
    if (!isMouse(e) || !canHover() || !onMainPage()) return;
    clearPending();
    pendingTimer = setTimeout(() => {
        pendingTimer = null;
        showHint(dom, hint);
    }, HINT_DELAY_MS);
};

// Attaches hover listeners to every panel once its DOM exists (call after the
// popover has opened at least once). Idempotent per fragment.
export const attachHoverHints = (sFragmentId) => {
    if (attachedFragments.has(sFragmentId)) return;
    let attachedAny = false;
    HINTS.forEach((hint) => {
        const panel = Fragment.byId(sFragmentId, hint.panelId);
        const dom = panel && panel.getDomRef();
        if (!dom) return;
        dom.addEventListener("pointerenter", (e) => scheduleHint(dom, hint, e));
        dom.addEventListener("pointerleave", hideHint);
        dom.addEventListener("pointerdown", hideHint);
        dom.addEventListener("keydown", hideHint);
        dom.addEventListener("wheel", hideHint, { passive: true });
        attachedAny = true;
    });
    if (attachedAny) attachedFragments.add(sFragmentId);
};
