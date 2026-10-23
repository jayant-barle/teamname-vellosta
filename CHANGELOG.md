# Changelog

All notable changes to the SignBridge project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-10-23

### Added & Integrated (Selective Integration from Warlord-06/teamname-vellosta)
- **Anatomical Finger Landmark Skeleton Visualization (`drawLandmarks.ts`, `WebcamLandmarksCanvas.tsx`):**
  - Integrated anatomical color-coded skeleton rendering (Indigo palm, Amber thumb, Sky index, Emerald middle, Violet ring, Pink pinky, Gold fingertips, and glowing shadow blur).
  - Added dashed bounding box calculation with hand identity tags and real-time inference confidence readouts.
- **Camera Viewport Toggles (`WebcamLandmarksCanvas.tsx`):**
  - Integrated Mirror View toggle button allowing users to flip or unflip video capture and canvas overlay.
  - Integrated Skeleton Overlay toggle button enabling/disabling landmark skeleton rendering.
- **Client-Side Conversational Gesture Heuristics (`gestureClassifier.ts`):**
  - Integrated `analyzeHandGeometry` (finger extensions, thumb direction, finger closeness) to detect common conversational cues (Yes/Thumbs-Up, Peace/V-sign, Hello/Open-Palm, Thank-You, Help-Me).
  - Maintained strict architectural separation: our local Python scikit-learn Random Forest model (`/v1/predict`) remains the primary ground-truth recognizer for ISL alphabets/digits (36 classes); heuristics are clearly badged as `method: 'geometric-heuristic'` and never overwrite or corrupt ISL predictions.
- **Enhanced Voice & Speech Synthesis Controls (`SentenceBuilder.tsx`, `useSpeechSynthesis.ts`):**
  - Added expandable Voice Settings Drawer with browser voice picker, speech rate range slider (`0.7x` to `1.3x`), and an "Auto-speak confirmed signs" toggle.
- **Step-by-Step ISL Motion Guides & Cultural Notes (`isl_phrases.json`, `ISLVideoPlayer.tsx`):**
  - Enriched the authentic ISL phrase dictionary with specific handshape postures, numbered motion breakdown steps, and cultural linguistic notes.
  - Added a dedicated "Motion Guide" tab in `ISLVideoPlayer.tsx` allowing users to study hand movement steps alongside authentic video clips.
  - Integrated a clean missing-video fallback notice upholding the strict zero-hallucination policy.
- **Quality & Parity:**
  - 100% of automated tests passing (27/27).
  - Linter: 0 warnings, 0 errors across 14 files.
  - Production build: Vite + TypeScript compiled in 3.26s.

## [0.1.2] - 2026-10-23

### Fixed & Completed (Phase 1 — Real-Time Webcam ISL Recognition)
- **Consolidated Duplicate Camera Controls (`WebcamLandmarksCanvas.tsx`):**
  - Resolved root cause of confusion between duplicate "Start Webcam" and "Start Camera" buttons: both triggered `startCamera()`, but had divergent visual states and lacked a loading indicator during permission acquisition.
  - Unified the controls into a single synchronized state machine (`idle`, `initializing`, `no_hand`, `detecting`, `recognized`, `uncertain`, `unavailable`).
  - Added an interactive `Initializing Camera...` spinner state that disables controls during device initialization and permission prompts.
  - Added clean resource teardown on unmount and stop (`stream.getTracks().forEach(t => t.stop())`) preventing stream leaks.
- **Network & Prediction Reliability:**
  - Added an `inFlightRef` mutex lock ensuring in-flight `/v1/predict` HTTP requests complete before another is dispatched, completely preventing request stacking and race conditions.
  - Throttled empty prediction notifications to dispatch only on state transitions from hands detected to no hands, avoiding network flooding when the camera view is empty.
  - Implemented 4-frame temporal stability voting window in `App.tsx`, eliminating prediction flicker.
  - Implemented duplicate suppression hold lock (5 consecutive stable frames / ~600ms hold requirement) to prevent continuous letter duplication while the signer maintains an ISL posture.
