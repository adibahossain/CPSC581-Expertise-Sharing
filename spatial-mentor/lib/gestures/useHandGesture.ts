import { useEffect, useRef, useCallback, useState } from "react";
import { getHandLandmarker } from "@/lib/mediapipe/handTracker";
import { withSuppressedWasmLogs } from "@/lib/mediapipe/suppressWasmLogs";
import { recognizeGesture, GestureStabilizer } from "./recognizeHandGesture";
import type { GestureState, HandPointer } from "@/types";

const DETECT_INTERVAL_MS = 150;

export function useHandGesture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  onGesture: (
    gesture: GestureState,
    pointer: HandPointer | null,
    palmPointer: HandPointer | null
  ) => void
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stabilizerRef = useRef(new GestureStabilizer(3));
  const lastTimestampRef = useRef(0);
  const detectingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const detect = useCallback(async () => {
    if (detectingRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !active) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    if (video.currentTime === 0) return;

    detectingRef.current = true;
    try {
      const landmarker = await getHandLandmarker();

      const now = Math.round(performance.now());
      if (now <= lastTimestampRef.current) {
        detectingRef.current = false;
        return;
      }
      lastTimestampRef.current = now;

      const result = withSuppressedWasmLogs(() =>
        landmarker.detectForVideo(video, now)
      );

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        const indexTip = landmarks[8];
        const palmLandmarks = [landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
        const pointer = indexTip
          ? {
              // Mirror X so the crosshair matches the previewed hand motion.
              x: 1 - indexTip.x,
              y: indexTip.y,
            }
          : null;
        const palmPointer = palmLandmarks.every(Boolean)
          ? {
              x:
                1 -
                palmLandmarks.reduce((sum, landmark) => sum + landmark.x, 0) /
                  palmLandmarks.length,
              y:
                palmLandmarks.reduce((sum, landmark) => sum + landmark.y, 0) /
                palmLandmarks.length,
            }
          : null;
        const raw = recognizeGesture(landmarks);
        const stable = stabilizerRef.current.update(raw);
        onGesture(stable, pointer, palmPointer);
      } else {
        stabilizerRef.current.update("idle");
        onGesture("idle", null, null);
      }
    } catch {
      // MediaPipe inference error — skip this frame
    } finally {
      detectingRef.current = false;
    }
  }, [videoRef, active, onGesture]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const stabilizer = stabilizerRef.current;

    (async () => {
      setLoading(true);
      try {
        await getHandLandmarker();
        if (!cancelled) {
          setReady(true);
          setLoading(false);
          intervalRef.current = setInterval(detect, DETECT_INTERVAL_MS);
        }
      } catch {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      stabilizer.reset();
      lastTimestampRef.current = 0;
      detectingRef.current = false;
    };
  }, [active, detect]);

  return { loading, ready };
}
