import { create } from "zustand";
import type {
  Role,
  Annotation,
  LearnerReaction,
  AttentionState,
  GestureState,
  HandPointer,
  ActiveTool,
  SessionMode,
  DemoPartId,
  FocusTarget,
  InteractionMode,
  PartTransforms,
  PartScales,
  PartRotations,
  LessonPhase,
} from "@/types";
import {
  createPartFocusTarget,
  cycleExtensionOffset,
  cycleTopNotchOffset,
} from "@/lib/project/demoParts";
import {
  defaultPartRotations,
  defaultPartScales,
  defaultPartTransforms,
  walkthroughSteps,
} from "@/lib/lesson/walkthrough";

interface SessionState {
  sessionId: string | null;
  mode: SessionMode;
  role: Role | null;

  annotations: Annotation[];
  activeTool: ActiveTool;
  focusTarget: FocusTarget | null;
  selectedObjectId: DemoPartId | null;
  hoveredObjectId: DemoPartId | null;
  selectedAnnotationId: string | null;
  interactionMode: InteractionMode;
  partTransforms: PartTransforms;
  partScales: PartScales;
  partRotations: PartRotations;

  expertGesture: GestureState;
  expertPointer: HandPointer | null;
  expertPalmPointer: HandPointer | null;
  gesturePointerOverride: HandPointer | null;
  learnerGesture: GestureState;
  learnerPointer: HandPointer | null;
  learnerPalmPointer: HandPointer | null;
  learnerReaction: LearnerReaction | null;
  attentionState: AttentionState;

  lessonPhase: LessonPhase;
  walkthroughStepIndex: number;
  walkthroughTooltipStepId: string | null;

  webcamEnabled: boolean;
  micEnabled: boolean;

  setSessionId: (id: string) => void;
  setMode: (mode: SessionMode) => void;
  setRole: (role: Role) => void;

  addAnnotation: (annotation: Annotation) => void;
  replaceAnnotations: (annotations: Annotation[]) => void;
  updateAnnotation: (
    id: string,
    updater: Partial<Annotation> | ((annotation: Annotation) => Annotation)
  ) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  undoLastAnnotation: () => void;
  setActiveTool: (tool: ActiveTool) => void;
  setFocusTarget: (target: FocusTarget | null) => void;
  setSelectedObjectId: (id: DemoPartId | null) => void;
  setHoveredObjectId: (id: DemoPartId | null) => void;
  selectObject: (id: DemoPartId) => void;
  clearObjectSelection: () => void;
  setSelectedAnnotationId: (id: string | null) => void;
  selectAnnotation: (id: string) => void;
  clearAnnotationSelection: () => void;
  clearSelections: () => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setPartTransforms: (transforms: Partial<PartTransforms>) => void;
  setPartTransform: (part: keyof PartTransforms, value: number) => void;
  setPartScales: (scales: Partial<PartScales>) => void;
  setPartRotations: (rotations: Partial<PartRotations>) => void;
  setGesturePointerOverride: (pointer: HandPointer | null) => void;

  setExpertGesture: (gesture: GestureState) => void;
  setExpertPointer: (pointer: HandPointer | null) => void;
  setExpertPalmPointer: (pointer: HandPointer | null) => void;
  runExpertGestureAction: (gesture: GestureState) => void;
  setLearnerGesture: (gesture: GestureState) => void;
  setLearnerPointer: (pointer: HandPointer | null) => void;
  setLearnerPalmPointer: (pointer: HandPointer | null) => void;
  setLearnerReaction: (reaction: LearnerReaction | null) => void;
  setAttentionState: (state: AttentionState) => void;
  startWalkthrough: () => void;
  advanceWalkthrough: () => void;
  resetLesson: () => void;
  showWalkthroughTooltip: (stepId: string | null) => void;

