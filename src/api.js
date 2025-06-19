import { showTemporaryStatus } from './ui.js';

let lastApiFetchInitiatedTimestamp = 0; 

export async function callAgentAPI(
    prompt, 
    currentApiKey, 
    selectedModelId, 
    agentName = "Agent", 
    retryAttempt = 0, 
    globalLastRunChatLogRef, 
    statusMessageDivRef,
    minApiIntervalMs
) {
    if (!currentApiKey) {
        console.error("API Key is missing in callAgentAPI");
        throw new Error("Gemini API Key is missing. Please enter it via Settings (⚙️) and try again.");
    }
    if (!selectedModelId) {
        console.error("Gemini Model ID is missing in callAgentAPI");
        throw new Error("Gemini Model not selected. Please select a model in Settings (⚙️).");
    }

    // --- Rate Limiting Logic ---
    if (retryAttempt === 0) {
        const now = Date.now();
        const timeSinceLastFetchInitiated = now - lastApiFetchInitiatedTimestamp;

        if (timeSinceLastFetchInitiated < minApiIntervalMs) {
            const waitTime = minApiIntervalMs - timeSinceLastFetchInitiated;
            if (waitTime > 0) { 
                console.log(`Rate Limiter: Waiting ${waitTime / 1000}s before calling ${agentName}.`);
                if (statusMessageDivRef && statusMessageDivRef.classList.contains('loading')) {
                    const baseMessage = statusMessageDivRef.textContent.split(' (Waiting')[0].split(' (Retry')[0];
                    statusMessageDivRef.textContent = `${baseMessage} (Waiting ${Math.ceil(waitTime/1000)}s...)`;
                }
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    // ***** THIS LINE WAS MISSING/MOVED INCORRECTLY *****
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:generateContent?key=${currentApiKey}`;
    // ****************************************************
    
    const MAX_RETRIES = 6;
    const RETRY_DELAYS = [5000, 10000, 15000, 20000, 25000, 30000]; 

    if (retryAttempt === 0) {
        console.log(`Calling ${agentName} with model ${selectedModelId}.`);
        if (!globalLastRunChatLogRef.find(log => log.agentName === agentName && log.type === 'prompt' && log.content === prompt)) {
             globalLastRunChatLogRef.push({ agentName, type: 'prompt', content: prompt, timestamp: new Date().toISOString() });
        }
    } else if (retryAttempt > 0) { 
        console.warn(`Retrying ${agentName} call (Attempt ${retryAttempt}/${MAX_RETRIES}) for model ${selectedModelId}...`);
        if (statusMessageDivRef && statusMessageDivRef.classList.contains('loading')) {
             const baseMessage = statusMessageDivRef.textContent.split(' (Retry')[0].split(' (Waiting')[0];
             statusMessageDivRef.textContent = `${baseMessage} (Retrying ${retryAttempt}/${MAX_RETRIES}...)`;
        }
    }

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {}
    };

    try {
        if (retryAttempt === 0) { 
            lastApiFetchInitiatedTimestamp = Date.now();
        }

        const response = await fetch(API_URL, { // API_URL is now defined
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        // lastApiFetchInitiatedTimestamp should be updated for the *next* call if this one succeeds or fails definitively.
        // If it retries, the original lastApiFetchInitiatedTimestamp for *this logical call* is preserved.
        // The update of lastApiFetchInitiatedTimestamp for the *next distinct agent call* happens before fetch.

        if (response.status === 503) {
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                const retryMsg = `Model is busy (503). Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})`;
                console.warn(retryMsg);
                if (statusMessageDivRef) {
                    statusMessageDivRef.textContent = retryMsg; // Directly set for immediate feedback
                    statusMessageDivRef.className = 'info';
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, globalLastRunChatLogRef, statusMessageDivRef, minApiIntervalMs);
            } else {
                const overloadErrorMsg = `Model ${selectedModelId} is overloaded (503). Failed after ${MAX_RETRIES} retries. Please try again later.`;
                globalLastRunChatLogRef.push({ agentName, type: 'overload-error-503', content: overloadErrorMsg, timestamp: new Date().toISOString() });
                throw new Error(overloadErrorMsg);
            }
        }

        const responseData = await response.json();

        if (responseData.error && responseData.error.message && responseData.error.message.toLowerCase().includes("overload")) {
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                const retryMsg = `Model is busy (msg). Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})`;
                console.warn(retryMsg);
                 if (statusMessageDivRef) {
                    statusMessageDivRef.textContent = retryMsg; // Directly set
                    statusMessageDivRef.className = 'info';
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, globalLastRunChatLogRef, statusMessageDivRef, minApiIntervalMs);
            } else {
                const overloadErrorMsg = `Model ${selectedModelId} is overloaded (msg). Failed after ${MAX_RETRIES} retries. Please try again later.`;
                globalLastRunChatLogRef.push({ agentName, type: 'overload-error-msg', content: overloadErrorMsg, fullResponse: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
                throw new Error(overloadErrorMsg);
            }
        }
        
        if (!response.ok) {
            let errorMessage = `API request failed with status ${response.status} using model ${selectedModelId}`;
            if (responseData && responseData.error && responseData.error.message) {
                errorMessage += ` - ${responseData.error.message}`;
                 if (response.status === 400 && responseData.error.message.toLowerCase().includes("api key not valid")) {
                    errorMessage = `Invalid Gemini API Key (model: ${selectedModelId}). Please check the key in Settings (⚙️) and try again.`;
                }
            } else {
                errorMessage += ` - ${response.statusText}`;
            }
            globalLastRunChatLogRef.push({ agentName, type: 'error-response', content: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            console.error("API Error Data for " + agentName + ":", responseData);
            throw new Error(errorMessage);
        }
        
        if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
            const blockErrorMsg = `Content generation blocked by API (model: ${selectedModelId}). Reason: ${responseData.promptFeedback.blockReason}. Details: ${responseData.promptFeedback.safetyRatings ? JSON.stringify(responseData.promptFeedback.safetyRatings) : 'No additional details.'}`;
            globalLastRunChatLogRef.push({ agentName, type: 'blocked-response', content: blockErrorMsg, fullResponse: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            throw new Error(blockErrorMsg);
        }

        if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content || !responseData.candidates[0].content.parts || !responseData.candidates[0].content.parts[0] || !responseData.candidates[0].content.parts[0].text) {
            const structureErrorMsg = 'Failed to extract content from API response from ' + agentName + '.';
            globalLastRunChatLogRef.push({ agentName, type: 'structure-error-response', content: structureErrorMsg, fullResponse: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
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