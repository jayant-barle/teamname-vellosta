"""
SignBridge Inference Service.
Encapsulates model loading, validation, feature routing, and uncertainty rejection
while preserving exact scikit-learn estimator interaction without GUI dependencies.
"""

import os
import pickle
import logging
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, Any, Optional, List, Sequence, Tuple
import numpy as np

from signbridge.config import settings
from signbridge.inference.feature_extractor import (
    extract_multi_hand_features,
    FEATURES_PER_HAND,
)

logger = logging.getLogger("signbridge.inference")

class PredictionState(str, Enum):
    RECOGNIZED = "recognized"
    UNCERTAIN = "uncertain"
    NO_DETECTION = "no_detection"
    MISSING_MODEL = "missing_model"
    ERROR = "error"

@dataclass
class PredictionResult:
    status: PredictionState
    label: Optional[str] = None
    confidence: Optional[float] = None
    hand_count: int = 0
    feature_count: int = 0
    message: str = ""
    probabilities: Optional[Dict[str, float]] = None
    model_type: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value if isinstance(self.status, PredictionState) else str(self.status),
            "label": self.label,
            "confidence": self.confidence,
            "hand_count": self.hand_count,
            "feature_count": self.feature_count,
            "message": self.message,
            "probabilities": self.probabilities,
            "model_type": self.model_type,
        }

