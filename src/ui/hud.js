// src/ui/hud.js
export default class HUD {
  constructor() {
    this.tutorialText = document.createElement('div');
    this.tutorialText.style.position = 'absolute';
    this.tutorialText.style.top = '20%';
    this.tutorialText.style.left = '50%';
    this.tutorialText.style.transform = 'translate(-50%, -50%)';
    this.tutorialText.style.color = 'white';
    this.tutorialText.style.fontSize = '24px';
    this.tutorialText.style.textShadow = '2px 2px 4px black';
    this.tutorialText.style.display = 'none';
    document.body.appendChild(this.tutorialText);

    // Add health bar placeholders (for boss fight later)
    this.playerHealth = 100;
    this.bossHealth = 100;
    // TODO: Implement health bar DOM elements similarly
  }

  showTutorialText(text) {
    this.tutorialText.textContent = text;
    this.tutorialText.style.display = 'block';
  }

  hideTutorialText() {
    this.tutorialText.style.display = 'none';
  }

  // Add methods for health updates later, e.g., updatePlayerHealth(value)
}