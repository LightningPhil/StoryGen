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