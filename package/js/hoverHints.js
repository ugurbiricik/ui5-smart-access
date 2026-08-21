import Fragment from "sap/ui/core/Fragment";
import { getText } from "./i18nModel.js";

// Per-feature hover hints: on mouse-enter of a panel a dark tooltip opens to
// the left showing the feature title, a short description and its keyboard
// shortcut. Implemented as a single pointer-events:none DOM overlay so it can
// never steal focus or close the main popover.

// The `shortcut` strings MUST match the bindings in keyboardShortcuts.js.
const HINTS = [
    { panelId: "fontSizePanel", titleKey: "fontSize.title", descKey: "hint.fontSize", shortcut: "Alt + Shift + F" },
    { panelId: "readingGuidePanel", titleKey: "readingGuide.title", descKey: "hint.readingGuide", shortcut: "Alt + Shift + R" },
    { panelId: "bigCursorPanel", titleKey: "bigCursor.title", descKey: "hint.bigCursor", shortcut: "Alt + Shift + G" },
    { panelId: "highlightLinksPanel", titleKey: "highlightLinks.title", descKey: "hint.highlightLinks", shortcut: "Alt + Shift + L" },
    { panelId: "ttsPanel", titleKey: "tts.title", descKey: "hint.tts", shortcut: "Alt + Shift + V" },
    { panelId: "colorBlindnessPanel", titleKey: "colorBlindness.title", descKey: "hint.colorBlindness", shortcut: "Alt + Shift + S" },
    { panelId: "blueLightFilterPanel", titleKey: "blueFilter.activate", descKey: "hint.blueLightFilter", shortcut: "Alt + Shift + B" },
    { panelId: "nightModePanel", titleKey: "nightMode.activate", descKey: "hint.nightMode", shortcut: "Alt + Shift + N" },
    { panelId: "contrastModePanel", titleKey: "contrastMode.activate", descKey: "hint.contrastMode", shortcut: "Alt + Shift + K" },
    { panelId: "stopAnimationsPanel", titleKey: "stopAnimations.title", descKey: "hint.stopAnimations", shortcut: "Alt + Shift + M" },
    { panelId: "toggleImagesPanel", titleKey: "toggleImages.hide", descKey: "hint.toggleImages", shortcut: "Alt + Shift + I" }
];

const attachedFragments = new Set();
let tooltipEl = null;

const ensureTooltip = () => {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "abicsHoverHint";
    tooltipEl.setAttribute("role", "tooltip");
    tooltipEl.innerHTML =
        '<div class="abicsHoverHintTitle"></div>' +
        '<div class="abicsHoverHintDesc"></div>' +
        '<div class="abicsHoverHintKey"></div>';
    document.body.appendChild(tooltipEl);
    return tooltipEl;
};

const showHint = (panelDom, hint) => {
    const tip = ensureTooltip();
    tip.querySelector(".abicsHoverHintTitle").textContent = getText(hint.titleKey);
    tip.querySelector(".abicsHoverHintDesc").textContent = getText(hint.descKey);
    tip.querySelector(".abicsHoverHintKey").textContent = hint.shortcut;

    // Measure with content applied, then choose the side automatically based on
    // available space. The host app decides where the trigger button lives, so
    // the popover may sit on either edge of the screen — never hard-code a side.
    tip.style.visibility = "hidden";
    tip.classList.add("visible");
    const rect = panelDom.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const margin = 14;

    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;
    const needed = tipRect.width + margin;

    // Prefer the side that fits; if neither fits, use the roomier side.
    const placeLeft = spaceLeft >= needed || (spaceLeft >= spaceRight && spaceRight < needed);

    let left;
    if (placeLeft) {
        left = Math.max(8, rect.left - tipRect.width - margin);
        tip.classList.remove("flip");
    } else {
        left = Math.min(window.innerWidth - tipRect.width - 8, rect.right + margin);
        tip.classList.add("flip");
    }

    let top = rect.top + rect.height / 2 - tipRect.height / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - tipRect.height - 8));

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.visibility = "visible";
};

export const hideHint = () => {
    if (tooltipEl) tooltipEl.classList.remove("visible");
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
        dom.addEventListener("mouseenter", () => showHint(dom, hint));
        dom.addEventListener("mouseleave", hideHint);
        attachedAny = true;
    });
    if (attachedAny) attachedFragments.add(sFragmentId);
};
