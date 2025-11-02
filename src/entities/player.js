// src/entities/player.js - COMPLETE FIXED VERSION
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadAssets } from "../core/loader.js";
import { Health } from "./health.js";
import { applyGoodGlow } from "../core/filters.js";

export default class Player {
  constructor(scene, camera, hud) {
    this.scene = scene;
    this.camera = camera;
    this.hud = hud;

    this.ghost = null;
    this.gun = null;
    this.tutorial = null;

    this.combatMode = false;
    this.gunEquipped = false;
    this.health = new Health(5); // 5 hearts
    this._isDead = false;

    this.cameraOffset = new THREE.Vector3(0, 1.5, 5);
    this.hoverHeight = 0.8;

    this.crosshair = document.getElementById("crosshair");
    if (this.crosshair) {
      this.crosshair.style.display = "none";
    }

    this.raycaster = new THREE.Raycaster();
    this.canShoot = true;
    this.shootCooldown = 300; // milliseconds

    this.tracerDuration = 100; // milliseconds
    this.tracerMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });

    if (this.hud) {
      this.hud.updatePlayerHearts(this.health.current, this.health.max);
    }

    this.shootHandler = null; // Will hold bound shoot event
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
      this.ghost.scale.set(1, 1, 1);
      this.ghost.position.set(10, this.hoverHeight, 0);
      this.ghost.rotation.y = Math.PI; // face forward

      this.ghost.traverse((obj) => {
        obj.userData.isPlayerGhost = true;
        obj.userData.protectFromFilter = true;
      });

      // Fix lighting + enable shadows
      this.ghost.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;

          // Make sure materials render properly
          if (child.material) {
            child.material.side = THREE.FrontSide;
            child.material.needsUpdate = true;
            child.material.roughness = 0.8;
            child.material.metalness = 0.1;

            // Optional: ensure color space consistency
            child.material.toneMapped = true;
            child.material.envMapIntensity = 0.8;
          }

          // Ensure geometry bounds
          if (!child.geometry.boundingSphere) {
            child.geometry.computeBoundingSphere();
          }
          if (!child.geometry.boundingBox) {
            child.geometry.computeBoundingBox();
          }
        }
      });

      this.scene.add(this.ghost);
      console.log("Ghost model loaded and configured!");
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

    // Remove any existing listener
    if (this.shootHandler) {
      window.removeEventListener("mousedown", this.shootHandler);
    }

    // Bind shoot method to avoid context loss
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
      this.shootHandler = null;
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

    setTimeout(() => {
      this.canShoot = true;
    }, this.shootCooldown);

    // Get gun world position
    const gunPosition = new THREE.Vector3();
    this.gun.getWorldPosition(gunPosition);

    // Get camera forward direction
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Setup raycaster
    this.raycaster.set(gunPosition, direction);
    this.raycaster.far = 100;

    // Collect all potential targets
    const targets = [];

    // Add lobby boss
    if (window.lobbyScene?.boss?.mesh) {
      targets.push(window.lobbyScene.boss.mesh);
    }

    // Add bathroom boss
    if (window.bathroomScene?.boss?.mesh) {
      targets.push(window.bathroomScene.boss.mesh);
    }

    // Add kitchen boss
    if (window.kitchenScene?.kitchenGhost?.mesh) {
      targets.push(window.kitchenScene.kitchenGhost.mesh);
    }

    // Add tutorial objects
    if (this.tutorial?.disguisedObjects) {
      targets.push(...this.tutorial.disguisedObjects);
    }

    // Perform raycast
    const intersects = this.raycaster.intersectObjects(targets, true);

    let tracerEnd = new THREE.Vector3();
    let hitSomething = false;

    if (intersects.length > 0) {
      const hit = intersects[0];
      tracerEnd.copy(hit.point);
      hitSomething = true;

      let targetObject = hit.object;
      while (
        targetObject.parent &&
        !targetObject.userData.isBoss &&
        !targetObject.userData.isEnemy &&
        !targetObject.userData.isSuspicious
      ) {
        targetObject = targetObject.parent;
      }

      // Handle boss hits
      if (targetObject.userData.isBoss) {
        console.log("Boss hit!");

        if (
          window.lobbyScene?.boss &&
          targetObject === window.lobbyScene.boss.mesh
        ) {
          window.lobbyScene.boss.takeDamage(10);
          window.lobbyScene.showHitMarker?.();
        } else if (
          window.bathroomScene?.boss &&
          targetObject === window.bathroomScene.boss.mesh
        ) {
          window.bathroomScene.boss.takeDamage(10);
          window.bathroomScene.showHitMarker?.();
        } else if (
          window.kitchenScene?.kitchenGhost &&
          targetObject === window.kitchenScene.kitchenGhost.mesh
        ) {
          window.kitchenScene.kitchenGhost.takeDamage(10);
          window.kitchenScene.showHitMarker?.();
        }
      }
      // Handle tutorial suspicious objects
      else if (
        targetObject.userData.isEnemy ||
        targetObject.userData.isSuspicious
      ) {
        console.log("Tutorial object hit!");

        this.scene.remove(targetObject);

        if (targetObject.geometry) targetObject.geometry.dispose();
        if (targetObject.material) {
          if (Array.isArray(targetObject.material)) {
            targetObject.material.forEach((mat) => mat.dispose());
          } else {
            targetObject.material.dispose();
          }
        }

        if (this.tutorial) {
          const idx = this.tutorial.disguisedObjects.indexOf(targetObject);
          if (idx !== -1) {
            this.tutorial.disguisedObjects.splice(idx, 1);
          }
          this.tutorial.releaseSpirit(hit.point);
        }
      }
    } else {
      // Miss — extend tracer far
      tracerEnd.copy(gunPosition).add(direction.clone().multiplyScalar(50));
    }

    // Create tracer line
    const geometry = new THREE.BufferGeometry().setFromPoints([
      gunPosition.clone(),
      tracerEnd,
    ]);
    const line = new THREE.Line(geometry, this.tracerMaterial);
    this.scene.add(line);

    // Remove tracer after duration
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
    }, this.tracerDuration);

    console.log("Shot fired!", hitSomething ? "HIT!" : "MISS");
  }

  takeDamage(amount = 1) {
    if (this.health.current <= 0 || this._isDead) return;

    this.health.takeDamage(amount);
    console.log(`Player HP: ${this.health.current}/${this.health.max}`);

    if (this.hud) {
      this.hud.updatePlayerHearts(this.health.current, this.health.max);
    }

    if (this.health.current <= 0) {
      this.health.current = 0;
      this.onDeath();
    }
  }

  onDeath() {
    if (this._isDead) return;
    this._isDead = true;

    console.log("Player defeated!");

    // Kitchen scene handles game over
    if (window.kitchenScene?.handleGameOver) {
      window.kitchenScene.handleGameOver();
      return;
    }

    // Fallback for other scenes
    if (window.lobbyScene?.handlePlayerDefeat) {
      window.lobbyScene.handlePlayerDefeat();
    } else if (window.bathroomScene?.handlePlayerDefeat) {
      window.bathroomScene.handlePlayerDefeat();
    }
  }
}