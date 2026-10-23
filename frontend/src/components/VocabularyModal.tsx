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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0d1424] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Layers size={20} className="text-cyan-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Supported ISL Vocabulary</h3>
              <p className="text-xs text-slate-400">
                Preserved from the original Random Forest classifiers (1-hand & 2-hands)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1">
          {/* Scope Disclaimer */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200">
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
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {vocabulary?.one_hand.map((char) => (
                <div
                  key={char}
                  className="p-2.5 rounded-lg bg-slate-900 border border-white/5 flex flex-col items-center justify-center text-center shadow"
                >
                  <span className="text-lg font-bold font-mono text-cyan-400">{char}</span>
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
                <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                  {vocabulary?.two_hands.length || 0} classes
                </span>
              </h4>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {vocabulary?.two_hands.map((char) => (
                <div
                  key={char}
                  className="p-2.5 rounded-lg bg-slate-900 border border-white/5 flex flex-col items-center justify-center text-center shadow"
                >
                  <span className="text-lg font-bold font-mono text-indigo-400">{char}</span>
                  <span className="text-[9px] text-slate-500 uppercase">2-Hands</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary text-xs">
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
