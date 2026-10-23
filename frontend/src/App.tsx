import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Hand,
  Layers,
  ArrowRightLeft,
  Video,
  Mic,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  HelpCircle,
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
import type { CameraStatus } from './components/PredictionCard';
import { SentenceBuilder } from './components/SentenceBuilder';
import { SpeechToSignPanel } from './components/SpeechToSignPanel';
import { ISLVideoPlayer } from './components/ISLVideoPlayer';
import { VocabularyModal } from './components/VocabularyModal';
import { ConversationHistory } from './components/ConversationHistory';
import type { ChatMessage } from './components/ConversationHistory';

export const App: React.FC = () => {
  // Backend State
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyResponse | null>(null);
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isVocabModalOpen, setIsVocabModalOpen] = useState<boolean>(false);

  // Direction Mode
  const [activeMode, setActiveMode] = useState<'both' | 'sign_to_speech' | 'speech_to_sign' | 'timeline'>('both');

  // Sign to Speech State
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [isPredictionStable, setIsPredictionStable] = useState<boolean>(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25);
  const [sentenceText, setSentenceText] = useState<string>('');
  const [autoAppend, setAutoAppend] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [heuristicGesture, setHeuristicGesture] = useState<string | null>(null);

  // Stability & duplicate suppression refs
  const recentPredictionsRef = useRef<string[]>([]);
  const lastAppendedCharRef = useRef<string | null>(null);
  const stableHoldCyclesRef = useRef<number>(0);

  // Speech to Sign State
  const [selectedPhrase, setSelectedPhrase] = useState<PhraseItem | null>(null);
  const [customWord, setCustomWord] = useState<string>('');

  // Conversation Timeline State
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>(() => {
    // Initial welcome exchange to demonstrate two-way functionality immediately
    return [
      {
        id: 'msg_init_1',
        sender: 'peer',
        text: 'Hello, welcome to SignBridge! How can I assist you today?',
        timestamp: '10:00 AM',
        matchedPhraseId: 'hello',
      },
    ];
  });

  // Auto-append debouncer
  const lastCharRef = useRef<string | null>(null);

  // Data Fetching
  const loadInitialData = useCallback(async () => {
    try {
      const [healthData, vocabData, phrasesData] = await Promise.all([
        fetchHealth().catch((e) => {
          console.warn('Backend offline or degraded:', e);
          return null;
        }),
        fetchVocabulary().catch(() => null),
        fetchPhrases().catch(() => []),
      ]);

      if (healthData) {
        setHealth(healthData);
        setApiError(null);
        if (typeof healthData.confidence_threshold === 'number') {
          setConfidenceThreshold(healthData.confidence_threshold);
        }
      } else {
        setApiError('FastAPI backend not detected at http://127.0.0.1:8000. Start backend server.');
      }
      if (vocabData) setVocabulary(vocabData);
      if (phrasesData && phrasesData.length > 0) {
        setPhrases(phrasesData);
        setSelectedPhrase((prev) => prev || phrasesData[0]);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed connecting to API');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (active) {
        await loadInitialData();
      }
    };
    // Defer initial load to avoid synchronous setState during effect setup
    const timer = setTimeout(poll, 0);
    const interval = setInterval(poll, 8000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [loadInitialData]);

  // Keyboard accessibility shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        setIsVocabModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsVocabModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    await loadInitialData();
    setTimeout(() => setIsRetrying(false), 600);
  };

  // Handle Predict Call from Canvas
  const handlePredict = async (
    features: number[],
    landmarks: LandmarkPoint[][]
  ): Promise<PredictResponse | null> => {
    setIsPredicting(true);
    try {
      const res = await predictGesture(
        features.length > 0 ? features : undefined,
        landmarks.length > 0 ? landmarks : undefined,
        confidenceThreshold
      );
      setPrediction(res);

      // Temporal smoothing across rolling window
      if (res.status === 'recognized' && res.label) {
        recentPredictionsRef.current = [...recentPredictionsRef.current.slice(-3), res.label];
        const matchCount = recentPredictionsRef.current.filter((l) => l === res.label).length;
        const stable = matchCount >= 3;
        setIsPredictionStable(stable);

        // Diagnostic log
        console.log(
          `[SignBridge Predict Flow] RECOGNIZED '${res.label}' with ${(res.confidence! * 100).toFixed(1)}% conf (stable=${stable}, matchCount=${matchCount})`
        );

        // Auto-append logic with duplicate suppression lock
        if (autoAppend && stable) {
          if (lastCharRef.current === res.label) {
            stableHoldCyclesRef.current++;
            // Require ~600ms hold (5 cycles) and prevent repeated duplicate insertion on same hold
            if (stableHoldCyclesRef.current >= 5 && lastAppendedCharRef.current !== res.label) {
              setSentenceText((prev: string) => prev + res.label);
              lastAppendedCharRef.current = res.label;
              if (autoSpeak && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(res.label));
              }
            }
          } else {
            lastCharRef.current = res.label;
            stableHoldCyclesRef.current = 1;
          }
        }
      } else {
        if (res.status === 'uncertain') {
          console.log(
            `[SignBridge Predict Flow] UNCERTAIN candidate '${res.label}' (${((res.confidence ?? 0) * 100).toFixed(1)}% < ${(confidenceThreshold * 100).toFixed(0)}% threshold)`
          );
        }
        setIsPredictionStable(false);
        recentPredictionsRef.current = [];
        lastCharRef.current = null;
        lastAppendedCharRef.current = null;
        stableHoldCyclesRef.current = 0;
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

  // Add Deaf Signer message to conversation timeline
  const handleSignerSendMessage = (text: string) => {
    if (!text.trim()) return;
    const newMsg: ChatMessage = {
      id: `signer_${Date.now()}`,
      sender: 'signer',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setConversationMessages((prev) => [...prev, newMsg]);
    setSentenceText('');
  };

  // Add Hearing Peer message to conversation timeline
  const handlePeerSendMessage = (text: string, matchedPhraseId?: string) => {
    if (!text.trim()) return;
    const newMsg: ChatMessage = {
      id: `peer_${Date.now()}`,
      sender: 'peer',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      matchedPhraseId,
    };
    setConversationMessages((prev) => [...prev, newMsg]);
  };

  // Replay speech audio from timeline
  const handleReplaySpeech = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Watch video from timeline click
  const handleWatchVideoFromTimeline = (phraseId: string) => {
    const found = phrases.find((p) => p.id === phraseId);
    if (found) {
      setSelectedPhrase(found);
      setCustomWord(found.phrase);
      if (activeMode === 'sign_to_speech' || activeMode === 'timeline') {
        setActiveMode('both');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070a13] text-slate-100">
      {/* =========================================================================
          Top Navigation & Status Bar
          ========================================================================= */}
      <header className="app-header">
        <div className="header-container">
          {/* Logo & Identity */}
          <div className="brand-section">
            <div className="brand-icon-box">
              <Hand size={20} />
            </div>
            <div className="brand-title-wrap">
              <div className="brand-title-row">
                <h1 className="brand-title">SignBridge</h1>
                <span className="badge badge-primary text-[10px]">v0.1.1 MVP</span>
              </div>
              <p className="brand-subtitle sm:block hidden">
                Two-Way Indian Sign Language (ISL) Assistant
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <nav className="mode-nav" aria-label="Workstation View Modes">
            <button
              onClick={() => setActiveMode('both')}
              className={`mode-tab ${activeMode === 'both' ? 'mode-tab-active' : ''}`}
            >
              <ArrowRightLeft size={13} />
              <span>Two-Way Workstation</span>
            </button>
            <button
              onClick={() => setActiveMode('sign_to_speech')}
              className={`mode-tab ${activeMode === 'sign_to_speech' ? 'mode-tab-active' : ''}`}
            >
              <Video size={13} />
              <span>Sign &rarr; Speech</span>
            </button>
            <button
              onClick={() => setActiveMode('speech_to_sign')}
              className={`mode-tab ${activeMode === 'speech_to_sign' ? 'mode-tab-active' : ''}`}
            >
              <Mic size={13} />
              <span>Speech &rarr; Sign</span>
            </button>
            <button
              onClick={() => setActiveMode('timeline')}
              className={`mode-tab ${activeMode === 'timeline' ? 'mode-tab-active' : ''}`}
            >
              <MessageSquare size={13} />
              <span>Timeline ({conversationMessages.length})</span>
            </button>
          </nav>

          {/* Actions: Vocabulary & Connection Status */}
          <div className="header-actions">
            <button
              onClick={() => setIsVocabModalOpen(true)}
              className="btn btn-secondary btn-sm"
              title="View supported ISL vocabulary (Shortcut: ?)"
            >
              <Layers size={13} />
              <span className="sm:inline hidden">Vocabulary</span> ({vocabulary?.total_classes || 36})
            </button>

            <div className="status-pill">
              <span
                className={`status-dot ${
                  health?.status === 'healthy' ? 'status-dot-active' : 'status-dot-offline'
                }`}
              />
              <span>
                {health?.status === 'healthy' ? 'API Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          Scope & Ethics Notice Banner
          ========================================================================= */}
      <div className="scope-banner">
        <div className="scope-banner-inner">
          <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
          <span>
            <strong>Honest Scope Statement:</strong> SignBridge MVP utilizes Random Forest classifiers for static ISL alphabet/digit fingerspelling. Alphabet recognition is not sentence-level continuous ISL grammar. Conversational phrases are demonstrated via the reverse-direction reviewed video library.
          </span>
        </div>
      </div>

      {/* API Connection Warning with Reconnect Action */}
      {apiError && (
        <div className="api-error-banner">
          <div className="api-error-inner">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-400 shrink-0" />
              <span>{apiError}</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded font-mono text-slate-300 md:inline hidden">
                uvicorn signbridge.api.app:app --port 8000
              </code>
              <button
                onClick={handleRetryConnection}
                disabled={isRetrying}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw size={12} className={isRetrying ? 'animate-spin' : ''} />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Main Workstation Content Grid
          ========================================================================= */}
      <main className="app-main">
        {/* Dual Panel Mode */}
        {activeMode !== 'timeline' && (
          <div className={activeMode === 'both' ? 'workstation-grid' : 'workstation-single'}>
            {/* =====================================================================
                Left Panel: Sign -> Speech (Deaf Communicator)
                ===================================================================== */}
            {(activeMode === 'both' || activeMode === 'sign_to_speech') && (
              <section className="panel-column">
                <div className="panel-heading-row">
                  <div className="panel-heading">
                    <span className="panel-indicator-cyan" />
                    <h2>Sign &rarr; Text & Speech</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">ISL Signer View</span>
                </div>

                {/* Live Webcam & Hand Skeleton Canvas */}
                <WebcamLandmarksCanvas
                  onPredict={handlePredict}
                  isPredicting={isPredicting}
                  predictionResult={prediction}
                  onStatusChange={setCameraStatus}
                  onHeuristicGesture={setHeuristicGesture}
                />

                {/* Recognized Gesture Display & Confidence Card */}
                <PredictionCard
                  prediction={prediction}
                  onAppendChar={handleAppendChar}
                  confidenceThreshold={confidenceThreshold}
                  onThresholdChange={setConfidenceThreshold}
                  cameraStatus={cameraStatus}
                  isStable={isPredictionStable}
                  heuristicGesture={heuristicGesture}
                />

                {/* Sentence Accumulator & Text-To-Speech */}
                <SentenceBuilder
                  text={sentenceText}
                  onChangeText={setSentenceText}
                  onClearText={() => setSentenceText('')}
                  lastRecognizedChar={prediction?.label || null}
                  autoAppend={autoAppend}
                  onToggleAutoAppend={setAutoAppend}
                  autoSpeak={autoSpeak}
                  onToggleAutoSpeak={setAutoSpeak}
                  onSendMessage={handleSignerSendMessage}
                />
              </section>
            )}

            {/* =====================================================================
                Right Panel: Speech -> Sign (Hearing Communicator)
                ===================================================================== */}
            {(activeMode === 'both' || activeMode === 'speech_to_sign') && (
              <section className="panel-column">
                <div className="panel-heading-row">
                  <div className="panel-heading">
                    <span className="panel-indicator-indigo" />
                    <h2>Speech &rarr; Reviewed ISL Video</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Hearing Peer View</span>
                </div>

                {/* Speech-to-Text Input and Phrase Selector */}
                <SpeechToSignPanel
                  phrases={phrases}
                  selectedPhrase={selectedPhrase}
                  onSelectPhrase={setSelectedPhrase}
                  onCustomWordChange={setCustomWord}
                  onSendMessage={handlePeerSendMessage}
                />

                {/* Reviewed ISL Video Player */}
                <ISLVideoPlayer phrase={selectedPhrase} customWord={customWord} />
              </section>
            )}
          </div>
        )}

        {/* =========================================================================
            Shared Conversation History Timeline
            ========================================================================= */}
        <section className={activeMode === 'timeline' ? 'workstation-single' : 'mt-4'}>
          <ConversationHistory
            messages={conversationMessages}
            onClearHistory={() => setConversationMessages([])}
            onReplaySpeech={handleReplaySpeech}
            onWatchVideo={handleWatchVideoFromTimeline}
          />
        </section>
      </main>

      {/* =========================================================================
          Footer
          ========================================================================= */}
      <footer className="app-footer">
        <div className="footer-container">
          <div>
            <span>SignBridge v0.1.1 MVP &bull; Preserving </span>
            <a
              href="https://github.com/nidhindaniel/sign-language-recognition-system"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              <span>upstream ISL repository</span>
              <ExternalLink size={10} />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsVocabModalOpen(true)}
              className="footer-link text-slate-400 hover:text-white"
            >
              <HelpCircle size={13} />
              <span>Keyboard Shortcuts (?)</span>
            </button>
            <span>&bull;</span>
            <span>MIT License</span>
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
