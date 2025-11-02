import * as THREE from "three";
import Player from "../entities/player.js";
import HUD from "../ui/hud.js";
import PhysicsSystem from "../systems/physics.js";
import BathroomBoss from "../entities/bathroomBoss.js";
import Inventory from "../systems/inventory.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createDustParticles, updateDustParticles } from "../core/filters.js";
import CutsceneManager from "../systems/cutsceneManager.js";

export default class BathroomScene {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Initialize physics system
    this.physics = new PhysicsSystem(this.scene);

    // Initialize inventory system
    this.inventory = new Inventory(null);

    this.bathroomModel = null;
    this.mirror = null;
    this.mirrorCamera = null;
    this.mirrorRenderTarget = null;

    this.dustParticles = null;

    // Boss and game state
    this.boss = null;
    this.bossSpawned = false;
    this.bossHealthFill = null;
    this.torchEnabled = false;
    this.torchLight = null;
    this.hitByProjectile = false;
    this.showTorchPrompt = false;

    // Toilet paper pickup
    this.toiletPaper = null;
    this.pickupPromptShown = false;

    // CUTSCENE SYSTEM
    this.initCutsceneContainer();
    this.cutsceneMgr = new CutsceneManager("cutscene-container");
    this.isPaused = false;

    this.loadBathroomEnvironment();

