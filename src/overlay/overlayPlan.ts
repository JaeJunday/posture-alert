import type { PointSource, PostureAnalysis, TrackedPoint } from "../domain/types";

const MIN_VISIBLE_POINT = 0.55;

const POINT_COLORS = {
  highlight: "#f97316",
  unstable: "#94a3b8",
  inferred: "#22c55e",
  mediapipe: "#38bdf8",
} as const;

const CONNECTION_COLOR = "#cbd5e1";

const POINT_RADII = {
  inferred: 5,
  mediapipe: 7,
} satisfies Record<PointSource, number>;

const CONNECTION_PAIRS = [
  ["ear", "cervical"],
  ["cervical", "shoulder"],
  ["shoulder", "elbow"],
  ["elbow", "wrist"],
  ["cervical", "upperSpine"],
  ["upperSpine", "midSpine"],
  ["midSpine", "lumbar"],
  ["lumbar", "hip"],
  ["hip", "knee"],
  ["knee", "ankle"],
] as const;

export type OverlayPoint = {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  visibility: number;
  source: PointSource;
};

export type OverlayConnection = {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
};

export type OverlayPlan = {
  points: OverlayPoint[];
  connections: OverlayConnection[];
};

export function buildOverlayPlan(analysis: PostureAnalysis, width: number, height: number): OverlayPlan {
  const highlightedPointIds = new Set<string>();
  const unstablePointIds = new Set<string>();

  for (const status of analysis.statuses) {
    if (status.severity === "warning" || status.severity === "danger") {
      status.pointIds.forEach((pointId) => highlightedPointIds.add(pointId));
    }

    if (status.severity === "unstable") {
      status.pointIds.forEach((pointId) => unstablePointIds.add(pointId));
    }
  }

  const points = analysis.points
    .filter((point) => analysis.trackingScope === "full" || (point.id !== "knee" && point.id !== "ankle"))
    .filter(hasFiniteCoordinates)
    .map((point) => toOverlayPoint(point, width, height, highlightedPointIds, unstablePointIds));
  const pointsById = new Map(points.map((point) => [point.id, point]));
  const connections = CONNECTION_PAIRS.flatMap(([from, to]) => {
    const start = pointsById.get(from);
    const end = pointsById.get(to);

    if (!start || !end) {
      return [];
    }

    const highlighted = highlightedPointIds.has(from) || highlightedPointIds.has(to);

    return [
      {
        from,
        to,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        color: highlighted ? POINT_COLORS.highlight : CONNECTION_COLOR,
        width: highlighted ? 4 : 2,
      },
    ];
  });

  return {
    points,
    connections,
  };
}

function hasFiniteCoordinates(point: TrackedPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function toOverlayPoint(
  point: TrackedPoint,
  width: number,
  height: number,
  highlightedPointIds: Set<string>,
  unstablePointIds: Set<string>,
): OverlayPoint {
  return {
    id: point.id,
    x: point.x * width,
    y: point.y * height,
    radius: POINT_RADII[point.source],
    color: colorForPoint(point, highlightedPointIds, unstablePointIds),
    visibility: point.visibility,
    source: point.source,
  };
}

function colorForPoint(
  point: TrackedPoint,
  highlightedPointIds: Set<string>,
  unstablePointIds: Set<string>,
): string {
  if (unstablePointIds.has(point.id) || point.visibility < MIN_VISIBLE_POINT) {
    return POINT_COLORS.unstable;
  }

  if (highlightedPointIds.has(point.id)) {
    return POINT_COLORS.highlight;
  }

  return POINT_COLORS[point.source];
}
