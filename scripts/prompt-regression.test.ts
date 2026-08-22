import test from 'node:test';
import assert from 'node:assert/strict';

import { SENSITIVITY_LEVELS } from '../src/appState';
import {
  buildFastStoryPrompt,
  getStoryGenerationPipelineConfig,
  parseFastStoryResponse,
  runFastStoryGeneration,
} from '../src/pipeline';
import {
  PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
} from '../src/prompts/agent_prompts';
import { getSensitivityGuidance } from '../src/prompts/adjustment_modules';
import { STORY_STYLE_GUIDES } from '../src/prompts/author_styles';
import { NARRATOR_PERSONAS } from '../src/prompts/narrator_personas';
import {
  STORY_CRAFTING_GUIDES,
  STORY_FRAMEWORK_SUMMARIES,
} from '../src/prompts/story_crafting_guides';
import { STORY_SYSTEM_INSTRUCTION } from '../src/prompts/system_policy';
import { constructAgentPrompt } from '../src/utils';
import type { CommonInputs } from '../src/types';

test('prompt interpolation preserves replacement-string tokens', () => {
  const value = "$& $$ $` $' ${another_placeholder}";
  assert.equal(
    constructAgentPrompt('Before ${value} after', { value }),
    `Before ${value} after`,
  );
  assert.throws(
    () => constructAgentPrompt('${known} ${missing}', { known: 'ready' }),
    /missing data for: missing/,
  );
});

