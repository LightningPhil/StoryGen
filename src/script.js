// --- Configuration (Constants) ---
const DEFAULT_GEMINI_MODEL_ID = "gemini-2.0-flash"; 
const AVAILABLE_MODELS = {
    "gemini-2.5-flash": "Gemini-2.5-Flash",
    "gemini-2.0-flash": "Gemini-2.0-flash",
    "gemini-1.5-flash": "Gemini-1.5-Flash"
};
const DEFAULT_MIN_API_INTERVAL_S = 5; 
const DEFAULT_TARGET_READING_AGE = 7; // Default age if not set

// --- Local Storage Keys (Constants) ---
const LS_API_KEY = 'geminiApiKey_storyCircle';
const LS_CHARACTERS = 'storyCharacters_storyCircle';
const LS_AUDIENCE = 'storyAudience_storyCircle';
const LS_SELECTED_FRAMEWORK = 'storySelectedFramework_storyCircle';
const LS_SELECTED_MODEL = 'geminiSelectedModel_storyCircle';
const LS_USE_ENGINE_SUGGESTIONS = 'useEngineSuggestions_storyCircle';
const LS_USER_SUGGESTIONS = 'userSuggestions_storyCircle';
import { LS_MIN_API_INTERVAL, LS_ADJUST_READING_AGE_ENABLED, LS_TARGET_READING_AGE, saveToLocalStorage, loadFromLocalStorage } from './localStorage.js';


// --- Imports ---
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides.js';
import {
    READING_AGE_ADJUSTMENT_TEXT_TEMPLATE, 
    PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
    PROMPT_AGENT_2_ELABORATOR_TEMPLATE,
    PROMPT_AGENT_3_REVIEWER_TEMPLATE,
    PROMPT_AGENT_4_POLISHER_TEMPLATE,
    PROMPT_AGENT_5_CLEANER_TEMPLATE,
    PROMPT_AGENT_6_TITLER_TEMPLATE,
} from './prompts/agent_prompts.js';
import { callAgentAPI } from './api.js';
import { parseCharacters, constructAgentPrompt } from './utils.js';
import { 
    initUIElements,
    displayLoading, 
    displayOutput, 
    displayError, 
    showTemporaryStatus, 
    updateFrameworkSummaryDisplay, 
    updateSuggestionsTextareaStyle 
} from './ui.js';

// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, closeSettingsModalButton, saveSettingsButton, modalModelSelect, downloadChatLogButton, minApiIntervalInput;
let copyStoryButton, saveStoryButton, elaborateStoryButton;
let useEngineSuggestionsCheckbox, userSuggestionsTextarea, adjustReadingAgeCheckbox, targetReadingAgeInput; // New targetReadingAgeInput

// --- Global State ---
let lastRunChatLog = []; 
let latestGeneratedStoryText = ""; 
let latestGeneratedStoryTitle = ""; 

// --- UI Update Functions ---
// ... (displayLoading, displayOutput, displayError, showTemporaryStatus, updateFrameworkSummaryDisplay, updateSuggestionsTextareaStyle - NO CHANGES from previous full script) ...
// Add this new UI update function
function updateTargetReadingAgeInputState() {
    if (!adjustReadingAgeCheckbox || !targetReadingAgeInput) return;
    targetReadingAgeInput.disabled = !adjustReadingAgeCheckbox.checked;
    if (adjustReadingAgeCheckbox.checked) {
        targetReadingAgeInput.classList.remove('suggestions-not-used'); // Or a generic 'disabled-look' class
        targetReadingAgeInput.classList.add('suggestions-used'); // Or an 'enabled-look' class
    } else {
        targetReadingAgeInput.classList.remove('suggestions-used');
        targetReadingAgeInput.classList.add('suggestions-not-used');
    }
}


