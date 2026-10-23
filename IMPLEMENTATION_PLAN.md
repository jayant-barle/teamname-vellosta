# SignBridge — Implementation Plan

**Target:** 24-Hour Hackathon MVP (v0.1.0)  
**Strategy:** Incremental enhancement preserving upstream contracts without regressions  

---

## Phase 1: Audit, Environment & Baseline Weights
- [x] Inspect existing scripts (`inference_hybrid.py`, `model training.py`, `collect imgs.py`, `README.md`, `.gitignore`).
- [x] Confirm missing weights (`C:\Users\Nidhin\model.p`, `C:\Users\Nidhin\model_2hands.p`) and missing dataset (`D:\Vs Code Projects\data`).
- [x] Initialize Git repository, commit upstream baseline, and branch to `feature/signbridge-mvp`.
- [x] Create project documentation: `AUDIT_REPORT.md`, `PRD.md`, `ARCHITECTURE.md`.
- [ ] Create baseline reference weights conforming strictly to the original serialization schema (`model.p` and `model_2hands.p` with Random Forest estimators and standard ISL alphabet/digit label maps).

## Phase 2: Refactor Inference Service & Regression Tests
- [ ] Create `signbridge/config.py` with relative path resolution.
- [ ] Create `signbridge/inference/feature_extractor.py` implementing exact mathematical normalizations ($x - \min(x)$, $y - \min(y)$) for 1-hand (42 feats) and 2-hand (84 feats).
- [ ] Create `signbridge/inference/service.py` (`SignBridgeInferenceService`):
  - Load available models once at startup.
  - Return structured dataclass/dict predictions without OpenCV window.
  - Rejection policy: explicit states (`recognized`, `uncertain`, `no_detection`, `missing_model`, `error`).
- [ ] Create regression and unit test suite in `tests/`:
  - `test_feature_extractor.py`: Verify 42/84 feature dimensions and normalization math.
  - `test_inference_service.py`: Verify model prediction, missing hand handling, probability handling.

## Phase 3: FastAPI Backend & API Verification
- [ ] Implement Pydantic schemas in `signbridge/api/schemas.py`.
- [ ] Implement endpoints in `signbridge/api/routes.py`:
  - `GET /health`
  - `GET /v1/vocabulary`
  - `POST /v1/predict`
  - `GET /v1/phrases`
- [ ] Add API integration tests in `tests/test_api.py` with `httpx` / `TestClient`.

## Phase 4: React + TypeScript Frontend Development
- [ ] Scaffold React + TypeScript project in `frontend/` using Vite.
- [ ] Build camera preview component with start/stop controls and landmark visualization overlay.
- [ ] Implement feature extraction & API client to stream frames/landmarks to `/v1/predict`.
- [ ] Build Sentence Builder with debounce, space, backspace, clear, and manual editing.
- [ ] Integrate Web Speech Synthesis (TTS) for vocalizing accumulated text.
- [ ] Build Speech-to-Sign panel with Web Speech Recognition (STT), editable transcripts, and reviewed ISL video clip library.
- [ ] Design polish: accessible high-contrast UI, clear state badges (`recognized`, `uncertain`, etc.), zero mock/fake indicators.

## Phase 5: Verification, End-to-End Testing & Handoff
- [ ] Run full test suite (`pytest`) and record real results in `TESTING.md`.
- [ ] Verify both communication directions end-to-end.
- [ ] Update `README.md`, `CHANGELOG.md`, and complete handoff documentation.
