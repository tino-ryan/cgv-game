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
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "2000",
      color: "white",
      fontFamily: "sans-serif",
    });

    // 👻 Replace text title with PNG logo
    const logo = document.createElement("img");
    logo.src = "./src/ui/1000095088.png"; // update the path to your PNG
    Object.assign(logo.style, {
      width: "400px",
      height: "auto",
      marginBottom: "0px",
      filter: "drop-shadow(0 0 10px rgba(255,255,255,0.3))",
    });

    // 🎮 Buttons
    const startBtn = this.createButton("Start Game", () => this.startGame());
    const optionsBtn = this.createButton("Options", () => this.showOptions());
    const creditsBtn = this.createButton("Credits", () => this.showCredits());
    const quitBtn = this.createButton("Quit", () => this.quitGame());

    // Append to container
    this.container.append(logo, startBtn, optionsBtn, creditsBtn, quitBtn);
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
      width: "220px",           // fixed width for all buttons
      height: "60px",
      padding: "14px 36px",
      margin: "10px",
      fontSize: "20px",
      fontWeight: "600",
      border: "2px solid #ffffff55",
      borderRadius: "30px",
      cursor: "pointer",
      background: "linear-gradient(145deg, #ca4c4f, #ca4c4f)",
      color: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      transition: "all 0.25s ease",
    });

    btn.onmouseenter = () => {
      btn.style.background = "linear-gradient(145deg, #ca4c4f, #ca4c4f)";
      btn.style.transform = "translateY(-3px)";
      btn.style.boxShadow = "0 6px 14px rgba(255,255,255,0.3)";
    };

    btn.onmouseleave = () => {
      btn.style.background = "linear-gradient(145deg, #ca4c4f, #ca4c4f)";
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    };

    btn.onclick = onClick;
    return btn;
  }

  async startGame() {
    this.container.remove();
    const lobby = new LobbyScene(this.sceneManager.renderer, this.sceneManager.camera);
    this.sceneManager.setScene(lobby);
  }

  showOptions() {
    alert("Options menu coming soon!");
  }

  showCredits() {
    alert("Game by Team Cozy Ghost!");
  }

  quitGame() {
    window.location.reload();
  }
}
