import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const raw = readFileSync(resolve(__dirname, "../css/style.css"), "utf8");
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
const rootBlock = rootMatch ? rootMatch[1] : "";
const rules = css.replace(rootMatch ? rootMatch[0] : "", "");
const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

const tokens = Object.fromEntries(
    [...rootBlock.matchAll(/(--sa-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
);

const FIXED = new Set([
    "--sa-tts-read",
    "--sa-tts-hover",
    "--sa-bluefilter-cool",
    "--sa-bluefilter-warm",
    "--sa-hcw-bg",
    "--sa-hcw-text",
    "--sa-hcb-bg",
    "--sa-hcb-text",
    "--sa-spectrum"
]);

describe("style.css design tokens", () => {
    it("declares the --sa-* tokens in a single :root block", () => {
        expect(rootMatch).toBeTruthy();
        expect(Object.keys(tokens).length).toBeGreaterThan(20);
        expect(css.match(/:root\s*\{/g)).toHaveLength(1);
    });

    it("has no literal colour outside the token block", () => {
        expect(rules.match(COLOR) || []).toEqual([]);
    });

    it("binds every theme-dependent token to a SAP theme parameter with a fallback", () => {
        Object.entries(tokens)
            .filter(([name]) => !FIXED.has(name))
            .forEach(([name, value]) => {
                expect(value, name).toMatch(/^var\(--sap[A-Za-z0-9_]+,\s*.+\)$/);
            });
    });

    it("only references tokens that are declared", () => {
        const used = new Set([...rules.matchAll(/var\((--sa-[\w-]+)/g)].map((m) => m[1]));
        expect(used.size).toBeGreaterThan(0);
        [...used].forEach((name) => expect(tokens, name).toHaveProperty(name));
    });

    it("keeps the popover header flat (no gradient)", () => {
        const header = rules.match(/\.abicsAccessibilityPopover \.sapMPopoverHeader\s*\{([^}]*)\}/);
        expect(header).toBeTruthy();
        expect(header[1]).not.toMatch(/gradient/);
        expect(header[1]).toContain("var(--sa-header-bg)");
    });

    it("styles the active row with the list selection tokens", () => {
        const active = rules.match(/\.sapMPanel\.activeFeature \.sapMTB\.sapMPanelHeaderTB\s*\{([^}]*)\}/);
        expect(active).toBeTruthy();
        expect(active[1]).toContain("var(--sa-row-active)");
        expect(active[1]).toContain("var(--sa-row-active-line)");
    });

    it("keeps !important below the pre-token budget (257)", () => {
        expect((css.match(/!important/g) || []).length).toBeLessThanOrEqual(167);
    });
});
