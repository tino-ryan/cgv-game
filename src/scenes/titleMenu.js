// src/ui/titleMenu.js
import LobbyScene from "../scenes/lobbyScene.js";

export default class TitleMenu {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.container = document.createElement("div");
    this.container.id = "title-menu";

    Object.assign(this.container.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "2000",
      color: "white",
      fontFamily: "sans-serif",
    });

    const title = document.createElement("h1");
    title.textContent = "Cozy Ghost Hotel";
    Object.assign(title.style, { fontSize: "64px", marginBottom: "40px" });

    // 🎮 Buttons
    const startBtn = this.createButton("Start Game", () => this.startGame());
    const optionsBtn = this.createButton("Options", () => this.showOptions());
    const creditsBtn = this.createButton("Credits", () => this.showCredits());
    const quitBtn = this.createButton("Quit", () => this.quitGame());

    // Append to container
    this.container.append(title, startBtn, optionsBtn, creditsBtn, quitBtn);
    document.body.appendChild(this.container);

    // Prevent clicks on the menu from affecting underlying layers
this.container.addEventListener("click", (event) => {
  event.stopPropagation();
});

  }

  createButton(text, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: "12px 32px",
      margin: "10px",
      fontSize: "20px",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      backgroundColor: "#2a9df4",
      color: "white",
      transition: "background 0.2s",
    });
    btn.onmouseenter = () => (btn.style.backgroundColor = "#1d78bf");
    btn.onmouseleave = () => (btn.style.backgroundColor = "#2a9df4");
    btn.onclick = onClick;
    return btn;
  }

  async startGame() {
    this.container.remove(); // remove the title menu
    const lobby = new LobbyScene(this.sceneManager.renderer, this.sceneManager.camera);
    this.sceneManager.setScene(lobby);
  }

  showOptions() {
    console.log("Options menu (not yet implemented).");
    alert("Options menu coming soon!");
  }

  showCredits() {
    console.log("Credits menu (not yet implemented).");
    alert("Game by Team [Your Name Here]!");
  }

  quitGame() {
    window.location.reload();
  }
}
