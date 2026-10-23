import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, CheckCircle2, Send, Search } from 'lucide-react';
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
    <div className="glass-panel p-6 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mic size={18} className="text-cyan-400" />
            <h3 className="text-base font-bold text-white">Speech-to-Sign Translation</h3>
          </div>
          <span className="text-xs text-slate-400">Hearing Peer View</span>
        </div>

        {/* Microphone and Search Input */}
        <div className="relative mb-4">
          <div className="flex items-center gap-2 bg-[#0b101d] rounded-xl p-2 border border-white/10 focus-within:border-cyan-500 transition-all">
            <button
              onClick={toggleListening}
              className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
              }`}
              title={isListening ? 'Stop microphone' : 'Start microphone speech input'}
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
              className="w-full bg-transparent text-slate-100 px-3 py-1 text-sm focus:outline-none placeholder:text-slate-500"
            />

            {transcript && (
              <>
                <button
                  onClick={() => {
                    setTranscript('');
                    onCustomWordChange('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 px-1.5"
                  title="Clear transcript input"
                >
                  Clear
                </button>

                {onSendMessage && (
                  <button
                    onClick={handleSendToTimeline}
                    className="btn btn-primary text-xs py-1 px-2.5 shrink-0"
                    title="Send phrase to conversation timeline"
                  >
                    <Send size={12} />
                    <span>Send</span>
                  </button>
                )}
              </>
            )}
          </div>

          {isListening && (
            <div className="flex items-center gap-2 mt-2 px-1 text-xs text-rose-400 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Microphone Active — Speak phrases like "Hello", "Thank you", "Help"...</span>
            </div>
          )}

          {recognitionError && (
            <div className="text-xs text-amber-400/90 mt-2 px-1">
              {recognitionError}
            </div>
          )}
        </div>

        {/* Category Filter Tabs & Search Bar */}
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Reviewed Everyday ISL Phrases</span>
            <span className="text-[11px] text-cyan-400">{filteredPhrases.length} clips</span>
          </div>

          {/* Search filter input */}
          <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg px-2.5 py-1.5 border border-white/5 text-xs text-slate-300">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter phrases (e.g. hello, help)..."
              className="bg-transparent text-slate-100 w-full focus:outline-none text-xs placeholder:text-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[10px] text-slate-400">
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Filtered Phrase Library Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
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
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20 hover:bg-slate-900'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold truncate">{item.phrase}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.category}</div>
                  </div>
                  {isSelected && <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Certified Indian Sign Language video library.</span>
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
