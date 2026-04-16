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

// Relative luminance of a #rrggbb (or #rgb) hex color per WCAG.
const luminance = (hex) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const rgb = [0, 1, 2].map(i => parseInt(c.substr(i * 2, 2), 16) / 255);
    const lum = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
};

// Returns { ratioText, readable } where readable means WCAG AA (>= 4.5:1).
export const getContrastRatio = (bg, text) => {
    const l1 = luminance(bg);
    const l2 = luminance(text);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return { ratioText: ratio.toFixed(1) + ":1", readable: ratio >= 4.5 };
};
