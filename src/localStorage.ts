// src/localStorage.ts

import type { VocabularyLookupData, VocabularyEntry } from './types';

export const LS_API_KEY = 'geminiApiKey_storyCircle';
export const LS_CHARACTERS = 'storyCharacters_storyCircle';
export const LS_AUDIENCE = 'storyAudience_storyCircle';
export const LS_AGE_GROUP = 'storyAgeGroup_storyCircle';
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

// --- Thinking Master Toggle ---
export const LS_THINKING_ENABLED = 'thinkingEnabled_storyCircle';

// --- Theme ---
export const LS_THEME = 'storyTheme_storyCircle';

// --- Vocabulary Assist ---
export const LS_VOCAB_LOOKUPS = 'storyVocabLookups_storyCircle';
export const LS_TTS_VOICE = 'storyTtsVoice_storyCircle';
export const LS_TTS_GENDER = 'storyTtsGender_storyCircle';
export const LS_TTS_SOURCE = 'storyTtsSource_storyCircle';

// --- New Keys for Agent Thinking Toggles ---
export const LS_THINKING_AGENT_1_CRAFTER = 'thinkingAgent1_storyCircle';
export const LS_THINKING_AGENT_2_ELABORATOR = 'thinkingAgent2_storyCircle';
export const LS_THINKING_AGENT_3_REVIEWER = 'thinkingAgent3_storyCircle';
export const LS_THINKING_AGENT_4_POLISHER = 'thinkingAgent4_storyCircle';
export const LS_THINKING_AGENT_5_CLEANER = 'thinkingAgent5_storyCircle';
export const LS_THINKING_AGENT_6_TITLER = 'thinkingAgent6_storyCircle';
export const LS_THINKING_AGENT_C_CONSOLIDATOR = 'thinkingAgentC_storyCircle';


export function saveToLocalStorage(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("Could not save to local storage:", e);
    }
}

export function loadFromLocalStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn("Could not load from local storage:", e);
        return null;
    }
}

export function removeFromLocalStorage(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn("Could not remove from local storage:", e);
    }
}

export function loadVocabularyLookupData(): VocabularyLookupData {
    const raw = loadFromLocalStorage(LS_VOCAB_LOOKUPS);
    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
        return {};
    } catch (e) {
        console.warn("Could not parse vocabulary lookup data:", e);
        return {};
    }
}

export function saveVocabularyLookupData(lookupData: VocabularyLookupData): void {
    if (!lookupData || typeof lookupData !== 'object' || Array.isArray(lookupData)) {
        console.warn("Invalid vocabulary lookup data. Expected object map.");
        return;
    }
    saveToLocalStorage(LS_VOCAB_LOOKUPS, JSON.stringify(lookupData));
}

export function trackVocabularyLookup(normalizedWord: string): VocabularyLookupData {
    if (!normalizedWord || typeof normalizedWord !== 'string') {
        return loadVocabularyLookupData();
    }

    // Schema: { [word]: { firstSeen: ISO timestamp, lookupCount: number } }
    const lookupData = loadVocabularyLookupData();
    const existing: VocabularyEntry | undefined = lookupData[normalizedWord];

    if (existing && typeof existing === 'object') {
        existing.firstSeen = existing.firstSeen || new Date().toISOString();
        existing.lookupCount = Number.isFinite(existing.lookupCount) ? existing.lookupCount + 1 : 1;
    } else {
        lookupData[normalizedWord] = {
            firstSeen: new Date().toISOString(),
            lookupCount: 1
        };
    }

    saveVocabularyLookupData(lookupData);
    return lookupData;
}

/**
 * Clear all StoryGen app data from localStorage
 * Keeps the API key by default (pass true to clear it too)
 */
export function clearAllAppData(includeApiKey: boolean = false): void {
    const allKeys = [
        LS_CHARACTERS, LS_AUDIENCE, LS_SELECTED_FRAMEWORK, LS_SELECTED_MODEL,
        LS_USE_ENGINE_SUGGESTIONS, LS_USER_SUGGESTIONS, LS_MIN_API_INTERVAL,
        LS_ADJUST_READING_AGE_ENABLED, LS_TARGET_READING_AGE, LS_READING_AGE_MIN, LS_READING_AGE_MAX,
        LS_ENABLE_CONSOLIDATOR, LS_SELECTED_AUTHOR_STYLE,
        LS_ADJUSTMENT_TONE, LS_ADJUSTMENT_PACING, LS_ADJUSTMENT_HUMOR, LS_ADJUSTMENT_EMOTION,
        LS_STEM_CONCEPT, LS_INCLUDE_PLOT_POINTS, LS_NARRATOR_PERSONA,
        LS_SENSITIVITY_PRESET, LS_SENSITIVITY_CONFLICT, LS_SENSITIVITY_SCARY, LS_SENSITIVITY_SADNESS, LS_SENSITIVITY_COMPLEXITY,
        LS_THEME,
        LS_VOCAB_LOOKUPS,
        LS_THINKING_AGENT_1_CRAFTER, LS_THINKING_AGENT_2_ELABORATOR, LS_THINKING_AGENT_3_REVIEWER,
        LS_THINKING_AGENT_4_POLISHER, LS_THINKING_AGENT_5_CLEANER, LS_THINKING_AGENT_6_TITLER,
        LS_THINKING_AGENT_C_CONSOLIDATOR
    ];
    
    if (includeApiKey) {
        allKeys.push(LS_API_KEY);
    }
    
    allKeys.forEach(key => removeFromLocalStorage(key));
}
