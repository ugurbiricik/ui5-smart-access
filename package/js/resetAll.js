import { onResetFontSize } from './fontsize.js';
import { stopReading, setTTSRate, setTTSVolume, disableHoverRead } from './textToSpeech.js';
import { resetColorBlindness } from './colorBlindness.js';
import { disableBlueLightFilter } from './blueLightFilter.js';
import { disableNightMode } from './nightMode.js';
import { showImages } from './imageHider.js';
import { removeCustomContrast, isContrastModeActive, toggleContrastMode } from './contrast.js';
import { clearAllFilters } from './filterManager.js';

export const resetAll = () => {
    onResetFontSize();
    stopReading();
    setTTSRate(1);
    setTTSVolume(1);
    disableHoverRead();
    resetColorBlindness();
    disableBlueLightFilter();
    clearAllFilters();
    disableNightMode();
    showImages();
    removeCustomContrast();
    if (isContrastModeActive()) toggleContrastMode();
};
