// Reading aids that follow the pointer:
//   - "guide": a horizontal ruler line that helps track the current line.
//   - "mask": dims everything except a horizontal strip around the pointer.
// Elements are fixed-position, pointer-events:none overlays appended to <body>
// so they never steal focus or block clicks (the popover stays open).

const GUIDE_ID = "ui5-smart-access-reading-guide";
const MASK_TOP_ID = "ui5-smart-access-mask-top";
const MASK_BOTTOM_ID = "ui5-smart-access-mask-bottom";
const STRIP_HEIGHT = 80; // px height of the readable strip in mask mode

let mode = "none";
let moveHandler = null;

const makeOverlay = (id, css) => {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.setAttribute("data-ui5-smart-access", "reading-aid");
        el.style.cssText = css;
        document.body.appendChild(el);
    }
    return el;
};

const BASE = "position:fixed;left:0;width:100%;pointer-events:none;z-index:2147483646;";

const positionGuide = (y) => {
    const el = document.getElementById(GUIDE_ID);
    if (el) el.style.top = `${y - 2}px`;
};

const positionMask = (y) => {
    const top = document.getElementById(MASK_TOP_ID);
    const bottom = document.getElementById(MASK_BOTTOM_ID);
    if (top) top.style.height = `${Math.max(0, y - STRIP_HEIGHT / 2)}px`;
    if (bottom) {
        bottom.style.top = `${y + STRIP_HEIGHT / 2}px`;
        bottom.style.height = `${Math.max(0, window.innerHeight - (y + STRIP_HEIGHT / 2))}px`;
    }
};

const teardown = () => {
    if (moveHandler) {
        document.removeEventListener("mousemove", moveHandler);
        moveHandler = null;
    }
    [GUIDE_ID, MASK_TOP_ID, MASK_BOTTOM_ID].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
};

export const setReadingGuide = (newMode) => {
    teardown();
    mode = newMode || "none";

    if (mode === "guide") {
        makeOverlay(GUIDE_ID, `${BASE}top:0;height:4px;background:#1e3a8a;box-shadow:0 0 4px rgba(0,0,0,0.4);`);
        moveHandler = (e) => positionGuide(e.clientY);
    } else if (mode === "mask") {
        makeOverlay(MASK_TOP_ID, `${BASE}top:0;height:0;background:rgba(0,0,0,0.6);`);
        makeOverlay(MASK_BOTTOM_ID, `${BASE}top:0;height:0;background:rgba(0,0,0,0.6);`);
        moveHandler = (e) => positionMask(e.clientY);
    }

    if (moveHandler) {
        document.addEventListener("mousemove", moveHandler);
    }
};

export const resetReadingGuide = () => {
    setReadingGuide("none");
};

export const getReadingGuideMode = () => mode;
