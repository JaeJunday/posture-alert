import { describe, expect, it } from "vitest";
import { analyzePosture } from "./analysis";
import type { SideAnatomy } from "./anatomy";
import type { BodyPart, BodyPartStatus, TrackedPoint } from "./types";

const UNSTABLE_MESSAGE = "기준점 추적이 불안정해요. 카메라 위치를 조정해 주세요.";

function point(id: string, x: number, y: number, visibility = 0.95): TrackedPoint {
  const source = ["cervical", "upperSpine", "midSpine", "lumbar"].includes(id) ? "inferred" : "mediapipe";

  return {
    id,
    x,
    y,
    visibility,
    source,
  };
}

function anatomy(overrides: Partial<SideAnatomy["points"]> = {}, isStable = true): SideAnatomy {
  const points: SideAnatomy["points"] = {
    ear: point("ear", 0.5, 0.1),
    shoulder: point("shoulder", 0.5, 0.3),
    elbow: point("elbow", 0.5, 0.48),
    wrist: point("wrist", 0.5, 0.62),
    hip: point("hip", 0.5, 0.75),
    knee: point("knee", 0.5, 0.9),
    ankle: point("ankle", 0.5, 1),
    cervical: point("cervical", 0.5, 0.2),
    upperSpine: point("upperSpine", 0.5, 0.4125),
    midSpine: point("midSpine", 0.5, 0.525),
    lumbar: point("lumbar", 0.5, 0.651),
    ...overrides,
  };

  return {
    side: "left",
    isStable,
    confidence: 0.87,
    points,
  };
}

function anatomyWithout(pointId: keyof SideAnatomy["points"]): SideAnatomy {
  const base = anatomy();
  const points: Partial<SideAnatomy["points"]> = { ...base.points };
  delete points[pointId];

  return {
    ...base,
    points: points as SideAnatomy["points"],
  };
}

function statusByPart(statuses: BodyPartStatus[], part: BodyPart): BodyPartStatus {
  const status = statuses.find((candidate) => candidate.part === part);
  expect(status).toBeDefined();
  return status as BodyPartStatus;
}

