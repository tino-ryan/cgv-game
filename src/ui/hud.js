// src/ui/hud.js
export default class HUD {
  constructor() {
    // Tutorial text
    this.tutorialText = document.createElement("div");
    this.tutorialText.style.position = "absolute";
    this.tutorialText.style.top = "20%";
    this.tutorialText.style.left = "50%";
    this.tutorialText.style.transform = "translate(-50%, -50%)";
    this.tutorialText.style.color = "white";
    this.tutorialText.style.fontSize = "24px";
    this.tutorialText.style.textShadow = "2px 2px 4px black";
    this.tutorialText.style.textAlign = "center";
    this.tutorialText.style.maxWidth = "80%";
    this.tutorialText.style.display = "none";
    document.body.appendChild(this.tutorialText);

    // Player hearts (container)
    this.playerHeartsContainer = document.createElement("div");
    this.playerHeartsContainer.style.position = "absolute";
    this.playerHeartsContainer.style.bottom = "20px";
    this.playerHeartsContainer.style.left = "20px";
    this.playerHeartsContainer.style.fontSize = "28px";
    this.playerHeartsContainer.style.color = "red";
    document.body.appendChild(this.playerHeartsContainer);

    // Boss health bar
    this.bossHealthFill = null;
    this.bossHealthBar = null;
  }

  // Main message display method (used by Tutorial)
  showMessage(msg) {
    this.tutorialText.textContent = msg;
    this.tutorialText.style.display = msg ? "block" : "none";
  }

  // Tutorial UI (alias methods for compatibility)
  showTutorialText(text) {
    this.showMessage(text);
  }

  hideTutorialText() {
    this.showMessage("");
  }

  // Health Bar Creation (generic method)
  createHealthBar(label, yPosition, color) {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = yPosition + "px";
    container.style.left = "20px";
    container.style.width = "200px";
    container.style.background = "rgba(0,0,0,0.7)";
    container.style.padding = "10px";
    container.style.borderRadius = "8px";
    container.style.color = "white";
    container.style.fontFamily = "Arial, sans-serif";
    container.style.fontSize = "14px";

    const labelDiv = document.createElement("div");
    labelDiv.textContent = label;
    labelDiv.style.marginBottom = "5px";
    container.appendChild(labelDiv);

    const barBg = document.createElement("div");
    barBg.style.width = "100%";
    barBg.style.height = "20px";
    barBg.style.background = "rgba(255,255,255,0.2)";
    barBg.style.border = "2px solid white";
    barBg.style.borderRadius = "10px";
    barBg.style.overflow = "hidden";

    const fill = document.createElement("div");
    fill.style.height = "100%";
    fill.style.width = "100%";
    fill.style.background = color;
    fill.style.transition = "width 0.3s";
    barBg.appendChild(fill);

    container.appendChild(barBg);
    document.body.appendChild(container);

    return fill;
  }

  // Boss Health Bar (specific implementation)
  createBossHealthBar() {
    this.bossHealthBar = document.createElement("div");
    this.bossHealthBar.style.position = "absolute";
    this.bossHealthBar.style.top = "30px";
    this.bossHealthBar.style.left = "50%";
    this.bossHealthBar.style.transform = "translateX(-50%)";
    this.bossHealthBar.style.width = "300px";
    this.bossHealthBar.style.height = "24px";
    this.bossHealthBar.style.border = "2px solid white";
    this.bossHealthBar.style.background = "rgba(0,0,0,0.5)";
    this.bossHealthBar.style.textAlign = "center";
    this.bossHealthBar.style.position = "relative";

    this.bossHealthFill = document.createElement("div");
    this.bossHealthFill.style.height = "100%";
    this.bossHealthFill.style.width = "100%";
    this.bossHealthFill.style.background = "red";
    this.bossHealthFill.style.transition = "width 0.3s";
    this.bossHealthBar.appendChild(this.bossHealthFill);

    // Boss label
    const label = document.createElement("span");
    label.innerText = "Bellboy Ghost";
    label.style.position = "absolute";
    label.style.left = "0";
    label.style.top = "0";
    label.style.width = "100%";
    label.style.height = "100%";
    label.style.textAlign = "center";
    label.style.lineHeight = "24px";
    label.style.color = "white";
    label.style.fontWeight = "bold";
    label.style.textShadow = "1px 1px 2px black";
    this.bossHealthBar.appendChild(label);

    document.body.appendChild(this.bossHealthBar);
  }

  updateBossHealth(percent) {
    if (this.bossHealthFill) {
      this.bossHealthFill.style.width = percent + "%";
    }
  }

  removeBossHealthBar() {
    if (this.bossHealthBar && this.bossHealthBar.parentElement) {
      document.body.removeChild(this.bossHealthBar);
      this.bossHealthBar = null;
      this.bossHealthFill = null;
    }
  }

  // Player Hearts
  updatePlayerHearts(current, max) {
    this.playerHeartsContainer.innerHTML = "";
    for (let i = 0; i < max; i++) {
      const heart = document.createElement("span");
      heart.textContent = i < current ? "❤️" : "🖤";
      this.playerHeartsContainer.appendChild(heart);
    }
  }
}