    // Dark lighting setup for boss fight
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.1);
    this.directionalLight = new THREE.DirectionalLight(0x404040, 0.2);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;

    this.scene.add(this.ambientLight, this.directionalLight);

    // Dark background
    this.scene.background = new THREE.Color(0x0a0a0a);

    const TORCH_COLOR = 0xfff4da;
    const TORCH_INTENSITY = 5.5;
    const TORCH_DISTANCE = 35;
    const TORCH_ANGLE_DEG = 18;
    const TORCH_PENUMBRA = 0.55;
    const TORCH_DECAY = 2.0;

    this.torchLight = new THREE.SpotLight(
      TORCH_COLOR,
      TORCH_INTENSITY,
      TORCH_DISTANCE,
      THREE.MathUtils.degToRad(TORCH_ANGLE_DEG),
      TORCH_PENUMBRA,
      TORCH_DECAY
    );
    this.torchLight.visible = false;
    this.camera.add(this.torchLight);
    this.torchLight.position.set(0.6, -0.4, -1);
    this.torchLight.target.position.set(0, 0, -5);
    this.camera.add(this.torchLight.target);

    // HUD
    this.hud = new HUD();

    // Player
    this.player = new Player(this.scene, this.camera, this.hud);

    this.camera.position.y = 2.5;

    this.player.loadGhost("/public/assets/models/mainchar.glb").then(() => {
      if (this.player.ghost) {
        this.player.ghost.position.set(0, 2.5, 10);
        this.player.ghost.visible = false;
        console.log("Player positioned in bathroom (first-person mode)");
      }
    });

    this.player.loadGun("/public/assets/models/gun.glb").then(() => {
      if (this.player.gun) {
        console.log("Gun loaded for bathroom scene");
        this.player.enterCombat();
        this.spawnBoss();
      }
    });

    window.bathroomScene = this;
    this.gameOver = false;

    this.setupUI();

    console.log("Bathroom scene initialized in first-person mode");

    // INTRO CUTSCENE
    this.playIntroCutscene();
  }

  // -----------------------------------------------------------------
  // CUTSCENE SYSTEM – HIDES ALL HUD ELEMENTS WITHOUT CHANGING HUD.js
  // -----------------------------------------------------------------
  initCutsceneContainer() {
    let container = document.getElementById("cutscene-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "cutscene-container";
      Object.assign(container.style, {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        display: "none",
        pointerEvents: "auto",
        backgroundColor: "black",
      });
      document.body.appendChild(container);
    }
  }

  async playIntroCutscene() {
    const intro = [
      {
        image: "/assets/cutscenes/scene1.jpg",
        text: "text",
      },
      {
        image: "/assets/cutscenes/scene1.jpg",
        text: "text",
      },
    ];

    this.hideAllHUDElements(); // ← HIDE ALL HUD
    this.isPaused = true;
    await this.cutsceneMgr.play(intro);
    this.isPaused = false;
    this.showAllHUDElements(); // ← RESTORE
  }

  async playVictoryCutscene() {
    const victory = [
      {
        image: "/assets/cutscenes/scene1.jpg",
        text: "text",
      },
      {
        image: "/assets/cutscenes/scene1.jpg",
        text: "text",
      },
    ];

    this.hideAllHUDElements(); // ← HIDE ALL HUD
    this.isPaused = true;
    await this.cutsceneMgr.play(victory);
    this.isPaused = false;
    this.showAllHUDElements(); // ← RESTORE
  }

  // -----------------------------------------------------------------
  // DYNAMIC HUD VISIBILITY (NO HUD.js CHANGES)
  // -----------------------------------------------------------------
  hideAllHUDElements() {
    // Store original display values so we can restore them
    this._hudDisplayCache = [];

    const selectors = [
      "#tutorial-text", // if you have one
      ".player-hearts", // if you add a class
      "[style*='bottom: 20px'][style*='left: 20px']", // hearts container
      "[style*='top: 30px'][style*='left: 50%']", // boss bar
      "#boss-health-bar", // if you add an ID
      "div[style*='position: absolute'][style*='color: white']", // tutorial
    ];

    // Also target known HUD elements directly
    document
      .querySelectorAll(
        `
      div[style*="position"],
      span[style*="color: red"],
      div[style*="border: 2px solid white"]
    `
      )
      .forEach((el) => {
        if (
          el.textContent.includes("❤️") ||
          el.textContent.includes("Bellboy") ||
          el.textContent.includes("Bathroom") ||
          el.style.top === "20%" ||
          el.style.bottom === "20px" ||
          el.style.top === "30px"
        ) {
          this._hudDisplayCache.push({ el, display: el.style.display });
          el.style.display = "none";
        }
      });
  }

  showAllHUDElements() {
    if (!this._hudDisplayCache) return;
    this._hudDisplayCache.forEach(({ el, display }) => {
      el.style.display = display || "block";
    });
    this._hudDisplayCache = null;
  }

  // PUBLIC: Call from boss when defeated
  bossDefeated() {
    if (this.victoryShown) return;
    this.victoryShown = true;
    this.playVictoryCutscene();
  }

  // -----------------------------------------------------------------
  // UI
  // -----------------------------------------------------------------
  setupUI() {
    this.torchPromptElement = document.createElement("div");
    this.torchPromptElement.id = "torch-prompt";
    this.torchPromptElement.innerHTML = "Press E to turn on torch!";
    this.torchPromptElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff6600;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      display: none;
      z-index: 1000;
      animation: pulse 1s infinite;
    `;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.torchPromptElement);
  }

  // -----------------------------------------------------------------
  // BOSS & GAME LOGIC
  // -----------------------------------------------------------------
  spawnBoss() {
    if (this.bossSpawned) return;

    console.log("Spawning Bathroom Boss...");
    this.boss = new BathroomBoss(
      this.scene,
      this.player,
      this.hud,
      this.physics
    );
    this.bossSpawned = true;

    this.scene.userData.boss = this.boss;
    this.scene.userData.bathroomScene = this;

    setTimeout(() => this.startBossFight(), 1000);
  }

  startBossFight() {
    console.log("Boss fight started!");
    this.hud.createBossHealthBar("Bathroom Ghost");
    this.bossHealthFill = this.hud.bossHealthFill;
    if (this.bossHealthFill) this.bossHealthFill.style.width = "100%";

    setTimeout(() => {
      if (this.boss && this.boss.isAlive) {
        this.boss.shoot();
        console.log("Boss fired initial shot!");
      }
    }, 500);
  }

  toggleTorch() {
    if (!this.torchEnabled) {
      this.torchEnabled = true;
      this.torchLight.visible = true;
      this.showTorchPrompt = false;
      this.torchPromptElement.style.display = "none";
      this.ambientLight.intensity = 0.3;
      console.log("Torch enabled!");

      setTimeout(() => this.showShootingInstructions(), 1000);
    } else {
      this.torchEnabled = false;
      this.torchLight.visible = false;
      this.ambientLight.intensity = 0.1;
      console.log("Torch disabled!");
    }
  }

  showShootingInstructions() {
    const el = document.createElement("div");
    el.innerHTML = "Left click to shoot the boss!";
    el.style.cssText = `
      position: fixed; top: 70%; left: 50%; transform: translate(-50%, -50%);
      color: #ffff00; font-size: 18px; font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8); z-index: 1000;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  handleProjectileHit() {
    if (this.player && this.player.takeDamage) {
      this.player.takeDamage(1);
      if (this.player.health.current <= 0) {
        this.handlePlayerDefeat();
        return;
      }
    }

    const flash = document.createElement("div");
    flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.3);pointerEvents:none;z-index:9999;`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);

    if (!this.hitByProjectile) {
      this.hitByProjectile = true;
      this.showTorchPrompt = true;
      this.torchPromptElement.style.display = "block";
    }
  }

  handleInteraction() {
    if (this.showTorchPrompt && !this.torchEnabled) {
      this.toggleTorch();
      return;
    }

    const item = this.inventory.getSelectedItem();
    if (item && item.onUse) {
      item.onUse();
    }
  }

  handlePickup() {
    if (this.toiletPaper && this.pickupPromptShown) {
      this.pickupToiletPaper();
    }
  }

  // -----------------------------------------------------------------
  // ENVIRONMENT
  // -----------------------------------------------------------------
  async loadBathroomEnvironment() {
    const loader = new GLTFLoader();
    try {
      console.log("Loading bathroom model...");
      const gltf = await loader.loadAsync("/assets/models/smallbathroom.glb");
      this.bathroomModel = gltf.scene;
      this.bathroomModel.position.set(0, 4.5, 5);
      this.bathroomModel.scale.set(4, 4, 4);
      this.scene.add(this.bathroomModel);

      this.addCollisions(this.bathroomModel);
      this.setupMirror(this.bathroomModel);

      this.dustParticles = createDustParticles(this.scene);
      this.applyDirtyBathroom();
    } catch (err) {
      console.error("Failed to load bathroom:", err);
    }
  }

  applyDirtyBathroom() {
    if (this.dustParticles) this.dustParticles.visible = true;
    this.scene.traverse((obj) => {
      if (
        obj.userData.isPlayerGhost ||
        obj.userData.protectFromFilter ||
        obj === this.player?.ghost ||
        obj === this.player?.gun
      )
        return;

      if (obj.isMesh && obj.material) {
        if (!obj.userData.originalMaterial) {
          obj.userData.originalMaterial = {
            color: obj.material.color.getHex(),
            roughness: obj.material.roughness,
            metalness: obj.material.metalness,
          };
        }
        obj.material.color.setHex(0x8a7a6a);
        obj.material.roughness = 0.9;
        obj.material.metalness = 0.1;
        obj.material.needsUpdate = true;
      }
    });
  }

  applyCleanBathroom() {
    if (this.dustParticles) this.dustParticles.visible = false;
    this.scene.traverse((obj) => {
      if (
        obj.userData.isPlayerGhost ||
        obj.userData.protectFromFilter ||
        obj === this.player?.ghost ||
        obj === this.player?.gun
      )
        return;

      if (obj.isMesh && obj.material && obj.userData.originalMaterial) {
        obj.material.color.setHex(0xffffff);
        obj.material.roughness = 0.3;
        obj.material.metalness = 0.3;
        obj.material.needsUpdate = true;
      }
    });
  }

  addCollisions(root) {
    let added = 0,
      skipped = 0;
    const box = new THREE.Box3(),
      size = new THREE.Vector3();
    root.traverse((child) => {
      if (!child.isMesh) return;
      const name = (child.name || "").toLowerCase();
      if (name.includes("sink")) {
        this.physics.addCollisionObject(child, false);
        added++;
        return;
      }

      box.setFromObject(child);
      box.getSize(size);
      if (size.x < 0.4 && size.y < 0.4 && size.z < 0.4) {
        skipped++;
        return;
      }
      if (name.match(/bottle|soap|toothbrush|cup|toothpaste|towel|brush/)) {
        skipped++;
        return;
      }

      this.physics.addCollisionObject(child, false);
      added++;
    });
    console.log(
      `Added ${added} collision objects, skipped ${skipped} small props.`
    );
  }

  setupMirror(root) {
    const mirrorName = "defaultMaterial076";
    const mirrorMesh = root.getObjectByName(mirrorName);

    if (!mirrorMesh) {
      console.warn("⚠️ Mirror mesh not found:", mirrorName);
      return;
    }

    console.log("🪞 Mirror mesh found:", mirrorMesh.name);

    // Create render target for mirror reflection
    const renderTargetSize = 512;
    this.mirrorRenderTarget = new THREE.WebGLRenderTarget(
      renderTargetSize,
      renderTargetSize,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        generateMipmaps: false, // Prevent WebGL warnings
        type: THREE.UnsignedByteType,
      }
    );

    // Create mirror camera with wider FOV to see more
    this.mirrorCamera = new THREE.PerspectiveCamera(
      75, // Wider FOV to see more in reflection
      1, // Square aspect ratio for mirror
      0.1,
      100
    );

    // Store mirror mesh reference and position
    this.mirrorMesh = mirrorMesh;

    // Get mirror's world position and normal
    mirrorMesh.updateMatrixWorld();
    this.mirrorWorldPosition = new THREE.Vector3();
    this.mirrorWorldNormal = new THREE.Vector3(0, 0, 1);

    mirrorMesh.getWorldPosition(this.mirrorWorldPosition);
    this.mirrorWorldNormal.transformDirection(mirrorMesh.matrixWorld);

    // Create mirror material with render target texture
    const mirrorMaterial = new THREE.MeshBasicMaterial({
      map: this.mirrorRenderTarget.texture,
      transparent: true,
      opacity: 0.9,
    });

    // Apply mirror material to the mesh
    mirrorMesh.material = mirrorMaterial;

    this.mirror = mirrorMesh;

    console.log("✅ Custom mirror with render target created!");

    // Debug helper - add to global scope
    window.debugMirror = () => {
      console.log("Mirror position:", this.mirrorWorldPosition);
      console.log("Mirror normal:", this.mirrorWorldNormal);
      console.log("Camera position:", this.camera.position);
      console.log("Mirror camera position:", this.mirrorCamera.position);

      // Try different normal orientations
      const normals = [
        { name: "positive Z", vec: new THREE.Vector3(0, 0, 1) },
        { name: "negative Z", vec: new THREE.Vector3(0, 0, -1) },
        { name: "positive X", vec: new THREE.Vector3(1, 0, 0) },
        { name: "negative X", vec: new THREE.Vector3(-1, 0, 0) },
        { name: "positive Y", vec: new THREE.Vector3(0, 1, 0) },
        { name: "negative Y", vec: new THREE.Vector3(0, -1, 0) },
      ];

      console.log("Try these normals by setting window.mirrorNormal:");
      normals.forEach((n) => {
        console.log(
          `window.mirrorNormal = new THREE.Vector3(${n.vec.x}, ${n.vec.y}, ${n.vec.z}); // ${n.name}`
        );
      });
    };

    // Allow runtime normal adjustment
    window.mirrorNormal = null;

    // Debug function to test mirror camera view
    window.showMirrorView = () => {
      // Temporarily switch to mirror camera view to see what it sees
      const originalCamera = this.camera;
      this.camera = this.mirrorCamera;

      setTimeout(() => {
        this.camera = originalCamera;
        console.log("Switched back to normal camera");
      }, 3000);

      console.log("Showing mirror camera view for 3 seconds...");
    };

    // Debug scene contents
    window.debugSceneObjects = () => {
      console.log("=== SCENE OBJECTS ===");
      let meshCount = 0;
      this.scene.traverse((child) => {
        if (child.isMesh) {
          meshCount++;
          console.log(
            `Mesh ${meshCount}: ${child.name || "unnamed"}, visible: ${
              child.visible
            }, position:`,
            child.position
          );
          if (child.parent) {
            console.log(
              `  Parent: ${child.parent.name || "unnamed"}, visible: ${
                child.parent.visible
              }`
            );
          }
        }
      });
      console.log(`Total meshes: ${meshCount}`);
      console.log(
        "Player ghost:",
        this.player?.ghost?.visible,
        this.player?.ghost?.position
      );
      console.log(
        "Player gun:",
        this.player?.gun?.visible,
        this.player?.gun?.position
      );
      console.log(
        "Bathroom model:",
        this.bathroomModel?.visible,
        this.bathroomModel?.position
      );
    };
  }

  updateMirror() {
    if (!this.mirror || !this.mirrorCamera || !this.mirrorRenderTarget) return;

    // --------------------------------------------------------------
    // 1. Update mirror plane (same as before)
    // --------------------------------------------------------------
    this.mirror.updateMatrixWorld();
    this.mirror.getWorldPosition(this.mirrorWorldPosition);

    if (window.mirrorNormal) {
      this.mirrorWorldNormal.copy(window.mirrorNormal);
      this.mirrorWorldNormal.transformDirection(this.mirror.matrixWorld);
    } else {
      this.mirrorWorldNormal.set(0, 0, 1);
      this.mirrorWorldNormal.transformDirection(this.mirror.matrixWorld);
    }
    this.mirrorWorldNormal.normalize();

    const mirrorPlane = new THREE.Plane();
    mirrorPlane.setFromNormalAndCoplanarPoint(
      this.mirrorWorldNormal,
      this.mirrorWorldPosition
    );

    // --------------------------------------------------------------
    // 2. Reflect camera
    // --------------------------------------------------------------
    const camPos = this.camera.position.clone();
    const dist = mirrorPlane.distanceToPoint(camPos);
    const reflectedPos = camPos
      .clone()
      .add(this.mirrorWorldNormal.clone().multiplyScalar(-2 * dist));

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const reflectedDir = camDir.clone().reflect(this.mirrorWorldNormal);

    this.mirrorCamera.position.copy(reflectedPos);
    this.mirrorCamera.lookAt(reflectedPos.clone().add(reflectedDir));
    this.mirrorCamera.fov = this.camera.fov;
    this.mirrorCamera.aspect = 1;
    this.mirrorCamera.near = 0.1;
    this.mirrorCamera.far = 100;
    this.mirrorCamera.updateProjectionMatrix();

    // --------------------------------------------------------------
    // 3. SAVE visibility + temporarily show player objects
    // --------------------------------------------------------------
    const visibilityStates = new Map();
    const playerObjects = []; // objects that belong to the player

    this.scene.traverse((child) => {
      if (child.visible !== undefined) {
        visibilityStates.set(child, child.visible);
      }
    });

    // ---- hide the mirror itself (prevents infinite recursion) ----
    this.mirror.visible = false;

    // ---- force player ghost & gun into the mirror render ----
    const ghost = this.player?.ghost;
    const gun = this.player?.gun;

    if (ghost) {
      // remember original parent & visibility
      playerObjects.push({
        obj: ghost,
        wasInScene: ghost.parent === this.scene,
        originalVisible: ghost.visible,
      });
      // make sure it is in the scene for this frame
      if (!ghost.parent) this.scene.add(ghost);
      ghost.visible = true;
    }
    if (gun) {
      playerObjects.push({
        obj: gun,
        wasInScene: gun.parent === this.scene,
        originalVisible: gun.visible,
      });
      if (!gun.parent) this.scene.add(gun);
      gun.visible = true;
    }

    // --------------------------------------------------------------
    // 4. Render mirror
    // --------------------------------------------------------------
    this.renderer.setRenderTarget(this.mirrorRenderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.mirrorCamera);
    this.renderer.setRenderTarget(null);

    // --------------------------------------------------------------
    // 5. RESTORE everything
    // --------------------------------------------------------------
    // restore mirror
    this.mirror.visible = true;

    // restore scene objects
    visibilityStates.forEach((wasVisible, obj) => {
      obj.visible = wasVisible;
    });

    // restore player objects to their original state
    playerObjects.forEach(({ obj, wasInScene, originalVisible }) => {
      obj.visible = originalVisible;
      if (!wasInScene && obj.parent === this.scene) {
        this.scene.remove(obj);
      }
    });
  }

  // -----------------------------------------------------------------
  // UPDATE LOOP
  // -----------------------------------------------------------------
  updateWithCameraRotation(yaw, pitch) {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    if (this.gameOver || this.isPaused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.player?.update) this.player.update();

    if (this.dustParticles?.visible)
      updateDustParticles(this.dustParticles, delta);

    if (!this.gameOver && this.boss?.isAlive) {
      this.boss.update(delta, time);
      this.checkProjectileCollisions();
      this.updateBossHealth();
    } else if (
      this.boss &&
      !this.boss.isAlive &&
      this.boss.defeated &&
      !this.boss.defeatedHandled
    ) {
      this.handleBossDefeat();
    }

    if (this.torchEnabled && this.torchLight) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        this.camera.quaternion
      );
      this.torchLight.target.position
        .copy(this.camera.position)
        .add(dir.multiplyScalar(10));
    }

    if (this.toiletPaper) {
      this.toiletPaper.userData.floatOffset += delta * 2;
      this.toiletPaper.position.y =
        1.0 + Math.sin(this.toiletPaper.userData.floatOffset) * 0.2;
      this.toiletPaper.rotation.y += delta;
      this.checkToiletPaperPickup();
    }

    this.updateMirror();
    this.renderer.render(this.scene, this.camera);
  }

  // -----------------------------------------------------------------
  // BOSS DEFEAT → VICTORY CUTSCENE
  // -----------------------------------------------------------------
  handleBossDefeat() {
    if (this.boss.defeatedHandled) return;
    this.boss.defeatedHandled = true;

    console.log("Bathroom Boss defeated!");
    this.hud.removeBossHealthBar();
    this.bossHealthFill = null;

    // Trigger victory cutscene
    this.bossDefeated();

    // Drop toilet paper after delay
    setTimeout(() => {
      this.dropToiletPaper(this.boss.bossModel.position);
      setTimeout(() => {
        this.hud.showMessage(
          "Mysterious toilet paper has appeared... Pick it up!"
        );
      }, 1000);
    }, 3000);
  }

  checkProjectileCollisions() {
    if (!this.boss || !this.player || !this.player.ghost) return;

    // Check if any boss projectiles hit the player
    this.boss.projectiles.forEach((projectile, index) => {
      const distance = projectile.position.distanceTo(
        this.player.ghost.position
      );
      if (distance < 1.0) {
        // Hit detection radius
        console.log(
          `💥 Player hit by bathroom boss projectile! Distance: ${distance.toFixed(
            2
          )}`
        );

        // Remove the projectile
        this.scene.remove(projectile);
        this.boss.projectiles.splice(index, 1);

        // Handle the hit
        this.handleProjectileHit();
      }
    });
  }

  showHitMarker() {
    // Don't show hit marker if game is over
    if (this.gameOver) return;

    // Create hit marker (X in center of screen)
    const marker = document.createElement("div");
    marker.style.position = "fixed";
    marker.style.top = "50%";
    marker.style.left = "50%";
    marker.style.transform = "translate(-50%, -50%)";
    marker.style.color = "#ff0000";
    marker.style.fontSize = "48px";
    marker.style.fontWeight = "bold";
    marker.style.textShadow = "2px 2px 4px black";
    marker.style.pointerEvents = "none";
    marker.style.zIndex = "9998";
    marker.textContent = "X";
    document.body.appendChild(marker);

    // Fade out and remove
    setTimeout(() => {
      marker.style.transition = "opacity 0.3s";
      marker.style.opacity = "0";
      setTimeout(() => {
        if (marker.parentElement) {
          document.body.removeChild(marker);
        }
      }, 300);
    }, 100);
  }

  updateBossHealth() {
    if (this.bossHealthFill && this.boss) {
      const healthPercent = (this.boss.health / this.boss.maxHealth) * 100;
      this.bossHealthFill.style.width = healthPercent + "%";
    }
  }

  handlePlayerDefeat() {
    if (this.gameOver) return;

    this.gameOver = true;
    console.log("💀 Game Over - Player Defeated in Bathroom");

    // Disable player shooting
    this.player.combatMode = false;

    // Stop boss from shooting and remove all projectiles
    if (this.boss) {
      this.boss.isAlive = false;
      // Remove all remaining projectiles immediately
      if (this.boss.projectiles) {
        this.boss.projectiles.forEach((proj) => {
          try {
            this.scene.remove(proj);
          } catch (e) {}
        });
        this.boss.projectiles = [];
      }
    }

    // Clean up boss health bar immediately
    this.hud.removeBossHealthBar();
    this.bossHealthFill = null;

    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Show Game Over screen after a brief delay
    setTimeout(() => {
      this.showGameOverScreen();
    }, 500);
  }

  showGameOverScreen() {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "bathroom-game-over-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0, 0, 0, 0.8)";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "10000";
    overlay.style.fontFamily = "Arial, sans-serif";

    // Game Over text
    const title = document.createElement("h1");
    title.textContent = "GAME OVER";
    title.style.color = "#ff0000";
    title.style.fontSize = "72px";
    title.style.marginBottom = "20px";
    title.style.textShadow = "4px 4px 8px black";
    overlay.appendChild(title);

    // Subtitle
    const subtitle = document.createElement("p");
    subtitle.textContent = "The Bathroom Ghost was too powerful...";
    subtitle.style.color = "white";
    subtitle.style.fontSize = "24px";
    subtitle.style.marginBottom = "40px";
    overlay.appendChild(subtitle);

    // Button container
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "20px";

    // Restart button
    const restartBtn = document.createElement("button");
    restartBtn.textContent = "RESTART";
    restartBtn.style.padding = "15px 40px";
    restartBtn.style.fontSize = "24px";
    restartBtn.style.fontWeight = "bold";
    restartBtn.style.color = "white";
    restartBtn.style.background = "#ff0000";
    restartBtn.style.border = "3px solid white";
    restartBtn.style.borderRadius = "10px";
    restartBtn.style.cursor = "pointer";
    restartBtn.style.transition = "all 0.3s";

    restartBtn.onmouseover = () => {
      restartBtn.style.background = "#cc0000";
      restartBtn.style.transform = "scale(1.1)";
    };

    restartBtn.onmouseout = () => {
      restartBtn.style.background = "#ff0000";
      restartBtn.style.transform = "scale(1)";
    };

    restartBtn.onclick = () => {
      this.restartGame();
    };

    // Main Menu button
    const mainMenuBtn = document.createElement("button");
    mainMenuBtn.textContent = "MAIN MENU";
    mainMenuBtn.style.padding = "15px 40px";
    mainMenuBtn.style.fontSize = "24px";
    mainMenuBtn.style.fontWeight = "bold";
    mainMenuBtn.style.color = "white";
    mainMenuBtn.style.background = "#333333";
    mainMenuBtn.style.border = "3px solid white";
    mainMenuBtn.style.borderRadius = "10px";
    mainMenuBtn.style.cursor = "pointer";
    mainMenuBtn.style.transition = "all 0.3s";

    mainMenuBtn.onmouseover = () => {
      mainMenuBtn.style.background = "#555555";
      mainMenuBtn.style.transform = "scale(1.1)";
    };

    mainMenuBtn.onmouseout = () => {
      mainMenuBtn.style.background = "#333333";
      mainMenuBtn.style.transform = "scale(1)";
    };

    mainMenuBtn.onclick = () => {
      this.goToMainMenu();
    };

    buttonContainer.appendChild(restartBtn);
    buttonContainer.appendChild(mainMenuBtn);
    overlay.appendChild(buttonContainer);
    document.body.appendChild(overlay);
  }

  restartGame() {
    console.log("Restarting Bathroom Scene — cleaning old UI...");

    // === 1. REMOVE *ALL* GAME OVER / RESTART OVERLAYS ===
    document
      .querySelectorAll('[id*="game-over"], [id*="restart"], [id*="overlay"]')
      .forEach((el) => {
        if (el.parentNode) {
          console.log("Removing old overlay:", el.id || el.className);
          el.parentNode.removeChild(el);
        }
      });

    // Also remove any with class or text
    document.querySelectorAll("div").forEach((el) => {
      const text = el.textContent.toLowerCase();
      if (
        text.includes("game over") ||
        text.includes("restart") ||
        text.includes("main menu")
      ) {
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    });

    // === 2. RESET BATHROOM FLAGS ===
    this.gameOver = false;
    this.hitByProjectile = false;
    this.showTorchPrompt = false;
    this.torchEnabled = false;
    this.torchLight.visible = false;
    if (this.torchPromptElement) {
      this.torchPromptElement.style.display = "none";
    }
    this.ambientLight.intensity = 0.1;
    this.pickupPromptShown = false;
    this.victoryShown = false;

    // === 3. CLEAN UP BOSS ===
    if (this.boss) {
      if (this.boss.bossModel && this.boss.bossModel.parent) {
        this.scene.remove(this.boss.bossModel);
      }
      this.boss.projectiles.forEach((p) => {
        if (p.parent) this.scene.remove(p);
      });
      this.boss.projectiles = [];
      this.boss = null;
    }
    this.bossSpawned = false;
    this.bossHealthFill = null;

    // === 4. RESET PLAYER ===
    this.player.health.current = this.player.health.max;
    this.player._isDead = false;
    this.player.combatMode = false;

    if (this.player.ghost) {
      this.player.ghost.position.set(0, 2.5, 10);
      this.player.ghost.visible = false;
    }

    this.player.hud.updatePlayerHearts(
      this.player.health.current,
      this.player.health.max
    );

    // === 5. REMOVE TOILET PAPER ===
    if (this.toiletPaper) {
      this.scene.remove(this.toiletPaper);
      this.toiletPaper = null;
    }
    this.hidePickupPrompt();

    // === 6. CLEAN UP UI ===
    document
      .querySelectorAll(".hit-marker, #pickup-prompt, .shooting-instructions")
      .forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

    // === 7. RELOAD GUN & SPAWN BOSS ===
    this.player
      .loadGun("/public/assets/models/gun.glb")
      .then(() => {
        if (this.player.gun) {
          console.log("Gun re-loaded");
          this.player.enterCombat();
          this.spawnBoss();
        }
      })
      .catch((err) => {
        console.error("Failed to reload gun:", err);
      });

    console.log("Bathroom Scene fully restarted — no old menus!");
  }

  goToMainMenu() {
    console.log("Going to main menu...");

    // Remove game over overlay
    const overlay = document.getElementById("bathroom-game-over-overlay");
    if (overlay) {
      document.body.removeChild(overlay);
    }

    // Clean up boss health bar
    this.hud.removeBossHealthBar();

    // Reload the page to go back to main menu
    window.location.reload();
  }

  async dropToiletPaper(position) {
    const loader = new GLTFLoader();

    try {
      console.log("Loading toilet paper...");
      const gltf = await loader.loadAsync(
        "/assets/models/simple_toilet_paper_2.0.glb"
      );

      this.toiletPaper = gltf.scene;
      this.toiletPaper.position.copy(position);
      this.toiletPaper.position.y = 1.0; // Float at pickup height
      this.toiletPaper.scale.set(0.5, 0.5, 0.5); // Smaller scale
      this.toiletPaper.userData.isPickup = true;
      this.toiletPaper.userData.itemName = "Toilet Paper";

      this.scene.add(this.toiletPaper);

      // Add floating animation
      this.toiletPaper.userData.floatOffset = 0;

      console.log("Toilet paper dropped at", position);
    } catch (err) {
      console.error("Failed to load toilet paper model:", err);

      // Fallback: Create simple toilet paper geometry
      this.createFallbackToiletPaper(position);
    }
  }

  createFallbackToiletPaper(position) {
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.8,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
    });

    this.toiletPaper = new THREE.Mesh(geometry, material);
    this.toiletPaper.position.copy(position);
    this.toiletPaper.position.y = 1.0;
    this.toiletPaper.userData.isPickup = true;
    this.toiletPaper.userData.itemName = "Toilet Paper";
    this.toiletPaper.userData.floatOffset = 0;

    this.scene.add(this.toiletPaper);
    console.log("Created fallback toilet paper");
  }

  checkToiletPaperPickup() {
    if (!this.toiletPaper || !this.player.ghost) return;

    const distance = this.player.ghost.position.distanceTo(
      this.toiletPaper.position
    );

    if (distance < 2.0) {
      // Show pickup prompt
      if (!this.pickupPromptShown) {
        this.showPickupPrompt();
        this.pickupPromptShown = true;
      }
    } else {
      this.hidePickupPrompt();
      this.pickupPromptShown = false;
    }
  }

  showPickupPrompt() {
    if (document.getElementById("pickup-prompt")) return;

    const prompt = document.createElement("div");
    prompt.id = "pickup-prompt";
    prompt.style.position = "fixed";
    prompt.style.top = "50%";
    prompt.style.left = "50%";
    prompt.style.transform = "translate(-50%, -50%)";
    prompt.style.background = "rgba(0, 0, 0, 0.8)";
    prompt.style.color = "white";
    prompt.style.padding = "15px 30px";
    prompt.style.borderRadius = "10px";
    prompt.style.fontSize = "20px";
    prompt.style.fontWeight = "bold";
    prompt.style.border = "2px solid white";
    prompt.style.zIndex = "10000";
    prompt.textContent = "Press F to pick up Toilet Paper";
    document.body.appendChild(prompt);
  }

  hidePickupPrompt() {
    const prompt = document.getElementById("pickup-prompt");
    if (prompt) {
      prompt.remove();
    }
  }

  pickupToiletPaper() {
    if (!this.toiletPaper) return;

    console.log("Picking up toilet paper...");

    // Generate icon from 3D model
    const iconUrl = this.generateToiletPaperIcon();

    // Remove toilet paper from scene
    this.scene.remove(this.toiletPaper);

    // Add to inventory
    const toiletPaperItem = {
      name: "Toilet Paper",
      description:
        "Premium toilet paper that will restore the bathroom to its former glory.",
      icon: iconUrl,
      iconEmoji: "🧻", // Fallback emoji
      onUse: () => this.useToiletPaper(),
    };

    this.inventory.addItem(toiletPaperItem);
    this.hidePickupPrompt();
    this.toiletPaper = null;

    this.hud.showMessage(
      "Obtained Toilet Paper! Select it in your inventory and press E to use."
    );
  }

  generateToiletPaperIcon() {
    // Create a small offscreen renderer for the icon
    const iconSize = 128;
    const iconRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    iconRenderer.setSize(iconSize, iconSize);
    iconRenderer.setClearColor(0x000000, 0);

    // Create camera for icon
    const iconCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    iconCamera.position.set(2, 2, 2);
    iconCamera.lookAt(0, 0, 0);

    // Create temporary scene with toilet paper
    const iconScene = new THREE.Scene();

    // Add lighting
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(1, 1, 1);
    iconScene.add(light1);
    const light2 = new THREE.AmbientLight(0xffffff, 0.5);
    iconScene.add(light2);

    // Clone the toilet paper model
    const toiletPaperClone = this.toiletPaper.clone();
    toiletPaperClone.position.set(0, 0, 0);

    // Scale to fit icon
    const box = new THREE.Box3().setFromObject(toiletPaperClone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    toiletPaperClone.scale.multiplyScalar(scale);

    iconScene.add(toiletPaperClone);

    // Render to canvas
    iconRenderer.render(iconScene, iconCamera);

    // Get data URL
    const iconDataUrl = iconRenderer.domElement.toDataURL("image/png");

    // Cleanup
    iconRenderer.dispose();

    return iconDataUrl;
  }

// Key fix for useToiletPaper method - replace lines 1310-1340

async useToiletPaper() {
  console.log("Using toilet paper...");

  this.hud.showMessage(
    "*Rustle rustle* The bathroom is being restored..."
  );

  await this.sleep(2000);

  // TRANSFORM + TRANSITION
  this.transformBathroom();

  this.hud.showMessage("The bathroom has been restored! Moving to kitchen...");

  // Wait for player to see the clean bathroom
  await this.sleep(2500);
  
  // FIXED: Safely remove toilet paper from inventory
  if (this.inventory && this.inventory.items) {
    const tpIndex = this.inventory.items.findIndex(item => item.name === "Toilet Paper");
    if (tpIndex !== -1) {
      this.inventory.items.splice(tpIndex, 1);
      console.log("✅ Toilet paper removed from inventory");
      
      // Update inventory UI if it exists
      if (this.inventory.updateUI) {
        this.inventory.updateUI();
      }
    }
  }

  // === TRANSITION TO KITCHEN ===
  window.transitionToKitchen();
}

  transformBathroom() {
    console.log("✨ Transforming bathroom - turning on lights and cleaning!");

    // Apply clean bathroom effects (removes dust, restores white materials)
    this.applyCleanBathroom();

    // Brighten the ambient lighting significantly
    this.ambientLight.intensity = 0.8;
    this.directionalLight.intensity = 1.2;

    // Add warm bathroom lighting
    const warmLight = new THREE.PointLight(0xfff4da, 2, 30);
    warmLight.position.set(0, 8, 8);
    this.scene.add(warmLight);

    const warmLight2 = new THREE.PointLight(0xfff4da, 1.5, 25);
    warmLight2.position.set(5, 6, 5);
    this.scene.add(warmLight2);

    // Change background to a lighter color
    this.scene.background = new THREE.Color(0x2a2a2a);

    console.log("💡 Bathroom lights turned on and cleaned!");
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  update() {
    this.updateWithCameraRotation(0, 0);
  }

  getCameraSnapRotation() {
    return null;
  }

  highlightMesh(name, color = 0xff0000) {
    if (!this.bathroomModel) {
      console.warn("Bathroom model not loaded yet.");
      return;
    }

    const mesh = this.bathroomModel.getObjectByName(name);
    if (mesh) {
      console.log("Highlighting mesh:", name, mesh);
      mesh.material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
      });
    } else {
      console.warn("Mesh not found:", name);
    }
  }
  // Add this method to BathroomScene class (before the closing brace)

