import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, Info, Layers, Film, BookOpen, Sparkles, FileVideo } from 'lucide-react';
import type { PhraseItem } from '../services/apiClient';

interface ISLVideoPlayerProps {
  phrase: PhraseItem | null;
  customWord?: string;
}

export const ISLVideoPlayer: React.FC<ISLVideoPlayerProps> = ({ phrase, customWord }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'video' | 'guide' | 'fingerspelling'>('video');
  const [activeStepTab, setActiveStepTab] = useState<number>(0);
  const [prevPhraseId, setPrevPhraseId] = useState<string | undefined>(phrase?.id);

  if (phrase?.id !== prevPhraseId) {
    setPrevPhraseId(phrase?.id);
    setVideoError(false);
    setActiveStepTab(0);
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.loop = isLooping;
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [phrase, playbackRate, isLooping]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const lettersToSpell = customWord
    ? customWord.toUpperCase().replace(/[^A-Z0-9]/g, '').split('')
    : [];

  return (
    <div className="glass-panel video-player-box">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-indigo-400" />
          <h3 className="text-base font-bold text-white">Reviewed ISL Video Player</h3>
        </div>

        {/* Tab switcher: Video Clip, Motion Guide, Fingerspelling */}
        <div className="flex bg-[#090e1a] p-0.5 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'video'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Video Clip
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'guide'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Motion Guide
          </button>
          {lettersToSpell.length > 0 && (
            <button
              onClick={() => setActiveTab('fingerspelling')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'fingerspelling'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fingerspell ({lettersToSpell.length})
            </button>
          )}
        </div>
      </div>

      {activeTab === 'video' ? (
        phrase ? (
          <div>
            {/* Video Stage Container with constrained aspect ratio */}
            <div className="video-stage-container mb-3 relative">
              {!videoError ? (
                <>
                  <video
                    ref={videoRef}
                    src={phrase.video_url}
                    playsInline
                    autoPlay
                    loop={isLooping}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => setVideoError(true)}
                    className="video-stage-element"
                  />

                  {/* Play/Pause Overlay Button */}
                  <button
                    onClick={togglePlay}
                    className="video-play-overlay"
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    <div className="video-play-circle">
                      {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
                    </div>
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 min-h-[220px]">
                  <FileVideo size={36} className="text-indigo-400 mb-2" />
                  <h4 className="text-sm font-semibold text-white mb-1">Authentic ISL Video Clip Awaited</h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-3">
                    Expected path: <code>public{phrase.video_url}</code>. SignBridge intentionally preserves accurate ISL clips rather than substituting unverified gestures.
                  </p>
                  <button
                    onClick={() => setActiveTab('guide')}
                    className="btn btn-secondary btn-sm"
                  >
                    <BookOpen size={13} />
                    <span>View Step-by-Step Motion Guide</span>
                  </button>
                </div>
              )}

              {/* Video Overlay Badges */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="badge badge-accent text-xs">
                  {phrase.category}
                </span>
                <span className="badge bg-black/70 text-slate-300 border border-white/10 text-xs">
                  {phrase.hands === 1 ? '1-Hand Sign' : '2-Hands Sign'}
                </span>
              </div>
            </div>

            {/* Video Control Bar */}
            <div className="video-controls-row mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  disabled={videoError}
                  className="btn btn-secondary btn-sm"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  disabled={videoError}
                  className={`btn btn-sm ${
                    isLooping ? 'btn-primary' : 'btn-secondary text-slate-400'
                  }`}
                  title={isLooping ? 'Looping enabled' : 'Looping disabled'}
                >
                  <RotateCcw size={13} />
                  <span>Loop</span>
                </button>
              </div>

              {/* Playback speed selector */}
              <div className="flex items-center gap-1 text-xs">
                <FastForward size={13} className="text-slate-400" />
                <span className="text-slate-400 mr-1">Speed:</span>
                {[0.5, 0.75, 1.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    disabled={videoError}
                    className={`rate-btn ${
                      playbackRate === rate ? 'rate-btn-active' : ''
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Phrase Technique & Description */}
            <div className="phrase-technique-card">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1 text-xs">
                <Info size={13} className="text-indigo-400" />
                <span>ISL Signing Technique:</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{phrase.description}</p>
            </div>
          </div>
        ) : (
          <div className="video-stage-container flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Film size={36} className="text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-200 mb-1">Select an ISL Phrase</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Select any everyday phrase above or speak into the microphone to review demonstration video clips.
            </p>
          </div>
        )
      ) : activeTab === 'guide' ? (
        /* Motion & Linguistic Guide Tab */
        phrase ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <BookOpen size={16} className="text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  Motion Guide: <span className="text-cyan-300">"{phrase.phrase}"</span>
                </h4>
              </div>
              {phrase.handshape && (
                <span className="badge badge-accent text-[11px]">
                  {phrase.handshape}
                </span>
              )}
            </div>

            {/* Step-by-Step Motion Timeline */}
            {phrase.steps && phrase.steps.length > 0 ? (
              <div className="flex flex-col gap-2">
                {phrase.steps.map((st, idx) => (
                  <div
                    key={st.step}
                    onClick={() => setActiveStepTab(idx)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      activeStepTab === idx
                        ? 'bg-indigo-950/40 border-indigo-500/50'
                        : 'bg-black/20 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {st.step}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-100">{st.title}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{st.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">{phrase.description}</p>
            )}

            {/* Linguistic / Cultural Notes */}
            {phrase.linguistic_notes && (
              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-300 mb-1">
                  <Sparkles size={13} />
                  <span>ISL Linguistic & Cultural Context:</span>
                </div>
                <span>{phrase.linguistic_notes}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs">
            Select a phrase to view step-by-step motion breakdowns.
          </div>
        )
      ) : (
        /* Fingerspelling Breakdown View */
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
              <span className="flex items-center gap-1.5">
                <Layers size={13} className="text-cyan-400" />
                <span>
                  Fingerspelling word: <strong className="text-white font-mono">{customWord}</strong>
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {lettersToSpell.length} {lettersToSpell.length === 1 ? 'letter' : 'letters'}
              </span>
            </div>

            <div className="fingerspell-cards-grid">
              {lettersToSpell.map((char, idx) => {
                const isOneHand = ['C', 'I', 'L', 'O', 'U', 'V', 'W', '1', '2', '3', '4', '5'].includes(char);
                return (
                  <div key={idx} className="fingerspell-card">
                    <span className="text-xl font-bold font-mono text-cyan-400">{char}</span>
                    <span
                      className={`badge text-[9px] mt-1 ${
                        isOneHand ? 'badge-primary' : 'badge-accent'
                      }`}
                    >
                      {isOneHand ? '1-Hand' : '2-Hands'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-cyan-950/25 border border-cyan-500/20 text-xs text-cyan-300 mt-3 leading-relaxed">
            In Indian Sign Language, uncommon words, acronyms, and names are fingerspelled using standard single and two-handed alphabets.
          </div>
        </div>
      )}
    </div>
  );
};

export default ISLVideoPlayer;
