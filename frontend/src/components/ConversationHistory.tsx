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
    <div className="glass-panel timeline-box">
      {/* Header */}
      <div className="timeline-header">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-cyan-400" />
          <h3 className="text-base font-bold text-white">Live Conversation Timeline</h3>
          <span className="badge badge-primary text-[10px]">
            {messages.length} {messages.length === 1 ? 'Message' : 'Messages'}
          </span>
        </div>

        {messages.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyTranscript}
              className="btn btn-secondary btn-sm"
              title="Copy transcript"
              aria-label="Copy entire transcript"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>Copy</span>
            </button>
            <button
              onClick={handleExportFile}
              className="btn btn-secondary btn-sm"
              title="Download transcript file"
              aria-label="Export transcript as text file"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
            <button
              onClick={onClearHistory}
              className="btn btn-danger btn-sm"
              title="Clear session history"
              aria-label="Clear conversation history"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="timeline-list">
        {messages.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-slate-500">
            <MessageSquare size={32} className="text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Messages Yet</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Assemble a signed sentence or speak into the microphone to start a two-way dialogue.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSigner = msg.sender === 'signer';
            return (
              <div
                key={msg.id}
                className={`message-bubble ${
                  isSigner ? 'message-bubble-signer' : 'message-bubble-peer'
                }`}
              >
                <div className="message-meta-row">
                  <div
                    className={`message-sender ${
                      isSigner ? 'message-sender-signer' : 'message-sender-peer'
                    }`}
                  >
                    {isSigner ? (
                      <>
                        <Hand size={14} />
                        <span>Deaf Communicator (ISL)</span>
                      </>
                    ) : (
                      <>
                        <Mic size={14} />
                        <span>Hearing Peer (Voice)</span>
                      </>
                    )}
                  </div>
                  <span className="message-timestamp">{msg.timestamp}</span>
                </div>

                <div className="message-text">
                  {msg.text}
                </div>

                {/* Actions per message */}
                <div className="message-actions-row">
                  <button
                    onClick={() => onReplaySpeech(msg.text)}
                    className="msg-action-btn"
                    title="Speak text aloud"
                  >
                    <Volume2 size={12} className="text-cyan-400" />
                    <span>Replay Audio</span>
                  </button>

                  {msg.matchedPhraseId && onWatchVideo && (
                    <button
                      onClick={() => onWatchVideo(msg.matchedPhraseId!)}
                      className="msg-action-btn ml-2"
                      title="Play reviewed sign demonstration"
                    >
                      <Film size={12} className="text-indigo-400" />
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
