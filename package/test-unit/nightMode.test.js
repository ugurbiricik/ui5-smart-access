import { describe, it, expect, vi, beforeEach } from "vitest";

// nightMode keeps module-level state (isDarkMode, originalTheme,
// darkThemePreloaded, themeAppliedHandlerAttached). Reset modules before each
// test for a clean slate. Theming is imported AFTER the reset so the test holds
// the exact same mock instance the module under test received.

let nm;
let Theming;

beforeEach(async () => {
    vi.resetModules();
    Theming = (await import("sap/ui/core/Theming")).default;
    nm = await import("../js/nightMode.js");
});

describe("toggleNightMode", () => {
    it("turns dark mode on: returns true, sets the dark theme, tags <html>, injects both style blocks", () => {
        const on = nm.toggleNightMode();
        expect(on).toBe(true);
        expect(nm.isNightModeActive()).toBe(true);
        expect(Theming.setTheme).toHaveBeenCalledWith("sap_horizon_dark");
        expect(document.documentElement.classList.contains("saNightMode")).toBe(true);
        expect(document.getElementById("popover-dark-mode-styles")).toBeTruthy();
        expect(document.getElementById("host-dark-mode-styles")).toBeTruthy();
    });

    it("attaches the theme-applied handler once", () => {
        nm.toggleNightMode();
        expect(Theming.attachApplied).toHaveBeenCalledTimes(1);
        nm.toggleNightMode(); // off
        nm.toggleNightMode(); // on again
        // Still attached only once (guarded by themeAppliedHandlerAttached).
        expect(Theming.attachApplied).toHaveBeenCalledTimes(1);
    });

    it("turns dark mode off on the second call: returns false, restores theme, removes class + styles", () => {
        nm.toggleNightMode();
        const off = nm.toggleNightMode();
        expect(off).toBe(false);
        expect(nm.isNightModeActive()).toBe(false);
        // originalTheme was captured from the mock's getTheme() -> "sap_horizon".
        expect(Theming.setTheme).toHaveBeenLastCalledWith("sap_horizon");
        expect(document.documentElement.classList.contains("saNightMode")).toBe(false);
        expect(document.getElementById("popover-dark-mode-styles")).toBeNull();
        expect(document.getElementById("host-dark-mode-styles")).toBeNull();
    });
});

describe("disableNightMode", () => {
    it("turns dark mode off when it is active", () => {
        nm.toggleNightMode();
        expect(nm.isNightModeActive()).toBe(true);
        nm.disableNightMode();
        expect(nm.isNightModeActive()).toBe(false);
        expect(document.getElementById("popover-dark-mode-styles")).toBeNull();
        expect(document.getElementById("host-dark-mode-styles")).toBeNull();
        expect(document.documentElement.classList.contains("saNightMode")).toBe(false);
    });

    it("is a no-op when dark mode is already off", () => {
        expect(nm.isNightModeActive()).toBe(false);
        nm.disableNightMode();
        expect(nm.isNightModeActive()).toBe(false);
        expect(Theming.setTheme).not.toHaveBeenCalled();
    });
});

describe("prefetchDarkTheme", () => {
    it("appends a preload <link> pointing at the sap_horizon_dark theme URL", () => {
        const themeLink = document.createElement("link");
        themeLink.id = "sap-ui-theme-sap.ui.core";
        themeLink.rel = "stylesheet";
        themeLink.href = "/resources/sap/ui/core/themes/sap_horizon/library.css";
        document.head.appendChild(themeLink);

        nm.prefetchDarkTheme();

        const preloads = document.querySelectorAll('link[data-ui5-smart-access="dark-preload"]');
        expect(preloads.length).toBe(1);
        const preload = preloads[0];
        expect(preload.rel).toBe("preload");
        // Source sets the `.as` property; jsdom keeps it as a property, not a
        // reflected attribute, so assert the property rather than getAttribute.
        expect(preload.as).toBe("style");
        expect(preload.href).toContain("/themes/sap_horizon_dark/");
        expect(preload.href).toContain("library.css");
        expect(preload.href).not.toContain("/themes/sap_horizon/library.css");
    });

    it("is idempotent — a second call adds no further preload links", () => {
        const themeLink = document.createElement("link");
        themeLink.id = "sap-ui-theme-sap.ui.core";
        themeLink.rel = "stylesheet";
        themeLink.href = "/resources/sap/ui/core/themes/sap_horizon/library.css";
        document.head.appendChild(themeLink);

        nm.prefetchDarkTheme();
        nm.prefetchDarkTheme();

        expect(document.querySelectorAll('link[data-ui5-smart-access="dark-preload"]').length).toBe(1);
    });

    it("ignores theme links that do not contain a /themes/<name>/ segment", () => {
        const bogus = document.createElement("link");
        bogus.id = "sap-ui-theme-custom";
        bogus.rel = "stylesheet";
        bogus.href = "/resources/custom/style.css";
        document.head.appendChild(bogus);

        nm.prefetchDarkTheme();
        expect(document.querySelectorAll('link[data-ui5-smart-access="dark-preload"]').length).toBe(0);
    });
});
