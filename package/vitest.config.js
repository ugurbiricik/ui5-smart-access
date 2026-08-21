import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The library imports a handful of `sap/*` bare specifiers that Node can't
// resolve outside a UI5 runtime — alias them to lightweight local mocks.
const mock = (p) => fileURLToPath(new URL(`./test-unit/mocks/${p}`, import.meta.url));

export default defineConfig({
    test: {
        environment: "jsdom",
        setupFiles: ["./test-unit/setup.js"],
        include: ["test-unit/**/*.test.js"],
        restoreMocks: true,
        clearMocks: true,
        coverage: {
            provider: "v8",
            include: ["js/**", "index.js"]
        }
    },
    resolve: {
        alias: {
            "sap/ui/model/json/JSONModel": mock("JSONModel.js"),
            "sap/ui/core/Fragment": mock("Fragment.js"),
            "sap/ui/core/Theming": mock("Theming.js"),
            "sap/ui/model/resource/ResourceModel": mock("ResourceModel.js")
        }
    }
});
