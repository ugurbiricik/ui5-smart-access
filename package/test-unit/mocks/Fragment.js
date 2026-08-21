import { vi } from "vitest";

// sap/ui/core/Fragment stub. Tests override byId/load per case
// (e.g. Fragment.byId.mockReturnValue(stubControl)).
export default {
    byId: vi.fn(() => null),
    load: vi.fn(() => Promise.resolve({}))
};
