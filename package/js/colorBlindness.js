import { setFilter, removeFilter } from './filterManager.js';

// Colour-vision simulation filters with adjustable intensity. Each mode has a
// full-strength feColorMatrix; the applied matrix is interpolated between the
// identity matrix (0%) and the full matrix (100%) so users can dial the effect.

const IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

const MATRICES = {
    protanomaly: [0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0],
    deuteranomaly: [0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0],
    tritanomaly: [0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0]
};

const SVG_ID = 'ui5-smart-access-cb-filters';

function ensureSvg() {
    // Check the DOM, not a cached flag — if the SVG is ever removed, we must
    // re-inject it, otherwise updateMatrix() silently no-ops and the applied
    // url(#sa-cb-...) filter points at a missing element.
    if (document.getElementById(SVG_ID)) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', SVG_ID);
    svg.setAttribute('style', 'position:absolute;width:0;height:0;');
    Object.keys(MATRICES).forEach((id) => {
        const filter = document.createElementNS(svgNS, 'filter');
        filter.setAttribute('id', 'sa-cb-' + id);
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        const feColorMatrix = document.createElementNS(svgNS, 'feColorMatrix');
        feColorMatrix.setAttribute('type', 'matrix');
        feColorMatrix.setAttribute('values', MATRICES[id].join(' '));
        filter.appendChild(feColorMatrix);
        svg.appendChild(filter);
    });
    document.body.appendChild(svg);
}

// Interpolates full-strength matrix toward identity by (1 - t).
function interpolate(full, t) {
    return full
        .map((v, i) => IDENTITY[i] * (1 - t) + v * t)
        .map((n) => Math.round(n * 1000) / 1000)
        .join(' ');
}

function updateMatrix(type, t) {
    const filter = document.getElementById('sa-cb-' + type);
    if (filter) {
        const m = filter.querySelector('feColorMatrix');
        if (m) m.setAttribute('values', interpolate(MATRICES[type], t));
    }
}

// type: 'none' | 'protanomaly' | 'deuteranomaly' | 'tritanomaly' | 'grayscale'
// intensity: 0-100
export const applyColorBlindness = (type, intensity = 100) => {
    const t = Math.max(0, Math.min(1, intensity / 100));
    if (!type || type === 'none') {
        removeFilter('colorBlindness');
        return;
    }
    if (type === 'grayscale') {
        setFilter('colorBlindness', `grayscale(${t})`);
        return;
    }
    if (!MATRICES[type]) {
        removeFilter('colorBlindness');
        return;
    }
    ensureSvg();
    updateMatrix(type, t);
    setFilter('colorBlindness', `url(#sa-cb-${type})`);
};

export const resetColorBlindness = () => {
    removeFilter('colorBlindness');
};
