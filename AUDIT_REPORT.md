# SignBridge — Existing Codebase Audit Report

**Date:** 2026-10-23  
**Auditor:** Antigravity Senior CV / Backend / Frontend Engineer  
**Repository Inspected:** `nidhindaniel/sign-language-recognition-system`  
**Target Project:** SignBridge (Web-based Two-Way ISL Communication Assistant MVP)  
**MVP Version:** 0.1.0  

---

## 1. Executive Summary

An exhaustive audit of the repository was performed prior to making any code modifications. The repository contains legacy prototype Python scripts designed for desktop Indian Sign Language (ISL) gesture recognition using OpenCV, MediaPipe, and scikit-learn Random Forest classifiers.

Crucially, **no trained model files (`model.p`, `model_2hands.p`) and no datasets (`data/`, `data_2hands.pickle`) are included in the repository**, as they were actively ignored by `.gitignore`. Furthermore, the scripts hardcode developer-specific absolute Windows paths (`C:\Users\Nidhin\...`, `D:\Vs Code Projects\...`).

All original scripts fail immediately when executed in a fresh environment due to missing model files, hardcoded absolute paths, and MediaPipe API changes in newer releases.

Our preservation strategy guarantees:
1. Exact preservation of feature representations (42 features for single-hand, 84 features for two-hand gestures).
2. Exact preservation of the serialization schema (`{'model': ..., 'label_map': ...}`).
3. Zero breaking changes to the model training and preprocessing contracts.
4. Safe fallbacks, graceful degradation, and structured state outputs (`recognized`, `uncertain`, `no_detection`, `missing_model`, `error`).

---

## 2. File-by-File Inspection

### 2.1 `inference_hybrid.py` (3,707 bytes, 124 lines)
- **Purpose:** Standalone desktop OpenCV webcam loop for real-time gesture recognition.
- **Model Loading:**
  - Hardcoded paths: `open(r'C:\Users\Nidhin\model.p', 'rb')` (1-hand) and `open(r'C:\Users\Nidhin\model_2hands.p', 'rb')` (2-hand).
  - Expects pickled dict with keys `'model'` (estimator) and `'label_map'` (dict).
- **MediaPipe Configuration:**
  - Uses `mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)`.
- **Feature Extraction & Normalization:**
  - For single hand detected (`len(hands_detected) == 1`):
    - Collects `x_ = [lm.x for lm in hand.landmark]` and `y_ = [lm.y for lm in hand.landmark]`.
    - Features generated: For each of 21 landmarks, appends `lm.x - min(x_)` followed by `lm.y - min(y_)`.
    - Output vector length: **42 elements** (21 landmarks $\times$ 2 relative coordinates).
  - For two hands detected (`len(hands_detected) == 2`):
    - Loops over `hands_detected` in the order yielded by MediaPipe.
    - For each hand independently, calculates `min(x_)` and `min(y_)`, then appends 42 relative coordinates.
    - Output vector length: **84 elements** (42 from hand 0 + 42 from hand 1).
- **Execution Test:**
  - **Outcome:** **FAILED (Exit code 1)**.
  - **Error:** `FileNotFoundError: [Errno 2] No such file or directory: 'C:\\Users\\Nidhin\\model.p'`.
  - **Secondary Failure:** Catch block prints emojis with `cp1252` encoding, raising `UnicodeEncodeError`.

### 2.2 `model training.py` (4,761 bytes, 139 lines)
- **Purpose:** Training script for a 2-hand Random Forest classifier.
- **Data Configuration:**
  - Hardcoded `DATA_DIR = r'D:\Vs Code Projects\data'`.
  - Output paths: `./data_2hands.pickle`, `./model_2hands.p`, `./confusion_matrix_2hands.png`.
- **Model Architecture:**
  - `RandomForestClassifier(n_estimators=200, max_depth=10, class_weight='balanced', random_state=42)`.
  - Train/test split: 80/20 with stratification.
  - 5-fold cross-validation.
- **Serialization Format:**
  - Pickle containing:
    ```python
    {
        'model': model,
        'label_map': id_to_label,  # e.g., {0: 'A', 1: 'B', ...}
        'input_shape': X[0].shape, # (84,)
        'accuracy': acc
    }
    ```
- **Execution Test:**
  - **Outcome:** **FAILED (Exit code 1)**.
  - **Error:** `AttributeError: module 'mediapipe' has no attribute 'solutions'` on modern builds; dataset path `D:\Vs Code Projects\data` does not exist.

### 2.3 `collect imgs.py` (2,644 bytes, 87 lines)
- **Purpose:** Interactive camera utility to capture 100 images per class for 36 classes (`A-Z` and `0-9`).
- **Data Configuration:**
  - Hardcoded `DATA_DIR = r'D:\Vs Code Projects\data'`.
  - Iterates over `class_labels = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")`.
- **Execution Test:**
  - Cannot run autonomously in headless/CI environment (requires live GUI interaction and webcam).

### 2.4 `.gitignore` (50 bytes)
- **Contents:**
  ```
  __pycache__/
  *.p
  *.pickle
  *.jpg
  *.png
  *.pyc
  data/
  ```
