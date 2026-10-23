"""
Feature extraction and normalization module for SignBridge.
Preserves the exact mathematical transformation and feature order of the original repository:
- 1 Hand: 42 features (21 landmarks x [x - min(x), y - min(y)])
- 2 Hands: 84 features (Hand 0 [42] + Hand 1 [42])
"""

from typing import List, Dict, Any, Union, Sequence

LANDMARKS_PER_HAND = 21
FEATURES_PER_HAND = LANDMARKS_PER_HAND * 2  # 42

def _get_xy(lm: Any) -> tuple[float, float]:
    """Extracts (x, y) coordinates from a landmark represented as a dict, object, or sequence."""
    if isinstance(lm, dict):
        if 'x' in lm and 'y' in lm:
            return float(lm['x']), float(lm['y'])
        raise KeyError("Landmark dict must contain 'x' and 'y' keys")
    elif hasattr(lm, 'x') and hasattr(lm, 'y'):
        return float(lm.x), float(lm.y)
    elif isinstance(lm, (list, tuple)) and len(lm) >= 2:
        return float(lm[0]), float(lm[1])
    else:
        raise ValueError(f"Unsupported landmark type: {type(lm)}")

def normalize_landmarks(landmarks: Sequence[Any]) -> List[float]:
    """
    Normalizes a single hand's 21 landmarks exactly as in original inference_hybrid.py:
    1. Collect all x and y coordinates.
    2. Compute min(x) and min(y).
    3. For each landmark, append (x - min(x)) followed by (y - min(y)).
    
    Returns:
        List of 42 floating-point values.
    """
    if len(landmarks) != LANDMARKS_PER_HAND:
        raise ValueError(
            f"Expected {LANDMARKS_PER_HAND} landmarks for a hand, received {len(landmarks)}"
        )
    
    coords = [_get_xy(lm) for lm in landmarks]
    x_list = [c[0] for c in coords]
    y_list = [c[1] for c in coords]
    
    min_x = min(x_list)
    min_y = min(y_list)
    
    features: List[float] = []
    for x, y in coords:
        features.append(float(x - min_x))
        features.append(float(y - min_y))
        
    return features

def extract_hand_features(landmarks: Sequence[Any]) -> List[float]:
    """Alias for normalize_landmarks for single hand (42 features)."""
    return normalize_landmarks(landmarks)

def extract_multi_hand_features(hands: Sequence[Sequence[Any]]) -> List[float]:
    """
    Extracts features for 1 or 2 hands.
    If 1 hand: returns 42 features.
    If 2 hands: returns 84 features (Hand 0 followed by Hand 1).
    """
    if len(hands) == 0:
        return []
    elif len(hands) == 1:
        return normalize_landmarks(hands[0])
    elif len(hands) == 2:
        features_h0 = normalize_landmarks(hands[0])
        features_h1 = normalize_landmarks(hands[1])
        return features_h0 + features_h1
    else:
        raise ValueError(f"Only 1 or 2 hands supported, received {len(hands)} hands")
