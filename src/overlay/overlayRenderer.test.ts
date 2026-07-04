import { describe, expect, it, vi } from "vitest";
import { OverlayRenderer } from "./overlayRenderer";
import type { PostureAnalysis, TrackedPoint } from "../domain/types";

type MockContext = Pick<
  CanvasRenderingContext2D,
  "arc" | "beginPath" | "clearRect" | "fill" | "lineTo" | "moveTo" | "stroke"
> & {
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineCap: CanvasLineCap;
  lineWidth: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
};

function point(id: string, x: number, y: number, source: TrackedPoint["source"]): TrackedPoint {
  return {
    id,
    x,
    y,
    visibility: 0.9,
    source,
  };
}

function analysis(): PostureAnalysis {
  return {
    mode: "side",
    overallScore: 90,
    confidence: 0.9,
    statuses: [],
    points: [point("ear", 0.25, 0.2, "mediapipe"), point("cervical", 0.5, 0.4, "inferred")],
  };
}

function mockContext(): MockContext {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    lineCap: "butt",
    lineTo: vi.fn(),
    lineWidth: 0,
    moveTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: "",
  };
}

function canvasWithContext(context: CanvasRenderingContext2D | null): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  Object.defineProperty(canvas, "getContext", {
    value: vi.fn(() => context),
  });

  return canvas;
}

function videoWithSize(width: number, height: number): HTMLVideoElement {
  const video = document.createElement("video");

  Object.defineProperties(video, {
    clientHeight: { value: height },
    clientWidth: { value: width },
    videoHeight: { value: height },
    videoWidth: { value: width },
  });

  return video;
}

describe("OverlayRenderer", () => {
  it("render가 캔버스를 지우고 연결선과 포인트를 그린다", () => {
    const context = mockContext();
    const canvas = canvasWithContext(context as unknown as CanvasRenderingContext2D);
    const renderer = new OverlayRenderer(canvas);

    renderer.render(analysis(), videoWithSize(800, 600));

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(context.moveTo).toHaveBeenCalledWith(200, 120);
    expect(context.lineTo).toHaveBeenCalledWith(400, 240);
    expect(context.stroke).toHaveBeenCalledTimes(1);
    expect(context.arc).toHaveBeenCalledWith(200, 120, 7, 0, Math.PI * 2);
    expect(context.arc).toHaveBeenCalledWith(400, 240, 5, 0, Math.PI * 2);
    expect(context.fill).toHaveBeenCalledTimes(2);
  });

  it("2d context가 null이어도 render와 clear가 예외를 던지지 않는다", () => {
    const renderer = new OverlayRenderer(canvasWithContext(null));

    expect(() => renderer.render(analysis(), videoWithSize(800, 600))).not.toThrow();
    expect(() => renderer.clear()).not.toThrow();
  });
});
