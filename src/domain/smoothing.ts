import type { BodyPart, BodyPartStatus, PostureAnalysis, TrackedPoint } from "./types";

function roundedAverage(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function roundedAverageToTwoDecimals(values: number[]): number {
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function copyPoint(point: TrackedPoint): TrackedPoint {
  return { ...point };
}

function copyStatus(status: BodyPartStatus): BodyPartStatus {
  return {
    ...status,
    pointIds: [...status.pointIds],
  };
}

function copyFrame(frame: PostureAnalysis): PostureAnalysis {
  return {
    ...frame,
    statuses: frame.statuses.map(copyStatus),
    points: frame.points.map(copyPoint),
  };
}

export class PostureSmoother {
  private readonly windowSize: number;
  private readonly frames: PostureAnalysis[] = [];

  constructor(windowSize = 5) {
    this.windowSize = windowSize;
  }

  push(frame: PostureAnalysis): PostureAnalysis {
    const currentFrame = copyFrame(frame);
    this.frames.push(currentFrame);
    this.frames.splice(0, Math.max(0, this.frames.length - this.windowSize));

    return {
      ...currentFrame,
      overallScore: roundedAverage(this.frames.map((recentFrame) => recentFrame.overallScore)),
      confidence: roundedAverageToTwoDecimals(this.frames.map((recentFrame) => recentFrame.confidence)),
      statuses: currentFrame.statuses.map((status) => ({
        ...status,
        pointIds: [...status.pointIds],
        score: roundedAverage(this.scoresForPart(status.part)),
      })),
      points: currentFrame.points.map(copyPoint),
    };
  }

  reset(): void {
    this.frames.length = 0;
  }

  private scoresForPart(part: BodyPart): number[] {
    return this.frames.flatMap((frame) => {
      const status = frame.statuses.find((candidate) => candidate.part === part);
      return status ? [status.score] : [];
    });
  }
}
