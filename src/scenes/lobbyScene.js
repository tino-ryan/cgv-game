//src/scenes/lobbyScene.js
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
import {
  applyDirtyScene,
  applyCleanScene,
  createDustParticles,
  updateDustParticles,
} from "../core/filters.js"; // Update this path

import { level2start } from "../cutscenes/level2start.js";


export default class LobbyScene {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    // In LobbyScene constructor, add:
    this.ghostTransitionActive = false; // Lobby has normal collision

    this.physics = new PhysicsSystem(this.scene);
    this.inventory = new Inventory(null);
    this.roomTransformer = new RoomTransformation(this.scene, this.physics);
    this.lobbyModel = null;
    this.dustParticles = null;
    this.sparklePass = null;
    this.lampLights = []; // Store lamp lights
    this.loadLobbyEnvironment();

    // Lights - store references for scene filters
    this.ambientLight = new THREE.AmbientLight(0xa89582, 0.6); // Start with dirty tint
    this.dirLight = new THREE.DirectionalLight(0xa89582, 0.7); // Start with dirty tint
    this.dirLight.position.set(5, 10, 5);
    this.dirLight.castShadow = true;
    this.scene.add(this.ambientLight, this.dirLight);

    this.hud = new HUD();
    this.player = new Player(this.scene, this.camera, this.hud);
    this.player.loadGhost("/public/assets/models/mainchar.glb");
    this.player.loadGun("/public/assets/models/gun.glb");

    window.lobbyScene = this;

    this.tutorial = new Tutorial(this.hud, this, this.player);
    this.player.setTutorial(this.tutorial);

    this.loadTutorialOrbModels();

