import * as THREE from "three";
import Player from "../entities/player.js";
import Tutorial from "../systems/tutorial.js";
import BellboyBoss from "../entities/bellboyBoss.js";
import HUD from "../ui/hud.js";
import PhysicsSystem from "../systems/physics.js";
import Inventory from "../systems/inventory.js";
import RoomTransformation from "../systems/roomTransformation.js";
import CutsceneManager from "../systems/cutsceneManager.js";
import { postLobbyCutscene } from "../cutscenes/postLobbyCutscene.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class LobbyScene {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Initialize physics system
    this.physics = new PhysicsSystem(this.scene);

    // Initialize inventory system
    this.inventory = new Inventory(null);

    // Initialize room transformation system
    this.roomTransformer = new RoomTransformation(this.scene, this.physics);

    this.lobbyModel = null;
    this.loadLobbyEnvironment();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(ambient, dirLight);

    // Use HUD class
    this.hud = new HUD();

    // Player (with HUD support)
    this.player = new Player(this.scene, this.camera, this.hud);
    this.player.loadGhost("/public/assets/models/scene.gltf");
    this.player.loadGun("/public/assets/models/gun.glb");

    // Set global reference so player can call handlePlayerDefeat
    window.lobbyScene = this;

    // Tutorial (with HUD + Player)
    // Pass the scene reference so tutorial can call startBossFight
    this.tutorial = new Tutorial(this.hud, this, this.player);
    this.player.setTutorial(this.tutorial);
    this.tutorial.start(this.camera.rotation.y, this.camera.rotation.x);

    // Boss will spawn later
    this.boss = null;
    this.bossHealthFill = null;

    // Game state
    this.gameOver = false;
  }

  async loadLobbyEnvironment() {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync("/assets/models/lobby.glb");

      this.lobbyModel = gltf.scene;
      this.lobbyModel.position.set(0, 0, 0);
      this.lobbyModel.scale.set(2.5, 2.5, 2.5);

      this.scene.add(this.lobbyModel);

      // Register all meshes in the lobby model as collision objects
      this.physics.addCollisionObject(this.lobbyModel, true);
      console.log(
        `Registered ${this.physics.collisionObjects.length} collision objects from lobby model`
      );
    } catch (err) {
      console.error("Failed to load lobby environment:", err);
    }
  }

  startBossFight() {
    console.log("⚔️ Boss fight starting...");

    // Keep player in combat mode
    this.player.enterCombat();

    // Spawn the boss with physics reference
    this.boss = new BellboyBoss(
      this.scene,
      this.player,
      this.hud,
      this.physics
    );

    // Store boss reference in scene for player to access
    this.scene.userData.boss = this.boss;
    this.scene.userData.lobbyScene = this;

    // Snap camera to look at boss
    this.snapCameraToBoss();

    // Create ONLY boss health bar (removed player health bar)
    this.bossHealthFill = this.hud.createHealthBar("Bellboy Ghost", 50, "red");

    console.log("Boss health bar created:", this.bossHealthFill);

    // Show boss introduction message
    this.hud.showMessage("The Bellboy Ghost has appeared! Defeat him!");
    setTimeout(() => {
      this.hud.showMessage("");
    }, 3000);
  }

  updateBossHealth() {
    if (this.bossHealthFill && this.boss) {
      const healthPercent = (this.boss.health / this.boss.maxHealth) * 100;
      this.bossHealthFill.style.width = healthPercent + "%";

      // Show warning message when boss enters chase mode
      if (this.boss.isChasing && !this.boss.chaseMessageShown) {
        this.boss.chaseMessageShown = true;
        this.hud.showMessage(
          "The boss is now chasing you! Keep your distance!"
        );
        setTimeout(() => {
          this.hud.showMessage("");
        }, 3000);
      }
    }
  }

  checkPlayerHit() {
    // Multiple guards to prevent hits after death
    if (this.gameOver) return;
    if (!this.boss || !this.boss.projectiles || !this.player.ghost) return;
    if (this.player.health.current <= 0) return;
    if (this.player._isDead) return;

    const playerPos = this.player.ghost.position;
    const hitRadius = 1.0; // Distance to consider a hit

    for (let i = this.boss.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.boss.projectiles[i];
      if (!projectile) continue;

      const distance = projectile.position.distanceTo(playerPos);

      if (distance < hitRadius) {
        // Player is hit!
        console.log("Player hit by boss projectile!");

        // Remove projectile first
        this.scene.remove(projectile);
        this.boss.projectiles.splice(i, 1);

        // Damage player
        this.player.takeDamage(1);

        // Stop checking if player died
        if (this.player.health.current <= 0) {
          return;
        }

        // Visual feedback - flash screen red
        const flashDiv = document.createElement("div");
        flashDiv.style.position = "fixed";
        flashDiv.style.top = "0";
        flashDiv.style.left = "0";
        flashDiv.style.width = "100%";
        flashDiv.style.height = "100%";
        flashDiv.style.background = "rgba(255, 0, 0, 0.3)";
        flashDiv.style.pointerEvents = "none";
        flashDiv.style.zIndex = "9999";
        document.body.appendChild(flashDiv);

        setTimeout(() => {
          if (flashDiv.parentElement) {
            document.body.removeChild(flashDiv);
          }
        }, 200);
      }
    }
  }

  handlePlayerDefeat() {
    if (this.gameOver) return;

    this.gameOver = true;
    console.log("💀 Game Over - Player Defeated");

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
    if (this.bossHealthFill && this.bossHealthFill.parentElement) {
      try {
        this.bossHealthFill.parentElement.parentElement.removeChild(
          this.bossHealthFill.parentElement
        );
      } catch (e) {
        console.error("Error removing boss health bar:", e);
      }
      this.bossHealthFill = null;
    }

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
    overlay.id = "game-over-overlay";
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
    subtitle.textContent = "The Bellboy Ghost was too powerful...";
    subtitle.style.color = "white";
    subtitle.style.fontSize = "24px";
    subtitle.style.marginBottom = "40px";
    overlay.appendChild(subtitle);

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

    overlay.appendChild(restartBtn);
    document.body.appendChild(overlay);
  }

  restartGame() {
    console.log("Restarting boss fight...");

    // Remove game over overlay
    const overlay = document.getElementById("game-over-overlay");
    if (overlay) {
      document.body.removeChild(overlay);
    }

    // Reset game state
    this.gameOver = false;

    // Remove old boss if it exists
    if (this.boss && this.boss.mesh) {
      this.scene.remove(this.boss.mesh);
    }

    // Reset player health
    this.player.health.current = this.player.health.max;
    this.player._isDead = false;
    if (this.player.hud) {
      this.player.hud.updatePlayerHearts(
        this.player.health.current,
        this.player.health.max
      );
    }

    // Restart the boss fight
    this.startBossFight();
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

  updateWithCameraRotation(yaw, pitch) {
    const delta = this.clock.getDelta();
    const time = this.clock.elapsedTime;

    // Don't update if game is over
    if (this.gameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.player.update();

    // Only run tutorial if it exists and hasn't completed
    if (this.tutorial && this.tutorial.phase < this.tutorial.phases.length) {
      // Pass the actual yaw and pitch from main.js
      this.tutorial.update({}, this.player, yaw, pitch, delta);
    }

    // Update boss if it exists and game is not over
    if (this.boss && this.boss.isAlive && !this.gameOver) {
      this.boss.update(delta, time);

      // Update boss health bar
      this.updateBossHealth();

      // Check if player is hit by boss projectiles
      if (this.boss.projectiles && this.boss.projectiles.length > 0) {
        this.checkPlayerHit();
      }
    } else if (
      this.boss &&
      !this.boss.isAlive &&
      this.boss.defeated &&
      !this.gameOver
    ) {
      // Check if boss is defeated (only if player is alive)
      this.handleBossDefeat();
    }

    // Animate and check for service bell pickup
    if (this.serviceBell) {
      // Floating animation
      this.serviceBell.userData.floatOffset += delta * 2;
      this.serviceBell.position.y =
        1.0 + Math.sin(this.serviceBell.userData.floatOffset) * 0.2;
      this.serviceBell.rotation.y += delta;

      // Check if player is nearby
      this.checkBellPickup();
    }

    this.renderer.render(this.scene, this.camera);
  }

  update() {
    // Fallback for when called without rotation data
    this.updateWithCameraRotation(0, 0);
  }

  async handleBossDefeat() {
    if (this.boss.defeatedHandled) return;
    this.boss.defeatedHandled = true;

    this.hud.showMessage("🎉 Victory! The Bellboy Ghost has been defeated!");
    this.player.exitCombat();

    // Clean up boss health bar only (no player health bar anymore)
    if (this.bossHealthFill && this.bossHealthFill.parentElement) {
      try {
        this.bossHealthFill.parentElement.parentElement.removeChild(
          this.bossHealthFill.parentElement
        );
      } catch (e) {
        console.error("Error cleaning up boss health bar:", e);
      }
      this.bossHealthFill = null;
    }

    // Wait a short delay before the cutscene starts
    setTimeout(async () => {
      this.hud.showMessage("");

      // Pause gameplay visuals
      if (this.renderer) this.renderer.setAnimationLoop(null);

      // Create a cutscene manager instance
      const cutsceneContainer = document.getElementById("cutscene-container");
      if (!cutsceneContainer) {
        console.error(
          "Cutscene container not found — was it created in main.js?"
        );
        // Fallback to old behavior
        this.dropServiceBell(this.boss.mesh.position);
        setTimeout(() => {
          this.hud.showMessage("A mysterious bell has appeared... Pick it up!");
        }, 1000);
        return;
      }

      const cutsceneManager = new CutsceneManager("cutscene-container");

      console.log("🎬 Starting post-lobby cutscene...");
      await cutsceneManager.play(postLobbyCutscene);

      console.log("✅ Post-lobby cutscene complete.");

      // Drop the service bell at boss location after cutscene
      this.dropServiceBell(this.boss.mesh.position);

      // Show pickup message
      this.hud.showMessage("A mysterious bell has appeared... Pick it up!");

      // Resume gameplay
      if (this.renderer) {
        const animate = () => {
          requestAnimationFrame(animate);
          // This will be overridden by main.js's animate loop
        };
        this.renderer.setAnimationLoop(animate);
      }
    }, 2000);
  }

  async dropServiceBell(position) {
    const loader = new GLTFLoader();

    try {
      console.log("Loading service bell...");
      const gltf = await loader.loadAsync(
        "/assets/models/worn_service_ring_bell.glb"
      );

      this.serviceBell = gltf.scene;
      this.serviceBell.position.copy(position);
      this.serviceBell.position.y = 1.0; // Float at pickup height
      this.serviceBell.scale.set(5, 5, 5);
      this.serviceBell.userData.isPickup = true;
      this.serviceBell.userData.itemName = "Service Bell";

      this.scene.add(this.serviceBell);

      // Add floating animation
      this.serviceBell.userData.floatOffset = 0;

      console.log("Service bell dropped at", position);
    } catch (err) {
      console.error("Failed to load service bell model:", err);

      // Fallback: Create simple bell geometry
      this.createFallbackBell(position);
    }
  }

  createFallbackBell(position) {
    const geometry = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xffd700,
      emissiveIntensity: 0.3,
    });

    this.serviceBell = new THREE.Mesh(geometry, material);
    this.serviceBell.position.copy(position);
    this.serviceBell.position.y = 1.0;
    this.serviceBell.userData.isPickup = true;
    this.serviceBell.userData.itemName = "Service Bell";
    this.serviceBell.userData.floatOffset = 0;

    this.scene.add(this.serviceBell);
    console.log("Created fallback bell");
  }

  checkBellPickup() {
    if (!this.serviceBell || !this.player.ghost) return;

    const distance = this.player.ghost.position.distanceTo(
      this.serviceBell.position
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
    prompt.style.color = "gold";
    prompt.style.padding = "15px 30px";
    prompt.style.borderRadius = "10px";
    prompt.style.fontSize = "20px";
    prompt.style.fontWeight = "bold";
    prompt.style.border = "2px solid gold";
    prompt.style.zIndex = "10000";
    prompt.textContent = "Press F to pick up Service Bell";
    document.body.appendChild(prompt);
  }

  hidePickupPrompt() {
    const prompt = document.getElementById("pickup-prompt");
    if (prompt) {
      prompt.remove();
    }
  }

  pickupBell() {
    if (!this.serviceBell) return;

    console.log("Picking up service bell...");

    // Generate icon from 3D model
    const iconUrl = this.generateBellIcon();

    // Remove bell from scene
    this.scene.remove(this.serviceBell);

    // Add to inventory
    const bellItem = {
      name: "Bell",
      description: "A worn service bell that summons... something.",
      icon: iconUrl,
      iconEmoji: "🔔", // Fallback emoji
      onUse: () => this.useServiceBell(),
    };

    this.inventory.addItem(bellItem);
    this.hidePickupPrompt();
    this.serviceBell = null;

    this.hud.showMessage(
      "Obtained Service Bell! Select it in your inventory and press E to use."
    );
  }

  generateBellIcon() {
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

    // Create temporary scene with bell
    const iconScene = new THREE.Scene();

    // Add lighting
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(1, 1, 1);
    iconScene.add(light1);
    const light2 = new THREE.AmbientLight(0xffffff, 0.5);
    iconScene.add(light2);

    // Clone the bell model
    const bellClone = this.serviceBell.clone();
    bellClone.position.set(0, 0, 0);

    // Scale to fit icon
    const box = new THREE.Box3().setFromObject(bellClone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    bellClone.scale.multiplyScalar(scale);

    iconScene.add(bellClone);

    // Render to canvas
    iconRenderer.render(iconScene, iconCamera);

    // Get data URL
    const iconDataUrl = iconRenderer.domElement.toDataURL("image/png");

    // Cleanup
    iconRenderer.dispose();

    return iconDataUrl;
  }

  async useServiceBell() {
    console.log("🔔 Using service bell...");

    this.hud.showMessage(
      "🔔 *Ring ring* The bell chimes throughout the hotel..."
    );

    // Wait a moment
    await this.sleep(2000);

    // Transform the room
    await this.roomTransformer.transformRoom(this.lobbyModel);

    // Update message
    setTimeout(() => {
      this.hud.showMessage("The lobby has been restored to its former glory!");
    }, 1000);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  snapCameraToBoss() {
    if (!this.boss || !this.player.ghost) return;

    // Calculate the direction from player to boss
    const playerPos = this.player.ghost.position;
    const bossPos = this.boss.mesh.position;

    const dx = bossPos.x - playerPos.x;
    const dz = bossPos.z - playerPos.z;
    const dy = bossPos.y - playerPos.y;

    // Calculate yaw (horizontal rotation)
    const yaw = Math.atan2(-dx, -dz);

    // Calculate pitch (vertical rotation) - looking slightly up at the boss
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const pitch = Math.atan2(dy, horizontalDist);

    // Store the target camera rotation
    this.cameraSnapTarget = { yaw, pitch };
    this.cameraSnapActive = true;

    console.log(
      `Snapping camera to boss - Yaw: ${yaw.toFixed(2)}, Pitch: ${pitch.toFixed(
        2
      )}`
    );
  }

  getCameraSnapRotation() {
    if (this.cameraSnapActive && this.cameraSnapTarget) {
      this.cameraSnapActive = false; // Only snap once
      return this.cameraSnapTarget;
    }
    return null;
  }
}
