// Minimal JSONModel stub. The library only ever uses single-level paths
// ("/key"), so a flat store keyed by the path (minus the leading slash) is
// enough — no deep-path resolver needed.
export default class JSONModel {
    constructor(data = {}) {
        this._data = { ...data };
    }
    getProperty(path) {
        return this._data[String(path).replace(/^\//, "")];
    }
    setProperty(path, value) {
        this._data[String(path).replace(/^\//, "")] = value;
    }
    getData() {
        return this._data;
    }
    setData(data) {
        this._data = { ...data };
    }
}
