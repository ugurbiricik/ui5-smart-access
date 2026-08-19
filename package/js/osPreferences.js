// Reads OS/browser-level accessibility preferences. Best practice (WCAG,
// MDN) is to honor these persistent user signals by default and let the
// widget only override them, so the site stays consistent with the system.

const query = (q) => (window.matchMedia ? window.matchMedia(q).matches : false);

export const prefersReducedMotion = () => query("(prefers-reduced-motion: reduce)");
export const prefersDark = () => query("(prefers-color-scheme: dark)");
export const prefersMoreContrast = () => query("(prefers-contrast: more)");
