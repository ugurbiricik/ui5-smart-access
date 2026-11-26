import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fragment from "sap/ui/core/Fragment";
import { popoverInternalController as c, DETAIL_PAGES } from "../js/popoverController.js";
import { oSettingsModel } from "../js/settingsModel.js";
import { registerShortcuts, setShortcutContext } from "../js/keyboardShortcuts.js";

const makePage = (id) => {
    const dom = document.createElement("div");
    dom.id = id;
    document.body.appendChild(dom);
    return { id, getDomRef: () => dom, dom };
};

let controls;
let nav;

const setup = () => {
    controls = {};
    const main = makePage("saMainPage");
    controls.saMainPage = main;
    Object.values(DETAIL_PAGES).forEach((p) => {
        controls[p.pageId] = makePage(p.pageId);
        const tbFocus = vi.fn();
        controls[p.panelId] = {
            addStyleClass: vi.fn(),
            removeStyleClass: vi.fn(),
            getHeaderToolbar: () => ({ focus: tbFocus, firePress: vi.fn() }),
            getDomRef: () => null,
            tbFocus
        };
    });
    let current = main;
    nav = {
        getCurrentPage: () => current,
        to: vi.fn((page) => { current = page; }),
        backToTop: vi.fn(() => { current = main; })
    };
    controls.saNav = nav;
    Fragment.byId.mockImplementation((_frag, id) => controls[id] || null);
    c._sFragmentId = "frag";
    c._oPopover = { isOpen: () => true, close: vi.fn(), getDomRef: () => null, getModel: () => null };
    oSettingsModel.setProperty("/navPage", "main");
};

