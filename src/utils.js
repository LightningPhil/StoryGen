// src/utils.js

export function parseCharacters(characterString) {
    if (!characterString) return [];
    return characterString.split(',').map(char => char.trim()).filter(char => char.length > 0);
}

export function constructAgentPrompt(basePromptTemplate, dataObject) {
    let prompt = basePromptTemplate;
    for (const key in dataObject) {
        const value = typeof dataObject[key] === 'string' ? dataObject[key] : '';
        const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
        prompt = prompt.replace(placeholder, value);
    }
    return prompt;
}