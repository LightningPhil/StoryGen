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
export const LS_ENABLE_CONSOLIDATOR = 'enableConsolidator_storyCircle';

// --- Keys for Stylistic Controls ---
export const LS_SELECTED_AUTHOR_STYLE = 'storySelectedAuthorStyle_storyCircle';
export const LS_ADJUSTMENT_TONE = 'storyAdjustmentTone_storyCircle';
export const LS_ADJUSTMENT_PACING = 'storyAdjustmentPacing_storyCircle';
export const LS_ADJUSTMENT_HUMOR = 'storyAdjustmentHumor_storyCircle';
export const LS_ADJUSTMENT_EMOTION = 'storyAdjustmentEmotion_storyCircle';

// --- Keys for STEM Learning Fable ---
export const LS_STEM_CONCEPT = 'storyStemConcept_storyCircle';

// --- Keys for Plot Points ---
export const LS_INCLUDE_PLOT_POINTS = 'storyIncludePlotPoints_storyCircle';

// --- Keys for Narrator Persona ---
export const LS_NARRATOR_PERSONA = 'storyNarratorPersona_storyCircle';

// --- Keys for Parental Controls ---
export const LS_SENSITIVITY_PRESET = 'storySensitivityPreset_storyCircle';
export const LS_SENSITIVITY_CONFLICT = 'storySensitivityConflict_storyCircle';
export const LS_SENSITIVITY_SCARY = 'storySensitivityScary_storyCircle';
export const LS_SENSITIVITY_SADNESS = 'storySensitivitySadness_storyCircle';
export const LS_SENSITIVITY_COMPLEXITY = 'storySensitivityComplexity_storyCircle';

// --- Theme ---
export const LS_THEME = 'storyTheme_storyCircle';

// --- New Keys for Agent Thinking Toggles ---
export const LS_THINKING_AGENT_1_CRAFTER = 'thinkingAgent1_storyCircle';
export const LS_THINKING_AGENT_2_ELABORATOR = 'thinkingAgent2_storyCircle';
export const LS_THINKING_AGENT_3_REVIEWER = 'thinkingAgent3_storyCircle';
export const LS_THINKING_AGENT_4_POLISHER = 'thinkingAgent4_storyCircle';
export const LS_THINKING_AGENT_5_CLEANER = 'thinkingAgent5_storyCircle';
export const LS_THINKING_AGENT_6_TITLER = 'thinkingAgent6_storyCircle';
export const LS_THINKING_AGENT_C_CONSOLIDATOR = 'thinkingAgentC_storyCircle';


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