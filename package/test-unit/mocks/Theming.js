import { vi } from "vitest";

// sap/ui/core/Theming stub.
export default {
    getTheme: vi.fn(() => "sap_horizon"),
    setTheme: vi.fn(),
    attachApplied: vi.fn()
};
