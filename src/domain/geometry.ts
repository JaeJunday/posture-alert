import type { Point2D, PoseLandmark } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distance2d(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function lerpPoint(a: PoseLandmark, b: PoseLandmark, amount: number): PoseLandmark {
  const aVisibility = a.visibility ?? 0;
  const bVisibility = b.visibility ?? 0;
  const point: PoseLandmark = {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
    visibility: (aVisibility + bVisibility) / 2,
  };

  if (a.z !== undefined && b.z !== undefined) {
    point.z = a.z + (b.z - a.z) * amount;
  }

  return point;
}

export function angleFromVerticalDegrees(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const radians = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (radians * 180) / Math.PI;
}

export function scoreFromRange(value: number, warningStart: number, dangerStart: number): number {
  if (value <= warningStart) {
    return 100;
  }

  if (value >= dangerStart) {
    return 0;
  }

  const progress = (value - warningStart) / (dangerStart - warningStart);
  return Math.round(clamp(100 - progress * 100, 0, 100));
}
