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

export interface PhraseStep {
  step: number;
  title: string;
  detail: string;
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
  handshape?: string;
  steps?: PhraseStep[];
  linguistic_notes?: string;
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

/**
 * Pre-calibrated sample landmark sets for testing and demonstration
 * without requiring a physical camera device.
 */
export interface DemoGesture {
  id: string;
  name: string;
  label: string;
  handsCount: 1 | 2;
  description: string;
  landmarks: LandmarkPoint[][];
}

function generateCurvedHand(baseX = 0.5, baseY = 0.5): LandmarkPoint[] {
  const points: LandmarkPoint[] = [];
  // Wrist
  points.push({ x: baseX, y: baseY + 0.3 });
  // 5 fingers curved in an arc (like 'C')
  const angles = [-0.6, -0.3, 0.0, 0.3, 0.6];
  angles.forEach((angle) => {
    for (let joint = 1; joint <= 4; joint++) {
      const radius = 0.06 * joint;
      points.push({
        x: baseX + Math.cos(angle - 1.5) * radius * 0.8,
        y: baseY + Math.sin(angle - 1.5) * radius + 0.1,
      });
    }
  });
  return points.slice(0, 21);
}

function generateLHand(baseX = 0.5, baseY = 0.5): LandmarkPoint[] {
  const points: LandmarkPoint[] = [];
  points.push({ x: baseX, y: baseY + 0.25 }); // Wrist
  // Thumb extended horizontally
  for (let j = 1; j <= 4; j++) points.push({ x: baseX - j * 0.05, y: baseY + 0.15 });
  // Index extended vertically
  for (let j = 1; j <= 4; j++) points.push({ x: baseX, y: baseY + 0.15 - j * 0.07 });
  // Middle, Ring, Pinky curled in fist
  for (let finger = 0; finger < 3; finger++) {
    for (let j = 1; j <= 4; j++) {
      points.push({ x: baseX + (finger + 1) * 0.03, y: baseY + 0.18 + j * 0.02 });
    }
  }
  return points.slice(0, 21);
}

export const DEMO_GESTURES: DemoGesture[] = [
  {
    id: 'demo_c',
    name: "Sign 'C'",
    label: 'C',
    handsCount: 1,
    description: '1-Hand ISL gesture with curved fingers forming a C shape.',
    landmarks: [generateCurvedHand(0.5, 0.4)],
  },
  {
    id: 'demo_l',
    name: "Sign 'L'",
    label: 'L',
    handsCount: 1,
    description: '1-Hand ISL gesture with index finger upright and thumb extended at 90°.',
    landmarks: [generateLHand(0.5, 0.4)],
  },
  {
    id: 'demo_a',
    name: "Sign 'A'",
    label: 'A',
    handsCount: 2,
    description: '2-Hands ISL gesture: index finger of dominant hand touches thumb tip of non-dominant hand.',
    landmarks: [generateCurvedHand(0.4, 0.45), generateCurvedHand(0.6, 0.45)],
  },
  {
    id: 'demo_b',
    name: "Sign 'B'",
    label: 'B',
    handsCount: 2,
    description: '2-Hands ISL gesture: both hands form circles meeting like spectacles in front of eyes.',
    landmarks: [generateLHand(0.38, 0.45), generateLHand(0.62, 0.45)],
  },
  {
    id: 'demo_uncertain',
    name: 'Uncertain Sign',
    label: '?',
    handsCount: 1,
    description: 'Demonstrates rejection policy: flat ambiguous landmarks triggering the uncertainty badge.',
    landmarks: [
      Array.from({ length: 21 }, (_, i) => ({
        x: 0.5 + (i % 5) * 0.01,
        y: 0.5 + Math.floor(i / 5) * 0.01,
      })),
    ],
  },
];
