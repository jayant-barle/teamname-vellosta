import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  AlertCircle,
  Eye,
  EyeOff,
  FlipHorizontal,
  Sliders,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  extractFeaturesFromLandmarks,
  DEMO_GESTURES,
} from '../services/apiClient';
import type { LandmarkPoint, PredictResponse, DemoGesture } from '../services/apiClient';
import type { CameraStatus } from './PredictionCard';
import { renderHandsOnCanvas } from '../utils/drawLandmarks';
import { classifyConversationalHeuristic } from '../services/gestureClassifier';

interface WebcamLandmarksCanvasProps {
  onPredict: (features: number[], landmarks: LandmarkPoint[][]) => Promise<PredictResponse | null>;
  isPredicting: boolean;
  predictionResult: PredictResponse | null;
  onStatusChange?: (status: CameraStatus) => void;
  onHeuristicGesture?: (gestureName: string | null) => void;
}

export const WebcamLandmarksCanvas: React.FC<WebcamLandmarksCanvasProps> = ({
  onPredict,
  isPredicting,
  predictionResult,
  onStatusChange,
  onHeuristicGesture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [detectedHands, setDetectedHands] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeDemoGesture, setActiveDemoGesture] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');

  // Display toggles adapted from reference implementation
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [heuristicGesture, setHeuristicGesture] = useState<string | null>(null);

  const landmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const lastVideoTimestampRef = useRef<number>(-1);
  const demoIntervalRef = useRef<any>(null);
  const lastDiagTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);
  const processFrameRef = useRef<() => void>(() => {});
  const inFlightRef = useRef<boolean>(false);
  const hadHandsRef = useRef<boolean>(false);

  const clearDemoInterval = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
  }, []);

  // Helper to propagate status
  const updateStatus = useCallback(
    (newStatus: CameraStatus) => {
      setCameraStatus(newStatus);
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    },
    [onStatusChange]
  );

  // Enumerate camera devices
  useEffect(() => {
    async function loadDevices() {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        } catch {
          // Device enumeration fallback
        }
      }
    }
    loadDevices();
  }, [selectedDeviceId]);

  // Initialize MediaPipe HandLandmarker WebAssembly engine
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
        console.warn('MediaPipe online model init notice:', err);
      }
    }

    initDetector();
    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {
          // Ignore closure errors
        }
      }
    };
  }, []);

  // Stop Camera & Release Resources
  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore stop errors
          }
        });
        videoRef.current.srcObject = null;
      }
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCameraActive(false);
    setIsInitializing(false);
    clearDemoInterval();
    setDetectedHands(0);
    hadHandsRef.current = false;
    inFlightRef.current = false;
    lastVideoTimestampRef.current = -1;
    setHeuristicGesture(null);
    if (onHeuristicGesture) onHeuristicGesture(null);
    updateStatus('idle');
  }, [updateStatus, onHeuristicGesture, clearDemoInterval]);

  // Component unmount cleanup: unconditionally release hardware stream
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start Camera
  const startCamera = async (deviceId?: string) => {
    setPermissionError(null);
    setActiveDemoGesture(null);
    setIsInitializing(true);
    updateStatus('initializing');

    // Stop current stream if switching devices
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      if (videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: !deviceId && !selectedDeviceId ? 'user' : undefined,
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        const handleReady = () => {
          video
            .play()
            .catch((playErr) => {
              console.warn('Camera video play notice:', playErr);
            })
            .finally(() => {
              setCameraActive(true);
              setIsInitializing(false);
              updateStatus('no_hand');
            });
        };

        if (video.readyState >= 1) {
          handleReady();
        } else {
          video.onloadedmetadata = handleReady;
        }
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setIsInitializing(false);
      setCameraActive(false);
      updateStatus('unavailable');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera access denied. Please grant camera permission in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera detected on this system. Connect a webcam or test with Demo Gestures.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionError('Camera is already in use by another application. Please close other camera apps and retry.');
      } else {
        setPermissionError(`Camera error: ${err.message || 'Unable to open camera.'}`);
      }
    }
  };

  // Frame processing loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    // Render video on canvas with optional mirror toggle
    if (isMirrored) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Monotonic timestamp calculation for MediaPipe detectForVideo
    const now = performance.now();
    const videoTimestamp = Math.max(now, (lastVideoTimestampRef.current || 0) + 1);
    lastVideoTimestampRef.current = videoTimestamp;

    // FPS calculation
    frameCountRef.current++;
    if (lastFpsTimeRef.current === 0) {
      lastFpsTimeRef.current = now;
    } else if (now - lastFpsTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    let rawHands: LandmarkPoint[][] = [];
    let displayHands: LandmarkPoint[][] = [];

    // Run MediaPipe detector if loaded
    if (landmarkerRef.current) {
      try {
        const results = landmarkerRef.current.detectForVideo(video, videoTimestamp);
        if (results?.landmarks && results.landmarks.length > 0) {
          rawHands = results.landmarks.map((hand: any[]) =>
            hand.map((p) => ({
              x: p.x,
              y: p.y,
              z: p.z || 0.0,
            }))
          );

          // For on-screen mirrored skeleton rendering, flip X coordinate
          displayHands = isMirrored
            ? rawHands.map((hand) =>
                hand.map((p) => ({
                  x: 1.0 - p.x,
                  y: p.y,
                  z: p.z,
                }))
              )
            : rawHands;
        }
      } catch (detectorErr) {
        console.warn('Landmark detection warning:', detectorErr);
      }
    }

    const handCount = rawHands.length;
    setDetectedHands(handCount);

    // Evaluate client-side conversational heuristic on raw hands
    if (handCount > 0) {
      const heuristic = classifyConversationalHeuristic(rawHands[0], rawHands);
      const hName = heuristic?.name || null;
      setHeuristicGesture(hName);
      if (onHeuristicGesture) onHeuristicGesture(hName);
    } else {
      setHeuristicGesture(null);
      if (onHeuristicGesture) onHeuristicGesture(null);
    }

    // Draw anatomical skeleton & bounding box using displayHands for mirror alignment
    if (handCount > 0 && showSkeleton) {
      renderHandsOnCanvas(ctx, displayHands, canvas.width, canvas.height, {
        showSkeleton: true,
        showBoundingBox: true,
        activeLabel:
          predictionResult?.status === 'recognized'
            ? predictionResult.label
            : heuristicGesture
            ? `Heuristic: ${heuristicGesture}`
            : undefined,
        confidence: predictionResult?.confidence ?? undefined,
        mirrored: isMirrored,
      });
    }

    // Throttled prediction loop (every 120ms ~ 8 FPS) with in-flight and parent state lock
    // Always extracts authentic features from rawHands to preserve model training distribution
    if (now - lastInferenceTimeRef.current > 120 && !inFlightRef.current && !isPredicting) {
      if (handCount > 0) {
        hadHandsRef.current = true;
        inFlightRef.current = true;
        lastInferenceTimeRef.current = now;
        updateStatus('detecting');

        const features = extractFeaturesFromLandmarks(rawHands);

        // Throttled CV diagnostic log (every 2.5s)
        if (now - lastDiagTimeRef.current > 2500) {
          lastDiagTimeRef.current = now;
          console.log(
            `[SignBridge CV Diagnostic] Video: ${video.videoWidth}x${video.videoHeight} (readyState=${video.readyState}), MP: ${landmarkerRef.current ? 'Ready' : 'Loading'}, Hands: ${handCount}, Feats: ${features.length}`
          );
        }

        onPredict(features, rawHands)
          .then((res) => {
            if (res) {
              if (res.status === 'recognized') {
                updateStatus('recognized');
              } else if (res.status === 'uncertain') {
                updateStatus('uncertain');
              } else {
                updateStatus('no_hand');
              }
            }
          })
          .catch(() => {
            updateStatus('unavailable');
          })
          .finally(() => {
            inFlightRef.current = false;
          });
      } else {
        // Only fire empty prediction once when transitioning from hands -> no hands
        if (hadHandsRef.current) {
          hadHandsRef.current = false;
          updateStatus('no_hand');
          onPredict([], []);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
  }, [onPredict, updateStatus, isPredicting, isMirrored, showSkeleton, predictionResult, heuristicGesture, onHeuristicGesture]);

  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  useEffect(() => {
    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current());
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive]);

  // Demo gesture preview handler (works offline and camera-less)
  const handleSelectDemoGesture = (gesture: DemoGesture) => {
    stopCamera();
    clearDemoInterval();
    setActiveDemoGesture(gesture.id);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Render dark stage background
        ctx.fillStyle = '#080d19';
        ctx.fillRect(0, 0, 640, 480);

        // Watermark text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = '600 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`DEMO GESTURE MODE: ${gesture.name}`, 320, 40);

        // Draw landmarks using anatomical utility
        renderHandsOnCanvas(ctx, gesture.landmarks, 640, 480, {
          showSkeleton: true,
          showBoundingBox: true,
          activeLabel: `Demo: ${gesture.label}`,
          confidence: gesture.id === 'demo_uncertain' ? 0.15 : 0.95,
        });
      }
    }

    setDetectedHands(gesture.handsCount);
    updateStatus('detecting');
    const features = extractFeaturesFromLandmarks(gesture.landmarks);

    const runDemoPredict = () => {
      onPredict(features, gesture.landmarks).then((res) => {
        if (res?.status === 'recognized') {
          updateStatus('recognized');
        } else if (res?.status === 'uncertain') {
          updateStatus('uncertain');
        }
      });
    };

    runDemoPredict();
    // Sustained stream simulation for temporal smoothing and auto-append verification
    demoIntervalRef.current = setInterval(runDemoPredict, 160);
  };

  // Status HUD text builder
  const getHudStatusText = () => {
    if (cameraStatus === 'initializing') return 'INITIALIZING CAMERA...';
    if (!cameraActive && activeDemoGesture) return 'DEMO MODE';
    if (detectedHands === 0) return 'NO HAND DETECTED';
    if (predictionResult?.status === 'recognized' && predictionResult.label) {
      return `RECOGNIZED: ${predictionResult.label}`;
    }
    if (heuristicGesture) return `HEURISTIC: ${heuristicGesture.toUpperCase()}`;
    if (predictionResult?.status === 'uncertain') return 'UNCERTAIN GESTURE';
    return 'DETECTING HAND...';
  };

  return (
    <div className="webcam-container">
      {/* Video & Canvas Aspect Box */}
      <div className="webcam-aspect-box">
        {/* Offscreen video element used as feed source (kept active for frame decoding) */}
        <video ref={videoRef} playsInline muted className="webcam-source-video" />

        {/* Mirrored Canvas with Landmark Overlays */}
        <canvas ref={canvasRef} className="webcam-canvas" />

        {/* Inactive State Screen */}
        {!cameraActive && !activeDemoGesture && (
          <div className="webcam-inactive-overlay">
            <div className="webcam-inactive-icon">
              {isInitializing ? (
                <RefreshCw size={36} className="animate-spin text-cyan-400" />
              ) : (
                <Camera size={36} className="text-cyan-400" />
              )}
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {isInitializing ? 'Connecting to Camera...' : 'Camera Inactive'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
              {isInitializing
                ? 'Requesting browser media permissions. Please click Allow if prompted.'
                : 'Click Start Webcam below to begin real-time ISL hand landmark tracking and gesture recognition.'}
            </p>

            <button
              onClick={() => startCamera()}
              disabled={isInitializing}
              className="btn btn-primary btn-md shadow-lg shadow-cyan-500/20"
              id="start-webcam-primary-btn"
            >
              {isInitializing ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Initializing Camera...</span>
                </>
              ) : (
                <>
                  <Camera size={15} />
                  <span>Start Webcam</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Live HUD Overlay (Active or Demo Mode) */}
        {(cameraActive || activeDemoGesture) && (
          <>
            <div className="webcam-hud-top-left">
              <span
                className={`status-dot ${
                  cameraStatus === 'recognized' || cameraStatus === 'detecting'
                    ? 'status-dot-active'
                    : 'status-dot-offline'
                }`}
              />
              <span className="font-semibold text-white">
                {getHudStatusText()}
              </span>
              {cameraActive && (
                <>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-300 font-mono">{fps} FPS</span>
                </>
              )}
            </div>

            <div className="webcam-hud-top-right">
              <Eye size={13} className={detectedHands > 0 ? 'text-cyan-400' : 'text-slate-400'} />
              <span className={detectedHands > 0 ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                {detectedHands === 0 ? '0 Hands' : detectedHands === 1 ? '1 Hand' : '2 Hands'}
              </span>
            </div>

            {/* Bottom HUD: Live prediction readout */}
            {predictionResult && (
              <div className="webcam-hud-bottom">
                <div className="flex items-center gap-2 flex-wrap">
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
                  <span className="text-xs font-medium text-slate-200 truncate max-w-xs">
                    {predictionResult.message}
                  </span>
                  {heuristicGesture && (
                    <span className="badge badge-accent text-[10px]">
                      Heuristic: {heuristicGesture}
                    </span>
                  )}
                </div>
                {predictionResult.latency_ms > 0 && (
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
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
        <div className="mt-2 w-full p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-2 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{permissionError}</span>
          </div>
          <button
            onClick={() => startCamera()}
            className="btn btn-secondary btn-sm shrink-0"
            title="Retry opening webcam"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Camera Controls, View Toggles & Device Selector Bar */}
      <div className="camera-controls-bar">
        <div className="flex items-center gap-2 flex-wrap">
          {cameraActive ? (
            <button onClick={stopCamera} className="btn btn-danger btn-sm" id="stop-camera-btn">
              <CameraOff size={14} />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              onClick={() => startCamera()}
              disabled={isInitializing}
              className="btn btn-primary btn-sm"
              id="start-camera-bar-btn"
            >
              {isInitializing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <Camera size={14} />
                  <span>{activeDemoGesture ? 'Switch to Webcam' : 'Start Webcam'}</span>
                </>
              )}
            </button>
          )}

          {/* View Toggles adapted from reference implementation */}
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            className={`btn btn-secondary btn-sm ${isMirrored ? 'border-cyan-500/50 text-cyan-300' : 'text-slate-400'}`}
            title={isMirrored ? 'Mirror View Active (Click to normal)' : 'Normal View (Click to mirror)'}
            aria-label="Toggle Mirror View"
          >
            <FlipHorizontal size={13} />
            <span>Mirror</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`btn btn-secondary btn-sm ${showSkeleton ? 'border-cyan-500/50 text-cyan-300' : 'text-slate-400'}`}
            title={showSkeleton ? 'Skeleton Overlay Visible' : 'Skeleton Overlay Hidden'}
            aria-label="Toggle Skeleton Overlay"
          >
            {showSkeleton ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Skeleton</span>
          </button>

          {/* Device selector if multiple video inputs are found */}
          {availableDevices.length > 1 && (
            <div className="camera-device-wrapper">
              <Sliders size={12} className="text-slate-400 shrink-0" />
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  if (cameraActive) startCamera(e.target.value);
                }}
                className="camera-device-select"
                aria-label="Select Camera Device"
              >
                {availableDevices.map((dev, i) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Demo Gesture Selector Chips */}
        <div className="demo-chips-group">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles size={12} className="text-cyan-400" />
            <span>Simulate:</span>
          </span>
          {DEMO_GESTURES.map((demo) => (
            <button
              key={demo.id}
              onClick={() => handleSelectDemoGesture(demo)}
              className={`chip-btn ${activeDemoGesture === demo.id ? 'chip-btn-active' : ''}`}
              title={demo.description}
            >
              {demo.label} ({demo.handsCount}H)
            </button>
          ))}
          {activeDemoGesture && (
            <button
              onClick={() => {
                clearDemoInterval();
                setActiveDemoGesture(null);
                setDetectedHands(0);
                updateStatus('idle');
                onPredict([], []);
              }}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Reset demo canvas"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebcamLandmarksCanvas;
