// src/script.js

// --- Configuration (Constants) ---
const DEFAULT_GEMINI_MODEL_ID = "gemini-3-flash-preview"; 
const AVAILABLE_MODELS = { 
    "gemini-3-flash-preview": { name: "Gemini-3-Flash-Preview", supportsThinking: true },
    "gemini-2.5-flash": { name: "Gemini-2.5-Flash", supportsThinking: true }
};
const DEFAULT_MIN_API_INTERVAL_S = 5; 
const DEFAULT_READING_AGE_MIN = 5; 
const DEFAULT_READING_AGE_MAX = 12; 
const DEFAULT_TARGET_READING_AGE = 7; 

const STORY_FONT_SIZE_STEP = 0.1; 
const MIN_STORY_FONT_SIZE_REM = 0.7;
const MAX_STORY_FONT_SIZE_REM = 2.0;
const DEFAULT_STORY_FONT_SIZE_REM = 1.0; 

// --- Local Storage Keys (Constants) ---
import { 
    LS_API_KEY, LS_CHARACTERS, LS_AUDIENCE, LS_SELECTED_FRAMEWORK, LS_SELECTED_MODEL,
    LS_USE_ENGINE_SUGGESTIONS, LS_USER_SUGGESTIONS, LS_MIN_API_INTERVAL, 
    LS_ADJUST_READING_AGE_ENABLED, LS_TARGET_READING_AGE, 
    LS_READING_AGE_MIN, LS_READING_AGE_MAX, LS_ENABLE_CONSOLIDATOR,
    LS_SELECTED_AUTHOR_STYLE, LS_ADJUSTMENT_TONE, LS_ADJUSTMENT_PACING,
    LS_ADJUSTMENT_HUMOR, LS_ADJUSTMENT_EMOTION,
    LS_THINKING_AGENT_1_CRAFTER, LS_THINKING_AGENT_2_ELABORATOR, LS_THINKING_AGENT_3_REVIEWER,
    LS_THINKING_AGENT_4_POLISHER, LS_THINKING_AGENT_5_CLEANER, LS_THINKING_AGENT_6_TITLER,
    LS_THINKING_AGENT_C_CONSOLIDATOR,
    saveToLocalStorage, loadFromLocalStorage 
} from './localStorage.js';

// --- Imports from Modules ---
import appState, { BEDTIME_MODE_PRESET } from './appState.js'; 
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides.js';
import { STORY_STYLE_GUIDES, STORY_STYLE_SUMMARIES } from './prompts/author_styles.js';
import { ADJUSTMENT_MODULES } from './prompts/adjustment_modules.js';
import { READING_AGE_ADJUSTMENT_TEXT_TEMPLATE } from './prompts/agent_prompts.js';
import { parseCharacters, countWords } from './utils.js'; 
import { 
    initUIElements,
    updateStatusInStoryOutput, 
    clearStoryOutput, 
    displayFinalStoryOutput, 
    displayErrorInStoryOutput, 
    showTemporaryToast, 
    updateFrameworkSummaryDisplay, 
    updateAuthorStyleSummaryDisplay,
    updateSuggestionsTextareaStyle,
    disableMainControls, 
    enableMainControls,
    applyStoryFontSize,
    populateDropdown
} from './ui.js';
// --- New Pipeline Module Import ---
import { runPipeline, getStoryGenerationPipelineConfig, getElaborationPipelineConfig } from './pipeline.js';

// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, cancelSettingsButton, saveSettingsButton, modalModelSelect, downloadChatLogButton, minApiIntervalInput;
let copyStoryButton, saveStoryButton, elaborateStoryButton, decreaseFontButton, increaseFontButton; 
let useEngineSuggestionsCheckbox, userSuggestionsTextarea;
let enableReadingAgeAdjustmentCheckbox, targetReadingAgeSlider, readingAgeSliderContainer; 
let readingAgeMinInput, readingAgeMaxInput; 
let enableConsolidatorCheckbox;
let authorStyleSelect, styleSummaryDiv, adjustmentsButton, adjustmentsModal, cancelAdjustmentsButton, saveAdjustmentsButton;
let toneSelect, pacingSelect, humorSelect, emotionSelect;
let agentTogglesContainer, agent1CrafterToggle, agent2ElaboratorToggle, agent3ReviewerToggle, agent4PolisherToggle, agent5CleanerToggle, agent6TitlerToggle, agentCConsolidatorToggle;
let bedtimeModeToggle;

