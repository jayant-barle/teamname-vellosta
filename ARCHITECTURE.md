# SignBridge — System Architecture Document

**Version:** 0.1.0  
**Authors:** Senior Computer Vision & Systems Engineering  
**Target:** Two-Way Indian Sign Language (ISL) Assistant  

---

## 1. System Overview

SignBridge bridges ISL gestural communication and spoken/written language through a modular, decoupled architecture consisting of an accessible React frontend, a FastAPI inference engine, and a preserved scikit-learn model inference service.

```mermaid
graph TD
    subgraph Browser ["Frontend (React + TypeScript)"]
        Cam[Webcam Video Feed] --> MP[MediaPipe Hand Landmarker]
        MP --> Overlay[Landmark Skeleton Overlay Canvas]
        MP --> FeatExtract[Feature Vector Normalization]
        FeatExtract --> ClientAPI[HTTP Client /v1/predict]
        
        ClientAPI --> StateMachine[Prediction State Manager]
        StateMachine --> WordAccumulator[Sentence Builder]
        WordAccumulator --> TTS[Web Speech Synthesis Audio]
        
        Mic[Microphone] --> STT[Web Speech Recognition API]
        STT --> TranscriptEdit[Transcript Editor]
        TranscriptEdit --> VideoLibrary[Reviewed ISL Video Player]
    end

    subgraph Backend ["Backend (FastAPI Engine)"]
        ClientAPI --> Endpoint["POST /v1/predict"]
        Endpoint --> Validator[Pydantic Request Validator]
        Validator --> InferenceSvc[Inference Service]
        InferenceSvc --> Gate[Model Router: 1-Hand vs 2-Hand]
        Gate --> Model1[1-Hand RF Model (42 feats)]
        Gate --> Model2[2-Hand RF Model (84 feats)]
        Model1 --> UncertaintyGate[Uncertainty & Confidence Policy]
        Model2 --> UncertaintyGate
        UncertaintyGate --> ResFormatter[Structured Response Formatter]
        ResFormatter --> Endpoint
    end
```

---

## 2. Core Subsystems

### 2.1 Preserved Inference Core (`signbridge/inference/`)
- **`service.py` (`SignBridgeInferenceService`):**
  - Encapsulates model loading and lifecycle management.
  - Resolves models using relative paths (`./models/model.p`, `./models/model_2hands.p`) with environment overrides.
  - Exposes prediction methods accepting either:
    - Raw landmarks `List[Dict[str, float]]` (each with `x`, `y`, `z`)
    - Pre-extracted normalized feature vectors (`List[float]` of length 42 or 84).
- **Mathematical Invariant:**
  - For hand $h$ with 21 landmarks $\{(x_i, y_i)\}_{i=0}^{20}$:
    $$\min_x = \min_{j} x_j, \quad \min_y = \min_{j} y_j$$
    $$\mathbf{f}_h = [x_0 - \min_x, y_0 - \min_y, x_1 - \min_x, y_1 - \min_y, \dots, x_{20} - \min_x, y_{20} - \min_y]$$
  - Single-hand feature vector: $\mathbf{F}_{1} = \mathbf{f}_{h_0} \in \mathbb{R}^{42}$
  - Two-hand feature vector: $\mathbf{F}_{2} = [\mathbf{f}_{h_0}, \mathbf{f}_{h_1}] \in \mathbb{R}^{84}$
  - **Identical to upstream `inference_hybrid.py` lines 72-76 and 93-97.**

### 2.2 Rejection Policy & Uncertainty Handling
- If the model estimator implements `predict_proba`:
  - Compute maximum probability $p_{max} = \max_c P(y = c \mid \mathbf{x})$.
  - If $p_{max} < \tau_{confidence}$ (configurable, default $0.55$), classification state is marked as `uncertain`.
- If `predict_proba` is not supported or classes lack calibration:
  - Do not invent artificial confidence numbers. Report raw prediction with explicit calibration disclaimer.
- Missing hands or invalid landmark counts produce `no_detection` or `error` with human-readable messaging.

### 2.3 Backend API (`signbridge/api/`)
- Built with FastAPI for high throughput and low overhead:
  - `GET /health`: Operational status, loaded models, estimator capabilities.
  - `GET /v1/vocabulary`: Lists classes supported by 1-hand and 2-hand models.
  - `POST /v1/predict`: Accepts features or landmarks; returns prediction status, label, confidence, and message.
  - `GET /v1/phrases`: Metadata for the verified ISL video clip library.

### 2.4 Frontend Application (`frontend/`)
- Single responsive application featuring two primary interaction modes and conversation timeline:
  1. **Sign $\rightarrow$ Text & Speech:** Live webcam stream with anatomical finger skeleton coloring (`drawLandmarks.ts`), viewport controls (Mirror view toggle, Skeleton visibility toggle), real-time model prediction feedback, dual-layer conversational heuristic reporting (`gestureClassifier.ts`), editable sentence builder with auto-append duplicate suppression hold lock, and expandable Voice Controls drawer (`useSpeechSynthesis.ts`).
  2. **Speech $\rightarrow$ Sign Video:** Microphone recording (Web Speech Recognition STT), editable transcript box, smart phrase matcher, reviewed ISL video player with speed controls, loop, and interactive step-by-step motion & linguistic guide tabs (`ISLVideoPlayer.tsx`).
  3. **Two-Way Conversation Timeline:** Synchronized log of communicative turns between Deaf signer and hearing peer with audio replay and text export (`ConversationHistory.tsx`).

---

## 3. Directory Layout

```
Sing Bridge/
├── .gitignore
├── README.md
├── PRD.md
├── ARCHITECTURE.md
├── IMPLEMENTATION_PLAN.md
├── TASKS.md
├── TESTING.md
├── CHANGELOG.md
├── AUDIT_REPORT.md
│
├── collect imgs.py          # Original script preserved
├── inference_hybrid.py      # Original script preserved
├── model training.py        # Original script preserved
│
├── models/                  # Project-relative model storage
│   ├── model.p              # 1-hand Random Forest model
│   └── model_2hands.p       # 2-hand Random Forest model
│
├── signbridge/              # Reusable Python package
│   ├── __init__.py
│   ├── config.py            # Environment and path settings
│   ├── inference/
│   │   ├── __init__.py
│   │   ├── feature_extractor.py # Normalization invariants
│   │   └── service.py       # Decoupled prediction service
│   ├── api/
│   │   ├── __init__.py
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── app.py           # FastAPI application
│   │   └── routes.py        # API route handlers
│   └── data/
│       └── isl_phrases.json # Phrase dictionary and video metadata
│
├── tests/                   # Automated test suite
│   ├── test_feature_extractor.py
│   ├── test_inference_service.py
│   ├── test_api.py
│   └── test_regression.py
│
└── frontend/                # React + TypeScript web client
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── SignToSpeechPanel.tsx
    │   │   ├── SpeechToSignPanel.tsx
    │   │   ├── WebcamLandmarksCanvas.tsx
    │   │   ├── SentenceBuilder.tsx
    │   │   └── ISLVideoPlayer.tsx
    │   └── services/
    │       └── apiClient.ts
    └── public/
        └── isl_clips/       # Verified ISL reference clips
```
