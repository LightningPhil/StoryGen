// src/api.ts

import type { ChatLogEntry } from './types';
import { getModelProvider } from './modelDiscovery';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/** Tight input moderation for a children's story app. Advice/PII categories stay off to avoid STEM false positives. */
const MISTRAL_GUARDRAILS = [
    {
        block_on_error: true,
        moderation_llm_v2: {
            custom_category_thresholds: {
                sexual: 0.1,
                selfharm: 0.1,
                hate_and_discrimination: 0.1,
                violence_and_threats: 0.1,
                dangerous: 0.1,
                criminal: 0.1,
                jailbreaking: 0.1,
                health: 1,
                financial: 1,
                law: 1,
                pii: 1,
            },
            ignore_other_categories: false,
            action: 'block',
        },
    },
];

function toJsonSchema(node: unknown): Record<string, unknown> {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return {};
    const src = node as Record<string, unknown>;
    const typeMap: Record<string, string> = {
        OBJECT: 'object', STRING: 'string', ARRAY: 'array',
        NUMBER: 'number', BOOLEAN: 'boolean', INTEGER: 'integer',
    };
    const out: Record<string, unknown> = {};
    if (typeof src.type === 'string') {
        const key = src.type.toUpperCase();
        out.type = typeMap[key] || src.type.toLowerCase();
    }
    if (typeof src.description === 'string') out.description = src.description;
    if (src.properties && typeof src.properties === 'object' && !Array.isArray(src.properties)) {
        const props: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(src.properties as Record<string, unknown>)) {
            props[key] = toJsonSchema(value);
        }
        out.properties = props;
    }
    if (Array.isArray(src.required)) out.required = src.required;
    if (src.items) out.items = toJsonSchema(src.items);
    return out;
}

