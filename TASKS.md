# SignBridge — Task Tracker

**Version:** 0.1.0  
**Current Sprint:** Hackathon MVP (24 Hours)  

---

## Task List

- [x] **TASK-01:** Inspect repository files and record audit findings (`AUDIT_REPORT.md`).
- [x] **TASK-02:** Initialize Git repository and create `feature/signbridge-mvp` branch.
- [x] **TASK-03:** Author core documentation (`PRD.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `TASKS.md`).
- [ ] **TASK-04:** Provide baseline model generation utility & reference weights for 1-hand (42 feats) and 2-hand (84 feats) models.
- [ ] **TASK-05:** Implement `signbridge/config.py` and `signbridge/inference/feature_extractor.py`.
- [ ] **TASK-06:** Implement `signbridge/inference/service.py` with relative path resolution, rejection policy, and uncertainty logic.
- [ ] **TASK-07:** Implement unit tests for feature extraction and inference service (`tests/test_feature_extractor.py`, `tests/test_inference_service.py`).
- [ ] **TASK-08:** Implement FastAPI application, schemas, and routes (`signbridge/api/app.py`, `routes.py`, `schemas.py`).
- [ ] **TASK-09:** Implement API tests (`tests/test_api.py`) and verify all endpoints (`/health`, `/v1/vocabulary`, `/v1/predict`, `/v1/phrases`).
- [ ] **TASK-10:** Scaffold React + TypeScript frontend (`frontend/`) with Vite.
- [ ] **TASK-11:** Implement webcam capture, canvas skeleton overlay, and live MediaPipe landmark extraction.
- [ ] **TASK-12:** Connect frontend to `/v1/predict`, implementing state badges (`recognized`, `uncertain`, `no_detection`, `error`).
- [ ] **TASK-13:** Implement Sentence Builder panel with manual text editing and browser Text-To-Speech (TTS).
- [ ] **TASK-14:** Implement Speech-To-Text (STT) panel with editable transcripts and reviewed ISL video library playback.
- [ ] **TASK-15:** Run end-to-end verification and compile actual test outputs in `TESTING.md`.
- [ ] **TASK-16:** Update `README.md` and `CHANGELOG.md` with usage instructions, limitations, and changelog.