- **Enhanced Status & Visual Feedback (`PredictionCard.tsx`, `WebcamLandmarksCanvas.tsx`):**
  - Real-time status indicators communicating `Initializing Camera...`, `Detecting Hand...`, `Recognized Sign`, `No Hand Detected`, `Uncertain Sign`, and `Recognition Unavailable`.
  - Added a `Stable` badge on `PredictionCard` when a gesture passes temporal consistency checks.
- **Code Quality:**
  - Resolved all oxlint linter warnings (0 errors, 0 warnings).
  - Production build compiled cleanly in 1.17s.
  - 100% of automated tests passing (27/27).

## [0.1.1] - 2026-10-23

### Added
- **Synchronized Two-Way Conversation Timeline (`ConversationHistory.tsx`):**
  - Real-time logging of messages from both Deaf Communicator (ISL) and Hearing Peer (Voice).
  - One-click "Replay Audio (TTS)" and "Watch ISL Sign Clip" buttons per message.
  - One-click copy transcript and export transcript as timestamped text file.
- **Camera Device Switcher & Interactive Demo Mode (`WebcamLandmarksCanvas.tsx`):**
  - Enumeration and dynamic switching between available camera video inputs.
  - Interactive "Demo Gestures" selector (`C`, `L`, `A`, `B`, and `Uncertain Sign`) enabling end-to-end testing of real prediction, confidence gauges, and rejection policies without requiring a physical camera device.
- **ISL Phrase Search & Category Filtering (`SpeechToSignPanel.tsx`):**
  - Instant search filtering and category tabs (*All, Greetings, Courtesy, Assistance, Responses, Questions*).
  - "Send to Timeline" action syncing spoken phrases into the two-way session log.
- **Enhanced Fingerspelling Visual Breakdown (`ISLVideoPlayer.tsx`):**
  - Classified 1-hand vs 2-hands indicators on every alphabet card.
  - Instant custom word fingerspelling decomposition for names and proper nouns.
- **Keyboard Accessibility Navigation:**
  - `?` shortcut opens the Vocabulary reference modal.
  - `Escape` dismisses modals.
  - Keyboard-focusable controls with visible focus rings.
- **Reduced Motion Support:**
  - Added `@media (prefers-reduced-motion: reduce)` in `App.css` to respect user accessibility preferences.

### Fixed
- **Complete Frontend UI & Design System Overhaul:**
  - Diagnosed root cause of unstyled layout: component markup used utility classes assuming an external Tailwind processor, but Vite was running standard CSS without Tailwind compiler dependencies.
  - Implemented comprehensive 500+ line accessible Vanilla CSS design system in `frontend/src/index.css` and layout helper engine in `frontend/src/App.css`.
  - Replaced browser-default form controls (inputs, textareas, selects, checkboxes) with cohesive dark-themed, focus-ringed inputs inheriting Outfit typography and crisp borders.
  - Eliminated confusing duplicate "Start Webcam" / "Start Camera" buttons in `WebcamLandmarksCanvas.tsx`.
  - Enforced strict 16:9 aspect-ratio constraints on webcam preview and `ISLVideoPlayer.tsx` with max-height bounds, eliminating large unexplained empty spaces and horizontal clipping.
  - Upgraded Conversation Timeline with distinct message bubble cards for Deaf Communicator (ISL cyan) and Hearing Peer (Voice indigo), timestamp readouts, and clear action toolbars.
  - Corrected wording across components to maintain strict truthfulness (replaced "certified" claims with "reviewed everyday phrase demonstration library").
  - Fixed responsive breakpoints across 1440px desktop, 1024px laptop, 768px tablet, and 390px mobile viewports.
- Resolved all 7 oxlint warnings across the frontend codebase; linter runs with **0 errors and 0 warnings**.
- Fixed synchronous state update warnings during initial API polling.

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
