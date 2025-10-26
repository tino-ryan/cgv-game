// src/scenes/bathroomScene.js
import * as THREE from "three";
import Player from "../entities/player.js";
import WallCrawlerBoss from "../entities/wallCrawlerBoss.js";
import HUD from "../ui/hud.js";
import PhysicsSystem from "../systems/physics.js";
import Inventory from "../systems/inventory.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class BathroomScene {
  constructor(renderer, camera, existingPlayer = null, playerPosition = null, cameraRotation = null) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.ghostTransitionActive = false;

    this.physics = new PhysicsSystem(this.scene);
    this.inventory = existingPlayer?.inventory || new Inventory(null);
    this.bathroomModel = null;
    this.loadBathroomEnvironment();

    // Darker, moodier lighting for bathroom
    const ambient = new THREE.AmbientLight(0x9999ff, 0.3);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(2, 8, 3);
    this.scene.add(ambient, dirLight);

    // Add flickering point light for atmosphere
    this.flickerLight = new THREE.PointLight(0xffffff, 0.8, 15);
    this.flickerLight.position.set(0, 4, 0);
    this.scene.add(this.flickerLight);

    this.hud = existingPlayer?.hud || new HUD();
    
    if (existingPlayer) {
      this.player = existingPlayer;
      this.player.ghost.position.copy(playerPosition || new THREE.Vector3(0, 2, 8));
    } else {
      this.player = new Player(this.scene, this.camera, this.hud);
      this.player.loadGhost("/public/assets/models/scene.gltf");
      this.player.loadGun("/public/assets/models/gun.glb");
      this.player.ghost.position.set(0, 2, 8);
    }

    this.initialCameraRotation = cameraRotation || { yaw: 0, pitch: 0 };

    window.bathroomScene = this;

    this.boss = null;
    this.bossHealthFill = null;
    this.gameOver = false;
    this.bossStarted = false;

    // Start boss fight after short delay
    setTimeout(() => this.startBossFight(), 2000);
  }

  async loadBathroomEnvironment() {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync("/assets/models/bathroomh.glb");
      this.bathroomModel = gltf.scene;
      this.bathroomModel.position.set(0, 0, 0);
      this.bathroomModel.scale.set(2.5, 2.5, 2.5);
      this.scene.add(this.bathroomModel);
      this.physics.addCollisionObject(this.bathroomModel, true);
      console.log(`Bathroom loaded with ${this.physics.collisionObjects.length} collision objects`);
    } catch (err) {
      console.error("Failed to load bathroom:", err);
      this.createFallbackBathroom();
    }
  }

  createFallbackBathroom() {
    // Simple room if model fails
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const walls = [
      { pos: [0, 3, -10], rot: [0, 0, 0], size: [20, 6, 0.5] }, // Back
      { pos: [0, 3, 10], rot: [0, 0, 0], size: [20, 6, 0.5] },  // Front
      { pos: [-10, 3, 0], rot: [0, Math.PI/2, 0], size: [20, 6, 0.5] }, // Left
      { pos: [10, 3, 0], rot: [0, Math.PI/2, 0], size: [20, 6, 0.5] }   // Right
    ];

    walls.forEach(w => {
      const geo = new THREE.BoxGeometry(...w.size);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(...w.pos);
      mesh.rotation.y = w.rot[1];
      this.scene.add(mesh);
      this.physics.addCollisionObject(mesh, false);
    });
  }

  startBossFight() {
    if (this.bossStarted) return;
    this.bossStarted = true;
    
    console.log("🚿 Bathroom boss fight starting...");
    this.player.enterCombat();
    
    // Define wall boundaries for the boss
    const wallBounds = {
      north: { normal: new THREE.Vector3(0, 0, -1), position: new THREE.Vector3(0, 3, -9) },
      south: { normal: new THREE.Vector3(0, 0, 1), position: new THREE.Vector3(0, 3, 9) },
      east: { normal: new THREE.Vector3(1, 0, 0), position: new THREE.Vector3(9, 3, 0) },
      west: { normal: new THREE.Vector3(-1, 0, 0), position: new THREE.Vector3(-9, 3, 0) }
    };

    this.boss = new WallCrawlerBoss(this.scene, this.player, this.hud, this.physics, wallBounds);
    this.scene.userData.boss = this.boss;
    this.scene.userData.bathroomScene = this;
    
    this.bossHealthFill = this.hud.createHealthBar("Tile Phantom", 75, "cyan");
    this.hud.showMessage("The Tile Phantom emerges from the walls! Shoot it down!");
    setTimeout(() => this.hud.showMessage(""), 3000);
  }

  updateBossHealth() {
    if (this.bossHealthFill && this.boss) {
      const healthPercent = (this.boss.health / this.boss.maxHealth) * 100;
      this.bossHealthFill.style.width = healthPercent + "%";
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
        console.log("💧 Player hit by water projectile!");
        this.scene.remove(projectile);
        this.boss.projectiles.splice(i, 1);
        this.player.takeDamage(1);
        if (this.player.health.current <= 0) return;
        
        // Blue flash for water hit
        this.showDamageFlash(0x0088ff);
      }
    }
  }

  showDamageFlash(color) {
    const flashDiv = document.createElement("div");
    flashDiv.style.position = "fixed";
    flashDiv.style.top = "0";
    flashDiv.style.left = "0";
    flashDiv.style.width = "100%";
    flashDiv.style.height = "100%";
    flashDiv.style.background = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.3)`;
    flashDiv.style.pointerEvents = "none";
    flashDiv.style.zIndex = "9999";
    document.body.appendChild(flashDiv);
    setTimeout(() => {
      if (flashDiv.parentElement) document.body.removeChild(flashDiv);
    }, 200);
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
          try { this.scene.remove(proj); } catch (e) {}
        });
        this.boss.projectiles = [];
      }
    }
    
    if (this.bossHealthFill?.parentElement) {
      try {
        this.bossHealthFill.parentElement.parentElement.removeChild(
          this.bossHealthFill.parentElement
        );
      } catch (e) {}
      this.bossHealthFill = null;
    }
    
    if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(() => this.showGameOverScreen(), 500);
  }

  showGameOverScreen() {
    const overlay = document.createElement("div");
    overlay.id = "game-over-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "10000",
      fontFamily: "Arial, sans-serif"
    });

    const title = document.createElement("h1");
    title.textContent = "GAME OVER";
    Object.assign(title.style, {
      color: "#00ccff",
      fontSize: "72px",
      marginBottom: "20px",
      textShadow: "4px 4px 8px black"
    });
    overlay.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.textContent = "The Tile Phantom was too slippery...";
    Object.assign(subtitle.style, {
      color: "white",
      fontSize: "24px",
      marginBottom: "40px"
    });
    overlay.appendChild(subtitle);

    const restartBtn = document.createElement("button");
    restartBtn.textContent = "RESTART";
    Object.assign(restartBtn.style, {
      padding: "15px 40px",
      fontSize: "24px",
      fontWeight: "bold",
      color: "white",
      background: "#00ccff",
      border: "3px solid white",
      borderRadius: "10px",
      cursor: "pointer",
      transition: "all 0.3s"
    });
    restartBtn.onmouseover = () => {
      restartBtn.style.background = "#0099cc";
      restartBtn.style.transform = "scale(1.1)";
    };
    restartBtn.onmouseout = () => {
      restartBtn.style.background = "#00ccff";
      restartBtn.style.transform = "scale(1)";
    };
    restartBtn.onclick = () => this.restartGame();
    overlay.appendChild(restartBtn);
    document.body.appendChild(overlay);
  }

  restartGame() {
    console.log("Restarting bathroom fight...");
    const overlay = document.getElementById("game-over-overlay");
    if (overlay) document.body.removeChild(overlay);
    
    this.gameOver = false;
    if (this.boss?.mesh) this.scene.remove(this.boss.mesh);
    
    this.player.health.current = this.player.health.max;
    this.player._isDead = false;
    if (this.player.hud) {
      this.player.hud.updatePlayerHearts(this.player.health.current, this.player.health.max);
    }
    
    this.bossStarted = false;
    this.startBossFight();
  }

  showHitMarker() {
    if (this.gameOver) return;
    const marker = document.createElement("div");
    Object.assign(marker.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      color: "#00ffff",
      fontSize: "48px",
      fontWeight: "bold",
      textShadow: "2px 2px 4px black",
      pointerEvents: "none",
      zIndex: "9998"
    });
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

    // Flickering light effect
    if (this.flickerLight) {
      this.flickerLight.intensity = 0.6 + Math.random() * 0.4;
    }

    if (this.boss && this.boss.isAlive && !this.gameOver) {
      this.boss.update(delta, time);
      this.updateBossHealth();
      if (this.boss.projectiles?.length > 0) {
        this.checkPlayerHit();
      }
    } else if (this.boss && !this.boss.isAlive && this.boss.defeated && !this.gameOver) {
      this.handleBossDefeat();
    }

    this.renderer.render(this.scene, this.camera);
  }

  update() {
    this.updateWithCameraRotation(0, 0);
  }

  async handleBossDefeat() {
    if (this.boss.defeatedHandled) return;
    this.boss.defeatedHandled = true;

    this.hud.showMessage("🎉 Victory! The Tile Phantom has been defeated!");
    this.player.exitCombat();

    if (this.bossHealthFill?.parentElement) {
      try {
        this.bossHealthFill.parentElement.parentElement.removeChild(
          this.bossHealthFill.parentElement
        );
      } catch (e) {}
      this.bossHealthFill = null;
    }

    setTimeout(() => {
      this.hud.showMessage("The bathroom is now clear... But what lies ahead?");
      setTimeout(() => {
        this.hud.showMessage("");
        // Transition to next level
        if (window.transitionToNextLevel) {
          window.transitionToNextLevel();
        }
      }, 3000);
    }, 2000);
  }

  getCameraSnapRotation() {
    return null;
  }

  getInitialCameraRotation() {
    return this.initialCameraRotation;
  }
}