dispose() {
  console.log("🧹 Disposing bathroom scene...");
  
  // Remove boss if exists
  if (this.boss) {
    if (this.boss.bossModel) {
      this.scene.remove(this.boss.bossModel);
    }
    if (this.boss.projectiles) {
      this.boss.projectiles.forEach(proj => {
        if (proj.parent) this.scene.remove(proj);
      });
      this.boss.projectiles = [];
    }
    this.boss = null;
  }
  
  // Remove toilet paper
  if (this.toiletPaper) {
    this.scene.remove(this.toiletPaper);
    this.toiletPaper = null;
  }
  
  // Remove dust particles
  if (this.dustParticles) {
    this.scene.remove(this.dustParticles);
    this.dustParticles = null;
  }
  
  // Clean up UI elements
  const torchPrompt = document.getElementById("torch-prompt");
  if (torchPrompt) torchPrompt.remove();
  
  const pickupPrompt = document.getElementById("pickup-prompt");
  if (pickupPrompt) pickupPrompt.remove();
  
  // Remove health bar
  if (this.hud) {
    this.hud.removeBossHealthBar();
  }
  
  // Clean up mirror
  if (this.mirrorRenderTarget) {
    this.mirrorRenderTarget.dispose();
    this.mirrorRenderTarget = null;
  }
  
  // Remove bathroom model
  if (this.bathroomModel) {
    this.scene.remove(this.bathroomModel);
  }
  
  // Clear physics
  if (this.physics) {
    this.physics.collisionObjects = [];
  }
  
  console.log("✅ Bathroom scene disposed");
}
}