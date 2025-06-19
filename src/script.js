// --- Configuration ---
const DEFAULT_GEMINI_MODEL_ID = "gemini-2.0-flash"; 
const AVAILABLE_MODELS = {
    "gemini-2.5-flash": "Gemini-2.5-Flash",
    "gemini-2.0-flash": "Gemini-2.0-flash",
    "gemini-1.5-flash": "Gemini-1.5-Flash"
};

// --- Local Storage Keys ---
const LS_API_KEY = 'geminiApiKey_storyCircle';
const LS_CHARACTERS = 'storyCharacters_storyCircle';
const LS_AUDIENCE = 'storyAudience_storyCircle';
const LS_SELECTED_FRAMEWORK = 'storySelectedFramework_storyCircle';
const LS_SELECTED_MODEL = 'geminiSelectedModel_storyCircle';
const LS_USE_ENGINE_SUGGESTIONS = 'useEngineSuggestions_storyCircle';
const LS_USER_SUGGESTIONS = 'userSuggestions_storyCircle';

// --- Imports ---
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides.js';
import {
    PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
    PROMPT_AGENT_2_ELABORATOR_TEMPLATE,
    PROMPT_AGENT_3_REVIEWER_TEMPLATE,
    PROMPT_AGENT_4_POLISHER_TEMPLATE,
    PROMPT_AGENT_5_CLEANER_TEMPLATE,
    PROMPT_AGENT_6_TITLER_TEMPLATE,
} from './prompts/agent_prompts.js';

// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, closeSettingsModalButton, saveSettingsButton, modalModelSelect, downloadChatLogButton;
let copyStoryButton, saveStoryButton, elaborateStoryButton;
let useEngineSuggestionsCheckbox, userSuggestionsTextarea;

// --- Global State ---
let lastRunChatLog = [];
let latestGeneratedStoryText = ""; 
let latestGeneratedStoryTitle = ""; 

// --- UI Update Functions ---
function displayLoading(isLoading, message = '') {
    if (isLoading) {
        if (statusMessageDiv) {
            statusMessageDiv.textContent = message || 'Processing...';
            statusMessageDiv.className = 'loading';
        }
        // Only clear fully for a brand new generation, not for elaboration steps.
        if (message && !message.toLowerCase().includes("elaborat") && !message.toLowerCase().includes("step") && !message.toLowerCase().includes("retry")) {
             if (storyTitleDiv) storyTitleDiv.textContent = '';
             if (storyOutputDiv) storyOutputDiv.textContent = 'Your story will appear here...';
        }
        if (generateButton) generateButton.disabled = true;
        if (elaborateStoryButton) elaborateStoryButton.disabled = true;
        if (copyStoryButton) copyStoryButton.style.display = 'none';
        if (saveStoryButton) saveStoryButton.style.display = 'none';
    } else {
        if (statusMessageDiv && statusMessageDiv.classList.contains('loading')) {
            // Only clear loading message if it hasn't been replaced by success/error/info from a retry
            if (!statusMessageDiv.classList.contains('success') && 
                !statusMessageDiv.classList.contains('error') &&
                !statusMessageDiv.classList.contains('info')) { // 'info' used by retry status
                statusMessageDiv.textContent = '';
                statusMessageDiv.className = '';
            }
        }
        if (generateButton) generateButton.disabled = false;
        // elaborateStoryButton enabled/disabled based on story presence in displayOutput/Error
    }
}

function displayOutput(title, storyText, isElaboration = false) {
    latestGeneratedStoryTitle = title; 
    latestGeneratedStoryText = storyText;  

    if (storyTitleDiv) storyTitleDiv.textContent = title;
    if (storyOutputDiv) storyOutputDiv.textContent = storyText;
    
    const successMessage = isElaboration ? 'Story elaborated successfully!' : 'Story generated successfully!';
    // Use showTemporaryStatus to display success messages so they don't get stuck
    // if a loading message was briefly replaced by a retry info message.
    showTemporaryStatus(successMessage, 'success', 4000);


    if (copyStoryButton) copyStoryButton.style.display = 'inline-block';
    if (saveStoryButton) saveStoryButton.style.display = 'inline-block';
    if (elaborateStoryButton) {
        elaborateStoryButton.style.display = 'inline-block';
        elaborateStoryButton.disabled = false;
    }
}

