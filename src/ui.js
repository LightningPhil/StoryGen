// src/ui.js
import appState from './appState.js'; // Import appState

// --- DOM Element References (initialized by initUIElements) ---
let storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton, copyStoryButton, saveStoryButton;
let craftingFrameworkSelect, frameworkSummaryDiv, useEngineSuggestionsCheckbox, userSuggestionsTextarea;
// readingAgeSliderContainer will be passed to init if direct manipulation is needed, otherwise script.js handles its class.

// Temporary toast element (if you want one, otherwise remove this part)
// let toastElement = null; // No toast element implemented in this version

export function initUIElements(elements) {
    storyTitleDiv = elements.storyTitleDiv;
    storyOutputDiv = elements.storyOutputDiv;
    generateButton = elements.generateButton;
    elaborateStoryButton = elements.elaborateStoryButton;
    copyStoryButton = elements.copyStoryButton;
    saveStoryButton = elements.saveStoryButton;
    craftingFrameworkSelect = elements.craftingFrameworkSelect;
    frameworkSummaryDiv = elements.frameworkSummaryDiv;
    useEngineSuggestionsCheckbox = elements.useEngineSuggestionsCheckbox;
    userSuggestionsTextarea = elements.userSuggestionsTextarea;
    // readingAgeSliderContainer = elements.readingAgeSliderContainer; // If needed for direct class manipulation from ui.js

    // Initial state for action buttons (hidden)
    if (copyStoryButton) copyStoryButton.classList.add('hidden');
    if (saveStoryButton) saveStoryButton.classList.add('hidden');
    if (elaborateStoryButton) elaborateStoryButton.classList.add('hidden');

    if (storyTitleDiv) { // Set initial placeholder text for title
        storyTitleDiv.textContent = "Your Story Title Will Appear Here";
        storyTitleDiv.classList.add('placeholder');
    }
}

// Clears all content (including statuses) from story output, preparing for new story or log
export function clearStoryOutput() {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent = "";
    if (storyTitleDiv) { // Reset title to placeholder when clearing for a new generation
        storyTitleDiv.textContent = "Generating title...";
        storyTitleDiv.classList.add('placeholder');
    }
}

// Appends a status message to the story output area
export function updateStatusInStoryOutput(message) {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent += message;
    storyOutputDiv.scrollTop = storyOutputDiv.scrollHeight; // Scroll to bottom
}

// Displays the final story, replacing any status logs
export function displayFinalStoryOutput(title, storyText, isElaboration = false) {
    if (storyTitleDiv) {
        storyTitleDiv.textContent = title || "Untitled Story";
        storyTitleDiv.classList.remove('placeholder');
    }
    if (storyOutputDiv) {
        storyOutputDiv.textContent = storyText; // Replace content
        storyOutputDiv.scrollTop = 0; // Scroll to top to see the beginning of the story
    }

    const successMessage = isElaboration ? 'Story elaborated successfully!' : 'Story generated successfully!';
    showTemporaryToast(successMessage, 'success');

    if (copyStoryButton) copyStoryButton.classList.remove('hidden');
    if (saveStoryButton) saveStoryButton.classList.remove('hidden');
    if (elaborateStoryButton) {
        elaborateStoryButton.classList.remove('hidden');
        if (generateButton && !generateButton.disabled) {
            elaborateStoryButton.disabled = false;
        }
    }
}

// Displays an error message
export function displayErrorInStoryOutput(errorMessage) {
    console.error("Pipeline Error:", errorMessage); // Log detailed error to console

    if (storyTitleDiv) {
        storyTitleDiv.textContent = "Error Occurred";
        storyTitleDiv.classList.remove('placeholder');
    }
    if (storyOutputDiv) {
        // Display a user-friendly message in the story output area
        storyOutputDiv.textContent = "An error occurred. Please check the browser console for details and ensure your API key and settings are correct.";
        storyOutputDiv.scrollTop = 0; // Scroll to top to see error message
    }

    // Hide action buttons on error
    if (copyStoryButton) copyStoryButton.classList.add('hidden');
    if (saveStoryButton) saveStoryButton.classList.add('hidden');
    if (elaborateStoryButton) {
        elaborateStoryButton.classList.add('hidden');
        elaborateStoryButton.disabled = true; // Also disable
    }
    // Note: enableMainControls() in script.js will re-enable generateButton if appropriate
}


// For non-critical UI feedback (e.g., "Copied!", "Settings Saved")
export function showTemporaryToast(message, type = 'info', duration = 3000) {
    // Basic console log fallback. For a real toast, you'd manipulate a DOM element.
    console.log(`[UI Toast - ${type.toUpperCase()}]: ${message}`);
    
    // Example of how a dynamic toast might be handled (requires CSS for .toast-message)
    /*
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `toast-message toast-${type}`; // e.g., toast-info, toast-success
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, duration);
    */
}

// --- Existing UI Update Functions (Potentially modified for appState or consistency) ---
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
}

export function enableMainControls() {
    if (generateButton) generateButton.disabled = false;
    
    // elaborateStoryButton is enabled if a story exists and generate is not running
    if (appState.latestGeneratedStoryText && elaborateStoryButton) {
        elaborateStoryButton.disabled = false;
        elaborateStoryButton.classList.remove('hidden'); // Ensure it's visible if a story exists
    } else if (elaborateStoryButton) {
        elaborateStoryButton.disabled = true;
        // Do not hide it here, displayFinalStoryOutput or displayErrorInStoryOutput handles visibility
    }
}

// Removed setLatestStoryTextForUI as appState is now imported directly