// src/ui.js

// --- DOM Element References (initialized by initUIElements) ---
let storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton, copyStoryButton, saveStoryButton;
let craftingFrameworkSelect, frameworkSummaryDiv, useEngineSuggestionsCheckbox, userSuggestionsTextarea;
// statusMessageDiv is removed

// Temporary toast element (if you want one, otherwise remove this part)
let toastElement = null; 

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

    // Optional: Create a toast element dynamically if you don't have one in HTML
    // For now, showTemporaryToast will just console.log if no dedicated element.
}

// --- New Status Handling in Story Output ---

// Appends a status message to the story output area
export function updateStatusInStoryOutput(message, isFinalStatus = false) {
    if (!storyOutputDiv) return;
    // If it's the final success message, we might clear previous statuses first,
    // or this function is called sequentially. For now, just appends.
    // A more complex log might involve styled spans.
    storyOutputDiv.textContent += message;
    storyOutputDiv.scrollTop = storyOutputDiv.scrollHeight; // Scroll to bottom
}

// Clears all content (including statuses) from story output, preparing for new story or log
export function clearStoryOutput() {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent = ""; 
}

// Displays the final story, replacing any status logs
export function displayFinalStoryOutput(title, storyText, isElaboration = false) {
    if (storyTitleDiv) storyTitleDiv.textContent = title;
    if (storyOutputDiv) storyOutputDiv.textContent = storyText; // Replace content
    
    // UI feedback for non-story area can still use a toast if implemented
    const successMessage = isElaboration ? 'Story elaborated successfully!' : 'Story generated successfully!';
    showTemporaryToast(successMessage, 'success');


    if (copyStoryButton) copyStoryButton.style.display = 'inline-block';
    if (saveStoryButton) saveStoryButton.style.display = 'inline-block';
    if (elaborateStoryButton) {
        elaborateStoryButton.style.display = 'inline-block';
        if (generateButton && !generateButton.disabled) { // Only enable if main generate isn't also running
             elaborateStoryButton.disabled = false;
        }
    }
}

// Displays an error message, potentially within the story output or as a toast
export function displayErrorInStoryOutput(errorMessage, isCritical = true) {
    if (storyOutputDiv) {
        // Prepend or append error. Prepending makes it more visible.
        storyOutputDiv.textContent = `ERROR: ${errorMessage}\n\n` + storyOutputDiv.textContent;
        storyOutputDiv.scrollTop = 0; // Scroll to top to see error
    }
    if (storyTitleDiv) storyTitleDiv.textContent = "Error"; // Indicate error in title

    if (copyStoryButton) copyStoryButton.style.display = 'none';
    if (saveStoryButton) saveStoryButton.style.display = 'none';
    if (elaborateStoryButton) {
        elaborateStoryButton.style.display = 'none'; 
        elaborateStoryButton.disabled = true;
    }
    console.error("Pipeline Error Details:", errorMessage); // Always log critical errors
}

// For non-critical UI feedback (e.g., "Copied!", "Settings Saved")
// This could create a temporary toast-like message element if desired.
// For now, it will just log to console if no dedicated toast UI exists.
export function showTemporaryToast(message, type = 'info', duration = 3000) {
    console.log(`[${type.toUpperCase()}] Toast: ${message}`); // Fallback to console
    // If you implement a toast HTML element:
    // if (toastElement) {
    //     toastElement.textContent = message;
    //     toastElement.className = `toast toast-${type}`; // Add CSS for .toast and .toast-success, .toast-error etc.
    //     toastElement.style.display = 'block';
    //     setTimeout(() => {
    //         if (toastElement) toastElement.style.display = 'none';
    //     }, duration);
    // }
}

// --- Existing UI Update Functions ---
export function updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES_DATA) {
    if (!craftingFrameworkSelect || !frameworkSummaryDiv) return;
    const selectedFrameworkKey = craftingFrameworkSelect.value;
    const summary = STORY_FRAMEWORK_SUMMARIES_DATA[selectedFrameworkKey] || "No summary available for this framework.";
    frameworkSummaryDiv.textContent = summary;
}

export function updateSuggestionsTextareaStyle() {
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

export function disableMainControls() {
    if (generateButton) generateButton.disabled = true;
    if (elaborateStoryButton) elaborateStoryButton.disabled = true;
}

export function enableMainControls() {
    if (generateButton) generateButton.disabled = false;
    // elaborateStoryButton is enabled by displayFinalStoryOutput if a story exists
    if (latestGeneratedStoryText && elaborateStoryButton) { // latestGeneratedStoryText needs to be accessible or passed
        elaborateStoryButton.disabled = false;
    } else if (elaborateStoryButton) {
        elaborateStoryButton.disabled = true;
    }
}

// This global variable is managed by script.js, ui.js needs read-access for enableMainControls
// This is a bit of a hack. Better to pass it or use a state manager.
// For now, this illustrates the dependency.
let latestGeneratedStoryText = ""; 
export function setLatestStoryTextForUI(text) { // Called by script.js to update this
    latestGeneratedStoryText = text;
}