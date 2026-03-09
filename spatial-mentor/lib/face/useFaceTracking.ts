import { useEffect, useRef, useCallback, useState } from "react";
import { getFaceLandmarker } from "@/lib/mediapipe/faceLandmarker";
import { withSuppressedWasmLogs } from "@/lib/mediapipe/suppressWasmLogs";
import { estimateConfusion } from "./estimateConfusion";
import { estimateAttention } from "@/lib/attention/estimateAttentionToTarget";
import type { AttentionState } from "@/types";

const DETECT_INTERVAL_MS = 200;

interface FaceTrackingResult {
  attentionState: AttentionState;
  confusionScore: number;
}

export function useFaceTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  onResult: (result: FaceTrackingResult) => void
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      const landmarker = await getFaceLandmarker();

      const now = Math.round(performance.now());
      if (now <= lastTimestampRef.current) {
        detectingRef.current = false;
        return;
      }
      lastTimestampRef.current = now;

      const result = withSuppressedWasmLogs(() =>
        landmarker.detectForVideo(video, now)
      );

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];
        const blendshapes = result.faceBlendshapes?.[0]?.categories ?? [];

        const attentionState = estimateAttention(landmarks, blendshapes);
        const confusionScore = estimateConfusion(blendshapes);

        onResult({ attentionState, confusionScore });
      } else {
        onResult({ attentionState: "no_signal", confusionScore: 0 });
      }
    } catch {
      // MediaPipe inference error — skip this frame
    } finally {
      detectingRef.current = false;
    }
  }, [videoRef, active, onResult]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        await getFaceLandmarker();
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
      lastTimestampRef.current = 0;
      detectingRef.current = false;
    };
  }, [active, detect]);

  return { loading, ready };
}
