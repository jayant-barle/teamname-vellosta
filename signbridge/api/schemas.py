"""
Pydantic schemas for the SignBridge REST API.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class LandmarkPoint(BaseModel):
    x: float = Field(..., description="Normalized X coordinate [0.0, 1.0]")
    y: float = Field(..., description="Normalized Y coordinate [0.0, 1.0]")
    z: Optional[float] = Field(default=0.0, description="Normalized depth Z coordinate")

class PredictRequest(BaseModel):
    features: Optional[List[float]] = Field(
        default=None,
        description="Precomputed normalized feature vector (42 floats for 1-hand, 84 floats for 2-hands)",
    )
    landmarks: Optional[List[List[LandmarkPoint]]] = Field(
        default=None,
        description="Raw hands detected, each containing 21 landmark points",
    )
    confidence_threshold: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional override for rejection confidence threshold",
    )

class PredictResponse(BaseModel):
    status: str = Field(..., description="Prediction state: recognized, uncertain, no_detection, missing_model, error")
    label: Optional[str] = Field(default=None, description="Recognized character/gesture class label")
    confidence: Optional[float] = Field(default=None, description="Prediction probability if supported [0.0, 1.0]")
    hand_count: int = Field(default=0, description="Number of hands processed (0, 1, or 2)")
    feature_count: int = Field(default=0, description="Dimension of feature vector (42 or 84)")
    message: str = Field(..., description="Human-readable status or error description")
    probabilities: Optional[Dict[str, float]] = Field(default=None, description="Class probability distribution")
    model_type: Optional[str] = Field(default=None, description="'1-hand' or '2-hands'")
    latency_ms: float = Field(..., description="Inference processing latency in milliseconds")

class VocabularyResponse(BaseModel):
    one_hand: List[str] = Field(..., description="Supported classes for single-hand gestures")
    two_hands: List[str] = Field(..., description="Supported classes for two-hand gestures")
    total_classes: int = Field(..., description="Total unique recognized gestures")

class HealthResponse(BaseModel):
    status: str = Field(..., description="'healthy' or 'degraded'")
    version: str = Field(..., description="SignBridge service version")
    model_1hand_loaded: bool
    model_2hand_loaded: bool
    classes_1hand_count: int
    classes_2hand_count: int
    proba_1hand_supported: bool
    proba_2hand_supported: bool
    confidence_threshold: float

class PhraseItem(BaseModel):
    id: str
    phrase: str
    category: str
    description: str
    hands: int
    video_url: str
    sample_image: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
