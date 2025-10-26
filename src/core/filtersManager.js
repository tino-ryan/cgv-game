import {
  applyGoodGlow,
  applyEvilGlow,
  applyWhiteGlow,
  clearGlow,
  applyCleanScene,
  applyDirtyScene,
  applyReflectiveScene,
  clearScene,
  setMainCharRef
} from './filters.js';

export class FilterManager {
  constructor(renderer, scene) {
    this.renderer = renderer.getRenderer();
    this.scene = scene;
    this.bloomPass = renderer.getBloomPass();
    this.sparklePass = renderer.getSparklePass();
    this.overlayMesh = renderer.getOverlayMesh();
    this.dynamicLight = scene.dynamicLight;
    this.models = new Map(); // Store models for filter application
  }

  addModel(model, name) {
    this.models.set(name, model);
    if (name === 'player') {
      setMainCharRef(model); // For compatibility with your filters
    }
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.userData.isCharacter = true;
        if (!obj.userData.originalMaterial) {
          obj.userData.originalMaterial = obj.material.clone();
        }
      }
    });
  }

  applyFilter(modelName, filterType) {
    const model = this.models.get(modelName);
    if (!model && filterType !== 'clean' && filterType !== 'dirty' && filterType !== 'reflective' && filterType !== 'clear') {
      console.warn(`Model ${modelName} not found`);
      return;
    }

    // Clear previous effects
    if (model) {
      clearGlow(model, this.bloomPass);
    }
    clearScene(this.scene, this.renderer, this.overlayMesh, this.sparklePass, this.dynamicLight);

    switch (filterType) {
      case 'good':
        applyGoodGlow(model, this.bloomPass);
        break;
      case 'evil':
        applyEvilGlow(model, this.bloomPass);
        break;
      case 'white':
        applyWhiteGlow(model, this.bloomPass);
        break;
      case 'clean':
        applyCleanScene(this.scene, this.renderer, this.sparklePass);
        break;
      case 'dirty':
        applyDirtyScene(this.scene, this.renderer, this.overlayMesh);
        break;
      case 'reflective':
        applyReflectiveScene(this.scene, this.renderer, this.dynamicLight);
        break;
      case 'clear':
        if (model) {
          clearGlow(model, this.bloomPass);
        }
        clearScene(this.scene, this.renderer, this.overlayMesh, this.sparklePass, this.dynamicLight);
        break;
      default:
        console.warn(`Unknown filter type: ${filterType}`);
    }
  }
}
