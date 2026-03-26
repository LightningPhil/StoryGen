import { useState, useEffect, useCallback, useRef } from 'react';
import { lookupWord } from '../wiktionary';
import { buildPhonicsAssist, ensureRitaLoaded } from '../phonics';
import type { AssistData, PhonicsAssist } from '../types';

interface AssistPanelProps {
  selectedWord: string;
  storyContentRef: React.RefObject<HTMLElement | null>;
  onWordLookup?: (word: string) => void;
}

const SOURCE_NAMES: Record<string, string> = {
  freedict: 'Free Dictionary',
  wiktionary: 'Wiktionary',
  cache: 'Cached',
};

const DIALECT_LABELS: Record<string, string> = { uk: 'UK', us: 'US' };

export function AssistPanel({ selectedWord, storyContentRef, onWordLookup }: AssistPanelProps) {
  const [assistData, setAssistData] = useState<AssistData | null>(null);
  const [phonicsData, setPhonicsData] = useState<PhonicsAssist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [highlightedChunk, setHighlightedChunk] = useState<number | null>(null);
  const requestTokenRef = useRef(0);

  useEffect(() => {
    if (!selectedWord) {
      setAssistData(null);
      setPhonicsData(null);
      setError('');
      setLoading(false);
      return;
    }

    const token = ++requestTokenRef.current;
    setLoading(true);
    setError('');
    setAssistData(null);
    setPhonicsData(null);

    lookupWord(selectedWord)
      .then(result => {
        if (token !== requestTokenRef.current) return;

        if (!result) {
          setError(`"${selectedWord}" isn't in the dictionary - it might be a name or a made-up word from the story!`);
        } else {
          setAssistData(result);
        }

        setLoading(false);
      })
      .catch(() => {
        if (token !== requestTokenRef.current) return;
        setError("Couldn't load help for this word. Try another.");
        setLoading(false);
      });

    ensureRitaLoaded()
      .then(() => {
        if (token !== requestTokenRef.current) return;
        const phonics = buildPhonicsAssist(selectedWord);
        if (token === requestTokenRef.current) {
          setPhonicsData(phonics);
        }
      })
      .catch(() => {
        // Phonics is best-effort.
      });
  }, [selectedWord]);

  const speakWord = useCallback((word: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakSelectedWord = useCallback(() => {
    if (!selectedWord) return;

    if (assistData?.audioUrl && assistData.audioUrl.startsWith('http')) {
      const audio = new Audio(assistData.audioUrl);
      audio.play().catch(() => speakWord(selectedWord));
      return;
    }

    speakWord(selectedWord);
  }, [selectedWord, assistData, speakWord]);

  const handleReadAloud = useCallback(() => {
    if (!('speechSynthesis' in window)) return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const el = storyContentRef.current;
    if (!el) return;

    let text = '';
    const selectedEl = el.querySelector('.story-word.is-selected') as HTMLElement | null;
    if (selectedEl) {
      const allWords = Array.from(el.querySelectorAll('.story-word'));
      const startIdx = allWords.indexOf(selectedEl);
      if (startIdx >= 0) {
        text = allWords.slice(startIdx).map(wordEl => wordEl.textContent || '').join(' ').trim();
      }
    }

    if (!text) {
      text = el.textContent?.trim() || '';
    }
    if (!text) return;

    const chunks = (text.match(/[^.!?]+[.!?]*/g) || [text])
      .map(chunk => chunk.trim())
      .filter(Boolean);

    setIsReading(true);
    let finished = 0;
    const onDone = () => {
      finished++;
      if (finished >= chunks.length) {
        setIsReading(false);
      }
    };

    for (const chunk of chunks) {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      utterance.onend = onDone;
      utterance.onerror = onDone;
      window.speechSynthesis.speak(utterance);
    }
  }, [isReading, storyContentRef]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Keep the audio pipeline primed with a silent oscillator so TTS doesn't
  // fade-in/ramp at the start of every sentence.
  useEffect(() => {
    let ctx: AudioContext | undefined;
    try {
      ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;   // effectively silent
      osc.frequency.value = 440;  // inaudible at this gain
      osc.connect(gain).connect(ctx.destination);
      osc.start();
    } catch {
      // AudioContext not supported — TTS will still work, just with the ramp
    }
    return () => {
      ctx?.close().catch(() => {});
    };
  }, []);

  const playPhonemeSound = useCallback((phoneme: string, index: number) => {
    setHighlightedChunk(index);

    const filename = phoneme.toLowerCase().replace(/[^a-z]/g, '');
    if (filename) {
      const audio = new Audio(`./sounds/${filename}.mp3`);
      audio.play().catch(() => {
        speakWord(phoneme);
      });
      audio.onended = () => setHighlightedChunk(null);
      audio.onerror = () => setHighlightedChunk(null);
    }

    setTimeout(() => setHighlightedChunk(null), 1500);
  }, [speakWord]);

  const handleChipClick = useCallback((word: string) => {
    onWordLookup?.(word);
  }, [onWordLookup]);

  return (
    <div className="assist-panel-content">
      <div className="assist-read-aloud-row">
        <button
          className={`btn btn-secondary assist-read-aloud-button${isReading ? ' assist-stop-button' : ''}`}
          type="button"
          title={isReading ? 'Stop reading' : (selectedWord ? `Read story from "${selectedWord}"` : 'Read story from start')}
          onClick={handleReadAloud}
        >
          {isReading ? '\u23F9' : '\uD83D\uDD08'}{' '}
          <span>{isReading ? 'Stop reading' : (selectedWord ? `Read story from "${selectedWord}"` : 'Read story from start')}</span>
        </button>
      </div>

      {selectedWord && !loading && (
        <div className="assist-read-aloud-row">
          <button
            className="btn btn-secondary assist-read-aloud-button"
            type="button"
            title={`Hear "${selectedWord}" spoken aloud`}
            onClick={speakSelectedWord}
          >
            \uD83D\uDD0A <span>Listen to "{selectedWord}"</span>
          </button>
        </div>
      )}

      {!selectedWord && !loading && (
        <div className="assist-empty-state">
          <p>Click a word in the story to see its definition, hear its pronunciation and explore its sounds.</p>
        </div>
      )}

      {loading && (
        <div className="assist-status">
          Looking up "{selectedWord}"...
        </div>
      )}

      {error && !loading && (
        <div className="assist-status-error">
          {error}
        </div>
      )}

      {selectedWord && !loading && (
        <div className="assist-word-state">
          <div className="assist-pronunciation-row">
            <h3 className="assist-word-heading">{selectedWord}</h3>
            {assistData?.ipa && (
              <span className="assist-ipa">
                {assistData.ipa}
                {assistData.ipaDialect && ` (${DIALECT_LABELS[assistData.ipaDialect] || assistData.ipaDialect})`}
              </span>
            )}
          </div>

          {assistData && assistData.definitions.length > 0 && (
            <div className="assist-section">
              <h4>Definitions</h4>
              {assistData.definitions.map((group, gi) => (
                <div key={gi} className="assist-definitions-group">
                  <div className="assist-definitions-pos">{group.partOfSpeech}</div>
                  <ol className="assist-definitions-list">
                    {group.glosses.map((gloss, di) => (
                      <li key={di}>{gloss}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}

          {assistData && assistData.definitions.length === 0 && !error && (
            <div className="assist-section">
              <p className="assist-none">No definition found.</p>
            </div>
          )}

          {assistData && assistData.synonyms.length > 0 && (
            <div className="assist-section">
              <h4>Similar Words</h4>
              <div className="assist-word-chips">
                {assistData.synonyms.slice(0, 12).map((syn, i) => (
                  <button key={i} type="button" className="assist-word-chip" onClick={() => handleChipClick(syn)}>
                    {syn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {assistData && assistData.antonyms.length > 0 && (
            <div className="assist-section">
              <h4>Opposite Words</h4>
              <div className="assist-word-chips">
                {assistData.antonyms.slice(0, 8).map((ant, i) => (
                  <button key={i} type="button" className="assist-word-chip" onClick={() => handleChipClick(ant)}>
                    {ant}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phonicsData && !phonicsData.fallback && phonicsData.chunks.length > 0 && (
            <div className="assist-section phonics-section">
              <h4>Sound It Out</h4>
              <div className="phonics-chunks-row">
                {phonicsData.chunks.map((chunk, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`phonics-chunk${highlightedChunk === i ? ' is-highlighted' : ''}`}
                    onClick={() => chunk.phoneme && playPhonemeSound(chunk.ttsHint || chunk.phoneme, i)}
                    title={chunk.phoneme ? `Click to hear "${chunk.grapheme}"` : 'Silent'}
                    disabled={!chunk.phoneme}
                  >
                    <span className="phonics-grapheme">{chunk.grapheme}</span>
                    {chunk.phoneme && <span className="phonics-phoneme">{chunk.phoneme}</span>}
                  </button>
                ))}
              </div>
              <div className="phonics-disclaimer">Tap each piece to hear its sound</div>
            </div>
          )}

          {assistData?.source && (
            <div className="assist-source">
              Source: {SOURCE_NAMES[assistData.source] || assistData.source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
