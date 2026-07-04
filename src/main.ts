import "./styles.css";
import { createAppController } from "./appController";
import { createAppShell } from "./ui/appShell";

const mount = document.querySelector<HTMLDivElement>("#app");

if (!mount) {
  throw new Error("#app 요소를 찾을 수 없어요.");
}

const shell = createAppShell();
const controller = createAppController(shell);
mount.append(shell.root);

controller.init().catch((error: unknown) => {
  shell.message.textContent =
    error instanceof Error && error.message ? error.message : "앱을 초기화하지 못했어요.";
});
