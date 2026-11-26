export const SHORTCUTS = [
    { code: "KeyF", panelId: "fontSizePanel", titleKey: "fontSize.title" },
    { code: "KeyK", panelId: "contrastModePanel", titleKey: "contrastMode.title" },
    { code: "KeyN", panelId: "nightModePanel", titleKey: "nightMode.title" },
    { code: "KeyS", panelId: "colorBlindnessPanel", titleKey: "colorBlindness.title" },
    { code: "KeyB", panelId: "blueLightFilterPanel", titleKey: "blueFilter.title" },
    { code: "KeyV", panelId: "ttsPanel", titleKey: "tts.title" },
    { code: "KeyR", panelId: "readingGuidePanel", titleKey: "readingGuide.title" },
    { code: "KeyL", panelId: "highlightLinksPanel", titleKey: "highlightLinks.title" },
    { code: "KeyM", panelId: "stopAnimationsPanel", titleKey: "stopAnimations.title" },
    { code: "KeyI", panelId: "toggleImagesPanel", titleKey: "toggleImages.title" },
    { code: "KeyG", panelId: "bigCursorPanel", titleKey: "bigCursor.title" }
];

export const TOGGLE_SHORTCUT = { code: "KeyA", titleKey: "shortcuts.toggle" };

export const shortcutKeys = (code) => `Alt + Shift + ${code.replace(/^Key/, "")}`;

export const shortcutAria = (code) => `Alt+Shift+${code.replace(/^Key/, "")}`;

export const SHORTCUT_ROWS = [TOGGLE_SHORTCUT, ...SHORTCUTS].map(({ code, titleKey }) => ({ code, titleKey }));
