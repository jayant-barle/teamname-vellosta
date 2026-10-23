import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Delete,
  Space,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Send,
} from 'lucide-react';

interface SentenceBuilderProps {
  text: string;
  onChangeText: (newText: string) => void;
  onClearText: () => void;
  lastRecognizedChar: string | null;
  autoAppend: boolean;
  onToggleAutoAppend: (val: boolean) => void;
  onSendMessage?: (text: string) => void;
}

const COMMON_ACRONYMS = ['ISL', 'HELLO', 'THANKS', 'YES', 'NO', 'HELP'];

export const SentenceBuilder: React.FC<SentenceBuilderProps> = ({
  text,
  onChangeText,
  onClearText,
  lastRecognizedChar,
  autoAppend,
  onToggleAutoAppend,
  onSendMessage,
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

    window.speechSynthesis.cancel();
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

  const handleSendToTimeline = () => {
    if (!text.trim()) return;
    if (onSendMessage) {
      onSendMessage(text.trim());
    }
  };

  return (
    <div className="glass-panel sentence-builder-box">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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
          <label className="auto-append-toggle">
            <input
              type="checkbox"
              checked={autoAppend}
              onChange={(e) => onToggleAutoAppend(e.target.checked)}
              aria-label="Auto-Append Signed Letters"
              className="custom-checkbox"
            />
            <span>Auto-Append Signed Letters</span>
          </label>
        </div>

        {/* Editable Text Area */}
        <div className="sentence-textarea-wrap mb-3">
          <textarea
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendToTimeline();
              }
            }}
            placeholder="Recognized ISL alphabet and digits appear here. You can also type or edit directly..."
            rows={3}
            className="sentence-textarea"
            aria-label="Sentence Text Area"
          />

          {/* Floating copy button */}
          {text && (
            <button
              onClick={handleCopy}
              className="floating-copy-btn"
              title="Copy text"
              aria-label="Copy sentence text"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          )}
        </div>

        {/* Quick words chip shortcuts */}
        <div className="quick-acronyms-row mb-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1">
            Quick Insert:
          </span>
          {COMMON_ACRONYMS.map((word) => (
            <button
              key={word}
              onClick={() => onChangeText(text ? `${text} ${word}` : word)}
              className="acronym-btn"
            >
              +{word}
            </button>
          ))}
        </div>
      </div>

      {/* Editing Action Bar */}
      <div className="sentence-actions-bar">
        <div className="sentence-edit-group">
          <button onClick={addSpace} className="btn btn-secondary btn-sm" title="Add Space">
            <Space size={13} />
            <span>Space</span>
          </button>

          <button
            onClick={handleBackspace}
            className="btn btn-secondary btn-sm"
            title="Backspace"
            disabled={!text}
          >
            <Delete size={13} />
            <span>Backspace</span>
          </button>

          <button
            onClick={onClearText}
            className="btn btn-danger btn-sm"
            title="Clear All Text"
            disabled={!text}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>

          {onSendMessage && text.trim() && (
            <button
              onClick={handleSendToTimeline}
              className="btn btn-primary btn-sm"
              title="Send to conversation timeline"
            >
              <Send size={13} />
              <span>Send to Peer</span>
            </button>
          )}
        </div>

        {/* Text-to-Speech Controls */}
        <div className="sentence-tts-group">
          {/* Rate selector */}
          <div className="rate-selector-group">
            {[0.8, 1.0, 1.2].map((r) => (
              <button
                key={r}
                onClick={() => setSpeechRate(r)}
                className={`rate-btn ${speechRate === r ? 'rate-btn-active' : ''}`}
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
              className="voice-select"
              aria-label="Select TTS Voice"
            >
              {voices.slice(0, 10).map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name.slice(0, 18)}
                </option>
              ))}
            </select>
          )}

          {isSpeaking ? (
            <button
              onClick={stopSpeaking}
              className="btn btn-danger btn-sm"
            >
              <VolumeX size={14} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={speakText}
              disabled={!text.trim()}
              className="btn btn-primary btn-sm"
            >
              <Volume2 size={14} />
              <span>Speak Aloud</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SentenceBuilder;
