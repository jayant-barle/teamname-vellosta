# 🇮🇳 SignBridge — Two-Way Indian Sign Language (ISL) Communication Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-0.1.0_MVP-blue.svg)](CHANGELOG.md)
[![Python](https://img.shields.io/badge/Python-3.11_|_3.12_|_3.13_|_3.14-blue.svg)](signbridge/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19_TypeScript-61dafb.svg)](frontend/)
[![Tests](https://img.shields.io/badge/Tests-27_Passing-brightgreen.svg)](TESTING.md)

**SignBridge** transforms the desktop Indian Sign Language recognition prototype ([nidhindaniel/sign-language-recognition-system](https://github.com/nidhindaniel/sign-language-recognition-system)) into an accessible, production-grade, two-way communication assistant connecting Deaf signers and hearing peers in real time.

---

## 🌟 Key Features

1. **Sign &rarr; Text & Speech (Deaf Communicator View):**
   - **Live Webcam Stream with Hand Landmark Overlays:** Real-time 21-keypoint MediaPipe skeleton visualization rendered directly in browser canvas.
   - **Preserved Model Inference:** Reuses the exact scikit-learn Random Forest model architecture and feature representations (42 features for 1-hand, 84 features for 2-hands).
   - **Configurable Uncertainty Rejection:** Ambiguous or low-confidence gestures are safely flagged as `uncertain` or `no_detection` rather than misclassifying signs.
   - **Sentence Builder & Debounced Accumulator:** Accumulates recognized letters/digits with manual text correction, backspace, space, clear, and clipboard copy.
   - **Browser Text-to-Speech (TTS):** Vocalizes confirmed sentences with customizable speech rates and voice selection.

2. **Speech &rarr; Verified ISL Video (Hearing Peer View):**
   - **Microphone Speech Recognition (STT):** Transcribes spoken speech into editable text in real-time.
   - **Reviewed ISL Video Library:** Curated video clips for high-frequency everyday Indian Sign Language phrases (e.g. *"Hello / Namaste"*, *"Thank You"*, *"Please"*, *"Help"*, *"Yes"*, *"No"*, *"Good Morning"*, *"Welcome"*).
   - **Fingerspelling Fallback Breakdown:** Automatically breaks down custom words and names into individual ISL hand posture cards.

3. **Two-Way Split-Screen Workstation:**
   - Single unified interface allowing a Deaf individual and a hearing peer to converse synchronously on the same screen.

---

## 🏛️ System Architecture

```
Sing Bridge/
├── models/                  # Serialized Random Forest estimators
│   ├── model.p              # Single-hand model (42 normalized features)
│   └── model_2hands.p       # Two-hands model (84 normalized features)
├── signbridge/              # Reusable Python package
│   ├── config.py            # Project paths and environment configuration
│   ├── inference/
│   │   ├── feature_extractor.py # Normalization: x - min(x), y - min(y)
│   │   └── service.py       # Decoupled inference engine & rejection policy
│   ├── api/
│   │   ├── schemas.py       # Pydantic validation schemas
│   │   ├── routes.py        # /health, /v1/vocabulary, /v1/predict, /v1/phrases
│   │   └── app.py           # FastAPI application with static dist mounts
│   └── data/
│       └── isl_phrases.json # Phrase dictionary and video metadata
├── frontend/                # React 19 + TypeScript + Vite web client
│   ├── src/                 # Components, services, and design system
│   └── public/isl_clips/    # Verified ISL demonstration video clips
├── tests/                   # Automated test suite (27 unit/regression tests)
├── collect imgs.py          # Preserved dataset collection script
├── inference_hybrid.py      # Preserved desktop OpenCV inference script
└── model training.py        # Preserved model training script
```

---

## 🔬 Mathematical Invariant & Feature Representation

To ensure **100% mathematical parity** with the original repository without breaking existing trained weights:

For any hand $h$ with 21 landmarks $\{(x_i, y_i)\}_{i=0}^{20}$:
$$\min_x = \min_{j} x_j, \quad \min_y = \min_{j} y_j$$
$$\mathbf{f}_h = [x_0 - \min_x, y_0 - \min_y, x_1 - \min_x, y_1 - \min_y, \dots, x_{20} - \min_x, y_{20} - \min_y] \in \mathbb{R}^{42}$$

- **1-Hand Model:** Vector length is 42 floating-point values.
- **2-Hands Model:** Vector length is 84 floating-point values (Hand 0 followed by Hand 1).
- **Serialization Format:** Python `pickle` containing a dictionary with keys: `'model'` (`RandomForestClassifier`), `'label_map'` (`{id: label}`), `'input_shape'`, `'accuracy'`.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11, 3.12, 3.13, or 3.14
- Node.js v18+ and npm

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/nidhindaniel/sign-language-recognition-system.git
cd "sign-language-recognition-system"

# Install Python requirements
pip install -r requirements.txt
# or: pip install fastapi uvicorn scikit-learn opencv-python mediapipe numpy pydantic pytest starlette

# Run the automated test suite (27 tests)
python -m pytest -v tests/

# Launch the FastAPI backend server
python -m uvicorn signbridge.api.app:app --host 127.0.0.1 --port 8000 --reload
```

The API interactive documentation will be available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- Vocabulary: `http://127.0.0.1:8000/v1/vocabulary`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Start local Vite development server
npm run dev
```

Open `http://localhost:5173` (or `http://127.0.0.1:8000` when running through FastAPI).

---

## 🛡️ Honest Scope & Limitations

1. **Fingerspelling vs Continuous Translation:**
   - The computer vision recognition system is designed for **isolated static ISL alphabets and digits** (fingerspelling).
   - It does **not** claim to perform full continuous grammatical sentence translation (e.g. non-manual facial markers, spatial grammar, grammatical inflections).
   - Conversational phrases (e.g. greetings, emergency requests, courtesy phrases) are supported via the reverse-direction reviewed video library.
2. **Rejection Policy:**
   - Prediction confidences below the calibrated threshold (`0.55` default) are marked as `uncertain` to prevent false positive outputs.

---

## 📜 Dataset Sources & Licenses

- **Upstream Repository:** [nidhindaniel/sign-language-recognition-system](https://github.com/nidhindaniel/sign-language-recognition-system) (MIT License).
- **Landmark Extraction:** Google MediaPipe (Apache 2.0 License).
- **Classification Engine:** scikit-learn Random Forest (BSD License).
- **SignBridge Extensions:** Released under the MIT License.
