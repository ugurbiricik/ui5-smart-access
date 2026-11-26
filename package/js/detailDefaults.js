export const DETAIL_DEFAULTS = {
    font: {
        "/typoFontSize": 100,
        "/typoZoom": 100,
        "/typoLineHeight": 0,
        "/typoWordSpacing": 0,
        "/typoLetterSpacing": 0,
        "/typoAlign": "none"
    },
    readingGuide: { "/readingGuideMode": "none" },
    bigCursor: { "/bigCursorColor": "none" },
    tts: { "/ttsRate": 1, "/ttsVolume": 1, "/ttsHover": false, "/ttsPlaying": false },
    colorBlindness: { "/colorBlindnessType": "none", "/colorBlindnessIntensity": 100 },
    blueLightFilter: { "/blueLightFilterActive": false, "/blueLightFilterLevel": 50 },
    contrast: {
        "/contrastModeActive": false,
        "/contrastTheme": "",
        "/contrastBgColor": "#ffffff",
        "/contrastTextColor": "#000000",
        "/contrastUnderlineLinks": true
    }
};

const same = (actual, expected) => {
    if (actual === undefined || actual === null) return true;
    if (typeof expected === "string") return String(actual).toLowerCase() === expected.toLowerCase();
    if (typeof expected === "number") return Number(actual) === expected;
    return actual === expected;
};

export const isDetailAtDefault = (key, read) => {
    const defaults = DETAIL_DEFAULTS[key];
    if (!defaults) return true;
    return Object.keys(defaults).every((path) => same(read(path), defaults[path]));
};
