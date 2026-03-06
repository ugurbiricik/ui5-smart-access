const synth = window.speechSynthesis || null;
let utterance = null;
let isReading = false;
let settingsModel = null;

function isTTSSupported() {
    return synth !== null;
}

export const initTextToSpeech = (oSettingsModel) => {
    settingsModel = oSettingsModel;
};

export const startReading = () => {
    if (!isTTSSupported() || isReading) return;
    stopReading();
    const text = document.body.innerText;
    utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settingsModel?.getProperty("/ttsRate") || 1;
    utterance.volume = settingsModel?.getProperty("/ttsVolume") || 1;
    synth.speak(utterance);
    isReading = true;
    utterance.onend = () => { isReading = false; };
};

export const stopReading = () => {
    if (!isTTSSupported()) return;
    if (synth.speaking) synth.cancel();
    isReading = false;
};

export const setTTSRate = (rate) => {
    settingsModel?.setProperty("/ttsRate", rate);
};

export const setTTSVolume = (volume) => {
    settingsModel?.setProperty("/ttsVolume", volume);
};

let hoverActive = false;
let hoverDebounceTimer = null;

function hoverHandler(e) {
    if (!e.target || !e.target.innerText || !isTTSSupported()) return;

    clearTimeout(hoverDebounceTimer);
    hoverDebounceTimer = setTimeout(() => {
        stopReading();
        utterance = new SpeechSynthesisUtterance(e.target.innerText);
        utterance.rate = settingsModel?.getProperty("/ttsRate") || 1;
        utterance.volume = settingsModel?.getProperty("/ttsVolume") || 1;
        synth.speak(utterance);
    }, 300);
}

export const enableHoverRead = () => {
    if (!hoverActive) {
        document.body.addEventListener("mouseover", hoverHandler);
        hoverActive = true;
    }
};

export const disableHoverRead = () => {
    if (hoverActive) {
        document.body.removeEventListener("mouseover", hoverHandler);
        clearTimeout(hoverDebounceTimer);
        hoverActive = false;
    }
};
