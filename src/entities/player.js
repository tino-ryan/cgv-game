import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadAssets } from "../core/loader.js"; // adjust path if needed

export default class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.ghost = null;
    this.gun = null;

    this.combatMode = false;
    this.gunEquipped = false;

    this.cameraOffset = new THREE.Vector3(0, 1.5, 5);
    this.hoverHeight = 1.5; // How high ghost hovers above ground

    // Grab crosshair div from the DOM
    this.crosshair = document.getElementById("crosshair");
    if (this.crosshair) {
      this.crosshair.style.display = "none"; // hidden by default
    }
  }

  async loadGhost(url) {
    try {
      console.log("Loading ghost model from:", url);
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      this.ghost = gltf.scene;

      // Set initial hover position
      this.ghost.position.y = this.hoverHeight;

      this.scene.add(this.ghost);
      console.log("Ghost loaded successfully");
    } catch (error) {
      console.error("Failed to load ghost model:", error);
    }
  }

  async loadGun(url) {
    try {
      const { model } = await loadAssets(this.scene, url);
      this.gun = model;

      // Don't attach to camera yet
      this.gun.visible = false; // hide until combat
      this.scene.add(this.gun); // temporarily add to scene so it's loaded
      this.gun.scale.set(0.003, 0.003, 0.003); // adjust scale to reasonable "gun in hand" size
      this.gun.position.set(0, 0, 0); // reset local position
      this.gun.rotation.set(-Math.PI / 1, 0, 3);
    } catch (err) {
      console.error("Failed to load gun model:", err);
      this.createFallbackGun();
    }
  }

  createFallbackGun() {
    console.log("Creating fallback gun geometry");
    const group = new THREE.Group();

    // Simple gun shape
    const handleGeometry = new THREE.BoxGeometry(0.05, 0.2, 0.05);
    const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const handle = new THREE.Mesh(handleGeometry, material);
    const barrel = new THREE.Mesh(barrelGeometry, material);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.15, 0, 0);

    group.add(handle);
    group.add(barrel);
    group.visible = false;

    group.position.set(0.3, -0.2, -0.5);
    group.scale.set(0.5, 0.5, 0.5);

    this.gun = group;
    this.camera.add(this.gun);
  }

  enterCombat() {
    this.combatMode = true;

    // Show crosshair
    if (this.crosshair) {
      this.crosshair.style.display = "block";
    }
    // Attach gun to camera for first-person
    if (this.gun) {
      this.camera.add(this.gun);
      this.gun.position.set(0.5, -0.5, -1); // gun in hand
      this.gun.visible = true;
    }

    // Set camera to first-person position
    this.camera.position.set(0, 1.6, 0);
  }

  exitCombat() {
    this.combatMode = false;
    // Hide crosshair
    if (this.crosshair) {
      this.crosshair.style.display = "none";
    }
    if (this.gun) {
      this.camera.remove(this.gun);
      this.gun.visible = false;
      this.scene.add(this.gun); // optional: keep in scene or remove completely
    }

    // Reset camera to third-person offset
    this.camera.position.copy(this.cameraOffset);
  }

  update() {
    // Maintain hover height
    if (this.ghost) {
      this.ghost.position.y = this.hoverHeight;
    }
  }
}
