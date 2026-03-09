import { useEffect, useRef } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { sessionChannel, type SyncPayload } from "./sessionChannel";
import type {
  LearnerReaction,
  AttentionState,
  GestureState,
  ActiveTool,
  DemoPartId,
  FocusTarget,
  PartTransforms,
  PartScales,
  PartRotations,
  LessonPhase,
} from "@/types";
import { walkthroughSteps } from "@/lib/lesson/walkthrough";
import { createPartFocusTarget } from "@/lib/project/demoParts";

/**
 * Connects the Zustand store to the BroadcastChannel sync layer.
 * Sends local changes out and applies incoming remote changes.
 */
export function useSyncSession() {
  const store = useSessionStore;
  const sessionId = useSessionStore((s) => s.sessionId);
  const isApplyingRemoteRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    sessionChannel.connect(sessionId);

    // Subscribe to incoming messages from other tabs/windows
    const unsub = sessionChannel.subscribe((payload: SyncPayload) => {
      const state = store.getState();
      isApplyingRemoteRef.current = true;

      try {
        switch (payload.type) {
          case "annotations_replace":
            state.replaceAnnotations(payload.data as typeof state.annotations);
            break;
          case "reaction":
            state.setLearnerReaction(payload.data as LearnerReaction | null);
            break;
          case "attention":
            state.setAttentionState(payload.data as AttentionState);
            break;
          case "gesture_expert":
            state.setExpertGesture(payload.data as GestureState);
            break;
          case "gesture_learner":
            state.setLearnerGesture(payload.data as GestureState);
            break;
          case "tool_change":
            state.setActiveTool(payload.data as ActiveTool);
            break;
          case "focus_target":
            state.setFocusTarget(payload.data as FocusTarget | null);
            break;
          case "selection_change": {
            const selection = payload.data as {
              selectedObjectId: DemoPartId | null;
              focusTarget: FocusTarget | null;
            };
            state.setSelectedObjectId(selection.selectedObjectId);
            state.setFocusTarget(selection.focusTarget);
            break;
          }
          case "part_transforms":
            state.setPartTransforms(payload.data as PartTransforms);
            break;
          case "part_scales":
            state.setPartScales(payload.data as PartScales);
            break;
          case "part_rotations":
            state.setPartRotations(payload.data as PartRotations);
            break;
          case "lesson_state": {
            const lessonState = payload.data as {
              lessonPhase: LessonPhase;
              walkthroughStepIndex: number;
              walkthroughTooltipStepId: string | null;
            };
            const focusPart =
              lessonState.lessonPhase === "walkthrough"
                ? walkthroughSteps[lessonState.walkthroughStepIndex]?.targetPartId ?? null
                : null;
            store.setState({
              lessonPhase: lessonState.lessonPhase,
              walkthroughStepIndex: lessonState.walkthroughStepIndex,
              walkthroughTooltipStepId: lessonState.walkthroughTooltipStepId,
              focusTarget: focusPart ? createPartFocusTarget(focusPart) : null,
            });
            break;
          }
        }
      } finally {
        queueMicrotask(() => {
          isApplyingRemoteRef.current = false;
        });
      }
    });

    // Subscribe to local store changes and broadcast them
    const unsubStore = store.subscribe((state, prevState) => {
      if (isApplyingRemoteRef.current) return;

      if (state.annotations !== prevState.annotations) {
        sessionChannel.sendAnnotations(state.annotations);
      }

      if (state.learnerReaction !== prevState.learnerReaction) {
        sessionChannel.sendReaction(state.learnerReaction);
      }
      if (state.attentionState !== prevState.attentionState) {
        sessionChannel.sendAttention(state.attentionState);
      }
      if (state.expertGesture !== prevState.expertGesture) {
        sessionChannel.sendExpertGesture(state.expertGesture);
      }
      if (state.learnerGesture !== prevState.learnerGesture) {
        sessionChannel.sendLearnerGesture(state.learnerGesture);
      }
      if (state.activeTool !== prevState.activeTool) {
        sessionChannel.sendToolChange(state.activeTool);
      }
      if (
        state.focusTarget !== prevState.focusTarget ||
        state.selectedObjectId !== prevState.selectedObjectId
      ) {
        sessionChannel.sendSelection({
          selectedObjectId: state.selectedObjectId,
          focusTarget: state.focusTarget,
        });
      }
      if (state.partTransforms !== prevState.partTransforms) {
        sessionChannel.sendPartTransforms(state.partTransforms);
      }
      if (state.partScales !== prevState.partScales) {
        sessionChannel.sendPartScales(state.partScales);
      }
      if (state.partRotations !== prevState.partRotations) {
        sessionChannel.sendPartRotations(state.partRotations);
      }
      if (
        state.lessonPhase !== prevState.lessonPhase ||
        state.walkthroughStepIndex !== prevState.walkthroughStepIndex ||
        state.walkthroughTooltipStepId !== prevState.walkthroughTooltipStepId
      ) {
        sessionChannel.sendLessonState({
          lessonPhase: state.lessonPhase,
          walkthroughStepIndex: state.walkthroughStepIndex,
          walkthroughTooltipStepId: state.walkthroughTooltipStepId,
        });
      }
    });

    return () => {
      unsub();
      unsubStore();
      sessionChannel.disconnect();
    };
  }, [sessionId, store]);
}
