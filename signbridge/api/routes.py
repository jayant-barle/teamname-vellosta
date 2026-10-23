"""
FastAPI route handlers for SignBridge API.
"""

import json
import time
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from signbridge import __version__
from signbridge.config import settings, PACKAGE_DIR
from signbridge.inference.service import SignBridgeInferenceService, PredictionState
from signbridge.api.schemas import (
    PredictRequest,
    PredictResponse,
    VocabularyResponse,
    HealthResponse,
    PhraseItem,
)

router = APIRouter()

# Global inference service instance loaded once at startup
_service_instance: SignBridgeInferenceService | None = None

def get_inference_service() -> SignBridgeInferenceService:
    global _service_instance
    if _service_instance is None:
        _service_instance = SignBridgeInferenceService()
    return _service_instance

@router.get("/health", response_model=HealthResponse, tags=["System"])
def get_health(service: SignBridgeInferenceService = Depends(get_inference_service)):
    """Health and model readiness check."""
    is_healthy = service.is_1hand_available or service.is_2hand_available
    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
        version=__version__,
        model_1hand_loaded=service.is_1hand_available,
        model_2hand_loaded=service.is_2hand_available,
        classes_1hand_count=len(service.label_map_1hand),
        classes_2hand_count=len(service.label_map_2hand),
        proba_1hand_supported=service.has_proba_1hand,
        proba_2hand_supported=service.has_proba_2hand,
        confidence_threshold=service.confidence_threshold,
    )

@router.get("/v1/vocabulary", response_model=VocabularyResponse, tags=["Inference"])
def get_vocabulary(service: SignBridgeInferenceService = Depends(get_inference_service)):
    """Lists registered gesture classes for 1-hand and 2-hand models."""
    vocab = service.get_vocabulary()
    all_classes = set(vocab["one_hand"]).union(set(vocab["two_hands"]))
    return VocabularyResponse(
        one_hand=vocab["one_hand"],
        two_hands=vocab["two_hands"],
        total_classes=len(all_classes),
    )

@router.post("/v1/predict", response_model=PredictResponse, tags=["Inference"])
def predict_gesture(
    req: PredictRequest,
    service: SignBridgeInferenceService = Depends(get_inference_service),
):
    """
    Executes gesture inference using the pre-loaded scikit-learn models.
    Accepts either precomputed features or raw MediaPipe landmark points.
    Applies strict confidence rejection policy.
    """
    start_time = time.perf_counter()

    # Process landmarks if provided
    landmarks_input = None
    if req.landmarks is not None:
        landmarks_input = [
            [{"x": pt.x, "y": pt.y, "z": pt.z} for pt in hand]
            for hand in req.landmarks
        ]

    # Save original threshold if overridden for this request
    orig_threshold = service.confidence_threshold
    if req.confidence_threshold is not None:
        service.confidence_threshold = req.confidence_threshold

    try:
        result = service.predict(
            features=req.features,
            landmarks=landmarks_input,
        )
    finally:
        if req.confidence_threshold is not None:
            service.confidence_threshold = orig_threshold

    latency = round((time.perf_counter() - start_time) * 1000.0, 2)

    return PredictResponse(
        status=result.status.value if isinstance(result.status, PredictionState) else str(result.status),
        label=result.label,
        confidence=result.confidence,
        hand_count=result.hand_count,
        feature_count=result.feature_count,
        message=result.message,
        probabilities=result.probabilities,
        model_type=result.model_type,
        latency_ms=latency,
    )

@router.get("/v1/phrases", response_model=List[PhraseItem], tags=["Reverse Communication"])
def get_reviewed_phrases():
    """Returns curated ISL everyday phrases and reference video clip metadata."""
    phrases_file = PACKAGE_DIR / "data" / "isl_phrases.json"
    if not phrases_file.exists():
        raise HTTPException(status_code=404, detail="Phrase dictionary file not found")
    
    with open(phrases_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data
