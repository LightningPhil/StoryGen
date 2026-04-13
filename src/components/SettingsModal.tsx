import { useState, useEffect } from 'react';
import appState from '../appState';
import { loadVocabularyLookupData, removeFromLocalStorage, LS_VOCAB_LOOKUPS } from '../localStorage';
import type { ModelConfig } from '../types';

interface AgentThinkingState {
  crafter: boolean;
  elaborator: boolean;
  reviewer: boolean;
  polisher: boolean;
  cleaner: boolean;
  titler: boolean;
  consolidator: boolean;
}

interface SettingsData {
  apiKey: string;
  selectedModel: string;
  minApiInterval: number;
  thinkingEnabled: boolean;
  agentThinking: AgentThinkingState;
  ttsSource: string;
  ttsGender: string;
  ttsVoice: string;
  readingAgeMin: number;
  readingAgeMax: number;
}

interface SettingsModalProps {
  apiKey: string;
  selectedModel: string;
  minApiInterval: number;
  thinkingEnabled: boolean;
  agentThinking: AgentThinkingState;
  availableModels: ModelConfig[];
  modelsLoading: boolean;
  onRefreshModels: (apiKey: string) => void;
  ttsSource: string;
  ttsGender: string;
  ttsVoice: string;
  readingAgeMin: number;
  readingAgeMax: number;
  onSave: (settings: SettingsData) => void;
  onClose: () => void;
}