function extractMistralText(responseData: Record<string, any>): string | null {
    const content = responseData?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        const text = content
            .map((part: unknown) => {
                if (typeof part === 'string') return part;
                if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
                    return (part as { text: string }).text;
                }
                return '';
            })
            .join('');
        return text || null;
    }
    return null;
}

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
    abortSignal?: AbortSignal,
    systemInstruction: string = '',
    responseSchema?: Record<string, unknown>
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

    if (getModelProvider(selectedModelId) === 'mistral') {
        return callMistralAgentAPI(
            prompt,
            currentApiKey,
            selectedModelId,
            agentName,
            retryAttempt,
            currentRunChatLogArray,
            statusCallback,
            minApiIntervalMs,
            responseMimeType,
            abortSignal,
            systemInstruction,
            responseSchema,
        );
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
        if (systemInstruction && !currentRunChatLogArray.find((log: ChatLogEntry) => log.agentName === agentName && log.type === 'system-instruction' && log.content === systemInstruction)) {
            currentRunChatLogArray.push({ agentName, type: 'system-instruction', content: systemInstruction, timestamp: new Date().toISOString() });
        }
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

    if (systemInstruction.trim()) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }],
        };
    }

    if (responseMimeType) {
        (requestBody.generationConfig as Record<string, unknown>).responseMimeType = responseMimeType;
    }
    if (responseSchema) {
        (requestBody.generationConfig as Record<string, unknown>).responseSchema = responseSchema;
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
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, currentRunChatLogArray, statusCallback, minApiIntervalMs, enableThinking, responseMimeType, abortSignal, systemInstruction, responseSchema);
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
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, currentRunChatLogArray, statusCallback, minApiIntervalMs, enableThinking, responseMimeType, abortSignal, systemInstruction, responseSchema);
            } else {
                const busyErrorMsg = `${agentName} Error: Model remained busy after ${MAX_RETRIES} retries. Please try again later. (Original Error: ${responseData.error.message})`;
                currentRunChatLogArray.push({ agentName, type: 'error-max-retries-busy', content: busyErrorMsg, timestamp: new Date().toISOString() });
                throw new Error(busyErrorMsg);
            }
        }

        const responseErrorMessage = typeof responseData.error?.message === 'string'
            ? responseData.error.message
            : '';
        const structuredOutputUnsupported = response.status === 400
            && Boolean(responseMimeType)
            && /response.?schema|response.?mime|structured output|json mode|not supported|unknown field/i.test(responseErrorMessage);
        if (structuredOutputUnsupported && retryAttempt < MAX_RETRIES) {
            const fallbackMsg = `${agentName}: selected model rejected structured output; retrying the same prompt with prompt-enforced JSON.\n`;
            console.warn(fallbackMsg.trim());
            if (statusCallback) statusCallback(fallbackMsg);
            currentRunChatLogArray.push({
                agentName,
                type: 'structured-output-fallback',
                content: responseErrorMessage || 'Structured output was rejected by the selected model.',
                timestamp: new Date().toISOString(),
            });
            return callAgentAPI(
                prompt,
                currentApiKey,
                selectedModelId,
                agentName,
                retryAttempt + 1,
                currentRunChatLogArray,
                statusCallback,
                minApiIntervalMs,
                enableThinking,
                '',
                abortSignal,
                systemInstruction,
                undefined,
            );
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

async function callMistralAgentAPI(
    prompt: string,
    currentApiKey: string,
    selectedModelId: string,
    agentName: string,
    retryAttempt: number,
    currentRunChatLogArray: ChatLogEntry[],
    statusCallback: ((msg: string) => void) | null,
    minApiIntervalMs: number,
    responseMimeType: string,
    abortSignal: AbortSignal | undefined,
    systemInstruction: string,
    responseSchema: Record<string, unknown> | undefined,
    useGuardrails: boolean = true,
): Promise<string> {
    throwIfAborted(abortSignal);

    if (retryAttempt === 0) {
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

    const MAX_RETRIES = 6;
    const RETRY_DELAYS = [5000, 10000, 15000, 20000, 25000, 30000];

    if (retryAttempt === 0) {
        if (systemInstruction && !currentRunChatLogArray.find((log: ChatLogEntry) => log.agentName === agentName && log.type === 'system-instruction' && log.content === systemInstruction)) {
            currentRunChatLogArray.push({ agentName, type: 'system-instruction', content: systemInstruction, timestamp: new Date().toISOString() });
        }
        if (!currentRunChatLogArray.find((log: ChatLogEntry) => log.agentName === agentName && log.type === 'prompt' && log.content === prompt)) {
            currentRunChatLogArray.push({ agentName, type: 'prompt', content: prompt, timestamp: new Date().toISOString() });
        }
    } else {
        console.warn(`Retrying ${agentName} call (Attempt ${retryAttempt + 1}/${MAX_RETRIES}) for model ${selectedModelId}...`);
        currentRunChatLogArray.push({
            agentName,
            type: 'retry-attempt',
            content: `Attempt ${retryAttempt + 1}/${MAX_RETRIES} for model ${selectedModelId}`,
            timestamp: new Date().toISOString(),
        });
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (systemInstruction.trim()) {
        messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody: Record<string, unknown> = {
        model: selectedModelId,
        messages,
        safe_prompt: true,
    };
    if (useGuardrails) {
        requestBody.guardrails = MISTRAL_GUARDRAILS;
    }

    if (responseMimeType.toLowerCase().includes('json')) {
        if (responseSchema) {
            requestBody.response_format = {
                type: 'json_schema',
                json_schema: {
                    name: 'storygen_response',
                    schema: toJsonSchema(responseSchema),
                    strict: true,
                },
            };
        } else {
            requestBody.response_format = { type: 'json_object' };
        }
    }

    const retry = (nextMimeType: string, nextSchema: Record<string, unknown> | undefined, nextGuardrails: boolean) =>
        callMistralAgentAPI(
            prompt,
            currentApiKey,
            selectedModelId,
            agentName,
            retryAttempt + 1,
            currentRunChatLogArray,
            statusCallback,
            minApiIntervalMs,
            nextMimeType,
            abortSignal,
            systemInstruction,
            nextSchema,
            nextGuardrails,
        );

    try {
        if (retryAttempt === 0) {
            lastApiFetchInitiatedTimestamp = Date.now();
        }

        const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentApiKey}`,
            },
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
                return retry(responseMimeType, responseSchema, useGuardrails);
            }
            const overloadErrorMsg = `${agentName} Error: Model is overloaded or rate limits exceeded after ${MAX_RETRIES} retries (Status ${response.status}). Please try again later.`;
            currentRunChatLogArray.push({ agentName, type: 'error-max-retries', content: overloadErrorMsg, timestamp: new Date().toISOString() });
            throw new Error(overloadErrorMsg);
        }

        const responseData = await response.json() as Record<string, any>;
        const responseErrorMessage = typeof responseData.error?.message === 'string'
            ? responseData.error.message
            : (typeof responseData.message === 'string' ? responseData.message : '');

        if (response.status === 403 || /content blocked by guardrail/i.test(responseErrorMessage)) {
            const blockErrorMsg = `${agentName} Error: Prompt blocked by Mistral safety guardrails.${responseErrorMessage ? ` ${responseErrorMessage}` : ''}`;
            currentRunChatLogArray.push({ agentName, type: 'blocked-response', content: blockErrorMsg, details: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            throw new Error(blockErrorMsg);
        }

        const guardrailsUnsupported = response.status === 400
            && useGuardrails
            && /guardrail|safe_prompt|unknown field|extra fields|not a valid/i.test(responseErrorMessage);
        if (guardrailsUnsupported && retryAttempt < MAX_RETRIES) {
            const fallbackMsg = `${agentName}: model rejected guardrail fields; retrying with the safety prompt only.\n`;
            console.warn(fallbackMsg.trim());
            if (statusCallback) statusCallback(fallbackMsg);
            currentRunChatLogArray.push({
                agentName,
                type: 'guardrail-fallback',
                content: responseErrorMessage || 'Guardrail fields were rejected by the selected model.',
                timestamp: new Date().toISOString(),
            });
            return retry(responseMimeType, responseSchema, false);
        }

        const structuredOutputUnsupported = response.status === 400
            && Boolean(responseMimeType)
            && /json_schema|json_object|response_format|structured output|json mode|not supported|unknown field/i.test(responseErrorMessage);
        if (structuredOutputUnsupported && retryAttempt < MAX_RETRIES) {
            const fallbackMsg = `${agentName}: selected model rejected structured output; retrying the same prompt with prompt-enforced JSON.\n`;
            console.warn(fallbackMsg.trim());
            if (statusCallback) statusCallback(fallbackMsg);
            currentRunChatLogArray.push({
                agentName,
                type: 'structured-output-fallback',
                content: responseErrorMessage || 'Structured output was rejected by the selected model.',
                timestamp: new Date().toISOString(),
            });
            return retry('', undefined, useGuardrails);
        }

        if (!response.ok) {
            const apiErrorMsg = responseErrorMessage
                ? `${agentName} API Error (Status ${response.status}): ${responseErrorMessage}`
                : `${agentName} API Error (Status ${response.status}): An unexpected error occurred.`;
            console.error('API Error Data for ' + agentName + ':', responseData);
            currentRunChatLogArray.push({ agentName, type: 'error-response', content: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            throw new Error(apiErrorMsg);
        }

        const rawTextOutput = extractMistralText(responseData);
        if (typeof rawTextOutput !== 'string') {
            const structureErrorMsg = `${agentName} Error: Unexpected API response structure. Could not extract text.`;
            console.error(structureErrorMsg + ' Response Data for ' + agentName + ':', responseData);
            currentRunChatLogArray.push({ agentName, type: 'structure-error-response', content: structureErrorMsg, details: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            throw new Error(structureErrorMsg);
        }

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