class SignBridgeInferenceService:
    """
    Decoupled inference engine that loads 1-hand and 2-hand models once at startup,
    resolves relative paths, validates feature vectors, and applies a strict rejection policy.
    """

    def __init__(
        self,
        model_1hand_path: Optional[Path] = None,
        model_2hand_path: Optional[Path] = None,
        confidence_threshold: Optional[float] = None,
    ):
        self.model_1hand_path = Path(model_1hand_path or settings.model_1hand_path)
        self.model_2hand_path = Path(model_2hand_path or settings.model_2hand_path)
        self.confidence_threshold = (
            confidence_threshold if confidence_threshold is not None else settings.confidence_threshold
        )

        self.model_1hand: Any = None
        self.label_map_1hand: Dict[int, str] = {}
        self.classes_1hand: List[str] = []
        self.has_proba_1hand: bool = False

        self.model_2hand: Any = None
        self.label_map_2hand: Dict[int, str] = {}
        self.classes_2hand: List[str] = []
        self.has_proba_2hand: bool = False

        self.errors_1hand: Optional[str] = None
        self.errors_2hand: Optional[str] = None

        self.load_models()

    def _load_single_model(self, model_path: Path, expected_dim: int) -> Tuple[Optional[Any], Dict[int, str], Optional[str]]:
        if not model_path.exists():
            return None, {}, f"Model file not found at: {model_path}"
        
        try:
            with open(model_path, "rb") as f:
                data = pickle.load(f)
        except Exception as e:
            return None, {}, f"Failed to unpickle model file: {e}"

        if not isinstance(data, dict):
            return None, {}, "Invalid model format: expected serialized dictionary"

        if "model" not in data or "label_map" not in data:
            return None, {}, "Missing required keys 'model' or 'label_map' in model payload"

        model = data["model"]
        raw_map = data["label_map"]

        # Ensure label_map is keyed by integer class ID and maps to string label
        label_map: Dict[int, str] = {}
        for k, v in raw_map.items():
            # Check if k is int-like and v is string (e.g. {0: 'A'})
            try:
                k_int = int(k)
                label_map[k_int] = str(v)
            except ValueError:
                # If k is string and v is int-like (e.g. {'A': 0})
                try:
                    v_int = int(v)
                    label_map[v_int] = str(k)
                except ValueError:
                    label_map[k] = str(v)

        return model, label_map, None

    def load_models(self) -> None:
        """Loads both 1-hand and 2-hand models once at startup."""
        self.model_1hand, self.label_map_1hand, self.errors_1hand = self._load_single_model(
            self.model_1hand_path, expected_dim=42
        )
        if self.model_1hand is not None:
            self.has_proba_1hand = hasattr(self.model_1hand, "predict_proba")
            if hasattr(self.model_1hand, "classes_"):
                self.classes_1hand = [self.label_map_1hand.get(c, str(c)) for c in self.model_1hand.classes_]

        self.model_2hand, self.label_map_2hand, self.errors_2hand = self._load_single_model(
            self.model_2hand_path, expected_dim=84
        )
        if self.model_2hand is not None:
            self.has_proba_2hand = hasattr(self.model_2hand, "predict_proba")
            if hasattr(self.model_2hand, "classes_"):
                self.classes_2hand = [self.label_map_2hand.get(c, str(c)) for c in self.model_2hand.classes_]

    @property
    def is_1hand_available(self) -> bool:
        return self.model_1hand is not None

    @property
    def is_2hand_available(self) -> bool:
        return self.model_2hand is not None

    def get_vocabulary(self) -> Dict[str, List[str]]:
        """Returns registered vocabulary for loaded models."""
        return {
            "one_hand": sorted(list(self.label_map_1hand.values())) if self.is_1hand_available else [],
            "two_hands": sorted(list(self.label_map_2hand.values())) if self.is_2hand_available else [],
        }

    def predict(
        self,
        features: Optional[Sequence[float]] = None,
        landmarks: Optional[Sequence[Sequence[Any]]] = None,
    ) -> PredictionResult:
        """
        Executes inference on either precomputed features or raw landmarks.
        - features: list of 42 (1-hand) or 84 (2-hand) floats.
        - landmarks: list of hands, each containing 21 landmark items with x, y coordinates.
        """
        # Case 1: Extract features from raw landmarks if provided
        hand_count = 0
        if landmarks is not None:
            hand_count = len(landmarks)
            if hand_count == 0:
                return PredictionResult(
                    status=PredictionState.NO_DETECTION,
                    hand_count=0,
                    feature_count=0,
                    message="No hands detected in input",
                )
            elif hand_count > 2:
                return PredictionResult(
                    status=PredictionState.ERROR,
                    hand_count=hand_count,
                    feature_count=0,
                    message=f"Only 1 or 2 hands supported, received {hand_count}",
                )
            try:
                features = extract_multi_hand_features(landmarks)
            except Exception as e:
                return PredictionResult(
                    status=PredictionState.ERROR,
                    hand_count=hand_count,
                    feature_count=0,
                    message=f"Feature extraction error: {e}",
                )

        if features is None:
            return PredictionResult(
                status=PredictionState.NO_DETECTION,
                hand_count=0,
                feature_count=0,
                message="No features or landmarks provided",
            )

        feat_len = len(features)
        if hand_count == 0:
            if feat_len == 42:
                hand_count = 1
            elif feat_len == 84:
                hand_count = 2

        # Route by feature length
        if feat_len == 42:
            model = self.model_1hand
            label_map = self.label_map_1hand
            has_proba = self.has_proba_1hand
            model_type = "1-hand"
            error_msg = self.errors_1hand
        elif feat_len == 84:
            model = self.model_2hand
            label_map = self.label_map_2hand
            has_proba = self.has_proba_2hand
            model_type = "2-hands"
            error_msg = self.errors_2hand
        else:
            return PredictionResult(
                status=PredictionState.ERROR,
                hand_count=hand_count,
                feature_count=feat_len,
                message=f"Invalid feature vector length: {feat_len}. Expected 42 (1-hand) or 84 (2-hands)",
            )

        if model is None:
            return PredictionResult(
                status=PredictionState.MISSING_MODEL,
                hand_count=hand_count,
                feature_count=feat_len,
                model_type=model_type,
                message=error_msg or f"Model for {model_type} is not loaded",
            )

        # Run model estimator
        feat_array = np.asarray([features], dtype=np.float32)

        try:
            pred_id = model.predict(feat_array)[0]
            label = label_map.get(pred_id, str(pred_id))
        except Exception as e:
            return PredictionResult(
                status=PredictionState.ERROR,
                hand_count=hand_count,
                feature_count=feat_len,
                model_type=model_type,
                message=f"Model execution error: {e}",
            )

        # Handle probabilities & rejection policy
        confidence: Optional[float] = None
        proba_dict: Optional[Dict[str, float]] = None
        status = PredictionState.RECOGNIZED

        if has_proba:
            try:
                probas = model.predict_proba(feat_array)[0]
                classes = getattr(model, "classes_", list(range(len(probas))))
                proba_dict = {
                    label_map.get(cls_id, str(cls_id)): round(float(p), 4)
                    for cls_id, p in zip(classes, probas)
                }
                confidence = round(float(np.max(probas)), 4)

                # Rejection policy check
                if confidence < self.confidence_threshold:
                    status = PredictionState.UNCERTAIN
                    message = (
                        f"Uncertain prediction: '{label}' with confidence {confidence:.2f} "
                        f"(threshold: {self.confidence_threshold:.2f})"
                    )
                else:
                    message = f"Recognized {model_type} gesture: {label}"
            except Exception as e:
                # If predict_proba fails at runtime, do not fabricate numbers
                confidence = None
                proba_dict = None
                message = f"Recognized {model_type} gesture: {label} (probabilities unavailable: {e})"
        else:
            # Estimator does not support probabilities: do not fabricate confidence!
            confidence = None
            message = f"Recognized {model_type} gesture: {label} (uncalibrated estimator)"

        logger.debug(
            "[ISL Inference] Model: %s | Pred: %s | Conf: %.3f (thresh: %.2f) -> %s",
            model_type,
            label,
            confidence if confidence is not None else 0.0,
            self.confidence_threshold,
            status.value,
        )

        return PredictionResult(
            status=status,
            label=label,
            confidence=confidence,
            hand_count=hand_count,
            feature_count=feat_len,
            message=message,
            probabilities=proba_dict,
            model_type=model_type,
        )
