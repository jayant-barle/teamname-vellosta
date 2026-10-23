/**
 * SignBridge API Client
 * Interfaces and methods for interacting with FastAPI backend.
 */

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export type PredictionStatus = 'recognized' | 'uncertain' | 'no_detection' | 'missing_model' | 'error';

export interface PredictResponse {
  status: PredictionStatus;
  label: string | null;
  confidence: number | null;
  hand_count: number;
  feature_count: number;
  message: string;
  probabilities?: Record<string, number> | null;
  model_type?: '1-hand' | '2-hands' | null;
  latency_ms: number;
}

export interface VocabularyResponse {
  one_hand: string[];
  two_hands: string[];
  total_classes: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  model_1hand_loaded: boolean;
  model_2hand_loaded: boolean;
  classes_1hand_count: number;
  classes_2hand_count: number;
  proba_1hand_supported: boolean;
  proba_2hand_supported: boolean;
  confidence_threshold: number;
}

export interface PhraseItem {
  id: string;
  phrase: string;
  category: string;
  description: string;
  hands: number;
  video_url: string;
  sample_image?: string;
  tags: string[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Health check failed with status: ${res.status}`);
  return res.json();
}

export async function fetchVocabulary(): Promise<VocabularyResponse> {
  const res = await fetch(`${API_BASE}/v1/vocabulary`);
  if (!res.ok) throw new Error(`Vocabulary fetch failed with status: ${res.status}`);
  return res.json();
}

export async function fetchPhrases(): Promise<PhraseItem[]> {
  const res = await fetch(`${API_BASE}/v1/phrases`);
  if (!res.ok) throw new Error(`Phrases fetch failed with status: ${res.status}`);
  return res.json();
}

export async function predictGesture(
  features?: number[],
  landmarks?: LandmarkPoint[][],
  confidenceThreshold?: number
): Promise<PredictResponse> {
  const payload: Record<string, any> = {};
  if (features) payload.features = features;
  if (landmarks) payload.landmarks = landmarks;
  if (typeof confidenceThreshold === 'number') payload.confidence_threshold = confidenceThreshold;

  const res = await fetch(`${API_BASE}/v1/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Inference request failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

/**
 * Extracts 42 or 84 features directly in client for zero-overhead transmission.
 * Mirrors upstream formula: for each hand, x - min(x), y - min(y).
 */
export function extractFeaturesFromLandmarks(hands: LandmarkPoint[][]): number[] {
  if (!hands || hands.length === 0) return [];

  const features: number[] = [];
  const handsToProcess = hands.slice(0, 2);

  for (const hand of handsToProcess) {
    if (hand.length !== 21) continue;
    const minX = Math.min(...hand.map((p) => p.x));
    const minY = Math.min(...hand.map((p) => p.y));

    for (const p of hand) {
      features.push(p.x - minX);
      features.push(p.y - minY);
    }
  }

  return features;
}