// --- Application State for Font Size ---
let currentStoryFontSizeRem = DEFAULT_STORY_FONT_SIZE_REM;


// --- UI Helper Functions ---
function updateTargetReadingAgeSliderDOMState() {
    if (!targetReadingAgeSlider || !readingAgeMinInput || !readingAgeMaxInput || !enableReadingAgeAdjustmentCheckbox || !readingAgeSliderContainer) return;
    
    const minAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString(), 10);
    const maxAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString(), 10);
    
    targetReadingAgeSlider.min = minAge.toString();
    targetReadingAgeSlider.max = maxAge.toString();
    
    let currentValue = parseInt(targetReadingAgeSlider.value, 10);
    if (isNaN(currentValue) || currentValue < minAge) currentValue = minAge;
    if (currentValue > maxAge) currentValue = maxAge;
    targetReadingAgeSlider.value = currentValue.toString();
        
    const isEnabled = enableReadingAgeAdjustmentCheckbox.checked;
    targetReadingAgeSlider.disabled = !isEnabled;
    readingAgeSliderContainer.classList.toggle('disabled', !isEnabled);
}

function updateAgentTogglesUI() {
    if (!modalModelSelect || !agentTogglesContainer) return;
    const selectedModelId = modalModelSelect.value;
    const model = AVAILABLE_MODELS[selectedModelId];
    const canThink = model ? model.supportsThinking : false;

    agentTogglesContainer.classList.toggle('disabled', !canThink);
}

// Bedtime Mode activation function
function activateBedtimeMode() {
    // Apply framework
    if (craftingFrameworkSelect && STORY_CRAFTING_GUIDES[BEDTIME_MODE_PRESET.framework]) {
        craftingFrameworkSelect.value = BEDTIME_MODE_PRESET.framework;
        saveToLocalStorage(LS_SELECTED_FRAMEWORK, BEDTIME_MODE_PRESET.framework);
        updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES);
    }
    
    // Apply author style
    if (authorStyleSelect && STORY_STYLE_GUIDES[BEDTIME_MODE_PRESET.authorStyle]) {
        authorStyleSelect.value = BEDTIME_MODE_PRESET.authorStyle;
        saveToLocalStorage(LS_SELECTED_AUTHOR_STYLE, BEDTIME_MODE_PRESET.authorStyle);
        updateAuthorStyleSummaryDisplay(STORY_STYLE_SUMMARIES);
    }
    
    // Apply adjustments (tone, pacing, humor, emotion)
    if (toneSelect) {
        toneSelect.value = BEDTIME_MODE_PRESET.adjustments.tone;
        saveToLocalStorage(LS_ADJUSTMENT_TONE, BEDTIME_MODE_PRESET.adjustments.tone);
    }
    if (pacingSelect) {
        pacingSelect.value = BEDTIME_MODE_PRESET.adjustments.pacing;
        saveToLocalStorage(LS_ADJUSTMENT_PACING, BEDTIME_MODE_PRESET.adjustments.pacing);
    }
    if (humorSelect) {
        humorSelect.value = BEDTIME_MODE_PRESET.adjustments.humor;
        saveToLocalStorage(LS_ADJUSTMENT_HUMOR, BEDTIME_MODE_PRESET.adjustments.humor);
    }
    if (emotionSelect) {
        emotionSelect.value = BEDTIME_MODE_PRESET.adjustments.emotion;
        saveToLocalStorage(LS_ADJUSTMENT_EMOTION, BEDTIME_MODE_PRESET.adjustments.emotion);
    }
    
    // Apply consolidator setting
    if (enableConsolidatorCheckbox) {
        enableConsolidatorCheckbox.checked = BEDTIME_MODE_PRESET.consolidator;
        saveToLocalStorage(LS_ENABLE_CONSOLIDATOR, BEDTIME_MODE_PRESET.consolidator.toString());
    }
    
    // Apply reading age setting
    if (enableReadingAgeAdjustmentCheckbox && targetReadingAgeSlider) {
        enableReadingAgeAdjustmentCheckbox.checked = true;
        saveToLocalStorage(LS_ADJUST_READING_AGE_ENABLED, 'true');
        targetReadingAgeSlider.value = BEDTIME_MODE_PRESET.readingAge.toString();
        saveToLocalStorage(LS_TARGET_READING_AGE, BEDTIME_MODE_PRESET.readingAge.toString());
        updateTargetReadingAgeSliderDOMState();
    }
    
    // Apply engine suggestions setting
    if (useEngineSuggestionsCheckbox) {
        useEngineSuggestionsCheckbox.checked = BEDTIME_MODE_PRESET.useEngineSuggestions;
        saveToLocalStorage(LS_USE_ENGINE_SUGGESTIONS, BEDTIME_MODE_PRESET.useEngineSuggestions.toString());
        updateSuggestionsTextareaStyle(useEngineSuggestionsCheckbox, userSuggestionsTextarea);
    }
}


// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
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
    readingAgeSliderContainer = document.getElementById('readingAgeSliderContainer'); 
    enableConsolidatorCheckbox = document.getElementById('enableConsolidatorCheckbox');
    craftingFrameworkSelect = document.getElementById('craftingFrameworkSelect');
    frameworkSummaryDiv = document.getElementById('frameworkSummary');
    generateButton = document.getElementById('generateButton');
    storyTitleDiv = document.getElementById('storyTitle');
    storyOutputDiv = document.getElementById('storyOutput');
    copyStoryButton = document.getElementById('copyStoryButton');
    saveStoryButton = document.getElementById('saveStoryButton');
    elaborateStoryButton = document.getElementById('elaborateStoryButton');
    decreaseFontButton = document.getElementById('decreaseFontButton'); 
    increaseFontButton = document.getElementById('increaseFontButton'); 
    settingsModal = document.getElementById('settingsModal');
    settingsButton = document.getElementById('settingsButton');
    cancelSettingsButton = document.getElementById('cancelSettingsButton');
    saveSettingsButton = document.getElementById('saveSettingsButton');
    authorStyleSelect = document.getElementById('authorStyleSelect');
    styleSummaryDiv = document.getElementById('styleSummary');
    adjustmentsButton = document.getElementById('adjustmentsButton');
    adjustmentsModal = document.getElementById('adjustmentsModal');
    cancelAdjustmentsButton = document.getElementById('cancelAdjustmentsButton');
    saveAdjustmentsButton = document.getElementById('saveAdjustmentsButton');
    toneSelect = document.getElementById('toneSelect');
    pacingSelect = document.getElementById('pacingSelect');
    humorSelect = document.getElementById('humorSelect');
    emotionSelect = document.getElementById('emotionSelect');
    agentTogglesContainer = document.getElementById('agentTogglesContainer');
    agent1CrafterToggle = document.getElementById('agent1CrafterToggle');
    agent2ElaboratorToggle = document.getElementById('agent2ElaboratorToggle');
    agent3ReviewerToggle = document.getElementById('agent3ReviewerToggle');
    agent4PolisherToggle = document.getElementById('agent4PolisherToggle');
    agent5CleanerToggle = document.getElementById('agent5CleanerToggle');
    agent6TitlerToggle = document.getElementById('agent6TitlerToggle');
    agentCConsolidatorToggle = document.getElementById('agentCConsolidatorToggle');
    bedtimeModeToggle = document.getElementById('bedtimeModeToggle');


    if (!modalApiKeyInput || !charactersInput || !audienceInput || !craftingFrameworkSelect || !generateButton || !storyOutputDiv || !settingsModal || !settingsButton || !saveSettingsButton || !modalModelSelect || !storyTitleDiv || !useEngineSuggestionsCheckbox || !userSuggestionsTextarea || !enableReadingAgeAdjustmentCheckbox || !targetReadingAgeSlider || !readingAgeSliderContainer || !decreaseFontButton || !increaseFontButton || !enableConsolidatorCheckbox || !authorStyleSelect || !adjustmentsModal || !agentTogglesContainer) {
        console.error("Critical UI elements are missing. Application may not function correctly.");
        if (storyOutputDiv) storyOutputDiv.textContent = "Error: Critical UI elements missing. Check console.";
        return;
    }
    
    initUIElements({ 
        storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton, copyStoryButton, saveStoryButton,
        decreaseFontButton, increaseFontButton, adjustmentsButton,
        craftingFrameworkSelect, frameworkSummaryDiv, useEngineSuggestionsCheckbox, userSuggestionsTextarea,
        authorStyleSelect, styleSummaryDiv
    });

    applyStoryFontSize(currentStoryFontSizeRem);

    if (storyOutputDiv) storyOutputDiv.textContent = 'Welcome! Describe your characters, choose an audience and a story framework, then click "Generate Story".\n\nConfigure your Gemini API Key and Model in Settings (⚙️ icon in the top right).';
    enableMainControls();

    // Populate UI elements
    populateDropdown(craftingFrameworkSelect, STORY_CRAFTING_GUIDES, false);
    const storedFramework = loadFromLocalStorage(LS_SELECTED_FRAMEWORK);
    if (storedFramework && STORY_CRAFTING_GUIDES[storedFramework]) {
        craftingFrameworkSelect.value = storedFramework;
    }
    updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES); 

    populateDropdown(authorStyleSelect, STORY_STYLE_GUIDES, false);
    authorStyleSelect.value = loadFromLocalStorage(LS_SELECTED_AUTHOR_STYLE) || "Default (No Specific Style)";
    updateAuthorStyleSummaryDisplay(STORY_STYLE_SUMMARIES);

    populateDropdown(toneSelect, ADJUSTMENT_MODULES.tone);
    populateDropdown(pacingSelect, ADJUSTMENT_MODULES.pacing);
    populateDropdown(humorSelect, ADJUSTMENT_MODULES.humor);
    populateDropdown(emotionSelect, ADJUSTMENT_MODULES.emotion);
    
    // Load all saved settings from Local Storage
    toneSelect.value = loadFromLocalStorage(LS_ADJUSTMENT_TONE) || 'none';
    pacingSelect.value = loadFromLocalStorage(LS_ADJUSTMENT_PACING) || 'default';
    humorSelect.value = loadFromLocalStorage(LS_ADJUSTMENT_HUMOR) || 'none';
    emotionSelect.value = loadFromLocalStorage(LS_ADJUSTMENT_EMOTION) || 'default';

    modalModelSelect.innerHTML = ''; 
    Object.keys(AVAILABLE_MODELS).forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = AVAILABLE_MODELS[id].name;
        modalModelSelect.appendChild(option);
    });
    modalModelSelect.value = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;

    modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
    charactersInput.value = loadFromLocalStorage(LS_CHARACTERS) || '';
    audienceInput.value = loadFromLocalStorage(LS_AUDIENCE) || 'children aged 5-7';
    minApiIntervalInput.value = loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString();
    
    useEngineSuggestionsCheckbox.checked = (loadFromLocalStorage(LS_USE_ENGINE_SUGGESTIONS) === 'true');
    userSuggestionsTextarea.value = loadFromLocalStorage(LS_USER_SUGGESTIONS) || '';
    updateSuggestionsTextareaStyle();

    enableReadingAgeAdjustmentCheckbox.checked = (loadFromLocalStorage(LS_ADJUST_READING_AGE_ENABLED) === 'true');
    readingAgeMinInput.value = loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString();
    readingAgeMaxInput.value = loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString();
    targetReadingAgeSlider.value = loadFromLocalStorage(LS_TARGET_READING_AGE) || DEFAULT_TARGET_READING_AGE.toString();
    updateTargetReadingAgeSliderDOMState(); 

    enableConsolidatorCheckbox.checked = (loadFromLocalStorage(LS_ENABLE_CONSOLIDATOR) === 'true');
    
    agent1CrafterToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_1_CRAFTER) ?? 'true') === 'true';
    agent2ElaboratorToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_2_ELABORATOR) ?? 'true') === 'true';
    agent3ReviewerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_3_REVIEWER) ?? 'true') === 'true';
    agent4PolisherToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_4_POLISHER) ?? 'true') === 'true';
    agent5CleanerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_5_CLEANER) ?? 'false') === 'true';
    agent6TitlerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_6_TITLER) ?? 'false') === 'true';
    agentCConsolidatorToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR) ?? 'true') === 'true';
    updateAgentTogglesUI();


    // --- Event Listeners ---
    craftingFrameworkSelect.addEventListener('change', () => {
        updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES);
        saveToLocalStorage(LS_SELECTED_FRAMEWORK, craftingFrameworkSelect.value);
    });

    authorStyleSelect.addEventListener('change', () => {
        updateAuthorStyleSummaryDisplay(STORY_STYLE_SUMMARIES);
        saveToLocalStorage(LS_SELECTED_AUTHOR_STYLE, authorStyleSelect.value);
    });

    useEngineSuggestionsCheckbox.addEventListener('change', () => {
        updateSuggestionsTextareaStyle();
        saveToLocalStorage(LS_USE_ENGINE_SUGGESTIONS, useEngineSuggestionsCheckbox.checked.toString());
    });
    userSuggestionsTextarea.addEventListener('input', () => saveToLocalStorage(LS_USER_SUGGESTIONS, userSuggestionsTextarea.value));
    
    enableReadingAgeAdjustmentCheckbox.addEventListener('change', () => {
        updateTargetReadingAgeSliderDOMState();
        saveToLocalStorage(LS_ADJUST_READING_AGE_ENABLED, enableReadingAgeAdjustmentCheckbox.checked.toString());
    });
    targetReadingAgeSlider.addEventListener('change', () => saveToLocalStorage(LS_TARGET_READING_AGE, targetReadingAgeSlider.value));

    readingAgeMinInput.addEventListener('change', () => {
        saveToLocalStorage(LS_READING_AGE_MIN, readingAgeMinInput.value);
        updateTargetReadingAgeSliderDOMState();
    });
    readingAgeMaxInput.addEventListener('change', () => {
        saveToLocalStorage(LS_READING_AGE_MAX, readingAgeMaxInput.value);
        updateTargetReadingAgeSliderDOMState();
    });

    enableConsolidatorCheckbox.addEventListener('change', () => {
        saveToLocalStorage(LS_ENABLE_CONSOLIDATOR, enableConsolidatorCheckbox.checked.toString());
    });

    // Settings Modal
    settingsButton.addEventListener('click', () => {
        modalModelSelect.value = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || ''; 
        minApiIntervalInput.value = loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString();
        readingAgeMinInput.value = loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString();
        readingAgeMaxInput.value = loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString();
        updateAgentTogglesUI();
        settingsModal.classList.add('active');
    });
    modalModelSelect.addEventListener('change', updateAgentTogglesUI);
    cancelSettingsButton.addEventListener('click', () => settingsModal.classList.remove('active'));
    saveSettingsButton.addEventListener('click', () => {
        saveToLocalStorage(LS_API_KEY, modalApiKeyInput.value);
        saveToLocalStorage(LS_SELECTED_MODEL, modalModelSelect.value);
        saveToLocalStorage(LS_MIN_API_INTERVAL, minApiIntervalInput.value);
        saveToLocalStorage(LS_READING_AGE_MIN, readingAgeMinInput.value); 
        saveToLocalStorage(LS_READING_AGE_MAX, readingAgeMaxInput.value);
        saveToLocalStorage(LS_THINKING_AGENT_1_CRAFTER, agent1CrafterToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_2_ELABORATOR, agent2ElaboratorToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_3_REVIEWER, agent3ReviewerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_4_POLISHER, agent4PolisherToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_5_CLEANER, agent5CleanerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_6_TITLER, agent6TitlerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR, agentCConsolidatorToggle.checked.toString());
        updateTargetReadingAgeSliderDOMState(); 
        settingsModal.classList.remove('active');
        showTemporaryToast("Settings saved!", "success");
    });
    
    // Adjustments Modal
    adjustmentsButton.addEventListener('click', () => adjustmentsModal.classList.add('active'));
    cancelAdjustmentsButton.addEventListener('click', () => adjustmentsModal.classList.remove('active'));
    saveAdjustmentsButton.addEventListener('click', () => {
        saveToLocalStorage(LS_ADJUSTMENT_TONE, toneSelect.value);
        saveToLocalStorage(LS_ADJUSTMENT_PACING, pacingSelect.value);
        saveToLocalStorage(LS_ADJUSTMENT_HUMOR, humorSelect.value);
        saveToLocalStorage(LS_ADJUSTMENT_EMOTION, emotionSelect.value);
        adjustmentsModal.classList.remove('active');
        showTemporaryToast("Style adjustments saved!", "success");
    });

    // Bedtime Mode Toggle
    if (bedtimeModeToggle) {
        bedtimeModeToggle.addEventListener('click', () => {
            const isActive = bedtimeModeToggle.getAttribute('aria-pressed') === 'true';
            
            if (!isActive) {
                // Activate Bedtime Mode - apply all preset values
                activateBedtimeMode();
                bedtimeModeToggle.setAttribute('aria-pressed', 'true');
                showTemporaryToast('🌙 Bedtime Mode activated! Settings optimized for calm stories.', 'success');
            } else {
                // Deactivate - just toggle the button state, don't reset settings
                bedtimeModeToggle.setAttribute('aria-pressed', 'false');
                showTemporaryToast('Bedtime Mode deactivated', 'info');
            }
        });
    }

    // Other buttons...
    downloadChatLogButton.addEventListener('click', () => {
        const logData = JSON.stringify(appState.lastRunChatLog, null, 2);
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `story_generator_chat_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showTemporaryToast("Chat log downloaded.", "info");
    });
    copyStoryButton.addEventListener('click', () => {
        if (appState.latestGeneratedStoryText) {
            navigator.clipboard.writeText(appState.latestGeneratedStoryText)
                .then(() => showTemporaryToast("Story copied to clipboard!", "success"))
                .catch(err => {
                    console.error("Failed to copy story: ", err);
                    showTemporaryToast("Failed to copy story. See console.", "error");
                });
        }
    });
    saveStoryButton.addEventListener('click', () => {
        if (appState.latestGeneratedStoryText) {
            const title = appState.latestGeneratedStoryTitle || "Untitled Story";
            const textToSave = `Title: ${title}\n\n${appState.latestGeneratedStoryText}`;
            const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showTemporaryToast("Story saved as .txt file!", "success");
        }
    });
    increaseFontButton.addEventListener('click', () => {
        let newSize = currentStoryFontSizeRem + STORY_FONT_SIZE_STEP;
        if (newSize > MAX_STORY_FONT_SIZE_REM) newSize = MAX_STORY_FONT_SIZE_REM;
        currentStoryFontSizeRem = newSize;
        applyStoryFontSize(currentStoryFontSizeRem);
    });
    decreaseFontButton.addEventListener('click', () => {
        let newSize = currentStoryFontSizeRem - STORY_FONT_SIZE_STEP;
        if (newSize < MIN_STORY_FONT_SIZE_REM) newSize = MIN_STORY_FONT_SIZE_REM;
        currentStoryFontSizeRem = newSize;
        applyStoryFontSize(currentStoryFontSizeRem);
    });


    charactersInput.addEventListener('input', () => saveToLocalStorage(LS_CHARACTERS, charactersInput.value));
    audienceInput.addEventListener('input', () => saveToLocalStorage(LS_AUDIENCE, audienceInput.value));

    function gatherPipelineInputs() {
        const apiKey = loadFromLocalStorage(LS_API_KEY) || '';
        const modelId = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        const minApiIntervalSeconds = parseInt(loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString(), 10);
        const minApiIntervalMs = (isNaN(minApiIntervalSeconds) || minApiIntervalSeconds < 0 ? DEFAULT_MIN_API_INTERVAL_S : minApiIntervalSeconds) * 1000;
        
        const audience = audienceInput.value.trim() || "children";
        const frameworkKey = craftingFrameworkSelect.value;
        const craftGuideText = STORY_CRAFTING_GUIDES[frameworkKey] || ""; 
        
        const styleKey = authorStyleSelect.value;
        const authorStyleGuideText = STORY_STYLE_GUIDES[styleKey] || "";
        
        const selectedTone = toneSelect.value;
        const selectedPacing = pacingSelect.value;
        const selectedHumor = humorSelect.value;
        const selectedEmotion = emotionSelect.value;

        const adjustmentModulesText = [
            ADJUSTMENT_MODULES.tone[selectedTone],
            ADJUSTMENT_MODULES.pacing[selectedPacing],
            ADJUSTMENT_MODULES.humor[selectedHumor],
            ADJUSTMENT_MODULES.emotion[selectedEmotion]
        ].filter(Boolean).join('\n');

        const agentThinkingConfig = {
            "Agent 1: Story Crafter": (loadFromLocalStorage(LS_THINKING_AGENT_1_CRAFTER) ?? 'true') === 'true',
            "Agent 2: Elaborator": (loadFromLocalStorage(LS_THINKING_AGENT_2_ELABORATOR) ?? 'true') === 'true',
            "Agent 3: Reviewer": (loadFromLocalStorage(LS_THINKING_AGENT_3_REVIEWER) ?? 'true') === 'true',
            "Agent 4: Polisher": (loadFromLocalStorage(LS_THINKING_AGENT_4_POLISHER) ?? 'true') === 'true',
            "Agent 5: Cleaner": (loadFromLocalStorage(LS_THINKING_AGENT_5_CLEANER) ?? 'false') === 'true',
            "Agent 6: Titler": (loadFromLocalStorage(LS_THINKING_AGENT_6_TITLER) ?? 'false') === 'true',
            "Agent C: Consolidator": (loadFromLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR) ?? 'true') === 'true',
        };
        const model = AVAILABLE_MODELS[modelId];
        const canThink = model ? model.supportsThinking : false;
        if (!canThink) {
            Object.keys(agentThinkingConfig).forEach(key => agentThinkingConfig[key] = false);
        }

        let userSuggestionsText = ""; 
        if (useEngineSuggestionsCheckbox.checked) {
            userSuggestionsText = "User has opted for the story engine to decide on specific suggestions if any are needed. Focus on the core request and framework.";
        } else {
            const suggestions = userSuggestionsTextarea.value.trim();
            if (suggestions) {
                userSuggestionsText = `User Suggestions (please incorporate these if they align with the story framework and goal):\n${suggestions}`;
            } else {
                userSuggestionsText = ""; 
            }
        }
        
        let readingAgeNote = ""; 
        if (enableReadingAgeAdjustmentCheckbox.checked) { 
            const targetAge = targetReadingAgeSlider.value || DEFAULT_TARGET_READING_AGE;
            readingAgeNote = READING_AGE_ADJUSTMENT_TEXT_TEMPLATE.replace(/\$\{targetReadingAge\}/g, targetAge.toString());
        }

        const enableConsolidator = enableConsolidatorCheckbox.checked;

        return { 
            apiKey, 
            modelId, 
            minApiIntervalMs, 
            audience, 
            CRAFT_GUIDE_TEXT: craftGuideText, 
            READING_AGE_NOTE: readingAgeNote, 
            USER_SUGGESTIONS_TEXT: userSuggestionsText,
            enableConsolidator,
            AUTHOR_STYLE_GUIDE: authorStyleGuideText,
            ADJUSTMENT_MODULES_TEXT: adjustmentModulesText,
            agentThinkingConfig
        };
    }

    async function handleGenerateStory() {
        appState.clearChatLog(); 
        clearStoryOutput(); 
        disableMainControls();
        appState.latestGeneratedStoryText = ""; 
        appState.latestGeneratedStoryTitle = "";

        const commonInputs = gatherPipelineInputs();

        if (!commonInputs.apiKey) {
            displayErrorInStoryOutput("API Key is missing. Please configure it in Settings.");
            enableMainControls();
            return;
        }
        if (!charactersInput.value.trim()) {
            displayErrorInStoryOutput("Please provide characters for the story.");
            enableMainControls();
            return;
        }
        
        saveToLocalStorage(LS_CHARACTERS, charactersInput.value);
        saveToLocalStorage(LS_AUDIENCE, audienceInput.value);
        saveToLocalStorage(LS_SELECTED_FRAMEWORK, craftingFrameworkSelect.value);
        saveToLocalStorage(LS_SELECTED_AUTHOR_STYLE, authorStyleSelect.value);
        saveToLocalStorage(LS_ENABLE_CONSOLIDATOR, commonInputs.enableConsolidator.toString());


        updateStatusInStoryOutput(`Initialising story generation...\n`);
        
        const initialPipelineData = {
            charactersList: parseCharacters(charactersInput.value).join(', ') || "a brave little mouse",
            storyText: "", 
            reviewText: "",
            titleText: ""
        };

        const currentPipelineConfig = getStoryGenerationPipelineConfig(commonInputs.enableConsolidator);

        try {
            const finalData = await runPipeline(currentPipelineConfig, initialPipelineData, commonInputs, storyOutputDiv);
            
            appState.latestGeneratedStoryText = (finalData.storyText || "").trim();
            appState.latestGeneratedStoryTitle = (finalData.titleText || "Untitled Story").trim();
            
            const wordCount = countWords(appState.latestGeneratedStoryText);
            console.log(`Final word count = ${wordCount}`);

            updateStatusInStoryOutput("Story generation complete!\n"); 
            displayFinalStoryOutput(appState.latestGeneratedStoryTitle, appState.latestGeneratedStoryText); 

        } catch (error) {
            console.error("Error in handleGenerateStory:", error);
            displayErrorInStoryOutput(error.message || "An unknown error occurred during story generation.");
        } finally {
            enableMainControls(); 
        }
    }

    async function handleElaborateStory() {
        if (!appState.latestGeneratedStoryText) { 
            showTemporaryToast("No story available to elaborate. Please generate a story first.", "info");
            return;
        }
        
        appState.addLogEntry({ agentName: "User Action", type: 'elaboration-start', content: `Elaborating existing story. Initial length: ${appState.latestGeneratedStoryText.length}`, timestamp: new Date().toISOString() });
        
        clearStoryOutput(); 
        if (storyOutputDiv) storyOutputDiv.textContent = `Previous story version (will be elaborated):\n"${appState.latestGeneratedStoryText.substring(0,150)}..."\n\n`;

        disableMainControls();
        updateStatusInStoryOutput(`Starting elaboration...\n`);

        const commonInputs = gatherPipelineInputs();

        if (!commonInputs.apiKey) {
            displayErrorInStoryOutput("API Key is missing. Please configure it in Settings.");
            enableMainControls();
            return;
        }

        const initialPipelineData = {
            storyText: appState.latestGeneratedStoryText, 
            reviewText: "" 
        };

        const currentPipelineConfig = getElaborationPipelineConfig(commonInputs.enableConsolidator);

        try {
            const finalData = await runPipeline(currentPipelineConfig, initialPipelineData, commonInputs, storyOutputDiv);
            
            appState.latestGeneratedStoryText = (finalData.storyText || "").trim();
            
            const wordCount = countWords(appState.latestGeneratedStoryText);
            console.log(`Final word count (after elaboration) = ${wordCount}`);
            
            updateStatusInStoryOutput("Story elaboration complete!\n");
            displayFinalStoryOutput(appState.latestGeneratedStoryTitle, appState.latestGeneratedStoryText, true);

        } catch (error) {
            console.error("Error in handleElaborateStory:", error);
            displayErrorInStoryOutput(error.message || "An unknown error occurred during story elaboration.");
        } finally {
            enableMainControls();
        }
    }

    if (generateButton) generateButton.addEventListener('click', handleGenerateStory);
    if (elaborateStoryButton) elaborateStoryButton.addEventListener('click', handleElaborateStory);
});