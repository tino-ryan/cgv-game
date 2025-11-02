// src/entities/kitchenGhost.js - REFINED VERSION
import * as THREE from "three";
import BellboyBoss from "./bellboyBoss.js";

/**
 * KitchenGhost - Refined boss for kitchen scene
 * - Shoots ONLY fireballs (no cleaning items)
 * - Spawns from oven with pop-out animation
 * - Teleports every 7 seconds
 * - 200 HP, chases at 50% health
 */
export default class KitchenGhost extends BellboyBoss {
  constructor(scene, player, hud, physics, spawnPosition, opts = {}) {
    // Pass options to parent
    super(scene, player, hud, physics, { ...opts, debug: opts.debug });

    // CRITICAL: Prevent parent from loading/using cleaning item models
    this.modelsLoaded = true;
    this.projectileModels = [];
    
    // Don't let parent create health bar - kitchen scene handles it
    this.skipHealthBarCreation = true;

    // Visual overrides
    this.replaceModel();

    // Spawn configuration
    this.ovenPos = spawnPosition || new THREE.Vector3(0, -2, -5);
    this.mesh.position.copy(this.ovenPos);
    this.isSpawning = true;
    this.spawnTime = 0;

    // Teleport settings
    this.teleportTimer = 0;
    this.teleportInterval = 7;
    this.teleportRadius = 8;
    this.teleportHeight = 2;

    // Effects
    this.deathExplosion = true;

    console.log("🔥 KitchenGhost initialized at", this.ovenPos);
  }

  /**
   * Replace bellboy model with chef ghost
   */
  replaceModel() {
    // Remove parent's model
    if (this.mesh && this.mesh.parent) {
      this.scene.remove(this.mesh);
    }
    if (this._debugBox && this._debugBox.parent) {
      this.scene.remove(this._debugBox);
    }

    // Create ghost body
    const bodyGeo = new THREE.CylinderGeometry(0.8, 1.2, 2.5, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      emissive: 0xff6600,
      emissiveIntensity: 0.4,
    });
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);

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

    // Floating spatulas
    const spatulaGeo = new THREE.BoxGeometry(0.15, 0.8, 0.05);
    const spatulaMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3,
    });
    
    this.spatulas = [];
    for (let i = 0; i < 3; i++) {
      const spatula = new THREE.Mesh(spatulaGeo, spatulaMat);
      const angle = (i / 3) * Math.PI * 2;
      spatula.position.set(Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5);
      spatula.userData.orbitAngle = angle;
      this.mesh.add(spatula);
      this.spatulas.push(spatula);
    }

    // Setup for raycasting
    this.mesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        try {
          if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        } catch (e) {
          // Ignore geometry errors
        }
        child.frustumCulled = false;
      }
    });
    
    this.mesh.frustumCulled = false;
    this.mesh.userData.isBoss = true;
    this.mesh.userData.isKitchenGhost = true;

    this.scene.add(this.mesh);
    
    if (this.debug) {
      const box = new THREE.BoxHelper(this.mesh, 0xffff00);
      this.scene.add(box);
      this._debugBox = box;
    }
    
    console.log("✅ Kitchen Ghost mesh created");
  }

  /**
   * OVERRIDE: Shoot only fireballs
   */
  shoot() {
    if (!this.player?.ghost || !this.isAlive || !this.mesh) return;

    // Get boss's WORLD position (critical for proper spawning)
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
    projectile.position.y += 0.5; // Chest height offset
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

    // Add to scene and tracking array
    this.projectiles.push(projectile);
    this.scene.add(projectile);

    if (this.debug) {
      console.log("🔥 Fireball shot from:", projectile.position);
    }
  }

  /**
   * Oven spawn animation
   */
  updateSpawn(delta, time) {
    if (!this.isSpawning) return;
    
    this.spawnTime += delta;
    const progress = Math.min(this.spawnTime / 1.2, 1); // 1.2 second spawn
    
    // Lerp position upward
    this.mesh.position.y = THREE.MathUtils.lerp(
      this.ovenPos.y,
      this.ovenPos.y + 2,
      progress
    );
    
    // Scale up from small
    this.mesh.scale.setScalar(THREE.MathUtils.lerp(0.1, 1, progress));

    if (progress >= 1) {
      this.isSpawning = false;
      this.mesh.position.y = this.ovenPos.y + 2;
      console.log("🔥 Kitchen Ghost spawn complete");
    }
  }

  /**
   * Teleport to random safe position
   */
  tryTeleport() {
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
        const originalOpacity = this.mesh.material.opacity;
        this.mesh.material.opacity = 0.3;
        
        const fadeInterval = setInterval(() => {
          this.mesh.material.opacity = Math.min(
            this.mesh.material.opacity + 0.1,
            originalOpacity
          );
          
          if (this.mesh.material.opacity >= originalOpacity) {
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
   * OVERRIDE: Death with fire explosion
   */
  die() {
    if (!this.isAlive) return;
    
    // Store position before parent removes mesh
    const explosionPos = new THREE.Vector3();
    if (this.mesh) {
      this.mesh.getWorldPosition(explosionPos);
    }

    // Call parent die() for fade-out and cleanup
    super.die();

    // Add fire explosion effect
    if (this.deathExplosion) {
      this.createFireExplosion(explosionPos);
    }
  }

  /**
   * Create fire particle explosion
   */
  createFireExplosion(position) {
    for (let i = 0; i < 40; i++) {
      const particleGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const particleMat = new THREE.MeshBasicMaterial({
        color: i % 2 ? 0xff6600 : 0xffaa00,
      });
      
      const particle = new THREE.Mesh(particleGeo, particleMat);
      particle.position.copy(position);
      
      // Random velocity in all directions
      const speed = 0.08 + Math.random() * 0.12;
      const angle = (i / 40) * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
      
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      
      this.scene.add(particle);

      // Animate particle
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
   * Main update loop
   */
  update(delta, time) {
    // Handle spawn animation
    if (this.isSpawning) {
      this.updateSpawn(delta, time);
    }

    // Teleport logic
    if (this.isAlive && !this.isSpawning) {
      this.teleportTimer += delta;
      
      if (this.teleportTimer >= this.teleportInterval) {
        this.teleportTimer = 0;
        this.tryTeleport();
      }
    }

    // Animate spatulas
    if (this.spatulas) {
      this.spatulas.forEach((spatula) => {
        spatula.userData.orbitAngle += delta * 2.5;
        const angle = spatula.userData.orbitAngle;
        spatula.position.x = Math.cos(angle) * 1.5;
        spatula.position.z = Math.sin(angle) * 1.5;
        spatula.rotation.y += delta * 6;
      });
    }

    // Animate fireballs
    this.projectiles.forEach((projectile) => {
      if (projectile.userData.rotationSpeed) {
        projectile.rotation.x += projectile.userData.rotationSpeed.x;
        projectile.rotation.y += projectile.userData.rotationSpeed.y;
        projectile.rotation.z += projectile.userData.rotationSpeed.z;
      }
      
      // Pulse inner flame
      if (projectile.children.length > 0) {
        const scale = 1 + Math.sin(time * 10) * 0.2;
        projectile.children[0].scale.setScalar(scale);
      }
    });

    // Call parent update for movement, shooting, projectile cleanup
    super.update(delta, time);
  }
}