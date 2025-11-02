// src/systems/sceneManager.js
export default class SceneManager {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;
    this.currentScene = null;
  }

  setScene(scene) {
    this.currentScene = scene;
  }

  update() {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update();
    }
  }
}
