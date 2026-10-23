/**
 * SignBridge - Speech Synthesis Hook
 * Adapted from reference implementation (Warlord-06/teamname-vellosta).
 * Manages Web SpeechSynthesis API with voice enumeration, speech rate, auto-speak, and cleanup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeechSynthesisHook {
  isSupported: boolean;
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  rate: number;
  setRate: (rate: number) => void;
  autoSpeak: boolean;
  setAutoSpeak: (enabled: boolean) => void;
  speak: (text: string) => void;
  stop: () => void;
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [isSupported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState<number>(1.0);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);

  const isSpeakingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);

        // Auto-select preferred English or natural voice
        if (!selectedVoice && availableVoices.length > 0) {
          const defaultVoice =
            availableVoices.find(
              (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))
            ) ||
            availableVoices.find((v) => v.lang.startsWith('en')) ||
            availableVoices[0];
          setSelectedVoice(defaultVoice || null);
        }
      };

      updateVoices();

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, [selectedVoice]);

  const speak = useCallback(
    (text: string) => {
      if (!text || typeof text !== 'string') return;
      const cleanText = text.trim();
      if (!cleanText) return;

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      // Cancel previous utterance to prevent queuing delays
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = rate;

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled') {
          console.warn('Speech synthesis notification:', e);
        }
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    },
    [selectedVoice, rate]
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, []);

  return {
    isSupported,
    isSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
    autoSpeak,
    setAutoSpeak,
    speak,
    stop,
  };
}
