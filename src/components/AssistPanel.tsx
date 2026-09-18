import { useState, useEffect, useCallback, useRef } from 'react';
import { lookupWord } from '../wiktionary';
import { buildPhonicsAssist, ensureRitaLoaded } from '../phonics';
import { trackVocabularyLookup, loadFromLocalStorage, saveToLocalStorage, LS_READ_ALOUD_FOLLOW } from '../localStorage';
import { normalizeVocabularyWord } from '../utils';
import {
  buildReadChunks,
  clearReadAloudFollow,
  showReadAloudChunk,
  wordIndexAtChar,
  type ReadChunk,
  type SelectionLength,
} from '../readAloud';
import type { AssistData, PhonicsAssist } from '../types';

interface AssistPanelProps {
  selectedWord: string;
  selectedWordIndex: number | null;
  storyContentRef: React.RefObject<HTMLElement | null>;
  onWordLookup?: (word: string) => void;
  ttsSource?: string;
  ttsVoice?: string;
  selectionLength?: SelectionLength;
}

const SOURCE_NAMES: Record<string, string> = {
  freedict: 'Free Dictionary',
  wiktionary: 'Wiktionary',
  cache: 'Cached',
};

const DIALECT_LABELS: Record<string, string> = { uk: 'UK', us: 'US' };