test('system policy defines stable precedence and source-data boundaries', () => {
  assert.match(STORY_SYSTEM_INSTRUCTION, /## Instruction priority/);
  assert.match(STORY_SYSTEM_INSTRUCTION, /Parental content-sensitivity guidance/);
  assert.match(STORY_SYSTEM_INSTRUCTION, /Preserve every explicitly supplied character name exactly/);
  assert.match(STORY_SYSTEM_INSTRUCTION, /BEGIN\/END data markers/);
});

test('framework-aware pipelines avoid forced expansion and duplicate consolidation', () => {
  const normal = getStoryGenerationPipelineConfig(true, "Dan Harmon's Story Circle");
  assert.ok(normal.some(agent => agent.name === 'Agent 2: Elaborator'));
  assert.equal(normal.filter(agent => agent.name === 'Agent C: Consolidator').length, 1);
  assert.ok(
    normal.findIndex(agent => agent.name === 'Agent C: Consolidator')
      > normal.findIndex(agent => agent.name === 'Agent 4: Polisher'),
  );

  for (const framework of ['Fable (Aesop Style)', 'Learning Fable (STEM)']) {
    const concise = getStoryGenerationPipelineConfig(true, framework);
    assert.ok(!concise.some(agent => agent.name === 'Agent 2: Elaborator'));
    assert.equal(concise.filter(agent => agent.name === 'Agent C: Consolidator').length, 1);
  }
});

test('standard and adventurous presets emit their non-default guidance', () => {
  const standard = getSensitivityGuidance(SENSITIVITY_LEVELS.standard);
  assert.match(standard, /Scary Elements: Extra Gentle/);

  const adventurous = getSensitivityGuidance(SENSITIVITY_LEVELS.adventurous);
  assert.match(adventurous, /Conflict Level: Adventurous/);
  assert.match(adventurous, /Complexity Level: Rich/);
});

test('crafter returns a story-only contract with delimited dynamic inputs', () => {
  assert.match(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, /BEGIN_CHARACTERS_DATA/);
  assert.match(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, /BEGIN_USER_STORY_REQUIREMENTS/);
  assert.match(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, /Return ONLY the narrative story body/);
  assert.doesNotMatch(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, /\*\*Story Structure Outline:\*\*/);
  assert.doesNotMatch(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, /\*\*Character Descriptions:\*\*/);
});

test('fast mode incorporates every creative option into one prompt', () => {
  const commonInputs: CommonInputs = {
    apiKey: 'test-key',
    modelId: 'test-model',
    minApiIntervalMs: 0,
    audience: 'UNIQUE_AUDIENCE',
    CRAFT_GUIDE_TEXT: 'UNIQUE_FRAMEWORK_GUIDE',
    FRAMEWORK_SUMMARY_TEXT: 'unused framework summary',
    READING_AGE_NOTE: 'UNIQUE_READING_GUIDANCE',
    USER_SUGGESTIONS_TEXT: 'UNIQUE_USER_REQUIREMENT',
    enableConsolidator: true,
    CONSOLIDATION_GUIDANCE_TEXT: 'UNIQUE_CONSOLIDATION_GUIDANCE',
    FAST_ENRICHMENT_GUIDANCE_TEXT: 'UNIQUE_ENRICHMENT_GUIDANCE',
    AUTHOR_STYLE_GUIDE: 'UNIQUE_AUTHOR_STYLE',
    AUTHOR_STYLE_SUMMARY_TEXT: 'unused author summary',
    ADJUSTMENT_MODULES_TEXT: 'UNIQUE_TONE_PACING_HUMOR_EMOTION',
    NARRATOR_PERSONA_TEXT: 'UNIQUE_NARRATOR_PERSONA',
    NARRATOR_PERSONA_SUMMARY_TEXT: 'unused narrator summary',
    SENSITIVITY_GUIDANCE_TEXT: 'UNIQUE_SENSITIVITY_GUIDANCE',
    agentThinkingConfig: {},
  };

  const prompt = buildFastStoryPrompt(
    { charactersList: 'UNIQUE_CHARACTER_NAME' },
    commonInputs,
  );

  for (const expected of [
    'UNIQUE_AUDIENCE',
    'UNIQUE_FRAMEWORK_GUIDE',
    'UNIQUE_READING_GUIDANCE',
    'UNIQUE_USER_REQUIREMENT',
    'UNIQUE_CONSOLIDATION_GUIDANCE',
    'UNIQUE_ENRICHMENT_GUIDANCE',
    'UNIQUE_AUTHOR_STYLE',
    'UNIQUE_TONE_PACING_HUMOR_EMOTION',
    'UNIQUE_NARRATOR_PERSONA',
    'UNIQUE_SENSITIVITY_GUIDANCE',
    'UNIQUE_CHARACTER_NAME',
  ]) {
    assert.match(prompt, new RegExp(expected));
  }
  assert.match(prompt, /Silent single-pass publishing workflow/);
  assert.match(prompt, /"title":"Pip and the Blue Kite","story":/);
  assert.doesNotMatch(prompt, /\$\{[A-Za-z_][A-Za-z0-9_]*\}/);
});

test('fast mode parses strict JSON and safely tolerates code fences', () => {
  const story = 'Ada followed the map through the garden. '.repeat(8).trim();
  assert.deepEqual(
    parseFastStoryResponse(JSON.stringify({ title: 'Ada and the Garden Map', story })),
    { titleText: 'Ada and the Garden Map', storyText: story },
  );
  assert.deepEqual(
    parseFastStoryResponse(`\`\`\`json\n${JSON.stringify({ title: '"Ada Returns"', story })}\n\`\`\``),
    { titleText: 'Ada Returns', storyText: story },
  );
  assert.throws(() => parseFastStoryResponse('not json'), /invalid JSON/);
  assert.throws(
    () => parseFastStoryResponse(JSON.stringify({ title: 'Too Short', story: 'Tiny.' })),
    /unusually short story/,
  );
  assert.throws(
    () => parseFastStoryResponse(JSON.stringify({ title: 123, story })),
    /without a valid title/,
  );
});

test('fast mode performs one logical agent call', async () => {
  const story = 'Pip followed the blue kite across the sunny field. '.repeat(8).trim();
  const commonInputs: CommonInputs = {
    apiKey: 'test-key',
    modelId: 'test-model',
    minApiIntervalMs: 0,
    audience: 'children aged 7-8',
    CRAFT_GUIDE_TEXT: 'Use a beginning, challenge, and resolution.',
    FRAMEWORK_SUMMARY_TEXT: 'A compact cause-and-effect story.',
    READING_AGE_NOTE: '',
    USER_SUGGESTIONS_TEXT: '',
    enableConsolidator: false,
    CONSOLIDATION_GUIDANCE_TEXT: 'Do not run a separate shortening pass.',
    FAST_ENRICHMENT_GUIDANCE_TEXT: 'Add only useful detail.',
    AUTHOR_STYLE_GUIDE: 'Use clear prose.',
    AUTHOR_STYLE_SUMMARY_TEXT: 'Clear prose.',
    ADJUSTMENT_MODULES_TEXT: '',
    NARRATOR_PERSONA_TEXT: '',
    NARRATOR_PERSONA_SUMMARY_TEXT: '',
    SENSITIVITY_GUIDANCE_TEXT: '',
    agentThinkingConfig: {},
  };
  let calls = 0;

  const result = await runFastStoryGeneration(
    { charactersList: 'Pip', storyText: '', reviewText: '', titleText: '' },
    commonInputs,
    null,
    async () => {
      calls += 1;
      return JSON.stringify({ title: 'Pip and the Blue Kite', story });
    },
  );

  assert.equal(calls, 1);
  assert.equal(result.titleText, 'Pip and the Blue Kite');
  assert.equal(result.storyText, story);
});

test('high-risk framework instructions use child-safe adaptations', () => {
  const saveTheCat = STORY_CRAFTING_GUIDES['Save the Cat! Beat Sheet'];
  const snowflake = STORY_CRAFTING_GUIDES['Snowflake Method (Iterative Expansion)'];
  const forest = STORY_CRAFTING_GUIDES['Grimms’ Fairy-Tale Pattern (“Forest Path”)'];
  const hiddenBeast = STORY_CRAFTING_GUIDES['Grimms’ Hidden-Beast Pattern (“Animal Bridegroom”)'];
  const siblingQuest = STORY_CRAFTING_GUIDES['Grimms’ Sibling-Quest Pattern (“Swans & Stars”)'];
  const fable = STORY_CRAFTING_GUIDES['Fable (Aesop Style)'];

  assert.match(saveTheCat, /Condensed Short-Story Beat Sheet/);
  assert.doesNotMatch(saveTheCat, /whiff of death/i);
  assert.match(snowflake, /planning process, not an in-story beat structure/);
  assert.match(forest, /Never use graphic injury, dismemberment, or cruel death/);
  assert.doesNotMatch(hiddenBeast, /romantic-gothic/i);
  assert.doesNotMatch(siblingQuest, /execution stroke/i);
  assert.match(fable, /400-500 words maximum/);
  assert.match(fable, /framework-specific target overrides this default/);
});

test('all framework, sensitivity, and audience combinations assemble safely', () => {
  const audiences = ['children aged 3-4', 'children aged 7-8', 'teenagers aged 13-15'];
  const style = STORY_STYLE_GUIDES['Default (No Specific Style)'];
  const narrator = NARRATOR_PERSONAS['Default (No Narrator Persona)'];

  for (const [frameworkKey, craftGuide] of Object.entries(STORY_CRAFTING_GUIDES)) {
    const frameworkSummary = STORY_FRAMEWORK_SUMMARIES[frameworkKey];
    assert.ok(frameworkSummary, `Missing summary for ${frameworkKey}`);

    for (const preset of Object.values(SENSITIVITY_LEVELS)) {
      for (const audience of audiences) {
        const common: Record<string, string> = {
          audience,
          CRAFT_GUIDE_TEXT: craftGuide,
          FRAMEWORK_SUMMARY_TEXT: frameworkSummary,
          READING_AGE_NOTE: '',
          USER_SUGGESTIONS_TEXT: 'Keep Ada and Pip as the supplied names.',
          CONSOLIDATION_GUIDANCE_TEXT: 'Tighten only genuine redundancy.',
          FAST_ENRICHMENT_GUIDANCE_TEXT: 'Add at most one useful scene.',
          AUTHOR_STYLE_GUIDE: style,
          AUTHOR_STYLE_SUMMARY_TEXT: 'Clear, neutral children’s prose.',
          ADJUSTMENT_MODULES_TEXT: '',
          NARRATOR_PERSONA_TEXT: narrator,
          NARRATOR_PERSONA_SUMMARY_TEXT: '',
          SENSITIVITY_GUIDANCE_TEXT: getSensitivityGuidance(preset),
        };
        const pipelineData: Record<string, string> = {
          charactersList: 'Ada, Pip',
          storyText: 'Ada and Pip found a puzzling map.',
          reviewText: '[OPTIONAL] Tighten one sentence.',
          titleText: '',
        };

        for (const agent of getStoryGenerationPipelineConfig(true, frameworkKey)) {
          const data = Object.fromEntries(
            agent.dataKeys.map(key => [key, common[key] ?? pipelineData[key] ?? '']),
          );
          const prompt = constructAgentPrompt(agent.promptTemplate, data);
          assert.doesNotMatch(prompt, /\$\{[A-Za-z_][A-Za-z0-9_]*\}/);
          assert.match(prompt, new RegExp(audience.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        }

        const fastPrompt = buildFastStoryPrompt(
          pipelineData,
          {
            ...common,
            apiKey: 'test-key',
            modelId: 'test-model',
            minApiIntervalMs: 0,
            enableConsolidator: true,
            agentThinkingConfig: {},
          } as CommonInputs,
        );
        assert.doesNotMatch(fastPrompt, /\$\{[A-Za-z_][A-Za-z0-9_]*\}/);
        assert.match(fastPrompt, new RegExp(audience.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
    }
  }
});
