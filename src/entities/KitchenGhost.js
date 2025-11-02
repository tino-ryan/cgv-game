// src/entities/kitchenGhost.js - STANDALONE VERSION
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * KitchenGhost - Standalone boss for kitchen scene
 * - Shoots ONLY fireballs
 * - Spawns from oven with pop-out animation
 * - Teleports every 7 seconds
 * - 200 HP, chases at 50% health
 */
export default class KitchenGhost {
  constructor(scene, player, hud, physics, spawnPosition, opts = {}) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;
    this.physics = physics;
    this.debug = opts.debug || false;

    // Health system
    this.health = 200;
    this.maxHealth = 200;
    this.isAlive = true;
    this.defeated = false;
    this.defeatedHandled = false;

    // Projectile system
    this.projectiles = [];
    this.shootCooldown = 0;
    this.shootInterval = 2.0; // Shoot every 2 seconds

    // Chase mechanics
    this.isChasing = false;
    this.chaseSpeed = 0.06;
    this.minDistance = 4;
    this.chaseMessageShown = false;

    // Spawn configuration
    this.ovenPos = spawnPosition || new THREE.Vector3(0, 0, -5);
    this.isSpawning = true;
    this.spawnTime = 0;
    this.spawnDuration = 1.5;

    // Teleport settings
    this.teleportTimer = 0;
    this.teleportInterval = 7;
    this.teleportRadius = 7;
    this.teleportHeight = 0.5;

    // Visual elements
    this.mesh = null;
    this.spatulas = [];
    this.gltfLoader = new GLTFLoader();
    this.modelLoaded = false;

    console.log("🔥 KitchenGhost initializing at", this.ovenPos);

