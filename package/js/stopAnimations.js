import { injectStyle, removeStyle } from "./styleInjector.js";

// Stops animations, transitions and smooth scrolling (WCAG 2.2.2 Pause, Stop,
// Hide / motion sensitivity). Complements the OS-level prefers-reduced-motion
// signal, which callers can read via osPreferences.js to default this on.
const STYLE_ID = "ui5-smart-access-stop-animations";

const CSS = `
    *, *::before, *::after {
        animation-duration: 0.001s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
    }
`;

export const enableStopAnimations = () => injectStyle(STYLE_ID, CSS);
export const disableStopAnimations = () => removeStyle(STYLE_ID);
