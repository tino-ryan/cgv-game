//src/entities/player.js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadAssets } from "../core/loader.js";

export default class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.ghost = null;
    this.gun = null;
    this.tutorial = null; // Reference to tutorial

    this.combatMode = false;
    this.gunEquipped = false;

    this.cameraOffset = new THREE.Vector3(0, 1.5, 5);
    this.hoverHeight = 1.5;

    this.crosshair = document.getElementById("crosshair");
    if (this.crosshair) {
      this.crosshair.style.display = "none";
    }

    this.raycaster = new THREE.Raycaster();

    this.canShoot = true;
    this.shootCooldown = 0.3;

    this.tracerDuration = 0.1;
    this.tracerMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  }

  setTutorial(tutorial) {
    this.tutorial = tutorial;
  }

  async loadGhost(url) {
    try {
      console.log("Loading ghost model from:", url);
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      this.ghost = gltf.scene;
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
      this.gun.visible = false;
      this.scene.add(this.gun);
      this.gun.scale.set(0.003, 0.003, 0.003);
      this.gun.position.set(0, 0, 0);
      this.gun.rotation.set(-Math.PI / 1, 0, 3);
    } catch (err) {
      console.error("Failed to load gun model:", err);
      this.createFallbackGun();
    }
  }

  createFallbackGun() {
    console.log("Creating fallback gun geometry");
    const group = new THREE.Group();

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

    if (this.crosshair) {
      this.crosshair.style.display = "block";
    }
    
    if (this.gun) {
      this.camera.add(this.gun);
      this.gun.position.set(0.5, -0.5, -1);
      this.gun.visible = true;
    }

    this.camera.position.set(0, 1.6, 0);

    // Remove any existing listener first
    if (this.shootHandler) {
      window.removeEventListener("mousedown", this.shootHandler);
    }
    
    this.shootHandler = (event) => {
      if (this.combatMode && event.button === 0) {
        this.shoot();
      }
    };
    
    window.addEventListener("mousedown", this.shootHandler);
  }

  exitCombat() {
    this.combatMode = false;
    
    if (this.crosshair) {
      this.crosshair.style.display = "none";
    }
    
    if (this.gun) {
      this.camera.remove(this.gun);
      this.gun.visible = false;
      this.scene.add(this.gun);
    }

    if (this.shootHandler) {
      window.removeEventListener("mousedown", this.shootHandler);
    }

    this.camera.position.copy(this.cameraOffset);
  }

  update() {
    if (this.ghost) {
      this.ghost.position.y = this.hoverHeight;
    }
  }

  shoot() {
    if (!this.canShoot || !this.gun) return;
    this.canShoot = false;
    setTimeout(() => (this.canShoot = true), this.shootCooldown * 1000);

    const gunPosition = new THREE.Vector3();
    this.gun.getWorldPosition(gunPosition);

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    this.raycaster.set(gunPosition, direction);

    const enemies = this.scene.children.filter(obj => obj.userData.isEnemy);
    const intersects = this.raycaster.intersectObjects(enemies, true);

    let tracerEnd = new THREE.Vector3();
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const hitPosition = hit.position.clone();
      tracerEnd.copy(hitPosition);

      // Remove from scene
      this.scene.remove(hit);
      if (hit.geometry) hit.geometry.dispose();
      if (hit.material) hit.material.dispose();

      // Remove from tutorial list
      if (this.tutorial) {
        const idx = this.tutorial.disguisedObjects.indexOf(hit);
        if (idx !== -1) {
          this.tutorial.disguisedObjects.splice(idx, 1);
        }

        // Emit spirit particles at hit position
        this.tutorial.releaseSpirit(hitPosition);
      }
    } else {
      tracerEnd.copy(gunPosition).add(direction.clone().multiplyScalar(50));
    }

    // Draw tracer line
    const geometry = new THREE.BufferGeometry().setFromPoints([
      gunPosition.clone(),
      tracerEnd
    ]);
    const line = new THREE.Line(geometry, this.tracerMaterial);
    this.scene.add(line);
    
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
    }, this.tracerDuration * 1000);
  }
}