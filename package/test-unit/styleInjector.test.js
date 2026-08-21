import { describe, it, expect } from "vitest";
import { injectStyle, removeStyle, isStyleActive } from "../js/styleInjector.js";

describe("styleInjector", () => {
    it("injects a <style> element with the given id and css", () => {
        injectStyle("x", "a{color:red}");
        const el = document.getElementById("x");
        expect(el).toBeTruthy();
        expect(el.tagName).toBe("STYLE");
        expect(el.textContent).toBe("a{color:red}");
    });

    it("updates the same element on a second call (no duplicate)", () => {
        injectStyle("x", "a{}");
        injectStyle("x", "b{}");
        expect(document.querySelectorAll("#x").length).toBe(1);
        expect(document.getElementById("x").textContent).toBe("b{}");
    });

    it("keeps the style last in <head> so it wins the cascade", () => {
        injectStyle("x", "a{}");
        const other = document.createElement("style");
        document.head.appendChild(other);
        injectStyle("x", "a{}"); // re-inject
        expect(document.head.lastChild.id).toBe("x");
    });

    it("removeStyle removes it; removing a missing id is a no-op", () => {
        injectStyle("x", "a{}");
        removeStyle("x");
        expect(document.getElementById("x")).toBeNull();
        expect(() => removeStyle("does-not-exist")).not.toThrow();
    });

    it("isStyleActive reflects presence", () => {
        expect(isStyleActive("x")).toBe(false);
        injectStyle("x", "a{}");
        expect(isStyleActive("x")).toBe(true);
    });
});
