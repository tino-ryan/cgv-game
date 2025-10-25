// /ui/pauseMenu.js
export default class PauseMenu {
  constructor(sceneManager, onResume) {
    this.sceneManager = sceneManager;
    this.onResume = onResume;

    this.container = document.createElement("div");
    this.container.id = "pause-menu";
    Object.assign(this.container.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      display: "none",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.7)",
      color: "#fff",
      zIndex: "100",
      fontFamily: "sans-serif",
    });

    const title = document.createElement("h2");
    title.textContent = "Game Paused";

    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "Resume";
    resumeBtn.onclick = () => this.resumeGame();

    const quitBtn = document.createElement("button");
    quitBtn.textContent = "Return to Main Menu";
    quitBtn.onclick = () => this.returnToMenu();

    for (const btn of [resumeBtn, quitBtn]) {
      Object.assign(btn.style, {
        padding: "10px 20px",
        margin: "10px",
        fontSize: "18px",
        borderRadius: "10px",
        cursor: "pointer",
      });
    }

    this.container.appendChild(title);
    this.container.appendChild(resumeBtn);
    this.container.appendChild(quitBtn);
    document.body.appendChild(this.container);
  }

  show() {
    this.container.style.display = "flex";
  }

  hide() {
    this.container.style.display = "none";
  }

  resumeGame() {
    this.hide();
    if (this.onResume) this.onResume();
  }

  returnToMenu() {
    this.hide();
    this.sceneManager.setScene("title"); // or pass in the TitleMenu class directly if needed
  }
}
