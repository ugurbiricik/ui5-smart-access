import { setFilter, removeFilter } from './filterManager.js';

function getFilter(level) {
    const sepia = (level / 100) * 0.6;
    const hue = -20 * (level / 100);
    const brightness = 1 - (level / 100) * 0.1;
    return `brightness(${brightness}) sepia(${sepia}) hue-rotate(${hue}deg)`;
}

export const enableBlueLightFilter = (level = 50) => {
    setFilter('blueLightFilter', getFilter(level));
};

export const disableBlueLightFilter = () => {
    removeFilter('blueLightFilter');
};
