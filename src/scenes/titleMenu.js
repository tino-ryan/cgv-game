// scenes/titleMenu.js
import CutsceneManager from "../systems/cutsceneManager.js";
import { tutorialCutscene } from "../cutscenes/tutorialCutscene.js";
import LobbyScene from "../scenes/lobbyScene.js";

export default class TitleMenu {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.container = document.createElement("div");
    this.container.id = "title-menu";
    document.body.appendChild(this.container);

    Object.assign(this.container.style, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "black",
      color: "white",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    });
const title = document.createElement("h1");
    title.textContent = "THE BOX";
    title.style.marginBottom = "20px";

    const startButton = document.createElement("button");
    startButton.textContent = "Start Game";
    startButton.style.padding = "10px 20px";

    startButton.addEventListener("click", async () => {
      // Hide title menu
      this.container.style.display = "none";

      // Play the opening cutscene
      const cutsceneManager = new CutsceneManager("cutscene-container");
      await cutsceneManager.play(tutorialCutscene);

      // Load the main game scene
      const lobbyScene = new LobbyScene(this.sceneManager.renderer, this.sceneManager.camera);
      this.sceneManager.setScene(lobbyScene);
      
    });

    this.container.append(title, startButton);
  }
}
