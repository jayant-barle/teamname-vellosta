import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Layers, Plus, Clock } from 'lucide-react';
import type { PredictResponse } from '../services/apiClient';

interface PredictionCardProps {
  prediction: PredictResponse | null;
  onAppendChar: (char: string) => void;
  confidenceThreshold: number;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  onAppendChar,
  confidenceThreshold,
}) => {
  if (!prediction) {
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
        <HelpCircle size={36} className="text-slate-500 mb-3" />
        <h4 className="text-base font-semibold text-slate-300 mb-1">Awaiting Gesture</h4>
        <p className="text-xs text-slate-400 max-w-xs">
          Start the camera and show an Indian Sign Language hand sign to see live recognition.
        </p>
      </div>
    );
  }

  const { status, label, confidence, model_type, message, latency_ms } = prediction;
  const confidencePercent = confidence !== null ? Math.round(confidence * 100) : null;
  const isRecognized = status === 'recognized' && label;
  const isUncertain = status === 'uncertain';
  const isNoDetection = status === 'no_detection';

  return (
    <div className="glass-panel prediction-box">
      {/* Background Accent Glow */}
      <div
        className={`absolute -right-10 -bottom-10 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
          isRecognized
            ? 'bg-emerald-500/15'
            : isUncertain
            ? 'bg-amber-500/15'
            : 'bg-cyan-500/10'
        }`}
      />

      {/* Card Header: Badges */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              isRecognized
                ? 'badge-recognized'
                : isUncertain
                ? 'badge-uncertain'
                : isNoDetection
                ? 'badge-no-detection'
                : 'badge-error'
            }`}
          >
            {isRecognized ? (
              <CheckCircle2 size={12} />
            ) : isUncertain ? (
              <AlertTriangle size={12} />
            ) : (
              <Layers size={12} />
            )}
            {status}
          </span>

          {model_type && (
            <span className="badge badge-primary text-[10px]">
              {model_type}
            </span>
          )}
        </div>

        {latency_ms > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <Clock size={12} />
            <span>{latency_ms}ms</span>
          </div>
        )}
      </div>

      {/* Main Display: Recognized Character or Status Graphic */}
      <div className="flex items-center justify-between my-2">
        <div className="flex items-baseline gap-4">
          {label ? (
            <div
              className={`prediction-char-display ${
                isRecognized ? 'text-emerald-400' : 'text-amber-400 opacity-90'
              }`}
            >
              {label}
            </div>
          ) : (
            <div className="text-3xl font-bold text-slate-500 font-mono">
              —
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              {isRecognized ? 'Target Sign' : isUncertain ? 'Best Hypothesis' : 'Current State'}
            </div>
            <div className="text-sm text-slate-300 font-medium max-w-[240px] truncate">
              {message}
            </div>
          </div>
        </div>

        {/* Append button if character available */}
        {label && (
          <button
            onClick={() => onAppendChar(label)}
            className="btn btn-secondary btn-sm"
            title="Append recognized letter to sentence builder"
          >
            <Plus size={13} />
            <span>Append '{label}'</span>
          </button>
        )}
      </div>

      {/* Confidence Meter or Uncertainty Notice */}
      <div className="mt-3 pt-2.5 border-t border-white/5">
        {confidencePercent !== null ? (
          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-mono">
              <span className="text-slate-400">Estimated Confidence</span>
              <span
                className={`font-semibold ${
                  confidencePercent >= confidenceThreshold * 100
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {confidencePercent}%
              </span>
            </div>
            <div className="confidence-track">
              <div
                className="confidence-fill"
                style={{
                  width: `${Math.min(100, Math.max(5, confidencePercent))}%`,
                  backgroundColor:
                    confidencePercent >= confidenceThreshold * 100 ? '#10b981' : '#f59e0b',
                }}
              />
            </div>
            {isUncertain && (
              <p className="text-[11px] text-amber-300/80 mt-1.5 flex items-center gap-1">
                <AlertTriangle size={11} />
                <span>Below confidence threshold ({Math.round(confidenceThreshold * 100)}%). Rejected to prevent false output.</span>
              </p>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Estimator confidence scores uncalibrated or probabilistic head not available.</span>
          </div>
        )}
      </div>
    </div>
  );
};
