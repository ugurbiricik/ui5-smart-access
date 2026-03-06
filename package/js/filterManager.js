const activeFilters = {};

function applyFilters() {
    const combined = Object.values(activeFilters).filter(Boolean).join(' ');
    document.documentElement.style.filter = combined;
}

export function setFilter(key, value) {
    activeFilters[key] = value;
    applyFilters();
}

export function removeFilter(key) {
    delete activeFilters[key];
    applyFilters();
}

export function clearAllFilters() {
    Object.keys(activeFilters).forEach(key => delete activeFilters[key]);
    applyFilters();
}