    // Load model or create fallback
    this.loadBossModel();
  }

  /**
   * Load chef ghost model
   */
  loadBossModel() {
    const modelPath = "/assets/models/ghostbodychef.glb"; // Use a chef model if you have one

    this.gltfLoader.load(
      modelPath,
      (gltf) => {
        this.mesh = gltf.scene;
        this.modelLoaded = true;

        // Scale and position
        this.mesh.scale.set(1.5, 1.5, 1.5);
        this.mesh.position.copy(this.ovenPos);
        this.mesh.rotation.y = 0;

        // Setup for raycasting
        this.mesh.userData.isBoss = true;
        this.mesh.userData.isKitchenGhost = true;
        this.mesh.traverse((child) => {
          if (child.isMesh) {
            child.userData.isBoss = true;
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
            
            if (child.geometry) {
              try {
                if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
                if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
              } catch (e) {}
            }
          }
        });

        this.scene.add(this.mesh);
        this.setupSpatulas();
        console.log("✅ Kitchen Ghost model loaded!");
      },
      (xhr) => {
        if (this.debug) {
          console.log(`Kitchen Ghost: ${(xhr.loaded / xhr.total) * 100}% loaded`);
        }
      },
      (error) => {
        console.warn("Chef ghost model not found, using fallback:", error);
        this.createFallbackBoss();
      }
    );
  }

  /**
   * Create fallback chef ghost visual
   */
  createFallbackBoss() {
    console.log("Creating fallback Kitchen Ghost...");

    // Ghost body
    const bodyGeo = new THREE.CylinderGeometry(0.8, 1.2, 2.5, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      emissive: 0xff6600,
      emissiveIntensity: 0.4,
    });
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.position.copy(this.ovenPos);

    // Chef hat
    const hatGeo = new THREE.CylinderGeometry(0.4, 0.8, 1.2, 16);
    const hat = new THREE.Mesh(hatGeo, bodyMat);
    hat.position.y = 1.8;
    this.mesh.add(hat);

    // Red glowing eyes
    const eyeGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1.2,
    });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.35, 0.5, 1.0);
    this.mesh.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.35, 0.5, 1.0);
    this.mesh.add(rightEye);

    // Angry mouth
    const mouthCurve = new THREE.EllipseCurve(0, 0, 0.4, 0.2, Math.PI, Math.PI * 2, false, 0);
    const mouthPoints = mouthCurve.getPoints(20);
    const mouthGeo = new THREE.BufferGeometry().setFromPoints(mouthPoints);
    const mouthMat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
    const mouth = new THREE.Line(mouthGeo, mouthMat);
    mouth.position.set(0, 0, 1.05);
    mouth.rotation.x = Math.PI / 2;
    this.mesh.add(mouth);

    // Setup for raycasting
    this.mesh.userData.isBoss = true;
    this.mesh.userData.isKitchenGhost = true;
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.userData.isBoss = true;
        child.frustumCulled = false;
        if (child.geometry) {
          try {
            if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
            if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          } catch (e) {}
        }
      }
    });

    this.scene.add(this.mesh);
    this.setupSpatulas();
    this.modelLoaded = true;
    console.log("✅ Fallback Kitchen Ghost created!");
  }

  /**
   * Create floating spatulas around boss
   */
  setupSpatulas() {
    if (!this.mesh) return;

    const spatulaGeo = new THREE.BoxGeometry(0.15, 0.8, 0.05);
    const spatulaMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3,
    });
    
    for (let i = 0; i < 3; i++) {
      const spatula = new THREE.Mesh(spatulaGeo, spatulaMat);
      const angle = (i / 3) * Math.PI * 2;
      spatula.position.set(Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5);
      spatula.userData.orbitAngle = angle;
      this.mesh.add(spatula);
      this.spatulas.push(spatula);
    }
  }

  /**
   * Shoot fireballs at player
   */
  shoot() {
    if (!this.player?.ghost || !this.isAlive || !this.mesh) return;

    // Get boss's WORLD position
    const bossWorldPos = new THREE.Vector3();
    this.mesh.getWorldPosition(bossWorldPos);

    // Create fireball outer sphere
    const outerGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff4400,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.9,
    });
    const projectile = new THREE.Mesh(outerGeo, outerMat);
    
    // Inner flame glow
    const innerGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8,
    });
    const innerFlame = new THREE.Mesh(innerGeo, innerMat);
    projectile.add(innerFlame);

    // Spawn position - in front of boss at chest height
    const toPlayer = new THREE.Vector3()
      .subVectors(this.player.ghost.position, bossWorldPos)
      .normalize();
    
    projectile.position.copy(bossWorldPos);
    projectile.position.y += 0.5; // Chest height
    projectile.position.add(toPlayer.multiplyScalar(1.5)); // In front of boss

    // Calculate velocity toward player
    const targetPos = this.player.ghost.position.clone();
    const direction = new THREE.Vector3()
      .subVectors(targetPos, projectile.position)
      .normalize();
    
    projectile.userData.velocity = direction.multiplyScalar(0.25);

    // Add rotation for visual effect
    projectile.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.15,
      y: (Math.random() - 0.5) * 0.15,
      z: (Math.random() - 0.5) * 0.15,
    };

    // Mark as projectile
    projectile.userData.isProjectile = true;
    projectile.userData.age = 0;
    projectile.userData.maxAge = 10;

    // Add to scene and tracking
    this.projectiles.push(projectile);
    this.scene.add(projectile);

    if (this.debug) {
      console.log("🔥 Fireball shot from:", projectile.position);
    }
  }

  /**
   * Take damage from player
   */
  takeDamage(amount) {
    if (!this.isAlive) return;
    
    this.health = Math.max(0, this.health - amount);
    console.log(`🔥 Kitchen Ghost took ${amount} damage! Health: ${this.health}/${this.maxHealth}`);

    // Flash effect
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalColor = child.material.color.clone();
          child.material.color.setHex(0xff0000);
          setTimeout(() => {
            if (child.material) {
              child.material.color.copy(originalColor);
            }
          }, 150);
        }
      });

      // Shake
      const originalPos = this.mesh.position.clone();
      const shakeAmount = 0.15;
      this.mesh.position.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * shakeAmount,
          (Math.random() - 0.5) * shakeAmount,
          (Math.random() - 0.5) * shakeAmount
        )
      );
      setTimeout(() => {
        if (this.mesh) {
          this.mesh.position.copy(originalPos);
        }
      }, 150);
    }

    // Start chasing at 50% health
    if (this.health < this.maxHealth * 0.5 && !this.isChasing) {
      this.isChasing = true;
      console.log("⚠️ Kitchen Ghost is now chasing!");
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Death sequence
   */
  die() {
    if (!this.isAlive) return;
    
    this.isAlive = false;
    this.defeated = true;
    console.log("🔥 Kitchen Ghost defeated!");

    // Store position for explosion
    const explosionPos = new THREE.Vector3();
    if (this.mesh) {
      this.mesh.getWorldPosition(explosionPos);
    }

    // Fade out
    if (this.mesh) {
      let opacity = 1;
      const fadeOut = setInterval(() => {
        opacity -= 0.03;
        this.mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = Math.max(0, opacity);
          }
        });
        
        if (opacity <= 0) {
          clearInterval(fadeOut);
          this.scene.remove(this.mesh);
          this.projectiles.forEach(p => {
            try { this.scene.remove(p); } catch (e) {}
          });
          this.projectiles = [];
        }
      }, 40);
    }

    // Fire explosion
    this.createFireExplosion(explosionPos);
  }

  /**
   * Create fire particle explosion
   */
  createFireExplosion(position) {
    for (let i = 0; i < 50; i++) {
      const particleGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const particleMat = new THREE.MeshBasicMaterial({
        color: i % 2 ? 0xff6600 : 0xffaa00,
      });
      
      const particle = new THREE.Mesh(particleGeo, particleMat);
      particle.position.copy(position);
      
      // Random velocity
      const speed = 0.08 + Math.random() * 0.12;
      const angle = (i / 50) * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
      
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      
      this.scene.add(particle);

      // Animate
      const animate = () => {
        if (!particle.parent) return;
        
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.y -= 0.006; // Gravity
        particle.scale.multiplyScalar(0.94); // Shrink
        
        if (particle.scale.x > 0.05) {
          requestAnimationFrame(animate);
        } else {
          this.scene.remove(particle);
        }
      };
      
      animate();
    }
  }

  /**
   * Oven spawn animation
   */
  updateSpawn(delta) {
    if (!this.isSpawning || !this.mesh) return;
    
    this.spawnTime += delta;
    const progress = Math.min(this.spawnTime / this.spawnDuration, 1);
    
    // Lerp position upward
    this.mesh.position.y = THREE.MathUtils.lerp(
      this.ovenPos.y,
      this.ovenPos.y + 0.5,
      progress
    );
    
    // Scale up
    this.mesh.scale.setScalar(THREE.MathUtils.lerp(0.1, 1.5, progress));

    if (progress >= 1) {
      this.isSpawning = false;
      this.mesh.position.y = this.ovenPos.y + 0.5;
      console.log("🔥 Kitchen Ghost spawn complete!");
    }
  }

  /**
   * Teleport to random position
   */
  tryTeleport() {
    if (!this.mesh) return;

    const maxAttempts = 20;
    
    for (let i = 0; i < maxAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.teleportRadius;
      
      const candidate = new THREE.Vector3(
        this.ovenPos.x + Math.cos(angle) * distance,
        this.ovenPos.y + this.teleportHeight,
        this.ovenPos.z + Math.sin(angle) * distance
      );

      // Check if position is safe
      const isSafe = this.physics?.isPositionSafe?.(
        candidate,
        new THREE.Vector3(1, 2, 1)
      ) ?? true;

      if (isSafe) {
        this.mesh.position.copy(candidate);
        
        // Fade-in effect
        const originalOpacity = this.mesh.material?.opacity ?? 0.75;
        if (this.mesh.material) {
          this.mesh.material.opacity = 0.3;
        }
        
        const fadeInterval = setInterval(() => {
          if (this.mesh?.material) {
            this.mesh.material.opacity = Math.min(
              this.mesh.material.opacity + 0.1,
              originalOpacity
            );
            
            if (this.mesh.material.opacity >= originalOpacity) {
              clearInterval(fadeInterval);
            }
          } else {
            clearInterval(fadeInterval);
          }
        }, 50);
        
        if (this.debug) {
          console.log("🔥 Teleported to:", candidate);
        }
        break;
      }
    }
  }

  /**
   * Update chase behavior
   */
  updateChase(delta) {
    if (!this.isChasing || !this.mesh || !this.player?.ghost) return;

    const playerPos = this.player.ghost.position.clone();
    const bossPos = this.mesh.position.clone();
    bossPos.y = 0;
    playerPos.y = 0;

    const distance = bossPos.distanceTo(playerPos);
    const direction = new THREE.Vector3()
      .subVectors(playerPos, bossPos)
      .normalize();

    if (distance > this.minDistance) {
      const moveVector = direction.clone();
      const currentPos = new THREE.Vector3(
        this.mesh.position.x,
        0,
        this.mesh.position.z
      );

      const safeMovement = this.physics
        ? this.physics.getSafeMovement(currentPos, moveVector, this.chaseSpeed)
        : moveVector.multiplyScalar(this.chaseSpeed);

      this.mesh.position.x += safeMovement.x;
      this.mesh.position.z += safeMovement.z;
    }
  }

  /**
   * Main update loop
   */
  update(delta, time) {
    if (!this.mesh) return;

    // Handle spawn animation
    if (this.isSpawning) {
      this.updateSpawn(delta);
      return; // Don't do anything else during spawn
    }

    if (!this.isAlive) return;

    // Hover animation
    this.mesh.position.y = (this.ovenPos.y + 0.5) + Math.sin(time * 2) * 0.2;

    // Face player
    if (this.player?.ghost) {
      const playerPos = this.player.ghost.position.clone();
      this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
    }

    // Animate spatulas
    if (this.spatulas.length > 0) {
      this.spatulas.forEach((spatula) => {
        spatula.userData.orbitAngle += delta * 2.5;
        const angle = spatula.userData.orbitAngle;
        spatula.position.x = Math.cos(angle) * 1.5;
        spatula.position.z = Math.sin(angle) * 1.5;
        spatula.rotation.y += delta * 6;
      });
    }

    // Teleport logic
    this.teleportTimer += delta;
    if (this.teleportTimer >= this.teleportInterval) {
      this.teleportTimer = 0;
      this.tryTeleport();
    }

    // Chase logic
    this.updateChase(delta);

    // Shooting
    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      // Move
      if (proj.userData.velocity) {
        proj.position.add(proj.userData.velocity);
      }

      // Rotate
      if (proj.userData.rotationSpeed) {
        proj.rotation.x += proj.userData.rotationSpeed.x;
        proj.rotation.y += proj.userData.rotationSpeed.y;
        proj.rotation.z += proj.userData.rotationSpeed.z;
      }

      // Pulse inner flame
      if (proj.children.length > 0) {
        const scale = 1 + Math.sin(time * 10) * 0.2;
        proj.children[0].scale.setScalar(scale);
      }

      // Age management
      proj.userData.age = (proj.userData.age || 0) + delta;
      if (proj.userData.age > proj.userData.maxAge) {
        try { this.scene.remove(proj); } catch (e) {}
        this.projectiles.splice(i, 1);
        continue;
      }

      // Remove if too far
      if (proj.position.distanceTo(this.mesh.position) > 100) {
        try { this.scene.remove(proj); } catch (e) {}
        this.projectiles.splice(i, 1);
      }
    }
  }
}