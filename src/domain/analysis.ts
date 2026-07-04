import type { SideAnatomy } from "./anatomy";
import { angleFromVerticalDegrees, clamp, distance2d, scoreFromRange } from "./geometry";
import type { BodyPart, PostureAnalysis, Severity, TrackedPoint } from "./types";

const UNSTABLE_MESSAGE = "기준점 추적이 불안정해요. 카메라 위치를 조정해 주세요.";

const METRICS = [
  {
    part: "neck",
    label: "목",
    warning: 0.12,
    danger: 0.24,
    weight: 0.28,
    pointIds: ["ear", "shoulder"],
  },
  {
    part: "cervical",
    label: "경추",
    warning: 18,
    danger: 34,
    weight: 0.22,
    pointIds: ["ear", "cervical", "shoulder"],
  },
  {
    part: "spine",
    label: "척추",
    warning: 0.08,
    danger: 0.18,
    weight: 0.18,
    pointIds: ["cervical", "upperSpine", "midSpine", "lumbar"],
  },
  {
    part: "lumbar",
    label: "요추",
    warning: 0.08,
    danger: 0.18,
    weight: 0.14,
    pointIds: ["lumbar", "hip"],
  },
  {
    part: "trunk",
    label: "몸통",
    warning: 10,
    danger: 24,
    weight: 0.18,
    pointIds: ["shoulder", "hip"],
  },
] as const satisfies readonly {
  part: BodyPart;
  label: string;
  warning: number;
  danger: number;
  weight: number;
  pointIds: readonly string[];
}[];

export function analyzePosture(anatomy: SideAnatomy): PostureAnalysis {
  const points = orderedPoints(anatomy);

  if (!anatomy.isStable) {
    return {
      mode: "side",
      overallScore: 0,
      confidence: anatomy.confidence,
      statuses: METRICS.map((metric) => ({
        part: metric.part,
        severity: "unstable",
        score: 0,
        message: UNSTABLE_MESSAGE,
        pointIds: [],
      })),
      points,
    };
  }

  const { ear, shoulder, hip, cervical, upperSpine, midSpine, lumbar } = anatomy.points;
  const torsoLength = Math.max(distance2d(shoulder, hip), 0.001);
  const centerX = (shoulder.x + hip.x) / 2;

  const valuesByPart: Record<BodyPart, number> = {
    neck: Math.abs(ear.x - shoulder.x) / torsoLength,
    cervical: angleFromVerticalDegrees(ear, shoulder),
    spine:
      Math.max(
        Math.abs(cervical.x - centerX),
        Math.abs(upperSpine.x - centerX),
        Math.abs(midSpine.x - centerX),
        Math.abs(lumbar.x - centerX),
      ) / torsoLength,
    lumbar: Math.abs(lumbar.x - hip.x) / torsoLength,
    trunk: angleFromVerticalDegrees(shoulder, hip),
  };

  const statuses = METRICS.map((metric) => {
    const score = scoreFromRange(valuesByPart[metric.part], metric.warning, metric.danger);

    return {
      part: metric.part,
      severity: severityFromScore(score),
      score,
      message: messageFor(metric.label, severityFromScore(score)),
      pointIds: [...metric.pointIds],
    };
  });
  const overallScore = Math.round(
    statuses.reduce((total, status) => {
      const metric = METRICS.find((candidate) => candidate.part === status.part);
      return total + status.score * (metric?.weight ?? 0);
    }, 0),
  );

  return {
    mode: "side",
    overallScore: clamp(overallScore, 0, 100),
    confidence: anatomy.confidence,
    statuses,
    points,
  };
}

function orderedPoints(anatomy: SideAnatomy): TrackedPoint[] {
  const { ear, shoulder, hip, knee, ankle, cervical, upperSpine, midSpine, lumbar } = anatomy.points;
  return [ear, shoulder, hip, knee, ankle, cervical, upperSpine, midSpine, lumbar];
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
