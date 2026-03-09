import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { withSuppressedWasmLogs } from "./suppressWasmLogs";

const VISION_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

let handLandmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;
  if (initPromise) return initPromise;

  initPromise = withSuppressedWasmLogs(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);

      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      return handLandmarker;
    } catch (e) {
      initPromise = null;
      throw e;
    }
  });

  return initPromise;
}
