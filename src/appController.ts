import { CameraController, listVideoInputDevices } from "./camera/cameraController";
import { analyzePosture } from "./domain/analysis";
import { inferSideAnatomy } from "./domain/anatomy";
import { PostureSmoother } from "./domain/smoothing";
import { OverlayRenderer } from "./overlay/overlayRenderer";
import { renderStatusPanel } from "./ui/statusPanel";
import type { AppShell } from "./ui/appShell";
import { MediaPipePoseDetector } from "./vision/mediapipePoseDetector";
import type { PoseDetector } from "./vision/poseDetector";

const AUTO_START_STORAGE_KEY = "posture-alert:auto-start-camera";
const SCORE_UPDATE_INTERVAL_MS = 1000;

type AppControllerDependencies = {
  camera?: Pick<CameraController, "start" | "stop">;
  createDetector?: () => Promise<PoseDetector>;
  listDevices?: () => Promise<MediaDeviceInfo[]>;
  overlayRenderer?: Pick<OverlayRenderer, "clear" | "render">;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
  smoother?: PostureSmoother;
};

export type AppController = {
  init: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => void;
  dispose: () => void;
};

export function createAppController(
  shell: AppShell,
  dependencies: AppControllerDependencies = {},
): AppController {
  const camera = dependencies.camera ?? new CameraController(shell.video);
  const overlayRenderer = dependencies.overlayRenderer ?? new OverlayRenderer(shell.overlay);
  const smoother = dependencies.smoother ?? new PostureSmoother();
  const createDetector = dependencies.createDetector ?? MediaPipePoseDetector.create;
  const listDevices = dependencies.listDevices ?? listVideoInputDevices;
  const requestFrame =
    dependencies.requestAnimationFrame ?? window.requestAnimationFrame.bind(window);
  const cancelFrame =
    dependencies.cancelAnimationFrame ?? window.cancelAnimationFrame.bind(window);

  let detector: PoseDetector | null = null;
  let frameRequestId: number | null = null;
  let lastScoreUpdateMs = Number.NEGATIVE_INFINITY;
  let running = false;

  async function init(): Promise<void> {
    shell.startButton.addEventListener("click", handleStartClick);
    shell.stopButton.addEventListener("click", stop);
    await refreshCameraOptions();
    updateControls(false);

    if (shouldAutoStart()) {
      await start();
    }
  }

  async function start(): Promise<void> {
    if (running) {
      return;
    }

    setMessage("카메라 권한을 확인하고 있어요.");
    updateControls(true);

    try {
      await camera.start(shell.cameraSelect.value || undefined);
      await refreshCameraOptions();
      detector = await createDetector();
      running = true;
      setAutoStart(true);
      smoother.reset();
      lastScoreUpdateMs = Number.NEGATIVE_INFINITY;
      setMessage("옆모습이 화면에 들어오도록 앉아 주세요.");
      scheduleNextFrame();
    } catch (error) {
      running = false;
      camera.stop();
      detector?.close();
      detector = null;
      overlayRenderer.clear();
      updateControls(false);
      setMessage(messageFromError(error));
    }
  }

  function stop(): void {
    running = false;
    setAutoStart(false);

    if (frameRequestId !== null) {
      cancelFrame(frameRequestId);
      frameRequestId = null;
    }

    camera.stop();
    detector?.close();
    detector = null;
    smoother.reset();
    lastScoreUpdateMs = Number.NEGATIVE_INFINITY;
    overlayRenderer.clear();
    updateControls(false);
    setMessage("카메라를 시작하면 옆모습 자세 분석을 시작해요.");
  }

  function dispose(): void {
    stop();
    shell.startButton.removeEventListener("click", handleStartClick);
    shell.stopButton.removeEventListener("click", stop);
  }

  async function handleStartClick(): Promise<void> {
    await start();
  }

  function scheduleNextFrame(): void {
    frameRequestId = requestFrame(analyzeFrame);
  }

  function analyzeFrame(timestampMs: number): void {
    if (!running || !detector) {
      return;
    }

    const result = detector.detect(shell.video, timestampMs);

    if (!result) {
      overlayRenderer.clear();
      setMessage("몸의 옆모습이 보이도록 카메라 위치를 조정해 주세요.");
      scheduleNextFrame();
      return;
    }

    const anatomy = inferSideAnatomy(result.landmarks);
    const analysis = smoother.push(analyzePosture(anatomy));

    if (timestampMs - lastScoreUpdateMs >= SCORE_UPDATE_INTERVAL_MS) {
      renderStatusPanel(
        {
          scoreValue: shell.scoreValue,
          confidenceValue: shell.confidenceValue,
          statusList: shell.statusList,
        },
        analysis,
      );
      lastScoreUpdateMs = timestampMs;
    }

    overlayRenderer.render(analysis, shell.video);
    setMessage(messageForAnalysis(analysis.confidence, analysis.trackingScope));
    scheduleNextFrame();
  }

  async function refreshCameraOptions(): Promise<void> {
    const selectedDeviceId = shell.cameraSelect.value;
    const devices = await listDevices();
    const options =
      devices.length > 0
        ? devices.map((device, index) => cameraOption(device, index))
        : [defaultCameraOption()];

    shell.cameraSelect.replaceChildren(...options);
    shell.cameraSelect.value = devices.some((device) => device.deviceId === selectedDeviceId)
      ? selectedDeviceId
      : (devices[0]?.deviceId ?? "");
  }

  function updateControls(isStartingOrRunning: boolean): void {
    shell.startButton.disabled = isStartingOrRunning;
    shell.stopButton.disabled = !isStartingOrRunning;
    shell.cameraSelect.disabled = isStartingOrRunning;
  }

  function setMessage(message: string): void {
    shell.message.textContent = message;
  }

  return {
    init,
    start,
    stop,
    dispose,
  };
}

