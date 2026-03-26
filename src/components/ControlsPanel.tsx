import { ADJUSTMENT_MODULES } from '../prompts/adjustment_modules';
import { SENSITIVITY_LEVELS } from '../appState';
import { AssistPanel } from './AssistPanel';
import type { ToastMessage } from '../App';

const SENSITIVITY_LABELS: string[] = ['None', 'Gentle', 'Standard', 'Adventurous'];

const STEM_OPTIONS = [
  { group: 'Physics', items: [
    { value: 'displacement', label: 'Displacement (Crow & Pitcher)' },
    { value: 'leverage', label: 'Leverage & Simple Machines' },
    { value: 'momentum', label: 'Momentum & Mass' },
    { value: 'buoyancy', label: 'Buoyancy & Floating' },
    { value: 'friction', label: 'Friction & Movement' },
    { value: 'aerodynamics', label: 'Aerodynamics & Flight' },
  ]},
  { group: 'Mathematics', items: [
    { value: 'counting', label: 'Counting & Division' },
    { value: 'patterns', label: 'Patterns & Sequences' },
    { value: 'geometry', label: 'Shapes & Geometry' },
    { value: 'estimation', label: 'Estimation & Measurement' },
  ]},
  { group: 'Biology & Nature', items: [
    { value: 'metamorphosis', label: 'Metamorphosis & Change' },
    { value: 'camouflage', label: 'Camouflage & Adaptation' },
    { value: 'ecosystems', label: 'Ecosystems & Interdependence' },
    { value: 'lifecycles', label: 'Life Cycles' },
    { value: 'echolocation', label: 'Sound Waves & Echolocation' },
  ]},
  { group: 'Engineering & Logic', items: [
    { value: 'problem_solving', label: 'Iterative Problem Solving' },
    { value: 'materials', label: 'Material Properties' },
    { value: 'structures', label: 'Strong Structures' },
  ]},
];

interface ControlsPanelProps {
  // Tab
  activeTab: 'story' | 'options' | 'assist';
  onTabChange: (tab: 'story' | 'options' | 'assist') => void;
  assistEnabled: boolean;
  // Header
  theme: string;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  // Story tab
  characters: string;
  onCharactersChange: (v: string) => void;
  audience: string;
  onAudienceChange: (v: string) => void;
  ageGroup: string;
  onAgeGroupChange: (v: string) => void;
  selectedFramework: string;
  onOpenFrameworkModal: () => void;
  selectedStyle: string;
  onOpenStyleModal: () => void;
  includePlotPoints: boolean;
  onIncludePlotPointsChange: (v: boolean) => void;
  userSuggestions: string;
  onUserSuggestionsChange: (v: string) => void;
  // Options tab
  sensitivityPreset: string;
  onSensitivityPresetChange: (v: string) => void;
  conflictLevel: number;
  scaryLevel: number;
  sadnessLevel: number;
  complexityLevel: number;
  onConflictChange: (v: number) => void;
  onScaryChange: (v: number) => void;
  onSadnessChange: (v: number) => void;
  onComplexityChange: (v: number) => void;
  adjustReadingAge: boolean;
  onAdjustReadingAgeChange: (v: boolean) => void;
  targetReadingAge: number;
  onTargetReadingAgeChange: (v: number) => void;
  readingAgeMin: number;
  readingAgeMax: number;
  enableConsolidator: boolean;
  onEnableConsolidatorChange: (v: boolean) => void;
  stemConcept: string;
  onStemConceptChange: (v: string) => void;
  selectedFrameworkForSTEM: string;
  // Adjustments
  toneAdj: string;
  pacingAdj: string;
  humorAdj: string;
  emotionAdj: string;
  onToneChange: (v: string) => void;
  onPacingChange: (v: string) => void;
  onHumorChange: (v: string) => void;
  onEmotionChange: (v: string) => void;
  // Generate
  isGenerating: boolean;
  onGenerate: () => void;
  // Assist (passed through)
  storyOutputRef: React.RefObject<HTMLElement | null> | null;
  selectedWord: string;
  onWordLookup: (word: string) => void;
  ttsSource: string;
  ttsGender: string;
  ttsVoice: string;
  showToast: (msg: string, type?: ToastMessage['type']) => void;
}

