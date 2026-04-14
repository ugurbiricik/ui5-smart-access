let _defaultFontSize = null;

let _settingsModel = null;


export const initFontSizer = (oSettingsModel) => {
    if (!_defaultFontSize) {
        _defaultFontSize = window.getComputedStyle(document.documentElement).getPropertyValue("font-size");
    }
    _settingsModel = oSettingsModel;
};


const _updateView = () => {
    if (_settingsModel && _defaultFontSize) {
        const step = _settingsModel.getProperty("/fontStep");
        const newSize = `calc(${_defaultFontSize} + ${step * 2}px)`;
        document.documentElement.style.fontSize = newSize;
    }
};


export const onIncreaseFontSize = () => {
    if (!_settingsModel) return;
    let currentStep = _settingsModel.getProperty("/fontStep");
    if (currentStep < 5) {
        _settingsModel.setProperty("/fontStep", currentStep + 1);
        _updateView();
    }
};


export const onDecreaseFontSize = () => {
    if (!_settingsModel) return;
    let currentStep = _settingsModel.getProperty("/fontStep");
        if (currentStep > -3) {
        _settingsModel.setProperty("/fontStep", currentStep - 1);
        _updateView();
    }
};

export const onResetFontSize = () => {
    if (!_settingsModel) return;
    _settingsModel.setProperty("/fontStep", 0);
    document.documentElement.style.fontSize = _defaultFontSize;
};
