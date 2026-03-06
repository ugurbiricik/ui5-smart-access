const STORAGE_KEY = "eye-able-images-hidden";
const IMAGE_SELECTORS = 'img,svg,.sapMImg,.sapMBtnIcon,.sapUiIcon,.sapFAvatar,.sapMIllustratedMessage-illu';

let imagesHidden = false;
let observer = null;
let debounceTimer = null;

function setVisibilityAll(value) {
    document.querySelectorAll(IMAGE_SELECTORS).forEach(el => el.style.visibility = value);
    document.querySelectorAll('[style*="background-image"]').forEach(el => el.style.visibility = value);
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
    localStorage.setItem(STORAGE_KEY, imagesHidden);
    return imagesHidden;
};

export const initImageHider = () => {
    const shouldHide = localStorage.getItem(STORAGE_KEY) === "true";
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
    localStorage.setItem(STORAGE_KEY, false);
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
