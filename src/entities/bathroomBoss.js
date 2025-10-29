import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class BathroomBoss {
  constructor(scene, player, hud, physicsOrOpts = {}) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;

    // Handle both physics system and options object
    if (physicsOrOpts && physicsOrOpts.addCollisionObject) {
      this.physics = physicsOrOpts;
      this.debug = false;
    } else {
      this.physics = physicsOrOpts.physics || null;
      this.debug = physicsOrOpts.debug || false;
    }

    this.health = 80;
    this.maxHealth = 80;
    this.isAlive = true;
    this.defeated = false;
    this.defeatedHandled = false;

    this.projectiles = [];
    this.shootCooldown = 0;
    this.shootInterval = 1.5; // Faster shooting than bellboy
    

    // Movement mechanics - moves along the wall
    this.isMoving = true;
    this.moveSpeed = 0.03;
    this.movementBounds = {
      minX: 3,    // Right wall position
      maxX: 8,
      minY: 0.2,  // Lower bounds to avoid floor
      maxY: 2.5,  // Lower max to avoid ceiling
      z: 8        // Fixed Z position along the wall
    };
    this.movementDirection = new THREE.Vector3(0, 1, 0); // Start moving up

    // Eyes glow effect
    this.eyeGlowIntensity = 2.0;
    this.eyePulseSpeed = 3.0;

    this.gltfLoader = new GLTFLoader();
    this.bossModel = null;
    this.modelLoaded = false;

    // Load the evil goatee model
    this.loadBossModel();
  }

  loadBossModel() {
    const modelPath = '/assets/models/evilgoatee.glb';

    this.gltfLoader.load(
      modelPath,
      (gltf) => {
        this.bossModel = gltf.scene;
        this.modelLoaded = true;

        // Scale and position the model - LOWERED TO AVOID CEILING
        this.bossModel.scale.set(0.8, 0.8, 0.8); // Smaller scale
        this.bossModel.position.set(8, 0.5, this.movementBounds.z); // Much lower Y position

        // Store the model's base rotation offset (adjust this value as needed)
        this.modelRotationOffset = -Math.PI / 2; // 90 degrees - adjust if model still faces wrong way
        this.bossModel.rotation.y = this.modelRotationOffset;


        // Face the player initially (assuming player is at origin)
        //this.bossModel.lookAt(0, this.bossModel.position.y, 0);

        // Find and enhance the eyes for glowing effect
        this.setupGlowingEyes();

        // Make the model visible in reflections and raycast-able
        this.bossModel.traverse((child) => {
          if (child.isMesh) {
            child.userData.isBoss = true;
            child.frustumCulled = false;
            if (child.geometry) {
              try {
                if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
                if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
              } catch (e) {
                // ignore geometry compute errors
              }
            }
          }
        });

        this.scene.add(this.bossModel);
        console.log("🐐 Evil Goatee Boss loaded and positioned!");
        console.log("Boss position:", this.bossModel.position);
        console.log("Boss scale:", this.bossModel.scale);

        // Debug helper
        window.debugBossPosition = () => {
          console.log("=== BOSS DEBUG INFO ===");
          console.log("Boss position:", this.bossModel.position);
          console.log("Boss scale:", this.bossModel.scale);
          const box = new THREE.Box3().setFromObject(this.bossModel);
          console.log("Boss bounding box:", box);
          console.log("Boss size:", box.getSize(new THREE.Vector3()));
          console.log("Left eye light position:", this.leftEyeLight?.position);
          console.log("Right eye light position:", this.rightEyeLight?.position);
        };
      },
      // Progress callback
      (xhr) => {
        if (this.debug) {
          console.log(`Boss model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        }
      },
      // Error callback
      (error) => {
        console.error(`Error loading boss model:`, error);
        // Fallback: create a simple mesh if model fails to load
        this.createFallbackBoss();
      }
    );
  }

  createFallbackBoss() {
    console.log("Creating fallback boss mesh...");

    // Create a simple goat-like shape
    const bodyGeometry = new THREE.CapsuleGeometry(0.8, 2, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      emissive: 0x1a1a1a,
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.8
    });

    this.bossModel = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bossModel.position.set(6, 0.5, this.movementBounds.z); // Lower fallback position too

    // Add glowing eyes
    this.setupGlowingEyes();

    this.bossModel.userData.isBoss = true;
    this.modelLoaded = true;

    this.scene.add(this.bossModel);
    console.log("🐐 Fallback boss created!");
  }

  setupGlowingEyes() {
    // First, try to find existing eye meshes in the loaded model
    let foundEyes = false;

    if (this.bossModel) {
      this.bossModel.traverse((child) => {
        if (child.isMesh && child.name &&
            (child.name.toLowerCase().includes('eye') ||
             child.name.toLowerCase().includes('pupil'))) {
          // Found existing eyes in the model
          child.material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: this.eyeGlowIntensity,
            transparent: true,
            opacity: 0.9
          });
          foundEyes = true;
          console.log("👁️ Found and enhanced existing eye:", child.name);
        }
      });
    }

    // If no eyes found in model, create our own
    if (!foundEyes) {
      const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16); // Smaller eyes
      const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: this.eyeGlowIntensity,
        transparent: true,
        opacity: 0.9
      });

      // Position eyes in LOCAL coordinates relative to the model
      // Since we're adding to bossModel, use local positions (0,0,0 is model center)
      this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
      this.leftEye.position.set(-0.3, 4.3, -0.5); // Left, up, forward in local space
      this.leftEye.rotation.y = Math.PI / 2;   // 90 degrees
      this.bossModel.add(this.leftEye);

      this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
      this.rightEye.position.set(-0.3, 4.3, 0.5); // Right, up, forward in local space
      this.rightEye.rotation.y = Math.PI / 2;
      this.bossModel.add(this.rightEye);

      console.log("👁️ Created new glowing eyes for boss!");
    }

    // Add point lights for the glowing effect (always add these)
    this.leftEyeLight = new THREE.PointLight(0xff0000, 1.5, 8);
    this.rightEyeLight = new THREE.PointLight(0xff0000, 1.5, 8);

    // Position lights in LOCAL coordinates to match eye positions
    this.leftEyeLight.position.set(-0.3, 3, 0.6); // Same as left eye but slightly forward
    this.leftEyeLight.rotation.y = Math.PI / 2;
    this.rightEyeLight.position.set(0.3, 3, 0.6); // Same as right eye but slightly forward
    this.rightEyeLight.rotation.y = Math.PI / 2;

    this.bossModel.add(this.leftEyeLight);
    this.bossModel.add(this.rightEyeLight);

    console.log("👁️ Glowing red eyes and lights added to boss!");
  }

  shoot() {
    if (!this.player || !this.player.ghost || !this.isAlive || !this.bossModel) return;

    // Create dark energy projectile
    const projectileGeometry = new THREE.SphereGeometry(0.2, 12, 12);
    const projectileMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      emissive: 0x8b0000,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.8
    });

    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.userData.isProjectile = true;

    // Position at boss location
    projectile.position.copy(this.bossModel.position);
    projectile.position.add(new THREE.Vector3(0, 0, -0.5)); // Slightly in front

    // Direction to player's ghost
    const targetPos = this.player.ghost.position.clone();
    const dir = new THREE.Vector3().subVectors(targetPos, projectile.position).normalize();
    projectile.userData.velocity = dir.multiplyScalar(0.3); // Faster projectiles

    // Add rotation and pulsing effect
    projectile.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.2,
      y: (Math.random() - 0.5) * 0.2,
      z: (Math.random() - 0.5) * 0.2
    };

    // Lifetime management
    projectile.userData.age = 0;
    projectile.userData.maxAge = 8;

    this.projectiles.push(projectile);
    this.scene.add(projectile);

    if (this.debug) console.log("Bathroom boss shot dark energy!");
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.health = Math.max(0, this.health - amount);
    console.log(`Bathroom Boss took ${amount} dmg — ${this.health}/${this.maxHealth}`);

    // Flash effect when taking damage
    if (this.bossModel) {
      this.bossModel.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalColor = child.material.color.clone();
          child.material.color.setHex(0xffffff);
          setTimeout(() => {
            child.material.color.copy(originalColor);
          }, 100);
        }
      });
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.defeated = true;
    console.log("Bathroom Boss defeated!");

    // Dramatic death effect
    if (this.bossModel) {
      // Fade out and remove boss
      let opacity = 1;
      const fadeOut = setInterval(() => {
        opacity -= 0.02;
        this.bossModel.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = Math.max(0, opacity);
          }
        });

        if (opacity <= 0) {
          clearInterval(fadeOut);
          this.scene.remove(this.bossModel);
          // Remove projectiles
          this.projectiles.forEach(p => {
            try { this.scene.remove(p); } catch (e) {}
          });
          this.projectiles = [];
        }
      }, 50);
    }
  }

  updateMovement(delta) {
    if (!this.bossModel || !this.isAlive) return;

    // Move along the wall in a pattern
    const newPosition = this.bossModel.position.clone();
    newPosition.add(this.movementDirection.clone().multiplyScalar(this.moveSpeed));

    // Check bounds and change direction
    if (newPosition.y >= this.movementBounds.maxY || newPosition.y <= this.movementBounds.minY) {
      this.movementDirection.y *= -1; // Reverse Y direction
      this.movementDirection.x = (Math.random() - 0.5) * 0.5; // Add some X variation
    }

    if (newPosition.x >= this.movementBounds.maxX || newPosition.x <= this.movementBounds.minX) {
      this.movementDirection.x *= -1; // Reverse X direction
    }

    // Apply movement
    this.bossModel.position.copy(newPosition);

    // Face the player while maintaining model's correct orientation

    if (this.player && this.player.ghost) {
      const playerPos = this.player.ghost.position;
      const bossPos = this.bossModel.position;
      // Calculate angle to player
      const angleToPlayer = Math.atan2(playerPos.x - bossPos.x, playerPos.z - bossPos.z);
      // Apply the model's rotation offset so its face points at player
      this.bossModel.rotation.y = angleToPlayer + this.modelRotationOffset;
    }
  }

  updateEyeGlow(time) {
    if (!this.leftEye || !this.rightEye) return;

    // Pulsing glow effect
    const pulseIntensity = this.eyeGlowIntensity + Math.sin(time * this.eyePulseSpeed) * 0.5;

    this.leftEye.material.emissiveIntensity = pulseIntensity;
    this.rightEye.material.emissiveIntensity = pulseIntensity;

    if (this.leftEyeLight) this.leftEyeLight.intensity = pulseIntensity * 0.5;
    if (this.rightEyeLight) this.rightEyeLight.intensity = pulseIntensity * 0.5;
  }

  update(delta, time) {
    if (!this.isAlive) return;

    // Update movement along wall
    this.updateMovement(delta);

    // Update glowing eyes
    this.updateEyeGlow(time);

    // Shooting cooldown
    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      // Move projectile
      if (proj.userData.velocity) {
        proj.position.add(proj.userData.velocity);
      }

      // Rotate projectile for visual effect
      if (proj.userData.rotationSpeed) {
        proj.rotation.x += proj.userData.rotationSpeed.x;
        proj.rotation.y += proj.userData.rotationSpeed.y;
        proj.rotation.z += proj.userData.rotationSpeed.z;
      }

      // Pulse the emissive intensity
      if (proj.material) {
        proj.material.emissiveIntensity = 1.2 + Math.sin(time * 8) * 0.3;
      }

      // Age management
      proj.userData.age = (proj.userData.age || 0) + delta;
      if (proj.userData.age > (proj.userData.maxAge || 8)) {
        try { this.scene.remove(proj); } catch (e) {}
        this.projectiles.splice(i, 1);
        continue;
      }

      // Remove if too far
      if (this.bossModel && proj.position.distanceTo(this.bossModel.position) > 100) {
        try { this.scene.remove(proj); } catch (e) {}
        this.projectiles.splice(i, 1);
      }
    }
  }
}