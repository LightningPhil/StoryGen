// src/appState.ts

import type { ChatLogEntry, SensitivityPreset } from './types';

// Bedtime Mode Preset - optimal settings for calming sleep-time stories
export const BEDTIME_MODE_PRESET: {
    framework: string;
    authorStyle: string;
    adjustments: { tone: string; pacing: string; humor: string; emotion: string };
    consolidator: boolean;
    readingAge: number;
    useEngineSuggestions: boolean;
} = {
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
export const MORNING_ENERGIZER_PRESET: typeof BEDTIME_MODE_PRESET = {
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
export const SENSITIVITY_LEVELS: Record<string, SensitivityPreset & { label: string; description: string }> = {
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
    _latestGeneratedStoryText: "" as string,
    _latestGeneratedStoryTitle: "" as string,
    _lastRunChatLog: [] as ChatLogEntry[],

    get latestGeneratedStoryText(): string {
        return this._latestGeneratedStoryText;
    },
    set latestGeneratedStoryText(text: string) {
        this._latestGeneratedStoryText = typeof text === 'string' ? text : "";
    },

    get latestGeneratedStoryTitle(): string {
        return this._latestGeneratedStoryTitle;
    },
    set latestGeneratedStoryTitle(title: string) {
        this._latestGeneratedStoryTitle = typeof title === 'string' ? title : "";
    },

    get lastRunChatLog(): ChatLogEntry[] {
        return this._lastRunChatLog;
    },

    addLogEntry(entry: ChatLogEntry) {
        if (typeof entry === 'object' && entry !== null) {
            this._lastRunChatLog.push(entry);
        } else {
            console.warn("Attempted to add invalid log entry:", entry);
        }
    },

    clearChatLog() {
        this._lastRunChatLog = [] as ChatLogEntry[];
    },

    // Potentially, methods to manage loading/saving settings could be added here later
    // if more complex state orchestration around settings is needed.
    // For now, localStorage.js and script.js handle this directly.
};

export default appState;