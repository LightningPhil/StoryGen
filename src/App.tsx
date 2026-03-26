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
} from './localStorage';
import appState from './appState';
import { SENSITIVITY_LEVELS } from './appState';
import { parseCharacters, countWords } from './utils';
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides';
import { STORY_STYLE_GUIDES, STORY_STYLE_SUMMARIES } from './prompts/author_styles';
import { ADJUSTMENT_MODULES, getSensitivityGuidance } from './prompts/adjustment_modules';
import { READING_AGE_ADJUSTMENT_TEXT_TEMPLATE } from './prompts/agent_prompts';
import { runPipeline, getStoryGenerationPipelineConfig, getElaborationPipelineConfig } from './pipeline';
import { saveStoryToLibrary } from './storyLibrary';
import { formatStoryAsHtml } from './formatStory';
import type { SensitivitySettings, ModelConfig } from './types';
import { fetchAvailableModels, DEFAULT_MODEL, DEFAULT_MODEL_CONFIG } from './modelDiscovery';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
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
  const [selectedFramework, setSelectedFramework] = useState(() => loadFromLocalStorage(LS_SELECTED_FRAMEWORK) || '');
  const [selectedStyle, setSelectedStyle] = useState(() => loadFromLocalStorage(LS_SELECTED_AUTHOR_STYLE) || '');
  const [userSuggestions, setUserSuggestions] = useState(() => loadFromLocalStorage(LS_USER_SUGGESTIONS) || '');
  const [includePlotPoints, setIncludePlotPoints] = useState(() => loadFromLocalStorage(LS_INCLUDE_PLOT_POINTS) === 'true');

  // ─── Options state ────────────────────────────────────────────────────
  const [adjustReadingAge, setAdjustReadingAge] = useState(() => loadFromLocalStorage(LS_ADJUST_READING_AGE_ENABLED) === 'true');
  const [targetReadingAge, setTargetReadingAge] = useState(() => parseInt(loadFromLocalStorage(LS_TARGET_READING_AGE) || '7'));
  const [readingAgeMin, setReadingAgeMin] = useState(() => parseInt(loadFromLocalStorage(LS_READING_AGE_MIN) || '5'));
  const [readingAgeMax, setReadingAgeMax] = useState(() => parseInt(loadFromLocalStorage(LS_READING_AGE_MAX) || '12'));
  const [enableConsolidator, setEnableConsolidator] = useState(() => loadFromLocalStorage(LS_ENABLE_CONSOLIDATOR) === 'true');

  // Sensitivity
  const [sensitivityPreset, setSensitivityPreset] = useState(() => loadFromLocalStorage(LS_SENSITIVITY_PRESET) || 'adventurous');
  const [conflictLevel, setConflictLevel] = useState(() => parseInt(loadFromLocalStorage(LS_SENSITIVITY_CONFLICT) || '3'));
  const [scaryLevel, setScaryLevel] = useState(() => parseInt(loadFromLocalStorage(LS_SENSITIVITY_SCARY) || '2'));
  const [sadnessLevel, setSadnessLevel] = useState(() => parseInt(loadFromLocalStorage(LS_SENSITIVITY_SADNESS) || '2'));
  const [complexityLevel, setComplexityLevel] = useState(() => parseInt(loadFromLocalStorage(LS_SENSITIVITY_COMPLEXITY) || '3'));

  // STEM
  const [stemConcept, setStemConcept] = useState(() => loadFromLocalStorage(LS_STEM_CONCEPT) || '');

  // Adjustments
  const [toneAdj, setToneAdj] = useState(() => loadFromLocalStorage(LS_ADJUSTMENT_TONE) || 'default');
  const [pacingAdj, setPacingAdj] = useState(() => loadFromLocalStorage(LS_ADJUSTMENT_PACING) || 'default');
  const [humorAdj, setHumorAdj] = useState(() => loadFromLocalStorage(LS_ADJUSTMENT_HUMOR) || 'default');
  const [emotionAdj, setEmotionAdj] = useState(() => loadFromLocalStorage(LS_ADJUSTMENT_EMOTION) || 'default');

  // ─── Settings state ───────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState(() => loadFromLocalStorage(LS_API_KEY) || '');
  const [selectedModel, setSelectedModel] = useState(() => loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_MODEL);
  const [minApiInterval, setMinApiInterval] = useState(() => parseInt(loadFromLocalStorage(LS_MIN_API_INTERVAL) || '5'));
  const [thinkingEnabled, setThinkingEnabled] = useState(() => loadFromLocalStorage(LS_THINKING_ENABLED) !== 'false');
  const [agentThinking, setAgentThinking] = useState(() => ({
    crafter: loadFromLocalStorage(LS_THINKING_AGENT_1_CRAFTER) !== 'false',
    elaborator: loadFromLocalStorage(LS_THINKING_AGENT_2_ELABORATOR) !== 'false',
    reviewer: loadFromLocalStorage(LS_THINKING_AGENT_3_REVIEWER) !== 'false',
    polisher: loadFromLocalStorage(LS_THINKING_AGENT_4_POLISHER) !== 'false',
    cleaner: loadFromLocalStorage(LS_THINKING_AGENT_5_CLEANER) === 'true',
    titler: loadFromLocalStorage(LS_THINKING_AGENT_6_TITLER) === 'true',
    consolidator: loadFromLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR) !== 'false',
  }));
  const [ttsSource, setTtsSource] = useState(() => loadFromLocalStorage(LS_TTS_SOURCE) || 'browser');
  const [ttsGender, setTtsGender] = useState(() => loadFromLocalStorage(LS_TTS_GENDER) || 'female');
  const [ttsVoice, setTtsVoice] = useState(() => loadFromLocalStorage(LS_TTS_VOICE) || '');

  // ─── Dynamic model discovery ───────────────────────────────────────────
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([DEFAULT_MODEL_CONFIG]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Fetch models when API key changes
  useEffect(() => {
    if (!apiKey) { setAvailableModels([DEFAULT_MODEL_CONFIG]); return; }
    let cancelled = false;
    setModelsLoading(true);
    fetchAvailableModels(apiKey).then(models => {
      if (cancelled) return;
      setAvailableModels(models);
      // If current selected model isn't in the list, pick the first one
      if (models.length > 0 && !models.find(m => m.name === selectedModel)) {
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
  const [storyFontSize, setStoryFontSize] = useState(1.1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [hasStory, setHasStory] = useState(false);
  const [activeTab, setActiveTab] = useState<'story' | 'options' | 'assist'>('story');
  const [assistEnabled, setAssistEnabled] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const storyContentRef = useRef<HTMLElement>(null);

  // ─── Persist form values ──────────────────────────────────────────────
  const updateCharacters = useCallback((v: string) => { setCharacters(v); saveToLocalStorage(LS_CHARACTERS, v); }, []);
  const updateAudience = useCallback((v: string) => { setAudience(v); saveToLocalStorage(LS_AUDIENCE, v); }, []);
  const updateAgeGroup = useCallback((v: string) => { setAgeGroup(v); saveToLocalStorage(LS_AGE_GROUP, v); }, []);

  // Word click in story → switch to Assist tab and look up word
  const handleWordClick = useCallback((word: string) => {
    setSelectedWord(word);
    if (word) setActiveTab('assist');
  }, []);

  // Allow AssistPanel synonym/antonym chips to trigger a new lookup
  const handleWordLookup = useCallback((word: string) => {
    setSelectedWord(word);
  }, []);

  const loadStoryIntoApp = useCallback((title: string, markdown: string) => {
    const nextTitle = title.trim() || 'Untitled Story';
    appState.latestGeneratedStoryTitle = nextTitle;
    appState.latestGeneratedStoryText = markdown;
    setStoryTitle(nextTitle);
    setStoryHtml(formatStoryAsHtml(markdown));
    setStatusText('');
    setHasStory(true);
    setAssistEnabled(true);
    setSelectedWord('');
    setActiveTab('story');
  }, []);

  useEffect(() => {
    const handleFileLoaded = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; text?: string }>).detail;
      if (!detail?.text) return;
      loadStoryIntoApp(detail.title || 'Untitled Story', detail.text);
    };

    window.addEventListener('storygen:file-loaded', handleFileLoaded as EventListener);
    return () => {
      window.removeEventListener('storygen:file-loaded', handleFileLoaded as EventListener);
    };
  }, [loadStoryIntoApp]);

  // Combine age group and audience text into a single audience string for the pipeline
  const buildAudience = useCallback((): string => {
    const AGE_LABELS: Record<string, string> = {
      '3-4': 'children aged 3-4',
      '5-6': 'children aged 5-6',
      '7-8': 'children aged 7-8',
      '9-10': 'children aged 9-10',
      '11-12': 'children aged 11-12',
      '13-15': 'teenagers aged 13-15',
      '16-18': 'young adults aged 16-18',
      '18+': 'adults',
    };
    const label = AGE_LABELS[ageGroup] || '';
    if (label && audience.trim()) {
      return `${label}, ${audience.trim()}`;
    } else if (label) {
      return label;
    } else if (audience.trim()) {
      return audience.trim();
    }
    return 'children aged 5-7';
  }, [ageGroup, audience]);
  const updateUserSuggestions = useCallback((v: string) => { setUserSuggestions(v); saveToLocalStorage(LS_USER_SUGGESTIONS, v); }, []);
  
  const updateFramework = useCallback((v: string) => {
    setSelectedFramework(v);
    saveToLocalStorage(LS_SELECTED_FRAMEWORK, v);
  }, []);
  
  const updateStyle = useCallback((v: string) => {
    setSelectedStyle(v);
    saveToLocalStorage(LS_SELECTED_AUTHOR_STYLE, v);
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

  const getCurrentSensitivitySettings = useCallback((): SensitivitySettings | null => {
    if (sensitivityPreset === 'adventurous' || sensitivityPreset === 'standard') {
      // Check if actually at preset defaults
      const presetData = SENSITIVITY_LEVELS[sensitivityPreset];
      if (presetData && conflictLevel === presetData.conflict && scaryLevel === presetData.scary
        && sadnessLevel === presetData.sadness && complexityLevel === presetData.complexity) {
        return null;
      }
    }
    return { conflict: conflictLevel, scary: scaryLevel, sadness: sadnessLevel, complexity: complexityLevel };
  }, [sensitivityPreset, conflictLevel, scaryLevel, sadnessLevel, complexityLevel]);

  // ─── Generate story ───────────────────────────────────────────────────
  const handleGenerateStory = useCallback(async () => {
    if (!apiKey) { showToast('Please set your API key in Settings.', 'error'); return; }
    if (!characters.trim()) { showToast('Please enter at least one character.', 'error'); return; }
    if (!ageGroup) { showToast('Please select an age group.', 'error'); return; }

    setIsGenerating(true);
    setHasStory(false);
    setStoryTitle('Generating...');
    setStoryHtml('');
    setStatusText('');
    setAssistEnabled(false);
    setSelectedWord('');
    setActiveTab('story');
    appState.clearChatLog();

    // Build pipeline inputs
    const modelConfig = availableModels.find(m => m.name === selectedModel) || availableModels[0];
    const frameworkGuide = STORY_CRAFTING_GUIDES[selectedFramework] || '';
    const styleGuide = STORY_STYLE_GUIDES[selectedStyle] || '';

    let readingAgeNote = '';
    if (adjustReadingAge) {
      readingAgeNote = READING_AGE_ADJUSTMENT_TEXT_TEMPLATE.replace('${TARGET_READING_AGE}', String(targetReadingAge));
    }

    const adjustmentTexts: string[] = [];
    if (toneAdj !== 'default' && ADJUSTMENT_MODULES.tone?.[toneAdj]) adjustmentTexts.push(ADJUSTMENT_MODULES.tone[toneAdj]);
    if (pacingAdj !== 'default' && ADJUSTMENT_MODULES.pacing?.[pacingAdj]) adjustmentTexts.push(ADJUSTMENT_MODULES.pacing[pacingAdj]);
    if (humorAdj !== 'default' && ADJUSTMENT_MODULES.humor?.[humorAdj]) adjustmentTexts.push(ADJUSTMENT_MODULES.humor[humorAdj]);
    if (emotionAdj !== 'default' && ADJUSTMENT_MODULES.emotion?.[emotionAdj]) adjustmentTexts.push(ADJUSTMENT_MODULES.emotion[emotionAdj]);

    const sensitivitySettings = getCurrentSensitivitySettings();
    const sensitivityGuidance = sensitivitySettings ? getSensitivityGuidance(sensitivitySettings) : '';

    // Build thinking config
    const thinkingConfig: Record<string, boolean> = {};
    if (modelConfig.supportsThinking && thinkingEnabled) {
      thinkingConfig['Agent 1: Story Crafter'] = agentThinking.crafter;
      thinkingConfig['Agent 2: Story Elaborator'] = agentThinking.elaborator;
      thinkingConfig['Agent 3: Story Reviewer'] = agentThinking.reviewer;
      thinkingConfig['Agent 4: Story Polisher'] = agentThinking.polisher;
      thinkingConfig['Agent 5: Story Cleaner'] = agentThinking.cleaner;
      thinkingConfig['Agent 6: Story Titler'] = agentThinking.titler;
      thinkingConfig['Agent C: Story Consolidator'] = agentThinking.consolidator;
    }

    // STEM augmentation
    let augmentedFrameworkGuide = frameworkGuide;
    if (selectedFramework === 'Learning Fable (STEM)' && stemConcept) {
      augmentedFrameworkGuide += `\n\nSTEM Concept to teach: ${stemConcept}`;
    }

    const userSuggestionsText = includePlotPoints && userSuggestions.trim()
      ? `\n\nUser-provided plot points and story directions:\n${userSuggestions.trim()}`
      : '';

    const commonInputs = {
      apiKey,
      modelId: selectedModel,
      minApiIntervalMs: minApiInterval * 1000,
      audience: buildAudience(),
      CRAFT_GUIDE_TEXT: augmentedFrameworkGuide,
      READING_AGE_NOTE: readingAgeNote,
      USER_SUGGESTIONS_TEXT: userSuggestionsText,
      enableConsolidator,
      AUTHOR_STYLE_GUIDE: styleGuide,
      ADJUSTMENT_MODULES_TEXT: adjustmentTexts.join('\n\n'),
      NARRATOR_PERSONA_TEXT: '',
      SENSITIVITY_GUIDANCE_TEXT: sensitivityGuidance,
      agentThinkingConfig: thinkingConfig,
    };

    try {
      const charactersList = parseCharacters(characters);
      const pipelineConfig = getStoryGenerationPipelineConfig(enableConsolidator);
      const initialData = {
        charactersList: charactersList.join(', ') || 'a brave little mouse',
        storyText: '',
        reviewText: '',
        titleText: '',
      };

      const result = await runPipeline(
        pipelineConfig,
        initialData,
        commonInputs,
        (msg: string) => setStatusText(prev => prev + msg)
      );

      const title = (result.titleText || 'Untitled Story').trim();
      const story = (result.storyText || '').trim();

      loadStoryIntoApp(title, story);
      showToast('Story generated successfully!', 'success');

      const wordCount = countWords(story);
      console.log(`Story generated: "${title}" (${wordCount} words)`);

      // Auto-save to IndexedDB
      try {
        await saveStoryToLibrary({
          title,
          markdown: story,
          characters,
          audience: buildAudience(),
          framework: selectedFramework,
          style: selectedStyle,
          date: new Date().toISOString(),
          tone: toneAdj,
          pacing: pacingAdj,
          humor: humorAdj,
          emotion: emotionAdj,
          model: selectedModel,
          readingAge: adjustReadingAge ? targetReadingAge : null,
          consolidator: enableConsolidator,
          wordCount,
          plotPoints: includePlotPoints && userSuggestions.trim() ? userSuggestions.trim() : undefined,
          ageGroup: ageGroup || undefined,
        });
      } catch (e) {
        console.warn('Could not auto-save story:', e);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setStoryTitle('Error Occurred');
      setStoryHtml('<p>An error occurred. Please check the browser console for details.</p>');
      setHasStory(false);
      showToast('Story generation failed', 'error');
      console.error('Pipeline error:', msg);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, characters, audience, ageGroup, buildAudience, selectedFramework, selectedStyle, selectedModel, adjustReadingAge,
    targetReadingAge, enableConsolidator, toneAdj, pacingAdj, humorAdj, emotionAdj,
    thinkingEnabled, agentThinking, stemConcept, userSuggestions, includePlotPoints,
    minApiInterval, availableModels, getCurrentSensitivitySettings, loadStoryIntoApp, showToast]);

  // ─── Elaborate story ──────────────────────────────────────────────────
  const handleElaborateStory = useCallback(async () => {
    if (!appState.latestGeneratedStoryText) return;
    if (!apiKey) { showToast('Please set your API key in Settings.', 'error'); return; }

    setIsGenerating(true);
    setStatusText('');
    appState.clearChatLog();

    const modelConfig = availableModels.find(m => m.name === selectedModel) || availableModels[0];
    const thinkingConfig: Record<string, boolean> = {};
    if (modelConfig?.supportsThinking && thinkingEnabled) {
      thinkingConfig['Agent 2: Story Elaborator'] = agentThinking.elaborator;
      thinkingConfig['Agent 3: Story Reviewer'] = agentThinking.reviewer;
      thinkingConfig['Agent 4: Story Polisher'] = agentThinking.polisher;
      thinkingConfig['Agent 5: Story Cleaner'] = agentThinking.cleaner;
    }

    const commonInputs = {
      apiKey,
      modelId: selectedModel,
      minApiIntervalMs: minApiInterval * 1000,
      audience: buildAudience(),
      CRAFT_GUIDE_TEXT: '',
      READING_AGE_NOTE: '',
      USER_SUGGESTIONS_TEXT: '',
      enableConsolidator: false,
      AUTHOR_STYLE_GUIDE: STORY_STYLE_GUIDES[selectedStyle] || '',
      ADJUSTMENT_MODULES_TEXT: '',
      NARRATOR_PERSONA_TEXT: '',
      SENSITIVITY_GUIDANCE_TEXT: '',
      agentThinkingConfig: thinkingConfig,
    };

    try {
      const pipelineConfig = getElaborationPipelineConfig(false);
      const initialData = {
        storyText: appState.latestGeneratedStoryText,
        reviewText: '',
      };

      const result = await runPipeline(
        pipelineConfig,
        initialData,
        commonInputs,
        (msg: string) => setStatusText(prev => prev + msg)
      );

      const story = (result.storyText || '').trim();
      loadStoryIntoApp(appState.latestGeneratedStoryTitle || storyTitle || 'Untitled Story', story);
      showToast('Story elaborated successfully!', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      showToast('Elaboration failed', 'error');
      console.error('Elaboration error:', msg);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, selectedModel, characters, audience, ageGroup, buildAudience, selectedStyle, thinkingEnabled, agentThinking, minApiInterval, availableModels, loadStoryIntoApp, showToast, storyTitle]);

  // ─── Font size ────────────────────────────────────────────────────────
  const increaseFont = useCallback(() => setStoryFontSize(s => Math.min(s + 0.1, 2.0)), []);
  const decreaseFont = useCallback(() => setStoryFontSize(s => Math.max(s - 0.1, 0.7)), []);

  // ─── Export JSON ──────────────────────────────────────────────────────
  const handleExportJson = useCallback(() => {
    if (!appState.latestGeneratedStoryText) return;
    const storyTitle = appState.latestGeneratedStoryTitle || 'Untitled Story';
    const storyData = {
      title: storyTitle,
      markdown: appState.latestGeneratedStoryText,
      characters,
      audience: buildAudience(),
      ageGroup: ageGroup || undefined,
      framework: selectedFramework,
      style: selectedStyle,
      tone: toneAdj,
      pacing: pacingAdj,
      humor: humorAdj,
      emotion: emotionAdj,
      model: selectedModel,
      readingAge: adjustReadingAge ? targetReadingAge : null,
      consolidator: enableConsolidator,
      wordCount: countWords(appState.latestGeneratedStoryText),
      plotPoints: includePlotPoints && userSuggestions.trim() ? userSuggestions.trim() : undefined,
      date: new Date().toISOString(),
    };
    const json = JSON.stringify(storyData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = storyTitle.replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_').toLowerCase() || 'untitled_story';
    a.download = `${safeFilename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Story exported as JSON!', 'success');
  }, [characters, buildAudience, ageGroup, selectedFramework, selectedStyle, toneAdj, pacingAdj,
    humorAdj, emotionAdj, selectedModel, adjustReadingAge, targetReadingAge, enableConsolidator,
    includePlotPoints, userSuggestions, showToast]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (confirm('Reset all settings and data?')) {
          localStorage.clear();
          window.location.reload();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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
          isGenerating={isGenerating}
          onGenerate={handleGenerateStory}
          // Assist - pass through for now
          storyOutputRef={storyContentRef}
          selectedWord={selectedWord}
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
            setApiKey(settings.apiKey); saveToLocalStorage(LS_API_KEY, settings.apiKey);
            setSelectedModel(settings.selectedModel); saveToLocalStorage(LS_SELECTED_MODEL, settings.selectedModel);
            setMinApiInterval(settings.minApiInterval); saveToLocalStorage(LS_MIN_API_INTERVAL, String(settings.minApiInterval));
            setThinkingEnabled(settings.thinkingEnabled); saveToLocalStorage(LS_THINKING_ENABLED, String(settings.thinkingEnabled));
            setAgentThinking(settings.agentThinking);
            saveToLocalStorage(LS_THINKING_AGENT_1_CRAFTER, String(settings.agentThinking.crafter));
            saveToLocalStorage(LS_THINKING_AGENT_2_ELABORATOR, String(settings.agentThinking.elaborator));
            saveToLocalStorage(LS_THINKING_AGENT_3_REVIEWER, String(settings.agentThinking.reviewer));
            saveToLocalStorage(LS_THINKING_AGENT_4_POLISHER, String(settings.agentThinking.polisher));
            saveToLocalStorage(LS_THINKING_AGENT_5_CLEANER, String(settings.agentThinking.cleaner));
            saveToLocalStorage(LS_THINKING_AGENT_6_TITLER, String(settings.agentThinking.titler));
            saveToLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR, String(settings.agentThinking.consolidator));
            setTtsSource(settings.ttsSource); saveToLocalStorage(LS_TTS_SOURCE, settings.ttsSource);
            setTtsGender(settings.ttsGender); saveToLocalStorage(LS_TTS_GENDER, settings.ttsGender);
            setTtsVoice(settings.ttsVoice); saveToLocalStorage(LS_TTS_VOICE, settings.ttsVoice);
            setReadingAgeMin(settings.readingAgeMin); saveToLocalStorage(LS_READING_AGE_MIN, String(settings.readingAgeMin));
            setReadingAgeMax(settings.readingAgeMax); saveToLocalStorage(LS_READING_AGE_MAX, String(settings.readingAgeMax));
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
            setOnlineBrowserOpen(false);
          }}
          onClose={() => setOnlineBrowserOpen(false)}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