    this.boss = null;
    this.bossHealthFill = null;
    this.gameOver = false;
  }

  async loadTutorialOrbModels() {
    const orbModelPaths = [
      "/assets/models/cc0_-_bucket_3.glb",
      "/assets/models/feather_duster.glb",
      "/assets/models/soap.glb",
      "/assets/models/sponge.glb",
    ];

    try {
      await this.tutorial.loadOrbModels(orbModelPaths);
      console.log("✅ Tutorial orb models loaded successfully");
      this.tutorial.start(this.camera.rotation.y, this.camera.rotation.x);
    } catch (error) {
      console.error("❌ Error loading tutorial orb models:", error);
      this.tutorial.start(this.camera.rotation.y, this.camera.rotation.x);
    }
  }

  async loadLobbyEnvironment() {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync("/assets/models/lobby.glb");
      this.lobbyModel = gltf.scene;
      this.lobbyModel.position.set(0, 0, 0);
      this.lobbyModel.scale.set(2.5, 2.5, 2.5);
      this.scene.add(this.lobbyModel);

      // Create dust particles system instead of flat overlay
      this.dustParticles = createDustParticles(this.scene);

      // Apply dirty scene initially with dimmer lighting
      applyDirtyScene(
        this.scene,
        this.renderer,
        this.dustParticles,
        this.ambientLight,
        this.dirLight
      );

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

    // Start the dramatic light flickering effect
    this.startLightFlicker();

    // Wait for flicker to finish before spawning boss
    setTimeout(() => {
      this.player.enterCombat();

      this.boss = new BellboyBoss(
        this.scene,
        this.player,
        this.hud,
        this.physics
      );

      this.scene.userData.boss = this.boss;
      this.scene.userData.lobbyScene = this;

      // Apply red glow to the boss after it's created
      setTimeout(() => {
        if (this.boss && this.boss.mesh) {
          this.applyBossRedGlow(this.boss.mesh);
        }
      }, 100);

      this.snapCameraToBoss();

      this.bossHealthFill = this.hud.createHealthBar(
        "Bellboy Ghost",
        50,
        "red"
      );

      this.hud.showMessage("The Bellboy Ghost has appeared! Defeat him!");
      setTimeout(() => {
        this.hud.showMessage("");
      }, 3000);
    }, 2500);
  }

  startLightFlicker() {
    console.log("💡 Starting light flicker effect...");

    const originalAmbientIntensity = this.ambientLight.intensity;
    const originalDirIntensity = this.dirLight.intensity;

    let flickerCount = 0;
    const maxFlickers = 8;

    const flickerInterval = setInterval(() => {
      flickerCount++;

      const randomIntensity = Math.random() * 0.4 + 0.1;

      this.ambientLight.intensity = randomIntensity;
      this.dirLight.intensity = randomIntensity;

      if (this.lampLights && this.lampLights.length > 0) {
        this.lampLights.forEach((light) => {
          light.intensity = randomIntensity * 2;
        });
      }

      if (flickerCount > 3) {
        this.ambientLight.color.setHex(0xff6666);
        this.dirLight.color.setHex(0xff4444);
      }

      if (flickerCount >= maxFlickers) {
        clearInterval(flickerInterval);

        this.ambientLight.intensity = originalAmbientIntensity * 0.8;
        this.dirLight.intensity = originalDirIntensity * 0.8;
        this.ambientLight.color.setHex(0xffcccc);
        this.dirLight.color.setHex(0xffdddd);

        if (this.lampLights && this.lampLights.length > 0) {
          this.lampLights.forEach((light) => {
            light.intensity = 1.0;
            light.color.setHex(0xff8888);
          });
        }

        console.log("💡 Light flicker complete");
      }
    }, 150);
  }

  applyBossRedGlow(bossMesh) {
    console.log("🔴 Applying red glow to boss...");

    bossMesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material.clone();
        }

        const glowMat = child.material.clone();
        glowMat.emissive = new THREE.Color(0xff0000);
        glowMat.emissiveIntensity = 0.8;

        glowMat.onBeforeCompile = (shader) => {
          shader.uniforms.time = { value: 0 };

          shader.fragmentShader = `
            uniform float time;
            ${shader.fragmentShader}
          `.replace(
            `#include <emissivemap_fragment>`,
            `#include <emissivemap_fragment>
             float pulse = sin(time * 2.0) * 0.3 + 0.7;
             totalEmissiveRadiance *= pulse;
             float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vec3(0.0, 0.0, 1.0))), 2.0);
             diffuseColor.rgb += fresnel * vec3(1.0, 0.0, 0.0) * 0.8 * pulse;
            `
          );

          child.userData.glowShader = shader;
        };

        child.material = glowMat;
        child.material.needsUpdate = true;
      }
    });

    this.bossGlowMesh = bossMesh;
  }

  updateBossHealth() {
    if (this.bossHealthFill && this.boss) {
      const healthPercent = (this.boss.health / this.boss.maxHealth) * 100;
      this.bossHealthFill.style.width = healthPercent + "%";

      if (this.boss.isChasing && !this.boss.chaseMessageShown) {
        this.boss.chaseMessageShown = true;
        this.hud.showMessage("The boss is now chasing you! Keep your distance!");
        setTimeout(() => this.hud.showMessage(""), 3000);
      }
    }
  }

  checkPlayerHit() {
    if (this.gameOver) return;
    if (!this.boss || !this.boss.projectiles || !this.player.ghost) return;
    if (this.player.health.current <= 0) return;
    if (this.player._isDead) return;

    const playerPos = this.player.ghost.position;
    const hitRadius = 1.0;

    for (let i = this.boss.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.boss.projectiles[i];
      if (!projectile) continue;
      const distance = projectile.position.distanceTo(playerPos);
      if (distance < hitRadius) {
        console.log("Player hit by boss projectile!");

        this.scene.remove(projectile);
        this.boss.projectiles.splice(i, 1);

        this.player.takeDamage(1);

        if (this.player.health.current <= 0) {
          return;
        }

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
          if (flashDiv.parentElement) document.body.removeChild(flashDiv);
        }, 200);
      }
    }
  }

  handlePlayerDefeat() {
    if (this.gameOver) return;
    this.gameOver = true;
    console.log("💀 Game Over - Player Defeated");

    this.player.combatMode = false;

    if (this.boss) {
      this.boss.isAlive = false;
      if (this.boss.projectiles) {
        this.boss.projectiles.forEach((proj) => {
          try {
            this.scene.remove(proj);
          } catch (e) {}
        });
        this.boss.projectiles = [];
      }
    }

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

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    setTimeout(() => {
      this.showGameOverScreen();
    }, 500);
  }

  showGameOverScreen() {
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

    const title = document.createElement("h1");
    title.textContent = "GAME OVER";
    title.style.color = "#ff0000";
    title.style.fontSize = "72px";
    title.style.marginBottom = "20px";
    title.style.textShadow = "4px 4px 8px black";
    overlay.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.textContent = "The Bellboy Ghost was too powerful...";
    subtitle.style.color = "white";
    subtitle.style.fontSize = "24px";
    subtitle.style.marginBottom = "40px";
    overlay.appendChild(subtitle);

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
    restartBtn.onclick = () => this.restartGame();
    overlay.appendChild(restartBtn);
    document.body.appendChild(overlay);
  }

  restartGame() {
    console.log("Restarting boss fight...");

    const overlay = document.getElementById("game-over-overlay");
    if (overlay) {
      document.body.removeChild(overlay);
    }

    this.gameOver = false;

    if (this.boss && this.boss.mesh) {
      this.scene.remove(this.boss.mesh);
    }

    this.player.health.current = this.player.health.max;
    this.player._isDead = false;
    if (this.player.hud) {
      this.player.hud.updatePlayerHearts(this.player.health.current, this.player.health.max);
    }

    this.startBossFight();
  }

  showHitMarker() {
    if (this.gameOver) return;
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
    setTimeout(() => {
      marker.style.transition = "opacity 0.3s";
      marker.style.opacity = "0";
      setTimeout(() => {
        if (marker.parentElement) document.body.removeChild(marker);
      }, 300);
    }, 100);
  }

  updateWithCameraRotation(yaw, pitch) {
    const delta = this.clock.getDelta();
    const time = this.clock.elapsedTime;

    if (this.gameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.player.update();

    if (this.dustParticles && this.dustParticles.visible) {
      updateDustParticles(this.dustParticles, delta);
    }

    if (this.tutorial && this.tutorial.phase < this.tutorial.phases.length) {
      this.tutorial.update({}, this.player, yaw, pitch, delta);
    }

    if (this.boss && this.boss.isAlive && !this.gameOver) {
      this.boss.update(delta, time);
      this.updateBossHealth();

      // ADD THIS: Animate boss red glow pulse
      if (this.bossGlowMesh) {
        this.bossGlowMesh.traverse((child) => {
          if (child.isMesh && child.userData.glowShader) {
            child.userData.glowShader.uniforms.time.value = time;
          }
        });
      }

      if (this.boss.projectiles && this.boss.projectiles.length > 0) {
        this.checkPlayerHit();
      }
    } else if (
      this.boss &&
      !this.boss.isAlive &&
      this.boss.defeated &&
      !this.gameOver
    ) {
      this.handleBossDefeat();
    }

    if (this.serviceBell) {
      this.serviceBell.userData.floatOffset += delta * 2;
      this.serviceBell.position.y = 1.0 + Math.sin(this.serviceBell.userData.floatOffset) * 0.2;
      this.serviceBell.rotation.y += delta;

      this.checkBellPickup();
    }

    this.renderer.render(this.scene, this.camera);
  }

  update() {
    this.updateWithCameraRotation(0, 0);
  }

  async handleBossDefeat() {
    if (this.boss.defeatedHandled) return;
    this.boss.defeatedHandled = true;

    // ADD THIS: Restore normal lighting
    if (this.ambientLight && this.dirLight) {
      this.ambientLight.intensity = 0.6;
      this.dirLight.intensity = 0.7;
      this.ambientLight.color.setHex(0xa89582);
      this.dirLight.color.setHex(0xa89582);

      if (this.lampLights && this.lampLights.length > 0) {
        this.lampLights.forEach((light) => {
          light.intensity = 1.0;
          light.color.setHex(0xffffff);
        });
      }
    }

    this.hud.showMessage("🎉 Victory! The Bellboy Ghost has been defeated!");
    this.player.exitCombat();

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

    setTimeout(async () => {
      this.hud.showMessage("");

      if (this.renderer) this.renderer.setAnimationLoop(null);

      const cutsceneContainer = document.getElementById("cutscene-container");
      if (!cutsceneContainer) {
        console.error(
          "Cutscene container not found — was it created in main.js?"
        );
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

      this.dropServiceBell(this.boss.mesh.position);

      this.hud.showMessage("A mysterious bell has appeared... Pick it up!");

      if (this.renderer) {
        const animate = () => {
          requestAnimationFrame(animate);
        };
        this.renderer.setAnimationLoop(animate);
      }
    }, 2000);
  }

  async dropServiceBell(position) {
    const loader = new GLTFLoader();
    try {
      console.log("Loading service bell...");
      const gltf = await loader.loadAsync("/assets/models/worn_service_ring_bell.glb");
      this.serviceBell = gltf.scene;
      this.serviceBell.position.copy(position);
      this.serviceBell.position.y = 1.0;
      this.serviceBell.scale.set(5, 5, 5);
      this.serviceBell.userData.isPickup = true;
      this.serviceBell.userData.itemName = "Service Bell";
      this.scene.add(this.serviceBell);

      this.serviceBell.userData.floatOffset = 0;
      console.log("Service bell dropped at", position);
    } catch (err) {
      console.error("Failed to load service bell model:", err);

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
    const distance = this.player.ghost.position.distanceTo(this.serviceBell.position);
    if (distance < 2.0) {
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
    if (prompt) prompt.remove();
  }

  pickupBell() {
    if (!this.serviceBell) return;
    console.log("Picking up service bell...");

    const iconUrl = this.generateBellIcon();

    this.scene.remove(this.serviceBell);

    const bellItem = {
      name: "Bell",
      description: "A worn service bell that summons... something.",
      icon: iconUrl,
      iconEmoji: "🔔",
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
    const iconSize = 128;
    const iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    iconRenderer.setSize(iconSize, iconSize);
    iconRenderer.setClearColor(0x000000, 0);

    const iconCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    iconCamera.position.set(2, 2, 2);
    iconCamera.lookAt(0, 0, 0);

    const iconScene = new THREE.Scene();

    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(1, 1, 1);
    iconScene.add(light1);
    const light2 = new THREE.AmbientLight(0xffffff, 0.5);
    iconScene.add(light2);

    const bellClone = this.serviceBell.clone();
    bellClone.position.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(bellClone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    bellClone.scale.multiplyScalar(scale);
    iconScene.add(bellClone);

    iconRenderer.render(iconScene, iconCamera);

    const iconDataUrl = iconRenderer.domElement.toDataURL("image/png");

    iconRenderer.dispose();
    return iconDataUrl;
  }

  async useServiceBell() {
    console.log("🔔 Using service bell...");

    this.hud.showMessage(
      "🔔 *Ring ring* The bell chimes throughout the hotel..."
    );

    await this.sleep(2000);

    await this.roomTransformer.transformRoom(this.lobbyModel);

    // Apply clean scene filter with brighter lighting
    applyCleanScene(
      this.scene,
      this.renderer,
      this.sparklePass,
      this.ambientLight,
      this.dirLight
    );

    // Hide dust particles
    if (this.dustParticles) {
      this.dustParticles.visible = false;
    }

    setTimeout(() => {
      this.hud.showMessage("The lobby has been restored to its former glory!");
      setTimeout(() => {
        this.hud.showMessage("");
        if (window.transitionToHallway) {
          window.transitionToHallway();
        }
      }, 2000);
    }, 1000);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  snapCameraToBoss() {
    if (!this.boss || !this.player.ghost) return;

    const playerPos = this.player.ghost.position;
    const bossPos = this.boss.mesh.position;
    const dx = bossPos.x - playerPos.x;
    const dz = bossPos.z - playerPos.z;
    const dy = bossPos.y - playerPos.y;

    const yaw = Math.atan2(-dx, -dz);

    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const pitch = Math.atan2(dy, horizontalDist);

    this.cameraSnapTarget = { yaw, pitch };
    this.cameraSnapActive = true;
    console.log(`Snapping camera to boss - Yaw: ${yaw.toFixed(2)}, Pitch: ${pitch.toFixed(2)}`);
  }

  getCameraSnapRotation() {
    if (this.cameraSnapActive && this.cameraSnapTarget) {
      this.cameraSnapActive = false;
      return this.cameraSnapTarget;
    }
    return null;
  }
}