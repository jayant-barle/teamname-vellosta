import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CheckCircle2 } from 'lucide-react';
import type { PhraseItem } from '../services/apiClient';

interface SpeechToSignPanelProps {
  phrases: PhraseItem[];
  selectedPhrase: PhraseItem | null;
  onSelectPhrase: (phrase: PhraseItem) => void;
  onCustomWordChange: (word: string) => void;
}

export const SpeechToSignPanel: React.FC<SpeechToSignPanelProps> = ({
  phrases,
  selectedPhrase,
  onSelectPhrase,
  onCustomWordChange,
}) => {
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Default to Indian English

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
            setRecognitionError(`Speech recognition issue: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setRecognitionError('Web Speech API is not supported in this browser. You can type directly.');
      }
    }
  }, [phrases]);

  // Match spoken or typed text with phrase library
  const matchPhraseFromText = (text: string) => {
    const cleaned = text.toLowerCase().trim();
    if (!cleaned) return;

    onCustomWordChange(cleaned);

    // Find phrase matching tags or title
    const matched = phrases.find(
      (p) =>
        cleaned.includes(p.phrase.toLowerCase()) ||
        p.tags.some((tag) => cleaned.includes(tag.toLowerCase()))
    );

    if (matched) {
      onSelectPhrase(matched);
    }
  };

  const toggleListening = () => {
    setRecognitionError(null);
    if (!recognitionRef.current) {
      setRecognitionError('Speech recognition is unavailable.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTranscript(val);
    matchPhraseFromText(val);
  };

  return (
    <div className="glass-panel p-6 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mic size={18} className="text-cyan-400" />
            <h3 className="text-base font-bold text-white">Speech-to-Sign Translation</h3>
          </div>
          <span className="text-xs text-slate-400">Reverse Direction</span>
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
              title={isListening ? 'Stop listening' : 'Start microphone speech input'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              value={transcript}
              onChange={handleInputChange}
              placeholder={isListening ? 'Listening... Speak now...' : 'Speak into mic or type phrase...'}
              className="w-full bg-transparent text-slate-100 px-3 py-1 text-sm focus:outline-none placeholder:text-slate-500"
            />

            {transcript && (
              <button
                onClick={() => {
                  setTranscript('');
                  onCustomWordChange('');
                }}
                className="text-xs text-slate-500 hover:text-slate-300 px-2"
              >
                Clear
              </button>
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

        {/* Curated Phrase Library Chips */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span>Reviewed Everyday ISL Phrases</span>
            <span className="text-[11px] text-cyan-400">{phrases.length} verified clips</span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {phrases.map((item) => {
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
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400">
        Speech input uses speech-to-text to retrieve certified Indian Sign Language recordings with accurate hand postures.
      </div>
    </div>
  );
};