export function SettingsModal(props: SettingsModalProps) {
  const { availableModels, modelsLoading, onRefreshModels, onSave, onClose } = props;

  // Local state for editing
  const [apiKey, setApiKey] = useState(props.apiKey);
  const [selectedModel, setSelectedModel] = useState(props.selectedModel);
  const [minApiInterval, setMinApiInterval] = useState(props.minApiInterval);
  const [thinkingEnabled, setThinkingEnabled] = useState(props.thinkingEnabled);
  const [agentThinking, setAgentThinking] = useState({ ...props.agentThinking });
  const [ttsSource, setTtsSource] = useState(props.ttsSource);
  const [ttsGender, setTtsGender] = useState(props.ttsGender);
  const [ttsVoice, setTtsVoice] = useState(props.ttsVoice);
  const [readingAgeMin, setReadingAgeMin] = useState(props.readingAgeMin);
  const [readingAgeMax, setReadingAgeMax] = useState(props.readingAgeMax);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load TTS voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v.filter(voice => voice.lang.toLowerCase().startsWith('en')));
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const currentModelConfig = availableModels.find(m => m.name === selectedModel);
  const canThink = currentModelConfig?.supportsThinking ?? false;
  const showAgentToggles = canThink && thinkingEnabled;

  const updateAgentToggle = (key: keyof AgentThinkingState, value: boolean) => {
    setAgentThinking(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave({
      apiKey, selectedModel, minApiInterval, thinkingEnabled,
      agentThinking, ttsSource, ttsGender, ttsVoice,
      readingAgeMin, readingAgeMax,
    });
  };

  const handleDownloadChatLog = () => {
    const data = JSON.stringify(appState.lastRunChatLog, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story_generator_chat_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportVocab = () => {
    const data = JSON.stringify(loadVocabularyLookupData(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story_vocabulary_data_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearVocab = () => {
    if (confirm('Clear all vocabulary lookup history? This cannot be undone.')) {
      removeFromLocalStorage(LS_VOCAB_LOOKUPS);
    }
  };

  // Filter voices by gender
  const filteredVoices = voices.filter(v => {
    const name = v.name.toLowerCase();
    if (ttsGender === 'female') return /female|woman|girl|zira|hazel|susan|jenny|linda|aria|sara|elsa|catherine/i.test(name) || !/male|man|boy|david|mark|james|george|richard|daniel|sean/i.test(name);
    return /male|man|boy|david|mark|james|george|richard|daniel|sean/i.test(name);
  });

  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-lg">
        <header className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" aria-label="Close modal" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="modalApiKeyInput">Gemini API Key</label>
            <input type="password" id="modalApiKeyInput" placeholder="Enter your Gemini API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>

          <div className="modal-grid">
            <div className="field">
              <label htmlFor="modalModelSelect">Gemini Model</label>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', position: 'relative' }}>
                <select id="modalModelSelect" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={modelsLoading} style={{ flex: 1 }}>
                  {availableModels.length === 0 ? (
                    <option value="">No models found (check API key)</option>
                  ) : (
                    availableModels.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  className="btn btn-sm"
                  title="Refresh model list"
                  onClick={() => onRefreshModels(apiKey)}
                  disabled={modelsLoading}
                  style={{
                    padding: '0.35rem 0.55rem',
                    fontSize: '0.95rem',
                    lineHeight: 1,
                    ...(modelsLoading ? { animation: 'spin 1s linear infinite' } : {}),
                  }}
                >
                  &#x21bb;
                </button>
                {modelsLoading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-panel, rgba(255,255,255,0.85))',
                    borderRadius: '0.35rem',
                    zIndex: 2,
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted, #666)',
                  }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>&#x21bb;</span>
                    Fetching models&hellip;
                  </div>
                )}
              </div>
            </div>
            <div className="field">
              <label htmlFor="minApiIntervalInput">Min. API Interval (seconds)</label>
              <input type="number" id="minApiIntervalInput" min={0} step={1} value={minApiInterval} onChange={e => setMinApiInterval(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-group-title">Reading Age Slider Limits</label>
            <div className="inline-fields">
              <div className="field field-inline">
                <label htmlFor="readingAgeMinInput">Min</label>
                <input type="number" id="readingAgeMinInput" min={3} max={18} step={1} value={readingAgeMin} onChange={e => setReadingAgeMin(parseInt(e.target.value) || 3)} />
              </div>
              <div className="field field-inline">
                <label htmlFor="readingAgeMaxInput">Max</label>
                <input type="number" id="readingAgeMaxInput" min={3} max={18} step={1} value={readingAgeMax} onChange={e => setReadingAgeMax(parseInt(e.target.value) || 18)} />
              </div>
            </div>
          </div>

          <div className="field-group">
            <label className="field-group-title">Pronunciation</label>
            <div className="field">
              <label htmlFor="ttsSourceSelect">Audio Source</label>
              <select id="ttsSourceSelect" value={ttsSource} onChange={e => setTtsSource(e.target.value)}>
                <option value="dictionary">Dictionary recordings (natural, but voice varies per word)</option>
                <option value="browser">Browser voice (consistent voice, sounds robotic)</option>
              </select>
            </div>
            {ttsSource === 'browser' && (
              <div className="modal-grid">
                <div className="field">
                  <label htmlFor="ttsGenderSelect">Voice Type</label>
                  <select id="ttsGenderSelect" value={ttsGender} onChange={e => setTtsGender(e.target.value)}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="ttsVoiceSelect">Voice</label>
                  <select id="ttsVoiceSelect" value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}>
                    <option value="">Auto (best available)</option>
                    {filteredVoices.map(v => (
                      <option key={v.name} value={v.name}>{v.name}{v.localService ? '' : ' (online)'}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="field-group">
            <label className="field-group-title">Agent Thinking</label>
            <p className="field-group-hint">Thinking models reason more deeply but are slower. Disable for faster generation.</p>
            <label className="toggle-label">
              <input type="checkbox" checked={thinkingEnabled} disabled={!canThink} onChange={e => setThinkingEnabled(e.target.checked)} />
              <span>Enable Thinking</span>
            </label>
            {showAgentToggles && (
              <div className="toggle-grid" style={{ marginTop: '0.75rem' }}>
                <label className="toggle-label"><input type="checkbox" checked={agentThinking.crafter} onChange={e => updateAgentToggle('crafter', e.target.checked)} /><span>Agent 1: Crafter</span></label>
                <label className="toggle-label"><input type="checkbox" checked={agentThinking.elaborator} onChange={e => updateAgentToggle('elaborator', e.target.checked)} /><span>Agent 2: Elaborator</span></label>
                <label className="toggle-label"><input type="checkbox" checked={agentThinking.reviewer} onChange={e => updateAgentToggle('reviewer', e.target.checked)} /><span>Agent 3: Reviewer</span></label>
                <label className="toggle-label"><input type="checkbox" checked={agentThinking.polisher} onChange={e => updateAgentToggle('polisher', e.target.checked)} /><span>Agent 4: Polisher</span></label>
                <label className="toggle-label"><input type="checkbox" checked={agentThinking.cleaner} onChange={e => updateAgentToggle('cleaner', e.target.checked)} /><span>Agent 5: Cleaner</span></label>
                <label className="toggle-label"><input type="checkbox" checked={agentThinking.titler} onChange={e => updateAgentToggle('titler', e.target.checked)} /><span>Agent 6: Titler</span></label>
                <label className="toggle-label"><input type="checkbox" checked={agentThinking.consolidator} onChange={e => updateAgentToggle('consolidator', e.target.checked)} /><span>Agent C: Consolidator</span></label>
              </div>
            )}
          </div>
        </div>
        <footer className="modal-footer">
          <div className="modal-footer-left">
            <button className="btn btn-secondary" onClick={handleDownloadChatLog}>Download Session Log</button>
            <button className="btn btn-secondary" onClick={handleExportVocab}>Export Vocabulary Data</button>
            <button className="btn btn-ghost" onClick={handleClearVocab}>Clear Vocabulary Data</button>
          </div>
          <div className="modal-footer-right">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save &amp; Close</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
