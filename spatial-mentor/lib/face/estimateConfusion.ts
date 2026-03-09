/**
 * Lightweight confusion/engagement estimator using face blendshapes.
 * Returns a score from 0 (confident) to 1 (confused/disengaged).
 * This is a heuristic — not a definitive measure.
 */
export function estimateConfusion(
  blendshapes: { categoryName: string; score: number }[]
): number {
  if (!blendshapes || blendshapes.length === 0) return 0.5;

  const get = (name: string): number => {
    const shape = blendshapes.find((b) => b.categoryName === name);
    return shape?.score ?? 0;
  };

  const browInnerUp = get("browInnerUp");
  const browDownLeft = get("browDownLeft");
  const browDownRight = get("browDownRight");
  const mouthFrownLeft = get("mouthFrownLeft");
  const mouthFrownRight = get("mouthFrownRight");
  const jawOpen = get("jawOpen");
  const eyeSquintLeft = get("eyeSquintLeft");
  const eyeSquintRight = get("eyeSquintRight");

  // Raised inner brow + frown suggests confusion
  const confusionSignals =
    browInnerUp * 0.3 +
    ((browDownLeft + browDownRight) / 2) * 0.2 +
    ((mouthFrownLeft + mouthFrownRight) / 2) * 0.2 +
    ((eyeSquintLeft + eyeSquintRight) / 2) * 0.15 +
    jawOpen * 0.15;

  return Math.min(1, Math.max(0, confusionSignals));
}
