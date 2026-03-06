const STORAGE_KEY = "ui5-smart-access-preferences";

function loadAll() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

function saveAll(prefs) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // localStorage may be unavailable
    }
}

export function savePref(key, value) {
    const prefs = loadAll();
    prefs[key] = value;
    saveAll(prefs);
}

export function loadPref(key, defaultValue) {
    const prefs = loadAll();
    return prefs.hasOwnProperty(key) ? prefs[key] : defaultValue;
}

export function clearPrefs() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // localStorage may be unavailable
    }
}
