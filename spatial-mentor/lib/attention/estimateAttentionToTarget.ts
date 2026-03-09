import type { AttentionState } from "@/types";

interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Estimate whether the learner's face is oriented toward the screen center
 * (where the shared project area is). Uses nose tip and face orientation.
 *
 * This is a lightweight heuristic, not scientific eye tracking.
 */
export function estimateAttention(
  faceLandmarks: FaceLandmark[] | null,
  blendshapes?: { categoryName: string; score: number }[]
): AttentionState {
  if (!faceLandmarks || faceLandmarks.length < 468) return "no_signal";

  // Nose tip (landmark 1)
  const nose = faceLandmarks[1];

  // Left eye outer corner (landmark 33), right eye outer corner (landmark 263)
  const leftEye = faceLandmarks[33];
  const rightEye = faceLandmarks[263];

  // Face center horizontal position — if centered, likely looking at screen
  const faceCenterX = (leftEye.x + rightEye.x) / 2;
  const faceCenterY = nose.y;

  // Horizontal deviation from center (0.5 = perfect center)
  const hDev = Math.abs(faceCenterX - 0.5);
  // Vertical deviation (approximate screen center)
  const vDev = Math.abs(faceCenterY - 0.45);

  // Head rotation: difference in z between eyes indicates yaw
  const yawEstimate = Math.abs(leftEye.z - rightEye.z);

  // Check eye openness from blendshapes if available
  let eyesClosed = false;
  if (blendshapes) {
    const get = (name: string) =>
      blendshapes.find((b) => b.categoryName === name)?.score ?? 0;
    const blinkL = get("eyeBlinkLeft");
    const blinkR = get("eyeBlinkRight");
    eyesClosed = blinkL > 0.5 && blinkR > 0.5;
  }

  if (eyesClosed) return "away";

  // Score: lower is more "on target"
  const score = hDev * 2 + vDev * 1.5 + yawEstimate * 3;

  if (score < 0.25) return "target_locked";
  if (score < 0.5) return "uncertain";
  return "away";
}
