import React, { useState } from 'react';
import {
  MessageSquare,
  Hand,
  Mic,
  Volume2,
  Film,
  Trash2,
  Download,
  Copy,
  Check,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'signer' | 'peer';
  text: string;
  timestamp: string;
  matchedPhraseId?: string;
}

interface ConversationHistoryProps {
  messages: ChatMessage[];
  onClearHistory: () => void;
  onReplaySpeech: (text: string) => void;
  onWatchVideo?: (phraseId: string) => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  messages,
  onClearHistory,
  onReplaySpeech,
  onWatchVideo,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyTranscript = () => {
    if (messages.length === 0) return;
    const transcriptText = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.sender === 'signer' ? 'Deaf Signer (ISL)' : 'Hearing Peer (Voice)'}: ${m.text}`
      )
      .join('\n');

    navigator.clipboard.writeText(transcriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportFile = () => {
    if (messages.length === 0) return;
    const transcriptText = `SignBridge Conversation Transcript\nDate: ${new Date().toLocaleString()}\n\n` +
      messages
        .map(
          (m) =>
            `[${m.timestamp}] ${m.sender === 'signer' ? 'Deaf Signer (ISL)' : 'Hearing Peer (Voice)'}: ${m.text}`
        )
        .join('\n');

    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signbridge-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-cyan-400" />
          <h3 className="text-base font-bold text-white">Live Conversation Timeline</h3>
          <span className="badge badge-primary text-[10px]">
            {messages.length} {messages.length === 1 ? 'Message' : 'Messages'}
          </span>
        </div>

        {messages.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTranscript}
              className="btn btn-secondary text-xs p-1.5"
              title="Copy transcript"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <button
              onClick={handleExportFile}
              className="btn btn-secondary text-xs p-1.5"
              title="Download transcript file"
            >
              <Download size={14} />
            </button>
            <button
              onClick={onClearHistory}
              className="btn btn-secondary text-xs p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              title="Clear session history"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-slate-500">
            <MessageSquare size={32} className="text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">No Messages Yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Assemble a signed sentence or speak into the microphone to start a two-way dialogue.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSigner = msg.sender === 'signer';
            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isSigner
                    ? 'bg-cyan-950/20 border-cyan-500/30 ml-4'
                    : 'bg-indigo-950/20 border-indigo-500/30 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {isSigner ? (
                      <>
                        <Hand size={14} className="text-cyan-400" />
                        <span className="text-cyan-300">Deaf Communicator (ISL)</span>
                      </>
                    ) : (
                      <>
                        <Mic size={14} className="text-indigo-400" />
                        <span className="text-indigo-300">Hearing Peer (Voice)</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                </div>

                <div className="text-sm font-medium text-slate-200 leading-relaxed mb-2">
                  {msg.text}
                </div>

                {/* Actions per message */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => onReplaySpeech(msg.text)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <Volume2 size={12} />
                    <span>Replay Audio</span>
                  </button>

                  {msg.matchedPhraseId && onWatchVideo && (
                    <button
                      onClick={() => onWatchVideo(msg.matchedPhraseId!)}
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors ml-2"
                    >
                      <Film size={12} />
                      <span>Watch ISL Sign Clip</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
