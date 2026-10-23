/**
 * SignBridge - Client-Side Hand Geometry Analyzer & Conversational Gesture Heuristics
 * Adapted from reference implementation (Warlord-06/teamname-vellosta).
 * 
 * IMPORTANT ARCHITECTURAL DISTINCTION:
 * - Primary Classifier: Local Python scikit-learn Random Forest model via FastAPI (/v1/predict)
 *   trained specifically on Indian Sign Language (ISL) alphabets and numbers (36 classes).
 * - Heuristic Classifier (this file): Client-side geometric heuristics identifying general
 *   conversational cues (e.g. Yes/Thumbs-Up, No/Thumbs-Down, Peace, Wave/Hello) when
 *   complementary conversational mode is desired.
 * - This module does NOT claim to provide complete ISL translation.
 */

import type { LandmarkPoint } from './apiClient';

export interface HandGeometry {
  wrist: LandmarkPoint;
  isThumbExtended: boolean;
  isThumbUp: boolean;
  isIndexExtended: boolean;
  isMiddleExtended: boolean;
  isRingExtended: boolean;
  isPinkyExtended: boolean;
  fingersClose: boolean;
  extendedCount: number;
}

export interface HeuristicGestureResult {
  name: string;
  phrase: string;
  confidence: number;
  method: 'geometric-heuristic';
  description: string;
  isConversationalHeuristic: true;
}

// Distance between two 2D/3D points
function dist(p1: LandmarkPoint, p2: LandmarkPoint): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Computes anatomical finger states (extended vs curled) from 21 landmarks.
 */
export function analyzeHandGeometry(landmarks: LandmarkPoint[]): HandGeometry | null {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];

  const indexTip = landmarks[8];
  const indexPip = landmarks[6];

  const middleTip = landmarks[12];
  const middlePip = landmarks[10];

  const ringTip = landmarks[16];
  const ringPip = landmarks[14];

  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];

  // Extension checks: Tip is further from wrist than PIP joint
  const isIndexExtended = dist(indexTip, wrist) > dist(indexPip, wrist) && indexTip.y < indexPip.y;
  const isMiddleExtended = dist(middleTip, wrist) > dist(middlePip, wrist) && middleTip.y < middlePip.y;
  const isRingExtended = dist(ringTip, wrist) > dist(ringPip, wrist) && ringTip.y < ringPip.y;
  const isPinkyExtended = dist(pinkyTip, wrist) > dist(pinkyPip, wrist) && pinkyTip.y < pinkyPip.y;

  // Thumb extension
  const thumbDistFromWrist = dist(thumbTip, wrist);
  const thumbMcpDist = dist(thumbMcp, wrist);
  const isThumbExtended = thumbDistFromWrist > thumbMcpDist * 1.15;
  const isThumbUp = thumbTip.y < landmarks[5].y && thumbTip.y < landmarks[9].y && thumbTip.y < thumbMcp.y;

  // Inter-finger proximity (fingers flat together)
  const indexMiddleDist = dist(indexTip, middleTip);
  const middleRingDist = dist(middleTip, ringTip);
  const ringPinkyDist = dist(ringTip, pinkyTip);
  const fingersClose = indexMiddleDist < 0.08 && middleRingDist < 0.08 && ringPinkyDist < 0.08;

  const extendedCount =
    [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended].filter(Boolean).length +
    (isThumbExtended ? 1 : 0);

  return {
    wrist,
    isThumbExtended,
    isThumbUp,
    isIndexExtended,
    isMiddleExtended,
    isRingExtended,
    isPinkyExtended,
    fingersClose,
    extendedCount,
  };
}

/**
 * Classifies basic conversational gesture heuristics from hand geometry.
 * Returns null if the handshape does not match a known heuristic gesture.
 */
export function classifyConversationalHeuristic(
  primaryHand: LandmarkPoint[],
  allHands?: LandmarkPoint[][]
): HeuristicGestureResult | null {
  if (!primaryHand || primaryHand.length < 21) return null;

  const geo = analyzeHandGeometry(primaryHand);
  if (!geo) return null;

  // RULE 1: Yes / Affirmative (Thumbs Up)
  if (geo.isThumbUp && !geo.isIndexExtended && !geo.isMiddleExtended && !geo.isRingExtended && !geo.isPinkyExtended) {
    return {
      name: 'Yes',
      phrase: 'Yes',
      confidence: 0.90,
      method: 'geometric-heuristic',
      description: 'Thumbs-up affirmative gesture',
      isConversationalHeuristic: true,
    };
  }

  // RULE 2: Peace / Two (V-Sign: Index & Middle Extended, Ring & Pinky Curled)
  if (geo.isIndexExtended && geo.isMiddleExtended && !geo.isRingExtended && !geo.isPinkyExtended) {
    return {
      name: 'Peace / Two',
      phrase: 'Peace',
      confidence: 0.88,
      method: 'geometric-heuristic',
      description: 'V-sign (Index & Middle extended)',
      isConversationalHeuristic: true,
    };
  }

  // RULE 3: Hello / Open Palm (Raised open hand with 4+ extended fingers)
  if (geo.extendedCount >= 4 && primaryHand[8].y < 0.5) {
    return {
      name: 'Hello',
      phrase: 'Hello',
      confidence: 0.85,
      method: 'geometric-heuristic',
      description: 'Raised open palm greeting',
      isConversationalHeuristic: true,
    };
  }

  // RULE 4: Thank You (Flat hand near chin/chest)
  if (geo.isIndexExtended && geo.isMiddleExtended && geo.isRingExtended && geo.isPinkyExtended && geo.fingersClose) {
    if (primaryHand[8].y > 0.25 && primaryHand[8].y < 0.65) {
      return {
        name: 'Thank You',
        phrase: 'Thank you',
        confidence: 0.82,
        method: 'geometric-heuristic',
        description: 'Flat open hand courtesy gesture',
        isConversationalHeuristic: true,
      };
    }
  }

  // RULE 5: Two-handed Help Me gesture (one hand resting over another)
  if (allHands && allHands.length === 2) {
    const hand1 = allHands[0];
    const hand2 = allHands[1];
    const verticalDist = Math.abs(hand1[0].y - hand2[0].y);
    const horizDist = Math.abs(hand1[0].x - hand2[0].x);
    if (verticalDist > 0.05 && verticalDist < 0.35 && horizDist < 0.25) {
      return {
        name: 'Help Me',
        phrase: 'Help me',
        confidence: 0.84,
        method: 'geometric-heuristic',
        description: 'Two-handed assistance gesture',
        isConversationalHeuristic: true,
      };
    }
  }

  return null;
}