describe("popover navigation (NavContainer)", () => {
    beforeEach(setup);
    afterEach(() => vi.useRealTimers());

    it("every detail page has a page, a row and a title key", () => {
        expect(Object.keys(DETAIL_PAGES).sort()).toEqual(
            ["bigCursor", "blueLightFilter", "colorBlindness", "contrast", "font", "readingGuide", "tts"]
        );
    });

    it("navToDetail navigates to the page and sets the header state", () => {
        c.navToDetail("font");
        expect(nav.to).toHaveBeenCalledWith(controls.saPageFont);
        expect(oSettingsModel.getProperty("/navPage")).toBe("font");
        expect(oSettingsModel.getProperty("/navTitle")).toBe("fontSize.title");
        expect(c.getCurrentPageKey()).toBe("font");
    });

    it("onNavToDetail reads the target page from the row's custom data", () => {
        c.onNavToDetail({ getSource: () => ({ data: () => "tts" }) });
        expect(nav.to).toHaveBeenCalledWith(controls.saPageTts);
    });

    it("ignores an unknown page key", () => {
        c.navToDetail("nope");
        expect(nav.to).not.toHaveBeenCalled();
        expect(oSettingsModel.getProperty("/navPage")).toBe("main");
    });

    it("does not re-push the page that is already shown", () => {
        c.navToDetail("tts");
        c.navToDetail("tts");
        expect(nav.to).toHaveBeenCalledTimes(1);
    });

    it("navToMain goes back to the top only when a detail page is shown", () => {
        c.navToMain();
        expect(nav.backToTop).not.toHaveBeenCalled();
        c.navToDetail("contrast");
        c.onNavBack();
        expect(nav.backToTop).toHaveBeenCalledTimes(1);
        expect(oSettingsModel.getProperty("/navPage")).toBe("main");
    });

    it("returns focus to the row that opened the detail page", () => {
        vi.useFakeTimers();
        c.navToDetail("bigCursor");
        c.navToMain();
        c.onAfterNavigate({ getParameter: () => controls.saMainPage });
        vi.runAllTimers();
        expect(controls.bigCursorPanel.tbFocus).toHaveBeenCalledTimes(1);
    });

    it("focuses the first control of a detail page after navigating to it", () => {
        vi.useFakeTimers();
        const page = controls.saPageReadingGuide;
        const btn = document.createElement("button");
        page.dom.appendChild(btn);
        c.navToDetail("readingGuide");
        c.onAfterNavigate({ getParameter: () => page });
        vi.runAllTimers();
        expect(document.activeElement).toBe(btn);
    });

    it("an instant navToMain (popover closed) forgets the focus origin", () => {
        vi.useFakeTimers();
        c.navToDetail("font");
        c.navToMain(true);
        c.onAfterNavigate({ getParameter: () => controls.saMainPage });
        vi.runAllTimers();
        expect(controls.fontSizePanel.tbFocus).not.toHaveBeenCalled();
    });

    it("contrast cancel restores the snapshot and returns to the list", () => {
        oSettingsModel.setProperty("/contrastBgColor", "#ffffff");
        oSettingsModel.setProperty("/contrastTextColor", "#000000");
        c.navToDetail("contrast");
        oSettingsModel.setProperty("/contrastBgColor", "#ffff00");
        c.onContrastCancel();
        expect(oSettingsModel.getProperty("/contrastBgColor")).toBe("#ffffff");
        expect(nav.backToTop).toHaveBeenCalledTimes(1);
        expect(oSettingsModel.getProperty("/navPage")).toBe("main");
    });

    it("the blue-filter switch turns the filter on and off without leaving the page", () => {
        c.navToDetail("blueLightFilter");
        c.onBlueLightFilterSwitch({ getParameter: () => true });
        expect(oSettingsModel.getProperty("/blueLightFilterActive")).toBe(true);
        expect(document.documentElement.style.filter).toContain("sepia");
        expect(controls.blueLightFilterPanel.addStyleClass).toHaveBeenCalledWith("activeFeature");
        c.onBlueLightFilterSwitch({ getParameter: () => false });
        expect(oSettingsModel.getProperty("/blueLightFilterActive")).toBe(false);
        expect(document.documentElement.style.filter).toBe("");
        expect(oSettingsModel.getProperty("/navPage")).toBe("blueLightFilter");
    });

    it("opening the colour-blindness page applies no filter by itself", () => {
        oSettingsModel.setProperty("/colorBlindnessType", "none");
        c.navToDetail("colorBlindness");
        expect(oSettingsModel.getProperty("/colorBlindnessType")).toBe("none");
        expect(document.documentElement.style.filter).toBe("");
    });

    it("reset all returns to the main list", () => {
        c.navToDetail("tts");
        c.onResetAllToolbarPress();
        expect(nav.backToTop).toHaveBeenCalled();
        expect(oSettingsModel.getProperty("/navPage")).toBe("main");
    });

    it("the close button closes the responsive popover", () => {
        c.onPopoverClosePress();
        expect(c._oPopover.close).toHaveBeenCalledTimes(1);
    });
});

describe("keyboard shortcut on a detail row", () => {
    beforeEach(() => {
        setup();
        registerShortcuts();
        setShortcutContext(vi.fn(), {}, {});
    });

    const press = (code) => {
        const e = new KeyboardEvent("keydown", { code, altKey: true, shiftKey: true, cancelable: true, bubbles: true });
        document.dispatchEvent(e);
        return e;
    };

    it("pressing the shortcut of the open detail page goes back to the list", () => {
        c.navToDetail("contrast");
        const e = press("KeyK");
        expect(e.defaultPrevented).toBe(true);
        expect(nav.backToTop).toHaveBeenCalledTimes(1);
        expect(oSettingsModel.getProperty("/navPage")).toBe("main");
    });

    it("the shortcut of another page fires that row instead", async () => {
        vi.useFakeTimers();
        c.navToDetail("contrast");
        const firePress = vi.fn();
        controls.blueLightFilterPanel.getHeaderToolbar = () => ({ firePress });
        press("KeyB");
        await Promise.resolve();
        await vi.runAllTimersAsync();
        expect(nav.backToTop).not.toHaveBeenCalled();
        expect(firePress).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
