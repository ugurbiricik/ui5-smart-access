import InvisibleMessage from "sap/ui/core/InvisibleMessage";

// Screen-reader announcements via an ARIA live region. The assistant only
// changes CSS/theme when a feature is toggled, which is silent to a screen
// reader — so a blind user gets no confirmation. InvisibleMessage bridges that
// gap: it writes the text into a visually-hidden aria-live region the reader
// picks up. "Assertive" interrupts the current utterance; "Polite" waits.
export const announce = (text, assertive = false) => {
    if (!text) return;
    try {
        InvisibleMessage.getInstance().announce(text, assertive ? "Assertive" : "Polite");
    } catch (e) {
        /* announcements are best-effort; never break a feature toggle */
    }
};
