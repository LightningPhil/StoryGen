#!/usr/bin/env npx tsx
/**
 * StoryGen Batch Generator
 * 
 * Reads a TSV file and generates stories one row at a time through the full
 * multi-agent pipeline. Outputs completed story JSON files to stories/inbox/
 * ready for ingestion via `npm run ingest`.
 *
 * Usage:  npx tsx scripts/batch-generate.ts [path-to-tsv] [--api-key=KEY]
 *         npm run batch -- stories/batch.tsv --api-key=YOUR_KEY
 *
 * Environment:  set GEMINI_API_KEY=your-key-here
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Import existing StoryGen modules ────────────────────────────────────────
import { STORY_CRAFTING_GUIDES } from '../src/prompts/story_crafting_guides';
import { STORY_STYLE_GUIDES } from '../src/prompts/author_styles';
import { NARRATOR_PERSONAS } from '../src/prompts/narrator_personas';
import { ADJUSTMENT_MODULES, getSensitivityGuidance } from '../src/prompts/adjustment_modules';
import {
  READING_AGE_ADJUSTMENT_TEXT_TEMPLATE,
  PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
  PROMPT_AGENT_2_ELABORATOR_TEMPLATE,
  PROMPT_AGENT_3_REVIEWER_TEMPLATE,
  PROMPT_AGENT_4_POLISHER_TEMPLATE,
  PROMPT_AGENT_5_CLEANER_TEMPLATE,
  PROMPT_AGENT_6_TITLER_TEMPLATE,
  PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE,
} from '../src/prompts/agent_prompts';
import { SENSITIVITY_LEVELS } from '../src/appState';

// ── Constants ────────────────────────────────────────────────────────────────
const MODEL_ID = 'gemini-2.0-flash';
const INTER_STORY_DELAY_MS = 20_000;  // 20s between API calls to avoid rate limits
const MIN_API_INTERVAL_MS = 4_000;     // 4s between individual agent calls within a pipeline
const MAX_RETRIES = 4;
const RETRY_DELAYS = [8_000, 15_000, 25_000, 40_000];
const INBOX_DIR = path.resolve(import.meta.dirname!, '..', 'stories', 'inbox');

// ── Short-name lookup maps ──────────────────────────────────────────────────

const FRAMEWORK_SHORTCUTS: Record<string, string> = {
  'story_circle':       "Dan Harmon's Story Circle",
  'three_act':          'Three-Act Structure',
  'kishotenketsu':      'Kishōtenketsu',
  'freytag':            "Freytag's Pyramid",
  'hero_journey':       "Hero's Journey (Condensed)",
  'but_therefore':      '"But, Therefore" Chain',
  'pixar_spine':        'Pixar Story Spine',
  'chekhov':            "Chekhov's Sketch",
  'save_the_cat':       'Save the Cat! Beat Sheet',
  'seven_point':        'Seven-Point Story Structure',
  'snowflake':          'Snowflake Method (Iterative Expansion)',
  'fichtean':           'Fichtean Curve ("Crisis Ladder")',
  'grimm_forest':       'Grimms\' Fairy-Tale Pattern ("Forest Path")',
  'grimm_mirror':       'Grimms\' Wish-Mirror Pattern ("Rippled Lake")',
  'grimm_beast':        'Grimms\' Hidden-Beast Pattern ("Animal Bridegroom")',
  'grimm_sibling':      'Grimms\' Sibling-Quest Pattern ("Swans & Stars")',
  'grimm_trickster':    'Grimms\' Trickster-Triumph Pattern ("Clever Tailor")',
  'fable':              'Fable (Aesop Style)',
  'stem_fable':         'Learning Fable (STEM)',
};

const STYLE_SHORTCUTS: Record<string, string> = {
  'default':    'Default (No Specific Style)',
  'dahl':       'Imaginative & Bold (Dahl/Walliams)',
  'donaldson':  'Musical & Warm (Donaldson)',
  'gentle':     'Gentle & Reassuring (Kerr/Bond)',
  'classic':    'Classic Adventure & Morals (Grimm/Lewis/Blyton)',
  'ghibli':     'Atmospheric & Empathetic (Ghibli)',
};

const NARRATOR_SHORTCUTS: Record<string, string> = {
  'default':      'Default (No Narrator Persona)',
  'grandfather':  'Wise Grandfather',
  'adventurer':   'Adventurer',
  'silly':        'Silly Friend',
  'owl':          'Wise Owl',
  'bard':         'Epic Bard',
};

const SENSITIVITY_SHORTCUTS: Record<string, string> = {
  'extra_gentle': 'extra_gentle',
  'gentle':       'gentle',
  'standard':     'standard',
  'adventurous':  'adventurous',
};

const AGE_GROUP_LABELS: Record<string, string> = {
  '3-4':   'children aged 3-4',
  '5-6':   'children aged 5-6',
  '7-8':   'children aged 7-8',
  '9-10':  'children aged 9-10',
  '11-12': 'children aged 11-12',
  '13-15': 'teenagers aged 13-15',
  '16-18': 'young adults aged 16-18',
  '18+':   'adults',
};

// ── CSV parsing ─────────────────────────────────────────────────────────────

interface CsvRow {
  characters: string;
  audience: string;
  age_group: string;
  framework: string;
  style: string;
  narrator: string;
  tone: string;
  pacing: string;
  humor: string;
  emotion: string;
  sensitivity: string;
  reading_age: string;
  consolidator: string;
  user_suggestions: string;
  stem_concept: string;
}

function parseTsv(filePath: string): CsvRow[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) {
    throw new Error('TSV must have a header row and at least one data row.');
  }

  const header = lines[0].split('\t').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (values[j] || '').trim();
    }
    rows.push(row as unknown as CsvRow);
  }
  return rows;
}

// ── Resolve short names to full prompt text ─────────────────────────────────

function resolveFramework(shortName: string): { key: string; text: string } {
  if (!shortName || shortName === 'default') {
    const key = "Dan Harmon's Story Circle";
    return { key, text: STORY_CRAFTING_GUIDES[key] || '' };
  }
  const fullKey = FRAMEWORK_SHORTCUTS[shortName.toLowerCase()];
  if (fullKey) {
    return { key: fullKey, text: STORY_CRAFTING_GUIDES[fullKey] || '' };
  }
  // Try direct match against full names
  if (STORY_CRAFTING_GUIDES[shortName]) {
    return { key: shortName, text: STORY_CRAFTING_GUIDES[shortName] };
  }
  console.warn(`  ⚠ Unknown framework "${shortName}", falling back to Story Circle`);
  const key = "Dan Harmon's Story Circle";
  return { key, text: STORY_CRAFTING_GUIDES[key] || '' };
}

function resolveStyle(shortName: string): { key: string; text: string } {
  if (!shortName || shortName === 'default') {
    const key = 'Default (No Specific Style)';
    return { key, text: STORY_STYLE_GUIDES[key] || '' };
  }
  const fullKey = STYLE_SHORTCUTS[shortName.toLowerCase()];
  if (fullKey) {
    return { key: fullKey, text: STORY_STYLE_GUIDES[fullKey] || '' };
  }
  if (STORY_STYLE_GUIDES[shortName]) {
    return { key: shortName, text: STORY_STYLE_GUIDES[shortName] };
  }
  console.warn(`  ⚠ Unknown style "${shortName}", falling back to Default`);
  const key = 'Default (No Specific Style)';
  return { key, text: STORY_STYLE_GUIDES[key] || '' };
}

function resolveNarrator(shortName: string): { key: string; text: string } {
  if (!shortName || shortName === 'default' || shortName === 'none') {
    return { key: 'Default (No Narrator Persona)', text: '' };
  }
  const fullKey = NARRATOR_SHORTCUTS[shortName.toLowerCase()];
  if (fullKey) {
    return { key: fullKey, text: (NARRATOR_PERSONAS as Record<string, string>)[fullKey] || '' };
  }
  if ((NARRATOR_PERSONAS as Record<string, string>)[shortName]) {
    return { key: shortName, text: (NARRATOR_PERSONAS as Record<string, string>)[shortName] };
  }
  console.warn(`  ⚠ Unknown narrator "${shortName}", using no persona`);
  return { key: 'Default (No Narrator Persona)', text: '' };
}

function buildAdjustmentModulesText(row: CsvRow): string {
  const parts: string[] = [];
  const tone = (row.tone || '').toLowerCase();
  const pacing = (row.pacing || '').toLowerCase();
  const humor = (row.humor || '').toLowerCase();
  const emotion = (row.emotion || '').toLowerCase();

  if (tone && tone !== 'none' && tone !== 'default' && ADJUSTMENT_MODULES.tone?.[tone]) {
    parts.push(ADJUSTMENT_MODULES.tone[tone]);
  }
  if (pacing && pacing !== 'default' && ADJUSTMENT_MODULES.pacing?.[pacing]) {
    parts.push(ADJUSTMENT_MODULES.pacing[pacing]);
  }
  if (humor && humor !== 'none' && humor !== 'default' && ADJUSTMENT_MODULES.humor?.[humor]) {
    parts.push(ADJUSTMENT_MODULES.humor[humor]);
  }
  if (emotion && emotion !== 'default' && ADJUSTMENT_MODULES.emotion?.[emotion]) {
    parts.push(ADJUSTMENT_MODULES.emotion[emotion]);
  }
  return parts.join('\n\n');
}

function buildSensitivityText(shortName: string): string {
  if (!shortName || shortName === 'standard' || shortName === 'default') return '';
  const key = SENSITIVITY_SHORTCUTS[shortName.toLowerCase()] || shortName.toLowerCase();
  const preset = SENSITIVITY_LEVELS[key];
  if (!preset) {
    console.warn(`  ⚠ Unknown sensitivity "${shortName}", using standard`);
    return '';
  }
  return getSensitivityGuidance({
    conflict: preset.conflict,
    scary: preset.scary,
    sadness: preset.sadness,
    complexity: preset.complexity,
  });
}

function buildReadingAgeNote(readingAge: string): string {
  if (!readingAge) return '';
  const age = parseInt(readingAge, 10);
  if (isNaN(age) || age < 2 || age > 18) return '';
  return READING_AGE_ADJUSTMENT_TEXT_TEMPLATE
    .replace(/\$\{targetReadingAge\}/g, String(age))
    .replace(/\$\{TARGET_READING_AGE\}/g, String(age));
}

function buildAudience(ageGroup: string, audience: string): string {
  const label = AGE_GROUP_LABELS[ageGroup] || '';
  if (label && audience) return `${label}, ${audience}`;
  if (label) return label;
  if (audience) return audience;
  return 'children aged 5-7';
}

// ── Minimal API call (standalone, no DOM dependencies) ──────────────────────

let lastApiFetchTimestamp = 0;

async function callApi(
  prompt: string,
  apiKey: string,
  modelId: string,
  agentName: string,
  retryAttempt: number = 0,
): Promise<string> {
  // Rate limiting
  const now = Date.now();
  const elapsed = now - lastApiFetchTimestamp;
  if (elapsed < MIN_API_INTERVAL_MS && retryAttempt === 0) {
    const wait = MIN_API_INTERVAL_MS - elapsed;
    await sleep(wait);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {},
    safetySettings: [
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  if (retryAttempt === 0) {
    lastApiFetchTimestamp = Date.now();
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Handle retryable errors
  if (response.status === 503 || response.status === 429) {
    if (retryAttempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryAttempt];
      process.stdout.write(` [retry ${retryAttempt + 1}, ${delay/1000}s]`);
      await sleep(delay);
      return callApi(prompt, apiKey, modelId, agentName, retryAttempt + 1);
    }
    throw new Error(`${agentName}: Rate limit/overload after ${MAX_RETRIES} retries (${response.status})`);
  }

  const data = await response.json() as Record<string, any>;

  // Retryable model-busy in response body
  if (data.error?.message && (data.error.message.includes('overload') || data.error.message.includes('busy'))) {
    if (retryAttempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryAttempt];
      process.stdout.write(` [busy, retry ${retryAttempt + 1}]`);
      await sleep(delay);
      return callApi(prompt, apiKey, modelId, agentName, retryAttempt + 1);
    }
    throw new Error(`${agentName}: Model busy after ${MAX_RETRIES} retries`);
  }

  if (!response.ok) {
    const msg = data.error?.message || `HTTP ${response.status}`;
    throw new Error(`${agentName} API Error: ${msg}`);
  }

  // Check for blocked content
  if (data.promptFeedback?.blockReason) {
    throw new Error(`${agentName}: Prompt blocked - ${data.promptFeedback.blockReason}`);
  }

  // Extract text
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error(`${agentName}: No text in response`);
  }

  return text;
}

// ── Pipeline runner ─────────────────────────────────────────────────────────

interface AgentDef {
  name: string;
  promptTemplate: string;
  dataKeys: string[];
  outputKey: string;
  step?: string;
}

function constructPrompt(template: string, data: Record<string, string>): string {
  let prompt = template;
  for (const key in data) {
    const value = typeof data[key] === 'string' ? data[key] : '';
    const placeholder = new RegExp(`\\$\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
    prompt = prompt.replace(placeholder, value);
  }
  return prompt;
}

function buildPipeline(enableConsolidator: boolean): AgentDef[] {
  const crafter: AgentDef  = { name: "Agent 1: Story Crafter",  promptTemplate: PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, dataKeys: ['charactersList', 'audience', 'USER_SUGGESTIONS_TEXT', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
  const elaborator: AgentDef = { name: "Agent 2: Elaborator",   promptTemplate: PROMPT_AGENT_2_ELABORATOR_TEMPLATE,    dataKeys: ['storyText', 'audience', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
  const consolidator: AgentDef = { name: "Agent C: Consolidator", promptTemplate: PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE, dataKeys: ['storyText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
  const reviewer: AgentDef = { name: "Agent 3: Reviewer",       promptTemplate: PROMPT_AGENT_3_REVIEWER_TEMPLATE,      dataKeys: ['storyText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'reviewText' };
  const polisher: AgentDef = { name: "Agent 4: Polisher",       promptTemplate: PROMPT_AGENT_4_POLISHER_TEMPLATE,      dataKeys: ['storyText', 'reviewText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
  const cleaner: AgentDef  = { name: "Agent 5: Cleaner",        promptTemplate: PROMPT_AGENT_5_CLEANER_TEMPLATE,       dataKeys: ['storyText'], outputKey: 'storyText' };
  const titler: AgentDef   = { name: "Agent 6: Titler",         promptTemplate: PROMPT_AGENT_6_TITLER_TEMPLATE,        dataKeys: ['storyText', 'READING_AGE_NOTE'], outputKey: 'titleText' };

  const pipeline: AgentDef[] = [crafter, elaborator];
  if (enableConsolidator) pipeline.push(consolidator);
  pipeline.push(reviewer, polisher);
  if (enableConsolidator) pipeline.push(consolidator);
  pipeline.push(cleaner, titler);

  return pipeline.map((a, i) => ({ ...a, step: `${i + 1}/${pipeline.length}` }));
}

async function runPipeline(
  pipeline: AgentDef[],
  commonInputs: Record<string, string>,
  pipelineData: Record<string, string>,
  apiKey: string,
): Promise<Record<string, string>> {
  const data = { ...pipelineData };

  for (const agent of pipeline) {
    process.stdout.write(`  ${agent.step} ${agent.name.split(': ')[1] || agent.name}`);

    // Build data object for this agent
    const agentData: Record<string, string> = {};
    for (const key of agent.dataKeys) {
      if (key in commonInputs) agentData[key] = commonInputs[key];
      else if (key in data) agentData[key] = data[key];
      else agentData[key] = '';
    }

    const prompt = constructPrompt(agent.promptTemplate, agentData);
    const result = await callApi(prompt, apiKey, MODEL_ID, agent.name);
    data[agent.outputKey] = result;

    process.stdout.write(' ✓\n');
  }

  return data;
}

// ── Save story to inbox ─────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function saveStoryToInbox(
  storyText: string,
  titleText: string,
  row: CsvRow,
  frameworkKey: string,
  styleKey: string,
  index: number,
): string {
  // Clean up the title (remove quotes, markdown, etc.)
  let title = titleText.replace(/^["'#*]+|["'#*]+$/g, '').trim();
  if (!title) title = `Batch Story ${index + 1}`;

  const story = {
    title,
    markdown: storyText,
    characters: row.characters || '',
    audience: buildAudience(row.age_group, row.audience),
    framework: frameworkKey,
    style: styleKey,
    date: new Date().toISOString(),
    tone: row.tone || undefined,
    pacing: row.pacing || undefined,
    humor: row.humor || undefined,
    emotion: row.emotion || undefined,
    model: MODEL_ID,
    readingAge: row.reading_age ? parseInt(row.reading_age, 10) : undefined,
    consolidator: (row.consolidator || '').toLowerCase() === 'true' || (row.consolidator || '').toLowerCase() === 'yes',
    wordCount: countWords(storyText),
    ageGroup: row.age_group || undefined,
  };

  // Clean undefined values
  const cleaned = JSON.parse(JSON.stringify(story));

  // Use a safe filename
  const safeName = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  const filename = `batch-${String(index + 1).padStart(3, '0')}-${safeName}.json`;
  const filePath = path.join(INBOX_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf-8');
  return filename;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  let tsvPath = path.resolve('stories', 'batch.tsv');
  let apiKey = process.env.GEMINI_API_KEY || '';

  for (const arg of args) {
    if (arg.startsWith('--api-key=')) {
      apiKey = arg.split('=').slice(1).join('=');
    } else if (!arg.startsWith('--')) {
      tsvPath = path.resolve(arg);
    }
  }

  if (!apiKey) {
    console.error('Error: No API key. Set GEMINI_API_KEY env var or pass --api-key=KEY');
    process.exit(1);
  }

  if (!fs.existsSync(tsvPath)) {
    console.error(`Error: TSV file not found: ${tsvPath}`);
    process.exit(1);
  }

  // Ensure inbox dir exists
  fs.mkdirSync(INBOX_DIR, { recursive: true });

  console.log('╔════════════════════════════════════════╗');
  console.log('║    StoryGen Batch Generator            ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`Model:  ${MODEL_ID}`);
  console.log(`TSV:    ${tsvPath}`);
  console.log(`Output: ${INBOX_DIR}\n`);

  const rows = parseTsv(tsvPath);
  console.log(`Found ${rows.length} stories to generate.\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const storyNum = `[${i + 1}/${rows.length}]`;

    // Wait between stories (not before the first one)
    if (i > 0) {
      process.stdout.write(`  Waiting ${INTER_STORY_DELAY_MS / 1000}s before next story...\n`);
      await sleep(INTER_STORY_DELAY_MS);
    }

    console.log(`\n${storyNum} Generating story...`);
    console.log(`  Characters: ${row.characters || '(default)'}`);

    try {
      // Resolve all settings
      const framework = resolveFramework(row.framework);
      const style = resolveStyle(row.style);
      const narrator = resolveNarrator(row.narrator);
      const enableConsolidator = (row.consolidator || '').toLowerCase() === 'true' || (row.consolidator || '').toLowerCase() === 'yes';

      // Handle STEM concept augmentation
      let craftGuideText = framework.text;
      if (framework.key === 'Learning Fable (STEM)' && row.stem_concept) {
        craftGuideText += `\n\nSTEM Concept to teach: ${row.stem_concept}`;
      }

      const commonInputs: Record<string, string> = {
        audience: buildAudience(row.age_group, row.audience),
        CRAFT_GUIDE_TEXT: craftGuideText,
        READING_AGE_NOTE: buildReadingAgeNote(row.reading_age),
        USER_SUGGESTIONS_TEXT: row.user_suggestions || '',
        AUTHOR_STYLE_GUIDE: style.text,
        ADJUSTMENT_MODULES_TEXT: buildAdjustmentModulesText(row),
        NARRATOR_PERSONA_TEXT: narrator.text,
        SENSITIVITY_GUIDANCE_TEXT: buildSensitivityText(row.sensitivity),
      };

      const initialData: Record<string, string> = {
        charactersList: row.characters || 'a brave little mouse',
        storyText: '',
        reviewText: '',
        titleText: '',
      };

      const pipeline = buildPipeline(enableConsolidator);
      const result = await runPipeline(pipeline, commonInputs, initialData, apiKey);

      if (!result.storyText || result.storyText.trim().length < 100) {
        throw new Error('Story text too short or empty — likely a generation failure');
      }

      const filename = saveStoryToInbox(result.storyText, result.titleText || '', row, framework.key, style.key, i);
      const title = (result.titleText || '').replace(/^["'#*]+|["'#*]+$/g, '').trim();
      console.log(`${storyNum} ✓ Saved: "${title || 'Untitled'}" → ${filename} (${countWords(result.storyText)} words)`);
      successCount++;

    } catch (err: any) {
      failCount++;
      console.error(`${storyNum} ✗ FAILED: ${err.message || err}`);
      // Continue to next story
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`Done! ${successCount} succeeded, ${failCount} failed out of ${rows.length} total.`);
  if (successCount > 0) {
    console.log(`\nStories saved to: ${INBOX_DIR}`);
    console.log('Run "npm run ingest" to add them to the public library.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
