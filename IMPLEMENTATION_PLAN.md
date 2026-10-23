# SignBridge — Implementation Plan

**Target:** 24-Hour Hackathon MVP (v0.1.0)  
**Strategy:** Incremental enhancement preserving upstream contracts without regressions  

---

## Phase 1: Audit, Environment & Baseline Weights
- [x] Inspect existing scripts (`inference_hybrid.py`, `model training.py`, `collect imgs.py`, `README.md`, `.gitignore`).
- [x] Confirm missing weights (`C:\Users\Nidhin\model.p`, `C:\Users\Nidhin\model_2hands.p`) and missing dataset (`D:\Vs Code Projects\data`).
- [x] Initialize Git repository, commit upstream baseline, and branch to `feature/signbridge-mvp`.
- [x] Create project documentation: `AUDIT_REPORT.md`, `PRD.md`, `ARCHITECTURE.md`.
- [x] Create baseline reference weights conforming strictly to the original serialization schema (`model.p` and `model_2hands.p` with Random Forest estimators and standard ISL alphabet/digit label maps).

## Phase 2: Refactor Inference Service & Regression Tests
- [x] Create `signbridge/config.py` with relative path resolution.
- [x] Create `signbridge/inference/feature_extractor.py` implementing exact mathematical normalizations ($x - \min(x)$, $y - \min(y)$) for 1-hand (42 feats) and 2-hand (84 feats).
- [x] Create `signbridge/inference/service.py` (`SignBridgeInferenceService`):
  - Load available models once at startup.
  - Return structured dataclass/dict predictions without OpenCV window.
  - Rejection policy: explicit states (`recognized`, `uncertain`, `no_detection`, `missing_model`, `error`).
- [x] Create regression and unit test suite in `tests/`:
  - `test_feature_extractor.py`: Verify 42/84 feature dimensions and normalization math.
  - `test_inference_service.py`: Verify model prediction, missing hand handling, probability handling.
  - `test_regression.py`: Verify 100% parity against original inference logic.

## Phase 3: FastAPI Backend & API Verification
- [x] Implement Pydantic schemas in `signbridge/api/schemas.py`.
- [x] Implement endpoints in `signbridge/api/routes.py`:
  - `GET /health`
  - `GET /v1/vocabulary`
  - `POST /v1/predict`
  - `GET /v1/phrases`
- [x] Add API integration tests in `tests/test_api.py` with `httpx` / `TestClient`.

## Phase 4: React + TypeScript Frontend Development
- [x] Scaffold React + TypeScript project in `frontend/` using Vite.
- [x] Build camera preview component with start/stop controls and landmark visualization overlay.
- [x] Implement feature extraction & API client to stream frames/landmarks to `/v1/predict`.
- [x] Build Sentence Builder with debounce, space, backspace, clear, and manual editing.
- [x] Integrate Web Speech Synthesis (TTS) for vocalizing accumulated text.
- [x] Build Speech-to-Sign panel with Web Speech Recognition (STT), editable transcripts, and reviewed ISL video clip library.
- [x] Design polish: accessible high-contrast UI, clear state badges (`recognized`, `uncertain`, etc.), zero mock/fake indicators.

## Phase 5: UI & Architecture Stabilization
- [x] Complete frontend UI overhaul: Vanilla CSS design system replacing broken unstyled utilities.
- [x] Synchronized two-way conversation timeline logging with audio replay and text export.
- [x] Verified ISL video player with custom word fingerspelling breakdown.

## Phase 6: Webcam Recognition Repair & Real-Time Hardening
- [x] Investigate duplicate buttons ("Start Webcam" vs "Start Camera") and trace event calls.
- [x] Consolidate controls into single synchronized toolbar with explicit "Initializing Camera..." spinner.
- [x] Integrate `inFlightRef` network lock preventing concurrent overlapping inference requests.
- [x] Ensure comprehensive camera stream track cleanup on stop/unmount preventing resource leaks.
- [x] Implement 4-frame temporal stability voting window eliminating prediction flicker.
- [x] Implement duplicate suppression hold lock requiring 5 consecutive stable cycles (~600ms hold) before auto-appending characters.
- [x] Throttle empty prediction calls to dispatch only on transition to no hands.
- [x] Full automated test verification (27/27 passed) and production bundle build (0 errors, 0 warnings).

## Phase 7: Reference Integration & Hardening (Warlord-06/teamname-vellosta)
- [x] Detailed audit of reference repository vs local project architecture.
- [x] Integration map classifying each component (Reuse directly, Adapt, Already implemented, Not suitable).
- [x] Anatomical colored landmark rendering with glowing bones and bounding boxes (`drawLandmarks.ts`).
- [x] Mirror view toggle and skeleton overlay toggle on webcam canvas toolbar.
- [x] Client-side geometric finger analysis and conversational heuristic cues (`gestureClassifier.ts`).
- [x] Distinct visual badges separating trained ISL Random Forest predictions from geometric heuristics.
- [x] Voice Controls drawer with voice picker, speech rate slider, and auto-speak toggle in `SentenceBuilder.tsx`.
- [x] Enriched ISL phrase dictionary with authentic handshape descriptions, motion steps, and linguistic notes.
- [x] Dedicated "Motion Guide" tab and missing video fallback notice in `ISLVideoPlayer.tsx`.

