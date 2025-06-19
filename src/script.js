// src/script.js

// --- Configuration (Constants) ---
const DEFAULT_GEMINI_MODEL_ID = "gemini-2.0-flash"; 
const AVAILABLE_MODELS = {
    "gemini-2.5-flash": "Gemini-2.5-Flash",
    "gemini-2.0-flash": "Gemini-2.0-flash",
    "gemini-1.5-flash": "Gemini-1.5-Flash"
};
const DEFAULT_MIN_API_INTERVAL_S = 5; 
const DEFAULT_READING_AGE_MIN = 5; 
const DEFAULT_READING_AGE_MAX = 12; 
const DEFAULT_TARGET_READING_AGE = 7; 

// --- Local Storage Keys (Constants) ---
import { 
    LS_API_KEY, LS_CHARACTERS, LS_AUDIENCE, LS_SELECTED_FRAMEWORK, LS_SELECTED_MODEL,
    LS_USE_ENGINE_SUGGESTIONS, LS_USER_SUGGESTIONS, LS_MIN_API_INTERVAL, 
    LS_ADJUST_READING_AGE_ENABLED, LS_TARGET_READING_AGE, 
    LS_READING_AGE_MIN, LS_READING_AGE_MAX, 
    saveToLocalStorage, loadFromLocalStorage 
} from './localStorage.js';

// --- Imports from Modules ---
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
    updateStatusInStoryOutput, 
    clearStoryOutput, 
    displayFinalStoryOutput, 
    displayErrorInStoryOutput, 
    showTemporaryToast, 
    updateFrameworkSummaryDisplay, 
    updateSuggestionsTextareaStyle,
    disableMainControls, 
    enableMainControls,
    setLatestStoryTextForUI // For ui.js to access latestGeneratedStoryText if needed by enableMainControls
} from './ui.js';

// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, cancelSettingsButton, saveSettingsButton, modalModelSelect, downloadChatLogButton, minApiIntervalInput;
let copyStoryButton, saveStoryButton, elaborateStoryButton;
let useEngineSuggestionsCheckbox, userSuggestionsTextarea;
let enableReadingAgeAdjustmentCheckbox, targetReadingAgeSlider, targetReadingAgeValueDisplay, readingAgeSliderContainer; 
let readingAgeMinInput, readingAgeMaxInput; 

// --- Global State ---
let lastRunChatLog = []; 
let latestGeneratedStoryText = ""; 
let latestGeneratedStoryTitle = ""; 

function updateTargetReadingAgeSliderDOMState() {
    if (!targetReadingAgeSlider || !readingAgeMinInput || !readingAgeMaxInput || !targetReadingAgeValueDisplay || !enableReadingAgeAdjustmentCheckbox || !readingAgeSliderContainer) return;
    const minAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString(), 10);
    const maxAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString(), 10);
    targetReadingAgeSlider.min = minAge.toString();
    targetReadingAgeSlider.max = maxAge.toString();
    let currentValue = parseInt(targetReadingAgeSlider.value, 10);
    if (isNaN(currentValue) || currentValue < minAge) currentValue = minAge;
    if (currentValue > maxAge) currentValue = maxAge;
    targetReadingAgeSlider.value = currentValue.toString();
    if (targetReadingAgeValueDisplay) targetReadingAgeValueDisplay.textContent = currentValue.toString();
    const isEnabled = enableReadingAgeAdjustmentCheckbox.checked;
    targetReadingAgeSlider.disabled = !isEnabled;
    readingAgeSliderContainer.classList.toggle('disabled', !isEnabled);
}

