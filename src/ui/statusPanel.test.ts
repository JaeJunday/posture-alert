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

  it("같은 컨테이너에 다시 렌더링하면 이전 카드가 남지 않는다", () => {
    const elements = createElements();

    renderStatusPanel(
      elements,
      createAnalysis({
        statuses: [
          {
            part: "neck",
            severity: "warning",
            score: 64,
            message: "첫 렌더 메시지예요.",
            pointIds: ["ear", "shoulder"],
          },
        ],
      }),
    );
    renderStatusPanel(
      elements,
      createAnalysis({
        statuses: [
          {
            part: "spine",
            severity: "ok",
            score: 91,
            message: "새 렌더 메시지예요.",
            pointIds: ["shoulder", "hip"],
          },
        ],
      }),
    );

    expect(elements.statusList.querySelectorAll(".status-card")).toHaveLength(1);
    expect(elements.statusList.textContent).toContain("척추");
    expect(elements.statusList.textContent).toContain("새 렌더 메시지예요.");
    expect(elements.statusList.textContent).not.toContain("목");
    expect(elements.statusList.textContent).not.toContain("첫 렌더 메시지예요.");
  });

  it("status message에 HTML 문자열이 들어와도 텍스트로만 표시한다", () => {
    const elements = createElements();
    const unsafeMessage = '<img src=x onerror="alert(1)">자세를 확인해 주세요.';

    renderStatusPanel(
      elements,
      createAnalysis({
        statuses: [
          {
            part: "lumbar",
            severity: "danger",
            score: 28,
            message: unsafeMessage,
            pointIds: ["hip", "knee"],
          },
        ],
      }),
    );

    const message = elements.statusList.querySelector("p");

    expect(message?.textContent).toBe(unsafeMessage);
    expect(message?.childNodes).toHaveLength(1);
    expect(message?.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(elements.statusList.querySelector("img")).toBeNull();
  });
});
