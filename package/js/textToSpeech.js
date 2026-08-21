const synth = window.speechSynthesis || null;
let utterance = null;
let isReading = false;
let isPaused = false;
let settingsModel = null;

// Full-page reading state.
let segments = [];
let segIndex = 0;
let currentHighlight = null;
let currentHoverHighlight = null;
// A session token: every start/stop/jump/hover bumps it so a stale utterance
// `onend` (SpeechSynthesis fires them asynchronously after cancel()) can bail.
let readToken = 0;

function isTTSSupported() {
    return synth !== null;
}

export const initTextToSpeech = (oSettingsModel) => {
    settingsModel = oSettingsModel;
};

const getRate = () => settingsModel?.getProperty("/ttsRate") || 1;
const getVolume = () => {
    const v = settingsModel?.getProperty("/ttsVolume");
    return v == null ? 1 : v;
};
const setPlaying = (playing) => settingsModel?.setProperty("/ttsPlaying", playing);

// Subtrees that must never be read aloud during full-page reading: our own
// popover + flyout, the UI5 static area (popovers/dialogs render there), and
// non-content / hidden nodes.
const EXCLUDE_SELECTOR =
    '.abicsAccessibilityPopover, [id="sap-ui-static"], script, style, noscript, svg, [aria-hidden="true"]';

// Returns the nearest block-level ancestor of a text node — the element that
// gets highlighted while its text is spoken.
function nearestBlock(node) {
    let el = node.parentElement;
    while (el && el !== document.body) {
        const tag = el.tagName;
        if (/^(H[1-6]|P|LI|TD|TH|DT|DD|BLOCKQUOTE|FIGCAPTION|SUMMARY|CAPTION)$/.test(tag)) {
            return el;
        }
        const display = getComputedStyle(el).display;
        if (display === "block" || display === "list-item" ||
            display === "flex" || display === "grid" || display === "table-cell") {
            return el;
        }
        el = el.parentElement;
    }
    return node.parentElement || document.body;
}

// Walks the page in document order and groups visible text into readable
// segments, one per nearest block, skipping the excluded subtrees.
function collectSegments() {
    const out = [];
    const seen = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent || parent.closest(EXCLUDE_SELECTOR)) return NodeFilter.FILTER_REJECT;
            const cs = getComputedStyle(parent);
            if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    let n;
    while ((n = walker.nextNode())) {
        const text = n.nodeValue.replace(/\s+/g, " ").trim();
        if (!text) continue;
        const block = nearestBlock(n);
        if (seen.has(block)) {
            out[seen.get(block)].text += " " + text;
        } else {
            seen.set(block, out.length);
            out.push({ el: block, text });
        }
    }
    return out.filter((s) => s.text.length > 1);
}

