import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, Info, Layers, Film } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'video' | 'fingerspelling'>('video');

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
    <div className="glass-panel p-6 flex flex-col justify-between h-full">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-indigo-400" />
          <h3 className="text-base font-bold text-white">Reviewed ISL Video Player</h3>
        </div>

        {/* Tab switch between phrase clip and fingerspelling */}
        {lettersToSpell.length > 0 && (
          <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-white/5 text-xs">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'video'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Phrase Clip
            </button>
            <button
              onClick={() => setActiveTab('fingerspelling')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'fingerspelling'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fingerspell ({lettersToSpell.length})
            </button>
          </div>
        )}
      </div>

      {activeTab === 'video' ? (
        phrase ? (
          <div>
            {/* Video Stage Container */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-lg group mb-4">
              <video
                ref={videoRef}
                src={phrase.video_url}
                playsInline
                autoPlay
                loop={isLooping}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-cover"
              />

              {/* Play/Pause Overlay Button */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg">
                  {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                </div>
              </button>

              {/* Video Overlay Badges */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">
                  {phrase.category}
                </span>
                <span className="badge bg-black/60 text-slate-300 border border-white/10 text-xs">
                  {phrase.hands === 1 ? '1-Hand Sign' : '2-Hands Sign'}
                </span>
              </div>
            </div>

            {/* Video Control Bar */}
            <div className="flex items-center justify-between mb-4 bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="btn btn-secondary text-xs p-1.5"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`btn text-xs p-1.5 ${
                    isLooping ? 'btn-primary' : 'btn-secondary text-slate-400'
                  }`}
                  title={isLooping ? 'Looping enabled' : 'Looping disabled'}
                >
                  <RotateCcw size={14} />
                  Loop
                </button>
              </div>

              {/* Playback speed selector */}
              <div className="flex items-center gap-1 text-xs">
                <FastForward size={14} className="text-slate-400" />
                <span className="text-slate-400 mr-1">Speed:</span>
                {[0.5, 0.75, 1.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className={`px-2 py-0.5 rounded font-mono ${
                      playbackRate === rate
                        ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Phrase Technique & Description */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                <Info size={14} className="text-indigo-400" />
                <span>Signing Technique:</span>
              </div>
              <p className="text-slate-400 leading-relaxed">{phrase.description}</p>
            </div>
          </div>
        ) : (
          <div className="aspect-video rounded-xl bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Film size={36} className="text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-300 mb-1">Select an ISL Phrase</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Select any phrase from the library or speak into the microphone to review verified video clips.
            </p>
          </div>
        )
      ) : (
        /* Fingerspelling Breakdown View */
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              <Layers size={14} className="text-cyan-400" />
              <span>
                Fingerspelling word: <strong className="text-white font-mono">{customWord}</strong>
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {lettersToSpell.map((char, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900 border border-white/10 flex flex-col items-center justify-center shadow"
                >
                  <span className="text-2xl font-bold font-mono text-cyan-400">{char}</span>
                  <span className="text-[10px] text-slate-500 uppercase mt-1">ISL Sign</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-300 mt-4">
            In Indian Sign Language, proper nouns and uncommon words are fingerspelled using standard single and two-handed ISL alphabets.
          </div>
        </div>
      )}
    </div>
  );
};
