import os
import cv2
import pickle
import numpy as np
import mediapipe as mp
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, classification_report,
    confusion_matrix, ConfusionMatrixDisplay
)
import matplotlib.pyplot as plt

# 🔧 Config
DATA_DIR = r'D:\Vs Code Projects\data'  # Make sure this contains 2-hand samples
PICKLE_PATH = './data_2hands.pickle'
MODEL_PATH = './model_2hands.p'
CONF_MATRIX_PATH = './confusion_matrix_2hands.png'
TEST_SIZE = 0.2
RANDOM_STATE = 42
N_ESTIMATORS = 200
MAX_DEPTH = 10

# 🧠 MediaPipe Setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=2)

def extract_features():
    print("🔍 Extracting 2-hand landmarks...")
    X, y = [], []
    class_labels = sorted(os.listdir(DATA_DIR))

    for label in class_labels:
        label_path = os.path.join(DATA_DIR, label)
        if not os.path.isdir(label_path):
            continue

        for img_file in os.listdir(label_path):
            img_path = os.path.join(label_path, img_file)
            image = cv2.imread(img_path)
            if image is None:
                continue

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            result = hands.process(image_rgb)

            if result.multi_hand_landmarks and len(result.multi_hand_landmarks) == 2:
                hand_1 = result.multi_hand_landmarks[0]
                hand_2 = result.multi_hand_landmarks[1]

                features = []

                for hand in [hand_1, hand_2]:
                    x_list = [lm.x for lm in hand.landmark]
                    y_list = [lm.y for lm in hand.landmark]

                    for lm in hand.landmark:
                        features.append(lm.x - min(x_list))
                        features.append(lm.y - min(y_list))

                if len(features) == 84:
                    X.append(features)
                    y.append(label)
            # else: skip if not exactly 2 hands

    print(f"✅ Extracted {len(X)} two-hand samples.")
    with open(PICKLE_PATH, 'wb') as f:
        pickle.dump({'data': X, 'labels': y}, f)
    print(f"💾 Saved to: {os.path.abspath(PICKLE_PATH)}")
    return np.array(X), np.array(y)

def load_data():
    with open(PICKLE_PATH, 'rb') as f:
        data_dict = pickle.load(f)

    X = np.asarray(data_dict['data'])
    labels = np.asarray(data_dict['labels'])
    label_to_id = {label: idx for idx, label in enumerate(sorted(np.unique(labels)))}
    id_to_label = {idx: label for label, idx in label_to_id.items()}
    y = np.array([label_to_id[label] for label in labels])
    return X, y, label_to_id, id_to_label

def train_model():
    if not os.path.exists(PICKLE_PATH):
        X, y = extract_features()
        label_to_id = {label: idx for idx, label in enumerate(sorted(np.unique(y)))}
        id_to_label = {idx: label for label, idx in label_to_id.items()}
        y = np.array([label_to_id[label] for label in y])
    else:
        print("📁 Loading existing two-hand data...")
        X, y, label_to_id, id_to_label = load_data()

    print("🔁 Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )

    model = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=MAX_DEPTH,
        class_weight='balanced',
        random_state=RANDOM_STATE
    )

    print("📊 Cross-validating...")
    cv_scores = cross_val_score(model, X_train, y_train, cv=5)
    print(f"✅ CV Accuracy: {cv_scores.mean():.2f} ± {cv_scores.std():.2f}")

    print("🚀 Training final model...")
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    print(f"\n🎯 Test Accuracy: {acc * 100:.2f}%")

    print("📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=[id_to_label[i] for i in sorted(id_to_label)]))

    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=[id_to_label[i] for i in sorted(id_to_label)])
    disp.plot(cmap=plt.cm.Blues, xticks_rotation='vertical')
    plt.tight_layout()
    plt.savefig(CONF_MATRIX_PATH)
    plt.show()

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump({
            'model': model,
            'label_map': id_to_label,
            'input_shape': X[0].shape,
            'accuracy': acc
        }, f)

    print(f"✅ Model saved to: {os.path.abspath(MODEL_PATH)}")
    print(f"🖼️ Confusion matrix saved to: {os.path.abspath(CONF_MATRIX_PATH)}")

if __name__ == "__main__":
    train_model()
