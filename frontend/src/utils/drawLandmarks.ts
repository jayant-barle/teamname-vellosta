/**
 * SignBridge - Hand Landmark Canvas Drawing Utilities
 * Adapted from reference implementation (Warlord-06/teamname-vellosta).
 * Renders glowing anatomical hand skeletons, joint highlights, and bounding boxes.
 */

import type { LandmarkPoint } from '../services/apiClient';

// MediaPipe 21 Hand Connections
export const HAND_CONNECTIONS: [number, number][] = [
  // Palm base
  [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
];

// Color palette for anatomical finger groups
export const FINGER_COLORS: Record<string, string> = {
  palm: '#818CF8',   // Indigo 400
  thumb: '#F59E0B',  // Amber 500
  index: '#38BDF8',  // Sky 400
  middle: '#34D399', // Emerald 400
  ring: '#A78BFA',   // Violet 400
  pinky: '#F472B6',  // Pink 400
  joint: '#FFFFFF',
};

export function getFingerGroup(pointIndex: number): string {
  if (pointIndex === 0) return 'palm';
  if (pointIndex <= 4) return 'thumb';
  if (pointIndex <= 8) return 'index';
  if (pointIndex <= 12) return 'middle';
  if (pointIndex <= 16) return 'ring';
  return 'pinky';
}

export interface RenderOptions {
  showBoundingBox?: boolean;
  showSkeleton?: boolean;
  activeLabel?: string | null;
  confidence?: number | null;
  mirrored?: boolean;
}

/**
 * Renders hand landmarks, anatomical bones, joints, and bounding box on HTML5 canvas.
 */
export function renderHandsOnCanvas(
  ctx: CanvasRenderingContext2D,
  handsLandmarks: LandmarkPoint[][],
  width: number,
  height: number,
  options: RenderOptions = {}
): void {
  const {
    showBoundingBox = true,
    showSkeleton = true,
    activeLabel = null,
    confidence = null,
  } = options;

  if (!handsLandmarks || handsLandmarks.length === 0 || !showSkeleton) return;

  ctx.save();

  handsLandmarks.forEach((hand, handIdx) => {
    if (!hand || hand.length < 21) return;

    const screenPoints = hand.map((lm) => ({
      x: lm.x * width,
      y: lm.y * height,
    }));

    // Calculate bounding box
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    screenPoints.forEach((pt) => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });

    // Add padding
    const padding = 16;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    // 1. Draw glowing bones / connections with anatomical colors
    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = screenPoints[startIdx];
      const end = screenPoints[endIdx];
      if (!start || !end) return;

      const fingerGroup = getFingerGroup(endIdx);
      const strokeColor = FINGER_COLORS[fingerGroup] || '#6366F1';

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);

      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    });

    // 2. Draw landmark joints
    screenPoints.forEach((pt, idx) => {
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      const isWrist = idx === 0;
      const fingerGroup = getFingerGroup(idx);
      const jointColor = FINGER_COLORS[fingerGroup] || '#818CF8';

      ctx.save();
      ctx.beginPath();
      const radius = isTip ? 5.5 : isWrist ? 5.0 : 3.5;
      ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);

      ctx.shadowColor = jointColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = isTip ? '#FBBF24' : FINGER_COLORS.joint;
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = jointColor;
      ctx.stroke();
      ctx.restore();
    });

    // 3. Draw bounding box and label if enabled
    if (showBoundingBox) {
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);

      // Hand tag pill
      const handLabel = handIdx === 0 ? 'Hand 1' : 'Hand 2';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(minX, Math.max(0, minY - 22), 85, 20);
      ctx.fillStyle = '#38BDF8';
      ctx.font = '600 11px Outfit, sans-serif';
      ctx.fillText(handLabel, minX + 6, Math.max(14, minY - 8));

      // Active prediction tag if top hand
      if (handIdx === 0 && activeLabel) {
        const confText = confidence ? ` (${Math.round(confidence * 100)}%)` : '';
        const tagText = `${activeLabel}${confText}`;
        const tagWidth = ctx.measureText(tagText).width + 16;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
        ctx.fillRect(maxX - tagWidth, Math.max(0, minY - 22), tagWidth, 20);
        ctx.fillStyle = '#080D1A';
        ctx.font = '700 11px Outfit, sans-serif';
        ctx.fillText(tagText, maxX - tagWidth + 8, Math.max(14, minY - 8));
      }

      ctx.restore();
    }
  });

  ctx.restore();
}
