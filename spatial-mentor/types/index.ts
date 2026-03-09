export type Role = "expert" | "learner";

export type AnnotationType = "draw" | "arrow" | "marker" | "text" | "focus";

export type Point = {
  x: number;
  y: number;
};

export type HandPointer = Point;

export type DemoPartId =
  | "mainBody"
  | "topNotch"
  | "leftExtension"
  | "platform";

export type FocusTarget =
  | {
      kind: "part";
      partId: DemoPartId;
      label: string;
    }
  | {
      kind: "annotation";
      annotationId: string;
      label: string;
      position?: Point;
    };

export type PartTransforms = {
  mainBodyX: number;
  mainBodyY: number;
  topNotchX: number;
  leftExtensionX: number;
  leftExtensionY: number;
  topNotchY: number;
  platformX: number;
  platformY: number;
};

export type PartScales = {
  mainBody: number;
  topNotch: number;
  leftExtension: number;
  platform: number;
};

export type PartRotations = {
  mainBody: number;
  topNotch: number;
  leftExtension: number;
  platform: number;
};

export type Annotation = {
  id: string;
  type: AnnotationType;
  points?: Point[];
  start?: Point;
  end?: Point;
  position?: Point;
  text?: string;
  anchorPartId?: DemoPartId;
  anchorLabel?: string;
  color: string;
  createdBy: Role;
  createdAt: number;
};

export type LearnerReaction =
  | "yes"
  | "no"
  | "thumbs_up"
  | "thumbs_down"
  | "explain_please"
  | "demonstrate_again";

export type AttentionState = "target_locked" | "uncertain" | "away" | "no_signal";

export type GestureState =
  | "idle"
  | "point"
  | "pinch"
  | "open_palm"
  | "thumbs_up"
  | "thumbs_down";

export type ActiveTool = AnnotationType | "select" | "gesture" | null;

export type SessionMode = "demo" | "live";

export type LessonPhase = "teaching" | "walkthrough" | "completed";

export type WalkthroughTaskType = "scale" | "move" | "rotate";

export type WalkthroughStep = {
  id: string;
  title: string;
  instruction: string;
  taskType: WalkthroughTaskType;
  targetPartId: DemoPartId;
  tooltip: string;
  blenderTip: string;
};

export type InteractionMode =
  | "idle"
  | "hovering_part"
  | "placing_annotation"
  | "dragging_object"
  | "dragging_annotation"
  | "editing_annotation";
