export const PROFILES = [
    {
        id: "vision",
        icon: "sap-icon://show",
        values: { typoFontSize: 150, contrastTheme: "hcb", highlightLinksActive: true, bigCursorColor: "black" }
    },
    {
        id: "dyslexia",
        icon: "sap-icon://text",
        values: { typoLineHeight: 25, typoLetterSpacing: 40, typoWordSpacing: 35, typoAlign: "left", readingGuideMode: "guide" }
    },
    {
        id: "seizureSafe",
        icon: "sap-icon://high-priority",
        values: { stopAnimationsActive: true, colorBlindnessType: "grayscale", colorBlindnessIntensity: 60 }
    },
    {
        id: "focus",
        icon: "sap-icon://target-group",
        values: { readingGuideMode: "mask", stopAnimationsActive: true }
    }
];

export const PROFILE_IDS = PROFILES.map((p) => p.id);

export const SETTING_DEFAULTS = {
    typoFontSize: 100,
    typoZoom: 100,
    typoLineHeight: 0,
    typoWordSpacing: 0,
    typoLetterSpacing: 0,
    typoAlign: "none",
    contrastTheme: "",
    contrastModeActive: false,
    contrastBgColor: "#ffffff",
    contrastTextColor: "#000000",
    contrastUnderlineLinks: true,
    nightModeActive: false,
    highlightLinksActive: false,
    bigCursorColor: "none",
    bigCursorCustomColor: "#3b82f6",
    readingGuideMode: "none",
    stopAnimationsActive: false,
    colorBlindnessType: "none",
    colorBlindnessIntensity: 100
};

const DEPENDENT_KEYS = {
    contrastTheme: ["contrastModeActive", "contrastBgColor", "contrastTextColor", "contrastUnderlineLinks", "nightModeActive"],
    colorBlindnessType: ["colorBlindnessIntensity"],
    bigCursorColor: ["bigCursorCustomColor"]
};

export const getProfile = (id) => PROFILES.find((p) => p.id === id) || null;

export const snapshotKeys = (profile) => {
    const keys = new Set();
    Object.keys(profile.values).forEach((k) => {
        keys.add(k);
        (DEPENDENT_KEYS[k] || []).forEach((d) => keys.add(d));
    });
    return Array.from(keys);
};

export const takeSnapshot = (profile, read) =>
    Object.fromEntries(snapshotKeys(profile).map((k) => [k, read(k)]));

export const defaultsFor = (profile) =>
    Object.fromEntries(snapshotKeys(profile).map((k) => [k, SETTING_DEFAULTS[k]]));

const same = (a, b) => (typeof b === "number" ? Number(a) === b : a === b);

export const profileMatches = (profile, read) =>
    Object.keys(profile.values).every((k) => same(read(k), profile.values[k]));

export const activeProfileMap = (read) =>
    Object.fromEntries(PROFILES.map((p) => [p.id, profileMatches(p, read)]));

export const WATCHED_PATHS = Array.from(new Set(PROFILES.flatMap((p) => Object.keys(p.values))));

export const isValidSnapshot = (profile, snapshot) =>
    !!profile && !!snapshot && typeof snapshot === "object" &&
    snapshotKeys(profile).every((k) => Object.prototype.hasOwnProperty.call(snapshot, k));
