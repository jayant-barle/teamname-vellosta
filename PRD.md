# SignBridge — Product Requirements Document (PRD)

**Project Name:** SignBridge  
**Version:** 0.1.0  
**Status:** In Active Development (Hackathon MVP)  
**Timeline:** 24-hour sprint target  

---

## 1. Problem Statement & Mission

Communication between Deaf and Hard-of-Hearing individuals who use Indian Sign Language (ISL) and hearing individuals who do not know ISL often suffers from high friction, misunderstandings, and asymmetric accessibility.

**SignBridge** transforms an isolated desktop ISL alphabet recognition prototype into an accessible, web-based, two-way communication assistant. SignBridge bridges the communication gap in real time by providing:
1. **Sign-to-Spoken Communication:** Real-time camera recognition of ISL gestures $\rightarrow$ editable text accumulation $\rightarrow$ browser Text-to-Speech (TTS) audio.
2. **Spoken-to-Sign Communication:** Spoken audio transcription via Speech-to-Text (STT) $\rightarrow$ editable text input $\rightarrow$ lookup and playback of verified ISL video clips.

---

## 2. Product Principles & Honest Scope

- **No Overpromising:** The system explicitly distinguishes between **ISL fingerspelling / static alphabet & digit recognition** and **full continuous sentence-level ISL translation**. The UI communicates this transparently.
- **Human-in-the-Loop:** Recognitions and transcripts are treated as suggestions that can be paused, edited, appended, or deleted before generating speech or looking up signs.
- **Uncertainty Awareness:** Ambiguous or low-confidence hand landmarks are flagged as `uncertain` or `no_detection` rather than guessing wrong letters.
- **Preserve Proven Foundation:** Retain the scikit-learn Random Forest model architecture, 42/84-feature MediaPipe landmark normalizations, and serialization formats from the original system.

---

## 3. User Personas

1. **Aarav (Deaf / Hard-of-Hearing Communicator):**
   - Primary sign language: ISL.
   - Goals: Fingerspell terms, acronyms, or numbers to hearing counterparts quickly; see immediate verification of recognized letters; trigger audio playback so hearing colleagues can listen.
2. **Priya (Hearing Peer / Service Representative):**
   - Does not know ISL.
   - Goals: Speak naturally into microphone; confirm transcribed text; watch verified ISL signs to facilitate mutual understanding.

---

## 4. Key Functional Requirements

### 4.1 Direction 1: Sign $\rightarrow$ Text & Speech
- **FR-1.1 (Camera Feed):** Toggle webcam on/off with clear permission handling.
- **FR-1.2 (Live Landmark Overlay):** Display hand skeleton overlays in real-time over the video canvas to give immediate visual feedback.
- **FR-1.3 (Inference Integration):** Extract 21 normalized landmarks per hand; send to backend `/v1/predict` endpoint or run cached local predictions.
- **FR-1.4 (Prediction States):** Distinct states displayed in UI:
  - `recognized`: Confident prediction meeting threshold with class label.
  - `uncertain`: Landmark detected but prediction margin/entropy does not meet threshold.
  - `no_detection`: No hands visible in frame.
  - `missing_model`: Model weights not loaded or path invalid.
  - `error`: Network or processing exception.
- **FR-1.5 (Sentence Builder & History):**
  - Add character button / debounce accumulator.
  - Backspace, clear, add space, and manual text editing.
- **FR-1.6 (Text-to-Speech):** Browser Web Speech Synthesis audio playback for accumulated text.

### 4.2 Direction 2: Speech $\rightarrow$ ISL Video Playback
- **FR-2.1 (Speech Recognition):** Microphone capture via Web Speech API with live transcript.
- **FR-2.2 (Transcript Editor):** User can review and edit transcribed text before signing.
- **FR-2.3 (Verified ISL Library):** Curated set of high-frequency everyday ISL phrases (e.g., "Hello", "Thank You", "Please", "Help", "Yes", "No", "Good Morning", "Welcome") mapped to reviewed video clips with looped playback.
- **FR-2.4 (Fingerspelling Fallback):** For words not in the phrase library, provide character-by-character fingerspelling reference cards.

---

## 5. Technical Requirements

- **Backend:** Python 3.11–3.14, FastAPI, scikit-learn, NumPy, OpenCV, Pydantic v2.
- **Frontend:** React 19 / TypeScript, Vite, modern accessible styling (high contrast, responsive, dark/light aware).
- **Latency Target:** API inference latency $< 50$ ms per frame.
- **Reliability:** Graceful error recovery when webcam is denied or models are absent.

---

## 6. Acceptance Criteria for MVP 0.1.0

- [x] Codebase audited and documented.
- [ ] Original 42/84 feature representation preserved with regression test verification.
- [ ] FastAPI backend running with `GET /health`, `GET /v1/vocabulary`, and `POST /v1/predict`.
- [ ] Automated test suite covering valid features, missing hands, missing models, and invalid inputs.
- [ ] React + TypeScript frontend operational with start/stop webcam, hand landmarks, sentence builder, TTS, STT, and ISL video clip playback.
- [ ] Complete documentation suite maintained.
