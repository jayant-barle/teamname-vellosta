import pickle
import cv2
import mediapipe as mp
import numpy as np

import os

# Helper to find model path relative to project or absolute
def resolve_model_path(filename, legacy_path):
    candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', filename),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), filename),
        legacy_path
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return legacy_path

# ✅ Load one-hand model
model1_path = resolve_model_path('model.p', r'C:\Users\Nidhin\model.p')
try:
    with open(model1_path, 'rb') as f:
        model1 = pickle.load(f)
        model_1hand = model1['model']
        map_1hand = model1['label_map']
except Exception as e:
    print(f"Error loading 1-hand model from {model1_path}: {e}")
    exit(1)

# ✅ Load two-hand model
model2_path = resolve_model_path('model_2hands.p', r'C:\Users\Nidhin\model_2hands.p')
try:
    with open(model2_path, 'rb') as f:
        model2 = pickle.load(f)
        model_2hand = model2['model']
        map_2hand = model2['label_map']
except Exception as e:
    print(f"Error loading 2-hand model from {model2_path}: {e}")
    exit(1)

# Reverse label maps (support both {id: label} and {label: id})
id_to_label_1hand = {}
for k, v in map_1hand.items():
    try:
        id_to_label_1hand[int(k)] = str(v)
    except ValueError:
        id_to_label_1hand[int(v)] = str(k)

id_to_label_2hand = {}
for k, v in map_2hand.items():
    try:
        id_to_label_2hand[int(k)] = str(v)
    except ValueError:
        id_to_label_2hand[int(v)] = str(k)

# ✅ MediaPipe setup
if hasattr(mp, 'solutions'):
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
else:
    mp_hands = None
    mp_drawing = None
    hands = None

def run_hybrid_inference():
    if hands is None:
        print("MediaPipe solutions is not available in this Python environment.")
        print("Please use the SignBridge web backend and React frontend.")
        return

    # ✅ Webcam setup
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Webcam not accessible.")
        return

    print("🧠 Hybrid Gesture Recognition Started (1 or 2 hands)")
    print("🚪 Press 'Q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        H, W, _ = frame.shape
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(frame_rgb)

        predicted_character = ""
        frame_message = ""

        if results.multi_hand_landmarks:
            hands_detected = results.multi_hand_landmarks

            # === 1 HAND ===
            if len(hands_detected) == 1:
                hand = hands_detected[0]
                mp_drawing.draw_landmarks(frame, hand, mp_hands.HAND_CONNECTIONS)

                x_ = [lm.x for lm in hand.landmark]
                y_ = [lm.y for lm in hand.landmark]

                features = []
                for lm in hand.landmark:
                    features.append(lm.x - min(x_))
                    features.append(lm.y - min(y_))

                if len(features) == 42:
                    try:
                        pred = model_1hand.predict([features])[0]
                        predicted_character = id_to_label_1hand.get(pred, "Unknown")
                        frame_message = f"🖐 1-hand → {predicted_character}"
                    except Exception as e:
                        frame_message = "❌ Error predicting 1-hand"

            # === 2 HANDS ===
            elif len(hands_detected) == 2:
                features = []
                for hand in hands_detected:
                    mp_drawing.draw_landmarks(frame, hand, mp_hands.HAND_CONNECTIONS)

                    x_ = [lm.x for lm in hand.landmark]
                    y_ = [lm.y for lm in hand.landmark]

                    for lm in hand.landmark:
                        features.append(lm.x - min(x_))
                        features.append(lm.y - min(y_))

                if len(features) == 84:
                    try:
                        pred = model_2hand.predict([features])[0]
                        predicted_character = id_to_label_2hand.get(pred, "Unknown")
                        frame_message = f"🤝 2-hands → {predicted_character}"
                    except Exception as e:
                        frame_message = "❌ Error predicting 2-hand"

            else:
                frame_message = "⚠️ Only 1 or 2 hands supported"

        else:
            frame_message = "🙌 No hands detected"

        # Show prediction
        cv2.putText(frame, frame_message, (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 255, 0), 3)

        cv2.imshow("Hybrid Gesture Recognition", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("👋 Program exited.")

if __name__ == '__main__':
    run_hybrid_inference()
