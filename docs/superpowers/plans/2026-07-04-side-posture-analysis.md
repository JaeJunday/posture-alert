# 옆모습 자세 분석 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스마트폰 웹캠 옆모습 영상 위에 뼈대와 가상 해부학 핀포인트를 그리고, 목/경추/척추/요추/상체 기울어짐 경고와 전체 점수를 보여주는 브라우저 단독 MVP를 만든다.

**Architecture:** Vite + TypeScript 앱으로 시작한다. `domain` 계산 로직은 카메라와 분리해 Vitest로 검증하고, `camera`와 `vision`은 브라우저 API와 MediaPipe를 얇게 감싼다. `overlay`와 `ui`는 `PostureAnalysis` 결과만 받아 렌더링한다.

**Tech Stack:** Vite, TypeScript, Vitest, jsdom, `@mediapipe/tasks-vision`, DOM, Canvas 2D

---

## 파일 구조

- Create: `package.json` - 스크립트, 의존성, 개발 의존성 정의
- Create: `index.html` - Vite 앱 진입 HTML
- Create: `tsconfig.json` - TypeScript strict 설정
- Create: `vitest.config.ts` - Vitest와 jsdom 설정
- Create: `src/main.ts` - 앱 부트스트랩
- Create: `src/styles.css` - 전체 레이아웃과 시각 스타일
- Create: `src/ui/appShell.ts` - 정적 DOM 구조 생성
- Create: `src/domain/types.ts` - 공용 도메인 타입
- Create: `src/domain/geometry.ts` - 거리, 각도, 보간 계산
- Create: `src/domain/mediapipeLandmarks.ts` - MediaPipe pose landmark 인덱스
- Create: `src/domain/anatomy.ts` - 측면 선택과 가상 해부학 포인트 계산
- Create: `src/domain/analysis.ts` - 부위별 상태와 전체 점수 계산
- Create: `src/domain/smoothing.ts` - 프레임 흔들림 완화
- Create: `src/camera/cameraController.ts` - 카메라 스트림 관리
- Create: `src/vision/poseDetector.ts` - pose detector 인터페이스
- Create: `src/vision/mediapipePoseDetector.ts` - MediaPipe Pose Landmarker 어댑터
- Create: `src/overlay/overlayPlan.ts` - 분석 결과를 캔버스 드로잉 계획으로 변환
- Create: `src/overlay/overlayRenderer.ts` - Canvas 2D 렌더링
- Create: `src/ui/statusPanel.ts` - 점수와 경고 패널 갱신
- Create: `src/app/postureApp.ts` - 카메라, 추론, 분석, 렌더링 루프 연결
- Modify: `README.md` - 실행 방법과 MVP 범위 갱신
- Test: `src/**/*.test.ts` - 카메라 없는 계산/렌더링 계획/DOM 테스트

---

### Task 1: Vite + TypeScript 앱 골격

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `src/ui/appShell.ts`
- Test: `src/ui/appShell.test.ts`

- [ ] **Step 1: 패키지와 설정 파일 작성**

`package.json`:

```json
{
  "name": "posture-alert",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.9.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.35"
  },
  "devDependencies": {
    "jsdom": "^29.1.1",
    "typescript": "^6.0.3",
    "vite": "^8.1.3",
    "vitest": "^4.1.9"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "vitest.config.ts"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>자세 알리미</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: 의존성 설치**

Run:

```bash
pnpm install
```

Expected:

```text
pnpm install 명령이 exit code 0으로 끝난다.
```

`pnpm-lock.yaml`이 생성된다.

- [ ] **Step 3: 실패하는 앱 셸 테스트 작성**

`src/ui/appShell.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createAppShell } from "./appShell";

describe("createAppShell", () => {
  it("영상, 오버레이, 점수 패널, 하단 툴바를 만든다", () => {
    const shell = createAppShell();

    expect(shell.root.querySelector("video")).toBe(shell.video);
    expect(shell.root.querySelector("canvas")).toBe(shell.overlay);
    expect(shell.root.querySelector('[data-role="score"]')).toBeTruthy();
    expect(shell.root.querySelector('[data-role="toolbar"]')).toBeTruthy();
    expect(shell.startButton.textContent).toBe("시작");
  });
});
```

- [ ] **Step 4: 실패 확인**

Run:

```bash
pnpm test -- src/ui/appShell.test.ts
```

Expected:

```text
FAIL src/ui/appShell.test.ts
Cannot find module './appShell'
```

- [ ] **Step 5: 앱 셸 구현**

`src/ui/appShell.ts`:

```ts
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
```

`src/main.ts`:

```ts
import "./styles.css";
import { createAppShell } from "./ui/appShell";

const mount = document.querySelector<HTMLDivElement>("#app");

if (!mount) {
  throw new Error("#app 요소를 찾을 수 없어요.");
}

const shell = createAppShell();
mount.append(shell.root);
```

`src/styles.css`:

```css
:root {
  color: #0f172a;
  background: #f8fafc;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
}

button,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 16px;
  padding: 16px;
}

.video-stage {
  position: relative;
  min-height: 520px;
  overflow: hidden;
  border-radius: 8px;
  background: #020617;
}

.video-stage video,
.pose-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pose-overlay {
  pointer-events: none;
}

.stage-message {
  position: absolute;
  left: 16px;
  bottom: 16px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.82);
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.status-panel strong {
  font-size: 56px;
  line-height: 1;
}

