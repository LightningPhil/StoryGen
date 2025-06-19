// src/api.js
// No direct import of ui.js showTemporaryStatus here, main script will handle status.
// It will take storyOutputDivRef as a parameter to log retry attempts there.

let lastApiFetchInitiatedTimestamp = 0; 

export async function callAgentAPI(
    prompt, 
    currentApiKey, 
    selectedModelId, 
    agentName = "Agent", 
    retryAttempt = 0, 
    globalLastRunChatLogRef, 
    storyOutputDivRef, // Pass reference to #storyOutput for status updates
    minApiIntervalMs
) {
    if (!currentApiKey) { /* ... error handling ... */ throw new Error("API Key missing"); }
    if (!selectedModelId) { /* ... error handling ... */ throw new Error("Model ID missing"); }

    // --- Rate Limiting Logic ---
    if (retryAttempt === 0) {
        const now = Date.now();
        const timeSinceLastFetchInitiated = now - lastApiFetchInitiatedTimestamp;
        if (timeSinceLastFetchInitiated < minApiIntervalMs) {
            const waitTime = minApiIntervalMs - timeSinceLastFetchInitiated;
            if (waitTime > 0) { 
                const waitMsg = `Rate Limiter: Waiting ${Math.ceil(waitTime / 1000)}s before calling ${agentName}...\n`;
                console.log(waitMsg);
                if (storyOutputDivRef) storyOutputDivRef.textContent += waitMsg; // Append to story output
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:generateContent?key=${currentApiKey}`;
    const MAX_RETRIES = 6;
    const RETRY_DELAYS = [5000, 10000, 15000, 20000, 25000, 30000]; 

    if (retryAttempt === 0) {
        // console.log(`Calling ${agentName} with model ${selectedModelId}.`); // Reduced general log
        if (!globalLastRunChatLogRef.find(log => log.agentName === agentName && log.type === 'prompt' && log.content === prompt)) {
             globalLastRunChatLogRef.push({ agentName, type: 'prompt', content: prompt, timestamp: new Date().toISOString() });
        }
    } else { 
        console.warn(`Retrying ${agentName} call (Attempt ${retryAttempt}/${MAX_RETRIES}) for model ${selectedModelId}...`);
    }

    const requestBody = { contents: [{ parts: [{ text: prompt }] }], generationConfig: {} };

    try {
        if (retryAttempt === 0) { 
            lastApiFetchInitiatedTimestamp = Date.now();
        }

        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        
        if (response.status === 503) {
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                const retryMsg = `Model is busy (503). Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})\n`;
                console.warn(retryMsg);
                if (storyOutputDivRef) storyOutputDivRef.textContent += retryMsg; // Append to story output
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, globalLastRunChatLogRef, storyOutputDivRef, minApiIntervalMs);
            } else { /* ... throw overload error ... */ }
        }

        const responseData = await response.json();
        if (responseData.error && responseData.error.message && responseData.error.message.toLowerCase().includes("overload")) {
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                const retryMsg = `Model is busy (msg). Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})\n`;
                console.warn(retryMsg);
                if (storyOutputDivRef) storyOutputDivRef.textContent += retryMsg; // Append to story output
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, globalLastRunChatLogRef, storyOutputDivRef, minApiIntervalMs);
            } else { /* ... throw overload error ... */ }
        }
        
        // ... (Rest of error handling: !response.ok, blockReason, structure issues - log to globalLastRunChatLogRef, throw error)
        if (!response.ok) {
            // ... (construct errorMessage) ...
            globalLastRunChatLogRef.push({ agentName, type: 'error-response', content: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            console.error("API Error Data for " + agentName + ":", responseData);
            throw new Error(errorMessage);
        }
        if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
            // ... (construct blockErrorMsg) ...
            globalLastRunChatLogRef.push({ agentName, type: 'blocked-response', /* ... */ });
            throw new Error(blockErrorMsg);
        }
        if (!responseData.candidates || !responseData.candidates[0] /* ... */) {
            // ... (construct structureErrorMsg) ...
            globalLastRunChatLogRef.push({ agentName, type: 'structure-error-response', /* ... */ });
            console.error("Unexpected API response structure for " + agentName + ":", responseData);
            throw new Error(structureErrorMsg);
        }
        
        const rawTextOutput = responseData.candidates[0].content.parts[0].text;
        if (!globalLastRunChatLogRef.find(log => log.agentName === agentName && log.type === 'response' && log.content === rawTextOutput)) {
             globalLastRunChatLogRef.push({ agentName, type: 'response', content: rawTextOutput, timestamp: new Date().toISOString() });
        }
        return rawTextOutput;

    } catch (error) {
        console.error(`Catch block in callAgentAPI for ${agentName} (Attempt ${retryAttempt}):`, error);
        if (!globalLastRunChatLogRef.some(log => log.agentName === agentName && 
                                   (log.type.includes('error') || log.type.includes('blocked')) && 
                                   log.content.includes(error.message.substring(0,50)))) {
            globalLastRunChatLogRef.push({ agentName, type: 'general-fetch-error', content: error.message, timestamp: new Date().toISOString() });
        }
        throw error;
    }
}