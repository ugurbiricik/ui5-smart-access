// Minimal JSONModel stub. The library only ever uses single-level paths
// ("/key"), so a flat store keyed by the path (minus the leading slash) is
// enough — no deep-path resolver needed.
export default class JSONModel {
    constructor(data = {}) {
        this._data = { ...data };
        this._bindings = [];
    }
    bindProperty(path) {
        const key = String(path).replace(/^\//, "");
        const handlers = [];
        const binding = {
            key,
            attachChange: (fn) => handlers.push(fn),
            detachChange: (fn) => { const i = handlers.indexOf(fn); if (i >= 0) handlers.splice(i, 1); },
            fire: () => handlers.slice().forEach((fn) => fn())
        };
        this._bindings.push(binding);
        return binding;
    }
    getProperty(path) {
        return this._data[String(path).replace(/^\//, "")];
    }
    setProperty(path, value) {
        const key = String(path).replace(/^\//, "");
        const changed = this._data[key] !== value;
        this._data[key] = value;
        if (changed) this._bindings.filter((b) => b.key === key).forEach((b) => b.fire());
    }
    getData() {
        return this._data;
    }
    setData(data) {
        this._data = { ...data };
    }
}
