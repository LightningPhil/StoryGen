import type { ModelConfig, ModelProvider } from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MISTRAL_API_BASE = 'https://api.mistral.ai/v1';

export const DEFAULT_MODEL = 'gemini-flash-latest';

/** Always offered in the picker; the API list often omits these aliases. */
export const PINNED_GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash'] as const;
export const PINNED_MISTRAL_MODELS = ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'] as const;
export const PINNED_MODELS = PINNED_GEMINI_MODELS;

/**
 * Thinking budgets are supported from Gemini 2.5 onward. The "-latest" aliases
 * track those newer models, so they qualify even though they carry no version.
 */
export function detectThinkingSupport(modelName: string): boolean {
  if (getModelProvider(modelName) === 'mistral') return false;
  if (/thinking/i.test(modelName)) return true;
  if (/-latest$/i.test(modelName)) return true;

  const version = modelName.match(/gemini-(\d+)(?:\.(\d+))?/i);
  if (!version) return false;
  const major = Number(version[1]);
  const minor = Number(version[2] ?? 0);
  return major > 2 || (major === 2 && minor >= 5);
}

export function getModelProvider(modelName: string): ModelProvider {
  return /^gemini/i.test(modelName) ? 'gemini' : 'mistral';
}

function configFor(name: string, provider?: ModelProvider): ModelConfig {
  const resolved = provider ?? getModelProvider(name);
  return {
    name,
    provider: resolved,
    supportsThinking: resolved === 'gemini' && detectThinkingSupport(name),
  };
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = configFor(DEFAULT_MODEL, 'gemini');

export const PINNED_GEMINI_MODEL_CONFIGS: ModelConfig[] = PINNED_GEMINI_MODELS.map(name => configFor(name, 'gemini'));
export const PINNED_MISTRAL_MODEL_CONFIGS: ModelConfig[] = PINNED_MISTRAL_MODELS.map(name => configFor(name, 'mistral'));
export const PINNED_MODEL_CONFIGS: ModelConfig[] = [...PINNED_GEMINI_MODEL_CONFIGS, ...PINNED_MISTRAL_MODEL_CONFIGS];

function withPinnedModels(models: ModelConfig[], pinned: readonly string[], provider: ModelProvider): ModelConfig[] {
  const pinnedNames = new Set<string>(pinned);
  const byName = new Map(models.map(m => [m.name, m]));
  const pinnedConfigs = pinned.map(name => byName.get(name) ?? configFor(name, provider));
  const rest = models.filter(m => !pinnedNames.has(m.name));
  return [...pinnedConfigs, ...rest];
}

export function apiKeyForModel(
  modelId: string,
  geminiApiKey: string,
  mistralApiKey: string,
  models: ModelConfig[] = [],
): string {
  const provider = models.find(m => m.name === modelId)?.provider ?? getModelProvider(modelId);
  return provider === 'mistral' ? mistralApiKey : geminiApiKey;
}

interface GeminiModel {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

interface ListGeminiModelsResponse {
  models?: GeminiModel[];
}

interface MistralModel {
  id?: string;
  object?: string;
  archived?: boolean;
  capabilities?: {
    completion_chat?: boolean;
  };
}

interface ListMistralModelsResponse {
  data?: MistralModel[];
}

/** Sorting: "latest" aliases first, then descending version order. */
function modelSortKey(name: string): [number, string] {
  const lower = name.toLowerCase();
  if (lower.includes('-latest')) return [0, lower];
  return [1, lower];
}

function sortModels(models: ModelConfig[]): ModelConfig[] {
  return [...models].sort((a, b) => {
    const [tierA, keyA] = modelSortKey(a.name);
    const [tierB, keyB] = modelSortKey(b.name);
    if (tierA !== tierB) return tierA - tierB;
    return keyB.localeCompare(keyA);
  });
}

const MISTRAL_EXCLUDED = /embed|ocr|moderation|transcribe|tts|voxtral|codestral/i;

async function fetchGeminiModels(apiKey: string): Promise<ModelConfig[]> {
  if (!apiKey) return PINNED_GEMINI_MODEL_CONFIGS;

  const url = `${GEMINI_API_BASE}/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Failed to fetch Gemini models:', res.status, res.statusText);
    return PINNED_GEMINI_MODEL_CONFIGS;
  }

  const data: ListGeminiModelsResponse = await res.json();
  if (!data.models) return PINNED_GEMINI_MODEL_CONFIGS;

  const models = sortModels(
    data.models
      .filter(m => {
        if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
        const name = m.name.startsWith('models/') ? m.name.slice(7) : m.name;
        return /gemini/i.test(name);
      })
      .map(m => {
        const name = m.name.startsWith('models/') ? m.name.slice(7) : m.name;
        return configFor(name, 'gemini');
      }),
  );

  return withPinnedModels(models, PINNED_GEMINI_MODELS, 'gemini');
}

async function fetchMistralModels(apiKey: string): Promise<ModelConfig[]> {
  if (!apiKey) return PINNED_MISTRAL_MODEL_CONFIGS;

  const res = await fetch(`${MISTRAL_API_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.warn('Failed to fetch Mistral models:', res.status, res.statusText);
    return PINNED_MISTRAL_MODEL_CONFIGS;
  }

  const data: ListMistralModelsResponse = await res.json();
  if (!data.data) return PINNED_MISTRAL_MODEL_CONFIGS;

  const models = sortModels(
    data.data
      .filter(m => {
        if (!m.id || m.archived) return false;
        if (m.capabilities && m.capabilities.completion_chat === false) return false;
        return !MISTRAL_EXCLUDED.test(m.id);
      })
      .map(m => configFor(m.id as string, 'mistral')),
  );

  return withPinnedModels(models, PINNED_MISTRAL_MODELS, 'mistral');
}

export async function fetchAvailableModels(geminiApiKey: string, mistralApiKey: string = ''): Promise<ModelConfig[]> {
  const [geminiModels, mistralModels] = await Promise.all([
    fetchGeminiModels(geminiApiKey),
    fetchMistralModels(mistralApiKey),
  ]);
  return [...geminiModels, ...mistralModels];
}
