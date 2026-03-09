"use client";

import { useEffect, useCallback, useState } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { useWebcam } from "@/lib/webcam/useWebcam";
import { useHandGesture } from "@/lib/gestures/useHandGesture";
import { useFaceTracking } from "@/lib/face/useFaceTracking";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  BookOpen,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import AttentionIndicator from "@/components/session/AttentionIndicator";
import type { GestureState } from "@/types";

const REACTION_AUTO_CLEAR_MS = 4000;

export default function LearnerCamPanel() {
  const {
    learnerReaction,
    setLearnerGesture,
    setLearnerPointer,
    setLearnerPalmPointer,
    setLearnerReaction,
    setAttentionState,
    learnerGesture,
    mode,
    lessonPhase,
  } = useSessionStore();
  const { videoRef, active, error, start, stop } = useWebcam();
  const [confusionScore, setConfusionScore] = useState(0);

  const onGesture = useCallback(
    (
      g: GestureState,
      pointer: { x: number; y: number } | null,
      palmPointer: { x: number; y: number } | null
    ) => {
      setLearnerGesture(g);
      setLearnerPointer(pointer);
      setLearnerPalmPointer(palmPointer);
      if (g === "thumbs_up") setLearnerReaction("thumbs_up");
      else if (g === "thumbs_down") setLearnerReaction("thumbs_down");
    },
    [setLearnerGesture, setLearnerPointer, setLearnerPalmPointer, setLearnerReaction]
  );

  const onFaceResult = useCallback(
    (result: { attentionState: "target_locked" | "uncertain" | "away" | "no_signal"; confusionScore: number }) => {
      setAttentionState(result.attentionState);
      setConfusionScore(result.confusionScore);
    },
    [setAttentionState]
  );

  const { loading: handLoading } = useHandGesture(videoRef, active, onGesture);
  const { loading: faceLoading } = useFaceTracking(videoRef, active, onFaceResult);

  const reactionLabels: Record<string, string> = {
    yes: "Yes",
    no: "No",
    thumbs_up: "👍 Understood",
    thumbs_down: "👎 Confused",
    explain_please: "Explain please",
    demonstrate_again: "Demonstrate again",
  };

  const isLoading = handLoading || faceLoading;

  useEffect(() => {
    if (mode === "demo") start();
    return () => stop();
  }, [mode, start, stop]);

  useEffect(() => {
    if (active) return;
    setLearnerPointer(null);
    setLearnerPalmPointer(null);
  }, [active, setLearnerPalmPointer, setLearnerPointer]);

  useEffect(() => {
    if (!learnerReaction) return;

    const timeoutId = window.setTimeout(() => {
      setLearnerReaction(null);
    }, REACTION_AUTO_CLEAR_MS);

    return () => window.clearTimeout(timeoutId);
  }, [learnerReaction, setLearnerReaction]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-green-500/20 bg-card/80">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <BookOpen className="h-3.5 w-3.5 text-green-400" />
        <span className="text-xs font-medium text-green-400">Learner</span>
        <Badge
          variant="outline"
          className="border-green-500/20 bg-green-500/10 px-1.5 py-0 text-[10px] text-green-300"
        >
          {lessonPhase === "walkthrough" ? "Driving walkthrough" : "Responding"}
        </Badge>
        <div className="ml-auto flex items-center gap-1.5">
          {isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {learnerReaction && (
            <Badge
              variant="outline"
              className="border-green-500/30 bg-green-500/10 px-1.5 py-0 text-[10px] text-green-400"
            >
              {reactionLabels[learnerReaction]}
            </Badge>
          )}
          {learnerGesture !== "idle" && !learnerReaction && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-400"
            >
              {learnerGesture}
            </Badge>
          )}
          {active && learnerGesture === "idle" && !learnerReaction && !isLoading && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400">Tracking</span>
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

        {/* Confusion indicator overlay */}
        {active && confusionScore > 0.35 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 text-[10px] text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            May need clarification
          </div>
        )}
      </div>

      <div className="border-t border-border px-2 py-1.5">
        <AttentionIndicator />
      </div>
    </div>
  );
}
