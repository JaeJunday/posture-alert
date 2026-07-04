import type { BodyPart, PostureAnalysis } from "./types";

function roundedAverage(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function roundedAverageToTwoDecimals(values: number[]): number {
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

export class PostureSmoother {
  private readonly windowSize: number;
  private readonly frames: PostureAnalysis[] = [];

  constructor(windowSize = 5) {
    this.windowSize = windowSize;
  }

  push(frame: PostureAnalysis): PostureAnalysis {
    this.frames.push(frame);
    this.frames.splice(0, Math.max(0, this.frames.length - this.windowSize));

    return {
      ...frame,
      overallScore: roundedAverage(this.frames.map((recentFrame) => recentFrame.overallScore)),
      confidence: roundedAverageToTwoDecimals(this.frames.map((recentFrame) => recentFrame.confidence)),
      statuses: frame.statuses.map((status) => ({
        ...status,
        score: roundedAverage(this.scoresForPart(status.part)),
      })),
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
