import { describe, expect, it } from "vitest";
import { createAppShell } from "./appShell";

describe("createAppShell", () => {
  it("영상, 오버레이, 점수 패널, 하단 툴바를 만든다", () => {
    const shell = createAppShell();

    expect(shell.root.querySelector("video")).toBe(shell.video);
    expect(shell.root.querySelector("canvas")).toBe(shell.overlay);
    expect(shell.root.querySelector(".status-panel")).toBeTruthy();
    expect(shell.root.querySelector('[data-role="score"]')).toBeTruthy();
    expect(shell.root.querySelector('[data-role="toolbar"]')).toBeTruthy();
    expect(shell.startButton.textContent).toBe("시작");
  });
});
