const STORAGE_KEY = "ui5-smart-access-images-hidden";
const IMAGE_SELECTORS = 'img,svg,.sapMImg,.sapMBtnIcon,.sapUiIcon,.sapFAvatar,.sapMIllustratedMessage-illu';

let imagesHidden = false;
let observer = null;
let debounceTimer = null;

// localStorage can throw (private mode, disabled storage, quota) — this runs at
// page load via initImageHider(), so guard it or the host app crashes on boot.
function readHiddenPref() {
    try {
        return localStorage.getItem(STORAGE_KEY) === "true";
    } catch (e) {
        return false;
    }
}

function writeHiddenPref(value) {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
        /* storage unavailable — feature still works for this session */
    }
}

// Whether to leave an image-type element alone. Inside our popover/flyout we
// still hide the decorative feature icons + swatch images (like hays.de: the
// icons go, the text labels stay and the panel header stays clickable), but we
// KEEP the icons of control buttons (steppers −/+, player ⏪▶⏹⏩, close, reset)
// visible — those buttons are icon-only, so hiding their icon would leave a
// blank, unusable button.
function shouldSkip(el) {
    if (!el.closest(".abicsAccessibilityPopover")) return false; // page element → hide
    return !!el.closest(".sapMBtn");                             // popover: skip button icons only
}

function setVisibilityAll(value) {
    document.querySelectorAll(IMAGE_SELECTORS).forEach(el => {
        if (!shouldSkip(el)) el.style.visibility = value;
    });
    document.querySelectorAll('[style*="background-image"]').forEach(el => {
        if (!shouldSkip(el)) el.style.visibility = value;
    });
    setVisibilityInShadowRoots(value);
}

function setVisibilityInShadowRoots(value) {
    document.querySelectorAll(IMAGE_SELECTORS).forEach(el => {
        if (el.shadowRoot) {
            el.shadowRoot.querySelectorAll(IMAGE_SELECTORS).forEach(shEl => shEl.style.visibility = value);
            el.shadowRoot.querySelectorAll('[style*="background-image"]').forEach(shEl => shEl.style.visibility = value);
        }
    });
}

export const toggleImages = () => {
    imagesHidden = !imagesHidden;
    if (imagesHidden) {
        setVisibilityAll('hidden');
        startImageObserver();
    } else {
        setVisibilityAll('');
        stopImageObserver();
    }
    writeHiddenPref(imagesHidden);
    return imagesHidden;
};

export const initImageHider = () => {
    const shouldHide = readHiddenPref();
    if (shouldHide) {
        imagesHidden = true;
        setVisibilityAll('hidden');
        startImageObserver();
    }
};

export const showImages = () => {
    setVisibilityAll('');
    imagesHidden = false;
    stopImageObserver();
    writeHiddenPref(false);
};

export const areImagesHidden = () => imagesHidden;

export const startImageObserver = () => {
    if (observer) return;
    observer = new MutationObserver(() => {
        if (!imagesHidden) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            setVisibilityAll('hidden');
        }, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
};

export const stopImageObserver = () => {
    if (observer) observer.disconnect();
    observer = null;
    clearTimeout(debounceTimer);
};
