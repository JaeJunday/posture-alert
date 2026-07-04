import { describe, expect, it } from "vitest";
import { PostureSmoother } from "./smoothing";
import type { BodyPartStatus, PostureAnalysis, TrackedPoint } from "./types";

function status(part: BodyPartStatus["part"], score: number): BodyPartStatus {
  return {
    part,
    severity: "ok",
    score,
    message: `${part} 상태`,
    pointIds: [part],
  };
}

function point(id: string): TrackedPoint {
  return {
    id,
    x: 0,
    y: 0,
    visibility: 1,
    source: "mediapipe",
  };
}

function analysis(
  overallScore: number,
  confidence = 1,
  statuses: BodyPartStatus[] = [],
  points: TrackedPoint[] = [],
): PostureAnalysis {
  return {
    mode: "side",
    trackingScope: "upper",
    overallScore,
    confidence,
    statuses,
    points,
  };
}

describe("PostureSmoother", () => {
  it("최근 3개 프레임의 전체 점수 평균을 반올림한다", () => {
    const smoother = new PostureSmoother(3);

    const scores = [90, 60, 30, 90].map((score) => smoother.push(analysis(score)).overallScore);

    expect(scores).toEqual([90, 75, 60, 60]);
  });

  it("reset 이후 누적 프레임 없이 다음 점수를 반환한다", () => {
    const smoother = new PostureSmoother(3);
    smoother.push(analysis(20));
    smoother.push(analysis(40));

    smoother.reset();

    expect(smoother.push(analysis(100)).overallScore).toBe(100);
  });

  it("confidence 평균을 소수 둘째 자리로 반올림한다", () => {
    const smoother = new PostureSmoother(3);
    smoother.push(analysis(90, 0.9));

    expect(smoother.push(analysis(90, 0.8)).confidence).toBe(0.85);
  });

  it("현재 프레임의 상태를 유지하되 같은 부위 점수 평균으로 바꾼다", () => {
    const smoother = new PostureSmoother(3);
    smoother.push(analysis(90, 1, [status("neck", 90), status("spine", 80)]));

    const smoothed = smoother.push(analysis(60, 1, [status("neck", 60), status("trunk", 30)]));

    expect(smoothed.statuses).toEqual([
      {
        part: "neck",
        severity: "ok",
        score: 75,
        message: "neck 상태",
        pointIds: ["neck"],
      },
      {
        part: "trunk",
        severity: "ok",
        score: 30,
        message: "trunk 상태",
        pointIds: ["trunk"],
      },
    ]);
  });

  it("push 이후 원본 프레임 수정이 이후 평균을 오염시키지 않는다", () => {
    const smoother = new PostureSmoother(3);
    const original = analysis(90, 0.9, [status("neck", 90)], [point("ear")]);
    smoother.push(original);

    original.overallScore = 0;
    original.confidence = 0;
    original.statuses[0].score = 0;
    original.points.push(point("mutated-point"));
    original.statuses[0].pointIds.push("mutated-point-id");

    const smoothed = smoother.push(analysis(60, 0.8, [status("neck", 60)], [point("shoulder")]));

    expect(smoothed.overallScore).toBe(75);
    expect(smoothed.confidence).toBe(0.85);
    expect(smoothed.statuses[0].score).toBe(75);
  });

  it("반환된 points와 pointIds를 수정해도 입력 프레임을 변경하지 않는다", () => {
    const smoother = new PostureSmoother(3);
    const frame = analysis(80, 0.9, [status("neck", 80)], [point("ear")]);

    const smoothed = smoother.push(frame);
    smoothed.points.push(point("mutated-point"));
    smoothed.statuses[0].pointIds.push("mutated-point-id");

    expect(frame.points).toEqual([point("ear")]);
    expect(frame.statuses[0].pointIds).toEqual(["neck"]);
  });
});
