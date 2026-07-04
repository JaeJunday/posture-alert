import type { PostureAnalysis } from "../domain/types";
import { buildOverlayPlan } from "./overlayPlan";

export class OverlayRenderer {
  private readonly context: CanvasRenderingContext2D | null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d");
  }

  render(analysis: PostureAnalysis, video: HTMLVideoElement): void {
    const width = video.videoWidth || video.clientWidth;
    const height = video.videoHeight || video.clientHeight;

    this.canvas.width = width;
    this.canvas.height = height;
    this.clear();

    const context = this.context;

    if (!context) {
      return;
    }

    const plan = buildOverlayPlan(analysis, width, height);

    for (const connection of plan.connections) {
      context.beginPath();
      context.moveTo(connection.x1, connection.y1);
      context.lineTo(connection.x2, connection.y2);
      context.strokeStyle = connection.color;
      context.lineWidth = connection.width;
      context.lineCap = "round";
      context.stroke();
    }

    for (const point of plan.points) {
      context.beginPath();
      context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      context.fillStyle = point.color;
      context.fill();
    }
  }

  clear(): void {
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
