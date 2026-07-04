import { lerpPoint } from "./geometry";
import { POSE_LANDMARK } from "./mediapipeLandmarks";
import type { PoseLandmark, Side, TrackedPoint } from "./types";

const MIN_VISIBILITY = 0.55;

type SideKey = "ear" | "shoulder" | "hip" | "knee" | "ankle";

type SidePoints = Record<SideKey, TrackedPoint>;

export type SideAnatomy = {
  side: Side;
  isStable: boolean;
  confidence: number;
  points: SidePoints & {
    cervical: TrackedPoint;
    upperSpine: TrackedPoint;
    midSpine: TrackedPoint;
    lumbar: TrackedPoint;
  };
};

export function selectVisibleSide(landmarks: PoseLandmark[]): Side {
  const leftScore =
    visibilityAt(landmarks, POSE_LANDMARK.leftEar) +
    visibilityAt(landmarks, POSE_LANDMARK.leftShoulder) +
    visibilityAt(landmarks, POSE_LANDMARK.leftHip);
  const rightScore =
    visibilityAt(landmarks, POSE_LANDMARK.rightEar) +
    visibilityAt(landmarks, POSE_LANDMARK.rightShoulder) +
    visibilityAt(landmarks, POSE_LANDMARK.rightHip);

  return leftScore >= rightScore ? "left" : "right";
}

export function inferSideAnatomy(landmarks: PoseLandmark[]): SideAnatomy {
  const side = selectVisibleSide(landmarks);
  const indices =
    side === "left"
      ? {
          ear: POSE_LANDMARK.leftEar,
          shoulder: POSE_LANDMARK.leftShoulder,
          hip: POSE_LANDMARK.leftHip,
          knee: POSE_LANDMARK.leftKnee,
          ankle: POSE_LANDMARK.leftAnkle,
        }
      : {
          ear: POSE_LANDMARK.rightEar,
          shoulder: POSE_LANDMARK.rightShoulder,
          hip: POSE_LANDMARK.rightHip,
          knee: POSE_LANDMARK.rightKnee,
          ankle: POSE_LANDMARK.rightAnkle,
        };

  const ear = tracked("ear", landmarks[indices.ear], "mediapipe");
  const shoulder = tracked("shoulder", landmarks[indices.shoulder], "mediapipe");
  const hip = tracked("hip", landmarks[indices.hip], "mediapipe");
  const knee = tracked("knee", landmarks[indices.knee], "mediapipe");
  const ankle = tracked("ankle", landmarks[indices.ankle], "mediapipe");

  const cervical = tracked("cervical", lerpPoint(ear, shoulder, 0.25), "inferred");
  const upperSpine = tracked("upperSpine", lerpPoint(shoulder, hip, 0.25), "inferred");
  const midSpine = tracked("midSpine", lerpPoint(shoulder, hip, 0.5), "inferred");
  const lumbar = tracked("lumbar", lerpPoint(shoulder, hip, 0.78), "inferred");

  const coreVisibility = [ear.visibility, shoulder.visibility, hip.visibility];
  const confidence = Math.min(...coreVisibility);
  const isStable = coreVisibility.every((visibility) => visibility >= MIN_VISIBILITY);

  return {
    side,
    isStable,
    confidence,
    points: {
      ear,
      shoulder,
      hip,
      knee,
      ankle,
      cervical,
      upperSpine,
      midSpine,
      lumbar,
    },
  };
}

function visibilityAt(landmarks: PoseLandmark[], index: number): number {
  return landmarks[index]?.visibility ?? 0;
}

function tracked(id: string, landmark: PoseLandmark | undefined, source: TrackedPoint["source"]): TrackedPoint {
  return {
    id,
    x: landmark?.x ?? 0,
    y: landmark?.y ?? 0,
    z: landmark?.z,
    visibility: landmark?.visibility ?? 0,
    source,
  };
}
