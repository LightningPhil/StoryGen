export function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("Could not save to local storage:", e);
    }
}

export function loadFromLocalStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn("Could not load from local storage:", e);
        return null;
    }
}

export const LS_MIN_API_INTERVAL = 'minApiInterval_storyCircle';
export const LS_ADJUST_READING_AGE_ENABLED = 'adjustReadingAgeEnabled_storyCircle'; // For the enable checkbox
export const LS_TARGET_READING_AGE = 'targetReadingAge_storyCircle';       // For the slider value
export const LS_READING_AGE_MIN = 'readingAgeMin_storyCircle'; 
export const LS_READING_AGE_MAX = 'readingAgeMax_storyCircle'; 