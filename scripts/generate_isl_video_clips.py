"""
Generates demonstration MP4 video clips for curated Indian Sign Language (ISL) phrases.
Saved to frontend/public/isl_clips/
"""

import os
import json
import math
import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, 'frontend', 'public', 'isl_clips')
os.makedirs(OUTPUT_DIR, exist_ok=True)

PHRASES_FILE = os.path.join(BASE_DIR, 'signbridge', 'data', 'isl_phrases.json')
with open(PHRASES_FILE, 'r', encoding='utf-8') as f:
    PHRASES = json.load(f)

WIDTH = 640
HEIGHT = 360
FPS = 25
DURATION_SEC = 3
TOTAL_FRAMES = FPS * DURATION_SEC

# Visual constants
BG_COLOR = (24, 20, 20)       # Deep slate BGR
ACCENT_CYAN = (235, 180, 56)  # BGR Cyan / Teal
ACCENT_GREEN = (120, 210, 80) # BGR Green
TEXT_WHITE = (245, 245, 245)
TEXT_MUTED = (160, 160, 160)
CARD_BG = (38, 32, 32)

def draw_hand_skeleton(frame, cx, cy, scale, openness, angle_deg, color=(255, 200, 100)):
    """Draws a stylized hand skeleton wireframe."""
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    
    def rotate_pt(x, y):
        rx = x * cos_a - y * sin_a
        ry = x * sin_a + y * cos_a
        return int(cx + rx * scale), int(cy + ry * scale)
    
    wrist = rotate_pt(0, 40)
    palm = rotate_pt(0, 0)
    
    cv2.circle(frame, wrist, int(6 * scale), color, -1)
    cv2.circle(frame, palm, int(8 * scale), color, -1)
    cv2.line(frame, wrist, palm, color, int(3 * scale))
    
    # 5 fingers
    finger_angles = [-35, -15, 0, 15, 30]
    finger_lengths = [35 * openness, 50 * openness, 55 * openness, 48 * openness, 40 * openness]
    
    for fa, fl in zip(finger_angles, finger_lengths):
        frad = math.radians(angle_deg + fa)
        mcp = rotate_pt(fa * 0.8, -10)
        tip_x = mcp[0] + fl * scale * math.sin(frad)
        tip_y = mcp[1] - fl * scale * math.cos(frad)
        tip = (int(tip_x), int(tip_y))
        
        cv2.circle(frame, mcp, int(4 * scale), color, -1)
        cv2.circle(frame, tip, int(4 * scale), (255, 255, 255), -1)
        cv2.line(frame, palm, mcp, color, int(2 * scale))
        cv2.line(frame, mcp, tip, color, int(2 * scale))

