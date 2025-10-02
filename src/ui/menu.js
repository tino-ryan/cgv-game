import { playerHealth } from "../core/state.js";

import { updateHeartsUI } from "./healthUI.js";

export function initMenu() {
  const gameOverDiv = document.createElement("div");
  gameOverDiv.id = "game-over";
  gameOverDiv.style.display = "none";
  gameOverDiv.style.position = "absolute";
  gameOverDiv.style.top = "50%";
  gameOverDiv.style.left = "50%";
  gameOverDiv.style.transform = "translate(-50%, -50%)";
  gameOverDiv.style.fontSize = "48px";
  gameOverDiv.style.color = "white";
  gameOverDiv.style.textAlign = "center";

  const gameOverText = document.createElement("p");
  gameOverText.innerText = "Game Over";
  gameOverDiv.appendChild(gameOverText);

  const retryBtn = document.createElement("button");
  retryBtn.id = "retry-btn";
  retryBtn.innerText = "Retry";
  gameOverDiv.appendChild(retryBtn);

  document.body.appendChild(gameOverDiv);

  retryBtn.addEventListener("click", retryGame);
}

export function showGameOver() {
  document.getElementById("game-over").style.display = "block";
}

export function retryGame() {
  playerHealth.currentHearts = playerHealth.maxHearts;
  updateHeartsUI();
  document.getElementById("game-over").style.display = "none";
}
