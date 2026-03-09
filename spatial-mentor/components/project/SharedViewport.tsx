"use client";

import dynamic from "next/dynamic";
import AnnotationLayer from "./AnnotationLayer";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { demoPartLabels } from "@/lib/project/demoParts";
import { walkthroughSteps } from "@/lib/lesson/walkthrough";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

export default function SharedViewport() {
  const {
    activeTool,
    selectedObjectId,
    selectedAnnotationId,
    focusTarget,
    partTransforms,
    expertPointer,
    learnerPointer,
    gesturePointerOverride,
    partScales,
    partRotations,
    lessonPhase,
    walkthroughStepIndex,
    walkthroughTooltipStepId,
  } = useSessionStore();

  const currentStep = walkthroughSteps[walkthroughStepIndex] ?? null;
  const walkthroughTooltip =
    walkthroughTooltipStepId
      ? walkthroughSteps.find((step) => step.id === walkthroughTooltipStepId)
      : null;
  const activeGesturePointer = lessonPhase === "walkthrough" ? learnerPointer : expertPointer;
  const crosshairPointer = gesturePointerOverride ?? activeGesturePointer;

  const focusLabel =
    focusTarget?.kind === "part"
      ? focusTarget.label
      : focusTarget?.kind === "annotation"
        ? focusTarget.label
        : null;

  return (
    <div className="relative flex h-full min-h-[540px] w-full flex-1 overflow-hidden bg-zinc-950">
      <SceneCanvas />
      <AnnotationLayer />
      <div className="pointer-events-none absolute left-4 top-4 z-30 max-w-sm space-y-2">
        <div className="rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-xs text-white/90 backdrop-blur">
          <div className="font-medium text-white">
            {lessonPhase === "teaching"
              ? "Interactive Teaching Workspace"
              : lessonPhase === "walkthrough"
                ? "Learner Walkthrough Workspace"
                : "Walkthrough Complete"}
          </div>
          <div className="mt-1 text-white/70">
            {lessonPhase === "walkthrough" && currentStep
              ? currentStep.instruction
              : activeTool === "gesture"
              ? "Point at a part to move it, drift the crosshair near an edge lock-point to snap onto it and pinch to scale the part larger or smaller, or open your palm and move your hand to orbit the camera."
              : activeTool === "select"
              ? "Click and drag any part to reposition it. Pinch gestures adjust the left extension."
              : "Use the current annotation tool directly on the viewport."}
          </div>
        </div>

        {lessonPhase === "walkthrough" && currentStep && (
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 backdrop-blur">
            <div className="font-medium text-cyan-50">
              Step {walkthroughStepIndex + 1} of {walkthroughSteps.length}: {currentStep.title}
            </div>
            <div className="mt-1 text-cyan-100/75">{currentStep.instruction}</div>
          </div>
        )}

        {lessonPhase === "completed" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 backdrop-blur">
            <div className="font-medium text-emerald-50">Walkthrough completed</div>
            <div className="mt-1 text-emerald-100/75">
              The learner completed resize, move, and rotation tasks. Reset the lesson to teach
              again or start another walkthrough.
            </div>
          </div>
        )}

        {(selectedObjectId || selectedAnnotationId || focusLabel) && (
          <div className="rounded-xl border border-pink-500/30 bg-black/60 px-3 py-2 text-xs text-pink-100 backdrop-blur">
            {selectedObjectId && (
              <div>Selected part: {demoPartLabels[selectedObjectId]}</div>
            )}
            {selectedAnnotationId && !selectedObjectId && (
              <div>Selected annotation: ready to move, edit, or delete</div>
            )}
            {focusLabel && <div>Current focus: {focusLabel}</div>}
            {selectedObjectId === "leftExtension" && (
              <div>
                Extension offset: {partTransforms.leftExtensionX.toFixed(2)}. Drag or pinch to
                stretch the part.
              </div>
            )}
            {selectedObjectId && (
              <div>Scale: {partScales[selectedObjectId].toFixed(2)}x</div>
            )}
            {selectedObjectId && (
              <div>Rotation: {Math.round((partRotations[selectedObjectId] * 180) / Math.PI)}°</div>
            )}
          </div>
        )}
      </div>
      {walkthroughTooltip && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-40 max-w-md rounded-2xl border border-emerald-400/25 bg-black/80 px-4 py-3 text-sm text-emerald-50 shadow-2xl shadow-emerald-950/50 backdrop-blur">
          <div className="font-medium text-emerald-200">{walkthroughTooltip.tooltip}</div>
          <div className="mt-1 text-emerald-50/80">{walkthroughTooltip.blenderTip}</div>
        </div>
      )}
      {activeTool === "gesture" && crosshairPointer && (
        <div
          className="pointer-events-none absolute z-40"
          style={{
            left: `${crosshairPointer.x * 100}%`,
            top: `${crosshairPointer.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative h-8 w-8">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-pink-400/90" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-pink-400/90" />
            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pink-300 bg-pink-500/15 shadow-[0_0_14px_rgba(236,72,153,0.45)]" />
          </div>
        </div>
      )}
    </div>
  );
}
