import "./styles.css";
import { createAppShell } from "./ui/appShell";

const mount = document.querySelector<HTMLDivElement>("#app");

if (!mount) {
  throw new Error("#app 요소를 찾을 수 없어요.");
}

const shell = createAppShell();
mount.append(shell.root);
