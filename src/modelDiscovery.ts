import type { ModelConfig } from './types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const DEFAULT_MODEL = 'gemini-flash-latest';

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  name: DEFAULT_MODEL,
  supportsThinking: false,
};

interface GeminiModel {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

interface ListModelsResponse {
  models?: GeminiModel[];
}

/** Sorting: "latest" aliases first (flash, lite, pro), then descending version order. */
function modelSortKey(name: string): [number, string] {
  const lower = name.toLowerCase();
  // Latest aliases get priority tier 0
  if (lower.includes('-latest')) return [0, lower];
  // Everything else in tier 1, sorted reverse-alphabetically so higher versions come first
  return [1, lower];
}

export async function fetchAvailableModels(apiKey: string): Promise<ModelConfig[]> {
  const url = `${API_BASE}/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Failed to fetch models:', res.status, res.statusText);
    return [DEFAULT_MODEL_CONFIG];
  }

  const data: ListModelsResponse = await res.json();
  if (!data.models) return [DEFAULT_MODEL_CONFIG];

  const models = data.models
    .filter(m => {
      if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
      // Only Gemini models
      const name = m.name.startsWith('models/') ? m.name.slice(7) : m.name;
      return /gemini/i.test(name);
    })
    .map(m => {
      const name = m.name.startsWith('models/') ? m.name.slice(7) : m.name;
      const supportsThinking = /2\.5|thinking/i.test(name);
      return { name, supportsThinking };
    })
    .sort((a, b) => {
      const [tierA, keyA] = modelSortKey(a.name);
      const [tierB, keyB] = modelSortKey(b.name);
      if (tierA !== tierB) return tierA - tierB;
      // Within the same tier, reverse alphabetical so higher versions come first
      return keyB.localeCompare(keyA);
    });

  // Ensure the default model is always present
  if (!models.find(m => m.name === DEFAULT_MODEL)) {
    models.unshift(DEFAULT_MODEL_CONFIG);
  }

  return models.length > 0 ? models : [DEFAULT_MODEL_CONFIG];
}