function highlight(el) {
    clearHighlight();
    currentHighlight = el;
    el.classList.add("sa-tts-reading");
    try {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (e) {
        el.scrollIntoView();
    }
}

function clearHighlight() {
    if (currentHighlight) {
        currentHighlight.classList.remove("sa-tts-reading");
        currentHighlight = null;
    }
}

function highlightHover(el) {
    clearHoverHighlight();
    currentHoverHighlight = el;
    el.classList.add("sa-tts-hover-reading");
}

function clearHoverHighlight() {
    if (currentHoverHighlight) {
        currentHoverHighlight.classList.remove("sa-tts-hover-reading");
        currentHoverHighlight = null;
    }
}

function speakNext(token) {
    if (token !== readToken) return;
    clearHighlight();
    if (segIndex >= segments.length) {
        isReading = false;
        isPaused = false;
        setPlaying(false);
        return;
    }
    const seg = segments[segIndex];
    // Skip segments whose element has since been detached or hidden.
    if (!seg.el || !seg.el.isConnected) {
        segIndex++;
        return speakNext(token);
    }
    highlight(seg.el);
    utterance = new SpeechSynthesisUtterance(seg.text);
    utterance.rate = getRate();
    utterance.volume = getVolume();
    const advance = () => {
        if (token !== readToken) return;
        segIndex++;
        speakNext(token);
    };
    utterance.onend = advance;
    utterance.onerror = advance;
    synth.speak(utterance);
}

// Reads the whole page aloud, segment by segment, highlighting each block as
// it is spoken. The assistant popover/flyout is excluded.
export const startReading = () => {
    if (!isTTSSupported()) return;
    stopReading();
    segments = collectSegments();
    segIndex = 0;
    if (!segments.length) return;
    isReading = true;
    isPaused = false;
    setPlaying(true);
    const token = ++readToken;
    speakNext(token);
};

export const stopReading = () => {
    if (!isTTSSupported()) return;
    isReading = false;
    isPaused = false;
    readToken++;
    setPlaying(false);
    clearHighlight();
    clearHoverHighlight();
    if (synth.speaking || synth.pending) synth.cancel();
};

// Pause the current full-page read (keeps position so it can resume).
export const pauseReading = () => {
    if (!isTTSSupported() || !isReading || isPaused) return;
    synth.pause();
    isPaused = true;
    setPlaying(false);
};

// Resume a paused read from where it left off.
export const resumeReading = () => {
    if (!isTTSSupported() || !isReading || !isPaused) return;
    synth.resume();
    isPaused = false;
    setPlaying(true);
};

// Jumps to a segment index and reads from there. Used by skip forward/back.
function jumpTo(index) {
    if (!isTTSSupported() || !segments.length) return;
    segIndex = Math.max(0, Math.min(segments.length - 1, index));
    isReading = true;
    isPaused = false;
    setPlaying(true);
    const token = ++readToken;
    clearHighlight();
    if (synth.speaking || synth.pending) synth.cancel();
    // Small delay so the cancel settles before the next speak (Chrome can drop
    // a speak() issued in the same tick as cancel()). Guarded by the token.
    setTimeout(() => speakNext(token), 60);
}

export const skipNext = () => {
    if (segments.length) jumpTo(segIndex + 1);
};

export const skipPrev = () => {
    if (segments.length) jumpTo(segIndex - 1);
};

// True while a full-page read session exists (playing OR paused).
export const isReadingActive = () => isReading;
export const isReadingPaused = () => isPaused;

export const setTTSRate = (rate) => {
    settingsModel?.setProperty("/ttsRate", rate);
};

export const setTTSVolume = (volume) => {
    settingsModel?.setProperty("/ttsVolume", volume);
};

let hoverActive = false;
let hoverDebounceTimer = null;

// Hover reading: speak the hovered element's text and box it in a DISTINCT
// colour (`.sa-tts-hover-reading`, different from the green full-page one).
// Works everywhere, including inside the popover.
function hoverHandler(e) {
    if (!e.target || !e.target.innerText || !isTTSSupported()) return;

    const target = e.target;
    clearTimeout(hoverDebounceTimer);
    hoverDebounceTimer = setTimeout(() => {
        // Interrupt any full-page read (bump the token so its queued advance
        // bails instead of speaking the next segment over the hovered text).
        isReading = false;
        isPaused = false;
        readToken++;
        setPlaying(false);
        clearHighlight();
        if (synth.speaking || synth.pending) synth.cancel();
        highlightHover(target);
        utterance = new SpeechSynthesisUtterance(target.innerText);
        utterance.rate = getRate();
        utterance.volume = getVolume();
        // Clear only THIS element's highlight. cancel() (fired when the next
        // hover starts) triggers this utterance's onend asynchronously — if it
        // cleared the shared `currentHoverHighlight` it would wipe the NEW
        // hover's highlight, so scope the removal to this specific element.
        const done = () => {
            target.classList.remove("sa-tts-hover-reading");
            if (currentHoverHighlight === target) currentHoverHighlight = null;
        };
        utterance.onend = done;
        utterance.onerror = done;
        synth.speak(utterance);
    }, 300);
}

export const enableHoverRead = () => {
    if (!hoverActive) {
        document.body.addEventListener("mouseover", hoverHandler);
        hoverActive = true;
    }
};

export const disableHoverRead = () => {
    if (hoverActive) {
        document.body.removeEventListener("mouseover", hoverHandler);
        clearTimeout(hoverDebounceTimer);
        clearHoverHighlight();
        hoverActive = false;
    }
};
