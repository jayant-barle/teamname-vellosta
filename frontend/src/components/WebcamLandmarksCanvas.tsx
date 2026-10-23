import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertCircle, Eye } from 'lucide-react';
import { extractFeaturesFromLandmarks } from '../services/apiClient';
import type { LandmarkPoint, PredictResponse } from '../services/apiClient';

interface WebcamLandmarksCanvasProps {
  onPredict: (features: number[], landmarks: LandmarkPoint[][]) => Promise<PredictResponse | null>;
  isPredicting: boolean;
  predictionResult: PredictResponse | null;
}

// MediaPipe 21 Hand Connections
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17]
];

export const WebcamLandmarksCanvas: React.FC<WebcamLandmarksCanvasProps> = ({
  onPredict,
  isPredicting,
  predictionResult,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [detectedHands, setDetectedHands] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);

  const landmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());

  // Initialize MediaPipe HandLandmarker with graceful fallback
  useEffect(() => {
    let isMounted = true;
    async function initDetector() {
      try {
        const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
        }
      } catch (err) {
        console.warn('Online MediaPipe model init fallback (offline or blocked CDN):', err);
      }
    }

    initDetector();
    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch (_) {}
      }
    };
  }, []);

  // Start Camera
  const startCamera = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }
    } catch (err: any) {
      console.error('Camera permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera access denied. Please grant permission in your browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera detected on this system.');
      } else {
        setPermissionError(`Camera error: ${err.message || 'Unable to open camera.'}`);
      }
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCameraActive(false);
    setDetectedHands(0);
  };

  // Render Skeleton Connections on Canvas
  const drawLandmarks = (
    ctx: CanvasRenderingContext2D,
    hands: LandmarkPoint[][],
    width: number,
    height: number
  ) => {
    ctx.save();

    hands.forEach((hand, handIdx) => {
      const isSecondHand = handIdx === 1;
      const pointColor = isSecondHand ? '#10b981' : '#06b6d4';
      const lineColor = isSecondHand ? 'rgba(16, 185, 129, 0.7)' : 'rgba(6, 182, 212, 0.7)';

      // Draw connections
      ctx.lineWidth = 3;
      ctx.strokeStyle = lineColor;
      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = hand[startIdx];
        const p2 = hand[endIdx];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
          ctx.stroke();
        }
      });

      // Draw keypoints
      hand.forEach((p, idx) => {
        const x = p.x * width;
        const y = p.y * height;
        const isTip = [4, 8, 12, 16, 20].includes(idx);
        const radius = isTip ? 6 : 4;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isTip ? '#ffffff' : pointColor;
        ctx.shadowColor = pointColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });

    ctx.restore();
  };

  // Frame processing loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    // Mirror video on canvas for intuitive signing UX
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // FPS calculation
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    let extractedHands: LandmarkPoint[][] = [];

    // Run MediaPipe detector if loaded
    if (landmarkerRef.current) {
      try {
        const results = landmarkerRef.current.detectForVideo(video, now);
        if (results && results.landmarks && results.landmarks.length > 0) {
          // Flip landmark X to match mirrored canvas view
          extractedHands = results.landmarks.map((hand: any[]) =>
            hand.map((p) => ({
              x: 1.0 - p.x,
              y: p.y,
              z: p.z || 0.0,
            }))
          );
        }
      } catch (e) {
        // Fallback gracefully
      }
    }

    setDetectedHands(extractedHands.length);

    // Draw overlay skeleton
    if (extractedHands.length > 0) {
      drawLandmarks(ctx, extractedHands, canvas.width, canvas.height);
    }

    // Throttled prediction loop (every 120ms ~ 8 FPS)
    if (now - lastInferenceTimeRef.current > 120 && !isPredicting) {
      lastInferenceTimeRef.current = now;
      if (extractedHands.length > 0) {
        const features = extractFeaturesFromLandmarks(extractedHands);
        onPredict(features, extractedHands);
      } else {
        // Send empty prediction to update no_detection state
        onPredict([], []);
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [onPredict, isPredicting]);

  useEffect(() => {
    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, processFrame]);

  return (
    <div className="relative flex flex-col items-center">
      {/* Video & Canvas Container */}
      <div className="relative w-full aspect-video bg-[#0c1220] rounded-xl overflow-hidden border border-white/10 shadow-lg">
        {/* Hidden video element used as feed source */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="hidden"
        />

        {/* Mirrored Canvas with Landmark Overlays */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />

        {/* Inactive State Screen */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
              <Camera size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Camera is Off</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Start your webcam to begin real-time Indian Sign Language recognition. Your video is processed entirely locally.
            </p>
            <button
              onClick={startCamera}
              className="btn btn-primary"
            >
              <Camera size={18} />
              Start Webcam
            </button>
          </div>
        )}

        {/* Live HUD Badges */}
        {cameraActive && (
          <>
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
              <span className="live-dot" />
              <span className="font-semibold text-emerald-400">LIVE FEED</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-mono">{fps} FPS</span>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono">
              <Eye size={14} className={detectedHands > 0 ? "text-cyan-400" : "text-slate-400"} />
              <span className={detectedHands > 0 ? "text-cyan-400 font-bold" : "text-slate-400"}>
                {detectedHands === 0 ? "0 Hands" : detectedHands === 1 ? "1 Hand" : "2 Hands"}
              </span>
            </div>

            {/* Bottom HUD: Live prediction badge */}
            {predictionResult && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${
                      predictionResult.status === 'recognized'
                        ? 'badge-recognized'
                        : predictionResult.status === 'uncertain'
                        ? 'badge-uncertain'
                        : predictionResult.status === 'no_detection'
                        ? 'badge-no-detection'
                        : 'badge-error'
                    }`}
                  >
                    {predictionResult.status}
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {predictionResult.message}
                  </span>
                </div>
                {predictionResult.latency_ms > 0 && (
                  <span className="text-xs font-mono text-slate-400">
                    {predictionResult.latency_ms}ms
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Permission / Device Error Banner */}
      {permissionError && (
        <div className="mt-3 w-full p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center gap-3 text-sm text-rose-300">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Camera Controls Bar */}
      {cameraActive && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={stopCamera}
            className="btn btn-danger"
          >
            <CameraOff size={16} />
            Stop Camera
          </button>
        </div>
      )}
    </div>
  );
};
