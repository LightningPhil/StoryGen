import type { SavedStory } from './storyLibrary';
import type { StoryMetadata } from './types';
import { STORY_CRAFTING_GUIDES } from './prompts/story_crafting_guides';
import { lookupByNormalizedKey } from './lookupKeys';

export const AGE_GROUP_LABELS: Record<string, string> = {
  '3-4': 'children aged 3-4',
  '5-6': 'children aged 5-6',
  '7-8': 'children aged 7-8',
  '9-10': 'children aged 9-10',
  '11-12': 'children aged 11-12',
  '13-15': 'teenagers aged 13-15',
  '16-18': 'young adults aged 16-18',
  '18+': 'adults',
};

export function canonicalizeFrameworkKey(key: string): string {
  return lookupByNormalizedKey(STORY_CRAFTING_GUIDES, key)?.key || key;
}

export function resolveFrameworkGuide(key: string): string {
  return lookupByNormalizedKey(STORY_CRAFTING_GUIDES, key)?.value || '';
}

export function buildAudienceLabel(ageGroup: string, audience: string): string {
  const label = AGE_GROUP_LABELS[ageGroup] || '';
  const extra = audience.trim();
  if (label && extra) return `${label}, ${extra}`;
  if (label) return label;
  if (extra) return extra;
  return 'children aged 5-7';
}

// Mirrors StoryMetadata's optionality so a story loaded from the library can be
// fed straight back in without losing fields older records never stored.
export interface StoryFieldSnapshot {
  title: string;
  markdown?: string;
  characters?: string;
  audience?: string;
  ageGroup?: string;
  framework?: string;
  style?: string;
  narrator?: string;
  tone?: string;
  pacing?: string;
  humor?: string;
  emotion?: string;
  model?: string;
  readingAge?: number | null;
  consolidator?: boolean;
  wordCount?: number;
  plotPoints?: string;
  date?: string;
  author?: string;
  tags?: string[];
}

export function buildStoryMetadata(fields: StoryFieldSnapshot): StoryMetadata {
  return {
    title: fields.title,
    date: fields.date || new Date().toISOString(),
    characters: fields.characters,
    audience: fields.audience,
    ageGroup: fields.ageGroup || undefined,
    framework: fields.framework,
    style: fields.style,
    narrator: fields.narrator,
    tone: fields.tone,
    pacing: fields.pacing,
    humor: fields.humor,
    emotion: fields.emotion,
    model: fields.model,
    readingAge: fields.readingAge ?? null,
    consolidator: fields.consolidator,
    wordCount: fields.wordCount,
    plotPoints: fields.plotPoints,
    author: fields.author,
    tags: fields.tags,
  };
}

export function buildSavedStory(fields: StoryFieldSnapshot & { markdown: string }): SavedStory {
  const meta = buildStoryMetadata(fields);
  return {
    title: meta.title,
    markdown: fields.markdown,
    characters: fields.characters || '',
    audience: fields.audience || '',
    framework: fields.framework || '',
    style: fields.style || '',
    date: meta.date,
    tone: fields.tone,
    pacing: fields.pacing,
    humor: fields.humor,
    emotion: fields.emotion,
    model: fields.model,
    readingAge: fields.readingAge ?? null,
    consolidator: fields.consolidator,
    wordCount: fields.wordCount,
    plotPoints: fields.plotPoints,
    ageGroup: fields.ageGroup || undefined,
    narrator: fields.narrator,
  };
}
