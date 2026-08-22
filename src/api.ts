// src/api.ts

import type { ChatLogEntry } from './types';

let lastApiFetchInitiatedTimestamp: number = 0; 

export function isAbortError(error: unknown): boolean {
    return (error instanceof DOMException && error.name === 'AbortError')
        || (error instanceof Error && error.name === 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new DOMException('Story generation was cancelled.', 'AbortError');
    }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    throwIfAborted(signal);
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('Story generation was cancelled.', 'AbortError'));
        };
        if (!signal) return;
        if (signal.aborted) {
            clearTimeout(timer);
            onAbort();
            return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
    });
}

export async function callAgentAPI(
    prompt: string, 
    currentApiKey: string, 
    selectedModelId: string, 
    agentName: string = "Agent", 
    retryAttempt: number = 0, 
    currentRunChatLogArray: ChatLogEntry[], 
    statusCallback: ((msg: string) => void) | null,
    minApiIntervalMs: number,
    enableThinking: boolean = false,
    responseMimeType: string = '',
    abortSignal?: AbortSignal
): Promise<string> {
    if (!currentApiKey) { 
        const errorMsg = `${agentName} Error: API Key missing. Please configure it in settings.`;
        console.error(errorMsg);
        // Log to chat log if available
        if (currentRunChatLogArray) {
             currentRunChatLogArray.push({ agentName, type: 'error-config', content: "API Key missing", timestamp: new Date().toISOString() });
        }
        throw new Error(errorMsg); 
    }
    if (!selectedModelId) { 
        const errorMsg = `${agentName} Error: Model ID missing. Please configure it in settings.`;
        console.error(errorMsg);
        if (currentRunChatLogArray) {
            currentRunChatLogArray.push({ agentName, type: 'error-config', content: "Model ID missing", timestamp: new Date().toISOString() });
        }
        throw new Error(errorMsg);
    }

    throwIfAborted(abortSignal);

    // --- Rate Limiting Logic ---
    if (retryAttempt === 0) { // Only apply initial wait if not a retry
        const now = Date.now();
        const timeSinceLastFetchInitiated = now - lastApiFetchInitiatedTimestamp;
        if (timeSinceLastFetchInitiated < minApiIntervalMs) {
            const waitTime = minApiIntervalMs - timeSinceLastFetchInitiated;
            if (waitTime > 0) { 
                const waitMsg = `Rate Limiter: Waiting ${Math.ceil(waitTime / 1000)}s before calling ${agentName}...\n`;
                console.log(waitMsg);
                if (statusCallback) statusCallback(waitMsg); 
                await wait(waitTime, abortSignal);
            }
        }
    }
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:generateContent?key=${currentApiKey}`;
    const MAX_RETRIES = 6;
    const RETRY_DELAYS = [5000, 10000, 15000, 20000, 25000, 30000];

    if (retryAttempt === 0) {
        if (!currentRunChatLogArray.find((log: ChatLogEntry) => log.agentName === agentName && log.type === 'prompt' && log.content === prompt)) {
             currentRunChatLogArray.push({ agentName, type: 'prompt', content: prompt, timestamp: new Date().toISOString() });
        }
    } else { 
        console.warn(`Retrying ${agentName} call (Attempt ${retryAttempt + 1}/${MAX_RETRIES}) for model ${selectedModelId}...`);
        currentRunChatLogArray.push({ 
            agentName, 
            type: 'retry-attempt', 
            content: `Attempt ${retryAttempt + 1}/${MAX_RETRIES} for model ${selectedModelId}`, 
            timestamp: new Date().toISOString() 
        });
    }

    const requestBody: Record<string, unknown> = { 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {} as Record<string, unknown>,
        safetySettings: [
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
    };

    if (responseMimeType) {
        (requestBody.generationConfig as Record<string, unknown>).responseMimeType = responseMimeType;
    }

    // --- Conditionally add thinking configuration ---
    if (enableThinking) {
        (requestBody.generationConfig as Record<string, unknown>).thinkingConfig = {
            "thinkingBudget": -1
        };
        console.log(`[API] ${agentName} is running with thinking ENABLED.`);
    }

    try {
        if (retryAttempt === 0) { 
            lastApiFetchInitiatedTimestamp = Date.now();
        }

        const response = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(requestBody),
            signal: abortSignal,
        });
        
        if (response.status === 503 || response.status === 429) {
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                const retryMsg = `Model busy or rate limit hit (${response.status}). Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})\n`;
                console.warn(retryMsg);
                if (statusCallback) statusCallback(retryMsg);
                await wait(delay, abortSignal);
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, currentRunChatLogArray, statusCallback, minApiIntervalMs, enableThinking, responseMimeType, abortSignal);
            } else {
                const overloadErrorMsg = `${agentName} Error: Model is overloaded or rate limits exceeded after ${MAX_RETRIES} retries (Status ${response.status}). Please try again later.`;
                currentRunChatLogArray.push({ agentName, type: 'error-max-retries', content: overloadErrorMsg, timestamp: new Date().toISOString() });
                throw new Error(overloadErrorMsg);
            }
        }

        const responseData = await response.json() as Record<string, any>;

        if (responseData.error && responseData.error.message && 
            (responseData.error.message.toLowerCase().includes("overload") || responseData.error.message.toLowerCase().includes("busy now"))) {
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                const retryMsg = `Model is busy (message: ${responseData.error.message}). Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})\n`;
                console.warn(retryMsg);
                if (statusCallback) statusCallback(retryMsg);
                await wait(delay, abortSignal);
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, currentRunChatLogArray, statusCallback, minApiIntervalMs, enableThinking, responseMimeType, abortSignal);
            } else {
                const busyErrorMsg = `${agentName} Error: Model remained busy after ${MAX_RETRIES} retries. Please try again later. (Original Error: ${responseData.error.message})`;
                currentRunChatLogArray.push({ agentName, type: 'error-max-retries-busy', content: busyErrorMsg, timestamp: new Date().toISOString() });
                throw new Error(busyErrorMsg);
            }
        }
        
        if (!response.ok) {
            let apiErrorMsg = `${agentName} API Error (Status ${response.status}): An unexpected error occurred.`;
            if (responseData.error && responseData.error.message) {
                apiErrorMsg = `${agentName} API Error (Status ${response.status}): ${responseData.error.message}`;
            }
            console.error("API Error Data for " + agentName + ":", responseData);
            currentRunChatLogArray.push({ agentName, type: 'error-response', content: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            throw new Error(apiErrorMsg);
        }

        if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
            const blockReason = responseData.promptFeedback.blockReason;
            const safetyRatings = responseData.promptFeedback.safetyRatings || [];
            let blockErrorMsg = `${agentName} Error: Prompt blocked due to: ${blockReason}.`;
            if (safetyRatings.length > 0) {
                blockErrorMsg += ` Safety Ratings: ${safetyRatings.map((r: any) => `${r.category} (${r.probability})`).join(', ')}.`;
            }
            blockErrorMsg += " Please revise the prompt or check safety settings if applicable.";
            console.error("Prompt Feedback for " + agentName + ":", responseData.promptFeedback);
            currentRunChatLogArray.push({ agentName, type: 'blocked-response', content: blockErrorMsg, details: responseData.promptFeedback, timestamp: new Date().toISOString() });
            throw new Error(blockErrorMsg);
        }

        if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content || !responseData.candidates[0].content.parts || !responseData.candidates[0].content.parts[0] || typeof responseData.candidates[0].content.parts[0].text !== 'string') {
            const structureErrorMsg = `${agentName} Error: Unexpected API response structure. Could not extract text.`;
            console.error(structureErrorMsg + " Response Data for " + agentName + ":", responseData);
            currentRunChatLogArray.push({ agentName, type: 'structure-error-response', content: structureErrorMsg, details: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            throw new Error(structureErrorMsg);
        }
        
        const rawTextOutput = responseData.candidates[0].content.parts[0].text;
        if (!currentRunChatLogArray.find((log: ChatLogEntry) => log.agentName === agentName && log.type === 'response' && log.content === rawTextOutput)) {
             currentRunChatLogArray.push({ agentName, type: 'response', content: rawTextOutput, timestamp: new Date().toISOString() });
        }
        return rawTextOutput;

    } catch (error) {
        if (isAbortError(error) || abortSignal?.aborted) {
            throw error instanceof DOMException
                ? error
                : new DOMException('Story generation was cancelled.', 'AbortError');
        }
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Error during API call for ${agentName} (Attempt ${retryAttempt + 1}/${MAX_RETRIES}):`, err.message);
        if (!currentRunChatLogArray.some((log: ChatLogEntry) => log.agentName === agentName && 
                                   (log.type.includes('error') || log.type.includes('blocked')) && 
                                   log.content && log.content.includes(err.message.substring(0,100)))) {
            currentRunChatLogArray.push({ agentName, type: 'general-fetch-error', content: err.message, stack: err.stack, timestamp: new Date().toISOString() });
        }
        throw error; 
    }
}
