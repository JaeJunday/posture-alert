import { describe, expect, it } from "vitest";
import type { PostureAnalysis } from "../domain/types";
import { renderStatusPanel } from "./statusPanel";

function createElements() {
  return {
    scoreValue: document.createElement("strong"),
    confidenceValue: document.createElement("p"),
    statusList: document.createElement("div"),
  };
}

function createAnalysis(overrides: Partial<PostureAnalysis> = {}): PostureAnalysis {
  return {
    mode: "side",
    overallScore: 72,
    confidence: 0.876,
    statuses: [
      {
        part: "neck",
        severity: "warning",
        score: 64,
        message: "머리가 앞으로 나왔어요.",
        pointIds: ["ear", "shoulder"],
      },
    ],
    points: [],
    ...overrides,
  };
}

describe("renderStatusPanel", () => {
  it("전체 점수와 신뢰도 퍼센트를 표시한다", () => {
    const elements = createElements();

    renderStatusPanel(elements, createAnalysis());

    expect(elements.scoreValue.textContent).toBe("72");
    expect(elements.confidenceValue.textContent).toBe("추적 신뢰도 88%");
  });

  it("한국어 부위 라벨과 메시지를 표시한다", () => {
    const elements = createElements();

    renderStatusPanel(
      elements,
      createAnalysis({
        statuses: [
          {
            part: "cervical",
            severity: "danger",
            score: 42,
            message: "경추 정렬을 확인해 주세요.",
            pointIds: ["ear", "neck"],
          },
        ],
      }),
    );

    expect(elements.statusList.textContent).toContain("경추");
    expect(elements.statusList.textContent).toContain("42점");
    expect(elements.statusList.textContent).toContain("경추 정렬을 확인해 주세요.");
    expect(elements.statusList.querySelector(".status-card--danger")).toBeTruthy();
  });

  it("unstable 상태는 추적 불안정을 표시한다", () => {
    const elements = createElements();

    renderStatusPanel(
      elements,
      createAnalysis({
        statuses: [
          {
            part: "trunk",
            severity: "unstable",
            score: 0,
            message: "상체 추적이 불안정해요.",
            pointIds: [],
          },
        ],
      }),
    );

    expect(elements.statusList.textContent).toContain("상체");
    expect(elements.statusList.textContent).toContain("추적 불안정");
    expect(elements.statusList.textContent).not.toContain("0점");
    expect(elements.statusList.querySelector(".status-card--unstable")).toBeTruthy();
  });
});