export function ControlsPanel(props: ControlsPanelProps) {
  const {
    activeTab, onTabChange, assistEnabled,
    theme, onToggleTheme, onOpenSettings, onOpenHelp,
    characters, onCharactersChange, audience, onAudienceChange,
    ageGroup, onAgeGroupChange,
    selectedFramework, onOpenFrameworkModal, selectedStyle, onOpenStyleModal,
    includePlotPoints, onIncludePlotPointsChange, userSuggestions, onUserSuggestionsChange,
    sensitivityPreset, onSensitivityPresetChange,
    conflictLevel, scaryLevel, sadnessLevel, complexityLevel,
    onConflictChange, onScaryChange, onSadnessChange, onComplexityChange,
    adjustReadingAge, onAdjustReadingAgeChange, targetReadingAge, onTargetReadingAgeChange,
    readingAgeMin, readingAgeMax,
    enableConsolidator, onEnableConsolidatorChange,
    stemConcept, onStemConceptChange, selectedFrameworkForSTEM,
    isGenerating, onGenerate,
  } = props;

  const isLearningFable = selectedFrameworkForSTEM === 'Learning Fable (STEM)';

  const sensitivitySummaryText = (() => {
    if (sensitivityPreset !== 'custom') {
      const summaries: Record<string, string> = {
        extra_gentle: "\u{1F338} Extra gentle mode: No conflict, scary elements, or sad moments. Very simple stories.",
        gentle: "\u{1F33C} Gentle mode: Minimal challenges with quick resolutions. Easy, comforting stories.",
        standard: "\u{1F33B} Standard mode: Age-appropriate content with traditional story elements.",
        adventurous: "\u{1F31F} Adventurous mode: Fuller exploration of themes with more complex narratives."
      };
      return summaries[sensitivityPreset] || '';
    }
    return `Custom settings: Conflict ${SENSITIVITY_LABELS[conflictLevel]}, Scary ${SENSITIVITY_LABELS[scaryLevel]}, Sadness ${SENSITIVITY_LABELS[sadnessLevel]}, Complexity ${SENSITIVITY_LABELS[complexityLevel]}`;
  })();

  return (
    <aside className="controls-panel">
      {/* Header */}
      <header className="panel-header">
        <h1>StoryGen</h1>
        <div className="header-actions">
          <button className="icon-button" aria-label="Toggle theme" title="Toggle light/dark mode" onClick={onToggleTheme}>
            <svg className="icon-sun" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg className="icon-moon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <button className="icon-button" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button className="icon-button" aria-label="Help" title="Help" onClick={onOpenHelp}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="panel-content">
        {/* Tab nav */}
        <nav className="tabs-nav" role="tablist">
          <button className={`tab-btn${activeTab === 'story' ? ' active' : ''}`} onClick={() => onTabChange('story')} role="tab" aria-selected={activeTab === 'story'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Story
          </button>
          <button className={`tab-btn${activeTab === 'options' ? ' active' : ''}`} onClick={() => onTabChange('options')} role="tab" aria-selected={activeTab === 'options'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="14" r="2"/></svg>
            Options
          </button>
          <button className={`tab-btn${activeTab === 'assist' ? ' active' : ''}`} onClick={() => onTabChange('assist')} role="tab" aria-selected={activeTab === 'assist'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Assist
          </button>
        </nav>

        {/* Tab panels */}
        <div className="tabs-content">
          {/* Story tab */}
          <div className={`tab-panel${activeTab === 'story' ? ' active' : ''}`} role="tabpanel">
            <div className="field">
              <label htmlFor="charactersInput">Characters</label>
              <textarea id="charactersInput" rows={2} placeholder="e.g., a curious fox named Felix, a wise owl" value={characters} onChange={e => onCharactersChange(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ageGroupSelect">Age Group <span style={{ color: 'var(--color-error, #c33)' }}>*</span></label>
              <select id="ageGroupSelect" value={ageGroup} onChange={e => onAgeGroupChange(e.target.value)} required>
                <option value="" disabled>Choose an age range…</option>
                <option value="3-4">3–4 years</option>
                <option value="5-6">5–6 years</option>
                <option value="7-8">7–8 years</option>
                <option value="9-10">9–10 years</option>
                <option value="11-12">11–12 years</option>
                <option value="13-15">13–15 years (Teen)</option>
                <option value="16-18">16–18 years (Young Adult)</option>
                <option value="18+">18+ (Adult)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="audienceInput">Audience Description</label>
              <input type="text" id="audienceInput" placeholder="e.g., who enjoy adventure stories" value={audience} onChange={e => onAudienceChange(e.target.value)} />
            </div>
            <div className="field">
              <label>Story Framework</label>
              <button className="selector-button" type="button" onClick={onOpenFrameworkModal}>
                <span>{selectedFramework || 'Select a framework...'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div className="field">
              <label>Authorial Style</label>
              <button className="selector-button" type="button" onClick={onOpenStyleModal}>
                <span>{selectedStyle || 'Select a style...'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div className="field">
              <label className="toggle-label">
                <input type="checkbox" checked={includePlotPoints} onChange={e => onIncludePlotPointsChange(e.target.checked)} />
                <span>Include plot points</span>
              </label>
            </div>
            {includePlotPoints && (
              <div className="field">
                <label htmlFor="userSuggestionsTextarea">Plot Points</label>
                <textarea id="userSuggestionsTextarea" rows={3} placeholder="Enter your own plot points, scene ideas, or story directions..." value={userSuggestions} onChange={e => onUserSuggestionsChange(e.target.value)} />
              </div>
            )}
          </div>

          {/* Options tab */}
          <div className={`tab-panel${activeTab === 'options' ? ' active' : ''}`} role="tabpanel">
            <div className="field">
              <label htmlFor="sensitivityPresetSelect">Content Sensitivity</label>
              <select id="sensitivityPresetSelect" value={sensitivityPreset} onChange={e => onSensitivityPresetChange(e.target.value)}>
                <option value="extra_gentle">Extra Gentle (Ages 3-4)</option>
                <option value="gentle">Gentle (Ages 4-6)</option>
                <option value="standard">Standard (Ages 6-9)</option>
                <option value="adventurous">Adventurous (Ages 9+)</option>
                <option value="custom">Custom...</option>
              </select>
              <div className="field-hint">{sensitivitySummaryText}</div>
            </div>

            {sensitivityPreset === 'custom' && (
              <div className="custom-controls">
                <div className="sensitivity-row">
                  <label htmlFor="conflictSlider">Conflict Level</label>
                  <input type="range" id="conflictSlider" min={0} max={3} value={conflictLevel} className="sensitivity-slider" onChange={e => onConflictChange(parseInt(e.target.value))} />
                  <span className="sensitivity-value">{SENSITIVITY_LABELS[conflictLevel]}</span>
                </div>
                <div className="sensitivity-row">
                  <label htmlFor="scarySlider">Scary Elements</label>
                  <input type="range" id="scarySlider" min={0} max={3} value={scaryLevel} className="sensitivity-slider" onChange={e => onScaryChange(parseInt(e.target.value))} />
                  <span className="sensitivity-value">{SENSITIVITY_LABELS[scaryLevel]}</span>
                </div>
                <div className="sensitivity-row">
                  <label htmlFor="sadnessSlider">Sad Moments</label>
                  <input type="range" id="sadnessSlider" min={0} max={3} value={sadnessLevel} className="sensitivity-slider" onChange={e => onSadnessChange(parseInt(e.target.value))} />
                  <span className="sensitivity-value">{SENSITIVITY_LABELS[sadnessLevel]}</span>
                </div>
                <div className="sensitivity-row">
                  <label htmlFor="complexitySlider">Story Complexity</label>
                  <input type="range" id="complexitySlider" min={0} max={3} value={complexityLevel} className="sensitivity-slider" onChange={e => onComplexityChange(parseInt(e.target.value))} />
                  <span className="sensitivity-value">{SENSITIVITY_LABELS[complexityLevel]}</span>
                </div>
              </div>
            )}

            <div className="field-divider" />

            {/* STEM Concept (conditional) */}
            {isLearningFable && (
              <div className="field conditional">
                <label htmlFor="stemConceptSelect">STEM Concept to Teach</label>
                <select id="stemConceptSelect" value={stemConcept} onChange={e => onStemConceptChange(e.target.value)}>
                  <option value="">-- Select a concept --</option>
                  {STEM_OPTIONS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.items.map(item => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label className="toggle-label">
                <input type="checkbox" checked={adjustReadingAge} onChange={e => onAdjustReadingAgeChange(e.target.checked)} />
                <span>Adjust vocabulary for difficulty</span>
              </label>
            </div>

            <div className={`slider-container${!adjustReadingAge ? ' disabled' : ''}`}>
              <div className="slider-row">
                <span className="slider-min">Younger</span>
                <input type="range" min={readingAgeMin} max={readingAgeMax} step={1} value={targetReadingAge} disabled={!adjustReadingAge} aria-label="Vocabulary difficulty" onChange={e => onTargetReadingAgeChange(parseInt(e.target.value))} />
                <span className="slider-max">Older</span>
              </div>
            </div>

            <div className="field-divider" />

            <div className="field">
              <label className="toggle-label">
                <input type="checkbox" checked={enableConsolidator} onChange={e => onEnableConsolidatorChange(e.target.checked)} />
                <span>Consolidate for conciseness</span>
              </label>
              <div className="field-hint">Runs an extra pass to tighten the story and remove redundancy.</div>
            </div>
          </div>

          {/* Assist tab */}
          <div className={`tab-panel${activeTab === 'assist' ? ' active' : ''}`} role="tabpanel">
            <AssistPanel
              selectedWord={props.selectedWord}
              storyContentRef={props.storyOutputRef as React.RefObject<HTMLElement | null>}
              onWordLookup={props.onWordLookup}
            />
          </div>
        </div>
      </div>

      {/* Generate button */}
      <footer className="panel-footer">
        <button className="btn btn-primary btn-generate" onClick={onGenerate} disabled={isGenerating}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          {isGenerating ? 'Generating...' : 'Generate Story'}
        </button>
      </footer>
    </aside>
  );
}
