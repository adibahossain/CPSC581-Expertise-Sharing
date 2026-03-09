import type { DemoPartId, FocusTarget } from "@/types";

export const demoPartLabels: Record<DemoPartId, string> = {
  mainBody: "Main Body",
  topNotch: "Top Notch",
  leftExtension: "Left Extension",
  platform: "Base Platform",
};

export function createPartFocusTarget(partId: DemoPartId): FocusTarget {
  return {
    kind: "part",
    partId,
    label: demoPartLabels[partId],
  };
}

export function cycleExtensionOffset(current: number) {
  const next = current + 0.18;
  return next > 0.6 ? 0 : Number(next.toFixed(3));
}

export function cycleTopNotchOffset(current: number) {
  return current > 0 ? 0 : 0.18;
}
