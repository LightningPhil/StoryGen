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

// --- Imports ---
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides.js';
import {
    PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
    PROMPT_AGENT_2_REVIEWER_TEMPLATE,
    PROMPT_AGENT_3_POLISHER_TEMPLATE,
    PROMPT_AGENT_4_CLEANER_TEMPLATE,
    PROMPT_AGENT_5_TITLER_TEMPLATE,
} from './prompts/agent_prompts.js';

// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, closeSettingsModalButton, saveSettingsButton, modalModelSelect, downloadChatLogButton;
let copyStoryButton, saveStoryButton; // New buttons for story actions

// --- Global State ---
let lastRunChatLog = []; // To store prompts and responses for download

// --- UI Update Functions ---
function displayLoading(isLoading, message = '') {
    if (isLoading) {
        if (statusMessageDiv) {
            statusMessageDiv.textContent = message || 'Processing...';
            statusMessageDiv.className = 'loading';
        }
        if (storyTitleDiv) storyTitleDiv.textContent = '';
        if (storyOutputDiv) storyOutputDiv.textContent = 'Your story will appear here...';
        if (generateButton) generateButton.disabled = true;
        if (copyStoryButton) copyStoryButton.style.display = 'none'; // Hide story actions
        if (saveStoryButton) saveStoryButton.style.display = 'none';
    } else {
        if (statusMessageDiv && statusMessageDiv.classList.contains('loading')) {
            statusMessageDiv.textContent = ''; // Clear message on completion, success/error will set new one
            statusMessageDiv.className = '';
        }
        if (generateButton) generateButton.disabled = false;
        // Story actions visibility handled by displayOutput
    }
}

function displayOutput(title, storyText) {
    if (storyTitleDiv) storyTitleDiv.textContent = title;
    if (storyOutputDiv) storyOutputDiv.textContent = storyText;
    if (statusMessageDiv) {
        statusMessageDiv.textContent = 'Story generated successfully!';
        statusMessageDiv.className = 'success';
        setTimeout(() => {
            if (statusMessageDiv && statusMessageDiv.classList.contains('success') && statusMessageDiv.textContent === 'Story generated successfully!') {
                statusMessageDiv.textContent = '';
                statusMessageDiv.className = '';
            }
        }, 4000);
    }
    // Show story action buttons
    if (copyStoryButton) copyStoryButton.style.display = 'inline-block';
    if (saveStoryButton) saveStoryButton.style.display = 'inline-block';
}

function displayError(errorMessage) {
    if (statusMessageDiv) {
        statusMessageDiv.textContent = `Error: ${errorMessage}`;
        statusMessageDiv.className = 'error';
    }
    if (storyTitleDiv) storyTitleDiv.textContent = '';
    // Hide story actions on error
    if (copyStoryButton) copyStoryButton.style.display = 'none';
    if (saveStoryButton) saveStoryButton.style.display = 'none';
    console.error("Pipeline Error Details:", errorMessage);
}

