import type {
  Annotation,
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

export interface SyncPayload {
  originId?: string;
  type:
    | "annotations_replace"
    | "reaction"
    | "attention"
    | "gesture_expert"
    | "gesture_learner"
    | "tool_change"
    | "focus_target"
    | "selection_change"
    | "part_transforms"
    | "part_scales"
    | "part_rotations"
    | "lesson_state";
  data: unknown;
}

type Listener = (payload: SyncPayload) => void;

/**
 * BroadcastChannel-based sync for same-machine demo and multi-tab sessions.
 * For production, this would be replaced with Socket.IO/WebSocket transport.
 */
class SessionChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<Listener> = new Set();
  private originId = "";

  connect(sessionId: string) {
    this.disconnect();
    if (typeof window === "undefined") return;

    this.originId = crypto.randomUUID();
    this.channel = new BroadcastChannel(`spatial-mentor-${sessionId}`);
    this.channel.onmessage = (event: MessageEvent<SyncPayload>) => {
      if (event.data.originId === this.originId) return;
      this.listeners.forEach((fn) => fn(event.data));
    };
  }

  disconnect() {
    this.channel?.close();
    this.channel = null;
    this.originId = "";
  }

  send(payload: SyncPayload) {
    this.channel?.postMessage({ ...payload, originId: this.originId });
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // Convenience methods
  sendAnnotations(annotations: Annotation[]) {
    this.send({ type: "annotations_replace", data: annotations });
  }

  sendReaction(reaction: LearnerReaction | null) {
    this.send({ type: "reaction", data: reaction });
  }

  sendAttention(state: AttentionState) {
    this.send({ type: "attention", data: state });
  }

  sendExpertGesture(gesture: GestureState) {
    this.send({ type: "gesture_expert", data: gesture });
  }

  sendLearnerGesture(gesture: GestureState) {
    this.send({ type: "gesture_learner", data: gesture });
  }

  sendToolChange(tool: ActiveTool) {
    this.send({ type: "tool_change", data: tool });
  }

  sendFocusTarget(target: FocusTarget | null) {
    this.send({ type: "focus_target", data: target });
  }

  sendSelection(data: {
    selectedObjectId: DemoPartId | null;
    focusTarget: FocusTarget | null;
  }) {
    this.send({ type: "selection_change", data });
  }

  sendPartTransforms(transforms: PartTransforms) {
    this.send({ type: "part_transforms", data: transforms });
  }

  sendPartScales(scales: PartScales) {
    this.send({ type: "part_scales", data: scales });
  }

  sendPartRotations(rotations: PartRotations) {
    this.send({ type: "part_rotations", data: rotations });
  }

  sendLessonState(data: {
    lessonPhase: LessonPhase;
    walkthroughStepIndex: number;
    walkthroughTooltipStepId: string | null;
  }) {
    this.send({ type: "lesson_state", data });
  }
}

export const sessionChannel = new SessionChannel();
