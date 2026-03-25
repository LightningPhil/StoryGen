import type { ChatLogEntry, SensitivityPreset } from './types.js';
export declare const BEDTIME_MODE_PRESET: {
    framework: string;
    authorStyle: string;
    adjustments: {
        tone: string;
        pacing: string;
        humor: string;
        emotion: string;
    };
    consolidator: boolean;
    readingAge: number;
    useEngineSuggestions: boolean;
};
export declare const MORNING_ENERGIZER_PRESET: typeof BEDTIME_MODE_PRESET;
export declare const SENSITIVITY_LEVELS: Record<string, SensitivityPreset & {
    label: string;
    description: string;
}>;
declare const appState: {
    _latestGeneratedStoryText: string;
    _latestGeneratedStoryTitle: string;
    _lastRunChatLog: ChatLogEntry[];
    latestGeneratedStoryText: string;
    latestGeneratedStoryTitle: string;
    readonly lastRunChatLog: ChatLogEntry[];
    addLogEntry(entry: ChatLogEntry): void;
    clearChatLog(): void;
};
export default appState;
