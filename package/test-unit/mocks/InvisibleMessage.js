import { vi } from "vitest";

// sap/ui/core/InvisibleMessage stub.
const instance = { announce: vi.fn() };

export default {
    getInstance: vi.fn(() => instance)
};
