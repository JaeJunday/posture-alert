export type AppShell = {
  root: HTMLElement;
  video: HTMLVideoElement;
  overlay: HTMLCanvasElement;
  startButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  cameraSelect: HTMLSelectElement;
  scoreValue: HTMLElement;
  confidenceValue: HTMLElement;
  statusList: HTMLElement;
  message: HTMLElement;
};

export function createAppShell(): AppShell {
  const root = document.createElement("main");
  root.className = "app-shell";

  const stage = document.createElement("section");
  stage.className = "video-stage";
  stage.setAttribute("aria-label", "카메라 자세 분석 화면");

  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  const overlay = document.createElement("canvas");
  overlay.className = "pose-overlay";

  const message = document.createElement("p");
  message.className = "stage-message";
  message.textContent = "카메라를 시작하면 옆모습 자세 분석을 시작해요.";

  stage.append(video, overlay, message);

  const panel = document.createElement("aside");
  panel.className = "status-panel";

  const scoreLabel = document.createElement("span");
  scoreLabel.textContent = "현재 자세 점수";

  const scoreValue = document.createElement("strong");
  scoreValue.dataset.role = "score";
  scoreValue.textContent = "--";

  const confidenceValue = document.createElement("p");
  confidenceValue.dataset.role = "confidence";
  confidenceValue.textContent = "추적 신뢰도 --";

  const statusList = document.createElement("div");
  statusList.dataset.role = "status-list";

  panel.append(scoreLabel, scoreValue, confidenceValue, statusList);

  const toolbar = document.createElement("footer");
  toolbar.className = "toolbar";
  toolbar.dataset.role = "toolbar";

  const cameraSelect = document.createElement("select");
  cameraSelect.setAttribute("aria-label", "카메라 선택");

  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.textContent = "시작";

  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.textContent = "중지";
  stopButton.disabled = true;

  toolbar.append(cameraSelect, startButton, stopButton);
  root.append(stage, panel, toolbar);

  return {
    root,
    video,
    overlay,
    startButton,
    stopButton,
    cameraSelect,
    scoreValue,
    confidenceValue,
    statusList,
    message,
  };
}
