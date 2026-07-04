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
