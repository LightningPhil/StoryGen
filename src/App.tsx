import { useState, useCallback, useRef, useEffect } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { StoryPanel } from './components/StoryPanel';
import { SettingsModal } from './components/SettingsModal';
import { FrameworkSelectModal } from './components/FrameworkSelectModal';
import { StyleSelectModal } from './components/StyleSelectModal';
import { HelpModal } from './components/HelpModal';
import { StoryLibraryModal } from './components/StoryLibraryModal';
import { OnlineStoryBrowser } from './components/OnlineStoryBrowser';
import { Toast, ToastContainer } from './components/Toast';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearAllAppData,
  LS_THEME,
  LS_CHARACTERS,
  LS_AUDIENCE,
  LS_SELECTED_FRAMEWORK,
  LS_SELECTED_AUTHOR_STYLE,
  LS_USER_SUGGESTIONS,
  LS_INCLUDE_PLOT_POINTS,
  LS_ADJUST_READING_AGE_ENABLED,
  LS_TARGET_READING_AGE,
  LS_ENABLE_CONSOLIDATOR,
  LS_EXPERIMENTAL_FAST_MODE,
  LS_SENSITIVITY_PRESET,
  LS_SENSITIVITY_CONFLICT,
  LS_SENSITIVITY_SCARY,
  LS_SENSITIVITY_SADNESS,
  LS_SENSITIVITY_COMPLEXITY,
  LS_API_KEY,
  LS_SELECTED_MODEL,
  LS_MIN_API_INTERVAL,
  LS_THINKING_ENABLED,
  LS_THINKING_AGENT_1_CRAFTER,
  LS_THINKING_AGENT_2_ELABORATOR,
  LS_THINKING_AGENT_3_REVIEWER,
  LS_THINKING_AGENT_4_POLISHER,
  LS_THINKING_AGENT_5_CLEANER,
  LS_THINKING_AGENT_6_TITLER,
  LS_THINKING_AGENT_C_CONSOLIDATOR,
  LS_THINKING_AGENT_FAST,
  LS_ADJUSTMENT_TONE,
  LS_ADJUSTMENT_PACING,
  LS_ADJUSTMENT_HUMOR,
  LS_ADJUSTMENT_EMOTION,
  LS_AGE_GROUP,
  LS_STEM_CONCEPT,
  LS_READING_AGE_MIN,
  LS_READING_AGE_MAX,
  LS_TTS_SOURCE,
  LS_TTS_GENDER,
  LS_TTS_VOICE,
  LS_NARRATOR_PERSONA,
} from './localStorage';
import appState from './appState';
import { SENSITIVITY_LEVELS } from './appState';
import { parseCharacters, countWords, formatUserStoryRequirements, sanitizeGeneratedTitle } from './utils';
import { STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides';
import { STORY_STYLE_GUIDES, STORY_STYLE_SUMMARIES } from './prompts/author_styles';
import { NARRATOR_PERSONAS, PERSONA_SUMMARIES } from './prompts/narrator_personas';
import { ADJUSTMENT_MODULES, getSensitivityGuidance } from './prompts/adjustment_modules';
import { READING_AGE_ADJUSTMENT_TEXT_TEMPLATE } from './prompts/agent_prompts';
import {
  runPipeline,
  runFastStoryGeneration,
  getStoryGenerationPipelineConfig,
  getElaborationPipelineConfig,
  frameworkUsesConcisePipeline,
  FAST_STORY_AGENT_NAME,
} from './pipeline';
import { saveStoryToLibrary } from './storyLibrary';
import { formatStoryAsHtml } from './formatStory';
import type { SensitivitySettings, ModelConfig, CommonInputs } from './types';
import { fetchAvailableModels, DEFAULT_MODEL, DEFAULT_MODEL_CONFIG } from './modelDiscovery';
import { isAbortError } from './api';
import { StoryMetadataModal } from './components/StoryMetadataModal';
import type { StoryMetadata } from './types';
import {
  canonicalizeFrameworkKey,
  resolveFrameworkGuide,
  buildAudienceLabel,
  buildStoryMetadata,
  buildSavedStory,
} from './storyMetadata';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

type AgentThinkingKey =
  | 'crafter'
  | 'elaborator'
  | 'reviewer'
  | 'polisher'
  | 'cleaner'
  | 'titler'
  | 'consolidator'
  | 'fast';

const DEFAULT_FRAMEWORK = "Dan Harmon's Story Circle";
const DEFAULT_STYLE = 'Default (No Specific Style)';

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Reads an integer setting, falling back when the stored value is missing or
 * unparseable. A bare parseInt would yield NaN and break sliders and labels.
 */
function loadNumber(key: string, fallback: number): number {
  const parsed = parseInt(loadFromLocalStorage(key) ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeReadingAgeRange(min: number, max: number): { min: number; max: number } {
  const safeMin = clampNumber(Number.isFinite(min) ? min : 5, 3, 18);
  const safeMax = clampNumber(Number.isFinite(max) ? max : 12, 3, 18);
  return safeMin <= safeMax
    ? { min: safeMin, max: safeMax }
    : { min: safeMax, max: safeMin };
}

function loadReadingAgeRange(): { min: number; max: number } {
  return normalizeReadingAgeRange(loadNumber(LS_READING_AGE_MIN, 5), loadNumber(LS_READING_AGE_MAX, 12));
}

export default function App() {
  // ─── Theme ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    saveToLocalStorage(LS_THEME, next);
    setTheme(next);
  }, [theme]);

  // ─── Modal state ──────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [frameworkModalOpen, setFrameworkModalOpen] = useState(false);
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [onlineBrowserOpen, setOnlineBrowserOpen] = useState(false);

  // ─── Toast ────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Story form state ─────────────────────────────────────────────────
  const [characters, setCharacters] = useState(() => loadFromLocalStorage(LS_CHARACTERS) || '');
  const [audience, setAudience] = useState(() => loadFromLocalStorage(LS_AUDIENCE) || '');
  const [ageGroup, setAgeGroup] = useState(() => loadFromLocalStorage(LS_AGE_GROUP) || '');
  const [selectedFramework, setSelectedFramework] = useState(() => {
    const key = canonicalizeFrameworkKey(loadFromLocalStorage(LS_SELECTED_FRAMEWORK) || DEFAULT_FRAMEWORK);
    return resolveFrameworkGuide(key) ? key : DEFAULT_FRAMEWORK;
  });
  const [selectedStyle, setSelectedStyle] = useState(() => {
    const key = loadFromLocalStorage(LS_SELECTED_AUTHOR_STYLE) || DEFAULT_STYLE;
    return STORY_STYLE_GUIDES[key] ? key : DEFAULT_STYLE;
  });
  const [selectedNarrator, setSelectedNarrator] = useState(() => loadFromLocalStorage(LS_NARRATOR_PERSONA) || 'Default (No Narrator Persona)');
  const [userSuggestions, setUserSuggestions] = useState(() => loadFromLocalStorage(LS_USER_SUGGESTIONS) || '');
  const [includePlotPoints, setIncludePlotPoints] = useState(() => loadFromLocalStorage(LS_INCLUDE_PLOT_POINTS) === 'true');

  // ─── Options state ────────────────────────────────────────────────────
  const [adjustReadingAge, setAdjustReadingAge] = useState(() => loadFromLocalStorage(LS_ADJUST_READING_AGE_ENABLED) === 'true');
  const [targetReadingAge, setTargetReadingAge] = useState(() => {
    const range = loadReadingAgeRange();
    return clampNumber(loadNumber(LS_TARGET_READING_AGE, 7), range.min, range.max);
  });
  const [readingAgeMin, setReadingAgeMin] = useState(() => loadReadingAgeRange().min);
  const [readingAgeMax, setReadingAgeMax] = useState(() => loadReadingAgeRange().max);
  const [enableConsolidator, setEnableConsolidator] = useState(() => loadFromLocalStorage(LS_ENABLE_CONSOLIDATOR) === 'true');
  const [experimentalFastMode, setExperimentalFastMode] = useState(() => loadFromLocalStorage(LS_EXPERIMENTAL_FAST_MODE) === 'true');

  // Sensitivity
  const [sensitivityPreset, setSensitivityPreset] = useState(() => loadFromLocalStorage(LS_SENSITIVITY_PRESET) || 'adventurous');
  const [conflictLevel, setConflictLevel] = useState(() => clampNumber(loadNumber(LS_SENSITIVITY_CONFLICT, 3), 0, 3));
  const [scaryLevel, setScaryLevel] = useState(() => clampNumber(loadNumber(LS_SENSITIVITY_SCARY, 2), 0, 3));
  const [sadnessLevel, setSadnessLevel] = useState(() => clampNumber(loadNumber(LS_SENSITIVITY_SADNESS, 2), 0, 3));
  const [complexityLevel, setComplexityLevel] = useState(() => clampNumber(loadNumber(LS_SENSITIVITY_COMPLEXITY, 3), 0, 3));

  // STEM
  const [stemConcept, setStemConcept] = useState(() => loadFromLocalStorage(LS_STEM_CONCEPT) || '');

  // Adjustments
  const [toneAdj, setToneAdj] = useState(() => {
    const saved = loadFromLocalStorage(LS_ADJUSTMENT_TONE);
    return !saved || saved === 'default' ? 'none' : saved;
  });
  const [pacingAdj, setPacingAdj] = useState(() => loadFromLocalStorage(LS_ADJUSTMENT_PACING) || 'default');
  const [humorAdj, setHumorAdj] = useState(() => {
    const saved = loadFromLocalStorage(LS_ADJUSTMENT_HUMOR);
    return !saved || saved === 'default' ? 'none' : saved;
  });
  const [emotionAdj, setEmotionAdj] = useState(() => loadFromLocalStorage(LS_ADJUSTMENT_EMOTION) || 'default');

  // ─── Settings state ───────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState(() => loadFromLocalStorage(LS_API_KEY) || '');
  const [selectedModel, setSelectedModel] = useState(() => loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_MODEL);
  const [minApiInterval, setMinApiInterval] = useState(() => Math.max(0, loadNumber(LS_MIN_API_INTERVAL, 5)));
  const [thinkingEnabled, setThinkingEnabled] = useState(() => loadFromLocalStorage(LS_THINKING_ENABLED) !== 'false');
  const [agentThinking, setAgentThinking] = useState(() => ({
    crafter: loadFromLocalStorage(LS_THINKING_AGENT_1_CRAFTER) !== 'false',
    elaborator: loadFromLocalStorage(LS_THINKING_AGENT_2_ELABORATOR) !== 'false',
    reviewer: loadFromLocalStorage(LS_THINKING_AGENT_3_REVIEWER) !== 'false',
    polisher: loadFromLocalStorage(LS_THINKING_AGENT_4_POLISHER) !== 'false',
    cleaner: loadFromLocalStorage(LS_THINKING_AGENT_5_CLEANER) === 'true',
    titler: loadFromLocalStorage(LS_THINKING_AGENT_6_TITLER) === 'true',
    consolidator: loadFromLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR) !== 'false',
    fast: loadFromLocalStorage(LS_THINKING_AGENT_FAST) === 'true',
  }));
  const [ttsSource, setTtsSource] = useState(() => loadFromLocalStorage(LS_TTS_SOURCE) || 'browser');
  const [ttsGender, setTtsGender] = useState(() => loadFromLocalStorage(LS_TTS_GENDER) || 'female');
  const [ttsVoice, setTtsVoice] = useState(() => loadFromLocalStorage(LS_TTS_VOICE) || 'Google UK English Female');

  // ─── Dynamic model discovery ───────────────────────────────────────────
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([DEFAULT_MODEL_CONFIG]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Fetch models when API key changes
  useEffect(() => {
    if (!apiKey) { setAvailableModels([DEFAULT_MODEL_CONFIG]); return; }
    let cancelled = false;
    setModelsLoading(true);
    fetchAvailableModels(apiKey).then(models => {
      if (cancelled) return;
      setAvailableModels(models);
      // If current selected model isn't in the list, pick the first one
      if (models.length > 0 && !models.find(m => m.name === selectedModelRef.current)) {
        const first = models[0].name;
        setSelectedModel(first);
        saveToLocalStorage(LS_SELECTED_MODEL, first);
      }
      setModelsLoading(false);
    }).catch(() => {
      if (!cancelled) setModelsLoading(false);
    });
    return () => { cancelled = true; };
  }, [apiKey]);

  // ─── Story display state ──────────────────────────────────────────────
  const [storyTitle, setStoryTitle] = useState('');
  const [storyHtml, setStoryHtml] = useState('');
  const [storyMarkdown, setStoryMarkdown] = useState('');
  const [storyFontSize, setStoryFontSize] = useState(1.1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [hasStory, setHasStory] = useState(false);
  const [activeTab, setActiveTab] = useState<'story' | 'options' | 'assist'>('story');
  const [assistEnabled, setAssistEnabled] = useState(true);
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const storyContentRef = useRef<HTMLElement>(null);
  const [loadedStoryMeta, setLoadedStoryMeta] = useState<StoryMetadata | null>(null);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);

  // ─── Persist form values ──────────────────────────────────────────────
  const updateCharacters = useCallback((v: string) => { setCharacters(v); saveToLocalStorage(LS_CHARACTERS, v); }, []);
  const updateAudience = useCallback((v: string) => { setAudience(v); saveToLocalStorage(LS_AUDIENCE, v); }, []);
  const updateAgeGroup = useCallback((v: string) => { setAgeGroup(v); saveToLocalStorage(LS_AGE_GROUP, v); }, []);

  // Word click in story → switch to Assist tab and look up word
  const handleWordClick = useCallback((word: string, wordIndex: number | null) => {
    setSelectedWord(word);
    setSelectedWordIndex(wordIndex);
    if (word) setActiveTab('assist');
  }, []);

  // Allow AssistPanel synonym/antonym chips to trigger a new lookup
  const handleWordLookup = useCallback((word: string) => {
    setSelectedWord(word);
    setSelectedWordIndex(null);
  }, []);

  const loadStoryIntoApp = useCallback((title: string, markdown: string) => {
    const nextTitle = title.trim() || 'Untitled Story';
    appState.latestGeneratedStoryTitle = nextTitle;
    appState.latestGeneratedStoryText = markdown;
    setStoryTitle(nextTitle);
    setStoryMarkdown(markdown);
    setStoryHtml(formatStoryAsHtml(markdown));
    setStatusText('');
    setHasStory(true);
    setAssistEnabled(true);
    setSelectedWord('');
    setSelectedWordIndex(null);
    setActiveTab('assist');
  }, []);

  const handleFileLoaded = useCallback((title: string, text: string) => {
    loadStoryIntoApp(title || 'Untitled Story', text);
    setLoadedStoryMeta(null);
  }, [loadStoryIntoApp]);

  const buildAudience = useCallback((): string => {
    return buildAudienceLabel(ageGroup, audience);
  }, [ageGroup, audience]);

  const buildReadingAgeNote = useCallback((): string => {
    if (!adjustReadingAge) {
      return '';
    }

    const age = String(targetReadingAge);
    return READING_AGE_ADJUSTMENT_TEXT_TEMPLATE
      .replace(/\$\{targetReadingAge\}/g, age)
      .replace(/\$\{TARGET_READING_AGE\}/g, age);
  }, [adjustReadingAge, targetReadingAge]);

  const buildAdjustmentModulesText = useCallback((): string => {
    const adjustmentTexts: string[] = [];
    if (toneAdj !== 'default' && ADJUSTMENT_MODULES.tone?.[toneAdj]) adjustmentTexts.push(ADJUSTMENT_MODULES.tone[toneAdj]);
    if (pacingAdj !== 'default' && ADJUSTMENT_MODULES.pacing?.[pacingAdj]) adjustmentTexts.push(ADJUSTMENT_MODULES.pacing[pacingAdj]);
    if (humorAdj !== 'default' && ADJUSTMENT_MODULES.humor?.[humorAdj]) adjustmentTexts.push(ADJUSTMENT_MODULES.humor[humorAdj]);
    if (emotionAdj !== 'default' && ADJUSTMENT_MODULES.emotion?.[emotionAdj]) adjustmentTexts.push(ADJUSTMENT_MODULES.emotion[emotionAdj]);
    return adjustmentTexts.join('\n\n');
  }, [toneAdj, pacingAdj, humorAdj, emotionAdj]);

  const buildAgentThinkingConfig = useCallback((modelConfig?: ModelConfig): Record<string, boolean> => {
    if (!modelConfig?.supportsThinking || !thinkingEnabled) {
      return {};
    }

    const agentNames: Record<AgentThinkingKey, string> = {
      crafter: 'Agent 1: Story Crafter',
      elaborator: 'Agent 2: Elaborator',
      reviewer: 'Agent 3: Reviewer',
      polisher: 'Agent 4: Polisher',
      cleaner: 'Agent 5: Cleaner',
      titler: 'Agent 6: Titler',
      consolidator: 'Agent C: Consolidator',
      fast: FAST_STORY_AGENT_NAME,
    };

    return (Object.keys(agentNames) as AgentThinkingKey[]).reduce<Record<string, boolean>>((config, key) => {
      config[agentNames[key]] = agentThinking[key];
      return config;
    }, {});
  }, [agentThinking, thinkingEnabled]);

  const updateUserSuggestions = useCallback((v: string) => { setUserSuggestions(v); saveToLocalStorage(LS_USER_SUGGESTIONS, v); }, []);
  
  const updateFramework = useCallback((v: string) => {
    const canonical = canonicalizeFrameworkKey(v);
    setSelectedFramework(canonical);
    saveToLocalStorage(LS_SELECTED_FRAMEWORK, canonical);
  }, []);
  
  const updateStyle = useCallback((v: string) => {
    setSelectedStyle(v);
    saveToLocalStorage(LS_SELECTED_AUTHOR_STYLE, v);
  }, []);

  const updateNarrator = useCallback((v: string) => {
    setSelectedNarrator(v);
    saveToLocalStorage(LS_NARRATOR_PERSONA, v);
  }, []);

  const updateIncludePlotPoints = useCallback((v: boolean) => {
    setIncludePlotPoints(v);
    saveToLocalStorage(LS_INCLUDE_PLOT_POINTS, String(v));
  }, []);

  // ─── Sensitivity helpers ──────────────────────────────────────────────
  const applySensitivityPreset = useCallback((preset: string) => {
    setSensitivityPreset(preset);
    saveToLocalStorage(LS_SENSITIVITY_PRESET, preset);
    if (preset !== 'custom' && SENSITIVITY_LEVELS[preset]) {
      const p = SENSITIVITY_LEVELS[preset];
      setConflictLevel(p.conflict); saveToLocalStorage(LS_SENSITIVITY_CONFLICT, String(p.conflict));
      setScaryLevel(p.scary); saveToLocalStorage(LS_SENSITIVITY_SCARY, String(p.scary));
      setSadnessLevel(p.sadness); saveToLocalStorage(LS_SENSITIVITY_SADNESS, String(p.sadness));
      setComplexityLevel(p.complexity); saveToLocalStorage(LS_SENSITIVITY_COMPLEXITY, String(p.complexity));
    }
  }, []);

  const getCurrentSensitivitySettings = useCallback((): SensitivitySettings => ({
    conflict: conflictLevel,
    scary: scaryLevel,
    sadness: sadnessLevel,
    complexity: complexityLevel,
  }), [conflictLevel, scaryLevel, sadnessLevel, complexityLevel]);

  const buildCommonInputs = useCallback((modelConfig?: ModelConfig, abortSignal?: AbortSignal): CommonInputs => {
    const frameworkKey = selectedFramework || DEFAULT_FRAMEWORK;
    const styleKey = selectedStyle || DEFAULT_STYLE;
    const frameworkSummary = STORY_FRAMEWORK_SUMMARIES[frameworkKey]
      || STORY_FRAMEWORK_SUMMARIES[DEFAULT_FRAMEWORK]
      || '';
    let frameworkGuide = resolveFrameworkGuide(frameworkKey) || resolveFrameworkGuide(DEFAULT_FRAMEWORK);
    if (frameworkKey === 'Learning Fable (STEM)' && stemConcept) {
      frameworkGuide += `\n\nSTEM Concept to teach: ${stemConcept}`;
    }

    const userSuggestionsText = includePlotPoints && userSuggestions.trim()
      ? formatUserStoryRequirements(userSuggestions)
      : '';
    const sensitivitySettings = getCurrentSensitivitySettings();
    const narratorText = NARRATOR_PERSONAS[selectedNarrator] || '';
    const consolidationGuidanceText = enableConsolidator
      ? 'After polishing, perform one restrained consolidation pass: remove genuine redundancy and tighten weak sentences without cutting purposeful repetition, quiet pauses, required framework beats, educational explanation, or emotional payoff. Never shorten below an explicit framework minimum word count or remove required beats.'
      : 'Do not perform a separate shortening pass. Remove only accidental repetition during normal polishing, preserve purposeful detail and pacing, and still obey every explicit framework length range and required beat.';
    const fastEnrichmentGuidanceText = frameworkUsesConcisePipeline(frameworkKey)
      ? 'Skip a separate enrichment pass. Draft directly to the concise framework target, keep only details and dialogue needed for the lesson or STEM discovery, and do not add any extra scene.'
      : 'Strengthen thin moments with useful sensory detail, thought, or dialogue. Add at most one brief scene and only when the framework, pacing, and length target permit it. Do not add filler, a detached subplot, or length for its own sake.';

    return {
      apiKey,
      modelId: selectedModel,
      minApiIntervalMs: minApiInterval * 1000,
      audience: buildAudience(),
      CRAFT_GUIDE_TEXT: frameworkGuide,
      FRAMEWORK_SUMMARY_TEXT: frameworkSummary,
      READING_AGE_NOTE: buildReadingAgeNote(),
      USER_SUGGESTIONS_TEXT: userSuggestionsText,
      enableConsolidator,
      CONSOLIDATION_GUIDANCE_TEXT: consolidationGuidanceText,
      FAST_ENRICHMENT_GUIDANCE_TEXT: fastEnrichmentGuidanceText,
      AUTHOR_STYLE_GUIDE: STORY_STYLE_GUIDES[styleKey] || STORY_STYLE_GUIDES[DEFAULT_STYLE] || '',
      AUTHOR_STYLE_SUMMARY_TEXT: STORY_STYLE_SUMMARIES[styleKey] || STORY_STYLE_SUMMARIES[DEFAULT_STYLE] || '',
      ADJUSTMENT_MODULES_TEXT: buildAdjustmentModulesText(),
      NARRATOR_PERSONA_TEXT: narratorText,
      NARRATOR_PERSONA_SUMMARY_TEXT: PERSONA_SUMMARIES[selectedNarrator] || '',
      SENSITIVITY_GUIDANCE_TEXT: getSensitivityGuidance(sensitivitySettings),
      agentThinkingConfig: buildAgentThinkingConfig(modelConfig),
      abortSignal,
    };
  }, [
    apiKey,
    selectedModel,
    minApiInterval,
    buildAudience,
    selectedFramework,
    stemConcept,
    buildReadingAgeNote,
    includePlotPoints,
    userSuggestions,
    enableConsolidator,
    selectedStyle,
    selectedNarrator,
    buildAdjustmentModulesText,
    getCurrentSensitivitySettings,
    buildAgentThinkingConfig,
  ]);

  const collectStoryFields = useCallback((title: string, markdown: string) => ({
    title,
    markdown,
    characters,
    audience: buildAudience(),
    ageGroup: ageGroup || undefined,
    framework: selectedFramework,
    style: selectedStyle,
    narrator: selectedNarrator,
    tone: toneAdj,
    pacing: pacingAdj,
    humor: humorAdj,
    emotion: emotionAdj,
    model: selectedModel,
    readingAge: adjustReadingAge ? targetReadingAge : null,
    consolidator: enableConsolidator,
    fastMode: experimentalFastMode,
    wordCount: countWords(markdown),
    plotPoints: includePlotPoints && userSuggestions.trim() ? userSuggestions.trim() : undefined,
  }), [
    characters, buildAudience, ageGroup, selectedFramework, selectedStyle, selectedNarrator,
    toneAdj, pacingAdj, humorAdj, emotionAdj, selectedModel, adjustReadingAge, targetReadingAge,
    enableConsolidator, experimentalFastMode, includePlotPoints, userSuggestions,
  ]);

  const handleCancelGenerate = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ─── Generate story ───────────────────────────────────────────────────
  const handleGenerateStory = useCallback(async () => {
    if (!apiKey) { showToast('Please set your API key in Settings.', 'error'); return; }
    if (!characters.trim()) { showToast('Please enter at least one character.', 'error'); return; }
    if (!ageGroup) { showToast('Please select an age group.', 'error'); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setHasStory(false);
    setStoryTitle('Generating...');
    setStoryHtml('');
    setStoryMarkdown('');
    setStatusText('');
    setAssistEnabled(true);
    setSelectedWord('');
    setSelectedWordIndex(null);
    setActiveTab('story');
    setLoadedStoryMeta(null);
    setMetadataModalOpen(false);
    appState.clearChatLog();

    const modelConfig = availableModels.find(m => m.name === selectedModel) || availableModels[0];
    const commonInputs = buildCommonInputs(modelConfig, controller.signal);

    try {
      const charactersList = parseCharacters(characters);
      const initialData = {
        charactersList: charactersList.join(', ') || 'a brave little mouse',
        storyText: '',
        reviewText: '',
        titleText: '',
      };

      const statusCallback = (msg: string) => setStatusText(prev => prev + msg);
      const result = experimentalFastMode
        ? await runFastStoryGeneration(initialData, commonInputs, statusCallback)
        : await runPipeline(
          getStoryGenerationPipelineConfig(enableConsolidator, selectedFramework || DEFAULT_FRAMEWORK),
          initialData,
          commonInputs,
          statusCallback,
        );

      const title = sanitizeGeneratedTitle(result.titleText || '') || 'Untitled Story';
      const story = (result.storyText || '').trim();

      loadStoryIntoApp(title, story);
      showToast('Story generated successfully!', 'success');

      const fields = collectStoryFields(title, story);
      setLoadedStoryMeta(buildStoryMetadata(fields));

      try {
        await saveStoryToLibrary(buildSavedStory(fields));
      } catch (e) {
        console.warn('Could not auto-save story:', e);
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        setStoryTitle('');
        setStoryHtml('');
        setStoryMarkdown('');
        setStatusText('');
        setHasStory(false);
        showToast('Story generation cancelled', 'info');
        return;
      }
      const msg = error instanceof Error ? error.message : String(error);
      setStoryTitle('Error Occurred');
      setStoryHtml('<p>An error occurred. Please check the browser console for details.</p>');
      setHasStory(false);
      showToast('Story generation failed', 'error');
      console.error('Pipeline error:', msg);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  }, [apiKey, characters, ageGroup, selectedModel, selectedFramework, availableModels, buildCommonInputs, enableConsolidator, experimentalFastMode, collectStoryFields, loadStoryIntoApp, showToast]);

  // ─── Elaborate story ──────────────────────────────────────────────────
  const handleElaborateStory = useCallback(async () => {
    const sourceStory = storyMarkdown || appState.latestGeneratedStoryText;
    if (!sourceStory) return;
    if (!apiKey) { showToast('Please set your API key in Settings.', 'error'); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setStatusText('');
    setLoadedStoryMeta(null);
    setMetadataModalOpen(false);
    appState.clearChatLog();

    const modelConfig = availableModels.find(m => m.name === selectedModel) || availableModels[0];
    const commonInputs = buildCommonInputs(modelConfig, controller.signal);

    try {
      const pipelineConfig = getElaborationPipelineConfig(enableConsolidator);
      const initialData = {
        storyText: sourceStory,
        reviewText: '',
      };

      const result = await runPipeline(
        pipelineConfig,
        initialData,
        commonInputs,
        (msg: string) => setStatusText(prev => prev + msg)
      );

      const story = (result.storyText || '').trim();
      const nextTitle = appState.latestGeneratedStoryTitle || storyTitle || 'Untitled Story';
      loadStoryIntoApp(nextTitle, story);
      setLoadedStoryMeta(buildStoryMetadata({
        ...(loadedStoryMeta || { ...collectStoryFields(nextTitle, story), fastMode: undefined }),
        title: nextTitle,
        markdown: story,
        date: new Date().toISOString(),
        wordCount: countWords(story),
      }));
      showToast('Story elaborated successfully!', 'success');
    } catch (error: unknown) {
      if (isAbortError(error)) {
        showToast('Elaboration cancelled', 'info');
        return;
      }
      const msg = error instanceof Error ? error.message : String(error);
      showToast('Elaboration failed', 'error');
      console.error('Elaboration error:', msg);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  }, [storyMarkdown, apiKey, selectedModel, availableModels, buildCommonInputs, enableConsolidator, loadStoryIntoApp, showToast, storyTitle, loadedStoryMeta, collectStoryFields]);

  // ─── Font size ────────────────────────────────────────────────────────
  const increaseFont = useCallback(() => setStoryFontSize(s => Math.min(s + 0.1, 2.0)), []);
  const decreaseFont = useCallback(() => setStoryFontSize(s => Math.max(s - 0.1, 0.7)), []);

  // ─── Export JSON ──────────────────────────────────────────────────────
  const handleExportJson = useCallback(() => {
    const markdown = storyMarkdown || appState.latestGeneratedStoryText;
    if (!markdown) return;
    const exportTitle = storyTitle || appState.latestGeneratedStoryTitle || 'Untitled Story';
    // A story loaded from the library carries its own settings; exporting the
    // live form state instead would mislabel it with whatever is on screen now.
    const storyData = buildSavedStory(loadedStoryMeta
      ? { ...loadedStoryMeta, title: exportTitle, markdown }
      : collectStoryFields(exportTitle, markdown));
    const json = JSON.stringify(storyData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = exportTitle.replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_').toLowerCase() || 'untitled_story';
    a.download = `${safeFilename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Story exported as JSON!', 'success');
  }, [storyMarkdown, storyTitle, loadedStoryMeta, collectStoryFields, showToast]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (confirm('Reset all settings and data?')) {
          clearAllAppData(false);
          showToast('All StoryGen data reset. Reloading...', 'info');
          setTimeout(() => window.location.reload(), 500);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showToast]);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="app-container">
        <ControlsPanel
          // Tab
          activeTab={activeTab}
          onTabChange={setActiveTab}
          assistEnabled={assistEnabled}
          // Header
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHelp={() => setHelpModalOpen(true)}
          // Story tab
          characters={characters}
          onCharactersChange={updateCharacters}
          audience={audience}
          onAudienceChange={updateAudience}
          ageGroup={ageGroup}
          onAgeGroupChange={updateAgeGroup}
          selectedFramework={selectedFramework}
          onOpenFrameworkModal={() => setFrameworkModalOpen(true)}
          selectedStyle={selectedStyle}
          onOpenStyleModal={() => setStyleModalOpen(true)}
          selectedNarrator={selectedNarrator}
          onNarratorChange={updateNarrator}
          includePlotPoints={includePlotPoints}
          onIncludePlotPointsChange={updateIncludePlotPoints}
          userSuggestions={userSuggestions}
          onUserSuggestionsChange={updateUserSuggestions}
          // Options tab
          sensitivityPreset={sensitivityPreset}
          onSensitivityPresetChange={applySensitivityPreset}
          conflictLevel={conflictLevel}
          scaryLevel={scaryLevel}
          sadnessLevel={sadnessLevel}
          complexityLevel={complexityLevel}
          onConflictChange={(v) => { setConflictLevel(v); saveToLocalStorage(LS_SENSITIVITY_CONFLICT, String(v)); setSensitivityPreset('custom'); saveToLocalStorage(LS_SENSITIVITY_PRESET, 'custom'); }}
          onScaryChange={(v) => { setScaryLevel(v); saveToLocalStorage(LS_SENSITIVITY_SCARY, String(v)); setSensitivityPreset('custom'); saveToLocalStorage(LS_SENSITIVITY_PRESET, 'custom'); }}
          onSadnessChange={(v) => { setSadnessLevel(v); saveToLocalStorage(LS_SENSITIVITY_SADNESS, String(v)); setSensitivityPreset('custom'); saveToLocalStorage(LS_SENSITIVITY_PRESET, 'custom'); }}
          onComplexityChange={(v) => { setComplexityLevel(v); saveToLocalStorage(LS_SENSITIVITY_COMPLEXITY, String(v)); setSensitivityPreset('custom'); saveToLocalStorage(LS_SENSITIVITY_PRESET, 'custom'); }}
          adjustReadingAge={adjustReadingAge}
          onAdjustReadingAgeChange={(v) => { setAdjustReadingAge(v); saveToLocalStorage(LS_ADJUST_READING_AGE_ENABLED, String(v)); }}
          targetReadingAge={targetReadingAge}
          onTargetReadingAgeChange={(v) => { setTargetReadingAge(v); saveToLocalStorage(LS_TARGET_READING_AGE, String(v)); }}
          readingAgeMin={readingAgeMin}
          readingAgeMax={readingAgeMax}
          enableConsolidator={enableConsolidator}
          onEnableConsolidatorChange={(v) => { setEnableConsolidator(v); saveToLocalStorage(LS_ENABLE_CONSOLIDATOR, String(v)); }}
          stemConcept={stemConcept}
          onStemConceptChange={(v) => { setStemConcept(v); saveToLocalStorage(LS_STEM_CONCEPT, v); }}
          selectedFrameworkForSTEM={selectedFramework}
          // Adjustments
          toneAdj={toneAdj}
          pacingAdj={pacingAdj}
          humorAdj={humorAdj}
          emotionAdj={emotionAdj}
          onToneChange={(v) => { setToneAdj(v); saveToLocalStorage(LS_ADJUSTMENT_TONE, v); }}
          onPacingChange={(v) => { setPacingAdj(v); saveToLocalStorage(LS_ADJUSTMENT_PACING, v); }}
          onHumorChange={(v) => { setHumorAdj(v); saveToLocalStorage(LS_ADJUSTMENT_HUMOR, v); }}
          onEmotionChange={(v) => { setEmotionAdj(v); saveToLocalStorage(LS_ADJUSTMENT_EMOTION, v); }}
          // Generate
          experimentalFastMode={experimentalFastMode}
          isGenerating={isGenerating}
          onGenerate={handleGenerateStory}
          onCancelGenerate={handleCancelGenerate}
          // Assist - pass through for now
          storyOutputRef={storyContentRef}
          selectedWord={selectedWord}
          selectedWordIndex={selectedWordIndex}
          onWordLookup={handleWordLookup}
          ttsSource={ttsSource}
          ttsGender={ttsGender}
          ttsVoice={ttsVoice}
          showToast={showToast}
        />
        <StoryPanel
          ref={storyContentRef}
          title={storyTitle}
          storyHtml={storyHtml}
          storyMarkdown={storyMarkdown}
          statusText={statusText}
          hasStory={hasStory}
          isGenerating={isGenerating}
          fontSize={storyFontSize}
          onIncreaseFontSize={increaseFont}
          onDecreaseFontSize={decreaseFont}
          onElaborate={handleElaborateStory}
          onOpenLibrary={() => setLibraryOpen(true)}
          onOpenOnlineBrowser={() => setOnlineBrowserOpen(true)}
          onExportJson={handleExportJson}
          onWordClick={handleWordClick}
          onShowInfo={loadedStoryMeta ? () => setMetadataModalOpen(true) : undefined}
          onFileLoaded={handleFileLoaded}
          showToast={showToast}
        />
      </div>

      {/* Modals */}
      {settingsOpen && (
        <SettingsModal
          apiKey={apiKey}
          selectedModel={selectedModel}
          minApiInterval={minApiInterval}
          thinkingEnabled={thinkingEnabled}
          experimentalFastMode={experimentalFastMode}
          agentThinking={agentThinking}
          availableModels={availableModels}
          modelsLoading={modelsLoading}
          onRefreshModels={(localApiKey) => {
            if (!localApiKey) return;
            setModelsLoading(true);
            fetchAvailableModels(localApiKey).then(models => {
              setAvailableModels(models);
              setModelsLoading(false);
            }).catch(() => setModelsLoading(false));
          }}
          ttsSource={ttsSource}
          ttsGender={ttsGender}
          ttsVoice={ttsVoice}
          readingAgeMin={readingAgeMin}
          readingAgeMax={readingAgeMax}
          onSave={(settings) => {
            const normalizedRange = normalizeReadingAgeRange(settings.readingAgeMin, settings.readingAgeMax);
            const normalizedTargetReadingAge = clampNumber(targetReadingAge, normalizedRange.min, normalizedRange.max);

            setApiKey(settings.apiKey); saveToLocalStorage(LS_API_KEY, settings.apiKey);
            setSelectedModel(settings.selectedModel); saveToLocalStorage(LS_SELECTED_MODEL, settings.selectedModel);
            setMinApiInterval(settings.minApiInterval); saveToLocalStorage(LS_MIN_API_INTERVAL, String(settings.minApiInterval));
            setThinkingEnabled(settings.thinkingEnabled); saveToLocalStorage(LS_THINKING_ENABLED, String(settings.thinkingEnabled));
            setExperimentalFastMode(settings.experimentalFastMode); saveToLocalStorage(LS_EXPERIMENTAL_FAST_MODE, String(settings.experimentalFastMode));
            setAgentThinking(settings.agentThinking);
            saveToLocalStorage(LS_THINKING_AGENT_1_CRAFTER, String(settings.agentThinking.crafter));
            saveToLocalStorage(LS_THINKING_AGENT_2_ELABORATOR, String(settings.agentThinking.elaborator));
            saveToLocalStorage(LS_THINKING_AGENT_3_REVIEWER, String(settings.agentThinking.reviewer));
            saveToLocalStorage(LS_THINKING_AGENT_4_POLISHER, String(settings.agentThinking.polisher));
            saveToLocalStorage(LS_THINKING_AGENT_5_CLEANER, String(settings.agentThinking.cleaner));
            saveToLocalStorage(LS_THINKING_AGENT_6_TITLER, String(settings.agentThinking.titler));
            saveToLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR, String(settings.agentThinking.consolidator));
            saveToLocalStorage(LS_THINKING_AGENT_FAST, String(settings.agentThinking.fast));
            setTtsSource(settings.ttsSource); saveToLocalStorage(LS_TTS_SOURCE, settings.ttsSource);
            setTtsGender(settings.ttsGender); saveToLocalStorage(LS_TTS_GENDER, settings.ttsGender);
            setTtsVoice(settings.ttsVoice); saveToLocalStorage(LS_TTS_VOICE, settings.ttsVoice);
            setReadingAgeMin(normalizedRange.min); saveToLocalStorage(LS_READING_AGE_MIN, String(normalizedRange.min));
            setReadingAgeMax(normalizedRange.max); saveToLocalStorage(LS_READING_AGE_MAX, String(normalizedRange.max));
            setTargetReadingAge(normalizedTargetReadingAge); saveToLocalStorage(LS_TARGET_READING_AGE, String(normalizedTargetReadingAge));
            setSettingsOpen(false);
            showToast('Settings saved', 'success');
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {frameworkModalOpen && (
        <FrameworkSelectModal
          selectedFramework={selectedFramework}
          frameworks={STORY_FRAMEWORK_SUMMARIES}
          onSelect={(key) => {
            updateFramework(key);
            setFrameworkModalOpen(false);
          }}
          onClose={() => setFrameworkModalOpen(false)}
        />
      )}

      {styleModalOpen && (
        <StyleSelectModal
          selectedStyle={selectedStyle}
          styles={STORY_STYLE_SUMMARIES}
          onSelect={(key) => {
            updateStyle(key);
          }}
          onClose={() => setStyleModalOpen(false)}
          toneAdj={toneAdj}
          pacingAdj={pacingAdj}
          humorAdj={humorAdj}
          emotionAdj={emotionAdj}
          onToneChange={(v) => { setToneAdj(v); saveToLocalStorage(LS_ADJUSTMENT_TONE, v); }}
          onPacingChange={(v) => { setPacingAdj(v); saveToLocalStorage(LS_ADJUSTMENT_PACING, v); }}
          onHumorChange={(v) => { setHumorAdj(v); saveToLocalStorage(LS_ADJUSTMENT_HUMOR, v); }}
          onEmotionChange={(v) => { setEmotionAdj(v); saveToLocalStorage(LS_ADJUSTMENT_EMOTION, v); }}
        />
      )}

      {helpModalOpen && (
        <HelpModal onClose={() => setHelpModalOpen(false)} />
      )}

      {libraryOpen && (
        <StoryLibraryModal
          onLoad={(story) => {
            loadStoryIntoApp(story.title, story.markdown);
            setLoadedStoryMeta({
              title: story.title,
              date: story.date,
              characters: story.characters,
              audience: story.audience,
              ageGroup: story.ageGroup,
              framework: story.framework,
              style: story.style,
              tone: story.tone,
              pacing: story.pacing,
              humor: story.humor,
              emotion: story.emotion,
              model: story.model,
              readingAge: story.readingAge,
              consolidator: story.consolidator,
              fastMode: story.fastMode,
              wordCount: story.wordCount,
              plotPoints: story.plotPoints,
              narrator: story.narrator,
            });
            setLibraryOpen(false);
            showToast(`Loaded: ${story.title}`, 'success');
          }}
          onClose={() => setLibraryOpen(false)}
          showToast={showToast}
        />
      )}

      {onlineBrowserOpen && (
        <OnlineStoryBrowser
          onLoad={(story) => {
            loadStoryIntoApp(story.title, story.markdown);
            setLoadedStoryMeta({
              title: story.title,
              date: story.date,
              characters: story.characters,
              audience: story.audience,
              ageGroup: story.ageGroup,
              framework: story.framework,
              style: story.style,
              tone: story.tone,
              pacing: story.pacing,
              humor: story.humor,
              emotion: story.emotion,
              wordCount: story.wordCount,
              author: story.author,
              tags: story.tags,
            });
            setOnlineBrowserOpen(false);
          }}
          onClose={() => setOnlineBrowserOpen(false)}
          showToast={showToast}
        />
      )}

      {metadataModalOpen && loadedStoryMeta && (
        <StoryMetadataModal
          story={loadedStoryMeta}
          onClose={() => setMetadataModalOpen(false)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
