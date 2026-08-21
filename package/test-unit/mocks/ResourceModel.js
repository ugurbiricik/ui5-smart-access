// sap/ui/model/resource/ResourceModel stub. The bundle echoes the key back so
// getText's identity/fallback behaviour is observable.
export default class ResourceModel {
    constructor() {}
    getResourceBundle() {
        return { getText: (key) => key };
    }
}
