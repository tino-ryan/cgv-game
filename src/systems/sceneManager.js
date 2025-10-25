// sceneManager.js
export default class SceneManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.currentScene = null;
  }

  setScene(scene) {
    if (this.currentScene?.dispose) this.currentScene.dispose();
    this.currentScene = scene;
  }

  update() {
    if (this.currentScene?.update) this.currentScene.update();
  }

  render(camera) {
    if (this.currentScene?.scene && camera) {
      this.renderer.render(this.currentScene.scene, camera);
    }
  }
}
