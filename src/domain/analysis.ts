import type { SideAnatomy } from "./anatomy";
import { angleFromVerticalDegrees, clamp, distance2d, scoreFromRange } from "./geometry";
import type { BodyPart, BodyPartStatus, PostureAnalysis, Severity, TrackedPoint, TrackingScope } from "./types";

const MIN_VISIBILITY = 0.55;
const UNSTABLE_MESSAGE = "기준점 추적이 불안정해요. 카메라 위치를 조정해 주세요.";
const CORE_POINT_IDS = ["ear", "shoulder", "hip"] as const satisfies readonly PointId[];
const POINT_ORDER = [
  "ear",
  "shoulder",
  "elbow",
  "wrist",
  "hip",
  "knee",
  "ankle",
  "cervical",
  "upperSpine",
  "midSpine",
  "lumbar",
] as const satisfies readonly PointId[];

type PointId = keyof SideAnatomy["points"];
type MetricDefinition = {
  part: BodyPart;
  label: string;
  warning: number;
  danger: number;
  weight: number;
  pointIds: readonly PointId[];
  inputPointIds: readonly PointId[];
};

const UPPER_METRICS = [
  {
    part: "neck",
    label: "목",
    warning: 0.12,
    danger: 0.24,
    weight: 0.28,
    pointIds: ["ear", "shoulder"],
    inputPointIds: ["ear", "shoulder", "hip"],
  },
  {
    part: "cervical",
    label: "경추",
    warning: 18,
    danger: 34,
    weight: 0.22,
    pointIds: ["ear", "cervical", "shoulder"],
    inputPointIds: ["ear", "cervical", "shoulder"],
  },
  {
    part: "spine",
    label: "척추",
    warning: 0.08,
    danger: 0.18,
    weight: 0.18,
    pointIds: ["cervical", "upperSpine", "midSpine", "lumbar"],
    inputPointIds: ["cervical", "upperSpine", "midSpine", "lumbar", "shoulder", "hip"],
  },
  {
    part: "lumbar",
    label: "요추",
    warning: 0.08,
    danger: 0.18,
    weight: 0.14,
    pointIds: ["lumbar", "hip"],
    inputPointIds: ["lumbar", "hip", "shoulder"],
  },
  {
    part: "trunk",
    label: "몸통",
    warning: 10,
    danger: 24,
    weight: 0.18,
    pointIds: ["shoulder", "hip"],
    inputPointIds: ["shoulder", "hip"],
  },
  {
    part: "arms",
    label: "팔",
    warning: 1,
    danger: 1,
    weight: 0,
    pointIds: ["shoulder", "elbow", "wrist"],
    inputPointIds: ["shoulder", "elbow", "wrist"],
  },
] as const satisfies readonly MetricDefinition[];

const FULL_METRICS = [
  {
    part: "neck",
    label: "목",
    warning: 0.12,
    danger: 0.24,
    weight: 0.24,
    pointIds: ["ear", "shoulder"],
    inputPointIds: ["ear", "shoulder", "hip"],
  },
  {
    part: "cervical",
    label: "경추",
    warning: 18,
    danger: 34,
    weight: 0.19,
    pointIds: ["ear", "cervical", "shoulder"],
    inputPointIds: ["ear", "cervical", "shoulder"],
  },
  {
    part: "spine",
    label: "척추",
    warning: 0.08,
    danger: 0.18,
    weight: 0.16,
    pointIds: ["cervical", "upperSpine", "midSpine", "lumbar"],
    inputPointIds: ["cervical", "upperSpine", "midSpine", "lumbar", "shoulder", "hip"],
  },
  {
    part: "lumbar",
    label: "요추",
    warning: 0.08,
    danger: 0.18,
    weight: 0.12,
    pointIds: ["lumbar", "hip"],
    inputPointIds: ["lumbar", "hip", "shoulder"],
  },
  {
    part: "trunk",
    label: "몸통",
    warning: 10,
    danger: 24,
    weight: 0.17,
    pointIds: ["shoulder", "hip"],
    inputPointIds: ["shoulder", "hip"],
  },
  {
    part: "arms",
    label: "팔",
    warning: 1,
    danger: 1,
    weight: 0.05,
    pointIds: ["shoulder", "elbow", "wrist"],
    inputPointIds: ["shoulder", "elbow", "wrist"],
  },
  {
    part: "legs",
    label: "다리",
    warning: 0.12,
    danger: 0.28,
    weight: 0.07,
    pointIds: ["hip", "knee", "ankle"],
    inputPointIds: ["hip", "knee", "ankle"],
  },
] as const satisfies readonly MetricDefinition[];

