"""
Unit tests for SignBridgeInferenceService.
Tests relative model loading, feature validation, 1-hand/2-hand routing,
and uncertainty rejection policy.
"""

from pathlib import Path
import pytest
from signbridge.inference.service import (
    SignBridgeInferenceService,
    PredictionState,
)
from signbridge.config import DEFAULT_1HAND_MODEL_PATH, DEFAULT_2HAND_MODEL_PATH

@pytest.fixture
def service():
    return SignBridgeInferenceService(
        model_1hand_path=DEFAULT_1HAND_MODEL_PATH,
        model_2hand_path=DEFAULT_2HAND_MODEL_PATH,
        confidence_threshold=0.6,
    )

def test_service_initialization(service):
    """Verify models are loaded from project-relative paths without errors."""
    assert service.is_1hand_available is True
    assert service.is_2hand_available is True
    assert len(service.label_map_1hand) > 0
    assert len(service.label_map_2hand) > 0

def test_vocabulary_endpoint(service):
    vocab = service.get_vocabulary()
    assert "one_hand" in vocab
    assert "two_hands" in vocab
    assert len(vocab["one_hand"]) == 12
    assert len(vocab["two_hands"]) == 24
    assert "C" in vocab["one_hand"]
    assert "A" in vocab["two_hands"]

def test_one_hand_prediction_success(service):
    """Predicting with 42 features routes to 1-hand model."""
    features = [0.0] * 42
    result = service.predict(features=features)
    assert result.status in (PredictionState.RECOGNIZED, PredictionState.UNCERTAIN)
    assert result.model_type == "1-hand"
    assert result.hand_count == 1
    assert result.feature_count == 42
    assert result.label is not None
    assert result.confidence is not None

def test_two_hands_prediction_success(service):
    """Predicting with 84 features routes to 2-hand model."""
    features = [0.0] * 84
    result = service.predict(features=features)
    assert result.status in (PredictionState.RECOGNIZED, PredictionState.UNCERTAIN)
    assert result.model_type == "2-hands"
    assert result.hand_count == 2
    assert result.feature_count == 84
    assert result.label is not None
    assert result.confidence is not None

def test_invalid_feature_length_returns_error(service):
    """Invalid dimension like 50 floats returns ERROR state."""
    features = [0.0] * 50
    result = service.predict(features=features)
    assert result.status == PredictionState.ERROR
    assert "Invalid feature vector length: 50" in result.message
    assert result.label is None

def test_missing_input_returns_no_detection(service):
    result = service.predict()
    assert result.status == PredictionState.NO_DETECTION
    assert "No features or landmarks provided" in result.message

def test_empty_landmarks_returns_no_detection(service):
    result = service.predict(landmarks=[])
    assert result.status == PredictionState.NO_DETECTION
    assert "No hands detected" in result.message

def test_raw_landmarks_extraction_and_prediction(service):
    """Providing raw landmark dicts extracts features and produces valid prediction."""
    single_hand_landmarks = [[{"x": float(i * 0.01), "y": float(i * 0.02)} for i in range(21)]]
    result = service.predict(landmarks=single_hand_landmarks)
    assert result.status in (PredictionState.RECOGNIZED, PredictionState.UNCERTAIN)
    assert result.hand_count == 1
    assert result.feature_count == 42
    assert result.model_type == "1-hand"

def test_missing_model_file_fails_safely():
    """Service initialized with non-existent model paths reports MISSING_MODEL."""
    non_existent = Path("models/non_existent_model.p")
    srv = SignBridgeInferenceService(
        model_1hand_path=non_existent,
        model_2hand_path=non_existent,
    )
    assert srv.is_1hand_available is False
    assert srv.is_2hand_available is False
    
    res = srv.predict(features=[0.0] * 42)
    assert res.status == PredictionState.MISSING_MODEL
    assert "Model file not found" in res.message

def test_uncertainty_threshold_trigger():
    """Setting confidence threshold to 1.0 forces predictions to UNCERTAIN state."""
    strict_service = SignBridgeInferenceService(
        model_1hand_path=DEFAULT_1HAND_MODEL_PATH,
        model_2hand_path=DEFAULT_2HAND_MODEL_PATH,
        confidence_threshold=1.0,  # Impossible to meet 1.0 strictly
    )
    result = strict_service.predict(features=[0.0] * 42)
    assert result.status == PredictionState.UNCERTAIN
    assert "Uncertain prediction" in result.message
