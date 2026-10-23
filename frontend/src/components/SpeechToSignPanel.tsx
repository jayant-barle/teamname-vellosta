import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, CheckCircle2, Send, Search, Film } from 'lucide-react';
import type { PhraseItem } from '../services/apiClient';

interface SpeechToSignPanelProps {
  phrases: PhraseItem[];
  selectedPhrase: PhraseItem | null;
  onSelectPhrase: (phrase: PhraseItem) => void;
  onCustomWordChange: (word: string) => void;
  onSendMessage?: (text: string, matchedPhraseId?: string) => void;
}

const CATEGORIES = ['All', 'Greetings', 'Courtesy', 'Assistance', 'Responses', 'Questions'];

export const SpeechToSignPanel: React.FC<SpeechToSignPanelProps> = ({
  phrases,
  selectedPhrase,
  onSelectPhrase,
  onCustomWordChange,
  onSendMessage,
}) => {
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const recognitionRef = useRef<any>(null);

  // Match spoken or typed text with phrase library
  const matchPhraseFromText = useCallback(
    (text: string) => {
      const cleaned = text.toLowerCase().trim();
      if (!cleaned) return;

      onCustomWordChange(cleaned);

      const matched = phrases.find(
        (p) =>
          cleaned.includes(p.phrase.toLowerCase()) ||
          p.tags.some((tag) => cleaned.includes(tag.toLowerCase()))
      );

      if (matched) {
        onSelectPhrase(matched);
      }
    },
    [phrases, onCustomWordChange, onSelectPhrase]
  );

  // Initialize SpeechRecognition if supported
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Browser does not support Web Speech API
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      if (currentTranscript) {
        setTranscript(currentTranscript);
        matchPhraseFromText(currentTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setRecognitionError('Microphone permission was denied.');
      } else {
        setRecognitionError(`Speech recognition: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // Ignore
      }
    };
  }, [matchPhraseFromText]);

  const toggleListening = () => {
    setRecognitionError(null);
    if (!recognitionRef.current) {
      setRecognitionError('Speech recognition is not supported in this browser. Please type directly.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
        setRecognitionError('Microphone could not be started.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTranscript(val);
    matchPhraseFromText(val);
  };

  const handleSendToTimeline = () => {
    if (!transcript.trim()) return;
    if (onSendMessage) {
      onSendMessage(transcript.trim(), selectedPhrase?.id);
    }
  };

  // Filter phrases based on category and search query
  const filteredPhrases = phrases.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="glass-panel speech-panel-box">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mic size={18} className="text-indigo-400" />
            <h3 className="text-base font-bold text-white">Speech-to-Sign Translation</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Hearing Peer View</span>
        </div>

        {/* Microphone and Speech Input Bar */}
        <div className="relative mb-3">
          <div className="mic-input-wrapper">
            <button
              onClick={toggleListening}
              className={`mic-toggle-btn ${isListening ? 'mic-btn-active' : 'mic-btn-idle'}`}
              title={isListening ? 'Stop microphone' : 'Start microphone speech input'}
              aria-label={isListening ? 'Stop microphone' : 'Start microphone speech input'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              value={transcript}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendToTimeline();
              }}
              placeholder={isListening ? 'Listening... Speak now...' : 'Speak into mic or type phrase...'}
              className="speech-text-input"
              aria-label="Speech Transcript Input"
            />

            {transcript && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setTranscript('');
                    onCustomWordChange('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 px-1.5"
                  title="Clear input"
                >
                  Clear
                </button>

                {onSendMessage && (
                  <button
                    onClick={handleSendToTimeline}
                    className="btn btn-primary btn-sm py-1 px-2.5"
                    title="Send to conversation timeline"
                  >
                    <Send size={12} />
                    <span>Send</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {isListening && (
            <div className="flex items-center gap-1.5 mt-2 px-1 text-xs text-rose-400 font-medium">
              <span className="status-dot status-dot-offline animate-pulse" />
              <span>Microphone Active — Speak phrases like "Hello", "Thank you", "Help"...</span>
            </div>
          )}

          {recognitionError && (
            <div className="text-xs text-amber-400/90 mt-2 px-1">
              {recognitionError}
            </div>
          )}
        </div>

        {/* Distinct Reviewed Everyday ISL Phrase Library Section */}
        <div className="phrase-library-section">
          <div className="phrase-library-header">
            <div className="flex items-center gap-2">
              <Film size={14} className="text-cyan-400" />
              <h4 className="phrase-library-title">Reviewed Everyday ISL Phrase Library</h4>
            </div>
            <span className="badge badge-accent text-[11px] font-mono">{filteredPhrases.length} clips</span>
          </div>

          {/* Search filter bar */}
          <div className="phrase-search-bar">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phrases (e.g. hello, help)..."
              className="phrase-search-input"
              aria-label="Filter ISL phrases"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white px-1"
                aria-label="Clear phrase search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="category-pills-row">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`category-pill ${selectedCategory === cat ? 'category-pill-active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Filtered Phrase Library Grid */}
          <div className="phrase-cards-grid">
            {filteredPhrases.length === 0 ? (
              <div className="col-span-2 py-4 text-center text-xs text-slate-500">
                No matching ISL phrases found for "{searchQuery}".
              </div>
            ) : (
              filteredPhrases.map((item) => {
                const isSelected = selectedPhrase?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectPhrase(item);
                      setTranscript(item.phrase);
                      onCustomWordChange(item.phrase);
                    }}
                    className={`phrase-card-btn ${isSelected ? 'phrase-card-selected' : ''}`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-100 truncate">{item.phrase}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.category}</div>
                    </div>
                    {isSelected && <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Reviewed ISL demonstration video library.</span>
        {transcript && onSendMessage && (
          <button
            onClick={handleSendToTimeline}
            className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1"
          >
            <span>Log to Timeline</span>
            <Send size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SpeechToSignPanel;
