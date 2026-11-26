import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Fragment from "sap/ui/core/Fragment";
import { labelRowGroups, ROW_GROUPS } from "../js/popoverHelpers.js";

const popover = readFileSync(resolve(__dirname, "../Popover.fragment.xml"), "utf8");
const props = (f) => Object.fromEntries(
    readFileSync(resolve(__dirname, "../i18n", f), "utf8")
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const groupBlock = (id) => {
    const m = popover.match(new RegExp(`<VBox id="${id}"[\\s\\S]*?</VBox>`));
    return m ? m[0] : "";
};
const rowsOf = (id) => [...groupBlock(id).matchAll(/fragments\.(\w+)Panel"/g)].map((m) => m[1]);

describe("main list groups (Popover.fragment.xml)", () => {
    it("vision, reading and motion groups hold the rows in the planned order", () => {
        expect(rowsOf("saGroupVision")).toEqual(["FontSize", "ContrastMode", "NightMode", "ColorBlindness", "BlueLightFilter"]);
        expect(rowsOf("saGroupReading")).toEqual(["TextToSpeech", "ReadingGuide", "HighlightLinks"]);
        expect(rowsOf("saGroupMotion")).toEqual(["StopAnimations", "ToggleImages", "BigCursor"]);
    });

    it("every main-list row sits in exactly one group, reset stays outside", () => {
        const mainPage = popover.match(/<VBox id="saMainPage"[\s\S]*?(?=<core:Fragment fragmentName="ui5-smart-access.fragments.ResetAllPanel")/)[0];
        const all = [...mainPage.matchAll(/fragments\.(\w+)Panel"/g)].map((m) => m[1]);
        const grouped = ROW_GROUPS.flatMap(rowsOf);
        expect(grouped).toHaveLength(11);
        expect(new Set(grouped).size).toBe(11);
        expect(all).toEqual(grouped);
        ROW_GROUPS.forEach((id) => expect(groupBlock(id)).not.toContain("ResetAllPanel"));
    });

    it("each group starts with an H3 title bound to an i18n key", () => {
        [["saGroupVision", "vision"], ["saGroupReading", "reading"], ["saGroupMotion", "motion"]].forEach(([id, key]) => {
            expect(groupBlock(id)).toMatch(new RegExp(`^<VBox id="${id}"[^>]*>\\s*<Title id="${id}Title" text="\\{i18n>group\\.${key}\\}" level="H3"`));
        });
    });
});

describe("group titles i18n", () => {
    const keys = ["group.vision", "group.reading", "group.motion"];
    it("de and default bundles use German titles", () => {
        ["i18n.properties", "i18n_de.properties"].forEach((f) => {
            const p = props(f);
            expect(keys.map((k) => p[k]), f).toEqual(["Sehen", "Lesen & Orientierung", "Bewegung & Ablenkung"]);
        });
    });
    it("en bundle uses English titles", () => {
        const p = props("i18n_en.properties");
        expect(keys.map((k) => p[k])).toEqual(["Vision", "Reading & orientation", "Motion & distractions"]);
    });
});

describe("labelRowGroups", () => {
    let controls;
    const makeGroup = (dom) => {
        const g = { dom, delegates: [], getDomRef: () => g.dom, addEventDelegate: vi.fn((d) => g.delegates.push(d)) };
        return g;
    };
    const makeDom = () => {
        const attrs = {};
        return { attrs, setAttribute: (k, v) => { attrs[k] = v; } };
    };

    beforeEach(() => {
        controls = {};
        ROW_GROUPS.forEach((id) => {
            controls[id] = makeGroup(null);
            controls[id + "Title"] = { getId: () => "frag--" + id + "Title" };
        });
        Fragment.byId.mockImplementation((_f, id) => controls[id] || null);
    });

    it("marks each rendered group as role=group labelled by its title, also after re-rendering", () => {
        labelRowGroups("frag");
        ROW_GROUPS.forEach((id) => {
            const g = controls[id];
            expect(g.addEventDelegate).toHaveBeenCalledTimes(1);
            g.dom = makeDom();
            g.delegates[0].onAfterRendering();
            expect(g.dom.attrs).toEqual({ role: "group", "aria-labelledby": "frag--" + id + "Title" });
        });
    });

    it("applies immediately when the group is already rendered", () => {
        const dom = makeDom();
        controls.saGroupVision.dom = dom;
        labelRowGroups("frag");
        expect(dom.attrs.role).toBe("group");
    });

    it("skips missing groups without throwing", () => {
        Fragment.byId.mockImplementation(() => null);
        expect(() => labelRowGroups("frag")).not.toThrow();
    });
});
