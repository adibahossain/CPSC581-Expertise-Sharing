import type {
  DemoPartId,
  PartRotations,
  PartScales,
  PartTransforms,
  WalkthroughStep,
} from "@/types";

export const defaultPartTransforms: PartTransforms = {
  mainBodyX: 0,
  mainBodyY: 0,
  topNotchX: 0,
  leftExtensionX: 0,
  leftExtensionY: 0,
  topNotchY: 0,
  platformX: 0,
  platformY: 0,
};

export const defaultPartScales: PartScales = {
  mainBody: 1,
  topNotch: 1,
  leftExtension: 1,
  platform: 1,
};

export const defaultPartRotations: PartRotations = {
  mainBody: 0,
  topNotch: 0,
  leftExtension: 0,
  platform: 0,
};

export const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "scale-top-notch",
    title: "Resize the top notch",
    instruction:
      "Use learner pinch gestures on the top notch scale handles and make it noticeably larger.",
    taskType: "scale",
    targetPartId: "topNotch",
    tooltip: "Nice. You resized the top notch using a gesture-driven scale interaction.",
    blenderTip:
      "In Blender this maps closest to selecting the part and pressing S to scale, then moving the mouse to dial in the new size.",
  },
  {
    id: "move-left-extension",
    title: "Drag the left extension",
    instruction:
      "Pinch the left extension and drag it toward the center-right of the workspace until it lines up with the main body.",
    taskType: "move",
    targetPartId: "leftExtension",
    tooltip: "Great. You repositioned the extension just like a grab-and-move edit.",
    blenderTip:
      "In Blender this is closest to pressing G to grab, then constraining or nudging the object into place with the mouse or axis keys.",
  },
  {
    id: "rotate-main-body",
    title: "Rotate the main body",
    instruction:
      "Snap to the rotation handle above the main body, pinch, and twist it clockwise to angle the part.",
    taskType: "rotate",
    targetPartId: "mainBody",
    tooltip: "Perfect. Rotation is often the final spatial adjustment before confirming shape.",
    blenderTip:
      "In Blender you would normally select the object, press R to rotate, then move the mouse or type an exact angle for precision.",
  },
];

function isWithinRange(value: number, min: number, max: number) {
  return value >= min && value <= max;
}

export function isWalkthroughStepComplete(
  stepId: string,
  partTransforms: PartTransforms,
  partScales: PartScales,
  partRotations: PartRotations
) {
  switch (stepId) {
    case "scale-top-notch":
      return partScales.topNotch >= 1.35;
    case "move-left-extension":
      return (
        isWithinRange(partTransforms.leftExtensionX, -0.2, 0.9) &&
        isWithinRange(partTransforms.leftExtensionY, -0.05, 0.85)
      );
    case "rotate-main-body":
      return partRotations.mainBody <= -0.35;
    default:
      return false;
  }
}

export function getWalkthroughFocusPart(stepId: string): DemoPartId | null {
  const step = walkthroughSteps.find((item) => item.id === stepId);
  return step?.targetPartId ?? null;
}
