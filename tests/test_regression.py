"""
Regression tests verifying exact parity between the original inference_hybrid.py
pipeline and the new SignBridgeInferenceService.
"""

import pickle
import numpy as np
import pytest
from signbridge.config import DEFAULT_1HAND_MODEL_PATH, DEFAULT_2HAND_MODEL_PATH
from signbridge.inference.service import SignBridgeInferenceService

def test_original_vs_service_one_hand_parity():
    """Verify that the service produces the exact same prediction as the original code."""
    # 1. Load directly using original snippet from inference_hybrid.py lines 8-11:
    with open(DEFAULT_1HAND_MODEL_PATH, 'rb') as f:
        model1 = pickle.load(f)
        model_1hand = model1['model']
        map_1hand = model1['label_map']
    id_to_label_1hand = {idx: label for idx, label in map_1hand.items()}

    # 2. Load service
    service = SignBridgeInferenceService(
        model_1hand_path=DEFAULT_1HAND_MODEL_PATH,
        model_2hand_path=DEFAULT_2HAND_MODEL_PATH,
        confidence_threshold=0.0,  # disable rejection to test raw prediction parity
    )

    # 3. Test on 50 distinct pseudo-random feature vectors
    rng = np.random.RandomState(12345)
    for _ in range(50):
        test_features = rng.uniform(0.0, 1.0, size=(42,)).tolist()

        # Original logic from inference_hybrid.py line 79-80:
        pred_original = model_1hand.predict([test_features])[0]
        label_original = id_to_label_1hand.get(pred_original, "Unknown")

        # Service logic:
        res = service.predict(features=test_features)

        assert res.label == label_original, f"Mismatch: original={label_original}, service={res.label}"

def test_original_vs_service_two_hand_parity():
    """Verify that 2-hand predictions match the original code exactly."""
    with open(DEFAULT_2HAND_MODEL_PATH, 'rb') as f:
        model2 = pickle.load(f)
        model_2hand = model2['model']
        map_2hand = model2['label_map']
    id_to_label_2hand = {idx: label for idx, label in map_2hand.items()}

    service = SignBridgeInferenceService(
        model_1hand_path=DEFAULT_1HAND_MODEL_PATH,
        model_2hand_path=DEFAULT_2HAND_MODEL_PATH,
        confidence_threshold=0.0,
    )

    rng = np.random.RandomState(54321)
    for _ in range(50):
        test_features = rng.uniform(0.0, 1.0, size=(84,)).tolist()

        # Original logic from inference_hybrid.py line 100-101:
        pred_original = model_2hand.predict([test_features])[0]
        label_original = id_to_label_2hand.get(pred_original, "Unknown")

        res = service.predict(features=test_features)

        assert res.label == label_original, f"Mismatch: original={label_original}, service={res.label}"
