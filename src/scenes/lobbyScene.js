// src/scene/lobbyscene.js
import * as THREE from "three";
import Player from "../entities/player.js";
import Tutorial from "../systems/tutorial.js";
import BellboyBoss from "../entities/bellboyBoss.js";
import HUD from "../ui/hud.js";

export default class LobbyScene {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Add floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const grassTexture = new THREE.TextureLoader().load('/assets/textures/grass.jpg');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      map: grassTexture,
      side: THREE.DoubleSide 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(ambient, dirLight);

    // ✅ Use HUD class
    this.hud = new HUD();

    // ✅ Player (with HUD support)
    this.player = new Player(this.scene, this.camera, this.hud);
    this.player.loadGhost("/public/assets/models/scene.gltf");
    this.player.loadGun("/public/assets/models/gun.glb");

    // ✅ Set global reference so player can call handlePlayerDefeat
    window.lobbyScene = this;

    // ✅ Tutorial (with HUD + Player)
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

  startBossFight() {
    console.log("⚔️ Boss fight starting...");
    
    // Keep player in combat mode
    this.player.enterCombat();
    
    // Spawn the boss
    this.boss = new BellboyBoss(this.scene, this.player, this.hud);
    
    // Store boss reference in scene for player to access
    this.scene.userData.boss = this.boss;
    this.scene.userData.lobbyScene = this;

    // ✅ Create ONLY boss health bar (removed player health bar)
    this.bossHealthFill = this.hud.createHealthBar("Bellboy Ghost", 50, "red");
    
    console.log("Boss health bar created:", this.bossHealthFill);

    // Show boss introduction message
    this.hud.showMessage("⚠️ The Bellboy Ghost has appeared! Defeat him!");
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
        this.hud.showMessage("⚠️ The boss is now chasing you! Keep your distance!");
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
        const flashDiv = document.createElement('div');
        flashDiv.style.position = 'fixed';
        flashDiv.style.top = '0';
        flashDiv.style.left = '0';
        flashDiv.style.width = '100%';
        flashDiv.style.height = '100%';
        flashDiv.style.background = 'rgba(255, 0, 0, 0.3)';
        flashDiv.style.pointerEvents = 'none';
        flashDiv.style.zIndex = '9999';
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
        this.boss.projectiles.forEach(proj => {
          try { this.scene.remove(proj); } catch(e) {}
        });
        this.boss.projectiles = [];
      }
    }
    
    // Clean up boss health bar immediately
    if (this.bossHealthFill && this.bossHealthFill.parentElement) {
      try {
        this.bossHealthFill.parentElement.parentElement.removeChild(this.bossHealthFill.parentElement);
      } catch(e) {
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
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    overlay.style.fontFamily = 'Arial, sans-serif';
    
    // Game Over text
    const title = document.createElement('h1');
    title.textContent = 'GAME OVER';
    title.style.color = '#ff0000';
    title.style.fontSize = '72px';
    title.style.marginBottom = '20px';
    title.style.textShadow = '4px 4px 8px black';
    overlay.appendChild(title);
    
    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'The Bellboy Ghost was too powerful...';
    subtitle.style.color = 'white';
    subtitle.style.fontSize = '24px';
    subtitle.style.marginBottom = '40px';
    overlay.appendChild(subtitle);
    
    // Restart button
    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'RESTART';
    restartBtn.style.padding = '15px 40px';
    restartBtn.style.fontSize = '24px';
    restartBtn.style.fontWeight = 'bold';
    restartBtn.style.color = 'white';
    restartBtn.style.background = '#ff0000';
    restartBtn.style.border = '3px solid white';
    restartBtn.style.borderRadius = '10px';
    restartBtn.style.cursor = 'pointer';
    restartBtn.style.transition = 'all 0.3s';
    
    restartBtn.onmouseover = () => {
      restartBtn.style.background = '#cc0000';
      restartBtn.style.transform = 'scale(1.1)';
    };
    
    restartBtn.onmouseout = () => {
      restartBtn.style.background = '#ff0000';
      restartBtn.style.transform = 'scale(1)';
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
    const overlay = document.getElementById('game-over-overlay');
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
      this.player.hud.updatePlayerHearts(this.player.health.current, this.player.health.max);
    }
    
    // Restart the boss fight
    this.startBossFight();
  }

  showHitMarker() {
    // Don't show hit marker if game is over
    if (this.gameOver) return;
    
    // Create hit marker (X in center of screen)
    const marker = document.createElement('div');
    marker.style.position = 'fixed';
    marker.style.top = '50%';
    marker.style.left = '50%';
    marker.style.transform = 'translate(-50%, -50%)';
    marker.style.color = '#ff0000';
    marker.style.fontSize = '48px';
    marker.style.fontWeight = 'bold';
    marker.style.textShadow = '2px 2px 4px black';
    marker.style.pointerEvents = 'none';
    marker.style.zIndex = '9998';
    marker.textContent = 'X';
    document.body.appendChild(marker);
    
    // Fade out and remove
    setTimeout(() => {
      marker.style.transition = 'opacity 0.3s';
      marker.style.opacity = '0';
      setTimeout(() => {
        if (marker.parentElement) {
          document.body.removeChild(marker);
        }
      }, 300);
    }, 100);
  }

  update() {
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
      // Get current camera rotation from camera object
      const yaw = this.camera.rotation.y;
      const pitch = this.camera.rotation.x;
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
    } else if (this.boss && !this.boss.isAlive && this.boss.defeated && !this.gameOver) {
      // Check if boss is defeated (only if player is alive)
      this.handleBossDefeat();
    }

    this.renderer.render(this.scene, this.camera);
  }

  handleBossDefeat() {
    if (this.boss.defeatedHandled) return;
    this.boss.defeatedHandled = true;

    this.hud.showMessage("🎉 Victory! The Bellboy Ghost has been defeated!");
    this.player.exitCombat();

    // Clean up boss health bar only (no player health bar anymore)
    if (this.bossHealthFill && this.bossHealthFill.parentElement) {
      try {
        this.bossHealthFill.parentElement.parentElement.removeChild(this.bossHealthFill.parentElement);
      } catch(e) {
        console.error("Error cleaning up boss health bar:", e);
      }
      this.bossHealthFill = null;
    }

    setTimeout(() => {
      this.hud.showMessage("Welcome to the Cozy Ghost Hotel. Your adventure begins...");
    }, 3000);
  }
}