describe("analysis", () => {
  it("안정적인 직립 자세는 높은 점수와 정상 상태를 반환한다", () => {
    const result = analyzePosture(anatomy());

    expect(result.mode).toBe("side");
    expect(result.trackingScope).toBe("full");
    expect(result.confidence).toBe(0.87);
    expect(result.overallScore).toBe(100);
    expect(result.statuses).toHaveLength(7);
    expect(result.statuses.every((status) => status.severity === "ok")).toBe(true);
    expect(statusByPart(result.statuses, "neck").pointIds).toEqual(["ear", "shoulder"]);
    expect(statusByPart(result.statuses, "cervical").pointIds).toEqual(["ear", "cervical", "shoulder"]);
    expect(statusByPart(result.statuses, "spine").pointIds).toEqual(["cervical", "upperSpine", "midSpine", "lumbar"]);
    expect(statusByPart(result.statuses, "lumbar").pointIds).toEqual(["lumbar", "hip"]);
    expect(statusByPart(result.statuses, "trunk").pointIds).toEqual(["shoulder", "hip"]);
    expect(statusByPart(result.statuses, "arms").pointIds).toEqual(["shoulder", "elbow", "wrist"]);
    expect(statusByPart(result.statuses, "legs").pointIds).toEqual(["hip", "knee", "ankle"]);
    expect(result.points.map((trackedPoint) => trackedPoint.id)).toEqual([
      "ear",
      "shoulder",
      "elbow",
      "wrist",
      "hip",
      "knee",
      "ankle",
      "cervical",
      "upperSpine",
      "midSpine",
      "lumbar",
    ]);
  });

  it("하체 기준점이 불안정하면 상체 추적으로 전환하고 다리 상태와 포인트를 제외한다", () => {
    const result = analyzePosture(
      anatomy({
        knee: point("knee", 0.5, 0.9, 0.2),
      }),
    );

    expect(result.trackingScope).toBe("upper");
    expect(result.overallScore).toBe(100);
    expect(result.statuses.map((status) => status.part)).toEqual(["neck", "cervical", "spine", "lumbar", "trunk", "arms"]);
    expect(result.points.map((trackedPoint) => trackedPoint.id)).not.toContain("knee");
    expect(result.points.map((trackedPoint) => trackedPoint.id)).not.toContain("ankle");
  });

  it("하체 기준점이 잡히면 다리 점수를 전체 점수에 포함한다", () => {
    const result = analyzePosture(
      anatomy({
        ankle: point("ankle", 0.56, 1),
      }),
    );

    expect(result.trackingScope).toBe("full");
    expect(result.overallScore).toBeLessThan(100);
    expect(statusByPart(result.statuses, "legs")).toMatchObject({
      severity: "warning",
      pointIds: ["hip", "knee", "ankle"],
    });
  });

  it("무릎이 골반보다 높게 올라간 자세는 다리 위험 상태와 큰 전체 점수 하락을 반환한다", () => {
    const result = analyzePosture(
      anatomy({
        knee: point("knee", 0.47, 0.62),
        ankle: point("ankle", 0.62, 0.66),
      }),
    );

    expect(result.trackingScope).toBe("full");
    expect(result.overallScore).toBeLessThanOrEqual(82);
    expect(statusByPart(result.statuses, "legs")).toMatchObject({
      severity: "danger",
      message: "다리가 의자 위로 올라간 자세처럼 보여요.",
      pointIds: ["hip", "knee", "ankle"],
    });
  });

  it("무릎이 골반 근처까지 올라간 자세는 다리 경고 상태로 감점한다", () => {
    const result = analyzePosture(
      anatomy({
        knee: point("knee", 0.48, 0.74),
        ankle: point("ankle", 0.54, 0.82),
      }),
    );

    expect(result.trackingScope).toBe("full");
    expect(result.overallScore).toBeLessThan(100);
    expect(statusByPart(result.statuses, "legs")).toMatchObject({
      severity: "warning",
      message: "무릎 높이가 높아요. 다리를 바닥 쪽으로 내려 주세요.",
      pointIds: ["hip", "knee", "ankle"],
    });
  });

  it("거북목 자세는 점수가 낮아지고 목과 경추 상태가 정상이 아니게 된다", () => {
    const result = analyzePosture(
      anatomy({
        ear: point("ear", 0.62, 0.1),
        cervical: point("cervical", 0.58, 0.2),
      }),
    );

    const neck = result.statuses.find((status) => status.part === "neck");
    const cervical = result.statuses.find((status) => status.part === "cervical");

    expect(result.overallScore).toBeLessThan(85);
    expect(neck?.severity).not.toBe("ok");
    expect(cervical?.severity).not.toBe("ok");
  });

  it("상체가 앞으로 기운 자세는 몸통과 척추 상태가 정상이 아니게 된다", () => {
    const result = analyzePosture(
      anatomy({
        shoulder: point("shoulder", 0.66, 0.3),
        cervical: point("cervical", 0.66, 0.2),
        upperSpine: point("upperSpine", 0.62, 0.4125),
        midSpine: point("midSpine", 0.58, 0.525),
        lumbar: point("lumbar", 0.54, 0.651),
      }),
    );

    const trunk = result.statuses.find((status) => status.part === "trunk");
    const spine = result.statuses.find((status) => status.part === "spine");

    expect(trunk?.severity).not.toBe("ok");
    expect(spine?.severity).not.toBe("ok");
  });

  it("한 기준점만 불안정하면 해당 기준점을 쓰는 부위만 불안정 상태를 반환한다", () => {
    const result = analyzePosture(
      anatomy(
        {
          ear: point("ear", 0.5, 0.1, 0.4),
        },
        false,
      ),
    );

    expect(result.overallScore).toBe(63);
    expect(result.statuses.every((status) => status.severity === "unstable")).toBe(false);
    expect(statusByPart(result.statuses, "neck")).toMatchObject({
      severity: "unstable",
      score: 0,
      message: UNSTABLE_MESSAGE,
      pointIds: ["ear", "shoulder"],
    });
    expect(statusByPart(result.statuses, "cervical")).toMatchObject({
      severity: "unstable",
      score: 0,
      message: UNSTABLE_MESSAGE,
      pointIds: ["ear", "cervical", "shoulder"],
    });
    expect(statusByPart(result.statuses, "spine").severity).toBe("ok");
    expect(statusByPart(result.statuses, "lumbar").severity).toBe("ok");
    expect(statusByPart(result.statuses, "trunk").severity).toBe("ok");
  });

  it("특정 metric point가 없으면 함수가 throw하지 않고 해당 부위만 불안정 상태를 반환한다", () => {
    const subject = () => analyzePosture(anatomyWithout("midSpine"));

    expect(subject).not.toThrow();
    const result = subject();

    expect(Number.isFinite(result.overallScore)).toBe(true);
    expect(result.overallScore).toBe(86);
    expect(statusByPart(result.statuses, "spine")).toMatchObject({
      severity: "unstable",
      score: 0,
      message: UNSTABLE_MESSAGE,
      pointIds: ["cervical", "upperSpine", "midSpine", "lumbar"],
    });
    expect(statusByPart(result.statuses, "neck").severity).toBe("ok");
    expect(statusByPart(result.statuses, "cervical").severity).toBe("ok");
    expect(statusByPart(result.statuses, "lumbar").severity).toBe("ok");
    expect(statusByPart(result.statuses, "trunk").severity).toBe("ok");
  });

  it("NaN 좌표를 참조하는 부위만 불안정 상태가 되고 전체 점수는 유한한 숫자를 반환한다", () => {
    const result = analyzePosture(
      anatomy({
        midSpine: point("midSpine", Number.NaN, 0.525),
      }),
    );

    expect(Number.isFinite(result.overallScore)).toBe(true);
    expect(result.overallScore).toBe(86);
    expect(statusByPart(result.statuses, "spine")).toMatchObject({
      severity: "unstable",
      score: 0,
      pointIds: ["cervical", "upperSpine", "midSpine", "lumbar"],
    });
    expect(statusByPart(result.statuses, "neck").severity).toBe("ok");
    expect(statusByPart(result.statuses, "cervical").severity).toBe("ok");
    expect(statusByPart(result.statuses, "lumbar").severity).toBe("ok");
    expect(statusByPart(result.statuses, "trunk").severity).toBe("ok");
  });

  it("Infinity 좌표를 참조하는 부위만 불안정 상태를 반환한다", () => {
    const result = analyzePosture(
      anatomy({
        upperSpine: point("upperSpine", Number.POSITIVE_INFINITY, 0.4125),
      }),
    );

    expect(Number.isFinite(result.overallScore)).toBe(true);
    expect(result.overallScore).toBe(86);
    expect(statusByPart(result.statuses, "spine")).toMatchObject({
      severity: "unstable",
      score: 0,
      message: UNSTABLE_MESSAGE,
      pointIds: ["cervical", "upperSpine", "midSpine", "lumbar"],
    });
    expect(statusByPart(result.statuses, "neck").severity).toBe("ok");
    expect(statusByPart(result.statuses, "cervical").severity).toBe("ok");
    expect(statusByPart(result.statuses, "lumbar").severity).toBe("ok");
    expect(statusByPart(result.statuses, "trunk").severity).toBe("ok");
  });

  it("모든 핵심 기준점이 불안정하면 점수 0과 전체 불안정 상태를 반환한다", () => {
    const result = analyzePosture(
      anatomy(
        {
          ear: point("ear", 0.5, 0.1, 0.4),
          shoulder: point("shoulder", 0.5, 0.3, 0.4),
          hip: point("hip", 0.5, 0.75, 0.4),
        },
        false,
      ),
    );

    expect(result.overallScore).toBe(0);
    expect(result.confidence).toBe(0.87);
    expect(result.statuses.map((status) => status.part)).toEqual(["neck", "cervical", "spine", "lumbar", "trunk", "arms", "legs"]);
    expect(result.statuses.every((status) => status.severity === "unstable")).toBe(true);
    expect(result.statuses.every((status) => status.score === 0)).toBe(true);
    expect(result.statuses.every((status) => status.pointIds.length === 0)).toBe(true);
    expect(result.statuses.every((status) => status.message === UNSTABLE_MESSAGE)).toBe(true);
  });
});
