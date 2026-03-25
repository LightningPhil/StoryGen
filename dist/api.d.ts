import type { ChatLogEntry } from './types.js';
export declare function callAgentAPI(prompt: string, currentApiKey: string, selectedModelId: string, agentName: string, retryAttempt: number, currentRunChatLogArray: ChatLogEntry[], storyOutputDivRef: HTMLElement | null, minApiIntervalMs: number, enableThinking?: boolean, responseMimeType?: string): Promise<string>;
