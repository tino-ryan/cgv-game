import { playerHealth } from "../core/state.js";


export function updateHeartsUI() {
  const heartsContainer = document.getElementById("hearts-container");
  heartsContainer.innerHTML = "";

  for (let i = 0; i < playerHealth.maxHearts; i++) {
    heartsContainer.innerHTML += (i < playerHealth.currentHearts) ? "❤️" : "🖤";
  }
}
