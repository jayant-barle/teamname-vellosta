import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Delete, Space, Trash2, Copy, Check, Sparkles } from 'lucide-react';

interface SentenceBuilderProps {
  text: string;
  onChangeText: (newText: string) => void;
  onClearText: () => void;
  lastRecognizedChar: string | null;
  autoAppend: boolean;
  onToggleAutoAppend: (val: boolean) => void;
}

export const SentenceBuilder: React.FC<SentenceBuilderProps> = ({
  text,
  onChangeText,
  onClearText,
  lastRecognizedChar,
  autoAppend,
  onToggleAutoAppend,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  // Load browser speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
        // Default to an English / Indian English voice if present
        const defaultVoice = available.find(
          (v) => v.lang.includes('en-IN') || v.lang.includes('hi-IN') || v.lang.includes('en-US')
        );
        if (defaultVoice) setSelectedVoice(defaultVoice.name);
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Text-To-Speech execution
  const speakText = () => {
    if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;

    if (selectedVoice) {
      const v = voices.find((voice) => voice.name === selectedVoice);
      if (v) utterance.voice = v;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addSpace = () => onChangeText(text + ' ');
  const handleBackspace = () => onChangeText(text.slice(0, -1));

  return (
    <div className="glass-panel p-6 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-cyan-400" />
          <h3 className="text-base font-bold text-white">Recognized Text & Speech</h3>
          {lastRecognizedChar && (
            <span className="badge badge-primary text-[10px] font-mono">
              Last: {lastRecognizedChar}
            </span>
          )}
        </div>

        {/* Auto-append toggle */}
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoAppend}
            onChange={(e) => onToggleAutoAppend(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/30"
          />
          <span>Auto-Append Signed Letters</span>
        </label>
      </div>

      {/* Editable Text Area */}
      <div className="relative mb-4">
        <textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Recognized ISL alphabet and digits appear here. You can also type or edit directly..."
          rows={4}
          className="w-full bg-[#0b101d] text-slate-100 rounded-xl p-4 text-base font-medium border border-white/10 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none shadow-inner"
        />

        {/* Floating copy button */}
        {text && (
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Copy text"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        )}
      </div>

      {/* Editing Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={addSpace}
            className="btn btn-secondary text-xs"
            title="Add Space"
          >
            <Space size={14} />
            Space
          </button>

          <button
            onClick={handleBackspace}
            className="btn btn-secondary text-xs"
            title="Backspace"
            disabled={!text}
          >
            <Delete size={14} />
            Backspace
          </button>

          <button
            onClick={onClearText}
            className="btn btn-secondary text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            title="Clear All Text"
            disabled={!text}
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>

        {/* Text-to-Speech Controls */}
        <div className="flex items-center gap-2">
          {/* Rate selector */}
          <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg p-0.5 text-[11px]">
            {[0.8, 1.0, 1.2].map((r) => (
              <button
                key={r}
                onClick={() => setSpeechRate(r)}
                className={`px-1.5 py-0.5 rounded ${
                  speechRate === r ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400'
                }`}
                title={`Speech rate ${r}x`}
              >
                {r}x
              </button>
            ))}
          </div>

          {voices.length > 0 && (
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-slate-900 border border-white/10 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              {voices.slice(0, 10).map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name.slice(0, 20)} ({v.lang})
                </option>
              ))}
            </select>
          )}

          {isSpeaking ? (
            <button
              onClick={stopSpeaking}
              className="btn btn-danger text-xs animate-pulse"
            >
              <VolumeX size={15} />
              Stop Speaking
            </button>
          ) : (
            <button
              onClick={speakText}
              disabled={!text.trim()}
              className="btn btn-primary text-xs"
            >
              <Volume2 size={15} />
              Speak Aloud
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
