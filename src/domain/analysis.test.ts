import { describe, expect, it } from "vitest";
import { analyzePosture } from "./analysis";
import type { SideAnatomy } from "./anatomy";
import type { TrackedPoint } from "./types";

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

describe("analysis", () => {
  it("안정적인 직립 자세는 높은 점수와 정상 상태를 반환한다", () => {
    const result = analyzePosture(anatomy());

    expect(result.mode).toBe("side");
    expect(result.confidence).toBe(0.87);
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.statuses).toHaveLength(5);
    expect(result.statuses.every((status) => status.severity === "ok")).toBe(true);
    expect(result.points.map((trackedPoint) => trackedPoint.id)).toEqual([
      "ear",
      "shoulder",
      "hip",
      "knee",
      "ankle",
      "cervical",
      "upperSpine",
      "midSpine",
      "lumbar",
    ]);
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

  it("불안정한 기준점은 점수 0과 불안정 상태를 반환한다", () => {
    const result = analyzePosture(anatomy({}, false));

    expect(result.overallScore).toBe(0);
    expect(result.confidence).toBe(0.87);
    expect(result.statuses.map((status) => status.part)).toEqual(["neck", "cervical", "spine", "lumbar", "trunk"]);
    expect(result.statuses.every((status) => status.severity === "unstable")).toBe(true);
    expect(result.statuses.every((status) => status.score === 0)).toBe(true);
    expect(result.statuses.every((status) => status.pointIds.length === 0)).toBe(true);
    expect(result.statuses.every((status) => status.message === "기준점 추적이 불안정해요. 카메라 위치를 조정해 주세요.")).toBe(
      true,
    );
  });
});
