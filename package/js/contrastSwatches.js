import { getContrastRatio, getWcagLevel } from "./contrast.js";

const COLORS = [
    { color: "#000000", mark: "#ffffff", nameKey: "contrast.color.black" },
    { color: "#ffffff", mark: "#000000", nameKey: "contrast.color.white" },
    { color: "#7f1d1d", mark: "#ffffff", nameKey: "contrast.color.darkRed" },
    { color: "#ffeb3b", mark: "#000000", nameKey: "contrast.color.yellow" },
    { color: "#166534", mark: "#ffffff", nameKey: "contrast.color.green" },
    { color: "#0a3d8f", mark: "#ffffff", nameKey: "contrast.color.blue" }
];

const SCHEMES = [
    { id: "off", labelKey: "contrast.scheme.off" },
    { id: "yellowOnBlack", labelKey: "contrast.scheme.yellowOnBlack", bg: "#000000", text: "#ffeb3b" },
    { id: "whiteOnBlack", labelKey: "contrast.scheme.whiteOnBlack", bg: "#000000", text: "#ffffff" },
    { id: "darkOnCream", labelKey: "contrast.scheme.darkOnCream", bg: "#fdf6e3", text: "#1d2d3e" },
    { id: "whiteOnBlue", labelKey: "contrast.scheme.whiteOnBlue", bg: "#0a3d8f", text: "#ffffff" },
    { id: "custom", labelKey: "contrast.scheme.custom" }
];

const hexKey = (hex) => String(hex || "").replace("#", "").toLowerCase();

const sameColor = (a, b) => !!a && !!b && hexKey(a) === hexKey(b);

export const buildContrastColors = () =>
    COLORS.map((c) => ({ color: c.color, key: hexKey(c.color), nameKey: c.nameKey }));

export const buildContrastSchemes = () =>
    SCHEMES.map((s) => {
        const item = { id: s.id, labelKey: s.labelKey, bg: s.bg || "", text: s.text || "", ratio: "", level: "" };
        if (s.bg && s.text) {
            const { ratio, ratioText } = getContrastRatio(s.bg, s.text);
            item.ratio = ratioText;
            item.level = getWcagLevel(ratio);
        }
        return item;
    });

export const findSchemeId = (bg, text) => {
    const hit = SCHEMES.find((s) => s.bg && sameColor(s.bg, bg) && sameColor(s.text, text));
    return hit ? hit.id : "custom";
};

export const schemeLabelKey = (id) => {
    const hit = SCHEMES.find((s) => s.id === id);
    return hit ? hit.labelKey : "";
};

export const buildSwatchCss = (scope) => {
    const rules = [];
    SCHEMES.filter((s) => s.bg && s.text).forEach((s) => {
        rules.push(
            `${scope} .saScheme[data-sa-scheme="${s.id}"] .sapMBtnInner,` +
            `${scope} .saScheme[data-sa-scheme="${s.id}"] .sapMBtnInner.sapMToggleBtnPressed` +
            ` { background-color: ${s.bg} !important; }`,
            `${scope} .saScheme[data-sa-scheme="${s.id}"] .sapMBtnInner .sapMBtnContent,` +
            `${scope} .saScheme[data-sa-scheme="${s.id}"] .sapMBtnInner .sapUiIcon` +
            ` { color: ${s.text} !important; }`
        );
    });
    COLORS.forEach((c) => {
        rules.push(
            `${scope} .saSwatch[data-sa-color="${hexKey(c.color)}"] .sapMBtnInner,` +
            `${scope} .saSwatch[data-sa-color="${hexKey(c.color)}"] .sapMBtnInner.sapMToggleBtnPressed` +
            ` { background-color: ${c.color} !important; }`,
            `${scope} .saSwatch[data-sa-color="${hexKey(c.color)}"] .sapMBtnInner .sapUiIcon` +
            ` { color: ${c.mark} !important; }`
        );
    });
    return rules.join("\n");
};
