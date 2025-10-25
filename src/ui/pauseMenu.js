// src/ui/pauseMenu.js
import LobbyScene from "../scenes/lobbyScene.js";
import TitleMenu from "../scenes/titleMenu.js";

export default class PauseMenu {
  constructor(sceneManager, lobbyScene, onPauseChange) {
    this.sceneManager = sceneManager;
    this.lobbyScene = lobbyScene;
    this.onPauseChange = onPauseChange; // callback to tell main.js about pause state
    this.isVisible = false;

    // --- Main overlay container ---
    this.container = document.createElement("div");
    Object.assign(this.container.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "none",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    });

    // --- Menu title ---
    const title = document.createElement("h1");
    title.textContent = "Paused";
    title.style.color = "white";
    title.style.marginBottom = "30px";
    this.container.appendChild(title);

    // --- Buttons ---
    const buttonStyle = `
      background-color: #444;
      color: white;
      border: none;
      padding: 12px 24px;
      margin: 10px;
      border-radius: 6px;
      font-size: 18px;
      cursor: pointer;
      transition: 0.2s;
    `;

    const createButton = (text, onClick) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.style.cssText = buttonStyle;
      btn.onmouseenter = () => (btn.style.backgroundColor = "#666");
      btn.onmouseleave = () => (btn.style.backgroundColor = "#444");
      btn.onclick = onClick;
      this.container.appendChild(btn);
      return btn;
    };

    createButton("Resume", () => this.resume());
    createButton("Return to Title", () => this.toTitle());

    document.body.appendChild(this.container);

    // --- Small Pause Button (HUD corner) ---
    this.pauseButton = document.createElement("button");
    this.pauseButton.textContent = "⏸️";
    Object.assign(this.pauseButton.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: 500,
      background: "rgba(0, 0, 0, 0.5)",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "10px 15px",
      fontSize: "20px",
      cursor: "pointer",
    });
    this.pauseButton.onclick = () => this.toggle();

    document.body.appendChild(this.pauseButton);
  }

  toggle() {
    this.isVisible ? this.resume() : this.pause();
  }

  pause() {
    this.isVisible = true;
    this.container.style.display = "flex";
    document.exitPointerLock();
    if (this.onPauseChange) this.onPauseChange(true);
  }

  resume() {
    this.isVisible = false;
    this.container.style.display = "none";
    if (this.onPauseChange) this.onPauseChange(false);
  }

  restart() {
    this.resume();
    //we could maybe add a function to let us restart the level
    //this.sceneManager.setScene(new LobbyScene(this.sceneManager));
  }

  toTitle() {
    window.location.reload();
    //idk a bette way to do this so we're just gonna reolad the window
  }
}
