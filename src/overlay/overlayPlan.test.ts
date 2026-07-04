import { describe, expect, it } from "vitest";
import { buildOverlayPlan } from "./overlayPlan";
import type { PostureAnalysis, TrackedPoint } from "../domain/types";

function point(id: string, source: TrackedPoint["source"], visibility = 0.9): TrackedPoint {
  return {
    id,
    x: 0.5,
    y: 0.25,
    visibility,
    source,
  };
}

function analysis(overrides: Partial<PostureAnalysis> = {}): PostureAnalysis {
  return {
    mode: "side",
    overallScore: 80,
    confidence: 0.9,
    statuses: [],
    points: [
      point("ear", "mediapipe"),
      point("cervical", "inferred"),
      point("shoulder", "mediapipe"),
      point("upperSpine", "inferred"),
      point("midSpine", "inferred"),
      point("lumbar", "inferred"),
      point("hip", "mediapipe"),
    ],
    ...overrides,
  };
}

describe("buildOverlayPlan", () => {
  it("목 경고 상태이면 ear와 cervical을 주황색으로 표시하고 연결선도 강조한다", () => {
    const plan = buildOverlayPlan(
      analysis({
        statuses: [
          {
            part: "neck",
            severity: "warning",
            score: 62,
            message: "목이 앞으로 나왔어요.",
            pointIds: ["ear", "cervical"],
          },
        ],
      }),
      640,
      480,
    );

    const ear = plan.points.find((candidate) => candidate.id === "ear");
    const cervical = plan.points.find((candidate) => candidate.id === "cervical");
    const highlightedConnection = plan.connections.find((connection) => connection.color === "#f97316");

    expect(ear?.color).toBe("#f97316");
    expect(cervical?.color).toBe("#f97316");
    expect(cervical?.radius).toBe(5);
    expect(highlightedConnection?.width).toBe(4);
  });

  it("정규화 좌표를 캔버스 너비와 높이에 맞춰 스케일링한다", () => {
    const plan = buildOverlayPlan(
      analysis({
        points: [
          {
            id: "ear",
            x: 0.25,
            y: 0.75,
            visibility: 0.9,
            source: "mediapipe",
          },
        ],
      }),
      800,
      600,
    );

    expect(plan.points[0]).toMatchObject({
      x: 200,
      y: 450,
    });
  });

  it("불안정 상태 또는 낮은 visibility 포인트는 회색으로 표시한다", () => {
    const plan = buildOverlayPlan(
      analysis({
        statuses: [
          {
            part: "spine",
            severity: "unstable",
            score: 0,
            message: "포인트가 불안정해요.",
            pointIds: ["upperSpine"],
          },
        ],
        points: [
          point("ear", "mediapipe", 0.4),
          point("upperSpine", "inferred", 0.9),
        ],
      }),
      640,
      480,
    );

    expect(plan.points.find((candidate) => candidate.id === "ear")?.color).toBe("#94a3b8");
    expect(plan.points.find((candidate) => candidate.id === "upperSpine")?.color).toBe("#94a3b8");
  });
});
