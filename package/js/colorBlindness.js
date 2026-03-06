import { setFilter, removeFilter } from './filterManager.js';

const FILTERS = {
    none: '',
    protanopia: 'url(#protanopia)',
    deuteranopia: 'url(#deuteranopia)',
    tritanopia: 'url(#tritanopia)',
    achromatopsia: 'grayscale(1)'
};

const FILTER_MATRICES = {
    protanopia: '0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0',
    deuteranopia: '0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0',
    tritanopia: '0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0'
};

function injectSVGFilters() {
    if (document.getElementById('color-blindness-filters')) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', 'color-blindness-filters');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;');

    Object.entries(FILTER_MATRICES).forEach(([id, matrix]) => {
        const filter = document.createElementNS(svgNS, 'filter');
        filter.setAttribute('id', id);
        const feColorMatrix = document.createElementNS(svgNS, 'feColorMatrix');
        feColorMatrix.setAttribute('type', 'matrix');
        feColorMatrix.setAttribute('values', matrix);
        filter.appendChild(feColorMatrix);
        svg.appendChild(filter);
    });

    document.body.appendChild(svg);
}

export const applyColorBlindness = (type) => {
    injectSVGFilters();
    const filter = FILTERS[type] || '';
    if (filter) {
        setFilter('colorBlindness', filter);
    } else {
        removeFilter('colorBlindness');
    }
};

export const resetColorBlindness = () => {
    removeFilter('colorBlindness');
};
