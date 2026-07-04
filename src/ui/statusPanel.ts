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

export function renderStatusPanel(
  elements: StatusPanelElements,
  analysis: PostureAnalysis,
): void {
  elements.scoreValue.textContent = String(analysis.overallScore);
  elements.confidenceValue.textContent = `추적 신뢰도 ${Math.round(
    analysis.confidence * 100,
  )}%`;
  elements.statusList.replaceChildren(...analysis.statuses.map(renderStatusCard));
}

function renderStatusCard(status: BodyPartStatus): HTMLElement {
  const card = document.createElement("article");
  card.className = `status-card status-card--${status.severity}`;

  const title = document.createElement("strong");
  title.textContent = PART_LABEL[status.part];

  const score = document.createElement("span");
  score.textContent =
    status.severity === "unstable" ? "추적 불안정" : `${status.score}점`;

  const message = document.createElement("p");
  message.textContent = status.message;

  card.append(title, score, message);

  return card;
}
