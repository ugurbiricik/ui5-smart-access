import { getText } from "./i18nModel.js";

const pct = (n) => getText("status.percent", [Math.round(Number(n) || 0)]);
const join = (parts) => parts.filter(Boolean).join(" · ");
const onOff = (on) => getText(on ? "status.on" : "status.off");

export const fontStatus = (fontSize, zoom, lineHeight, wordSpacing, letterSpacing, align) => {
    const parts = [];
    if ((fontSize ?? 100) !== 100) parts.push(getText("status.fontSize", [pct(fontSize)]));
    if ((zoom ?? 100) !== 100) parts.push(getText("status.zoom", [pct(zoom)]));
    if ((lineHeight || 0) !== 0 || (wordSpacing || 0) !== 0 || (letterSpacing || 0) !== 0) {
        parts.push(getText("status.spacing"));
    }
    if (align && align !== "none") parts.push(getText("status.align"));
    return parts.length ? join(parts) : getText("status.standard");
};

export const readingGuideStatus = (mode) =>
    mode === "guide" || mode === "mask" ? getText("readingGuide." + mode) : getText("status.off");

const CURSOR_COLORS = ["black", "white", "red", "blue", "green", "custom"];

export const bigCursorStatus = (color) =>
    CURSOR_COLORS.includes(color) ? getText("bigCursor." + color) : getText("status.off");

export const ttsStatus = (playing, hover) => {
    if (playing) return getText("status.ttsReading");
    if (hover) return getText("status.ttsHover");
    return getText("status.off");
};

const CB_MODES = ["protanomaly", "deuteranomaly", "tritanomaly", "grayscale"];

export const colorBlindnessStatus = (type, intensity) =>
    CB_MODES.includes(type)
        ? join([getText("colorBlindness." + type + ".title"), pct(intensity ?? 100)])
        : getText("status.off");

export const blueLightFilterStatus = (active, level) =>
    active ? join([getText("status.on"), pct(level)]) : getText("status.off");

export const contrastStatus = (active, theme, ratio) => {
    if (theme === "hcb" || theme === "hcw") return getText("contrast." + theme);
    if (active) return join([getText("status.contrastCustom"), ratio]);
    return getText("status.off");
};

export const toggleStatus = (active) => onOff(!!active);
