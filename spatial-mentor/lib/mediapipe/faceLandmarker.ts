import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { withSuppressedWasmLogs } from "./suppressWasmLogs";

const VISION_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

let faceLandmarker: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;
  if (initPromise) return initPromise;

  initPromise = withSuppressedWasmLogs(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);

      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
      });

      return faceLandmarker;
    } catch (e) {
      initPromise = null;
      throw e;
    }
  });

  return initPromise;
}
