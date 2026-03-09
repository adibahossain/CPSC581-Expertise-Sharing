import type { GestureState } from "@/types";

/**
 * Hand landmark indices (MediaPipe):
 * 0: wrist, 4: thumb tip, 8: index tip, 12: middle tip,
 * 16: ring tip, 20: pinky tip
 * MCP joints: 5(index), 9(middle), 13(ring), 17(pinky)
 */

interface Landmark {
  x: number;
  y: number;
  z: number;
}

function distance(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function isFingerExtended(tip: Landmark, mcp: Landmark, wrist: Landmark): boolean {
  return distance(tip, wrist) > distance(mcp, wrist) * 1.1;
}

function areOtherFingersCurled(
  indexExtended: boolean,
  middleExtended: boolean,
  ringExtended: boolean,
  pinkyExtended: boolean
) {
  return !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
}

export function recognizeGesture(landmarks: Landmark[]): GestureState {
  if (!landmarks || landmarks.length < 21) return "idle";

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];

  const pinchDist = distance(thumbTip, indexTip);
  const isPinching = pinchDist < 0.09;
  const thumbExtended = isFingerExtended(thumbTip, thumbMcp, wrist);
  const indexExtended = isFingerExtended(indexTip, indexMcp, wrist);
  const middleExtended = isFingerExtended(middleTip, middleMcp, wrist);
  const ringExtended = isFingerExtended(ringTip, ringMcp, wrist);
  const pinkyExtended = isFingerExtended(pinkyTip, pinkyMcp, wrist);
  const middleCurled = !isFingerExtended(middleTip, middleMcp, wrist);
  const ringCurled = !isFingerExtended(ringTip, ringMcp, wrist);

  // Pinch: thumb and index close together
  if (isPinching && (middleCurled || ringCurled || pinchDist < 0.07)) {
    return "pinch";
  }

  const otherFingersCurled = areOtherFingersCurled(
    indexExtended,
    middleExtended,
    ringExtended,
    pinkyExtended
  );
  const thumbClearlyUp = thumbTip.y < wrist.y - 0.08;
  const thumbClearlyDown = thumbTip.y > wrist.y + 0.08;

  if (pinchDist > 0.14 && thumbExtended && otherFingersCurled) {
    if (thumbClearlyUp) {
      return "thumbs_up";
    }

    if (thumbClearlyDown) {
      return "thumbs_down";
    }
  }

  if (
    pinchDist > 0.12 &&
    indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended
  ) {
    return "point";
  }

  if (
    pinchDist > 0.12 &&
    indexExtended &&
    middleExtended &&
    ringExtended &&
    pinkyExtended &&
    thumbExtended
  ) {
    return "open_palm";
  }

  return "idle";
}

/**
 * Temporal smoothing: require the same gesture for N consecutive frames
 * before reporting it as stable.
 */
export class GestureStabilizer {
  private history: GestureState[] = [];
  private readonly requiredFrames: number;

  constructor(requiredFrames = 5) {
    this.requiredFrames = requiredFrames;
  }

  update(gesture: GestureState): GestureState {
    this.history.push(gesture);
    if (this.history.length > this.requiredFrames) {
      this.history.shift();
    }

    if (this.history.length < this.requiredFrames) return "idle";

    const allSame = this.history.every((g) => g === gesture);
    return allSame ? gesture : "idle";
  }

  reset() {
    this.history = [];
  }
}
