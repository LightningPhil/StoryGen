// src/ui.js
import appState from './appState.js'; 

// --- DOM Element References (initialized by initUIElements) ---
let storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton;
let copyStoryButton, saveStoryButton, decreaseFontButton, increaseFontButton; // Added font buttons
let craftingFrameworkSelect, frameworkSummaryDiv, useEngineSuggestionsCheckbox, userSuggestionsTextarea;

export function initUIElements(elements) {
    storyTitleDiv = elements.storyTitleDiv;
    storyOutputDiv = elements.storyOutputDiv;
    generateButton = elements.generateButton;
    elaborateStoryButton = elements.elaborateStoryButton;
    copyStoryButton = elements.copyStoryButton;
    saveStoryButton = elements.saveStoryButton;
    decreaseFontButton = elements.decreaseFontButton; // New
    increaseFontButton = elements.increaseFontButton; // New
    craftingFrameworkSelect = elements.craftingFrameworkSelect;
    frameworkSummaryDiv = elements.frameworkSummaryDiv;
    useEngineSuggestionsCheckbox = elements.useEngineSuggestionsCheckbox;
    userSuggestionsTextarea = elements.userSuggestionsTextarea;

    // Initial state for action buttons (hidden)
    if (copyStoryButton) copyStoryButton.classList.add('hidden');
    if (saveStoryButton) saveStoryButton.classList.add('hidden');
    if (elaborateStoryButton) elaborateStoryButton.classList.add('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.add('hidden'); // New
    if (increaseFontButton) increaseFontButton.classList.add('hidden'); // New


    if (storyTitleDiv) { 
        storyTitleDiv.textContent = "Your Story Title Will Appear Here";
        storyTitleDiv.classList.add('placeholder');
    }
}

export function clearStoryOutput() {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent = "";
    if (storyTitleDiv) { 
        storyTitleDiv.textContent = "Generating title...";
        storyTitleDiv.classList.add('placeholder');
    }
}

export function updateStatusInStoryOutput(message) {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent += message;
    storyOutputDiv.scrollTop = storyOutputDiv.scrollHeight; 
}

export function displayFinalStoryOutput(title, storyText, isElaboration = false) {
    if (storyTitleDiv) {
        storyTitleDiv.textContent = title || "Untitled Story";
        storyTitleDiv.classList.remove('placeholder');
    }
    if (storyOutputDiv) {
        storyOutputDiv.textContent = storyText; 
        storyOutputDiv.scrollTop = 0; 
    }

    const successMessage = isElaboration ? 'Story elaborated successfully!' : 'Story generated successfully!';
    showTemporaryToast(successMessage, 'success');

    // Show all action buttons
    if (copyStoryButton) copyStoryButton.classList.remove('hidden');
    if (saveStoryButton) saveStoryButton.classList.remove('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.remove('hidden'); // New
    if (increaseFontButton) increaseFontButton.classList.remove('hidden'); // New
    if (elaborateStoryButton) {
        elaborateStoryButton.classList.remove('hidden');
        if (generateButton && !generateButton.disabled) {
            elaborateStoryButton.disabled = false;
        }
    }
}

export function displayErrorInStoryOutput(errorMessage) {
    console.error("Pipeline Error:", errorMessage); 

    if (storyTitleDiv) {
        storyTitleDiv.textContent = "Error Occurred";
        storyTitleDiv.classList.remove('placeholder');
    }
    if (storyOutputDiv) {
        storyOutputDiv.textContent = "An error occurred. Please check the browser console for details and ensure your API key and settings are correct.";
        storyOutputDiv.scrollTop = 0; 
    }

    // Hide action buttons on error
    if (copyStoryButton) copyStoryButton.classList.add('hidden');
    if (saveStoryButton) saveStoryButton.classList.add('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.add('hidden'); // New
    if (increaseFontButton) increaseFontButton.classList.add('hidden'); // New
    if (elaborateStoryButton) {
        elaborateStoryButton.classList.add('hidden');
        elaborateStoryButton.disabled = true; 
    }
}

export function showTemporaryToast(message, type = 'info', duration = 3000) {
    console.log(`[UI Toast - ${type.toUpperCase()}]: ${message}`);
}

export function updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES_DATA) {
    if (!craftingFrameworkSelect || !frameworkSummaryDiv) return;
    const selectedFrameworkKey = craftingFrameworkSelect.value;
    const summary = STORY_FRAMEWORK_SUMMARIES_DATA[selectedFrameworkKey] || "No summary available for this framework.";
    frameworkSummaryDiv.textContent = summary;
}

export function updateSuggestionsTextareaStyle() {
    if (!userSuggestionsTextarea || !useEngineSuggestionsCheckbox) return;
    const isDisabled = useEngineSuggestionsCheckbox.checked;
    userSuggestionsTextarea.disabled = isDisabled;
    userSuggestionsTextarea.classList.toggle('suggestions-used', !isDisabled);
    userSuggestionsTextarea.classList.toggle('suggestions-not-used', isDisabled);
}

export function disableMainControls() {
    if (generateButton) generateButton.disabled = true;
    if (elaborateStoryButton) elaborateStoryButton.disabled = true;
    // Font buttons usability depends on story presence, managed by displayFinalStoryOutput/displayErrorInStoryOutput
}

export function enableMainControls() {
    if (generateButton) generateButton.disabled = false;
    
    if (appState.latestGeneratedStoryText && elaborateStoryButton) {
        elaborateStoryButton.disabled = false;
        elaborateStoryButton.classList.remove('hidden'); 
    } else if (elaborateStoryButton) {
        elaborateStoryButton.disabled = true;
        // elaborateStoryButton.classList.add('hidden'); // Visibility handled by display functions
    }
    // Font buttons visibility is also handled by displayFinalStoryOutput/displayErrorInStoryOutput
}

// New function to apply font size to the story output
export function applyStoryFontSize(newSizeRem) {
    if (storyOutputDiv && typeof newSizeRem === 'number' && newSizeRem > 0) {
        storyOutputDiv.style.fontSize = `${newSizeRem}rem`;
    }
}