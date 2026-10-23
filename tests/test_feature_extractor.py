"""
Unit and regression tests for SignBridge feature extractor.
Verifies exact mathematical parity with upstream inference_hybrid.py normalization.
"""

import pytest
from signbridge.inference.feature_extractor import (
    normalize_landmarks,
    extract_hand_features,
    extract_multi_hand_features,
    LANDMARKS_PER_HAND,
    FEATURES_PER_HAND,
)

class MockLandmark:
    """Mock MediaPipe Landmark object with .x and .y attributes."""
    def __init__(self, x: float, y: float, z: float = 0.0):
        self.x = x
        self.y = y
        self.z = z

def test_feature_extractor_math_parity_dict():
    """Verify normalization formula: x - min(x), y - min(y)."""
    # Create 21 landmarks
    landmarks = [{"x": float(i * 0.05 + 0.2), "y": float(i * 0.03 + 0.1)} for i in range(21)]
    min_x = min(lm["x"] for lm in landmarks)
    min_y = min(lm["y"] for lm in landmarks)
    
    features = normalize_landmarks(landmarks)
    assert len(features) == 42
    
    # Check that first landmark matches x0 - min_x, y0 - min_y
    assert pytest.approx(features[0]) == landmarks[0]["x"] - min_x
    assert pytest.approx(features[1]) == landmarks[0]["y"] - min_y
    # Since landmarks are monotonically increasing, min_x = landmarks[0]["x"]
    assert pytest.approx(features[0]) == 0.0
    assert pytest.approx(features[1]) == 0.0

def test_feature_extractor_math_parity_object():
    """Verify with MediaPipe-style objects with .x and .y attributes."""
    landmarks = [MockLandmark(x=i * 0.02 + 0.3, y=i * 0.04 + 0.15) for i in range(21)]
    
    # Original upstream logic from inference_hybrid.py lines 69-76:
    x_ = [lm.x for lm in landmarks]
    y_ = [lm.y for lm in landmarks]
    expected_upstream = []
    for lm in landmarks:
        expected_upstream.append(lm.x - min(x_))
        expected_upstream.append(lm.y - min(y_))
        
    extracted = extract_hand_features(landmarks)
    assert extracted == expected_upstream

def test_two_hands_feature_vector_parity():
    """Verify two hands concatenation (42 + 42 = 84 features)."""
    hand1 = [MockLandmark(x=0.1 + i * 0.01, y=0.2 + i * 0.01) for i in range(21)]
    hand2 = [MockLandmark(x=0.5 + i * 0.01, y=0.4 + i * 0.01) for i in range(21)]
    
    # Upstream logic from inference_hybrid.py lines 88-97:
    upstream_features = []
    for hand in [hand1, hand2]:
        x_ = [lm.x for lm in hand]
        y_ = [lm.y for lm in hand]
        for lm in hand:
            upstream_features.append(lm.x - min(x_))
            upstream_features.append(lm.y - min(y_))
            
    extracted = extract_multi_hand_features([hand1, hand2])
    assert len(extracted) == 84
    assert extracted == upstream_features

def test_invalid_landmark_count_raises():
    """Hand with fewer or more than 21 landmarks must raise ValueError."""
    with pytest.raises(ValueError, match="Expected 21 landmarks"):
        normalize_landmarks([{"x": 0.1, "y": 0.2}] * 20)

    with pytest.raises(ValueError, match="Expected 21 landmarks"):
        normalize_landmarks([{"x": 0.1, "y": 0.2}] * 22)

def test_invalid_hand_count_raises():
    """Passing 3 hands must raise ValueError."""
    h = [{"x": 0.1, "y": 0.2}] * 21
    with pytest.raises(ValueError, match="Only 1 or 2 hands supported"):
        extract_multi_hand_features([h, h, h])

def test_empty_hands_returns_empty():
    assert extract_multi_hand_features([]) == []
