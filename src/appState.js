// src/appState.js

// Bedtime Mode Preset - optimal settings for calming sleep-time stories
export const BEDTIME_MODE_PRESET = {
    framework: "Dan Harmon's Story Circle", // Circular journey fits bedtime well
    authorStyle: "Gentle & Reassuring (Kerr/Bond)",
    adjustments: {
        tone: "calm_bedtime",
        pacing: "slow_soothing",
        humor: "none",
        emotion: "heartwarming"
    },
    consolidator: false, // Keep natural length for pacing
    readingAge: 5, // Younger audience
    useEngineSuggestions: true
};

// Morning Energizer Preset - optimal settings for exciting wake-up stories
export const MORNING_ENERGIZER_PRESET = {
    framework: "Three-Act Structure", // Action-oriented structure
    authorStyle: "Whimsical & Playful (Dahl/Seuss)",
    adjustments: {
        tone: "energetic_morning",
        pacing: "fast_dynamic",
        humor: "light_silly",
        emotion: "empowering"
    },
    consolidator: false, // Preserve natural energy
    readingAge: 6, // Slightly higher for comprehension
    useEngineSuggestions: true
};

// Sensitivity Level Presets for Parental Controls
export const SENSITIVITY_LEVELS = {
    'extra_gentle': {
        label: 'Extra Gentle (Ages 2-4)',
        conflict: 0,
        scary: 0,
        sadness: 0,
        complexity: 0,
        description: 'No conflict, no scary elements, only positive emotions. Perfect for toddlers.'
    },
    'gentle': {
        label: 'Gentle (Ages 4-6)',
        conflict: 1,
        scary: 0,
        sadness: 1,
        complexity: 1,
        description: 'Mild, quickly-resolved challenges. Brief moments of worry always comforted.'
    },
    'standard': {
        label: 'Standard (Ages 6-9)',
        conflict: 2,
        scary: 1,
        sadness: 2,
        complexity: 2,
        description: 'Age-appropriate adventure with real but manageable stakes.'
    },
    'adventurous': {
        label: 'Adventurous (Ages 9+)',
        conflict: 3,
        scary: 2,
        sadness: 2,
        complexity: 3,
        description: 'More sophisticated stories with deeper themes and more excitement.'
    }
};

const appState = {
    _latestGeneratedStoryText: "",
    _latestGeneratedStoryTitle: "",
    _lastRunChatLog: [], // This will be directly passed to and modified by callAgentAPI

    get latestGeneratedStoryText() {
        return this._latestGeneratedStoryText;
    },
    set latestGeneratedStoryText(text) {
        this._latestGeneratedStoryText = typeof text === 'string' ? text : "";
    },

    get latestGeneratedStoryTitle() {
        return this._latestGeneratedStoryTitle;
    },
    set latestGeneratedStoryTitle(title) {
        this._latestGeneratedStoryTitle = typeof title === 'string' ? title : "";
    },

    get lastRunChatLog() {
        // Provides direct access to the array for callAgentAPI to push to.
        // If stricter encapsulation is needed later, callAgentAPI could be modified
        // to use an addLogEntry method instead.
        return this._lastRunChatLog;
    },

    // Method to add a log entry, typically for non-API call events if needed
    addLogEntry(entry) {
        if (typeof entry === 'object' && entry !== null) {
            this._lastRunChatLog.push(entry);
        } else {
            console.warn("Attempted to add invalid log entry:", entry);
        }
    },

    clearChatLog() {
        this._lastRunChatLog = [];
    },

    // Potentially, methods to manage loading/saving settings could be added here later
    // if more complex state orchestration around settings is needed.
    // For now, localStorage.js and script.js handle this directly.
};

export default appState;