.toolbar {
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.toolbar select {
  min-width: 240px;
}

.toolbar button {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: 테스트와 빌드 통과 확인**

Run:

```bash
pnpm test -- src/ui/appShell.test.ts
pnpm build
```

Expected:

```text
PASS src/ui/appShell.test.ts
pnpm build 명령이 exit code 0으로 끝난다.
```

- [ ] **Step 7: 커밋**

```bash
git add package.json pnpm-lock.yaml index.html tsconfig.json vitest.config.ts src/main.ts src/styles.css src/ui/appShell.ts src/ui/appShell.test.ts
git commit -m "프로젝트 앱 골격 추가"
```

---

### Task 2: 공용 타입과 기하 계산

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/geometry.ts`
- Test: `src/domain/geometry.test.ts`

- [ ] **Step 1: 실패하는 기하 테스트 작성**

`src/domain/geometry.test.ts`:

```ts
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
      visibility: 0.75,
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
    expect(scoreFromRange(0.18, 0.12, 0.24)).toBe(50);
    expect(scoreFromRange(0.3, 0.12, 0.24)).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test -- src/domain/geometry.test.ts
```

Expected:

```text
FAIL src/domain/geometry.test.ts
Cannot find module './geometry'
```

- [ ] **Step 3: 타입과 기하 계산 구현**

`src/domain/types.ts`:

```ts
export type AnalysisMode = "side";
export type Severity = "ok" | "warning" | "danger" | "unstable";
export type PointSource = "mediapipe" | "inferred";
export type Side = "left" | "right";

export type Point2D = {
  x: number;
  y: number;
};

export type PoseLandmark = Point2D & {
  z?: number;
  visibility?: number;
};

export type TrackedPoint = Point2D & {
  id: string;
  z?: number;
  visibility: number;
  source: PointSource;
};

export type BodyPart = "neck" | "cervical" | "spine" | "lumbar" | "trunk";

export type BodyPartStatus = {
  part: BodyPart;
  severity: Severity;
  score: number;
  message: string;
  pointIds: string[];
};

export type PostureAnalysis = {
  mode: AnalysisMode;
  overallScore: number;
  confidence: number;
  statuses: BodyPartStatus[];
  points: TrackedPoint[];
};
```

`src/domain/geometry.ts`:

```ts
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

  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
    z: a.z !== undefined && b.z !== undefined ? a.z + (b.z - a.z) * amount : undefined,
    visibility: aVisibility + (bVisibility - aVisibility) * amount,
  };
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
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
pnpm test -- src/domain/geometry.test.ts
```

Expected:

```text
PASS src/domain/geometry.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/domain/types.ts src/domain/geometry.ts src/domain/geometry.test.ts
git commit -m "자세 분석 공용 계산 추가"
```

---

### Task 3: 측면 선택과 가상 해부학 포인트

**Files:**
- Create: `src/domain/mediapipeLandmarks.ts`
- Create: `src/domain/anatomy.ts`
- Test: `src/domain/anatomy.test.ts`

- [ ] **Step 1: 실패하는 anatomy 테스트 작성**

`src/domain/anatomy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { inferSideAnatomy, selectVisibleSide } from "./anatomy";
import { POSE_LANDMARK } from "./mediapipeLandmarks";
import type { PoseLandmark } from "./types";

function landmarks(): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.1 }));
}

