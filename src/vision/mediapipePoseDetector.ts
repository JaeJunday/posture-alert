import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseLandmark } from "../domain/types";
import type { PoseDetectionResult, PoseDetector } from "./poseDetector";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

type Delegate = "CPU" | "GPU";
type CreateOptions = Parameters<typeof PoseLandmarker.createFromOptions>[1];

function createOptions(delegate: Delegate): CreateOptions {
  return {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
}

export class MediaPipePoseDetector implements PoseDetector {
  private constructor(private readonly landmarker: PoseLandmarker) {}

  static async create(): Promise<MediaPipePoseDetector> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    let landmarker: PoseLandmarker;

    try {
      landmarker = await PoseLandmarker.createFromOptions(vision, createOptions("GPU"));
    } catch {
      landmarker = await PoseLandmarker.createFromOptions(vision, createOptions("CPU"));
    }

    return new MediaPipePoseDetector(landmarker);
  }

  detect(video: HTMLVideoElement, timestampMs: number): PoseDetectionResult | null {
    const result = this.landmarker.detectForVideo(video, timestampMs);
    const landmarks = result.landmarks[0];

    if (!landmarks) {
      return null;
    }

    return {
      landmarks: landmarks.map(
        (landmark): PoseLandmark => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z,
          visibility: landmark.visibility,
        }),
      ),
    };
  }

  close(): void {
    this.landmarker.close();
  }
}
