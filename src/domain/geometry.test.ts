import { describe, expect, it } from "vitest";
import { angleFromVerticalDegrees, clamp, distance2d, lerpPoint, scoreFromRange } from "./geometry";

describe("geometry", () => {
  it("2차원 거리를 계산한다", () => {
    expect(distance2d({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("두 점 사이 보간점을 계산한다", () => {
    expect(lerpPoint({ x: 0, y: 0, visibility: 1 }, { x: 10, y: 20, visibility: 0.5 }, 0.25)).toEqual({
      x: 2.5,
      y: 5,
      visibility: 0.875,
    });
  });

  it("두 점 사이 z 보간점을 계산한다", () => {
    expect(lerpPoint({ x: 0, y: 0, z: 2, visibility: 1 }, { x: 10, y: 20, z: 10, visibility: 1 }, 0.25)).toEqual({
      x: 2.5,
      y: 5,
      z: 4,
      visibility: 1,
    });
  });

  it("수직선 기준 각도를 계산한다", () => {
    expect(angleFromVerticalDegrees({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(0);
    expect(angleFromVerticalDegrees({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(90);
  });

  it("값을 범위 안으로 제한한다", () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it("경고와 위험 기준으로 점수를 계산한다", () => {
    expect(scoreFromRange(0.05, 0.12, 0.24)).toBe(100);
    expect(scoreFromRange(0.17, 0.12, 0.24)).toBe(58);
    expect(scoreFromRange(0.18, 0.12, 0.24)).toBe(50);
    expect(scoreFromRange(0.3, 0.12, 0.24)).toBe(0);
  });
});
