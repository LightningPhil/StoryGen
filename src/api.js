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
    // Parameter name changed for clarity, but it's still the direct array reference from appState.lastRunChatLog
    // This function will directly push log entries to this array.
    currentRunChatLogArray, 
    storyOutputDivRef, // Pass reference to #storyOutput for status updates
    minApiIntervalMs
) {
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

    // --- Rate Limiting Logic ---
    if (retryAttempt === 0) { // Only apply initial wait if not a retry
        const now = Date.now();
        const timeSinceLastFetchInitiated = now - lastApiFetchInitiatedTimestamp;
        if (timeSinceLastFetchInitiated < minApiIntervalMs) {
            const waitTime = minApiIntervalMs - timeSinceLastFetchInitiated;
            if (waitTime > 0) { 
                const waitMsg = `Rate Limiter: Waiting ${Math.ceil(waitTime / 1000)}s before calling ${agentName}...\n`;
                console.log(waitMsg);
                if (storyOutputDivRef && storyOutputDivRef.textContent !== undefined) storyOutputDivRef.textContent += waitMsg; 
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:generateContent?key=${currentApiKey}`;
    const MAX_RETRIES = 6; // Increased from 3 to 6 as per original code
    const RETRY_DELAYS = [5000, 10000, 15000, 20000, 25000, 30000];  // Adjusted delays

    if (retryAttempt === 0) {
        // console.log(`Calling ${agentName} with model ${selectedModelId}.`); // Reduced general log
        // Check if this exact prompt for this agent is already logged
        if (!currentRunChatLogArray.find(log => log.agentName === agentName && log.type === 'prompt' && log.content === prompt)) {
             currentRunChatLogArray.push({ agentName, type: 'prompt', content: prompt, timestamp: new Date().toISOString() });
        }
    } else { 
        console.warn(`Retrying ${agentName} call (Attempt ${retryAttempt + 1}/${MAX_RETRIES}) for model ${selectedModelId}...`);
        // Log retry attempt
        currentRunChatLogArray.push({ 
            agentName, 
            type: 'retry-attempt', 
            content: `Attempt ${retryAttempt + 1}/${MAX_RETRIES} for model ${selectedModelId}`, 
            timestamp: new Date().toISOString() 
        });
    }

    const requestBody = { 
        contents: [{ parts: [{ text: prompt }] }],
        // Add safety settings if necessary, or ensure defaults are appropriate
        // "safetySettings": [
        //   { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        //   { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
        //   { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
        //   { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        // ],
        generationConfig: {
            // "temperature": 0.7, // Example: adjust as needed
            // "maxOutputTokens": 8192, // Example: adjust as per model limits and needs
        } 
    };

    try {
        if (retryAttempt === 0) { 
            lastApiFetchInitiatedTimestamp = Date.now();
        }

        const response = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(requestBody) 
        });
        
        // Handle 429 and 503 as retryable server-side issues
        if (response.status === 503 || response.status === 429) { // 429 Too Many Requests
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                const retryMsg = `Model busy or rate limit hit (${response.status}). Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})\n`;
                console.warn(retryMsg);
                if (storyOutputDivRef && storyOutputDivRef.textContent !== undefined) storyOutputDivRef.textContent += retryMsg;
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, currentRunChatLogArray, storyOutputDivRef, minApiIntervalMs);
            } else {
                const overloadErrorMsg = `${agentName} Error: Model is overloaded or rate limits exceeded after ${MAX_RETRIES} retries (Status ${response.status}). Please try again later.`;
                currentRunChatLogArray.push({ agentName, type: 'error-max-retries', content: overloadErrorMsg, timestamp: new Date().toISOString() });
                throw new Error(overloadErrorMsg);
            }
        }

        const responseData = await response.json();

        // Check for specific error messages indicating overload, even if status isn't 503/429
        if (responseData.error && responseData.error.message && 
            (responseData.error.message.toLowerCase().includes("overload") || responseData.error.message.toLowerCase().includes("busy now"))) {
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                const retryMsg = `Model is busy (message: ${responseData.error.message}). Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})\n`;
                console.warn(retryMsg);
                if (storyOutputDivRef && storyOutputDivRef.textContent !== undefined) storyOutputDivRef.textContent += retryMsg;
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1, currentRunChatLogArray, storyOutputDivRef, minApiIntervalMs);
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
                blockErrorMsg += ` Safety Ratings: ${safetyRatings.map(r => `${r.category} (${r.probability})`).join(', ')}.`;
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
        // Check if this exact response for this agent is already logged
        if (!currentRunChatLogArray.find(log => log.agentName === agentName && log.type === 'response' && log.content === rawTextOutput)) {
             currentRunChatLogArray.push({ agentName, type: 'response', content: rawTextOutput, timestamp: new Date().toISOString() });
        }
        return rawTextOutput;

    } catch (error) { // Catches network errors, JSON parsing errors, and errors thrown above
        console.error(`Error during API call for ${agentName} (Attempt ${retryAttempt + 1}/${MAX_RETRIES}):`, error.message);
        // Avoid duplicate logging of the same error message for the same agent
        if (!currentRunChatLogArray.some(log => log.agentName === agentName && 
                                   (log.type.includes('error') || log.type.includes('blocked')) && 
                                   log.content && log.content.includes(error.message.substring(0,100)))) { // Check substring to catch similar formatted errors
            currentRunChatLogArray.push({ agentName, type: 'general-fetch-error', content: error.message, stack: error.stack, timestamp: new Date().toISOString() });
        }
        // Re-throw the error to be handled by the calling function in script.js
        throw error; 
    }
}