function displayError(errorMessage) {
    if (statusMessageDiv) {
        statusMessageDiv.textContent = `Error: ${errorMessage}`;
        statusMessageDiv.className = 'error';
    }
    if (storyTitleDiv) storyTitleDiv.textContent = '';
    latestGeneratedStoryTitle = ""; 
    latestGeneratedStoryText = "";  

    if (copyStoryButton) copyStoryButton.style.display = 'none';
    if (saveStoryButton) saveStoryButton.style.display = 'none';
    if (elaborateStoryButton) {
        elaborateStoryButton.style.display = 'none';
        elaborateStoryButton.disabled = true;
    }
    console.error("Pipeline Error Details:", errorMessage);
}

function showTemporaryStatus(message, type = 'info', duration = 3000) {
    if (statusMessageDiv) {
        // If there's already a more severe error, don't overwrite it with a temporary info/success message
        if (statusMessageDiv.classList.contains('error') && type !== 'error') {
            return; 
        }
        statusMessageDiv.textContent = message;
        statusMessageDiv.className = type; 
        setTimeout(() => {
            // Clear only if the message hasn't been replaced by a newer status
            if (statusMessageDiv.textContent === message && statusMessageDiv.className === type) {
                statusMessageDiv.textContent = '';
                statusMessageDiv.className = '';
            }
        }, duration);
    }
}


function updateFrameworkSummaryDisplay() {
    if (craftingFrameworkSelect && frameworkSummaryDiv) {
        const selectedFrameworkKey = craftingFrameworkSelect.value;
        const summary = STORY_FRAMEWORK_SUMMARIES[selectedFrameworkKey] || "No summary available for this framework.";
        frameworkSummaryDiv.textContent = summary;
    } else if (frameworkSummaryDiv) {
        frameworkSummaryDiv.textContent = "Select a framework to see its summary.";
    }
}

function updateSuggestionsTextareaStyle() {
    if (!userSuggestionsTextarea || !useEngineSuggestionsCheckbox) return;

    if (useEngineSuggestionsCheckbox.checked) {
        userSuggestionsTextarea.classList.remove('suggestions-used');
        userSuggestionsTextarea.classList.add('suggestions-not-used');
        userSuggestionsTextarea.disabled = true;
    } else {
        userSuggestionsTextarea.classList.remove('suggestions-not-used');
        userSuggestionsTextarea.classList.add('suggestions-used');
        userSuggestionsTextarea.disabled = false;
    }
}

function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("Could not save to local storage:", e);
    }
}

function loadFromLocalStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn("Could not load from local storage:", e);
        return null;
    }
}

function parseCharacters(characterString) {
    if (!characterString) return [];
    return characterString.split(',').map(char => char.trim()).filter(char => char.length > 0);
}

function constructAgentPrompt(basePromptTemplate, dataObject) {
    let prompt = basePromptTemplate;
    for (const key in dataObject) {
        const value = typeof dataObject[key] === 'string' ? dataObject[key] : '';
        const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
        prompt = prompt.replace(placeholder, value);
    }
    return prompt;
}

