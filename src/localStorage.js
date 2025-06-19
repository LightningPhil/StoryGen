// src/localStorage.js

export const LS_API_KEY = 'geminiApiKey_storyCircle';
export const LS_CHARACTERS = 'storyCharacters_storyCircle';
export const LS_AUDIENCE = 'storyAudience_storyCircle';
export const LS_SELECTED_FRAMEWORK = 'storySelectedFramework_storyCircle';
export const LS_SELECTED_MODEL = 'geminiSelectedModel_storyCircle';
export const LS_USE_ENGINE_SUGGESTIONS = 'useEngineSuggestions_storyCircle';
export const LS_USER_SUGGESTIONS = 'userSuggestions_storyCircle';
export const LS_MIN_API_INTERVAL = 'minApiInterval_storyCircle';
export const LS_ADJUST_READING_AGE_ENABLED = 'adjustReadingAgeEnabled_storyCircle'; // For the enable checkbox
export const LS_TARGET_READING_AGE = 'targetReadingAge_storyCircle';       // For the slider value
export const LS_READING_AGE_MIN = 'readingAgeMin_storyCircle'; 
export const LS_READING_AGE_MAX = 'readingAgeMax_storyCircle'; 
export const LS_ENABLE_CONSOLIDATOR = 'enableConsolidator_storyCircle'; // New key for consolidator


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