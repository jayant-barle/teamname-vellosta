import React from 'react';
import { X, Layers } from 'lucide-react';
import type { VocabularyResponse } from '../services/apiClient';

interface VocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabulary: VocabularyResponse | null;
}

export const VocabularyModal: React.FC<VocabularyModalProps> = ({
  isOpen,
  onClose,
  vocabulary,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        {/* Header */}
        <div className="card-header pb-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Layers size={20} className="text-cyan-400" />
            <div>
              <h3 className="card-title text-base">Supported ISL Vocabulary</h3>
              <p className="card-subtitle">
                Preserved from the original Random Forest classifiers (1-hand & 2-hands)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body pr-1">
          {/* Scope Disclaimer */}
          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200">
            <strong>Honest Scope Statement:</strong> The current computer vision pipeline is trained on static ISL fingerspelled alphabets and digits. It does not perform continuous grammatical sentence translation. For full phrases, use the reverse-direction reviewed video library.
          </div>

          {/* 1-Hand Classes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Single-Hand Model (42 Features)</span>
                <span className="badge badge-primary text-[10px]">
                  {vocabulary?.one_hand.length || 0} classes
                </span>
              </h4>
            </div>
            <div className="vocab-grid">
              {vocabulary?.one_hand.map((char) => (
                <div key={char} className="vocab-card">
                  <span className="text-base font-bold font-mono text-cyan-400">{char}</span>
                  <span className="text-[9px] text-slate-500 uppercase">1-Hand</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2-Hands Classes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Two-Hands Model (84 Features)</span>
                <span className="badge badge-accent text-[10px]">
                  {vocabulary?.two_hands.length || 0} classes
                </span>
              </h4>
            </div>
            <div className="vocab-grid">
              {vocabulary?.two_hands.map((char) => (
                <div key={char} className="vocab-card">
                  <span className="text-base font-bold font-mono text-indigo-400">{char}</span>
                  <span className="text-[9px] text-slate-500 uppercase">2-Hands</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
