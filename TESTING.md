# SignBridge — Testing & Validation Report

**Version:** 0.1.0  
**Testing Framework:** `pytest` (Backend) + TypeScript TypeCheck / Vitest (Frontend)  
**Standard:** Never fabricate test results; record actual commands, exit codes, and output.

---

## 1. Test Strategy & Acceptance Matrix

| Test Suite | Purpose | Target Criteria | Status |
| :--- | :--- | :--- | :--- |
| **Audit Verification** | Validate failure modes of upstream scripts | Record exact exceptions | **VERIFIED** |
| **Feature Extraction Tests** | Verify 42/84 feature dimensions and normalization math | 100% mathematical parity with upstream | Pending |
| **Inference Service Tests** | Verify 1-hand, 2-hand routing, missing models, rejection | Safe failure and exact schema return | Pending |
| **API Endpoint Tests** | Validate `/health`, `/v1/vocabulary`, `/v1/predict` | HTTP status codes and schema conformance | Pending |
| **Regression Tests** | Compare extracted features with upstream logic | Identical predictions on matching vectors | Pending |
| **Frontend E2E Tests** | Test camera start/stop, TTS, STT, and video playback | Zero runtime console errors | Pending |

---

## 2. Baseline Audit Test Execution (Real Outcomes)

### Test A1: Upstream `inference_hybrid.py`
- **Command:** `python inference_hybrid.py`
- **Exit Code:** `1`
- **Outcome:** `FileNotFoundError: [Errno 2] No such file or directory: 'C:\\Users\\Nidhin\\model.p'` followed by `UnicodeEncodeError: 'charmap'` in Windows terminal.
- **Analysis:** Demonstrates critical dependency on hardcoded local paths and lack of relative path handling.

### Test A2: Upstream `model training.py`
- **Command:** `python "model training.py"`
- **Exit Code:** `1`
- **Outcome:** `AttributeError: module 'mediapipe' has no attribute 'solutions'` on modern builds; hardcoded `D:\Vs Code Projects\data` absent.
- **Analysis:** Demonstrates breaking change in MediaPipe packaging and missing dataset.

---

## 3. Automated Test Execution Results

*(To be populated with actual command runs during Phase 2 and Phase 3)*