function cameraOption(device: MediaDeviceInfo, index: number): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = device.deviceId;
  option.textContent = device.label || `카메라 ${index + 1}`;
  return option;
}

function defaultCameraOption(): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "기본 카메라";
  return option;
}

function messageFromError(error: unknown): string {
  if (isDomError(error, "NotAllowedError") || includesErrorText(error, "permission denied")) {
    return "카메라 권한이 거부됐어요. 브라우저와 OS 카메라 권한을 허용한 뒤 새로고침해 주세요.";
  }

  if (isDomError(error, "NotFoundError")) {
    return "사용 가능한 카메라를 찾지 못했어요.";
  }

  if (isDomError(error, "NotReadableError")) {
    return "카메라를 열 수 없어요. 다른 앱이 카메라를 사용 중인지 확인해 주세요.";
  }

  if (isDomError(error, "SecurityError")) {
    return "카메라는 HTTPS 또는 localhost 주소에서만 사용할 수 있어요.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "카메라를 시작하지 못했어요.";
}

function isDomError(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

function includesErrorText(error: unknown, text: string): boolean {
  return error instanceof Error && error.message.toLowerCase().includes(text);
}

function messageForAnalysis(confidence: number, trackingScope: "upper" | "full"): string {
  if (confidence < 0.55) {
    return "기준점 추적이 불안정해요. 카메라 위치를 조정해 주세요.";
  }

  return trackingScope === "full"
    ? "전신 기준으로 옆모습 자세를 분석하고 있어요."
    : "상체 기준으로 옆모습 자세를 분석하고 있어요.";
}

function shouldAutoStart(): boolean {
  return safeLocalStorage()?.getItem(AUTO_START_STORAGE_KEY) === "1";
}

function setAutoStart(enabled: boolean): void {
  const storage = safeLocalStorage();
  if (!storage) {
    return;
  }

  if (enabled) {
    storage.setItem(AUTO_START_STORAGE_KEY, "1");
    return;
  }

  storage.removeItem(AUTO_START_STORAGE_KEY);
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}
