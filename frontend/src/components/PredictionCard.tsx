import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  Plus,
  Clock,
  RefreshCw,
  Hand,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { PredictResponse } from '../services/apiClient';

export type CameraStatus =
  | 'idle'
  | 'initializing'
  | 'no_hand'
  | 'detecting'
  | 'recognized'
  | 'uncertain'
  | 'unavailable';

interface PredictionCardProps {
  prediction: PredictResponse | null;
  onAppendChar: (char: string) => void;
  confidenceThreshold: number;
  cameraStatus?: CameraStatus;
  isStable?: boolean;
  heuristicGesture?: string | null;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  onAppendChar,
  confidenceThreshold,
  cameraStatus = 'idle',
  isStable = false,
  heuristicGesture = null,
}) => {
  if (!prediction) {
    let icon = <HelpCircle size={36} className="text-slate-500 mb-3" />;
    let title = 'Camera Inactive';
    let subtitle = "Click 'Start Webcam' above to begin real-time ISL gesture recognition, or test instant samples.";

    if (cameraStatus === 'initializing') {
      icon = <RefreshCw size={36} className="text-cyan-400 mb-3 animate-spin" />;
      title = 'Initializing Camera...';
      subtitle = 'Requesting camera permissions and initializing MediaPipe vision tracker.';
    } else if (cameraStatus === 'no_hand') {
      icon = <Hand size={36} className="text-slate-500 mb-3" />;
      title = 'No Hand Detected';
      subtitle = 'Camera is active. Position 1 or 2 hands inside the frame to recognize signs.';
    } else if (cameraStatus === 'detecting') {
      icon = <Layers size={36} className="text-cyan-400 mb-3 animate-pulse" />;
      title = 'Detecting Hand...';
      subtitle = 'Tracking 21 MediaPipe landmarks and evaluating Random Forest features.';
    } else if (cameraStatus === 'unavailable') {
      icon = <ShieldAlert size={36} className="text-rose-400 mb-3" />;
      title = 'Recognition Unavailable';
      subtitle = 'Camera access was denied, unavailable, or the FastAPI backend is offline.';
    }

    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
        {icon}
        <h4 className="text-base font-semibold text-slate-200 mb-1">{title}</h4>
        <p className="text-xs text-slate-400 max-w-xs">{subtitle}</p>
      </div>
    );
  }

  const { status, label, confidence, model_type, message, latency_ms } = prediction;
  const confidencePercent = confidence !== null ? Math.round(confidence * 100) : null;
  const isRecognized = status === 'recognized' && label;
  const isUncertain = status === 'uncertain';
  const isNoDetection = status === 'no_detection';

  // Explicit readable status label
  const displayStatusLabel = isRecognized
    ? 'Recognized Sign'
    : isUncertain
    ? 'Uncertain Sign'
    : isNoDetection
    ? 'No Hand Detected'
    : status === 'missing_model'
    ? 'Model Missing'
    : 'Recognition Error';

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
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
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
            {displayStatusLabel}
          </span>

          {model_type && (
            <span className="badge badge-primary text-[10px]">
              {model_type} (ISL RF)
            </span>
          )}

          {isStable && isRecognized && (
            <span className="badge badge-accent text-[9px]">
              Stable
            </span>
          )}

          {heuristicGesture && !isRecognized && (
            <span className="badge bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 text-[10px] flex items-center gap-1">
              <Sparkles size={10} />
              <span>Heuristic: {heuristicGesture}</span>
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
      <div className="flex items-center justify-between my-2 flex-wrap gap-3">
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
              {isRecognized ? 'Recognized Gesture' : isUncertain ? 'Uncertain Candidate' : 'Current State'}
            </div>
            <div className="text-sm text-slate-300 font-medium max-w-[240px] truncate">
              {message}
            </div>
          </div>
        </div>

        {/* Append button if character available */}
        {label && isRecognized && (
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
      <div className="mt-2 pt-2 border-t border-white/5">
        {confidencePercent !== null ? (
          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-mono">
              <span className="text-slate-400 text-[11px]">Calibrated Confidence:</span>
              <span
                className={
                  isRecognized
                    ? 'text-emerald-400 font-bold'
                    : 'text-amber-400 font-bold'
                }
              >
                {confidencePercent}%
              </span>
            </div>

            {/* Confidence Progress Bar */}
            <div className="confidence-track">
              <div
                className={`confidence-bar ${
                  isRecognized
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, confidencePercent))}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            {isNoDetection
              ? 'Awaiting hand in camera frame to extract 21 MediaPipe landmarks.'
              : message}
          </p>
        )}

        {isUncertain && (
          <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-snug">
            Gesture confidence ({confidencePercent}%) is below the {Math.round(confidenceThreshold * 100)}% rejection threshold. Hold hand steady in good lighting.
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionCard;
