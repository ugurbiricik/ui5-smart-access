// Shared helper for injecting/removing a scoped <style> element into <head>.
// Used by presentational features (text spacing, big cursor, link
// highlighting, stop animations). Injecting a <style> is the popover-safe
// way to restyle host content — it never touches the popover DOM, so it does
// not close the popover (same approach nightMode.js uses).

export function injectStyle(id, css) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement("style");
        el.id = id;
        document.head.appendChild(el);
    }
    el.textContent = css;
    // Keep it at the end of <head> so it wins the cascade over late theme CSS.
    document.head.appendChild(el);
}

export function removeStyle(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

export function isStyleActive(id) {
    return !!document.getElementById(id);
}
