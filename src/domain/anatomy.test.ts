import { describe, expect, it } from "vitest";
import { inferSideAnatomy, selectVisibleSide } from "./anatomy";
import { POSE_LANDMARK } from "./mediapipeLandmarks";
import type { PoseLandmark } from "./types";

function landmarks(): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.1 }));
}

describe("anatomy", () => {
  it("visibility 합이 높은 측면을 고른다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.2, y: 0.1, visibility: 0.9 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.24, y: 0.35, visibility: 0.9 };
    points[POSE_LANDMARK.leftHip] = { x: 0.3, y: 0.7, visibility: 0.9 };
    points[POSE_LANDMARK.rightEar] = { x: 0.8, y: 0.1, visibility: 0.2 };
    points[POSE_LANDMARK.rightShoulder] = { x: 0.76, y: 0.35, visibility: 0.2 };
    points[POSE_LANDMARK.rightHip] = { x: 0.7, y: 0.7, visibility: 0.2 };

    expect(selectVisibleSide(points)).toBe("left");
  });

  it("상체 visibility가 비슷하면 무릎과 발목이 더 잘 보이는 측면을 고른다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.2, y: 0.1, visibility: 0.8 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.24, y: 0.35, visibility: 0.8 };
    points[POSE_LANDMARK.leftHip] = { x: 0.3, y: 0.7, visibility: 0.8 };
    points[POSE_LANDMARK.leftKnee] = { x: 0.3, y: 0.85, visibility: 0.1 };
    points[POSE_LANDMARK.leftAnkle] = { x: 0.3, y: 0.95, visibility: 0.1 };
    points[POSE_LANDMARK.rightEar] = { x: 0.8, y: 0.1, visibility: 0.75 };
    points[POSE_LANDMARK.rightShoulder] = { x: 0.76, y: 0.35, visibility: 0.75 };
    points[POSE_LANDMARK.rightHip] = { x: 0.7, y: 0.7, visibility: 0.75 };
    points[POSE_LANDMARK.rightKnee] = { x: 0.7, y: 0.85, visibility: 0.95 };
    points[POSE_LANDMARK.rightAnkle] = { x: 0.7, y: 0.95, visibility: 0.95 };

    expect(selectVisibleSide(points)).toBe("right");
  });

  it("가상 경추, 척추, 요추 포인트를 만든다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.35, y: 0.15, visibility: 0.95 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.3, y: 0.35, visibility: 0.95 };
    points[POSE_LANDMARK.leftHip] = { x: 0.32, y: 0.72, visibility: 0.95 };
    points[POSE_LANDMARK.leftKnee] = { x: 0.33, y: 0.88, visibility: 0.9 };
    points[POSE_LANDMARK.leftAnkle] = { x: 0.34, y: 0.98, visibility: 0.9 };

    const anatomy = inferSideAnatomy(points);

    expect(anatomy.side).toBe("left");
    expect(anatomy.isStable).toBe(true);
    expect(anatomy.points.cervical.source).toBe("inferred");
    expect(anatomy.points.upperSpine.source).toBe("inferred");
    expect(anatomy.points.midSpine.source).toBe("inferred");
    expect(anatomy.points.lumbar.source).toBe("inferred");
    expect(anatomy.points.cervical.x).toBeCloseTo(0.3375);
    expect(anatomy.points.lumbar.y).toBeGreaterThan(anatomy.points.midSpine.y);
  });

  it("confidence는 ear, shoulder, hip visibility의 최솟값이다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.35, y: 0.15, visibility: 0.75 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.3, y: 0.35, visibility: 0.9 };
    points[POSE_LANDMARK.leftHip] = { x: 0.32, y: 0.72, visibility: 0.6 };

    const anatomy = inferSideAnatomy(points);

    expect(anatomy.confidence).toBe(0.6);
  });

  it("실제 landmark 포인트의 source를 mediapipe로 표시한다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.35, y: 0.15, visibility: 0.95 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.3, y: 0.35, visibility: 0.95 };
    points[POSE_LANDMARK.leftHip] = { x: 0.32, y: 0.72, visibility: 0.95 };
    points[POSE_LANDMARK.leftKnee] = { x: 0.33, y: 0.88, visibility: 0.9 };
    points[POSE_LANDMARK.leftAnkle] = { x: 0.34, y: 0.98, visibility: 0.9 };

    const anatomy = inferSideAnatomy(points);

    expect(anatomy.points.ear.source).toBe("mediapipe");
    expect(anatomy.points.shoulder.source).toBe("mediapipe");
    expect(anatomy.points.hip.source).toBe("mediapipe");
    expect(anatomy.points.knee.source).toBe("mediapipe");
    expect(anatomy.points.ankle.source).toBe("mediapipe");
  });

  it("ear landmark가 빠지면 기준점과 inferred point 좌표를 NaN으로 표시한다", () => {
    const points = landmarks();
    delete points[POSE_LANDMARK.leftEar];
    points[POSE_LANDMARK.leftShoulder] = { x: 0.3, y: 0.35, visibility: 0.95 };
    points[POSE_LANDMARK.leftHip] = { x: 0.32, y: 0.72, visibility: 0.95 };

    const anatomy = inferSideAnatomy(points);

    expect(anatomy.isStable).toBe(false);
    expect(anatomy.confidence).toBe(0);
    expect(Number.isNaN(anatomy.points.ear.x)).toBe(true);
    expect(Number.isNaN(anatomy.points.cervical.x)).toBe(true);
  });

  it("주요 기준점 visibility가 낮으면 불안정으로 표시한다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.35, y: 0.15, visibility: 0.4 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.3, y: 0.35, visibility: 0.4 };
    points[POSE_LANDMARK.leftHip] = { x: 0.32, y: 0.72, visibility: 0.4 };

    const anatomy = inferSideAnatomy(points);

    expect(anatomy.isStable).toBe(false);
  });
});
