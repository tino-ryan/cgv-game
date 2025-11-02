// cutsceneManager.js
import AudioManager from "./audiomanager.js";

export default class CutsceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.container.innerHTML = ""; // Clear previous

    this.textElement = document.createElement("div");
    this.imageElement = document.createElement("img");
    this.audioManager = new AudioManager(); // Dedicated for cutscene SFX

    Object.assign(this.imageElement.style, {
      width: "80%",
      maxWidth: "800px",
      borderRadius: "10px",
      marginBottom: "20px",
    });

    Object.assign(this.textElement.style, {
      maxWidth: "80%",
      fontSize: "24px",
      lineHeight: "1.5",
      color: "white",
      fontFamily: "Arial, sans-serif",
    });

    this.container.appendChild(this.imageElement);
    this.container.appendChild(this.textElement);
  }

  async play(scenes) {
    this.imageElement.src = "";
    this.textElement.textContent = "";
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.justifyContent = "center";
    this.container.style.alignItems = "center";
    this.container.style.backgroundColor = "black";

    for (const scene of scenes) {
      await this.showScene(scene);
    }

    this.container.style.display = "none";
    this.imageElement.src = "";
    this.textElement.textContent = "";
  }

  async showScene({ image, text, sfx, sfxDuration }) {
    this.imageElement.src = image || "";
    this.textElement.textContent = "";

    // === PLAY GIBBERISH VOICE ===
    if (sfx && sfxDuration) {
      this.audioManager.playOneShotWithPitch(sfx, sfxDuration, 0.8, true);
    }

    // Typewriter effect
    for (let i = 0; i < text.length; i++) {
      this.textElement.textContent = text.substring(0, i + 1);
      await new Promise(r => setTimeout(r, 35));
    }

    // Wait for click to continue
    await new Promise(resolve => {
      const next = () => {
        window.removeEventListener("click", next);
        resolve();
      };
      window.addEventListener("click", next);
    });
  }
}