import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseLandmark } from "../domain/types";
import type { PoseDetectionResult, PoseDetector } from "./poseDetector";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

type Delegate = "CPU" | "GPU";
type CreateOptions = Parameters<typeof PoseLandmarker.createFromOptions>[1];

const GPU_FALLBACK_ERROR_PATTERNS = [
  /\bwebgl\b/,
  /\bwebgpu\b/,
  /\bgpu\b.*\b(delegate|not supported|unsupported|unavailable|failed|failure|error)\b/,
  /\b(delegate|not supported|unsupported|unavailable|failed|failure|error)\b.*\bgpu\b/,
] as const;

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

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const name = error.name && error.name !== "Error" ? `${error.name}: ` : "";
    return `${name}${error.message}`;
  }

  return String(error);
}

function isCpuFallbackEligibleError(error: unknown): boolean {
  const text = describeError(error).toLowerCase();

  return GPU_FALLBACK_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

function preserveGpuFailureCause(cpuError: unknown, gpuError: unknown): Error {
  const gpuDescription = describeError(gpuError);

  if (cpuError instanceof Error) {
    const errorWithCause = cpuError as Error & { cause?: unknown };
    errorWithCause.message = `${cpuError.message} (GPU fallback cause: ${gpuDescription})`;
    errorWithCause.cause ??= gpuError;
    return errorWithCause;
  }

  return new Error(`MediaPipe CPU fallback failed after GPU fallback cause: ${gpuDescription}`, {
    cause: cpuError,
  });
}

export class MediaPipePoseDetector implements PoseDetector {
  private constructor(private readonly landmarker: PoseLandmarker) {}

  static async create(): Promise<MediaPipePoseDetector> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    let landmarker: PoseLandmarker;

    try {
      landmarker = await PoseLandmarker.createFromOptions(vision, createOptions("GPU"));
    } catch (gpuError) {
      if (!isCpuFallbackEligibleError(gpuError)) {
        throw gpuError;
      }

      try {
        landmarker = await PoseLandmarker.createFromOptions(vision, createOptions("CPU"));
      } catch (cpuError) {
        throw preserveGpuFailureCause(cpuError, gpuError);
      }
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
