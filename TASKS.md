# SignBridge — Task Tracker

**Version:** 0.1.0  
**Current Sprint:** Hackathon MVP (24 Hours)  
**Status:** All Core Tasks Completed & Verified  

---

## Task List

- [x] **TASK-01:** Inspect repository files and record audit findings (`AUDIT_REPORT.md`).
- [x] **TASK-02:** Initialize Git repository and create `feature/signbridge-mvp` branch.
- [x] **TASK-03:** Author core documentation (`PRD.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `TASKS.md`).
- [x] **TASK-04:** Provide baseline model generation utility & reference weights for 1-hand (42 feats) and 2-hand (84 feats) models (`scripts/generate_baseline_models.py`, `models/model.p`, `models/model_2hands.p`).
- [x] **TASK-05:** Implement `signbridge/config.py` and `signbridge/inference/feature_extractor.py` preserving normalization invariants.
- [x] **TASK-06:** Implement `signbridge/inference/service.py` with relative path resolution, rejection policy, and uncertainty logic.
- [x] **TASK-07:** Implement unit tests for feature extraction and inference service (`tests/test_feature_extractor.py`, `tests/test_inference_service.py`).
- [x] **TASK-08:** Implement FastAPI application, schemas, and routes (`signbridge/api/app.py`, `routes.py`, `schemas.py`).
- [x] **TASK-09:** Implement API tests (`tests/test_api.py`) and verify all endpoints (`/health`, `/v1/vocabulary`, `/v1/predict`, `/v1/phrases`).
- [x] **TASK-10:** Scaffold React + TypeScript frontend (`frontend/`) with Vite.
- [x] **TASK-11:** Implement webcam capture, canvas skeleton overlay, and live MediaPipe landmark extraction (`WebcamLandmarksCanvas.tsx`).
- [x] **TASK-12:** Connect frontend to `/v1/predict`, implementing state badges (`recognized`, `uncertain`, `no_detection`, `error`) (`PredictionCard.tsx`).
- [x] **TASK-13:** Implement Sentence Builder panel with manual text editing and browser Text-To-Speech (TTS) (`SentenceBuilder.tsx`).
- [x] **TASK-14:** Implement Speech-To-Text (STT) panel with editable transcripts and reviewed ISL video library playback (`SpeechToSignPanel.tsx`, `ISLVideoPlayer.tsx`, `scripts/generate_isl_video_clips.py`).
- [x] **TASK-15:** Run end-to-end verification and compile actual test outputs in `TESTING.md`.
- [x] **TASK-16:** Update `README.md` and `CHANGELOG.md` with usage instructions, limitations, and changelog.
- [x] **TASK-17:** Audit duplicate camera controls ("Start Webcam" vs "Start Camera") and trace event handlers to root cause.
- [x] **TASK-18:** Consolidate camera controls into single synchronized state machine (`idle`, `initializing`, `no_hand`, `detecting`, `recognized`, `uncertain`, `unavailable`) with explicit loading spinner.
- [x] **TASK-19:** Implement `inFlightRef` network lock preventing concurrent overlapping `/v1/predict` requests.
- [x] **TASK-20:** Ensure camera stream track disposal on stop and unmount to prevent resource leaks.
- [x] **TASK-21:** Implement 4-frame temporal stability voting window to eliminate prediction flicker.
- [x] **TASK-22:** Implement duplicate suppression lock requiring 5 consecutive stable cycles (~600ms hold) before auto-appending, preventing repeated letter spam while holding an ISL gesture.
- [x] **TASK-23:** Inspect reference implementation (Warlord-06/teamname-vellosta) and generate integration map across components.
- [x] **TASK-24:** Adapt anatomical finger landmark coloring, glowing joints, and bounding box pills (`drawLandmarks.ts`, `WebcamLandmarksCanvas.tsx`).
- [x] **TASK-25:** Add mirror view toggle and skeleton overlay toggle controls to webcam toolbar (`WebcamLandmarksCanvas.tsx`).
- [x] **TASK-26:** Implement client-side geometric hand analyzer and conversational heuristic detection (`gestureClassifier.ts`), maintaining strict separation from trained ISL model.
- [x] **TASK-27:** Integrate Voice Controls drawer into `SentenceBuilder.tsx` and step-by-step Motion Guide tabs into `ISLVideoPlayer.tsx`.

