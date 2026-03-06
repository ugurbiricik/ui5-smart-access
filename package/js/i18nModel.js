import ResourceModel from "sap/ui/model/resource/ResourceModel";

let i18nModel = null;

function detectBrowserLanguage() {
    const supportedLanguages = ['en', 'de'];
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];

    for (const lang of browserLanguages) {
        const cleanLang = lang.split('-')[0].toLowerCase();
        if (supportedLanguages.includes(cleanLang)) {
            return cleanLang;
        }
    }

    return 'de';
}

export function createI18nModel() {
    if (i18nModel) {
        return i18nModel;
    }

    const detectedLanguage = detectBrowserLanguage();

    // Use bundleUrl with sap.ui.require.toUrl to resolve the correct path
    // regardless of how the package is consumed (ui5-tooling-modules, cds-plugin-ui5, etc.)
    const bundleUrl = sap.ui.require.toUrl("ui5-smart-access/i18n/i18n.properties");

    i18nModel = new ResourceModel({
        bundleUrl: bundleUrl,
        supportedLocales: ["en", "de", ""],
        locale: detectedLanguage,
        fallbackLocale: "de"
    });

    return i18nModel;
}

export function getI18nModel() {
    return i18nModel;
}

export function changeLanguage(language) {
    if (i18nModel && ['en', 'de'].includes(language)) {
        i18nModel = null;
        createI18nModel();
    }
}

export function getText(key, parameters = []) {
    if (!i18nModel) {
        return key;
    }

    try {
        const resourceBundle = i18nModel.getResourceBundle();
        if (resourceBundle) {
            const text = resourceBundle.getText(key, parameters);
            if (text && text !== key) {
                return text;
            }
        }
    } catch (error) {
        console.error(`[ui5-smart-access] Error getting text for key '${key}':`, error);
    }

    return key;
}