document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM Element Variables
    modalApiKeyInput = document.getElementById('modalApiKeyInput');
    modalModelSelect = document.getElementById('modalModelSelect');
    minApiIntervalInput = document.getElementById('minApiIntervalInput'); 
    readingAgeMinInput = document.getElementById('readingAgeMinInput'); 
    readingAgeMaxInput = document.getElementById('readingAgeMaxInput'); 
    downloadChatLogButton = document.getElementById('downloadChatLogButton');
    charactersInput = document.getElementById('charactersInput');
    audienceInput = document.getElementById('audienceInput');
    useEngineSuggestionsCheckbox = document.getElementById('useEngineSuggestionsCheckbox');
    userSuggestionsTextarea = document.getElementById('userSuggestionsTextarea');
    enableReadingAgeAdjustmentCheckbox = document.getElementById('enableReadingAgeAdjustmentCheckbox'); 
    targetReadingAgeSlider = document.getElementById('targetReadingAgeSlider'); 
    targetReadingAgeValueDisplay = document.getElementById('targetReadingAgeValue'); 
    readingAgeSliderContainer = document.getElementById('readingAgeSliderContainer'); 
    craftingFrameworkSelect = document.getElementById('craftingFrameworkSelect');
    frameworkSummaryDiv = document.getElementById('frameworkSummary');
    generateButton = document.getElementById('generateButton');
    storyTitleDiv = document.getElementById('storyTitle');
    storyOutputDiv = document.getElementById('storyOutput');
    copyStoryButton = document.getElementById('copyStoryButton');
    saveStoryButton = document.getElementById('saveStoryButton');
    elaborateStoryButton = document.getElementById('elaborateStoryButton');
    settingsModal = document.getElementById('settingsModal');
    settingsButton = document.getElementById('settingsButton');
    cancelSettingsButton = document.getElementById('cancelSettingsButton');
    saveSettingsButton = document.getElementById('saveSettingsButton');

    initUIElements({
        storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton, copyStoryButton, saveStoryButton,
        craftingFrameworkSelect, frameworkSummaryDiv, useEngineSuggestionsCheckbox, userSuggestionsTextarea
    });

    // Critical Element Check... (as before)
    
    // Initial UI State
    if (copyStoryButton) copyStoryButton.style.display = 'none';
    if (saveStoryButton) saveStoryButton.style.display = 'none';
    if (elaborateStoryButton) elaborateStoryButton.style.display = 'none';
    if (storyOutputDiv) storyOutputDiv.textContent = 'Welcome! Describe your characters, choose an audience and a story framework, then click "Generate Story".\n\nConfigure your Gemini API Key and Model in Settings (⚙️ icon in the top right).';

    // Event Listeners & UI Setup
    if (useEngineSuggestionsCheckbox && userSuggestionsTextarea) { /* ... as before ... */ }
    if (enableReadingAgeAdjustmentCheckbox && targetReadingAgeSlider && targetReadingAgeValueDisplay && readingAgeSliderContainer) { /* ... as before ... */ }
    if (modalModelSelect) { /* ... as before ... */ }
    if (modalApiKeyInput) { /* ... as before ... */ }
    if (minApiIntervalInput) { /* ... as before ... */ }
    if (readingAgeMinInput) { /* ... as before ... */ }
    if (readingAgeMaxInput) { /* ... as before ... */ }
    if (settingsButton && settingsModal && saveSettingsButton && cancelSettingsButton /* ... */) { /* ... settings modal logic as before ... */ }
    if (copyStoryButton && storyOutputDiv) { /* ... as before ... */ }
    if (saveStoryButton && storyOutputDiv && storyTitleDiv) { /* ... as before ... */ }
    if (craftingFrameworkSelect) { /* ... as before, ensure updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES) is called ... */ }
    if (charactersInput) { /* ... as before ... */ }
    if (audienceInput) { /* ... as before ... */ }


    // --- Story Generation Pipelines ---
    async function handleGenerateStory() {
        lastRunChatLog = []; 
        clearStoryOutput(); // Clear output area for new log
        disableMainControls(); // Pass generateButton, elaborateStoryButton if not global
        setLatestStoryTextForUI(""); // Update UI module's internal state

        // ... (declarations: storedApiKey, storedModelId, minApiIntervalMs, etc. as before) ...
        const storedApiKey = loadFromLocalStorage(LS_API_KEY) || '';
        const storedModelId = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        const minApiIntervalSeconds = parseInt(loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString(), 10);
        const minApiIntervalMs = (isNaN(minApiIntervalSeconds) || minApiIntervalSeconds < 0 ? DEFAULT_MIN_API_INTERVAL_S : minApiIntervalSeconds) * 1000;


        // ... (validations: apiKey, model, form inputs as before) ...

        let userProvidedSuggestionsText = "";
        // ... (get suggestions logic as before) ...
        
        let readingAgeNote = "";
        if (enableReadingAgeAdjustmentCheckbox.checked) { 
            const targetAge = targetReadingAgeSlider.value || DEFAULT_TARGET_READING_AGE;
            readingAgeNote = READING_AGE_ADJUSTMENT_TEXT_TEMPLATE.replace(/\$\{targetReadingAge\}/g, targetAge.toString());
        }
        
        // ... (save inputs to LS, more validations as before) ...

        updateStatusInStoryOutput(`Initialising story generation...\n`);
        
        latestGeneratedStoryText = ""; // Reset global state
        latestGeneratedStoryTitle = "";
        let currentWorkingStoryText = "";

        try {
            const agent1DataObject = { charactersList: parseCharacters(charactersInput.value).join(', '), audience: audienceInput.value, USER_SUGGESTIONS_TEXT: userProvidedSuggestionsText, READING_AGE_NOTE: readingAgeNote, CRAFT_GUIDE_TEXT: STORY_CRAFTING_GUIDES[craftingFrameworkSelect.value] };
            const agent1Prompt = constructAgentPrompt(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, agent1DataObject);
            updateStatusInStoryOutput(`Step 1/6: Crafting initial draft...\n`);
            currentWorkingStoryText = await callAgentAPI(agent1Prompt, storedApiKey, storedModelId, "Agent 1: Story Crafter", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);

            updateStatusInStoryOutput(`Step 2/6: Elaborating draft...\n`);
            const agent2DataObject = { storyText: currentWorkingStoryText, audience: audienceInput.value, READING_AGE_NOTE: readingAgeNote, CRAFT_GUIDE_TEXT: STORY_CRAFTING_GUIDES[craftingFrameworkSelect.value] };
            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_ELABORATOR_TEMPLATE, agent2DataObject);
            currentWorkingStoryText = await callAgentAPI(agent2Prompt, storedApiKey, storedModelId, "Agent 2: Elaborator", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);

            updateStatusInStoryOutput(`Step 3/6: Reviewing elaborated draft...\n`);
            const agent3DataObject = { storyText: currentWorkingStoryText, READING_AGE_NOTE: readingAgeNote, CRAFT_GUIDE_TEXT: STORY_CRAFTING_GUIDES[craftingFrameworkSelect.value] };
            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_REVIEWER_TEMPLATE, agent3DataObject);
            const agent3Output_ReviewText = await callAgentAPI(agent3Prompt, storedApiKey, storedModelId, "Agent 3: Reviewer", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);

            updateStatusInStoryOutput(`Step 4/6: Polishing story...\n`);
            const agent4DataObject = { storyText: currentWorkingStoryText, reviewText: agent3Output_ReviewText, READING_AGE_NOTE: readingAgeNote, CRAFT_GUIDE_TEXT: STORY_CRAFTING_GUIDES[craftingFrameworkSelect.value] };
            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_POLISHER_TEMPLATE, agent4DataObject);
            currentWorkingStoryText = await callAgentAPI(agent4Prompt, storedApiKey, storedModelId, "Agent 4: Polisher", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);

            updateStatusInStoryOutput("Step 5/6: Cleaning story...\n");
            const agent5DataObject = { storyText: currentWorkingStoryText };
            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_CLEANER_TEMPLATE, agent5DataObject);
            currentWorkingStoryText = await callAgentAPI(agent5Prompt, storedApiKey, storedModelId, "Agent 5: Cleaner", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);
            
            latestGeneratedStoryText = currentWorkingStoryText.trim();
            setLatestStoryTextForUI(latestGeneratedStoryText); // Update ui.js internal state

            updateStatusInStoryOutput("Step 6/6: Generating title...\n");
            const agent6DataObject = { storyText: latestGeneratedStoryText, READING_AGE_NOTE: readingAgeNote };
            const agent6Prompt = constructAgentPrompt(PROMPT_AGENT_6_TITLER_TEMPLATE, agent6DataObject);
            const agent6Output_Title = await callAgentAPI(agent6Prompt, storedApiKey, storedModelId, "Agent 6: Titler", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);

            latestGeneratedStoryTitle = agent6Output_Title.trim();
            
            updateStatusInStoryOutput("Story generation complete!\n", true);
            displayFinalStoryOutput(latestGeneratedStoryTitle, latestGeneratedStoryText); 

        } catch (error) {
            displayErrorInStoryOutput(`Error during story generation: ${error.message}`);
        } finally {
            enableMainControls(); // Pass generateButton, elaborateStoryButton if not global
        }
    }

    async function handleElaborateStory() {
        if (!latestGeneratedStoryText) { 
            showTemporaryToast("No story available to elaborate. Please generate a story first.", "info");
            return;
        }
        // ... (ensure UI elements exist for reading age if needed) ...
        disableMainControls();
        setLatestStoryTextForUI(latestGeneratedStoryText); 
        updateStatusInStoryOutput(`Starting elaboration...\n`);

        // ... (get API key, model, audience, framework, interval, readingAgeNote - as before) ...
        const storedApiKey = loadFromLocalStorage(LS_API_KEY) || '';
        const storedModelId = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        const audienceStr = loadFromLocalStorage(LS_AUDIENCE) || "children";
        const selectedFrameworkKey = loadFromLocalStorage(LS_SELECTED_FRAMEWORK) || Object.keys(STORY_CRAFTING_GUIDES)[0];
        const selectedCraftGuideText = STORY_CRAFTING_GUIDES[selectedFrameworkKey];
        const minApiIntervalSeconds = parseInt(loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString(), 10);
        const minApiIntervalMs = (isNaN(minApiIntervalSeconds) || minApiIntervalSeconds < 0 ? DEFAULT_MIN_API_INTERVAL_S : minApiIntervalSeconds) * 1000;
        
        let readingAgeNote = "";
        if (enableReadingAgeAdjustmentCheckbox.checked) { 
            const targetAge = targetReadingAgeSlider.value || DEFAULT_TARGET_READING_AGE;
            readingAgeNote = READING_AGE_ADJUSTMENT_TEXT_TEMPLATE.replace(/\$\{targetReadingAge\}/g, targetAge.toString());
        }

        // ... (API key validation as before) ...

        lastRunChatLog.push({ agentName: "User Action", type: 'elaboration-start', /* ... */ });
        let currentWorkingStoryText = latestGeneratedStoryText;

        try {
            updateStatusInStoryOutput(`Step 1/4 (Elaboration): Elaborating content...\n`);
            const agent2DataObject = { storyText: currentWorkingStoryText, audience: audienceStr, READING_AGE_NOTE: readingAgeNote, CRAFT_GUIDE_TEXT: selectedCraftGuideText };
            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_ELABORATOR_TEMPLATE, agent2DataObject);
            currentWorkingStoryText = await callAgentAPI(agent2Prompt, storedApiKey, storedModelId, "Agent 2: Elaborator (Elaboration Cycle)", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);

            updateStatusInStoryOutput(`Step 2/4 (Elaboration): Reviewing elaborated story...\n`);
            const agent3DataObject = { storyText: currentWorkingStoryText, READING_AGE_NOTE: readingAgeNote, CRAFT_GUIDE_TEXT: selectedCraftGuideText };
            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_REVIEWER_TEMPLATE, agent3DataObject);
            const agent3Output_ReviewText = await callAgentAPI(agent3Prompt, storedApiKey, storedModelId, "Agent 3: Reviewer (Elaboration Cycle)", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);

            updateStatusInStoryOutput(`Step 3/4 (Elaboration): Polishing elaborated story...\n`);
            const agent4DataObject = { storyText: currentWorkingStoryText, reviewText: agent3Output_ReviewText, READING_AGE_NOTE: readingAgeNote, CRAFT_GUIDE_TEXT: selectedCraftGuideText };
            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_POLISHER_TEMPLATE, agent4DataObject);
            currentWorkingStoryText = await callAgentAPI(agent4Prompt, storedApiKey, storedModelId, "Agent 4: Polisher (Elaboration Cycle)", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);

            updateStatusInStoryOutput(`Step 4/4 (Elaboration): Cleaning elaborated story...\n`);
            const agent5DataObject = { storyText: currentWorkingStoryText };
            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_CLEANER_TEMPLATE, agent5DataObject);
            currentWorkingStoryText = await callAgentAPI(agent5Prompt, storedApiKey, storedModelId, "Agent 5: Cleaner (Elaboration Cycle)", 0, lastRunChatLog, storyOutputDiv, minApiIntervalMs);
            
            latestGeneratedStoryText = currentWorkingStoryText.trim();
            setLatestStoryTextForUI(latestGeneratedStoryText);
            
            updateStatusInStoryOutput("Story elaboration complete!\n", true);
            displayFinalStoryOutput(latestGeneratedStoryTitle, latestGeneratedStoryText, true);

        } catch (error) {
            displayErrorInStoryOutput(`Error during story elaboration: ${error.message}`);
        } finally {
            enableMainControls();
        }
    }

    if (generateButton) generateButton.addEventListener('click', handleGenerateStory);
    if (elaborateStoryButton) elaborateStoryButton.addEventListener('click', handleElaborateStory);
});