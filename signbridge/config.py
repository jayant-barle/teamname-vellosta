"""
Configuration and path management for SignBridge.
Resolves models and assets relative to the project root with environment overrides.
"""

import os
from pathlib import Path
from pydantic import BaseModel, Field

# Project Root: Directory containing signbridge package
PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parent

# Relative path defaults
DEFAULT_MODELS_DIR = PROJECT_ROOT / "models"
DEFAULT_1HAND_MODEL_PATH = DEFAULT_MODELS_DIR / "model.p"
DEFAULT_2HAND_MODEL_PATH = DEFAULT_MODELS_DIR / "model_2hands.p"
DEFAULT_DATA_DIR = PROJECT_ROOT / "data"

class Settings(BaseModel):
    app_name: str = "SignBridge API"
    app_version: str = "0.1.0"
    debug: bool = Field(default_factory=lambda: os.getenv("SIGNBRIDGE_DEBUG", "false").lower() == "true")
    
    # Model Paths (resolved relative to project root)
    model_1hand_path: Path = Field(
        default_factory=lambda: Path(os.getenv("SIGNBRIDGE_1HAND_MODEL", str(DEFAULT_1HAND_MODEL_PATH)))
    )
    model_2hand_path: Path = Field(
        default_factory=lambda: Path(os.getenv("SIGNBRIDGE_2HAND_MODEL", str(DEFAULT_2HAND_MODEL_PATH)))
    )
    
    # Inference & Uncertainty
    confidence_threshold: float = Field(
        default_factory=lambda: float(os.getenv("SIGNBRIDGE_CONFIDENCE_THRESHOLD", "0.25"))
    )
    
    # Host & Port
    host: str = Field(default_factory=lambda: os.getenv("SIGNBRIDGE_HOST", "127.0.0.1"))
    port: int = Field(default_factory=lambda: int(os.getenv("SIGNBRIDGE_PORT", "8000")))

settings = Settings()