async function callAgentAPI(prompt, currentApiKey, selectedModelId, agentName = "Agent", retryAttempt = 0) {
    if (!currentApiKey) {
        console.error("API Key is missing in callAgentAPI");
        throw new Error("Gemini API Key is missing. Please enter it via Settings (⚙️) and try again.");
    }
    if (!selectedModelId) {
        console.error("Gemini Model ID is missing in callAgentAPI");
        throw new Error("Gemini Model not selected. Please select a model in Settings (⚙️).");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:generateContent?key=${currentApiKey}`;
    
    const MAX_RETRIES = 6;
    const RETRY_DELAYS = [5000, 10000, 15000, 20000, 25000, 30000]; 

    if (retryAttempt > 0) {
        console.log(`Retrying ${agentName} call (Attempt ${retryAttempt}/${MAX_RETRIES}) for model ${selectedModelId}...`);
        if (statusMessageDiv && statusMessageDiv.classList.contains('loading')) {
             const baseMessageElement = document.getElementById('statusMessage'); // Re-fetch to ensure it's the right one
             if (baseMessageElement) {
                const baseMessage = baseMessageElement.textContent.split(' (Retry')[0];
                baseMessageElement.textContent = `${baseMessage} (Retry ${retryAttempt}/${MAX_RETRIES} after delay...)`;
             }
        }
    } else {
        console.log(`Calling ${agentName} with model ${selectedModelId}. Prompt starts with: "${prompt.substring(0,100)}..."`);
        // Log prompt only on the first true attempt for this agent call in a sequence
        if (!lastRunChatLog.find(log => log.agentName === agentName && log.type === 'prompt' && log.content === prompt)) {
             lastRunChatLog.push({ agentName, type: 'prompt', content: prompt, timestamp: new Date().toISOString() });
        }
    }


    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {}
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const responseData = await response.json();

        if (response.status === 503 || (responseData.error && responseData.error.message && responseData.error.message.toLowerCase().includes("overload"))) {
            if (retryAttempt < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryAttempt];
                console.warn(`Model ${selectedModelId} overloaded. Retrying ${agentName} in ${delay / 1000}s... (Attempt ${retryAttempt + 1})`);
                showTemporaryStatus(`Model is busy, retrying in ${delay / 1000}s... (Attempt ${retryAttempt + 1})`, 'info', delay > 500 ? delay - 500 : delay);
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAgentAPI(prompt, currentApiKey, selectedModelId, agentName, retryAttempt + 1);
            } else {
                const overloadErrorMsg = `Model ${selectedModelId} is overloaded. Failed after ${MAX_RETRIES} retries. Please try again later.`;
                lastRunChatLog.push({ agentName, type: 'overload-error', content: overloadErrorMsg, fullResponse: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
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
            lastRunChatLog.push({ agentName, type: 'error-response', content: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            console.error("API Error Data:", responseData);
            throw new Error(errorMessage);
        }
        
        if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
            let blockDetails = responseData.promptFeedback.safetyRatings ? JSON.stringify(responseData.promptFeedback.safetyRatings) : 'No additional details.';
            if (responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].finishReason === 'SAFETY') {
                 blockDetails += ` Candidate finish reason: SAFETY.`;
            }
            const blockErrorMsg = `Content generation blocked by API (model: ${selectedModelId}). Reason: ${responseData.promptFeedback.blockReason}. Details: ${blockDetails}`;
            lastRunChatLog.push({ agentName, type: 'blocked-response', content: blockErrorMsg, fullResponse: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            throw new Error(blockErrorMsg);
        }

        if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content || !responseData.candidates[0].content.parts || !responseData.candidates[0].content.parts[0] || !responseData.candidates[0].content.parts[0].text) {
            if (responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].finishReason && responseData.candidates[0].finishReason !== 'STOP') {
                const prematureStopMsg = `Content generation stopped prematurely (model: ${selectedModelId}). Finish Reason: ${responseData.candidates[0].finishReason}. Check safety ratings if available: ${JSON.stringify(responseData.candidates[0].safetyRatings)}`;
                lastRunChatLog.push({ agentName, type: 'premature-stop-response', content: prematureStopMsg, fullResponse: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
                 throw new Error(prematureStopMsg);
            }
            const structureErrorMsg = 'Failed to extract content from API response. Structure might have changed or content was not generated as expected from model ' + selectedModelId + '.';
            lastRunChatLog.push({ agentName, type: 'structure-error-response', content: structureErrorMsg, fullResponse: JSON.stringify(responseData, null, 2), timestamp: new Date().toISOString() });
            console.error("Unexpected API response structure or empty content from model " + selectedModelId + ":", responseData);
            throw new Error(structureErrorMsg);
        }
        
        const rawTextOutput = responseData.candidates[0].content.parts[0].text;
        if (!lastRunChatLog.find(log => log.agentName === agentName && log.type === 'response' && log.content === rawTextOutput)) {
             lastRunChatLog.push({ agentName, type: 'response', content: rawTextOutput, timestamp: new Date().toISOString() });
        }
        console.log(`${agentName} raw output from model ${selectedModelId} starts with: "${rawTextOutput.substring(0,100)}..."`);
        return rawTextOutput;

    } catch (error) {
        console.error(`Error in callAgentAPI with model ${selectedModelId} for ${agentName} (Attempt ${retryAttempt}):`, error);
        // Log general error only if a more specific one (like overload, blocked) wasn't already logged for this attempt
        if (!lastRunChatLog.some(log => log.agentName === agentName && 
                                   (log.type.includes('error') || log.type.includes('blocked')) && 
                                   log.content.includes(error.message.substring(0,50)))) { // Check if error message is roughly the same
            lastRunChatLog.push({ agentName, type: 'general-error', content: error.message, timestamp: new Date().toISOString() });
        }
        throw error; 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    modalApiKeyInput = document.getElementById('modalApiKeyInput');
    modalModelSelect = document.getElementById('modalModelSelect');
    downloadChatLogButton = document.getElementById('downloadChatLogButton');
    charactersInput = document.getElementById('charactersInput');
    audienceInput = document.getElementById('audienceInput');
    useEngineSuggestionsCheckbox = document.getElementById('useEngineSuggestionsCheckbox');
    userSuggestionsTextarea = document.getElementById('userSuggestionsTextarea');
    craftingFrameworkSelect = document.getElementById('craftingFrameworkSelect');
    frameworkSummaryDiv = document.getElementById('frameworkSummary');
    generateButton = document.getElementById('generateButton');
    statusMessageDiv = document.getElementById('statusMessage');
    storyTitleDiv = document.getElementById('storyTitle');
    storyOutputDiv = document.getElementById('storyOutput');
    copyStoryButton = document.getElementById('copyStoryButton');
    saveStoryButton = document.getElementById('saveStoryButton');
    elaborateStoryButton = document.getElementById('elaborateStoryButton');


    settingsModal = document.getElementById('settingsModal');
    settingsButton = document.getElementById('settingsButton');
    closeSettingsModalButton = document.getElementById('closeSettingsModal');
    saveSettingsButton = document.getElementById('saveSettingsButton');

    const criticalElements = { modalApiKeyInput, modalModelSelect, downloadChatLogButton, charactersInput, audienceInput, useEngineSuggestionsCheckbox, userSuggestionsTextarea, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv, settingsModal, settingsButton, closeSettingsModalButton, saveSettingsButton, copyStoryButton, saveStoryButton, elaborateStoryButton };
    for (const elName in criticalElements) {
        if (!criticalElements[elName]) {
            console.error(`Error: ${elName} element not found in HTML! UI may not function correctly.`);
        }
    }
    
    if (copyStoryButton) copyStoryButton.style.display = 'none';
    if (saveStoryButton) saveStoryButton.style.display = 'none';
    if (elaborateStoryButton) elaborateStoryButton.style.display = 'none';


    if (useEngineSuggestionsCheckbox && userSuggestionsTextarea) {
        const savedUseEngine = loadFromLocalStorage(LS_USE_ENGINE_SUGGESTIONS);
        useEngineSuggestionsCheckbox.checked = savedUseEngine === null ? true : (savedUseEngine === 'true');
        userSuggestionsTextarea.value = loadFromLocalStorage(LS_USER_SUGGESTIONS) || '';
        updateSuggestionsTextareaStyle(); 

        useEngineSuggestionsCheckbox.addEventListener('change', () => {
            updateSuggestionsTextareaStyle();
            saveToLocalStorage(LS_USE_ENGINE_SUGGESTIONS, useEngineSuggestionsCheckbox.checked.toString());
        });
        userSuggestionsTextarea.addEventListener('input', () => {
            saveToLocalStorage(LS_USER_SUGGESTIONS, userSuggestionsTextarea.value);
        });
    }


    if (modalModelSelect) {
        for (const modelId in AVAILABLE_MODELS) {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = AVAILABLE_MODELS[modelId];
            modalModelSelect.appendChild(option);
        }
        const savedModel = loadFromLocalStorage(LS_SELECTED_MODEL);
        if (savedModel && AVAILABLE_MODELS[savedModel]) {
            modalModelSelect.value = savedModel;
        } else {
            modalModelSelect.value = DEFAULT_GEMINI_MODEL_ID;
        }
    }

    if (modalApiKeyInput) {
        modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
    }

    if (settingsButton && settingsModal && closeSettingsModalButton && saveSettingsButton && modalApiKeyInput && modalModelSelect && downloadChatLogButton) {
        settingsButton.addEventListener('click', () => {
            modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
            const savedModel = loadFromLocalStorage(LS_SELECTED_MODEL);
            modalModelSelect.value = (savedModel && AVAILABLE_MODELS[savedModel]) ? savedModel : DEFAULT_GEMINI_MODEL_ID;
            settingsModal.style.display = 'block';
            modalApiKeyInput.focus();
        });
        closeSettingsModalButton.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        saveSettingsButton.addEventListener('click', () => {
            saveToLocalStorage(LS_API_KEY, modalApiKeyInput.value.trim());
            saveToLocalStorage(LS_SELECTED_MODEL, modalModelSelect.value);
            settingsModal.style.display = 'none';
            showTemporaryStatus('Settings saved successfully.', 'success');
        });
        downloadChatLogButton.addEventListener('click', () => {
            if (lastRunChatLog.length === 0) {
                showTemporaryStatus('No chat log available from the last run.', 'info', 4000);
                return;
            }
            let logContent = "Story Generation Session Log\n=============================\n\n";
            lastRunChatLog.forEach(entry => {
                logContent += `Timestamp: ${entry.timestamp}\n`;
                logContent += `Agent: ${entry.agentName}\n`;
                logContent += `Type: ${entry.type}\n`;
                logContent += `Content:\n-------\n${entry.content}\n-------\n\n`;
                if (entry.fullResponse) {
                    logContent += `Full API Response (for errors/blocks):\n${entry.fullResponse}\n\n`;
                }
            });

            const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `story_generation_log_${new Date().toISOString().slice(0,10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showTemporaryStatus('Chat log download initiated.', 'success');
        });
        window.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && settingsModal.style.display === 'block') {
                settingsModal.style.display = 'none';
            }
        });
    }

    if (copyStoryButton && storyOutputDiv) {
        copyStoryButton.addEventListener('click', () => {
            const storyTextToCopy = storyOutputDiv.textContent; 
            if (storyTextToCopy && storyTextToCopy !== 'Your story will appear here...') {
                navigator.clipboard.writeText(storyTextToCopy).then(() => {
                    showTemporaryStatus('Story copied to clipboard!', 'success', 2000);
                }).catch(err => {
                    console.error('Failed to copy story: ', err);
                    showTemporaryStatus('Failed to copy story.', 'error', 2000);
                });
            } else {
                showTemporaryStatus('No story to copy.', 'info', 2000);
            }
        });
    }

    if (saveStoryButton && storyOutputDiv && storyTitleDiv) {
        saveStoryButton.addEventListener('click', () => {
            const storyTextToSave = storyOutputDiv.textContent; 
            const storyTitleTextToSave = storyTitleDiv.textContent || 'Untitled Story';
            if (storyTextToSave && storyTextToSave !== 'Your story will appear here...') {
                const blob = new Blob([`Title: ${storyTitleTextToSave}\n\n${storyTextToSave}`], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeTitle = storyTitleTextToSave.replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '_');
                a.download = `${safeTitle || 'generated_story'}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                showTemporaryStatus('No story to save.', 'info', 2000);
            }
        });
    }


    if (craftingFrameworkSelect) {
        Object.keys(STORY_CRAFTING_GUIDES).forEach(frameworkName => {
            const option = document.createElement('option');
            option.value = frameworkName;
            option.textContent = frameworkName;
            craftingFrameworkSelect.appendChild(option);
        });
        const savedFramework = loadFromLocalStorage(LS_SELECTED_FRAMEWORK);
        if (savedFramework && STORY_CRAFTING_GUIDES[savedFramework]) {
            craftingFrameworkSelect.value = savedFramework;
        } else if (Object.keys(STORY_CRAFTING_GUIDES).length > 0) {
            craftingFrameworkSelect.value = Object.keys(STORY_CRAFTING_GUIDES)[0];
        }
        craftingFrameworkSelect.addEventListener('change', () => {
            saveToLocalStorage(LS_SELECTED_FRAMEWORK, craftingFrameworkSelect.value);
            updateFrameworkSummaryDisplay();
        });
        updateFrameworkSummaryDisplay();
    } else if (frameworkSummaryDiv) {
        frameworkSummaryDiv.textContent = "Framework selection dropdown is missing.";
    }

    if (charactersInput) {
        charactersInput.value = loadFromLocalStorage(LS_CHARACTERS) || '';
        charactersInput.addEventListener('input', () => saveToLocalStorage(LS_CHARACTERS, charactersInput.value));
    }
    if (audienceInput) {
        audienceInput.value = loadFromLocalStorage(LS_AUDIENCE) || '';
        audienceInput.addEventListener('input', () => saveToLocalStorage(LS_AUDIENCE, audienceInput.value));
    }

    if (storyOutputDiv) {
        storyOutputDiv.textContent = 'Describe your characters, choose an audience and a story framework, then click "Generate Story".\n\nConfigure your Gemini API Key and Model in Settings (⚙️ icon in the top right).';
    }
    if (storyTitleDiv) {
        storyTitleDiv.textContent = '';
    }

    async function handleGenerateStory() {
        lastRunChatLog = []; 

        if (!modalApiKeyInput || !modalModelSelect || !charactersInput || !audienceInput || !craftingFrameworkSelect || !useEngineSuggestionsCheckbox || !userSuggestionsTextarea) {
             displayError(`Cannot generate story: Critical form elements missing. Please check HTML or report issue.`);
            return;
        }

        const storedApiKey = loadFromLocalStorage(LS_API_KEY) || '';
        const storedModelId = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;

        if (!storedApiKey) {
            displayError('Please enter your Gemini API Key in Settings (⚙️).');
            if (settingsModal && modalApiKeyInput) { settingsModal.style.display = 'block'; modalApiKeyInput.focus(); }
            return;
        }
        if (!storedModelId || !AVAILABLE_MODELS[storedModelId]) {
             displayError('Please select a valid Gemini Model in Settings (⚙️).');
            if (settingsModal && modalModelSelect) { settingsModal.style.display = 'block'; modalModelSelect.focus(); }
            return;
        }

        const charactersStr = charactersInput.value;
        const audienceStr = audienceInput.value;
        const selectedFrameworkKey = craftingFrameworkSelect.value;
        const selectedCraftGuideText = STORY_CRAFTING_GUIDES[selectedFrameworkKey];

        let userProvidedSuggestionsText = "";
        const useEngineForSuggestions = useEngineSuggestionsCheckbox.checked;
        const suggestionsText = userSuggestionsTextarea.value.trim();

        if (!useEngineForSuggestions && suggestionsText) {
            userProvidedSuggestionsText = `\n**User Story/Scene Suggestions:**\nThe user has provided the following suggestions. Please use these for guidance and inspiration when crafting the story, if they align well with the characters, audience, and chosen story framework. Be flexible with the user's wording and formatting. The suggestions are:\n"""\n${suggestionsText}\n"""\n`;
        }

        saveToLocalStorage(LS_CHARACTERS, charactersStr);
        saveToLocalStorage(LS_AUDIENCE, audienceStr);

        if (!charactersStr.trim()) { displayError('Please enter at least one character.'); if (charactersInput) charactersInput.focus(); return; }
        const parsedCharsArray = parseCharacters(charactersStr);
        if (parsedCharsArray.length === 0) { displayError('Please enter valid character descriptions.'); if (charactersInput) charactersInput.focus(); return; }
        if (!audienceStr.trim()) { displayError('Please enter the target audience.'); if (audienceInput) audienceInput.focus(); return; }
        if (!selectedCraftGuideText) { displayError('Invalid story crafting framework selected.'); if(craftingFrameworkSelect) craftingFrameworkSelect.focus(); return; }

        if (statusMessageDiv) { statusMessageDiv.textContent = ''; statusMessageDiv.className = ''; }
        displayLoading(true, `Initializing story generation with ${selectedFrameworkKey} using ${AVAILABLE_MODELS[storedModelId]}...`);
        
        latestGeneratedStoryText = "";
        latestGeneratedStoryTitle = "";
        let currentWorkingStoryText = "";

        try {
            const agent1DataObject = {
                charactersList: parsedCharsArray.join(', '),
                audience: audienceStr,
                USER_SUGGESTIONS_TEXT: userProvidedSuggestionsText,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent1Prompt = constructAgentPrompt(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, agent1DataObject);
            displayLoading(true, `Step 1/6: Crafting initial draft...`);
            currentWorkingStoryText = await callAgentAPI(agent1Prompt, storedApiKey, storedModelId, "Agent 1: Story Crafter");

            const agent2DataObject = {
                storyText: currentWorkingStoryText, 
                audience: audienceStr,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_ELABORATOR_TEMPLATE, agent2DataObject);
            displayLoading(true, `Step 2/6: Elaborating draft...`);
            currentWorkingStoryText = await callAgentAPI(agent2Prompt, storedApiKey, storedModelId, "Agent 2: Elaborator");

            const agent3DataObject = { 
                storyText: currentWorkingStoryText, 
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_REVIEWER_TEMPLATE, agent3DataObject);
            displayLoading(true, `Step 3/6: Reviewing elaborated draft...`);
            const agent3Output_ReviewText = await callAgentAPI(agent3Prompt, storedApiKey, storedModelId, "Agent 3: Reviewer");

            const agent4DataObject = { 
                storyText: currentWorkingStoryText, 
                reviewText: agent3Output_ReviewText, 
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_POLISHER_TEMPLATE, agent4DataObject);
            displayLoading(true, `Step 4/6: Polishing story...`);
            currentWorkingStoryText = await callAgentAPI(agent4Prompt, storedApiKey, storedModelId, "Agent 4: Polisher");

            const agent5DataObject = { 
                storyText: currentWorkingStoryText
            };
            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_CLEANER_TEMPLATE, agent5DataObject);
            displayLoading(true, "Step 5/6: Cleaning story...");
            currentWorkingStoryText = await callAgentAPI(agent5Prompt, storedApiKey, storedModelId, "Agent 5: Cleaner");
            
            latestGeneratedStoryText = currentWorkingStoryText.trim();

            const agent6DataObject = { storyText: latestGeneratedStoryText };
            const agent6Prompt = constructAgentPrompt(PROMPT_AGENT_6_TITLER_TEMPLATE, agent6DataObject);
            displayLoading(true, "Step 6/6: Generating title...");
            const agent6Output_Title = await callAgentAPI(agent6Prompt, storedApiKey, storedModelId, "Agent 6: Titler");

            latestGeneratedStoryTitle = agent6Output_Title.trim();

            displayOutput(latestGeneratedStoryTitle, latestGeneratedStoryText); 

        } catch (error) {
            let userFriendlyMessage = error.message || 'An unknown error occurred during story generation.';
            if (error.message && (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("invalid gemini api key"))) {
                 userFriendlyMessage = `Invalid Gemini API Key. Please check your API Key in Settings (⚙️) and try again.`;
                 if (settingsModal && modalApiKeyInput) { settingsModal.style.display = 'block'; modalApiKeyInput.focus(); }
            } else if (error.message && error.message.includes("API Key is missing")) {
                userFriendlyMessage = `Gemini API Key is missing. Please enter it via Settings (⚙️) and try again.`;
                 if (settingsModal && modalApiKeyInput) { settingsModal.style.display = 'block'; modalApiKeyInput.focus(); }
            } else if (error.message && error.message.includes("Model not selected")) {
                 if (settingsModal && modalModelSelect) { settingsModal.style.display = 'block'; modalModelSelect.focus(); }
            }
            displayError(userFriendlyMessage);
        } finally {
            displayLoading(false);
        }
    }

    async function handleElaborateStory() {
        if (!latestGeneratedStoryText) { 
            showTemporaryStatus("No story available to elaborate. Please generate a story first.", "info");
            return;
        }

        const storedApiKey = loadFromLocalStorage(LS_API_KEY) || '';
        const storedModelId = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        const audienceStr = loadFromLocalStorage(LS_AUDIENCE) || "children";
        const selectedFrameworkKey = loadFromLocalStorage(LS_SELECTED_FRAMEWORK) || Object.keys(STORY_CRAFTING_GUIDES)[0];
        const selectedCraftGuideText = STORY_CRAFTING_GUIDES[selectedFrameworkKey];

        if (!storedApiKey) {
            displayError('Please enter your Gemini API Key in Settings (⚙️).');
            if (settingsModal && modalApiKeyInput) { settingsModal.style.display = 'block'; modalApiKeyInput.focus(); }
            return;
        }

        if (statusMessageDiv) { statusMessageDiv.textContent = ''; statusMessageDiv.className = ''; }
        displayLoading(true, `Elaborating story using ${AVAILABLE_MODELS[storedModelId]}...`);
        lastRunChatLog.push({ agentName: "User Action", type: 'elaboration-start', content: `Elaborating on story: "${latestGeneratedStoryTitle}"`, timestamp: new Date().toISOString() });
        
        let currentWorkingStoryText = latestGeneratedStoryText;

        try {
            const agent2DataObject = {
                storyText: currentWorkingStoryText, 
                audience: audienceStr,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_ELABORATOR_TEMPLATE, agent2DataObject);
            displayLoading(true, `Step 1/4 (Elaboration): Elaborating content...`);
            currentWorkingStoryText = await callAgentAPI(agent2Prompt, storedApiKey, storedModelId, "Agent 2: Elaborator (Elaboration Cycle)");

            const agent3DataObject = {
                storyText: currentWorkingStoryText,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_REVIEWER_TEMPLATE, agent3DataObject);
            displayLoading(true, `Step 2/4 (Elaboration): Reviewing elaborated story...`);
            const agent3Output_ReviewText = await callAgentAPI(agent3Prompt, storedApiKey, storedModelId, "Agent 3: Reviewer (Elaboration Cycle)");

            const agent4DataObject = {
                storyText: currentWorkingStoryText, 
                reviewText: agent3Output_ReviewText,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_POLISHER_TEMPLATE, agent4DataObject);
            displayLoading(true, `Step 3/4 (Elaboration): Polishing elaborated story...`);
            currentWorkingStoryText = await callAgentAPI(agent4Prompt, storedApiKey, storedModelId, "Agent 4: Polisher (Elaboration Cycle)");

            const agent5DataObject = {
                storyText: currentWorkingStoryText
            };
            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_CLEANER_TEMPLATE, agent5DataObject);
            displayLoading(true, `Step 4/4 (Elaboration): Cleaning elaborated story...`);
            currentWorkingStoryText = await callAgentAPI(agent5Prompt, storedApiKey, storedModelId, "Agent 5: Cleaner (Elaboration Cycle)");
            
            latestGeneratedStoryText = currentWorkingStoryText.trim();

            displayOutput(latestGeneratedStoryTitle, latestGeneratedStoryText, true);

        } catch (error) {
            let userFriendlyMessage = error.message || 'An unknown error occurred during story elaboration.';
             if (error.message && (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("invalid gemini api key"))) {
                 userFriendlyMessage = `Invalid Gemini API Key. Please check your API Key in Settings (⚙️) and try again.`;
                 if (settingsModal && modalApiKeyInput) { settingsModal.style.display = 'block'; modalApiKeyInput.focus(); }
            } else if (error.message && error.message.includes("API Key is missing")) {
                userFriendlyMessage = `Gemini API Key is missing. Please enter it via Settings (⚙️) and try again.`;
                 if (settingsModal && modalApiKeyInput) { settingsModal.style.display = 'block'; modalApiKeyInput.focus(); }
            }
            displayError(userFriendlyMessage);
        } finally {
            displayLoading(false);
        }
    }


    if (generateButton) {
        generateButton.addEventListener('click', handleGenerateStory);
    } else {
        displayError("Generate button not found. Cannot generate stories.");
    }

    if (elaborateStoryButton) {
        elaborateStoryButton.addEventListener('click', handleElaborateStory);
    } else {
        console.warn("Elaborate story button not found.");
    }
});