function showTemporaryStatus(message, type = 'info', duration = 3000) {
    if (statusMessageDiv) {
        statusMessageDiv.textContent = message;
        statusMessageDiv.className = type; // 'success', 'error', or a generic 'info' if styled
        setTimeout(() => {
            // Clear only if the message hasn't been replaced by a newer status
            if (statusMessageDiv.textContent === message) {
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

// --- Local Storage Helper Functions ---
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

// --- Helper Functions ---
function parseCharacters(characterString) {
    if (!characterString) return [];
    return characterString.split(',').map(char => char.trim()).filter(char => char.length > 0);
}

function constructAgentPrompt(basePromptTemplate, dataObject) {
    let prompt = basePromptTemplate;
    for (const key in dataObject) {
        const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
        prompt = prompt.replace(placeholder, dataObject[key]);
    }
    return prompt;
}

// --- Gemini API Call Function ---
async function callAgentAPI(prompt, currentApiKey, selectedModelId, agentName = "Agent") { // Added agentName
    if (!currentApiKey) {
        console.error("API Key is missing in callAgentAPI");
        throw new Error("Gemini API Key is missing. Please enter it via Settings (⚙️) and try again.");
    }
    if (!selectedModelId) {
        console.error("Gemini Model ID is missing in callAgentAPI");
        throw new Error("Gemini Model not selected. Please select a model in Settings (⚙️).");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:generateContent?key=${currentApiKey}`;
    
    console.log(`Calling ${agentName} with model ${selectedModelId}. Prompt starts with: "${prompt.substring(0,100)}..."`);
    // Log prompt for chat log
    lastRunChatLog.push({ agentName, type: 'prompt', content: prompt, timestamp: new Date().toISOString() });


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
            // Log error response for chat log
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
        // Log successful response for chat log
        lastRunChatLog.push({ agentName, type: 'response', content: rawTextOutput, timestamp: new Date().toISOString() });
        console.log(`${agentName} raw output from model ${selectedModelId} starts with: "${rawTextOutput.substring(0,100)}..."`);
        return rawTextOutput;

    } catch (error) {
        console.error(`Error in callAgentAPI with model ${selectedModelId} for ${agentName}:`, error);
        // Ensure error is logged if not caught above
        if (!lastRunChatLog.find(log => log.agentName === agentName && log.type.includes('error'))) {
            lastRunChatLog.push({ agentName, type: 'general-error', content: error.message, timestamp: new Date().toISOString() });
        }
        throw error instanceof Error ? error : new Error(String(error.message || `An unknown network or API error occurred with model ${selectedModelId}.`));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    modalApiKeyInput = document.getElementById('modalApiKeyInput');
    modalModelSelect = document.getElementById('modalModelSelect');
    downloadChatLogButton = document.getElementById('downloadChatLogButton'); // New
    charactersInput = document.getElementById('charactersInput');
    audienceInput = document.getElementById('audienceInput');
    craftingFrameworkSelect = document.getElementById('craftingFrameworkSelect');
    frameworkSummaryDiv = document.getElementById('frameworkSummary');
    generateButton = document.getElementById('generateButton');
    statusMessageDiv = document.getElementById('statusMessage');
    storyTitleDiv = document.getElementById('storyTitle');
    storyOutputDiv = document.getElementById('storyOutput');
    copyStoryButton = document.getElementById('copyStoryButton'); // New
    saveStoryButton = document.getElementById('saveStoryButton'); // New


    settingsModal = document.getElementById('settingsModal');
    settingsButton = document.getElementById('settingsButton');
    closeSettingsModalButton = document.getElementById('closeSettingsModal');
    saveSettingsButton = document.getElementById('saveSettingsButton');

    // --- Initial UI Setup & Event Listeners ---
    const criticalElements = { modalApiKeyInput, modalModelSelect, downloadChatLogButton, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv, settingsModal, settingsButton, closeSettingsModalButton, saveSettingsButton, copyStoryButton, saveStoryButton };
    for (const elName in criticalElements) {
        if (!criticalElements[elName]) {
            console.error(`Error: ${elName} element not found in HTML! UI may not function correctly.`);
        }
    }
    
    // Hide story actions initially
    if (copyStoryButton) copyStoryButton.style.display = 'none';
    if (saveStoryButton) saveStoryButton.style.display = 'none';

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
            const storyText = storyOutputDiv.textContent;
            if (storyText && storyText !== 'Your story will appear here...') {
                navigator.clipboard.writeText(storyText).then(() => {
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
            const storyText = storyOutputDiv.textContent;
            const storyTitleText = storyTitleDiv.textContent || 'Untitled Story';
            if (storyText && storyText !== 'Your story will appear here...') {
                const blob = new Blob([`Title: ${storyTitleText}\n\n${storyText}`], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Sanitize title for filename
                const safeTitle = storyTitleText.replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '_');
                a.download = `${safeTitle}.txt`;
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
        lastRunChatLog = []; // Clear previous log at the start of a new generation

        if (!modalApiKeyInput || !modalModelSelect || !charactersInput || !audienceInput || !craftingFrameworkSelect) {
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

        saveToLocalStorage(LS_CHARACTERS, charactersStr);
        saveToLocalStorage(LS_AUDIENCE, audienceStr);

        if (!charactersStr.trim()) { displayError('Please enter at least one character.'); if (charactersInput) charactersInput.focus(); return; }
        const parsedCharsArray = parseCharacters(charactersStr);
        if (parsedCharsArray.length === 0) { displayError('Please enter valid character descriptions.'); if (charactersInput) charactersInput.focus(); return; }
        if (!audienceStr.trim()) { displayError('Please enter the target audience.'); if (audienceInput) audienceInput.focus(); return; }
        if (!selectedCraftGuideText) { displayError('Invalid story crafting framework selected.'); if(craftingFrameworkSelect) craftingFrameworkSelect.focus(); return; }

        if (statusMessageDiv) { statusMessageDiv.textContent = ''; statusMessageDiv.className = ''; }
        displayLoading(true, `Initializing story generation with ${selectedFrameworkKey} using ${AVAILABLE_MODELS[storedModelId]}...`);

        try {
            const agent1Prompt = constructAgentPrompt(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, { charactersList: parsedCharsArray.join(', '), audience: audienceStr, CRAFT_GUIDE_TEXT: selectedCraftGuideText });
            displayLoading(true, `Step 1/5: Crafting draft...`);
            const agent1Output_FullText = await callAgentAPI(agent1Prompt, storedApiKey, storedModelId, "Agent 1: Story Crafter");

            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_REVIEWER_TEMPLATE, { storyText: agent1Output_FullText, CRAFT_GUIDE_TEXT: selectedCraftGuideText });
            displayLoading(true, `Step 2/5: Reviewing draft...`);
            const agent2Output_ReviewText = await callAgentAPI(agent2Prompt, storedApiKey, storedModelId, "Agent 2: Story Reviewer");

            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_POLISHER_TEMPLATE, { draftText: agent1Output_FullText, reviewText: agent2Output_ReviewText, CRAFT_GUIDE_TEXT: selectedCraftGuideText });
            displayLoading(true, `Step 3/5: Polishing story...`);
            const agent3Output_Story = await callAgentAPI(agent3Prompt, storedApiKey, storedModelId, "Agent 3: Story Polisher");

            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_CLEANER_TEMPLATE, { storyText: agent3Output_Story });
            displayLoading(true, "Step 4/5: Cleaning story...");
            const agent4Output_CleanStory = await callAgentAPI(agent4Prompt, storedApiKey, storedModelId, "Agent 4: Story Cleaner");

            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_TITLER_TEMPLATE, { storyText: agent4Output_CleanStory });
            displayLoading(true, "Step 5/5: Generating title...");
            const agent5Output_Title = await callAgentAPI(agent5Prompt, storedApiKey, storedModelId, "Agent 5: Title Generator");

            displayOutput(agent5Output_Title.trim(), agent4Output_CleanStory.trim()); 

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

    if (generateButton) {
        generateButton.addEventListener('click', handleGenerateStory);
    } else {
        displayError("Generate button not found. Cannot generate stories.");
    }
});