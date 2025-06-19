// src/utils.js

export function parseCharacters(characterString) {
    if (!characterString) return [];
    return characterString.split(',').map(char => char.trim()).filter(char => char.length > 0);
}

export function constructAgentPrompt(basePromptTemplate, dataObject) {
    let prompt = basePromptTemplate;
    for (const key in dataObject) {
        // Ensure value is a string; if not, use empty string to avoid "undefined" in prompt
        const value = typeof dataObject[key] === 'string' ? dataObject[key] : '';
        // Use a regex that is more robust for global replacement of ${KEY}
        const placeholder = new RegExp(`\\$\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
        prompt = prompt.replace(placeholder, value);
    }
    return prompt;
}

export function countWords(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return 0;
    }
    // Match sequences of non-whitespace characters. This is a common way to count words.
    // It handles multiple spaces between words and leading/trailing spaces correctly after trim.
    // More sophisticated counting might handle hyphens, contractions, etc., differently,
    // but this is a good general approach.
    const words = text.trim().split(/\s+/);
    return words.length;
}