  setWebcamEnabled: (enabled: boolean) => void;
  setMicEnabled: (enabled: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  mode: "demo",
  role: null,

  annotations: [],
  activeTool: "select",
  focusTarget: null,
  selectedObjectId: null,
  hoveredObjectId: null,
  selectedAnnotationId: null,
  interactionMode: "idle",
  partTransforms: defaultPartTransforms,
  partScales: defaultPartScales,
  partRotations: defaultPartRotations,

  expertGesture: "idle",
  expertPointer: null,
  expertPalmPointer: null,
  gesturePointerOverride: null,
  learnerGesture: "idle",
  learnerPointer: null,
  learnerPalmPointer: null,
  learnerReaction: null,
  attentionState: "no_signal",

  lessonPhase: "teaching",
  walkthroughStepIndex: 0,
  walkthroughTooltipStepId: null,

  webcamEnabled: false,
  micEnabled: false,

  setSessionId: (id) => set({ sessionId: id }),
  setMode: (mode) => set({ mode }),
  setRole: (role) => set({ role }),

  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  replaceAnnotations: (annotations) => set({ annotations }),
  updateAnnotation: (id, updater) =>
    set((state) => ({
      annotations: state.annotations.map((annotation) => {
        if (annotation.id !== id) return annotation;
        return typeof updater === "function"
          ? updater(annotation)
          : { ...annotation, ...updater };
      }),
    })),
  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId:
        state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
      focusTarget:
        state.focusTarget?.kind === "annotation" &&
        state.focusTarget.annotationId === id
          ? null
          : state.focusTarget,
    })),
  clearAnnotations: () =>
    set({ annotations: [], selectedAnnotationId: null, focusTarget: null }),
  undoLastAnnotation: () =>
    set((state) => {
      const nextAnnotations = state.annotations.slice(0, -1);
      const removed = state.annotations[state.annotations.length - 1];
      const removedId = removed?.id;
      return {
        annotations: nextAnnotations,
        selectedAnnotationId:
          state.selectedAnnotationId === removedId
            ? null
            : state.selectedAnnotationId,
        focusTarget:
          state.focusTarget?.kind === "annotation" &&
          state.focusTarget.annotationId === removedId
            ? null
            : state.focusTarget,
      };
    }),
  setActiveTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      selectedAnnotationId:
        tool === "select" ? state.selectedAnnotationId : null,
      interactionMode: "idle",
    })),
  setFocusTarget: (target) => set({ focusTarget: target }),
  setSelectedObjectId: (id) =>
    set({
      selectedObjectId: id,
      selectedAnnotationId: null,
    }),
  setHoveredObjectId: (id) =>
    set((state) => ({
      hoveredObjectId: id,
      interactionMode:
        state.interactionMode === "dragging_object" ||
        state.interactionMode === "dragging_annotation"
          ? state.interactionMode
          : id
            ? "hovering_part"
            : "idle",
    })),
  selectObject: (id) =>
    set({
      selectedObjectId: id,
      selectedAnnotationId: null,
      focusTarget: createPartFocusTarget(id),
      interactionMode: "idle",
    }),
  clearObjectSelection: () =>
    set({
      selectedObjectId: null,
      hoveredObjectId: null,
      interactionMode: "idle",
    }),
  setSelectedAnnotationId: (id) =>
    set({
      selectedAnnotationId: id,
      selectedObjectId: null,
    }),
  selectAnnotation: (id) =>
    set((state) => {
      const annotation = state.annotations.find((item) => item.id === id);
      return {
        selectedAnnotationId: id,
        selectedObjectId: null,
        focusTarget: annotation
          ? {
              kind: "annotation",
              annotationId: annotation.id,
              label:
                annotation.type === "text" && annotation.text
                  ? annotation.text
                  : `${annotation.type[0].toUpperCase()}${annotation.type.slice(1)} Annotation`,
              position: annotation.position,
            }
          : state.focusTarget,
        interactionMode: "idle",
      };
    }),
  clearAnnotationSelection: () =>
    set({
      selectedAnnotationId: null,
      interactionMode: "idle",
    }),
  clearSelections: () =>
    set({
      selectedObjectId: null,
      hoveredObjectId: null,
      selectedAnnotationId: null,
      interactionMode: "idle",
      focusTarget: null,
    }),
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setPartTransforms: (transforms) =>
    set((state) => ({
      partTransforms: { ...state.partTransforms, ...transforms },
    })),
  setPartTransform: (part, value) =>
    set((state) => ({
      partTransforms: { ...state.partTransforms, [part]: value },
    })),
  setPartScales: (scales) =>
    set((state) => ({
      partScales: { ...state.partScales, ...scales },
    })),
  setPartRotations: (rotations) =>
    set((state) => ({
      partRotations: { ...state.partRotations, ...rotations },
    })),
  setGesturePointerOverride: (pointer) => set({ gesturePointerOverride: pointer }),

  setExpertGesture: (gesture) => set({ expertGesture: gesture }),
  setExpertPointer: (pointer) => set({ expertPointer: pointer }),
  setExpertPalmPointer: (pointer) => set({ expertPalmPointer: pointer }),
  runExpertGestureAction: (gesture) =>
    set((state) => {
      if (state.activeTool === "gesture") {
        if (gesture === "open_palm") {
          return {
            expertGesture: gesture,
            selectedObjectId: null,
            hoveredObjectId: null,
            selectedAnnotationId: null,
            focusTarget: null,
            interactionMode: "idle",
          };
        }

        return {
          expertGesture: gesture,
        };
      }

      const targetId =
        gesture === "pinch"
          ? state.hoveredObjectId ?? state.selectedObjectId ?? "leftExtension"
          : state.hoveredObjectId ?? state.selectedObjectId;
      const nextState: Partial<SessionState> = {
        expertGesture: gesture,
      };

      if (gesture === "point" && targetId) {
        nextState.selectedObjectId = targetId;
        nextState.selectedAnnotationId = null;
        nextState.focusTarget = createPartFocusTarget(targetId);
      }

      if (gesture === "pinch" && targetId) {
        nextState.selectedObjectId = targetId;
        nextState.selectedAnnotationId = null;
        nextState.focusTarget = createPartFocusTarget(targetId);
        nextState.partTransforms = { ...state.partTransforms };

        if (targetId === "leftExtension") {
          nextState.partTransforms.leftExtensionX = cycleExtensionOffset(
            state.partTransforms.leftExtensionX
          );
        }
      }

      if (gesture === "thumbs_up" && state.selectedObjectId === "topNotch") {
        nextState.partTransforms = {
          ...state.partTransforms,
          topNotchY: cycleTopNotchOffset(state.partTransforms.topNotchY),
        };
      }

      if (gesture === "open_palm") {
        nextState.selectedObjectId = null;
        nextState.hoveredObjectId = null;
        nextState.selectedAnnotationId = null;
        nextState.focusTarget = null;
        nextState.interactionMode = "idle";
      }

      if (gesture === "thumbs_up" && state.selectedObjectId) {
        nextState.focusTarget = createPartFocusTarget(state.selectedObjectId);
      }

      return nextState;
    }),
  setLearnerGesture: (gesture) => set({ learnerGesture: gesture }),
  setLearnerPointer: (pointer) => set({ learnerPointer: pointer }),
  setLearnerPalmPointer: (pointer) => set({ learnerPalmPointer: pointer }),
  setLearnerReaction: (reaction) => set({ learnerReaction: reaction }),
  setAttentionState: (state) => set({ attentionState: state }),
  startWalkthrough: () =>
    set({
      annotations: [],
      activeTool: "gesture",
      focusTarget: createPartFocusTarget(walkthroughSteps[0].targetPartId),
      selectedObjectId: walkthroughSteps[0].targetPartId,
      hoveredObjectId: walkthroughSteps[0].targetPartId,
      selectedAnnotationId: null,
      interactionMode: "idle",
      partTransforms: { ...defaultPartTransforms },
      partScales: { ...defaultPartScales },
      partRotations: { ...defaultPartRotations },
      expertGesture: "idle",
      expertPointer: null,
      expertPalmPointer: null,
      gesturePointerOverride: null,
      learnerGesture: "idle",
      learnerPointer: null,
      learnerPalmPointer: null,
      learnerReaction: null,
      lessonPhase: "walkthrough",
      walkthroughStepIndex: 0,
      walkthroughTooltipStepId: null,
    }),
  advanceWalkthrough: () =>
    set((state) => {
      const nextIndex = state.walkthroughStepIndex + 1;
      if (nextIndex >= walkthroughSteps.length) {
        return {
          lessonPhase: "completed" as const,
          walkthroughStepIndex: state.walkthroughStepIndex,
          walkthroughTooltipStepId: null,
          focusTarget: null,
          selectedObjectId: null,
          hoveredObjectId: null,
          gesturePointerOverride: null,
        };
      }

      return {
        walkthroughStepIndex: nextIndex,
        walkthroughTooltipStepId: null,
        focusTarget: createPartFocusTarget(walkthroughSteps[nextIndex].targetPartId),
        selectedObjectId: walkthroughSteps[nextIndex].targetPartId,
        hoveredObjectId: walkthroughSteps[nextIndex].targetPartId,
        gesturePointerOverride: null,
      };
    }),
  resetLesson: () =>
    set({
      annotations: [],
      activeTool: "select",
      focusTarget: null,
      selectedObjectId: null,
      hoveredObjectId: null,
      selectedAnnotationId: null,
      interactionMode: "idle",
      partTransforms: { ...defaultPartTransforms },
      partScales: { ...defaultPartScales },
      partRotations: { ...defaultPartRotations },
      expertGesture: "idle",
      expertPointer: null,
      expertPalmPointer: null,
      gesturePointerOverride: null,
      learnerGesture: "idle",
      learnerPointer: null,
      learnerPalmPointer: null,
      learnerReaction: null,
      lessonPhase: "teaching",
      walkthroughStepIndex: 0,
      walkthroughTooltipStepId: null,
    }),
  showWalkthroughTooltip: (stepId) => set({ walkthroughTooltipStepId: stepId }),

  setWebcamEnabled: (enabled) => set({ webcamEnabled: enabled }),
  setMicEnabled: (enabled) => set({ micEnabled: enabled }),
}));