describe("anatomy", () => {
  it("visibility 합이 높은 측면을 고른다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.2, y: 0.1, visibility: 0.9 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.24, y: 0.35, visibility: 0.9 };
    points[POSE_LANDMARK.leftHip] = { x: 0.3, y: 0.7, visibility: 0.9 };
    points[POSE_LANDMARK.rightEar] = { x: 0.8, y: 0.1, visibility: 0.2 };
    points[POSE_LANDMARK.rightShoulder] = { x: 0.76, y: 0.35, visibility: 0.2 };
    points[POSE_LANDMARK.rightHip] = { x: 0.7, y: 0.7, visibility: 0.2 };

    expect(selectVisibleSide(points)).toBe("left");
  });

  it("가상 경추, 척추, 요추 포인트를 만든다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.35, y: 0.15, visibility: 0.95 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.3, y: 0.35, visibility: 0.95 };
    points[POSE_LANDMARK.leftHip] = { x: 0.32, y: 0.72, visibility: 0.95 };
    points[POSE_LANDMARK.leftKnee] = { x: 0.33, y: 0.88, visibility: 0.9 };
    points[POSE_LANDMARK.leftAnkle] = { x: 0.34, y: 0.98, visibility: 0.9 };

    const anatomy = inferSideAnatomy(points);

    expect(anatomy.side).toBe("left");
    expect(anatomy.isStable).toBe(true);
    expect(anatomy.points.cervical.source).toBe("inferred");
    expect(anatomy.points.upperSpine.source).toBe("inferred");
    expect(anatomy.points.midSpine.source).toBe("inferred");
    expect(anatomy.points.lumbar.source).toBe("inferred");
    expect(anatomy.points.cervical.x).toBeCloseTo(0.3375);
    expect(anatomy.points.lumbar.y).toBeGreaterThan(anatomy.points.midSpine.y);
  });

  it("주요 기준점 visibility가 낮으면 불안정으로 표시한다", () => {
    const points = landmarks();
    points[POSE_LANDMARK.leftEar] = { x: 0.35, y: 0.15, visibility: 0.4 };
    points[POSE_LANDMARK.leftShoulder] = { x: 0.3, y: 0.35, visibility: 0.4 };
    points[POSE_LANDMARK.leftHip] = { x: 0.32, y: 0.72, visibility: 0.4 };

    const anatomy = inferSideAnatomy(points);

    expect(anatomy.isStable).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test -- src/domain/anatomy.test.ts
```

Expected:

```text
FAIL src/domain/anatomy.test.ts
Cannot find module './anatomy'
```

- [ ] **Step 3: MediaPipe 인덱스와 anatomy 구현**

`src/domain/mediapipeLandmarks.ts`:

```ts
export const POSE_LANDMARK = {
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;
```

`src/domain/anatomy.ts`:

```ts
import { lerpPoint } from "./geometry";
import { POSE_LANDMARK } from "./mediapipeLandmarks";
import type { PoseLandmark, Side, TrackedPoint } from "./types";

const MIN_VISIBILITY = 0.55;

type SideKey = "ear" | "shoulder" | "hip" | "knee" | "ankle";

type SidePoints = Record<SideKey, TrackedPoint>;

export type SideAnatomy = {
  side: Side;
  isStable: boolean;
  confidence: number;
  points: SidePoints & {
    cervical: TrackedPoint;
    upperSpine: TrackedPoint;
    midSpine: TrackedPoint;
    lumbar: TrackedPoint;
  };
};

export function selectVisibleSide(landmarks: PoseLandmark[]): Side {
  const leftScore = visibilityAt(landmarks, POSE_LANDMARK.leftEar)
    + visibilityAt(landmarks, POSE_LANDMARK.leftShoulder)
    + visibilityAt(landmarks, POSE_LANDMARK.leftHip);
  const rightScore = visibilityAt(landmarks, POSE_LANDMARK.rightEar)
    + visibilityAt(landmarks, POSE_LANDMARK.rightShoulder)
    + visibilityAt(landmarks, POSE_LANDMARK.rightHip);

  return leftScore >= rightScore ? "left" : "right";
}

export function inferSideAnatomy(landmarks: PoseLandmark[]): SideAnatomy {
  const side = selectVisibleSide(landmarks);
  const indices = side === "left"
    ? {
        ear: POSE_LANDMARK.leftEar,
        shoulder: POSE_LANDMARK.leftShoulder,
        hip: POSE_LANDMARK.leftHip,
        knee: POSE_LANDMARK.leftKnee,
        ankle: POSE_LANDMARK.leftAnkle,
      }
    : {
        ear: POSE_LANDMARK.rightEar,
        shoulder: POSE_LANDMARK.rightShoulder,
        hip: POSE_LANDMARK.rightHip,
        knee: POSE_LANDMARK.rightKnee,
        ankle: POSE_LANDMARK.rightAnkle,
      };

  const ear = tracked("ear", landmarks[indices.ear], "mediapipe");
  const shoulder = tracked("shoulder", landmarks[indices.shoulder], "mediapipe");
  const hip = tracked("hip", landmarks[indices.hip], "mediapipe");
  const knee = tracked("knee", landmarks[indices.knee], "mediapipe");
  const ankle = tracked("ankle", landmarks[indices.ankle], "mediapipe");

  const cervical = tracked("cervical", lerpPoint(ear, shoulder, 0.25), "inferred");
  const upperSpine = tracked("upperSpine", lerpPoint(shoulder, hip, 0.25), "inferred");
  const midSpine = tracked("midSpine", lerpPoint(shoulder, hip, 0.5), "inferred");
  const lumbar = tracked("lumbar", lerpPoint(shoulder, hip, 0.78), "inferred");

  const coreVisibility = [ear.visibility, shoulder.visibility, hip.visibility];
  const confidence = Math.min(...coreVisibility);
  const isStable = coreVisibility.every((visibility) => visibility >= MIN_VISIBILITY);

  return {
    side,
    isStable,
    confidence,
    points: {
      ear,
      shoulder,
      hip,
      knee,
      ankle,
      cervical,
      upperSpine,
      midSpine,
      lumbar,
    },
  };
}

function visibilityAt(landmarks: PoseLandmark[], index: number): number {
  return landmarks[index]?.visibility ?? 0;
}

function tracked(id: string, landmark: PoseLandmark | undefined, source: TrackedPoint["source"]): TrackedPoint {
  return {
    id,
    x: landmark?.x ?? 0,
    y: landmark?.y ?? 0,
    z: landmark?.z,
    visibility: landmark?.visibility ?? 0,
    source,
  };
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
pnpm test -- src/domain/anatomy.test.ts
```

Expected:

```text
PASS src/domain/anatomy.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/domain/mediapipeLandmarks.ts src/domain/anatomy.ts src/domain/anatomy.test.ts
git commit -m "가상 해부학 포인트 계산 추가"
```

---

### Task 4: 부위별 자세 분석과 점수 계산

**Files:**
- Create: `src/domain/analysis.ts`
- Test: `src/domain/analysis.test.ts`

- [ ] **Step 1: 실패하는 분석 테스트 작성**

`src/domain/analysis.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { analyzePosture } from "./analysis";
import type { SideAnatomy } from "./anatomy";
import type { TrackedPoint } from "./types";

function point(id: string, x: number, y: number, visibility = 0.95): TrackedPoint {
  return { id, x, y, visibility, source: id.includes("Spine") || id === "cervical" || id === "lumbar" ? "inferred" : "mediapipe" };
}

function anatomy(overrides: Partial<SideAnatomy["points"]> = {}, isStable = true): SideAnatomy {
  const points = {
    ear: point("ear", 0.3, 0.16),
    shoulder: point("shoulder", 0.31, 0.35),
    hip: point("hip", 0.32, 0.72),
    knee: point("knee", 0.34, 0.86),
    ankle: point("ankle", 0.35, 0.97),
    cervical: point("cervical", 0.302, 0.21),
    upperSpine: point("upperSpine", 0.314, 0.44),
    midSpine: point("midSpine", 0.316, 0.54),
    lumbar: point("lumbar", 0.319, 0.64),
    ...overrides,
  };

  return {
    side: "left",
    isStable,
    confidence: isStable ? 0.95 : 0.2,
    points,
  };
}

describe("analyzePosture", () => {
  it("안정적인 바른 자세는 높은 점수를 준다", () => {
    const result = analyzePosture(anatomy());

    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.statuses.every((status) => status.severity === "ok")).toBe(true);
  });

  it("머리가 앞으로 나온 자세는 목과 경추 경고를 낸다", () => {
    const result = analyzePosture(anatomy({
      ear: point("ear", 0.47, 0.16),
      cervical: point("cervical", 0.43, 0.21),
    }));

    expect(result.overallScore).toBeLessThan(80);
    expect(result.statuses.find((status) => status.part === "neck")?.severity).not.toBe("ok");
    expect(result.statuses.find((status) => status.part === "cervical")?.severity).not.toBe("ok");
  });

  it("상체가 앞으로 기울면 상체와 척추 경고를 낸다", () => {
    const result = analyzePosture(anatomy({
      shoulder: point("shoulder", 0.46, 0.35),
      cervical: point("cervical", 0.44, 0.22),
      upperSpine: point("upperSpine", 0.43, 0.44),
      midSpine: point("midSpine", 0.4, 0.54),
      lumbar: point("lumbar", 0.36, 0.64),
    }));

    expect(result.statuses.find((status) => status.part === "trunk")?.severity).not.toBe("ok");
    expect(result.statuses.find((status) => status.part === "spine")?.severity).not.toBe("ok");
  });

  it("추적 불안정이면 모든 부위를 unstable로 표시한다", () => {
    const result = analyzePosture(anatomy({}, false));

    expect(result.overallScore).toBe(0);
    expect(result.confidence).toBe(0.2);
    expect(result.statuses.every((status) => status.severity === "unstable")).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test -- src/domain/analysis.test.ts
```

Expected:

```text
FAIL src/domain/analysis.test.ts
Cannot find module './analysis'
```

- [ ] **Step 3: 분석 구현**

`src/domain/analysis.ts`:

```ts
import type { SideAnatomy } from "./anatomy";
import { angleFromVerticalDegrees, clamp, distance2d, scoreFromRange } from "./geometry";
import type { BodyPart, BodyPartStatus, PostureAnalysis, Severity } from "./types";

type Metric = {
  part: BodyPart;
  value: number;
  warning: number;
  danger: number;
  messageOk: string;
  messageWarning: string;
  pointIds: string[];
  weight: number;
};

export function analyzePosture(anatomy: SideAnatomy): PostureAnalysis {
  const allPoints = Object.values(anatomy.points);

  if (!anatomy.isStable) {
    return {
      mode: "side",
      overallScore: 0,
      confidence: anatomy.confidence,
      points: allPoints,
      statuses: unstableStatuses(),
    };
  }

  const torsoLength = Math.max(distance2d(anatomy.points.shoulder, anatomy.points.hip), 0.001);
  const neckForwardRatio = Math.abs(anatomy.points.ear.x - anatomy.points.shoulder.x) / torsoLength;
  const cervicalAngle = angleFromVerticalDegrees(anatomy.points.ear, anatomy.points.shoulder);
  const trunkAngle = angleFromVerticalDegrees(anatomy.points.shoulder, anatomy.points.hip);
  const spineDeviation = maxHorizontalDeviation([
    anatomy.points.cervical,
    anatomy.points.upperSpine,
    anatomy.points.midSpine,
    anatomy.points.lumbar,
  ], anatomy.points.shoulder.x, anatomy.points.hip.x) / torsoLength;
  const lumbarDeviation = Math.abs(anatomy.points.lumbar.x - anatomy.points.hip.x) / torsoLength;

  const metrics: Metric[] = [
    {
      part: "neck",
      value: neckForwardRatio,
      warning: 0.12,
      danger: 0.24,
      messageOk: "목 위치가 안정적이에요.",
      messageWarning: "머리가 어깨보다 앞으로 나왔어요.",
      pointIds: ["ear", "shoulder"],
      weight: 0.28,
    },
    {
      part: "cervical",
      value: cervicalAngle,
      warning: 18,
      danger: 34,
      messageOk: "경추 추정 라인이 안정적이에요.",
      messageWarning: "경추 추정 라인이 앞으로 기울었어요.",
      pointIds: ["ear", "cervical", "shoulder"],
      weight: 0.22,
    },
    {
      part: "spine",
      value: spineDeviation,
      warning: 0.08,
      danger: 0.18,
      messageOk: "척추 추정 라인이 안정적이에요.",
      messageWarning: "척추 추정 라인이 한쪽으로 무너졌어요.",
      pointIds: ["cervical", "upperSpine", "midSpine", "lumbar"],
      weight: 0.18,
    },
    {
      part: "lumbar",
      value: lumbarDeviation,
      warning: 0.08,
      danger: 0.18,
      messageOk: "요추 기준점이 안정적이에요.",
      messageWarning: "요추 기준점이 골반 기준에서 벗어났어요.",
      pointIds: ["lumbar", "hip"],
      weight: 0.14,
    },
    {
      part: "trunk",
      value: trunkAngle,
      warning: 10,
      danger: 24,
      messageOk: "상체 기울기가 안정적이에요.",
      messageWarning: "상체가 앞으로 기울었어요.",
      pointIds: ["shoulder", "hip"],
      weight: 0.18,
    },
  ];

  const statuses = metrics.map(toStatus);
  const weightedTotal = statuses.reduce((sum, status) => {
    const metric = metrics.find((item) => item.part === status.part);
    return sum + status.score * (metric?.weight ?? 0);
  }, 0);

  return {
    mode: "side",
    overallScore: Math.round(clamp(weightedTotal, 0, 100)),
    confidence: anatomy.confidence,
    statuses,
    points: allPoints,
  };
}

function toStatus(metric: Metric): BodyPartStatus {
  const score = scoreFromRange(metric.value, metric.warning, metric.danger);

  return {
    part: metric.part,
    severity: severityFromScore(score),
    score,
    message: score >= 80 ? metric.messageOk : metric.messageWarning,
    pointIds: metric.pointIds,
  };
}

function severityFromScore(score: number): Severity {
  if (score >= 80) {
    return "ok";
  }
  if (score >= 60) {
    return "warning";
  }
  return "danger";
}

function unstableStatuses(): BodyPartStatus[] {
  const parts: BodyPart[] = ["neck", "cervical", "spine", "lumbar", "trunk"];

  return parts.map((part) => ({
    part,
    severity: "unstable",
    score: 0,
    message: "기준점 추적이 불안정해요. 카메라 위치를 조정해 주세요.",
    pointIds: [],
  }));
}

function maxHorizontalDeviation(points: Array<{ x: number }>, shoulderX: number, hipX: number): number {
  return Math.max(...points.map((point) => {
    const centerX = (shoulderX + hipX) / 2;
    return Math.abs(point.x - centerX);
  }));
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
pnpm test -- src/domain/analysis.test.ts
```

Expected:

```text
PASS src/domain/analysis.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/domain/analysis.ts src/domain/analysis.test.ts
git commit -m "부위별 자세 분석 추가"
```

---

### Task 5: 점수 흔들림 완화

**Files:**
- Create: `src/domain/smoothing.ts`
- Test: `src/domain/smoothing.test.ts`

- [ ] **Step 1: 실패하는 smoothing 테스트 작성**

`src/domain/smoothing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PostureSmoother } from "./smoothing";
import type { PostureAnalysis } from "./types";

function analysis(score: number): PostureAnalysis {
  return {
    mode: "side",
    overallScore: score,
    confidence: 0.9,
    points: [],
    statuses: [
      {
        part: "neck",
        severity: score >= 80 ? "ok" : "warning",
        score,
        message: "목 상태",
        pointIds: ["ear", "shoulder"],
      },
    ],
  };
}

describe("PostureSmoother", () => {
  it("최근 프레임 평균으로 전체 점수를 부드럽게 만든다", () => {
    const smoother = new PostureSmoother(3);

    expect(smoother.push(analysis(90)).overallScore).toBe(90);
    expect(smoother.push(analysis(60)).overallScore).toBe(75);
    expect(smoother.push(analysis(30)).overallScore).toBe(60);
    expect(smoother.push(analysis(90)).overallScore).toBe(60);
  });

  it("reset으로 누적 프레임을 지운다", () => {
    const smoother = new PostureSmoother(2);
    smoother.push(analysis(20));
    smoother.reset();

    expect(smoother.push(analysis(100)).overallScore).toBe(100);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test -- src/domain/smoothing.test.ts
```

Expected:

```text
FAIL src/domain/smoothing.test.ts
Cannot find module './smoothing'
```

- [ ] **Step 3: smoother 구현**

`src/domain/smoothing.ts`:

```ts
import type { BodyPartStatus, PostureAnalysis } from "./types";

export class PostureSmoother {
  private readonly frames: PostureAnalysis[] = [];

  constructor(private readonly windowSize = 5) {}

  push(frame: PostureAnalysis): PostureAnalysis {
    this.frames.push(frame);

    if (this.frames.length > this.windowSize) {
      this.frames.shift();
    }

    return {
      ...frame,
      overallScore: average(this.frames.map((item) => item.overallScore)),
      confidence: round2(mean(this.frames.map((item) => item.confidence))),
      statuses: frame.statuses.map((status) => this.smoothStatus(status)),
    };
  }

  reset(): void {
    this.frames.length = 0;
  }

  private smoothStatus(status: BodyPartStatus): BodyPartStatus {
    const scores = this.frames
      .map((frame) => frame.statuses.find((item) => item.part === status.part)?.score)
      .filter((score): score is number => typeof score === "number");

    if (scores.length === 0) {
      return status;
    }

    return {
      ...status,
      score: average(scores),
    };
  }
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(mean(values));
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
pnpm test -- src/domain/smoothing.test.ts
```

Expected:

```text
PASS src/domain/smoothing.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/domain/smoothing.ts src/domain/smoothing.test.ts
git commit -m "자세 점수 흔들림 완화 추가"
```

---

### Task 6: 카메라와 MediaPipe 어댑터

**Files:**
- Create: `src/camera/cameraController.ts`
- Create: `src/vision/poseDetector.ts`
- Create: `src/vision/mediapipePoseDetector.ts`
- Test: `src/camera/cameraController.test.ts`

- [ ] **Step 1: 실패하는 카메라 장치 목록 테스트 작성**

`src/camera/cameraController.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { listVideoInputDevices } from "./cameraController";

describe("listVideoInputDevices", () => {
  it("videoinput 장치만 반환한다", async () => {
    const devices: MediaDeviceInfo[] = [
      { deviceId: "cam-1", groupId: "g", kind: "videoinput", label: "Phone Camera", toJSON: () => ({}) },
      { deviceId: "mic-1", groupId: "g", kind: "audioinput", label: "Microphone", toJSON: () => ({}) },
    ];
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        enumerateDevices: vi.fn().mockResolvedValue(devices),
      },
      configurable: true,
    });

    await expect(listVideoInputDevices()).resolves.toEqual([devices[0]]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test -- src/camera/cameraController.test.ts
```

Expected:

```text
FAIL src/camera/cameraController.test.ts
Cannot find module './cameraController'
```

- [ ] **Step 3: 카메라 컨트롤러와 detector 타입 구현**

`src/camera/cameraController.ts`:

```ts
export async function listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

export class CameraController {
  private stream: MediaStream | null = null;

  constructor(private readonly video: HTMLVideoElement) {}

  async start(deviceId?: string): Promise<MediaStream> {
    this.stop();

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.stream = stream;
    this.video.srcObject = stream;
    await this.video.play();

    return stream;
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}
```

`src/vision/poseDetector.ts`:

```ts
import type { PoseLandmark } from "../domain/types";

export type PoseDetectionResult = {
  landmarks: PoseLandmark[];
};

export interface PoseDetector {
  detect(video: HTMLVideoElement, timestampMs: number): PoseDetectionResult | null;
  close(): void;
}
```

`src/vision/mediapipePoseDetector.ts`:

```ts
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { PoseLandmark } from "../domain/types";
import type { PoseDetectionResult, PoseDetector } from "./poseDetector";

const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export class MediaPipePoseDetector implements PoseDetector {
  private constructor(private readonly landmarker: PoseLandmarker) {}

  static async create(): Promise<MediaPipePoseDetector> {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    return new MediaPipePoseDetector(landmarker);
  }

  detect(video: HTMLVideoElement, timestampMs: number): PoseDetectionResult | null {
    const result: PoseLandmarkerResult = this.landmarker.detectForVideo(video, timestampMs);
    const landmarks = result.landmarks[0];

    if (!landmarks) {
      return null;
    }

    return {
      landmarks: landmarks.map((landmark): PoseLandmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility,
      })),
    };
  }

  close(): void {
    this.landmarker.close();
  }
}
```

- [ ] **Step 4: 테스트와 타입 확인**

Run:

```bash
pnpm test -- src/camera/cameraController.test.ts
pnpm build
```

Expected:

```text
PASS src/camera/cameraController.test.ts
pnpm build 명령이 exit code 0으로 끝난다.
```

- [ ] **Step 5: 커밋**

```bash
git add src/camera/cameraController.ts src/camera/cameraController.test.ts src/vision/poseDetector.ts src/vision/mediapipePoseDetector.ts
git commit -m "카메라와 포즈 추론 어댑터 추가"
```

---

### Task 7: 오버레이 드로잉 계획과 캔버스 렌더러

**Files:**
- Create: `src/overlay/overlayPlan.ts`
- Create: `src/overlay/overlayRenderer.ts`
- Test: `src/overlay/overlayPlan.test.ts`

- [ ] **Step 1: 실패하는 오버레이 계획 테스트 작성**

`src/overlay/overlayPlan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildOverlayPlan } from "./overlayPlan";
import type { PostureAnalysis } from "../domain/types";

const analysis: PostureAnalysis = {
  mode: "side",
  overallScore: 72,
  confidence: 0.9,
  points: [
    { id: "ear", x: 0.2, y: 0.1, visibility: 0.9, source: "mediapipe" },
    { id: "shoulder", x: 0.3, y: 0.3, visibility: 0.9, source: "mediapipe" },
    { id: "cervical", x: 0.24, y: 0.18, visibility: 0.9, source: "inferred" },
  ],
  statuses: [
    {
      part: "neck",
      severity: "warning",
      score: 70,
      message: "머리가 앞으로 나왔어요.",
      pointIds: ["ear", "shoulder", "cervical"],
    },
  ],
};

describe("buildOverlayPlan", () => {
  it("경고 부위의 점을 주황색으로 표시한다", () => {
    const plan = buildOverlayPlan(analysis, 1000, 500);

    expect(plan.points.find((point) => point.id === "ear")?.color).toBe("#f97316");
    expect(plan.points.find((point) => point.id === "cervical")?.radius).toBe(5);
    expect(plan.connections.some((connection) => connection.color === "#f97316")).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test -- src/overlay/overlayPlan.test.ts
```

Expected:

```text
FAIL src/overlay/overlayPlan.test.ts
Cannot find module './overlayPlan'
```

- [ ] **Step 3: 오버레이 계획과 렌더러 구현**

`src/overlay/overlayPlan.ts`:

```ts
import type { PostureAnalysis, Severity, TrackedPoint } from "../domain/types";

type PlannedPoint = {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
};

type PlannedConnection = {
  from: PlannedPoint;
  to: PlannedPoint;
  color: string;
  width: number;
};

export type OverlayPlan = {
  points: PlannedPoint[];
  connections: PlannedConnection[];
};

const CONNECTIONS = [
  ["ear", "cervical"],
  ["cervical", "shoulder"],
  ["cervical", "upperSpine"],
  ["upperSpine", "midSpine"],
  ["midSpine", "lumbar"],
  ["lumbar", "hip"],
] as const;

export function buildOverlayPlan(analysis: PostureAnalysis, width: number, height: number): OverlayPlan {
  const warningIds = new Set(
    analysis.statuses
      .filter((status) => status.severity === "warning" || status.severity === "danger")
      .flatMap((status) => status.pointIds),
  );
  const severityByPoint = new Map<string, Severity>();

  analysis.statuses.forEach((status) => {
    status.pointIds.forEach((id) => severityByPoint.set(id, status.severity));
  });

  const points = analysis.points.map((point) => plannedPoint(point, width, height, warningIds.has(point.id), severityByPoint.get(point.id)));
  const pointMap = new Map(points.map((point) => [point.id, point]));
  const connections = CONNECTIONS.flatMap(([fromId, toId]) => {
    const from = pointMap.get(fromId);
    const to = pointMap.get(toId);

    if (!from || !to) {
      return [];
    }

    const highlighted = warningIds.has(fromId) || warningIds.has(toId);

    return [{
      from,
      to,
      color: highlighted ? "#f97316" : "#cbd5e1",
      width: highlighted ? 4 : 2,
    }];
  });

  return { points, connections };
}

function plannedPoint(point: TrackedPoint, width: number, height: number, highlighted: boolean, severity?: Severity): PlannedPoint {
  return {
    id: point.id,
    x: point.x * width,
    y: point.y * height,
    radius: point.source === "inferred" ? 5 : 7,
    color: colorFor(point, highlighted, severity),
  };
}

function colorFor(point: TrackedPoint, highlighted: boolean, severity?: Severity): string {
  if (severity === "unstable" || point.visibility < 0.55) {
    return "#94a3b8";
  }

  if (highlighted) {
    return "#f97316";
  }

  return point.source === "inferred" ? "#22c55e" : "#38bdf8";
}
```

`src/overlay/overlayRenderer.ts`:

```ts
import type { PostureAnalysis } from "../domain/types";
import { buildOverlayPlan } from "./overlayPlan";

export class OverlayRenderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  render(analysis: PostureAnalysis, video: HTMLVideoElement): void {
    const width = video.videoWidth || this.canvas.clientWidth;
    const height = video.videoHeight || this.canvas.clientHeight;

    this.canvas.width = width;
    this.canvas.height = height;

    const context = this.canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, width, height);
    const plan = buildOverlayPlan(analysis, width, height);

    plan.connections.forEach((connection) => {
      context.beginPath();
      context.moveTo(connection.from.x, connection.from.y);
      context.lineTo(connection.to.x, connection.to.y);
      context.strokeStyle = connection.color;
      context.lineWidth = connection.width;
      context.lineCap = "round";
      context.stroke();
    });

    plan.points.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      context.fillStyle = point.color;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#ffffff";
      context.stroke();
    });
  }

  clear(): void {
    const context = this.canvas.getContext("2d");
    context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
pnpm test -- src/overlay/overlayPlan.test.ts
```

Expected:

```text
PASS src/overlay/overlayPlan.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/overlay/overlayPlan.ts src/overlay/overlayRenderer.ts src/overlay/overlayPlan.test.ts
git commit -m "자세 오버레이 렌더링 계획 추가"
```

---

### Task 8: 상태 패널 렌더링

**Files:**
- Create: `src/ui/statusPanel.ts`
- Test: `src/ui/statusPanel.test.ts`

- [ ] **Step 1: 실패하는 상태 패널 테스트 작성**

`src/ui/statusPanel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderStatusPanel } from "./statusPanel";
import type { PostureAnalysis } from "../domain/types";

describe("renderStatusPanel", () => {
  it("전체 점수와 부위별 경고를 표시한다", () => {
    const scoreValue = document.createElement("strong");
    const confidenceValue = document.createElement("p");
    const statusList = document.createElement("div");

    renderStatusPanel(
      { scoreValue, confidenceValue, statusList },
      {
        mode: "side",
        overallScore: 64,
        confidence: 0.88,
        points: [],
        statuses: [
          {
            part: "neck",
            severity: "warning",
            score: 64,
            message: "머리가 앞으로 나왔어요.",
            pointIds: ["ear", "shoulder"],
          },
        ],
      },
    );

    expect(scoreValue.textContent).toBe("64");
    expect(confidenceValue.textContent).toContain("88%");
    expect(statusList.textContent).toContain("목");
    expect(statusList.textContent).toContain("머리가 앞으로 나왔어요.");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test -- src/ui/statusPanel.test.ts
```

Expected:

```text
FAIL src/ui/statusPanel.test.ts
Cannot find module './statusPanel'
```

- [ ] **Step 3: 상태 패널 구현**

`src/ui/statusPanel.ts`:

```ts
import type { BodyPart, BodyPartStatus, PostureAnalysis } from "../domain/types";

type StatusPanelElements = {
  scoreValue: HTMLElement;
  confidenceValue: HTMLElement;
  statusList: HTMLElement;
};

const PART_LABEL: Record<BodyPart, string> = {
  neck: "목",
  cervical: "경추",
  spine: "척추",
  lumbar: "요추",
  trunk: "상체",
};

export function renderStatusPanel(elements: StatusPanelElements, analysis: PostureAnalysis): void {
  elements.scoreValue.textContent = String(analysis.overallScore);
  elements.confidenceValue.textContent = `추적 신뢰도 ${Math.round(analysis.confidence * 100)}%`;
  elements.statusList.replaceChildren(...analysis.statuses.map(renderStatusCard));
}

function renderStatusCard(status: BodyPartStatus): HTMLElement {
  const card = document.createElement("article");
  card.className = `status-card status-card--${status.severity}`;

  const title = document.createElement("strong");
  title.textContent = PART_LABEL[status.part];

  const score = document.createElement("span");
  score.textContent = status.severity === "unstable" ? "추적 불안정" : `${status.score}점`;

  const message = document.createElement("p");
  message.textContent = status.message;

  card.append(title, score, message);
  return card;
}
```

`src/styles.css`에 추가:

```css
.status-card {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.status-card p {
  margin: 0;
  color: #475569;
}

.status-card--warning,
.status-card--danger {
  border-color: #fed7aa;
  background: #fff7ed;
}

.status-card--warning strong,
.status-card--danger strong {
  color: #9a3412;
}

.status-card--unstable {
  border-color: #cbd5e1;
  background: #f1f5f9;
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
pnpm test -- src/ui/statusPanel.test.ts
```

Expected:

```text
PASS src/ui/statusPanel.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/ui/statusPanel.ts src/ui/statusPanel.test.ts src/styles.css
git commit -m "부위별 상태 패널 추가"
```

---

### Task 9: 앱 실행 루프 연결

**Files:**
- Create: `src/app/postureApp.ts`
- Modify: `src/main.ts`
- Test: `src/app/postureApp.test.ts`

- [ ] **Step 1: 실패하는 앱 루프 테스트 작성**

`src/app/postureApp.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createPostureApp } from "./postureApp";
import type { PoseDetector } from "../vision/poseDetector";
import { createAppShell } from "../ui/appShell";
import { POSE_LANDMARK } from "../domain/mediapipeLandmarks";
import type { PoseLandmark } from "../domain/types";

function landmarks(): PoseLandmark[] {
  const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.1 }));
  points[POSE_LANDMARK.leftEar] = { x: 0.45, y: 0.16, visibility: 0.95 };
  points[POSE_LANDMARK.leftShoulder] = { x: 0.3, y: 0.35, visibility: 0.95 };
  points[POSE_LANDMARK.leftHip] = { x: 0.32, y: 0.72, visibility: 0.95 };
  points[POSE_LANDMARK.leftKnee] = { x: 0.33, y: 0.86, visibility: 0.9 };
  points[POSE_LANDMARK.leftAnkle] = { x: 0.34, y: 0.97, visibility: 0.9 };
  return points;
}

describe("createPostureApp", () => {
  it("검출 결과를 분석해 상태 패널을 갱신한다", () => {
    const shell = createAppShell();
    vi.spyOn(shell.overlay, "getContext").mockReturnValue(null);
    const detector: PoseDetector = {
      detect: vi.fn(() => ({ landmarks: landmarks() })),
      close: vi.fn(),
    };

    const app = createPostureApp({
      shell,
      detector,
      camera: {
        start: vi.fn(),
        stop: vi.fn(),
      },
      requestFrame: (callback) => {
        callback(1000);
        return 1;
      },
      cancelFrame: vi.fn(),
    });

    app.tick(1000);

    expect(shell.scoreValue.textContent).not.toBe("--");
    expect(shell.statusList.textContent).toContain("목");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
pnpm test -- src/app/postureApp.test.ts
```

Expected:

```text
FAIL src/app/postureApp.test.ts
Cannot find module './postureApp'
```

- [ ] **Step 3: 앱 실행 루프 구현**

`src/app/postureApp.ts`:

```ts
import { analyzePosture } from "../domain/analysis";
import { inferSideAnatomy } from "../domain/anatomy";
import { PostureSmoother } from "../domain/smoothing";
import { OverlayRenderer } from "../overlay/overlayRenderer";
import type { CameraController } from "../camera/cameraController";
import { renderStatusPanel } from "../ui/statusPanel";
import type { AppShell } from "../ui/appShell";
import type { PoseDetector } from "../vision/poseDetector";

type FrameRequester = (callback: FrameRequestCallback) => number;
type FrameCanceler = (handle: number) => void;

type PostureAppOptions = {
  shell: AppShell;
  camera: Pick<CameraController, "start" | "stop">;
  detector: PoseDetector;
  requestFrame?: FrameRequester;
  cancelFrame?: FrameCanceler;
};

export type PostureApp = {
  start(deviceId?: string): Promise<void>;
  stop(): void;
  tick(timestampMs: number): void;
};

export function createPostureApp(options: PostureAppOptions): PostureApp {
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const cancelFrame = options.cancelFrame ?? cancelAnimationFrame;
  const renderer = new OverlayRenderer(options.shell.overlay);
  const smoother = new PostureSmoother(5);
  let frameHandle: number | null = null;
  let running = false;

  function schedule(): void {
    frameHandle = requestFrame((timestampMs) => {
      tick(timestampMs);
      if (running) {
        schedule();
      }
    });
  }

  function tick(timestampMs: number): void {
    const detection = options.detector.detect(options.shell.video, timestampMs);

    if (!detection) {
      options.shell.message.textContent = "사람이 감지되지 않아요. 옆모습이 화면에 들어오게 조정해 주세요.";
      renderer.clear();
      return;
    }

    const anatomy = inferSideAnatomy(detection.landmarks);
    const analysis = smoother.push(analyzePosture(anatomy));

    options.shell.message.textContent = anatomy.isStable
      ? "실시간으로 자세를 분석하고 있어요."
      : "귀, 어깨, 골반 기준점 추적이 불안정해요.";

    renderer.render(analysis, options.shell.video);
    renderStatusPanel({
      scoreValue: options.shell.scoreValue,
      confidenceValue: options.shell.confidenceValue,
      statusList: options.shell.statusList,
    }, analysis);
  }

  return {
    async start(deviceId?: string) {
      await options.camera.start(deviceId);
      running = true;
      options.shell.startButton.disabled = true;
      options.shell.stopButton.disabled = false;
      schedule();
    },
    stop() {
      running = false;
      if (frameHandle !== null) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }
      smoother.reset();
      renderer.clear();
      options.camera.stop();
      options.shell.startButton.disabled = false;
      options.shell.stopButton.disabled = true;
      options.shell.message.textContent = "카메라를 시작하면 옆모습 자세 분석을 시작해요.";
    },
    tick,
  };
}
```

`src/main.ts`:

```ts
import "./styles.css";
import { CameraController, listVideoInputDevices } from "./camera/cameraController";
import { createPostureApp } from "./app/postureApp";
import { createAppShell } from "./ui/appShell";
import { MediaPipePoseDetector } from "./vision/mediapipePoseDetector";

const mount = document.querySelector<HTMLDivElement>("#app");

if (!mount) {
  throw new Error("#app 요소를 찾을 수 없어요.");
}

const shell = createAppShell();
mount.append(shell.root);

const camera = new CameraController(shell.video);
let app: ReturnType<typeof createPostureApp> | null = null;

async function boot(): Promise<void> {
  const devices = await listVideoInputDevices();
  shell.cameraSelect.replaceChildren(...devices.map((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || "카메라";
    return option;
  }));

  const detector = await MediaPipePoseDetector.create();
  app = createPostureApp({ shell, camera, detector });
  shell.message.textContent = "준비됐어요. 옆모습이 보이게 카메라를 놓고 시작해 주세요.";
}

shell.startButton.addEventListener("click", async () => {
  try {
    await app?.start(shell.cameraSelect.value || undefined);
  } catch (error) {
    shell.message.textContent = error instanceof Error
      ? `카메라를 시작하지 못했어요. ${error.message}`
      : "카메라를 시작하지 못했어요.";
  }
});

shell.stopButton.addEventListener("click", () => {
  app?.stop();
});

boot().catch((error) => {
  shell.message.textContent = error instanceof Error
    ? `모델을 불러오지 못했어요. ${error.message}`
    : "모델을 불러오지 못했어요.";
});
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
pnpm test -- src/app/postureApp.test.ts
pnpm build
```

Expected:

```text
PASS src/app/postureApp.test.ts
pnpm build 명령이 exit code 0으로 끝난다.
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/postureApp.ts src/app/postureApp.test.ts src/main.ts
git commit -m "실시간 자세 분석 루프 연결"
```

---

### Task 10: 실행 문서와 수동 검증

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README 실행 방법 수정**

`README.md`의 `## 실행 방법` 섹션을 아래 내용으로 교체한다.

````md
## 실행 방법

```bash
pnpm install
pnpm dev
```

브라우저에서 Vite가 안내하는 로컬 주소를 연 뒤 카메라 권한을 허용해요.

스마트폰을 웹캠으로 연결하고 몸의 옆모습이 화면에 들어오게 놓으면 돼요.

```bash
pnpm test
pnpm build
```

테스트와 빌드는 위 명령으로 확인해요.
````

- [ ] **Step 2: 전체 검증 실행**

Run:

```bash
pnpm test
pnpm build
```

Expected:

```text
pnpm test 명령이 exit code 0으로 끝난다.
pnpm build 명령이 exit code 0으로 끝난다.
```

- [ ] **Step 3: 개발 서버 실행**

Run:

```bash
pnpm dev
```

Expected:

```text
Local: http://localhost:5173/
```

- [ ] **Step 4: 브라우저 수동 검증**

브라우저에서 다음 항목을 확인한다.

- 카메라 권한 요청이 뜬다.
- 카메라를 허용하면 영상이 보인다.
- 옆모습이 잡히면 점수 패널 숫자가 바뀐다.
- 영상 위에 실제 관절점과 가상 해부학 포인트가 보인다.
- 목이나 상체가 앞으로 나오면 주황색 강조가 보인다.
- 몸이 화면 밖으로 나가면 추적 불안정 메시지가 보인다.
- 개발자 도구 Network에서 카메라 프레임 업로드 요청이 없다.

- [ ] **Step 5: 커밋**

```bash
git add README.md
git commit -m "실행 방법과 검증 절차 정리"
```

---

## 최종 확인

- [ ] `pnpm test`가 통과한다.
- [ ] `pnpm build`가 통과한다.
- [ ] 브라우저에서 카메라 권한, 영상 표시, 오버레이 표시를 확인했다.
- [ ] README에 실행 방법이 적혀 있다.
- [ ] MVP 제외 범위인 정면 모드, 다리꼬임, 골반 비틀림 정밀 판정을 구현하지 않았다.
- [ ] 영상 저장이나 서버 전송 기능을 추가하지 않았다.
