import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Fragment from "sap/ui/core/Fragment";
import { SHORTCUTS, SHORTCUT_ROWS, TOGGLE_SHORTCUT, shortcutKeys, shortcutAria } from "../js/shortcutList.js";
import { popoverInternalController as c, INFO_PAGES } from "../js/popoverController.js";
import { applyRowKeyShortcuts } from "../js/keyboardShortcuts.js";
import { oSettingsModel } from "../js/settingsModel.js";

const root = resolve(__dirname, "..");
const popover = readFileSync(resolve(root, "Popover.fragment.xml"), "utf8");
const help = readFileSync(resolve(root, "fragments/ShortcutsHelp.fragment.xml"), "utf8");
const bundles = ["i18n.properties", "i18n_de.properties", "i18n_en.properties"].map((f) =>
    readFileSync(resolve(root, "i18n", f), "utf8"));
const panelIds = [...popover.matchAll(/fragments\.(\w+Panel)"/g)]
    .map((m) => readFileSync(resolve(root, "fragments", m[1] + ".fragment.xml"), "utf8").match(/<Panel id="(\w+)"/))
    .filter(Boolean).map((m) => m[1]);

describe("shortcut list", () => {
    it("covers every feature row exactly once with a unique key", () => {
        expect(SHORTCUTS.map((s) => s.panelId).sort()).toEqual(panelIds.sort());
        const codes = SHORTCUT_ROWS.map((r) => r.code);
        expect(new Set(codes).size).toBe(codes.length);
        expect(SHORTCUT_ROWS[0]).toEqual({ code: TOGGLE_SHORTCUT.code, titleKey: TOGGLE_SHORTCUT.titleKey });
    });

    it("formats keys for display and for aria-keyshortcuts", () => {
        expect(shortcutKeys("KeyF")).toBe("Alt + Shift + F");
        expect(shortcutAria("KeyF")).toBe("Alt+Shift+F");
    });

    it("has every label and page text in all bundles", () => {
        const keys = [...SHORTCUT_ROWS.map((r) => r.titleKey), "shortcuts.title", "shortcuts.intro"];
        bundles.forEach((b) => keys.forEach((k) => expect(b).toMatch(new RegExp(`^${k.replace(".", "\\.")}=.+`, "m"))));
    });
});

describe("shortcuts help page", () => {
    it("is reachable from a header button on the main list only", () => {
        expect(popover).toMatch(/id="shortcutsButton"[\s\S]*?press="\.onShowShortcuts"[\s\S]*?visible="\{= \$\{settings>\/navPage\} === 'main'\}"/);
        expect(popover).toContain('fragments.ShortcutsHelp"');
        expect(help).toContain(`id="${INFO_PAGES.shortcuts.pageId}"`);
        expect(help).toContain("{settings>/shortcutRows}");
    });

    it("navigates there and returns focus to the header button", () => {
        vi.useFakeTimers();
        const main = { id: "main", getDomRef: () => null };
        const page = { id: "help", getDomRef: () => null };
        const btn = { focus: vi.fn() };
        let current = main;
        const nav = { getCurrentPage: () => current, to: vi.fn((p) => { current = p; }), backToTop: vi.fn(() => { current = main; }) };
        const controls = { saNav: nav, saMainPage: main, saPageShortcuts: page, shortcutsButton: btn };
        Fragment.byId.mockImplementation((_f, id) => controls[id] || null);
        c._sFragmentId = "frag";
        c._oPopover = { isOpen: () => true, getDomRef: () => null };
        oSettingsModel.setProperty("/navPage", "main");

        c.onShowShortcuts();
        expect(nav.to).toHaveBeenCalledWith(page);
        expect(oSettingsModel.getProperty("/navPage")).toBe("shortcuts");
        expect(oSettingsModel.getProperty("/navTitle")).toBe("shortcuts.title");

        c.onDetailDone();
        expect(nav.backToTop).toHaveBeenCalled();
        c.onAfterNavigate({ getParameter: () => main });
        vi.runAllTimers();
        expect(btn.focus).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it("formats list rows", () => {
        expect(c.fmtShortcutKeys("KeyA")).toBe("Alt + Shift + A");
        expect(c.fmtShortcutKeys(null)).toBe("");
        expect(c.fmtShortcutTitle("shortcuts.toggle")).toBe("shortcuts.toggle");
        expect(c.fmtShortcutTitle(undefined)).toBe("");
    });
});

describe("aria-keyshortcuts on rows", () => {
    beforeEach(() => Fragment.byId.mockReset());

    it("marks every feature row and keeps it after re-rendering", () => {
        const toolbars = {};
        Fragment.byId.mockImplementation((_f, id) => {
            if (!SHORTCUTS.some((s) => s.panelId === id)) return null;
            const dom = document.createElement("div");
            const tb = toolbars[id] = { dom, delegates: [], getDomRef: () => dom, addEventDelegate(d) { this.delegates.push(d); } };
            return { getHeaderToolbar: () => tb };
        });
        applyRowKeyShortcuts("rowsFrag");
        SHORTCUTS.forEach((s) => expect(toolbars[s.panelId].dom.getAttribute("aria-keyshortcuts")).toBe(shortcutAria(s.code)));
        const tb = toolbars.fontSizePanel;
        tb.dom.removeAttribute("aria-keyshortcuts");
        tb.delegates.forEach((d) => d.onAfterRendering());
        expect(tb.dom.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+F");
    });
});
