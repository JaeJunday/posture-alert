import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppController } from "./appController";
import { POSE_LANDMARK } from "./domain/mediapipeLandmarks";
import type { PoseLandmark } from "./domain/types";
import { createAppShell } from "./ui/appShell";
import type { PoseDetector } from "./vision/poseDetector";

function mediaDevice(deviceId: string, label: string): MediaDeviceInfo {
  return {
    deviceId,
    groupId: "",
    kind: "videoinput",
    label,
    toJSON: () => ({}),
  };
}

function visibleSideLandmarks(): PoseLandmark[] {
  const landmarks = Array.from<PoseLandmark>({ length: 33 }).fill({
    x: 0,
    y: 0,
    visibility: 0,
  });

  landmarks[POSE_LANDMARK.leftEar] = { x: 0.45, y: 0.2, visibility: 1 };
  landmarks[POSE_LANDMARK.leftShoulder] = { x: 0.45, y: 0.35, visibility: 1 };
  landmarks[POSE_LANDMARK.leftElbow] = { x: 0.46, y: 0.5, visibility: 1 };
  landmarks[POSE_LANDMARK.leftWrist] = { x: 0.46, y: 0.64, visibility: 1 };
  landmarks[POSE_LANDMARK.leftHip] = { x: 0.45, y: 0.7, visibility: 1 };
  landmarks[POSE_LANDMARK.leftKnee] = { x: 0.45, y: 0.84, visibility: 1 };
  landmarks[POSE_LANDMARK.leftAnkle] = { x: 0.45, y: 0.96, visibility: 1 };

  return landmarks;
}

function installLocalStorage(): Storage {
  const store = new Map<string, string>();
  const storage = {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => store.delete(key)),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
  } as Storage;

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });

  return storage;
}

