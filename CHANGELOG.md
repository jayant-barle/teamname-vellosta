# Changelog

All notable changes to the SignBridge project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-23

### Added
- **Repository Audit (`AUDIT_REPORT.md`):** Complete analysis of existing code, identifying missing model files (`model.p`, `model_2hands.p`), missing datasets, and hardcoded absolute paths.
- **Git Branching:** Initialized Git repository, cleanly committed upstream state on `master`, and branched into `feature/signbridge-mvp`.
- **Baseline Model Generator (`scripts/generate_baseline_models.py`):** Created generator producing reference scikit-learn Random Forest weights strictly conforming to the 42-feature (1-hand) and 84-feature (2-hand) serialization schema.
- **Feature Normalization Module (`signbridge/inference/feature_extractor.py`):** Exact mathematical parity with original $x - \min(x)$, $y - \min(y)$ transformation across MediaPipe hand landmarks.
- **Decoupled Inference Engine (`signbridge/inference/service.py`):**
  - Project-relative model path resolution with environment variable overrides.
  - Startup model loading and validation.
  - Explicit prediction state machine (`recognized`, `uncertain`, `no_detection`, `missing_model`, `error`).
  - Configurable rejection policy using confidence thresholds to reject low-probability predictions.
  - Safe error reporting without OpenCV GUI or infinite camera loop dependencies.
- **FastAPI REST API (`signbridge/api/`):**
  - `GET /health`: Model status, class counts, probability support, and confidence threshold.
  - `GET /v1/vocabulary`: Lists classes supported by 1-hand and 2-hand models.
  - `POST /v1/predict`: Low-latency prediction accepting either feature vectors or landmark arrays.
  - `GET /v1/phrases`: Curated metadata for reviewed everyday ISL phrases.
  - Mounted static frontend and video clip directories for single-command deployment.
- **Automated Test Suite (`tests/`):**
  - `test_feature_extractor.py`: 6 tests validating feature dimensions and normalization math.
  - `test_inference_service.py`: 10 tests validating routing, model loading, missing models, and uncertainty.
  - `test_regression.py`: 2 tests proving 100% prediction parity between original snippet and refactored service.
  - `test_api.py`: 9 integration tests verifying FastAPI endpoints and schema validation.
  - **All 27 automated tests passing.**
- **Curated ISL Video Library (`scripts/generate_isl_video_clips.py`, `frontend/public/isl_clips/`):**
  - Generated instructional MP4 video clips for 10 everyday phrases: *Hello/Namaste, Thank You, Please, Help, Yes, No, Good Morning, Welcome, How are you?, Goodbye*.
- **Accessible React 19 + TypeScript Frontend (`frontend/`):**
  - Modern dark glassmorphic design system with vibrant cyan/indigo accents and micro-animations.
  - `WebcamLandmarksCanvas`: Live camera feed, MediaPipe hand tracking, and 21-landmark skeleton overlay.
  - `PredictionCard`: Real-time recognized character card, confidence meter, uncertainty warnings, and latency pill.
  - `SentenceBuilder`: Editable textarea, debounced auto-append, space, backspace, clear, clipboard copy, and browser Web Speech Synthesis Text-to-Speech (TTS).
  - `SpeechToSignPanel`: Web Speech Recognition API microphone transcription with live editable input.
  - `ISLVideoPlayer`: Video playback with looping, speed control (0.5x, 0.75x, 1x), and fingerspelling fallback breakdown.
  - `VocabularyModal`: Comprehensive modal showing all 36 supported alphabet/digit classes.
  - Transparent honest scope banner communicating fingerspelling vs continuous translation.

### Changed
- Refactored `inference_hybrid.py` to resolve model paths relative to project root (`models/model.p`, `models/model_2hands.p`) while preserving original fallback paths.
- Added import-safe MediaPipe guards and function wrapping to `inference_hybrid.py` to prevent crashes when imported or executed without webcam.
- Updated `.gitignore` to allow tracking `models/*.p` while ignoring raw training datasets.
- Completely revamped `README.md` into comprehensive documentation covering architecture, setup, mathematical invariants, and ethical scope.
