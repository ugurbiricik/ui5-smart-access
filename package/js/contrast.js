let contrastActive = false;

export const toggleContrastMode = () => {
    contrastActive = !contrastActive;
    if (contrastActive) {
        document.body.style.filter = 'invert(1) grayscale(1)';
        document.body.style.backgroundColor = '#000';
        document.body.style.color = '#fff';
    } else {
        document.body.style.filter = '';
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
    }
    return contrastActive;
};

export const applyCustomContrast = (bg, text, underlineLinks) => {
    contrastActive = true;
    document.body.style.filter = '';
    document.body.style.backgroundColor = bg;
    document.body.style.color = text;
    document.querySelectorAll('a').forEach(a => {
        a.style.textDecoration = underlineLinks ? 'underline' : 'none';
        a.style.color = text;
    });
};

export const removeCustomContrast = () => {
    contrastActive = false;
    document.body.style.filter = '';
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
    document.querySelectorAll('a').forEach(a => {
        a.style.textDecoration = '';
        a.style.color = '';
    });
};

export const isContrastModeActive = () => contrastActive;
