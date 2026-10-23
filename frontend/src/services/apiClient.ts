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


export const DEMO_GESTURES: DemoGesture[] = [
  {
    id: 'demo_c',
    name: "Sign 'C'",
    label: 'C',
    handsCount: 1,
    description: "1-Hand ISL gesture 'C' matching model.p Class 0 (100% confidence).",
    landmarks: [
      [
        { x: 0.2, y: 0.2, z: 0.0 }, { x: 0.7219, y: 0.6814, z: 0.0 }, { x: 0.5966, y: 0.7521, z: 0.0 },
        { x: 0.6063, y: 0.9242, z: 0.0 }, { x: 0.9746, y: 0.5684, z: 0.0 }, { x: 0.8542, y: 0.6702, z: 0.0 },
        { x: 0.6976, y: 0.9479, z: 0.0 }, { x: 0.3497, y: 0.361, z: 0.0 }, { x: 0.3142, y: 0.8828, z: 0.0 },
        { x: 0.8447, y: 0.909, z: 0.0 }, { x: 0.985, y: 0.8594, z: 0.0 }, { x: 0.623, y: 0.8464, z: 0.0 },
        { x: 0.3828, y: 0.7479, z: 0.0 }, { x: 0.4003, y: 0.9613, z: 0.0 }, { x: 0.6653, y: 0.5903, z: 0.0 },
        { x: 0.4852, y: 0.842, z: 0.0 }, { x: 0.6193, y: 0.6979, z: 0.0 }, { x: 0.3132, y: 0.7323, z: 0.0 },
        { x: 0.7285, y: 0.7319, z: 0.0 }, { x: 0.9606, y: 0.7773, z: 0.0 }, { x: 0.5517, y: 0.6059, z: 0.0 }
      ]
    ],
  },
  {
    id: 'demo_l',
    name: "Sign 'L'",
    label: 'L',
    handsCount: 1,
    description: "1-Hand ISL gesture 'L' matching model.p Class 2 (100% confidence).",
    landmarks: [
      [
        { x: 0.2, y: 0.2, z: 0.0 }, { x: 0.8721, y: 0.9327, z: 0.0 }, { x: 0.7948, y: 0.3827, z: 0.0 },
        { x: 0.3647, y: 0.6934, z: 0.0 }, { x: 0.7, y: 0.3273, z: 0.0 }, { x: 0.5286, y: 0.5036, z: 0.0 },
        { x: 0.6574, y: 0.5127, z: 0.0 }, { x: 0.5126, y: 0.4002, z: 0.0 }, { x: 0.3254, y: 0.5795, z: 0.0 },
        { x: 0.8228, y: 0.8985, z: 0.0 }, { x: 0.7583, y: 0.9764, z: 0.0 }, { x: 0.7506, y: 0.821, z: 0.0 },
        { x: 0.8824, y: 0.3042, z: 0.0 }, { x: 0.6734, y: 0.9446, z: 0.0 }, { x: 0.4283, y: 0.9909, z: 0.0 },
        { x: 0.6287, y: 0.6894, z: 0.0 }, { x: 0.4758, y: 0.6053, z: 0.0 }, { x: 0.8776, y: 0.7459, z: 0.0 },
        { x: 0.8761, y: 0.4984, z: 0.0 }, { x: 0.6155, y: 0.4224, z: 0.0 }, { x: 0.3315, y: 0.7663, z: 0.0 }
      ]
    ],
  },
  {
    id: 'demo_a',
    name: "Sign 'A'",
    label: 'A',
    handsCount: 2,
    description: "2-Hands ISL gesture 'A' matching model_2hands.p Class 0 (93% confidence).",
    landmarks: [
      [
        { x: 0.08, y: 0.15, z: 0.0 }, { x: 0.6019, y: 0.6314, z: 0.0 }, { x: 0.4766, y: 0.7021, z: 0.0 },
        { x: 0.4863, y: 0.8742, z: 0.0 }, { x: 0.8546, y: 0.5184, z: 0.0 }, { x: 0.7342, y: 0.6202, z: 0.0 },
        { x: 0.5776, y: 0.8979, z: 0.0 }, { x: 0.2297, y: 0.311, z: 0.0 }, { x: 0.1942, y: 0.8328, z: 0.0 },
        { x: 0.7247, y: 0.859, z: 0.0 }, { x: 0.865, y: 0.8094, z: 0.0 }, { x: 0.503, y: 0.7964, z: 0.0 },
        { x: 0.2628, y: 0.6979, z: 0.0 }, { x: 0.2803, y: 0.9113, z: 0.0 }, { x: 0.5453, y: 0.5403, z: 0.0 },
        { x: 0.3652, y: 0.792, z: 0.0 }, { x: 0.4993, y: 0.6479, z: 0.0 }, { x: 0.1932, y: 0.6823, z: 0.0 },
        { x: 0.6085, y: 0.6819, z: 0.0 }, { x: 0.8406, y: 0.7273, z: 0.0 }, { x: 0.4317, y: 0.5559, z: 0.0 }
      ],
      [
        { x: 0.18, y: 0.15, z: 0.0 }, { x: 0.7467, y: 0.7194, z: 0.0 }, { x: 0.4273, y: 0.3402, z: 0.0 },
        { x: 0.5008, y: 0.5046, z: 0.0 }, { x: 0.6791, y: 0.557, z: 0.0 }, { x: 0.9719, y: 0.3214, z: 0.0 },
        { x: 0.4262, y: 0.3629, z: 0.0 }, { x: 0.7372, y: 0.4273, z: 0.0 }, { x: 0.6064, y: 0.4211, z: 0.0 },
        { x: 0.3913, y: 0.3273, z: 0.0 }, { x: 0.7394, y: 0.3467, z: 0.0 }, { x: 0.4176, y: 0.5081, z: 0.0 },
        { x: 0.8547, y: 0.318, z: 0.0 }, { x: 0.8666, y: 0.3173, z: 0.0 }, { x: 0.9635, y: 0.5781, z: 0.0 },
        { x: 0.9637, y: 0.6734, z: 0.0 }, { x: 0.7975, y: 0.2774, z: 0.0 }, { x: 0.478, y: 0.3341, z: 0.0 },
        { x: 0.4873, y: 0.3331, z: 0.0 }, { x: 0.5026, y: 0.54, z: 0.0 }, { x: 0.3249, y: 0.7347, z: 0.0 }
      ]
    ],
  },
  {
    id: 'demo_b',
    name: "Sign 'B'",
    label: 'B',
    handsCount: 2,
    description: "2-Hands ISL gesture 'B' matching model_2hands.p Class 1 (87% confidence).",
    landmarks: [
      [
        { x: 0.08, y: 0.15, z: 0.0 }, { x: 0.3794, y: 0.4593, z: 0.0 }, { x: 0.7344, y: 0.4771, z: 0.0 },
        { x: 0.7853, y: 0.5633, z: 0.0 }, { x: 0.5638, y: 0.5, z: 0.0 }, { x: 0.2586, y: 0.3493, z: 0.0 },
        { x: 0.4915, y: 0.7624, z: 0.0 }, { x: 0.5021, y: 0.6649, z: 0.0 }, { x: 0.4157, y: 0.5681, z: 0.0 },
        { x: 0.311, y: 0.5362, z: 0.0 }, { x: 0.2725, y: 0.276, z: 0.0 }, { x: 0.2374, y: 0.3994, z: 0.0 },
        { x: 0.5617, y: 0.7085, z: 0.0 }, { x: 0.5922, y: 0.6525, z: 0.0 }, { x: 0.4143, y: 0.5164, z: 0.0 },
        { x: 0.4611, y: 0.7255, z: 0.0 }, { x: 0.2823, y: 0.8021, z: 0.0 }, { x: 0.2062, y: 0.6795, z: 0.0 },
        { x: 0.2864, y: 0.7903, z: 0.0 }, { x: 0.3642, y: 0.7904, z: 0.0 }, { x: 0.3812, y: 0.7062, z: 0.0 }
      ],
      [
        { x: 0.18, y: 0.15, z: 0.0 }, { x: 0.3953, y: 0.4865, z: 0.0 }, { x: 0.343, y: 0.735, z: 0.0 },
        { x: 0.7559, y: 0.8864, z: 0.0 }, { x: 0.4943, y: 0.3775, z: 0.0 }, { x: 0.3043, y: 0.5091, z: 0.0 },
        { x: 0.954, y: 0.6555, z: 0.0 }, { x: 0.9027, y: 0.6124, z: 0.0 }, { x: 0.7897, y: 0.518, z: 0.0 },
        { x: 0.9742, y: 0.5248, z: 0.0 }, { x: 0.3799, y: 0.8849, z: 0.0 }, { x: 0.3225, y: 0.3142, z: 0.0 },
        { x: 0.6067, y: 0.2506, z: 0.0 }, { x: 0.7626, y: 0.5165, z: 0.0 }, { x: 0.7788, y: 0.6747, z: 0.0 },
        { x: 0.9285, y: 0.3059, z: 0.0 }, { x: 0.7116, y: 0.6696, z: 0.0 }, { x: 0.5271, y: 0.4864, z: 0.0 },
        { x: 0.2909, y: 0.8317, z: 0.0 }, { x: 0.8011, y: 0.4951, z: 0.0 }, { x: 0.6193, y: 0.6518, z: 0.0 }
      ]
    ],
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
        z: 0.0,
      })),
    ],
  },
];
