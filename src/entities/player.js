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
  setTimeout(() => this.canShoot = true, this.shootCooldown);

  const gunPos = new THREE.Vector3();
  this.gun.getWorldPosition(gunPos);

  const dir = new THREE.Vector3();
  this.camera.getWorldDirection(dir);

  this.raycaster.set(gunPos, dir);
  this.raycaster.far = 100;

  // === HYBRID: Scan ALL + Specific Targets ===
  const targets = this.scene.children.filter(obj => 
    obj.userData.isBoss || obj.userData.isEnemy || obj.userData.isSuspicious
  );

  // Add specific bosses (for performance)
  if (window.lobbyScene?.boss?.mesh && !targets.includes(window.lobbyScene.boss.mesh)) {
    targets.push(window.lobbyScene.boss.mesh);
  }
  if (window.bathroomScene?.boss?.bossModel && !targets.includes(window.bathroomScene.boss.bossModel)) {
    targets.push(window.bathroomScene.boss.bossModel);  // ← KEY FIX
  }
  if (window.kitchenScene?.kitchenGhost?.mesh && !targets.includes(window.kitchenScene.kitchenGhost.mesh)) {
    targets.push(window.kitchenScene.kitchenGhost.mesh);
  }

  const intersects = this.raycaster.intersectObjects(targets, true);

  let tracerEnd = gunPos.clone().add(dir.multiplyScalar(50));
  let hit = false;

  if (intersects.length > 0) {
    tracerEnd.copy(intersects[0].point);
    hit = true;

    let target = intersects[0].object;
    while (target && !target.userData.isBoss && !target.userData.isEnemy && !target.userData.isSuspicious) {
      target = target.parent;
    }

    if (target?.userData.isBoss) {
      console.log("🎯 Boss hit!");

      // Damage the correct boss
      const bossScene = window.bathroomScene || window.lobbyScene || window.kitchenScene;
      if (bossScene?.boss?.takeDamage) {
        bossScene.boss.takeDamage(10);
        bossScene.showHitMarker?.();
      } else if (bossScene?.kitchenGhost?.takeDamage) {
        bossScene.kitchenGhost.takeDamage(10);
        bossScene.showHitMarker?.();
      }
    }
    // Tutorial objects...
    else if (target?.userData.isEnemy || target?.userData.isSuspicious) {
      this.scene.remove(target);
      // ... cleanup code
      if (this.tutorial) {
        const idx = this.tutorial.disguisedObjects.indexOf(target);
        if (idx > -1) this.tutorial.disguisedObjects.splice(idx, 1);
        this.tutorial.releaseSpirit(intersects[0].point);
      }
    }
  }

  // Tracer...
  const geom = new THREE.BufferGeometry().setFromPoints([gunPos.clone(), tracerEnd]);
  const line = new THREE.Line(geom, this.tracerMaterial);
  this.scene.add(line);
  setTimeout(() => {
    this.scene.remove(line);
    geom.dispose();
  }, this.tracerDuration);

  console.log("Shot fired!", hit ? "HIT!" : "MISS");
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