export function analyzePosture(anatomy: SideAnatomy): PostureAnalysis {
  const trackingScope = trackingScopeFor(anatomy);
  const metrics = metricsForScope(trackingScope);
  const points = orderedPoints(anatomy, trackingScope);

  if (isFullyUnstable(anatomy)) {
    return {
      mode: "side",
      trackingScope,
      overallScore: 0,
      confidence: anatomy.confidence,
      statuses: metrics.map((metric) => unstableStatus(metric, [])),
      points,
    };
  }

  let weightedTotal = 0;
  const statuses: BodyPartStatus[] = metrics.map((metric) => {
    if (hasUnstableInput(anatomy, metric.inputPointIds)) {
      return unstableStatus(metric, [...metric.pointIds]);
    }

    const value = valueForMetric(anatomy, metric.part);
    if (!Number.isFinite(value)) {
      return unstableStatus(metric, [...metric.pointIds]);
    }

    const score = scoreFromRange(value, metric.warning, metric.danger);
    const severity = severityFromScore(score);
    weightedTotal += score * metric.weight;
    return {
      part: metric.part,
      severity,
      score,
      message: messageFor(metric.label, severity),
      pointIds: [...metric.pointIds],
    };
  });
  const roundedOverallScore = Number.isFinite(weightedTotal) ? Math.round(weightedTotal) : 0;

  return {
    mode: "side",
    trackingScope,
    overallScore: clamp(roundedOverallScore, 0, 100),
    confidence: anatomy.confidence,
    statuses,
    points,
  };
}

function orderedPoints(anatomy: SideAnatomy, trackingScope: TrackingScope): TrackedPoint[] {
  const points: TrackedPoint[] = [];

  for (const pointId of POINT_ORDER) {
    if (trackingScope === "upper" && (pointId === "knee" || pointId === "ankle")) {
      continue;
    }

    const point = anatomy.points[pointId];
    if (point !== undefined) {
      points.push(point);
    }
  }

  return points;
}

function valueForMetric(anatomy: SideAnatomy, part: BodyPart): number {
  const { ear, shoulder, hip, knee, ankle, cervical, upperSpine, midSpine, lumbar } = anatomy.points;

  switch (part) {
    case "neck":
      return Math.abs(ear.x - shoulder.x) / torsoLength(shoulder, hip);
    case "cervical":
      return angleFromVerticalDegrees(ear, shoulder);
    case "spine": {
      const length = torsoLength(shoulder, hip);
      const centerX = (shoulder.x + hip.x) / 2;
      return (
        Math.max(
          Math.abs(cervical.x - centerX),
          Math.abs(upperSpine.x - centerX),
          Math.abs(midSpine.x - centerX),
          Math.abs(lumbar.x - centerX),
        ) / length
      );
    }
    case "lumbar":
      return Math.abs(lumbar.x - hip.x) / torsoLength(shoulder, hip);
    case "trunk":
      return angleFromVerticalDegrees(shoulder, hip);
    case "arms":
      return 0;
    case "legs":
      return Math.abs(knee.x - ankle.x) / torsoLength(hip, knee);
  }
}

function torsoLength(shoulder: TrackedPoint, hip: TrackedPoint): number {
  return Math.max(distance2d(shoulder, hip), 0.001);
}

function isFullyUnstable(anatomy: SideAnatomy): boolean {
  return CORE_POINT_IDS.every((pointId) => !isUsablePoint(anatomy.points[pointId]));
}

function trackingScopeFor(anatomy: SideAnatomy): TrackingScope {
  return isUsablePoint(anatomy.points.knee) && isUsablePoint(anatomy.points.ankle) ? "full" : "upper";
}

function metricsForScope(trackingScope: TrackingScope): readonly MetricDefinition[] {
  return trackingScope === "full" ? FULL_METRICS : UPPER_METRICS;
}

function hasUnstableInput(anatomy: SideAnatomy, pointIds: readonly PointId[]): boolean {
  return pointIds.some((pointId) => !isUsablePoint(anatomy.points[pointId]));
}

function isUsablePoint(point: TrackedPoint | undefined): point is TrackedPoint {
  return (
    point !== undefined &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Number.isFinite(point.visibility) &&
    point.visibility >= MIN_VISIBILITY
  );
}

function unstableStatus(metric: MetricDefinition, pointIds: PointId[]): BodyPartStatus {
  return {
    part: metric.part,
    severity: "unstable",
    score: 0,
    message: UNSTABLE_MESSAGE,
    pointIds,
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

function messageFor(label: string, severity: Severity): string {
  if (severity === "ok") {
    return `${label} 정렬이 안정적이에요.`;
  }

  if (severity === "warning") {
    return `${label} 정렬을 조금 세워 주세요.`;
  }

  return `${label} 정렬이 많이 무너졌어요.`;
}