describe("createAppController", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = installLocalStorage();
  });

  it("카메라 목록을 채우고 시작 시 선택한 카메라로 분석 루프를 시작한다", async () => {
    const shell = createAppShell();
    const camera = {
      start: vi.fn().mockResolvedValue({}),
      stop: vi.fn(),
    };
    const detector: PoseDetector = {
      detect: vi.fn().mockReturnValue({ landmarks: visibleSideLandmarks() }),
      close: vi.fn(),
    };
    const overlayRenderer = {
      clear: vi.fn(),
      render: vi.fn(),
    };
    let frameCallback: FrameRequestCallback = () => {
      throw new Error("프레임 콜백이 등록되지 않았어요.");
    };
    const controller = createAppController(shell, {
      camera,
      createDetector: vi.fn().mockResolvedValue(detector),
      listDevices: vi.fn().mockResolvedValue([mediaDevice("cam-1", "측면 카메라")]),
      overlayRenderer,
      requestAnimationFrame: vi.fn((callback) => {
        frameCallback = callback;
        return 1;
      }),
      cancelAnimationFrame: vi.fn(),
    });

    await controller.init();
    await controller.start();
    frameCallback(1000);

    expect(shell.cameraSelect.value).toBe("cam-1");
    expect(camera.start).toHaveBeenCalledWith("cam-1");
    expect(detector.detect).toHaveBeenCalledWith(shell.video, 1000);
    expect(shell.scoreValue.textContent).not.toBe("--");
    expect(shell.statusList.children.length).toBeGreaterThan(0);
    expect(overlayRenderer.render).toHaveBeenCalled();
    expect(shell.startButton.disabled).toBe(true);
    expect(shell.stopButton.disabled).toBe(false);
    expect(storage.getItem("posture-alert:auto-start-camera")).toBe("1");
  });

  it("이전에 카메라를 켠 상태면 초기화 후 자동으로 다시 시작한다", async () => {
    storage.setItem("posture-alert:auto-start-camera", "1");
    const shell = createAppShell();
    const camera = {
      start: vi.fn().mockResolvedValue({}),
      stop: vi.fn(),
    };
    const detector: PoseDetector = {
      detect: vi.fn().mockReturnValue(null),
      close: vi.fn(),
    };
    const controller = createAppController(shell, {
      camera,
      createDetector: vi.fn().mockResolvedValue(detector),
      listDevices: vi.fn().mockResolvedValue([mediaDevice("cam-1", "측면 카메라")]),
      overlayRenderer: {
        clear: vi.fn(),
        render: vi.fn(),
      },
      requestAnimationFrame: vi.fn(() => 1),
      cancelAnimationFrame: vi.fn(),
    });

    await controller.init();

    expect(camera.start).toHaveBeenCalledWith("cam-1");
    expect(shell.startButton.disabled).toBe(true);
    expect(shell.stopButton.disabled).toBe(false);
  });

  it("중지를 누르면 다음 진입 자동 시작을 해제한다", async () => {
    const shell = createAppShell();
    const camera = {
      start: vi.fn().mockResolvedValue({}),
      stop: vi.fn(),
    };
    const detector: PoseDetector = {
      detect: vi.fn().mockReturnValue(null),
      close: vi.fn(),
    };
    const controller = createAppController(shell, {
      camera,
      createDetector: vi.fn().mockResolvedValue(detector),
      listDevices: vi.fn().mockResolvedValue([]),
      overlayRenderer: {
        clear: vi.fn(),
        render: vi.fn(),
      },
      requestAnimationFrame: vi.fn(() => 1),
      cancelAnimationFrame: vi.fn(),
    });

    await controller.init();
    await controller.start();
    controller.stop();

    expect(storage.getItem("posture-alert:auto-start-camera")).toBeNull();
    expect(camera.stop).toHaveBeenCalled();
    expect(detector.close).toHaveBeenCalled();
  });

  it("분석은 계속하되 점수 패널은 1초에 한 번만 갱신한다", async () => {
    const shell = createAppShell();
    const camera = {
      start: vi.fn().mockResolvedValue({}),
      stop: vi.fn(),
    };
    const stableLandmarks = visibleSideLandmarks();
    const unstableLandmarks = visibleSideLandmarks();
    unstableLandmarks[POSE_LANDMARK.leftEar] = { x: 0.75, y: 0.2, visibility: 1 };
    const detector: PoseDetector = {
      detect: vi
        .fn()
        .mockReturnValueOnce({ landmarks: stableLandmarks })
        .mockReturnValueOnce({ landmarks: unstableLandmarks })
        .mockReturnValueOnce({ landmarks: unstableLandmarks }),
      close: vi.fn(),
    };
    const overlayRenderer = {
      clear: vi.fn(),
      render: vi.fn(),
    };
    let frameCallback: FrameRequestCallback = () => {
      throw new Error("프레임 콜백이 등록되지 않았어요.");
    };
    const controller = createAppController(shell, {
      camera,
      createDetector: vi.fn().mockResolvedValue(detector),
      listDevices: vi.fn().mockResolvedValue([]),
      overlayRenderer,
      requestAnimationFrame: vi.fn((callback) => {
        frameCallback = callback;
        return 1;
      }),
      cancelAnimationFrame: vi.fn(),
    });

    await controller.init();
    await controller.start();
    frameCallback(1000);
    const firstScore = shell.scoreValue.textContent;
    frameCallback(1500);
    const throttledScore = shell.scoreValue.textContent;
    frameCallback(2100);

    expect(detector.detect).toHaveBeenCalledTimes(3);
    expect(overlayRenderer.render).toHaveBeenCalledTimes(3);
    expect(throttledScore).toBe(firstScore);
    expect(shell.scoreValue.textContent).not.toBe(firstScore);
  });

  it("카메라 시작 실패 시 메시지를 표시하고 컨트롤을 복구한다", async () => {
    const shell = createAppShell();
    const camera = {
      start: vi.fn().mockRejectedValue(new Error("Permission denied")),
      stop: vi.fn(),
    };
    const controller = createAppController(shell, {
      camera,
      createDetector: vi.fn(),
      listDevices: vi.fn().mockResolvedValue([]),
      overlayRenderer: {
        clear: vi.fn(),
        render: vi.fn(),
      },
      requestAnimationFrame: vi.fn(),
      cancelAnimationFrame: vi.fn(),
    });

    await controller.init();
    await controller.start();

    expect(shell.message.textContent).toBe(
      "카메라 권한이 거부됐어요. 브라우저와 OS 카메라 권한을 허용한 뒤 새로고침해 주세요.",
    );
    expect(shell.startButton.disabled).toBe(false);
    expect(shell.stopButton.disabled).toBe(true);
    expect(camera.stop).toHaveBeenCalled();
  });
});
