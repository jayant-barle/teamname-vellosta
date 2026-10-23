import React, { useState, useEffect, useRef } from 'react';
import {
  Hand,
  Layers,
  ArrowRightLeft,
  Video,
  Mic,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  fetchHealth,
  fetchVocabulary,
  fetchPhrases,
  predictGesture,
} from './services/apiClient';
import type {
  HealthResponse,
  VocabularyResponse,
  PhraseItem,
  PredictResponse,
  LandmarkPoint,
} from './services/apiClient';

import { WebcamLandmarksCanvas } from './components/WebcamLandmarksCanvas';
import { PredictionCard } from './components/PredictionCard';
import { SentenceBuilder } from './components/SentenceBuilder';
import { SpeechToSignPanel } from './components/SpeechToSignPanel';
import { ISLVideoPlayer } from './components/ISLVideoPlayer';
import { VocabularyModal } from './components/VocabularyModal';

export const App: React.FC = () => {
  // Backend State
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyResponse | null>(null);
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isVocabModalOpen, setIsVocabModalOpen] = useState<boolean>(false);

  // Direction Mode ('both' = split-screen workstation, 'sign_to_speech', 'speech_to_sign')
  const [activeMode, setActiveMode] = useState<'both' | 'sign_to_speech' | 'speech_to_sign'>('both');

  // Sign to Speech State
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [sentenceText, setSentenceText] = useState<string>('');
  const [autoAppend, setAutoAppend] = useState<boolean>(false);

  // Speech to Sign State
  const [selectedPhrase, setSelectedPhrase] = useState<PhraseItem | null>(null);
  const [customWord, setCustomWord] = useState<string>('');

  // Auto-append debouncer
  const lastCharRef = useRef<string | null>(null);
  const charHoldCountRef = useRef<number>(0);

  // Initial Data Fetch
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        const [healthData, vocabData, phrasesData] = await Promise.all([
          fetchHealth().catch((e) => {
            console.warn('Backend offline or degraded:', e);
            return null;
          }),
          fetchVocabulary().catch(() => null),
          fetchPhrases().catch(() => []),
        ]);

        if (mounted) {
          if (healthData) {
            setHealth(healthData);
            setApiError(null);
          } else {
            setApiError('FastAPI backend not detected at http://127.0.0.1:8000. Start backend server.');
          }
          if (vocabData) setVocabulary(vocabData);
          if (phrasesData && phrasesData.length > 0) {
            setPhrases(phrasesData);
            setSelectedPhrase(phrasesData[0]); // Default to first phrase (Hello)
          }
        }
      } catch (err: any) {
        if (mounted) setApiError(err.message || 'Failed connecting to API');
      }
    }

    loadInitialData();
    const interval = setInterval(loadInitialData, 8000); // Polling health check
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle Predict Call from Canvas
  const handlePredict = async (
    features: number[],
    landmarks: LandmarkPoint[][]
  ): Promise<PredictResponse | null> => {
    setIsPredicting(true);
    try {
      const res = await predictGesture(
        features.length > 0 ? features : undefined,
        landmarks.length > 0 ? landmarks : undefined
      );
      setPrediction(res);

      // Auto-append logic for confirmed predictions
      if (autoAppend && res.status === 'recognized' && res.label) {
        if (lastCharRef.current === res.label) {
          charHoldCountRef.current++;
          // Trigger append once hold count reaches threshold (~5 frames held stable)
          if (charHoldCountRef.current === 6) {
            setSentenceText((prev: string) => prev + res.label);
          }
        } else {
          lastCharRef.current = res.label;
          charHoldCountRef.current = 1;
        }
      } else if (res.status !== 'recognized') {
        lastCharRef.current = null;
        charHoldCountRef.current = 0;
      }

      return res;
    } catch (err: any) {
      console.error('Inference error:', err);
      const fallbackError: PredictResponse = {
        status: 'error',
        label: null,
        confidence: null,
        hand_count: 0,
        feature_count: 0,
        message: err.message || 'Network error communicating with backend',
        latency_ms: 0,
      };
      setPrediction(fallbackError);
      return fallbackError;
    } finally {
      setIsPredicting(false);
    }
  };

  const handleAppendChar = (char: string) => {
    setSentenceText((prev: string) => prev + char);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* =========================================================================
          Top Navigation & Status Bar
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#0c1220]/80 backdrop-blur-md border-b border-white/10 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Hand size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">SignBridge</h1>
                <span className="badge badge-primary text-[10px]">v0.1.0 MVP</span>
              </div>
              <p className="text-xs text-slate-400">Two-Way Indian Sign Language Communication Assistant</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10 text-xs font-medium">
            <button
              onClick={() => setActiveMode('both')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'both' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft size={14} />
              <span>Two-Way Workstation</span>
            </button>
            <button
              onClick={() => setActiveMode('sign_to_speech')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'sign_to_speech' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video size={14} />
              <span>Sign &rarr; Speech</span>
            </button>
            <button
              onClick={() => setActiveMode('speech_to_sign')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeMode === 'speech_to_sign' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic size={14} />
              <span>Speech &rarr; Sign</span>
            </button>
          </div>

          {/* Backend Connection Status Pill */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsVocabModalOpen(true)}
              className="btn btn-secondary text-xs"
            >
              <Layers size={14} />
              <span>Vocabulary ({vocabulary?.total_classes || 36})</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-white/10 text-xs">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-medium text-slate-300">
                {health?.status === 'healthy' ? 'API Online' : 'Backend Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          Scope & Ethics Notice Banner
          ========================================================================= */}
      <div className="bg-cyan-950/20 border-b border-cyan-500/10 px-6 py-2 text-xs text-cyan-300/90 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
          <span>
            <strong>Honest Scope:</strong> SignBridge MVP utilizes Random Forest classifiers for static ISL alphabet/digit fingerspelling. Alphabet recognition is not sentence-level continuous ISL grammar. Everyday conversational phrases are demonstrated via the reviewed ISL video library.
          </span>
        </div>
      </div>

      {/* API Connection Warning if offline */}
      {apiError && (
        <div className="bg-rose-950/30 border-b border-rose-500/20 px-6 py-2.5 text-xs text-rose-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-400 shrink-0" />
              <span>{apiError}</span>
            </div>
            <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded font-mono text-slate-300">
              Run: uvicorn signbridge.api.app:app --reload
            </code>
          </div>
        </div>
      )}

      {/* =========================================================================
          Main Workstation Content Grid
          ========================================================================= */}
      <main className="max-w-7xl w-full mx-auto px-6 py-6 flex-1">
        <div className={`grid gap-6 ${activeMode === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* =====================================================================
              Left Panel: Sign -> Speech (Deaf Communicator)
              ===================================================================== */}
          {(activeMode === 'both' || activeMode === 'sign_to_speech') && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Sign &rarr; Text & Speech</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">ISL Signer View</span>
              </div>

              {/* Live Webcam & Hand Skeleton Canvas */}
              <WebcamLandmarksCanvas
                onPredict={handlePredict}
                isPredicting={isPredicting}
                predictionResult={prediction}
              />

              {/* Recognized Gesture Display & Confidence Card */}
              <PredictionCard
                prediction={prediction}
                onAppendChar={handleAppendChar}
                confidenceThreshold={health?.confidence_threshold || 0.55}
              />

              {/* Sentence Accumulator & Text-To-Speech */}
              <SentenceBuilder
                text={sentenceText}
                onChangeText={setSentenceText}
                onClearText={() => setSentenceText('')}
                lastRecognizedChar={prediction?.label || null}
                autoAppend={autoAppend}
                onToggleAutoAppend={setAutoAppend}
              />
            </section>
          )}

          {/* =====================================================================
              Right Panel: Speech -> Sign (Hearing Communicator)
              ===================================================================== */}
          {(activeMode === 'both' || activeMode === 'speech_to_sign') && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Speech &rarr; Verified ISL Video</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Hearing Peer View</span>
              </div>

              {/* Speech-to-Text Input and Phrase Selector */}
              <SpeechToSignPanel
                phrases={phrases}
                selectedPhrase={selectedPhrase}
                onSelectPhrase={setSelectedPhrase}
                onCustomWordChange={setCustomWord}
              />

              {/* Reviewed ISL Video Player */}
              <ISLVideoPlayer
                phrase={selectedPhrase}
                customWord={customWord}
              />
            </section>
          )}
        </div>
      </main>

      {/* =========================================================================
          Footer
          ========================================================================= */}
      <footer className="border-t border-white/10 bg-[#0c1220]/60 px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <span>SignBridge MVP 0.1.0 &bull; Built on </span>
            <a
              href="https://github.com/nidhindaniel/sign-language-recognition-system"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              upstream ISL repository <ExternalLink size={10} />
            </a>
          </div>
          <div>
            <span>Preserving Random Forest 42/84 feature models with uncertainty rejection.</span>
          </div>
        </div>
      </footer>

      {/* Vocabulary Modal */}
      <VocabularyModal
        isOpen={isVocabModalOpen}
        onClose={() => setIsVocabModalOpen(false)}
        vocabulary={vocabulary}
      />
    </div>
  );
};

export default App;