// --- LocalStorage, Utils, API calls are now imported ---

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    modalApiKeyInput = document.getElementById('modalApiKeyInput');
    modalModelSelect = document.getElementById('modalModelSelect');
    minApiIntervalInput = document.getElementById('minApiIntervalInput'); 
    downloadChatLogButton = document.getElementById('downloadChatLogButton');
    charactersInput = document.getElementById('charactersInput');
    audienceInput = document.getElementById('audienceInput');
    useEngineSuggestionsCheckbox = document.getElementById('useEngineSuggestionsCheckbox');
    userSuggestionsTextarea = document.getElementById('userSuggestionsTextarea');
    adjustReadingAgeCheckbox = document.getElementById('adjustReadingAgeCheckbox'); 
    targetReadingAgeInput = document.getElementById('targetReadingAgeInput'); 
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

    initUIElements({
        statusMessageDiv, storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton, copyStoryButton, saveStoryButton,
        craftingFrameworkSelect, frameworkSummaryDiv, useEngineSuggestionsCheckbox, userSuggestionsTextarea
    });

    const criticalElements = { modalApiKeyInput, modalModelSelect, minApiIntervalInput, downloadChatLogButton, charactersInput, audienceInput, useEngineSuggestionsCheckbox, userSuggestionsTextarea, adjustReadingAgeCheckbox, targetReadingAgeInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv, settingsModal, settingsButton, closeSettingsModalButton, saveSettingsButton, copyStoryButton, saveStoryButton, elaborateStoryButton };
    for (const elName in criticalElements) {
        if (!criticalElements[elName]) {
            const errorMsg = `FATAL ERROR: DOM Element "${elName}" not found. UI will not function correctly. Check HTML IDs.`;
            console.error(errorMsg);
            if (statusMessageDiv) { 
                statusMessageDiv.textContent = errorMsg;
                statusMessageDiv.className = 'error';
            } else { 
                alert(errorMsg);
            }
            return; 
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

    // Reading Age Adjustment UI & Logic
    if (adjustReadingAgeCheckbox && targetReadingAgeInput) {
        const savedAdjustEnabled = loadFromLocalStorage(LS_ADJUST_READING_AGE_ENABLED);
        adjustReadingAgeCheckbox.checked = savedAdjustEnabled === 'true'; // Default false if null
        
        const savedTargetAge = loadFromLocalStorage(LS_TARGET_READING_AGE);
        targetReadingAgeInput.value = savedTargetAge || DEFAULT_TARGET_READING_AGE.toString();
        
        updateTargetReadingAgeInputState(); // Set initial disabled/enabled state

        adjustReadingAgeCheckbox.addEventListener('change', () => {
            updateTargetReadingAgeInputState();
            saveToLocalStorage(LS_ADJUST_READING_AGE_ENABLED, adjustReadingAgeCheckbox.checked.toString());
        });
        targetReadingAgeInput.addEventListener('input', () => {
            // Ensure value is within bounds (HTML min/max should handle this, but good to be safe)
            let age = parseInt(targetReadingAgeInput.value, 10);
            if (isNaN(age) || age < 3) age = 3;
            if (age > 18) age = 18;
            targetReadingAgeInput.value = age.toString(); // Correct input if out of bounds
            saveToLocalStorage(LS_TARGET_READING_AGE, targetReadingAgeInput.value);
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

    if (minApiIntervalInput) {
        minApiIntervalInput.value = loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S;
    }

    if (settingsButton && settingsModal && closeSettingsModalButton && saveSettingsButton && modalApiKeyInput && modalModelSelect && downloadChatLogButton && minApiIntervalInput) {
        settingsButton.addEventListener('click', () => {
            modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
            const savedModel = loadFromLocalStorage(LS_SELECTED_MODEL);
            modalModelSelect.value = (savedModel && AVAILABLE_MODELS[savedModel]) ? savedModel : DEFAULT_GEMINI_MODEL_ID;
            minApiIntervalInput.value = loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S;
            settingsModal.style.display = 'block';
            modalApiKeyInput.focus();
        });
        closeSettingsModalButton.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        saveSettingsButton.addEventListener('click', () => {
            saveToLocalStorage(LS_API_KEY, modalApiKeyInput.value.trim());
            saveToLocalStorage(LS_SELECTED_MODEL, modalModelSelect.value);
            const intervalValue = parseInt(minApiIntervalInput.value, 10);
            saveToLocalStorage(LS_MIN_API_INTERVAL, isNaN(intervalValue) || intervalValue < 0 ? DEFAULT_MIN_API_INTERVAL_S.toString() : intervalValue.toString());
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

    // ... (copyStoryButton, saveStoryButton, frameworkSelect listeners - NO CHANGES from previous full script) ...
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
            updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES);
        });
        updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES);
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

        if (!modalApiKeyInput || !modalModelSelect || !minApiIntervalInput || !charactersInput || !audienceInput || !craftingFrameworkSelect || !useEngineSuggestionsCheckbox || !userSuggestionsTextarea || !adjustReadingAgeCheckbox || !targetReadingAgeInput ) {
             displayError(`Cannot generate story: Critical form elements missing. Please check HTML or report issue.`);
            return;
        }

        const storedApiKey = loadFromLocalStorage(LS_API_KEY) || '';
        const storedModelId = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        const minApiIntervalSeconds = parseInt(loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString(), 10);
        const minApiIntervalMs = (isNaN(minApiIntervalSeconds) || minApiIntervalSeconds < 0 ? DEFAULT_MIN_API_INTERVAL_S : minApiIntervalSeconds) * 1000;

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

        let readingAgeNote = "";
        if (adjustReadingAgeCheckbox.checked) {
            const targetAge = targetReadingAgeInput.value || DEFAULT_TARGET_READING_AGE;
            readingAgeNote = READING_AGE_ADJUSTMENT_TEXT_TEMPLATE.replace(/\$\{targetReadingAge\}/g, targetAge.toString());
        }

        saveToLocalStorage(LS_CHARACTERS, charactersStr);
        saveToLocalStorage(LS_AUDIENCE, audienceStr);

        if (!charactersStr.trim()) { displayError('Please enter at least one character.'); if (charactersInput) charactersInput.focus(); return; }
        const parsedCharsArray = parseCharacters(charactersStr);
        if (parsedCharsArray.length === 0) { displayError('Please enter valid character descriptions.'); if (charactersInput) charactersInput.focus(); return; }
        if (!audienceStr.trim()) { displayError('Please enter the target audience.'); if (audienceInput) audienceInput.focus(); return; }
        if (!selectedCraftGuideText) { displayError('Invalid story crafting framework selected.'); if(craftingFrameworkSelect) craftingFrameworkSelect.focus(); return; }

        if (statusMessageDiv) { statusMessageDiv.textContent = ''; statusMessageDiv.className = ''; }
        displayLoading(true, `Initializing story generation...`);
        
        latestGeneratedStoryText = "";
        latestGeneratedStoryTitle = "";
        let currentWorkingStoryText = "";

        try {
            const agent1DataObject = {
                charactersList: parsedCharsArray.join(', '),
                audience: audienceStr,
                USER_SUGGESTIONS_TEXT: userProvidedSuggestionsText,
                READING_AGE_NOTE: readingAgeNote,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent1Prompt = constructAgentPrompt(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, agent1DataObject);
            displayLoading(true, `Step 1/6: Crafting initial draft...`);
            currentWorkingStoryText = await callAgentAPI(agent1Prompt, storedApiKey, storedModelId, "Agent 1: Story Crafter", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);

            const agent2DataObject = {
                storyText: currentWorkingStoryText, 
                audience: audienceStr,
                READING_AGE_NOTE: readingAgeNote,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_ELABORATOR_TEMPLATE, agent2DataObject);
            displayLoading(true, `Step 2/6: Elaborating draft...`);
            currentWorkingStoryText = await callAgentAPI(agent2Prompt, storedApiKey, storedModelId, "Agent 2: Elaborator", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);

            const agent3DataObject = { 
                storyText: currentWorkingStoryText, 
                READING_AGE_NOTE: readingAgeNote,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_REVIEWER_TEMPLATE, agent3DataObject);
            displayLoading(true, `Step 3/6: Reviewing elaborated draft...`);
            const agent3Output_ReviewText = await callAgentAPI(agent3Prompt, storedApiKey, storedModelId, "Agent 3: Reviewer", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);

            const agent4DataObject = { 
                storyText: currentWorkingStoryText, 
                reviewText: agent3Output_ReviewText, 
                READING_AGE_NOTE: readingAgeNote,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_POLISHER_TEMPLATE, agent4DataObject);
            displayLoading(true, `Step 4/6: Polishing story...`);
            currentWorkingStoryText = await callAgentAPI(agent4Prompt, storedApiKey, storedModelId, "Agent 4: Polisher", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);

            const agent5DataObject = { 
                storyText: currentWorkingStoryText
            };
            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_CLEANER_TEMPLATE, agent5DataObject);
            displayLoading(true, "Step 5/6: Cleaning story...");
            currentWorkingStoryText = await callAgentAPI(agent5Prompt, storedApiKey, storedModelId, "Agent 5: Cleaner", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);
            
            latestGeneratedStoryText = currentWorkingStoryText.trim();

            const agent6DataObject = { 
                storyText: latestGeneratedStoryText,
                READING_AGE_NOTE: readingAgeNote
            };
            const agent6Prompt = constructAgentPrompt(PROMPT_AGENT_6_TITLER_TEMPLATE, agent6DataObject);
            displayLoading(true, "Step 6/6: Generating title...");
            const agent6Output_Title = await callAgentAPI(agent6Prompt, storedApiKey, storedModelId, "Agent 6: Titler", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);

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
        const minApiIntervalSeconds = parseInt(loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString(), 10);
        const minApiIntervalMs = (isNaN(minApiIntervalSeconds) || minApiIntervalSeconds < 0 ? DEFAULT_MIN_API_INTERVAL_S : minApiIntervalSeconds) * 1000;
        
        let readingAgeNote = "";
        if (adjustReadingAgeCheckbox && adjustReadingAgeCheckbox.checked) {
            const targetAge = targetReadingAgeInput.value || DEFAULT_TARGET_READING_AGE;
            readingAgeNote = READING_AGE_ADJUSTMENT_TEXT_TEMPLATE.replace(/\$\{targetReadingAge\}/g, targetAge.toString());
        }

        if (!storedApiKey) {
            displayError('Please enter your Gemini API Key in Settings (⚙️).');
            if (settingsModal && modalApiKeyInput) { settingsModal.style.display = 'block'; modalApiKeyInput.focus(); }
            return;
        }

        if (statusMessageDiv) { statusMessageDiv.textContent = ''; statusMessageDiv.className = ''; }
        displayLoading(true, `Elaborating story...`);
        lastRunChatLog.push({ agentName: "User Action", type: 'elaboration-start', content: `Elaborating on story: "${latestGeneratedStoryTitle}"`, timestamp: new Date().toISOString() });
        
        let currentWorkingStoryText = latestGeneratedStoryText;

        try {
            const agent2DataObject = {
                storyText: currentWorkingStoryText, 
                audience: audienceStr,
                READING_AGE_NOTE: readingAgeNote,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_ELABORATOR_TEMPLATE, agent2DataObject);
            displayLoading(true, `Step 1/4 (Elaboration): Elaborating content...`);
            currentWorkingStoryText = await callAgentAPI(agent2Prompt, storedApiKey, storedModelId, "Agent 2: Elaborator (Elaboration Cycle)", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);

            const agent3DataObject = {
                storyText: currentWorkingStoryText,
                READING_AGE_NOTE: readingAgeNote,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_REVIEWER_TEMPLATE, agent3DataObject);
            displayLoading(true, `Step 2/4 (Elaboration): Reviewing elaborated story...`);
            const agent3Output_ReviewText = await callAgentAPI(agent3Prompt, storedApiKey, storedModelId, "Agent 3: Reviewer (Elaboration Cycle)", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);

            const agent4DataObject = {
                storyText: currentWorkingStoryText, 
                reviewText: agent3Output_ReviewText,
                READING_AGE_NOTE: readingAgeNote,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            };
            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_POLISHER_TEMPLATE, agent4DataObject);
            displayLoading(true, `Step 3/4 (Elaboration): Polishing elaborated story...`);
            currentWorkingStoryText = await callAgentAPI(agent4Prompt, storedApiKey, storedModelId, "Agent 4: Polisher (Elaboration Cycle)", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);

            const agent5DataObject = {
                storyText: currentWorkingStoryText
            };
            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_CLEANER_TEMPLATE, agent5DataObject);
            displayLoading(true, `Step 4/4 (Elaboration): Cleaning elaborated story...`);
            currentWorkingStoryText = await callAgentAPI(agent5Prompt, storedApiKey, storedModelId, "Agent 5: Cleaner (Elaboration Cycle)", 0, lastRunChatLog, statusMessageDiv, minApiIntervalMs);
            
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