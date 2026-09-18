import type { ModelConfig } from './types';

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

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
  label: 'Gemini 3.5 Flash-Lite (recommended)',
  supportsThinking: detectThinkingSupport(DEFAULT_MODEL),
};

export const PINNED_MODEL_CONFIGS: ModelConfig[] = [DEFAULT_MODEL_CONFIG];

export async function fetchAvailableModels(_apiKey: string): Promise<ModelConfig[]> {
  return PINNED_MODEL_CONFIGS;
}
