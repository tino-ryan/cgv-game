export default class CutsceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // 🧹 Clear any leftover elements from previous runs
    this.container.innerHTML = "";

    this.textElement = document.createElement("div");
    this.imageElement = document.createElement("img");

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
    });

    this.container.appendChild(this.imageElement);
    this.container.appendChild(this.textElement);
  }

  async play(scenes) {
    // 🧹 Reset before showing a new cutscene
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

    // 🧹 Hide and clear when finished
    this.container.style.display = "none";
    this.imageElement.src = "";
    this.textElement.textContent = "";
  }

  async showScene({ image, text }) {
    // 🧹 Reset between scenes
    this.imageElement.src = image || "";
    this.textElement.textContent = "";

    for (let i = 0; i < text.length; i++) {
      this.textElement.textContent = text.substring(0, i + 1);
      await new Promise((r) => setTimeout(r, 35)); // typing speed
    }

    // Wait for a click to continue
    await new Promise((r) => {
      const next = () => {
        window.removeEventListener("click", next);
        r();
      };
      window.addEventListener("click", next);
    });
  }
}