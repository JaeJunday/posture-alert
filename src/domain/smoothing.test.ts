import { describe, expect, it } from "vitest";
import { PostureSmoother } from "./smoothing";
import type { BodyPartStatus, PostureAnalysis } from "./types";

function status(part: BodyPartStatus["part"], score: number): BodyPartStatus {
  return {
    part,
    severity: "ok",
    score,
    message: `${part} 상태`,
    pointIds: [part],
  };
}

function analysis(overallScore: number, confidence = 1, statuses: BodyPartStatus[] = []): PostureAnalysis {
  return {
    mode: "side",
    overallScore,
    confidence,
    statuses,
    points: [],
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
});
