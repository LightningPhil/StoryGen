import type { ModelConfig } from './types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const DEFAULT_MODEL = 'gemini-flash-latest';

/**
 * Thinking budgets are supported from Gemini 2.5 onward. The "-latest" aliases
 * track those newer models, so they qualify even though they carry no version.
 */
export function detectThinkingSupport(modelName: string): boolean {
  if (/thinking/i.test(modelName)) return true;
  if (/-latest$/i.test(modelName)) return true;

  const version = modelName.match(/gemini-(\d+)(?:\.(\d+))?/i);
  if (!version) return false;
  const major = Number(version[1]);
  const minor = Number(version[2] ?? 0);
  return major > 2 || (major === 2 && minor >= 5);
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  name: DEFAULT_MODEL,
  supportsThinking: detectThinkingSupport(DEFAULT_MODEL),
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
      return { name, supportsThinking: detectThinkingSupport(name) };
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