def render_clip(phrase_info):
    clip_id = phrase_info['id']
    title = phrase_info['phrase'].upper()
    category = phrase_info['category']
    desc = phrase_info['description']
    hands_count = phrase_info['hands']
    
    output_path = os.path.join(OUTPUT_DIR, f"{clip_id}.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, FPS, (WIDTH, HEIGHT))
    
    print(f"Rendering ISL clip: {clip_id}.mp4...")
    
    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / TOTAL_FRAMES  # 0.0 to 1.0
        phase = math.sin(t * math.pi * 2)  # -1.0 to 1.0
        
        frame = np.full((HEIGHT, WIDTH, 3), BG_COLOR, dtype=np.uint8)
        
        # Draw header banner card
        cv2.rectangle(frame, (20, 20), (WIDTH - 20, 80), CARD_BG, -1)
        cv2.rectangle(frame, (20, 20), (WIDTH - 20, 80), (70, 60, 60), 1)
        
        # Badge
        badge_text = f"ISL | {category.upper()} | {hands_count}-HAND"
        cv2.putText(frame, badge_text, (35, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.45, ACCENT_CYAN, 1, cv2.LINE_AA)
        cv2.putText(frame, title, (35, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.75, TEXT_WHITE, 2, cv2.LINE_AA)
        
        # Center stage card for animation
        cv2.rectangle(frame, (20, 95), (WIDTH - 20, HEIGHT - 55), CARD_BG, -1)
        cv2.rectangle(frame, (20, 95), (WIDTH - 20, HEIGHT - 55), (60, 50, 50), 1)
        
        # Animate based on phrase id
        if clip_id == "hello":
            # Two hands approaching for Namaste or one waving
            offset = int(30 * (1 - abs(phase)))
            draw_hand_skeleton(frame, 270 - offset, 210, 1.1, 0.9, -15 + phase * 10, ACCENT_CYAN)
            draw_hand_skeleton(frame, 370 + offset, 210, 1.1, 0.9, 15 - phase * 10, ACCENT_GREEN)
            arrow_start, arrow_end = (230, 210), (260, 210)
            cv2.arrowedLine(frame, arrow_start, arrow_end, (180, 180, 180), 2, tipLength=0.3)
            arrow_start2, arrow_end2 = (410, 210), (380, 210)
            cv2.arrowedLine(frame, arrow_start2, arrow_end2, (180, 180, 180), 2, tipLength=0.3)
            
        elif clip_id == "thank_you":
            # Hand moving forward from chin
            dy = int(phase * 25)
            dx = int(phase * 15)
            draw_hand_skeleton(frame, 320 + dx, 220 + dy, 1.2, 0.95, -10 + phase * 20, ACCENT_CYAN)
            cv2.arrowedLine(frame, (320, 180), (340, 250), ACCENT_GREEN, 2, tipLength=0.3)
            
        elif clip_id == "help":
            # Closed fist on flat palm moving upwards
            dy = int(-abs(phase) * 35)
            # Palm (base)
            draw_hand_skeleton(frame, 320, 240 + dy, 1.0, 1.0, 90, ACCENT_GREEN)
            # Fist (lifted)
            draw_hand_skeleton(frame, 320, 190 + dy, 1.0, 0.2, 0, ACCENT_CYAN)
            cv2.arrowedLine(frame, (240, 240), (240, 170), (255, 255, 255), 2, tipLength=0.3)
            
        elif clip_id in ("yes", "no"):
            # Nodding motion
            dy = int(phase * 20)
            draw_hand_skeleton(frame, 320, 210 + dy, 1.2, 0.3 if clip_id == "yes" else 0.7, 0, ACCENT_CYAN)
            cv2.arrowedLine(frame, (400, 180), (400, 230), (255, 255, 255), 2, tipLength=0.3)
            
        else:
            # General graceful demonstration
            angle = int(phase * 25)
            if hands_count == 2:
                draw_hand_skeleton(frame, 260, 210, 1.1, 0.9, -angle, ACCENT_CYAN)
                draw_hand_skeleton(frame, 380, 210, 1.1, 0.9, angle, ACCENT_GREEN)
            else:
                draw_hand_skeleton(frame, 320, 210, 1.2, 0.85, angle, ACCENT_CYAN)
                
        # Description footer
        cv2.rectangle(frame, (20, HEIGHT - 50), (WIDTH - 20, HEIGHT - 15), CARD_BG, -1)
        cv2.putText(frame, desc[:75], (30, HEIGHT - 28), cv2.FONT_HERSHEY_SIMPLEX, 0.42, TEXT_MUTED, 1, cv2.LINE_AA)
        
        # Loop indicator bar
        bar_w = int((WIDTH - 40) * t)
        cv2.line(frame, (20, HEIGHT - 12), (20 + bar_w, HEIGHT - 12), ACCENT_CYAN, 2)
        
        out.write(frame)
        
    out.release()
    print(f"  Finished {clip_id}.mp4 (size: {os.path.getsize(output_path)} bytes)")

def main():
    for phrase in PHRASES:
        render_clip(phrase)
    print("All ISL clips generated successfully!")

if __name__ == '__main__':
    main()
