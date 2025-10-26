//src/entities/player.js - COMPLETE FIXED VERSION
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadAssets } from "../core/loader.js";
import { Health } from "./health.js";

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
    this.hoverHeight = 1.5;

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
      this.ghost.position.set(10, this.hoverHeight, 0);
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
    if (!this.canShoot) return;
    this.canShoot = false;

    setTimeout(() => {
      this.canShoot = true;
    }, this.shootCooldown);

    // Get gun position - FIXED to match original method
    const gunPosition = new THREE.Vector3();
    this.gun.getWorldPosition(gunPosition);

    // Get camera direction
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Setup raycaster
    this.raycaster.set(gunPosition, direction);
    this.raycaster.far = 100;

    // Collect all potential targets
    let targets = [];
    
    // Add lobby boss if it exists
    if (window.lobbyScene?.boss?.mesh) {
      targets.push(window.lobbyScene.boss.mesh);
    }
    
    // Add bathroom boss if it exists
    if (window.bathroomScene?.boss?.mesh) {
      targets.push(window.bathroomScene.boss.mesh);
    }
    
    // Add tutorial objects if in tutorial
    if (this.tutorial?.disguisedObjects) {
      targets = targets.concat(this.tutorial.disguisedObjects);
    }

    // Raycast against all targets (recursive to hit child meshes)
    const intersects = this.raycaster.intersectObjects(targets, true);

    let tracerEnd = new THREE.Vector3();
    let hitSomething = false;

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitPosition = intersects[0].point.clone();
      tracerEnd.copy(hitPosition);
      hitSomething = true;

      // Find the actual target by traversing up
      let targetObject = hit.object;
      while (targetObject.parent && !targetObject.userData.isBoss && !targetObject.userData.isEnemy && !targetObject.userData.isSuspicious) {
        targetObject = targetObject.parent;
      }

      // Handle different target types
      if (targetObject.userData.isBoss) {
        console.log("🎯 Boss hit!");
        
        // Handle lobby boss
        if (window.lobbyScene?.boss && targetObject === window.lobbyScene.boss.mesh) {
          window.lobbyScene.boss.takeDamage(10);
          if (window.lobbyScene.showHitMarker) {
            window.lobbyScene.showHitMarker();
          }
        }
        
        // Handle bathroom boss
        if (window.bathroomScene?.boss && targetObject === window.bathroomScene.boss.mesh) {
          window.bathroomScene.boss.takeDamage(10);
          if (window.bathroomScene.showHitMarker) {
            window.bathroomScene.showHitMarker();
          }
        }
      } 
      else if (targetObject.userData.isEnemy || targetObject.userData.isSuspicious) {
        console.log("💀 Tutorial object hit!");
        
        // Remove from scene
        this.scene.remove(targetObject);
        
        // Dispose of resources
        if (targetObject.geometry) targetObject.geometry.dispose();
        if (targetObject.material) targetObject.material.dispose();

        // Remove from tutorial array and notify
        if (this.tutorial) {
          const idx = this.tutorial.disguisedObjects.indexOf(targetObject);
          if (idx !== -1) {
            this.tutorial.disguisedObjects.splice(idx, 1);
          }
          this.tutorial.releaseSpirit(hitPosition);
        }
      }
    } else {
      // No hit - tracer goes far
      tracerEnd.copy(gunPosition).add(direction.clone().multiplyScalar(50));
    }

    // Create visual tracer - FIXED to match original
    const geometry = new THREE.BufferGeometry().setFromPoints([
      gunPosition.clone(),
      tracerEnd
    ]);
    
    const line = new THREE.Line(geometry, this.tracerMaterial);
    this.scene.add(line);
    
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
    }, this.tracerDuration);

    console.log("🔫 Shot fired!", hitSomething ? "HIT!" : "MISS");
  }

  takeDamage(amount = 1) {
    // Guard against damage when already dead
    if (this.health.current <= 0 || this._isDead) return;
    
    this.health.takeDamage(amount);
    console.log(`Player HP: ${this.health.current}/${this.health.max}`);
    
    // Update HUD
    if (this.hud) {
      this.hud.updatePlayerHearts(this.health.current, this.health.max);
    }
    
    // Check for death
    if (this.health.current <= 0) {
      this.health.current = 0;
      this.onDeath();
    }
  }

  onDeath() {
    // Only trigger death once
    if (this._isDead) return;
    this._isDead = true;
    
    console.log("💀 Player defeated!");
    
    // Trigger game over through appropriate scene
    if (window.lobbyScene?.handlePlayerDefeat) {
      window.lobbyScene.handlePlayerDefeat();
    } else if (window.bathroomScene?.handlePlayerDefeat) {
      window.bathroomScene.handlePlayerDefeat();
    }
  }
}