export function AssistPanel({ selectedWord, selectedWordIndex, storyContentRef, onWordLookup, ttsSource, ttsVoice, selectionLength = 'short' }: AssistPanelProps) {
  const [assistData, setAssistData] = useState<AssistData | null>(null);
  const [phonicsData, setPhonicsData] = useState<PhonicsAssist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isReadingRef = useRef(false);
  const isPausedRef = useRef(false);
  const [followAlong, setFollowAlong] = useState(() => loadFromLocalStorage(LS_READ_ALOUD_FOLLOW) !== 'false');
  const followAlongRef = useRef(followAlong);
  const currentChunkRef = useRef<ReadChunk | null>(null);
  const currentWordRef = useRef<HTMLElement | null>(null);
  // Chrome can garbage-collect an in-flight utterance and silently drop its
  // events unless something keeps a reference to it.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sessionRef = useRef<{
    root: HTMLElement;
    chunks: ReadChunk[];
    chunkIndex: number;
    /** Bumped whenever the in-flight utterance is abandoned so its late events are ignored. */
    generation: number;
    /** Where a paused read picks up again. */
    resumeWordIndex: number | null;
  } | null>(null);
  const [highlightedChunk, setHighlightedChunk] = useState<number | null>(null);
  const requestTokenRef = useRef(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const phonemeTokenRef = useRef(0);

  // Chrome populates getVoices() asynchronously, so the list is empty on the
  // first render and the chosen voice would be silently ignored.
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

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

    const normalizedWord = normalizeVocabularyWord(selectedWord);
    if (normalizedWord) {
      trackVocabularyLookup(normalizedWord);
    }

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

  const findVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    if (!ttsVoice) return undefined;
    return voices.find(v => v.name === ttsVoice);
  }, [ttsVoice, voices]);

  const stopPlayback = useCallback(() => {
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.cancel();
      // Chrome keeps the queue paused after cancel(); anything spoken next
      // would then sit silently until resume() is called.
      if (synth.paused) synth.resume();
    }
    utteranceRef.current = null;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
  }, []);

  const stopReadAloud = useCallback(() => {
    isReadingRef.current = false;
    isPausedRef.current = false;
    if (sessionRef.current) sessionRef.current.generation++;
    sessionRef.current = null;
    currentChunkRef.current = null;
    currentWordRef.current = null;
    stopPlayback();
    clearReadAloudFollow(storyContentRef.current);
    setIsPaused(false);
    setIsReading(false);
  }, [stopPlayback, storyContentRef]);

  useEffect(() => {
    followAlongRef.current = followAlong;
    if (isReading) {
      showReadAloudChunk(storyContentRef.current, currentChunkRef.current, followAlong, currentWordRef.current);
    } else {
      clearReadAloudFollow(storyContentRef.current);
    }
  }, [followAlong, isReading, storyContentRef]);

  const speakWord = useCallback((word: string) => {
    if (!('speechSynthesis' in window)) return;
    stopReadAloud();
    const utterance = new SpeechSynthesisUtterance(word);
    const voice = findVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-GB';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, [findVoice, stopReadAloud]);

  const speakSelectedWord = useCallback(() => {
    if (!selectedWord) return;
    stopReadAloud();

    // If ttsSource is "browser", always use the browser voice (skip dictionary audio)
    if (ttsSource !== 'dictionary' || !assistData?.audioUrl || !assistData.audioUrl.startsWith('http')) {
      speakWord(selectedWord);
      return;
    }

    // Dictionary mode: try dictionary audio, fall back to browser TTS
    stopPlayback();
    const audio = new Audio(assistData.audioUrl);
    activeAudioRef.current = audio;
    audio.addEventListener('ended', () => {
      if (activeAudioRef.current === audio) activeAudioRef.current = null;
    });
    audio.play().catch(() => {
      if (activeAudioRef.current === audio) activeAudioRef.current = null;
      speakWord(selectedWord);
    });
  }, [selectedWord, assistData, speakWord, stopPlayback, stopReadAloud, ttsSource]);

  const finishReadAloud = useCallback((root: HTMLElement | null) => {
    sessionRef.current = null;
    currentChunkRef.current = null;
    currentWordRef.current = null;
    utteranceRef.current = null;
    isReadingRef.current = false;
    isPausedRef.current = false;
    clearReadAloudFollow(root);
    setIsPaused(false);
    setIsReading(false);
  }, []);

  // One chunk, one utterance, one highlight. The chunk goes dark the moment
  // its utterance is queued, so follow-along keeps step on every voice —
  // including the many that never report word boundaries.
  const speakChunkAt = useCallback((chunkIndex: number) => {
    const session = sessionRef.current;
    if (!session || !isReadingRef.current || isPausedRef.current) return;
    if (chunkIndex >= session.chunks.length) {
      finishReadAloud(session.root);
      return;
    }

    session.chunkIndex = chunkIndex;
    const generation = ++session.generation;
    const chunk = session.chunks[chunkIndex];

    // The story was replaced under us (new story loaded mid-read).
    if (!session.root.isConnected || !chunk.wordEls[0]?.isConnected) {
      finishReadAloud(session.root);
      return;
    }

    currentChunkRef.current = chunk;
    currentWordRef.current = null;
    showReadAloudChunk(session.root, chunk, followAlongRef.current);

    // True only while this utterance is still the one the session cares about.
    // Pause, stop, and restart all bump the generation, so late onend/onerror
    // events from a cancelled utterance can never advance or double-speak.
    const isLive = () =>
      sessionRef.current === session
      && session.generation === generation
      && isReadingRef.current
      && !isPausedRef.current;

    const utterance = new SpeechSynthesisUtterance(chunk.text);
    const voice = findVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-GB';
    utterance.rate = 0.92;

    // Optional extra: voices that do report word boundaries also get the
    // exact word marked inside the dark chunk.
    utterance.onboundary = event => {
      if (!isLive()) return;
      if (event.name && event.name !== 'word') return;
      currentWordRef.current = chunk.wordEls[wordIndexAtChar(chunk, event.charIndex)] ?? null;
      showReadAloudChunk(session.root, chunk, followAlongRef.current, currentWordRef.current);
    };

    utterance.onend = () => {
      if (!isLive()) return;
      speakChunkAt(chunkIndex + 1);
    };
    utterance.onerror = event => {
      if (!isLive()) return;
      // Our own cancel() reports as interrupted/canceled; anything else is a
      // voice failure, so skip that chunk rather than stall.
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      speakChunkAt(chunkIndex + 1);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [findVoice, finishReadAloud]);

  const startReadAloud = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    const el = storyContentRef.current;
    if (!el) return;

    const startIndex = selectedWordIndex !== null && selectedWordIndex >= 0 ? selectedWordIndex : 0;
    const chunks = buildReadChunks(el, startIndex, selectionLength);
    if (chunks.length === 0) return;

    stopReadAloud();
    sessionRef.current = { root: el, chunks, chunkIndex: 0, generation: 0, resumeWordIndex: null };
    isPausedRef.current = false;
    isReadingRef.current = true;
    setIsPaused(false);
    setIsReading(true);
    speakChunkAt(0);
  }, [selectedWordIndex, selectionLength, speakChunkAt, stopReadAloud, storyContentRef]);

  // speechSynthesis.pause()/resume() is not dependable: Chrome ignores it for
  // remote voices, drops the utterance after ~15s paused, and does nothing if
  // the pause landed between two utterances. Pausing here cancels speech and
  // remembers the chunk, and resuming re-reads from the start of that chunk.
  const pauseReadAloud = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !isReadingRef.current || isPausedRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
    session.generation++;
    session.resumeWordIndex = currentChunkRef.current?.firstWordIndex
      ?? session.chunks[session.chunkIndex]?.firstWordIndex
      ?? null;
    stopPlayback();
    // Leave the highlight in place so the reader can see where it will pick up.
  }, [stopPlayback]);

  const resumeReadAloud = useCallback(() => {
    const session = sessionRef.current;
    const root = storyContentRef.current;
    if (!session || !isReadingRef.current || !isPausedRef.current) return;
    if (!root || !root.isConnected) {
      stopReadAloud();
      return;
    }

    // Rebuild from the DOM in case the story or the chunk setting changed while paused.
    const chunks = buildReadChunks(root, session.resumeWordIndex ?? 0, selectionLength);
    if (chunks.length === 0) {
      finishReadAloud(root);
      return;
    }

    isPausedRef.current = false;
    setIsPaused(false);
    session.root = root;
    session.chunks = chunks;
    session.chunkIndex = 0;
    session.resumeWordIndex = null;
    speakChunkAt(0);
  }, [finishReadAloud, selectionLength, speakChunkAt, stopReadAloud, storyContentRef]);

  useEffect(() => () => {
    stopReadAloud();
  }, [stopReadAloud]);

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
    // Tapping a second chunk must not let the first chunk's timers clear the
    // new highlight, so every play claims a token and only clears its own.
    const token = ++phonemeTokenRef.current;
    const clearHighlight = () => {
      if (phonemeTokenRef.current === token) setHighlightedChunk(null);
    };

    setHighlightedChunk(index);

    const filename = phoneme.toLowerCase().replace(/[^a-z]/g, '');
    if (filename) {
      const audio = new Audio(`./sounds/${filename}.mp3`);
      audio.onended = clearHighlight;
      audio.onerror = clearHighlight;
      audio.play().catch(() => {
        speakWord(phoneme);
      });
    }

    setTimeout(clearHighlight, 1500);
  }, [speakWord]);

  const handleChipClick = useCallback((word: string) => {
    onWordLookup?.(word);
  }, [onWordLookup]);

  return (
    <div className="assist-panel-content">
      <div className="assist-read-aloud-row">
        {!isReading && (
          <button
            className="btn btn-secondary assist-read-aloud-button"
            type="button"
            title={selectedWordIndex !== null && selectedWord ? `Read story from "${selectedWord}"` : 'Read story from start'}
            onClick={startReadAloud}
          >
            {'\uD83D\uDD08'}{' '}
            <span>{selectedWordIndex !== null && selectedWord ? `Read story from "${selectedWord}"` : 'Read story from start'}</span>
          </button>
        )}
        {isReading && (
          <>
            <button
              className="btn btn-secondary assist-read-aloud-button"
              type="button"
              title={isPaused ? 'Resume reading' : 'Pause reading'}
              onClick={isPaused ? resumeReadAloud : pauseReadAloud}
            >
              {isPaused ? '\u25B6' : '\u23F8'}{' '}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button
              className="btn btn-secondary assist-read-aloud-button assist-stop-button"
              type="button"
              title="Stop reading"
              onClick={stopReadAloud}
            >
              {'\u23F9'}{' '}
              <span>Stop</span>
            </button>
          </>
        )}
        <label className="assist-follow-toggle" title="Lighten the story and darken the words being read">
          <input
            type="checkbox"
            checked={followAlong}
            onChange={event => {
              const next = event.target.checked;
              setFollowAlong(next);
              saveToLocalStorage(LS_READ_ALOUD_FOLLOW, String(next));
            }}
          />
          <span>Follow</span>
        </label>
      </div>

      {selectedWord && !loading && (
        <div className="assist-read-aloud-row">
          <button
            className="btn btn-secondary assist-read-aloud-button"
            type="button"
            title={`Hear "${selectedWord}" spoken aloud`}
            onClick={speakSelectedWord}
          >
            {'\uD83D\uDD0A'}{' '}<span>Listen to "{selectedWord}"</span>
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