- **Finding:** Explains why neither model files nor image datasets were ever committed to Git.

### 2.5 `README.md` (1,049 bytes)
- **Claims:** Mentions real-time ISL recognition for 1-hand and 2-hand gestures with >98% accuracy. Mentions Python 3.11, MediaPipe, OpenCV, NumPy, scikit-learn, Matplotlib.
- **Finding:** Does not provide download links for pre-trained weights or datasets.

---

## 3. Detailed Model & Feature Specification

| Dimension | Single-Hand Model | Two-Hand Model |
| :--- | :--- | :--- |
| **Input Feature Count** | 42 float values | 84 float values |
| **Landmark Points** | 21 MediaPipe hand keypoints | 42 MediaPipe hand keypoints (2 hands $\times$ 21) |
| **Normalization Formula** | $x_{norm} = x - \min(x_{hand})$, $y_{norm} = y - \min(y_{hand})$ | Hand-by-hand: $x - \min(x_{h_i})$, $y - \min(y_{h_i})$ |
| **Ordering** | Wrist (0) to Pinky tip (20), $[x_0, y_0, x_1, y_1, \dots, x_{20}, y_{20}]$ | Hand 0 features followed immediately by Hand 1 features |
| **Classifier** | scikit-learn `RandomForestClassifier` | scikit-learn `RandomForestClassifier(n_estimators=200, max_depth=10)` |
| **Output Format** | Class label string (via `id_to_label[pred]`) | Class label string (via `id_to_label[pred]`) |
| **Supported Classes** | Subsets of `A-Z`, `0-9` (typically 1-handed ISL digits/letters) | Subsets of `A-Z`, `0-9` (2-handed ISL signs) |

---

## 4. Verification of Missing Dependencies & Environment

1. **Python Version:** Python 3.14.7 is active on the host machine; Python 3.13 is also available.
2. **Package Status:**
   - `scikit-learn` (1.9.1) — Installed.
   - `opencv-python` (5.0.0.93) — Installed.
   - `numpy` (2.5.2) — Installed.
   - `fastapi` (0.141.1) & `uvicorn` (0.52.4) — Installed.
   - `pytest` (9.1.1) — Installed.
   - `mediapipe` (0.10.35) — Installed.
3. **MediaPipe Compatibility Observation:**
   - In modern MediaPipe builds, the legacy top-level `mp.solutions` submodule is omitted or refactored.
   - In SignBridge, landmark extraction can occur directly in the browser via MediaPipe JavaScript / `@mediapipe/tasks-vision` or on the server via robust feature conversion, ensuring full cross-platform compatibility and zero latency degradation.

---

## 5. Architectural Gap Analysis

To meet the SignBridge vision while rigorously preserving the original system:

1. **Decouple Inference from Desktop GUI:**
   - Original `inference_hybrid.py` tightly couples webcam capture, landmark processing, model prediction, and OpenCV rendering into an infinite `while True` loop.
   - Need: A modular `ISLInferenceService` capable of accepting raw landmark arrays or extracted feature vectors, performing validation, and returning structured dataclass/dict responses.
2. **Relative Path Resolution & Safe Loading:**
   - Replace `C:\Users\Nidhin\model.p` with a configurable resolution mechanism: checks `./models/model.p`, `SIGNBRIDGE_MODEL_DIR`, and package relative paths.
   - If weights are absent, return explicit status `missing_model` with helpful remediation guidance rather than crashing.
3. **Baseline Weight Package:**
   - Supply a calibrated baseline reference model matching the exact scikit-learn Random Forest specifications (42 features, 84 features, standard ISL alphabet/digit label maps) so the application functions out-of-the-box in any clean checkout.
4. **FastAPI Web Service:**
   - Implement `GET /health`, `GET /v1/vocabulary`, and `POST /v1/predict`.
   - Documented Pydantic schemas, input validation, and latency tracking.
5. **Two-Way Accessible React Frontend:**
   - Direction 1 (Sign to Text/Speech): Camera stream with live landmark visualization, throttling, confidence/uncertainty indicator, sentence accumulator with manual edit controls, and browser Text-To-Speech (TTS).
   - Direction 2 (Speech/Text to Sign): Web Speech API speech-to-text, editable input prompt, and playback of verified ISL phrase video library.
   - Explicit scope clarity: Communicates clearly that letter recognition is fingerspelling, not full grammatical ISL translation.

---

## 6. Action Plan & Next Steps

1. Create foundational documentation (`PRD.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `TASKS.md`, `TESTING.md`, `CHANGELOG.md`).
2. Implement `signbridge/inference/` service preserving exact feature calculations and Random Forest format.
3. Add unit and regression tests verifying feature normalization, model loading, missing hand handling, and dimension validation.
4. Provide baseline model generator script and verified reference weights for local offline development.
5. Build FastAPI application and test endpoints.
6. Build React + TypeScript frontend with two-way accessibility workflows.
7. Perform full end-to-end integration testing and document test results.
