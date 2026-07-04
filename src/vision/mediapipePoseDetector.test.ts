import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaPipePoseDetector } from "./mediapipePoseDetector";

const mediaPipeMocks = vi.hoisted(() => ({
  createFromOptions: vi.fn(),
  forVisionTasks: vi.fn(),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: mediaPipeMocks.forVisionTasks,
  },
  PoseLandmarker: {
    createFromOptions: mediaPipeMocks.createFromOptions,
  },
}));

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

function expectedOptions(delegate: "CPU" | "GPU") {
  return {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
}

function createLandmarker() {
  return {
    close: vi.fn(),
    detectForVideo: vi.fn(),
  };
}

describe("MediaPipePoseDetector", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("MediaPipe WASM URL과 VIDEO 모드 GPU 옵션으로 PoseLandmarker를 생성한다", async () => {
    const vision = {};
    const landmarker = createLandmarker();
    mediaPipeMocks.forVisionTasks.mockResolvedValue(vision);
    mediaPipeMocks.createFromOptions.mockResolvedValue(landmarker);

    await MediaPipePoseDetector.create();

    expect(mediaPipeMocks.forVisionTasks).toHaveBeenCalledWith(WASM_URL);
    expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledWith(vision, expectedOptions("GPU"));
  });

  it("GPU 생성이 실패하면 CPU delegate로 한 번 재시도한다", async () => {
    const vision = {};
    const landmarker = createLandmarker();
    mediaPipeMocks.forVisionTasks.mockResolvedValue(vision);
    mediaPipeMocks.createFromOptions
      .mockRejectedValueOnce(new Error("GPU unavailable"))
      .mockResolvedValueOnce(landmarker);

    await MediaPipePoseDetector.create();

    expect(mediaPipeMocks.createFromOptions).toHaveBeenNthCalledWith(1, vision, expectedOptions("GPU"));
    expect(mediaPipeMocks.createFromOptions).toHaveBeenNthCalledWith(2, vision, expectedOptions("CPU"));
  });

  it("detectForVideo 첫 번째 포즈를 PoseLandmark 배열로 변환한다", async () => {
    const vision = {};
    const landmarker = createLandmarker();
    const video = document.createElement("video");
    landmarker.detectForVideo.mockReturnValue({
      landmarks: [
        [
          { x: 0.1, y: 0.2, z: -0.3, visibility: 0.9 },
          { x: 0.4, y: 0.5, z: -0.6, visibility: 0.8 },
        ],
      ],
      worldLandmarks: [],
    });
    mediaPipeMocks.forVisionTasks.mockResolvedValue(vision);
    mediaPipeMocks.createFromOptions.mockResolvedValue(landmarker);

    const detector = await MediaPipePoseDetector.create();
    const result = detector.detect(video, 1234);

    expect(landmarker.detectForVideo).toHaveBeenCalledWith(video, 1234);
    expect(result).toEqual({
      landmarks: [
        { x: 0.1, y: 0.2, z: -0.3, visibility: 0.9 },
        { x: 0.4, y: 0.5, z: -0.6, visibility: 0.8 },
      ],
    });
  });

  it("첫 번째 포즈가 없으면 null을 반환한다", async () => {
    const vision = {};
    const landmarker = createLandmarker();
    landmarker.detectForVideo.mockReturnValue({
      landmarks: [],
      worldLandmarks: [],
    });
    mediaPipeMocks.forVisionTasks.mockResolvedValue(vision);
    mediaPipeMocks.createFromOptions.mockResolvedValue(landmarker);

    const detector = await MediaPipePoseDetector.create();

    expect(detector.detect(document.createElement("video"), 1234)).toBeNull();
  });

  it("close 호출을 PoseLandmarker에 위임한다", async () => {
    const vision = {};
    const landmarker = createLandmarker();
    mediaPipeMocks.forVisionTasks.mockResolvedValue(vision);
    mediaPipeMocks.createFromOptions.mockResolvedValue(landmarker);

    const detector = await MediaPipePoseDetector.create();
    detector.close();

    expect(landmarker.close).toHaveBeenCalledOnce();
  });
});
