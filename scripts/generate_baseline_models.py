"""
Baseline Model Generator for SignBridge
Generates reference scikit-learn RandomForestClassifier models conforming
strictly to the original serialization schema and feature contracts:
- 1-hand model: 42 features, pickled dict with 'model', 'label_map', 'input_shape', 'accuracy'
- 2-hand model: 84 features, pickled dict with 'model', 'label_map', 'input_shape', 'accuracy'
"""

import os
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Output directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_1HAND_PATH = os.path.join(MODELS_DIR, 'model.p')
MODEL_2HAND_PATH = os.path.join(MODELS_DIR, 'model_2hands.p')

# 1-Hand Vocab: Letters and numbers commonly signed with one hand in ISL
VOCAB_1HAND = ['C', 'I', 'L', 'O', 'U', 'V', 'W', '1', '2', '3', '4', '5']

# 2-Hand Vocab: Letters and numbers commonly signed with two hands in ISL
VOCAB_2HAND = ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'X', 'Y', 'Z', '6', '7', '8', '9', '0']

def create_synthetic_hand_features(class_idx: int, num_samples: int = 120, n_features: int = 42, seed: int = 42):
    """
    Creates well-separated synthetic landmark clusters for demonstration and testing,
    emulating relative landmark offsets (x - min(x), y - min(y)) in [0, 1].
    """
    rng = np.random.RandomState(seed + class_idx * 17)
    # Define a unique cluster center per class
    base_center = rng.uniform(0.1, 0.8, size=(n_features,))
    # Ensure min normalization property (first element near 0)
    base_center[0] = 0.0
    base_center[1] = 0.0
    
    # Generate variations around the cluster center with small jitter
    noise = rng.normal(0, 0.04, size=(num_samples, n_features))
    samples = np.clip(base_center + noise, 0.0, 1.0)
    return samples

def build_and_save_model(vocab, n_features, output_path, model_name):
    print(f"Building {model_name} with {len(vocab)} classes and {n_features} features...")
    X_list = []
    y_list = []
    
    label_to_id = {label: idx for idx, label in enumerate(vocab)}
    id_to_label = {idx: label for label, idx in label_to_id.items()}
    
    for label, class_idx in label_to_id.items():
        samples = create_synthetic_hand_features(class_idx, num_samples=150, n_features=n_features, seed=class_idx * 31)
        X_list.append(samples)
        y_list.extend([class_idx] * len(samples))
        
    X = np.vstack(X_list)
    y = np.array(y_list)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        class_weight='balanced',
        random_state=42
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  {model_name} Test Accuracy: {acc * 100:.2f}%")
    
    payload = {
        'model': clf,
        'label_map': id_to_label,
        'input_shape': (n_features,),
        'accuracy': float(acc),
        'metadata': {
            'type': 'RandomForestClassifier',
            'n_features': n_features,
            'classes': vocab,
            'source': 'signbridge-baseline-generator'
        }
    }
    
    with open(output_path, 'wb') as f:
        pickle.dump(payload, f)
    print(f"  Saved to {output_path}")

def main():
    print("Generating baseline models for SignBridge...")
    build_and_save_model(VOCAB_1HAND, 42, MODEL_1HAND_PATH, "1-Hand Model")
    build_and_save_model(VOCAB_2HAND, 84, MODEL_2HAND_PATH, "2-Hand Model")
    print("Baseline models generation complete!")

if __name__ == '__main__':
    main()
