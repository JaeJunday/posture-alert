import type { PoseLandmark } from "../domain/types";

export type PoseDetectionResult = {
  landmarks: PoseLandmark[];
};

export interface PoseDetector {
  detect(video: HTMLVideoElement, timestampMs: number): PoseDetectionResult | null;
  close(): void;
}
