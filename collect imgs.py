import os
import cv2
import subprocess

# 🔧 Configuration
DATA_DIR = r'D:\Vs Code Projects\data'  # ✅ Save dataset here
DATASET_SIZE = 100                      # Images per class
IMAGE_SIZE = (640, 480)
CAMERA_INDEX = 0

# ✅ Labels: A-Z and 0–9
class_labels = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

# ✅ Setup folders
os.makedirs(DATA_DIR, exist_ok=True)
for label in class_labels:
    os.makedirs(os.path.join(DATA_DIR, label), exist_ok=True)

# ✅ Start Webcam
cap = cv2.VideoCapture(CAMERA_INDEX)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, IMAGE_SIZE[0])
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, IMAGE_SIZE[1])

if not cap.isOpened():
    print("❌ ERROR: Camera not accessible.")
    exit()

print(f"📁 Saving dataset to: {DATA_DIR}")
print("📷 Starting gesture data collection...")
print("▶ Press SPACE to start capturing, ESC to skip a label.")

try:
    for label in class_labels:
        print(f"\n🖐️  Get ready for label: '{label}'")

        # Wait for SPACE or ESC
        while True:
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Camera read error.")
                continue

            # Show instructions
            cv2.putText(frame, f"Label: {label}", (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, "Press SPACE to start, ESC to skip", (50, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cv2.imshow('Data Collection', frame)

            key = cv2.waitKey(25)
            if key == 32:  # SPACE
                break
            elif key == 27:  # ESC
                print(f"⏭️ Skipping label '{label}'")
                break

        if key == 27:
            continue

        # Start capturing images
        print(f"📸 Capturing {DATASET_SIZE} images for '{label}'...")
        count = 0
        while count < DATASET_SIZE:
            ret, frame = cap.read()
            if not ret:
                continue

            img_path = os.path.join(DATA_DIR, label, f"{count}.jpg")
            cv2.imwrite(img_path, frame)

            # Show progress on screen
            cv2.putText(frame, f"Capturing: {count + 1}/{DATASET_SIZE}", (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
            cv2.imshow('Data Collection', frame)
            cv2.waitKey(25)
            count += 1

        print(f"✅ Done: {label}")

finally:
    cap.release()
    cv2.destroyAllWindows()
    print("\n✅ Data collection completed.")
    
    # ✅ Open folder in File Explorer
    subprocess.Popen(f'explorer "{DATA_DIR}"')
