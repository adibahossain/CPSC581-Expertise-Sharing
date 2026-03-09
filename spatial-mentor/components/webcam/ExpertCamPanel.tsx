"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { useWebcam } from "@/lib/webcam/useWebcam";
import { useHandGesture } from "@/lib/gestures/useHandGesture";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  Hand,
  GraduationCap,
  Loader2,
} from "lucide-react";
import type { GestureState } from "@/types";

export default function ExpertCamPanel() {
  const {
    expertGesture,
    setExpertGesture,
    setExpertPointer,
    setExpertPalmPointer,
    runExpertGestureAction,
    mode,
    activeTool,
    lessonPhase,
  } =
    useSessionStore();
  const { videoRef, active, error, start, stop } = useWebcam();
  const lastGestureRef = useRef<GestureState>("idle");

  const onGesture = useCallback(
    (
      g: GestureState,
      pointer: { x: number; y: number } | null,
      palmPointer: { x: number; y: number } | null
    ) => {
      setExpertGesture(g);
      setExpertPointer(pointer);
      setExpertPalmPointer(palmPointer);
    },
    [setExpertGesture, setExpertPointer, setExpertPalmPointer]
  );

  const { loading, ready } = useHandGesture(videoRef, active, onGesture);

  useEffect(() => {
    if (mode === "demo") start();
    return () => stop();
  }, [mode, start, stop]);

  useEffect(() => {
    if (activeTool === "gesture") return;
    if (expertGesture !== "idle" && expertGesture !== lastGestureRef.current) {
      runExpertGestureAction(expertGesture);
    }
    lastGestureRef.current = expertGesture;
  }, [activeTool, expertGesture, runExpertGestureAction]);

  useEffect(() => {
    if (active) return;
    setExpertPointer(null);
    setExpertPalmPointer(null);
  }, [active, setExpertPalmPointer, setExpertPointer]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-pink-500/20 bg-card/80">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <GraduationCap className="h-3.5 w-3.5 text-pink-400" />
        <span className="text-xs font-medium text-pink-400">Expert</span>
        <Badge
          variant="outline"
          className="border-pink-500/20 bg-pink-500/10 px-1.5 py-0 text-[10px] text-pink-300"
        >
          {lessonPhase === "teaching"
            ? "Teaching"
            : lessonPhase === "walkthrough"
              ? "Observing walkthrough"
              : "Reviewing"}
        </Badge>
        <div className="ml-auto flex items-center gap-1.5">
          {loading && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {expertGesture !== "idle" && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-400"
            >
              <Hand className="h-2.5 w-2.5" />
              {expertGesture}
            </Badge>
          )}
          {active && expertGesture === "idle" && !loading && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400">
                {ready ? "Tracking" : "Live"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-zinc-900">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-cover ${active ? "" : "hidden"}`}
          style={{ transform: "scaleX(-1)" }}
        />
        {!active && (
          <button
            onClick={start}
            className="flex flex-col items-center gap-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            {error ? (
              <CameraOff className="h-6 w-6" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            <span className="text-[10px]">
              {error || "Click to enable camera"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
