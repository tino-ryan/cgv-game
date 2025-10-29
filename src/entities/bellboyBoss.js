import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class BellboyBoss {
  constructor(scene, player, hud, physicsOrOpts = {}) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;

    // Handle both physics system and options object
    if (physicsOrOpts && physicsOrOpts.addCollisionObject) {
      // It's a physics system
      this.physics = physicsOrOpts;
      this.debug = false;
    } else {
      // It's an options object
      this.physics = physicsOrOpts.physics || null;
      this.debug = physicsOrOpts.debug || false;
    }

    this.health = 100;
    this.maxHealth = 100;
    this.isAlive = true;
    this.defeated = false;
    this.defeatedHandled = false;

    this.projectiles = [];
    this.shootCooldown = 0;
    this.shootInterval = 2.0; // seconds

    // Chase mechanics
    this.isChasing = false;
    this.chaseSpeed = 0.05;
    this.minDistance = 5;
    this.chaseMessageShown = false;

    // Random movement
    this.randomMovement = {
      enabled: true,
      speed: 0.02,
      changeDirectionTimer: 0,
      changeDirectionInterval: 2, // seconds
      currentDirection: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        0
      ).normalize(),
      boundaryMin: { x: -15, y: 1, z: -15 },
      boundaryMax: { x: 15, y: 4, z: -5 }
    };

    // GLTF Loader for projectile models
    this.gltfLoader = new GLTFLoader();
    this.projectileModels = [];
    this.modelsLoaded = false;
    
    // Special bell object (not thrown)
    this.bellObject = null;
    this.bellLoaded = false;

    // Load all projectile models and the bell
    this.loadProjectileModels();
    this.loadBellObject();

    this.createBoss();
  }

  loadProjectileModels() {
    // Paths relative to public folder - cleaning items theme!
    const modelPaths = [
      '/assets/models/soap.glb',
      '/assets/models/sponge.glb',
      '/assets/models/feather_duster.glb',
      '/assets/models/cc0_-_bucket_3.glb',
      '/assets/models/low-poly_bleach_bottle.glb'
    ];

    let loadedCount = 0;

    modelPaths.forEach((path, index) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          // Store the loaded model
          this.projectileModels.push(gltf.scene.clone());
          loadedCount++;

          console.log(`🧼 Loaded projectile model ${index + 1}/${modelPaths.length}: ${path}`);

          if (loadedCount === modelPaths.length) {
            this.modelsLoaded = true;
            console.log("✅ All cleaning item projectiles loaded!");
          }
        },
        // Progress callback
        (xhr) => {
          if (this.debug) {
            console.log(`${path}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
          }
        },
        // Error callback
        (error) => {
          console.error(`Error loading ${path}:`, error);
          // Fallback: create a simple sphere if model fails to load
          const fallbackGeometry = new THREE.SphereGeometry(0.25, 12, 12);
          const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
          });
          const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
          this.projectileModels.push(fallbackMesh);
          loadedCount++;

          if (loadedCount === modelPaths.length) {
            this.modelsLoaded = true;
            console.log("⚠️ All projectile models loaded (some fallbacks used)");
          }
        }
      );
    });
  }

  loadBellObject() {
    const bellPath = '/assets/models/future_10_bell_of_service/scene.gltf';
    
    this.gltfLoader.load(
      bellPath,
      (gltf) => {
        this.bellObject = gltf.scene;
        this.bellLoaded = true;
        
        // Scale the bell appropriately
        this.bellObject.scale.set(0.8, 0.8, 0.8);
        
        // Position it near the boss (or wherever you want it)
        // You can adjust this position as needed
        this.bellObject.position.set(0, 0.5, -12);
        
        // Add some glow/magic effect
        this.bellObject.traverse((child) => {
          if (child.isMesh) {
            // Make it slightly emissive for a magical look
            if (child.material) {
              child.material.emissive = new THREE.Color(0xffdd00);
              child.material.emissiveIntensity = 0.3;
            }
            child.userData.isMagicBell = true;
          }
        });
        
        this.scene.add(this.bellObject);
        console.log("🔔 Magic Bell of Service loaded!");
      },
      // Progress callback
      (xhr) => {
        if (this.debug) {
          console.log(`Bell: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        }
      },
      // Error callback
      (error) => {
        console.error(`Error loading bell:`, error);
      }
    );
  }

  createBoss() {
    // Boss body - SMALLER SIZE for better visibility
    const geometry = new THREE.BoxGeometry(1.5, 2.5, 1.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B0000,
      emissive: 0x8B0000,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.7
    });

    this.mesh = new THREE.Mesh(geometry, material);

    // Position boss in front of player (if available)
    if (this.player && this.player.ghost) {
      const playerPos = this.player.ghost.position.clone();
      this.mesh.position.set(playerPos.x, 2.0, playerPos.z - 10);
    } else {
      this.mesh.position.set(0, 2.0, -10);
    }

    // Add eyes as children - ADJUSTED SIZE
    const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1.5,
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 0.6, 0.76);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 0.6, 0.76);
    this.mesh.add(rightEye);

    // Make raycasting reliable
    this.mesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        try {
          if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        } catch (e) {
          // ignore geometry compute errors
        }
        child.frustumCulled = false;
      }
    });
    this.mesh.frustumCulled = false;
    this.mesh.userData.isBoss = true;

    this.scene.add(this.mesh);

    if (this.debug) {
      const box = new THREE.BoxHelper(this.mesh, 0xffff00);
      this.scene.add(box);
      this._debugBox = box;
    }

    console.log("Boss spawned at:", this.mesh.position);
  }

  shoot() {
    if (!this.player || !this.player.ghost || !this.isAlive) return;

    // Use loaded GLTF models if available, otherwise fallback to sphere
    let projectile;

    if (this.modelsLoaded && this.projectileModels.length > 0) {
      // Pick a random model from the loaded ones
      const randomIndex = Math.floor(Math.random() * this.projectileModels.length);
      projectile = this.projectileModels[randomIndex].clone();

      // Scale the projectile appropriately
      // Different sizes for different items (adjust as needed)
      const scales = [
        0.2,  // soap - smaller
        2,  // sponge - medium
        2,  // feather duster - bigger (it's long)
        2,  // bucket - bigger
        0.5   // bleach bottle - medium
      ];
      
      const scale = scales[randomIndex] || 0.5;
      projectile.scale.set(scale, scale, scale);

      // Make sure all children are set up for raycasting
      projectile.traverse((child) => {
        if (child.isMesh) {
          child.userData.isProjectile = true;
          if (child.geometry) {
            try {
              if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
              if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
            } catch (e) {
              // ignore
            }
          }
        }
      });
    } else {
      // Fallback: create a sphere if models aren't loaded yet
      const projectileGeometry = new THREE.SphereGeometry(0.25, 12, 12);
      const projectileMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1,
      });
      projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
      projectile.userData.isProjectile = true;
    }

    // Position at boss location
    projectile.position.copy(this.mesh.position);

    // Direction to player's ghost
    const targetPos = this.player.ghost.position.clone();
    const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
    projectile.userData.velocity = dir.multiplyScalar(0.25);

    // Add rotation for visual effect
    projectile.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.1,
      y: (Math.random() - 0.5) * 0.1,
      z: (Math.random() - 0.5) * 0.1
    };

    // Lifetime management
    projectile.userData.age = 0;
    projectile.userData.maxAge = 10;

    this.projectiles.push(projectile);
    this.scene.add(projectile);

    if (this.debug) console.log("Boss shot projectile!");
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.health = Math.max(0, this.health - amount);
    console.log(`🔥 Boss took ${amount} damage! Health: ${this.health}/${this.maxHealth} (${Math.round((this.health/this.maxHealth)*100)}%)`);

    // Flash red when hit
    if (this.mesh && this.mesh.material) {
      const originalColor = this.mesh.material.color.clone();
      this.mesh.material.color.setHex(0xff0000);
      setTimeout(() => {
        if (this.mesh && this.mesh.material) {
          this.mesh.material.color.copy(originalColor);
        }
      }, 100);
    }

    // Start chasing when health drops below 50%
    if (this.health < this.maxHealth * 0.5 && !this.isChasing) {
      this.isChasing = true;
      this.randomMovement.enabled = false; // Disable random movement when chasing
      console.log("⚠️ Boss is now chasing the player!");
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.defeated = true;
    console.log("Boss defeated!");

    // Fade out and remove boss
    let opacity = 1;
    const fadeOut = setInterval(() => {
      opacity -= 0.03;
      if (this.mesh && this.mesh.material) {
        this.mesh.material.transparent = true;
        this.mesh.material.opacity = Math.max(0, opacity);
      }
      if (opacity <= 0) {
        clearInterval(fadeOut);
        if (this.mesh && this.scene) this.scene.remove(this.mesh);
        // remove projectiles
        this.projectiles.forEach(p => {
          try { this.scene.remove(p); } catch (e) {}
        });
        this.projectiles = [];
        if (this._debugBox) {
          try { this.scene.remove(this._debugBox); } catch (e) {}
        }
      }
    }, 40);
    
    // Make the bell glow brighter when boss is defeated (magical effect)
    if (this.bellObject && this.bellLoaded) {
      this.bellObject.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.emissiveIntensity = 0.8;
        }
      });
    }
  }

  update(delta, time) {
    if (!this.isAlive) {
      // optionally update projectiles even if boss dead
    }

    if (this.mesh) {
      // Hovering animation - ADJUSTED for new size
      const baseY = 2.0;
      this.mesh.position.y = baseY + Math.sin(time * 2) * 0.3;

      // Chase player if health is below 50%
      if (this.isChasing && this.player && this.player.ghost) {
        const playerPos = this.player.ghost.position.clone();
        const bossPos = this.mesh.position.clone();
        bossPos.y = playerPos.y;
        playerPos.y = 0;
        bossPos.y = 0;
        const distance = bossPos.distanceTo(playerPos);

        // Calculate direction to player (only on XZ plane)
        const direction = new THREE.Vector3()
          .subVectors(this.player.ghost.position, this.mesh.position)
          .normalize();
        direction.y = 0;

        // Only move if not within minimum distance
        if (distance > this.minDistance) {
          this.mesh.position.x += direction.x * this.chaseSpeed;
          this.mesh.position.z += direction.z * this.chaseSpeed;

          // Face the player
          const lookPos = this.player.ghost.position.clone();
          this.mesh.lookAt(lookPos.x, this.mesh.position.y, lookPos.z);
        } else if (distance < this.minDistance - 1) {
          // Too close, back away slightly
          this.mesh.position.x -= direction.x * this.chaseSpeed * 0.5;
          this.mesh.position.z -= direction.z * this.chaseSpeed * 0.5;
        }
      } else {
        // Random movement when not chasing
        if (this.randomMovement.enabled) {
          // Update timer for direction changes
          this.randomMovement.changeDirectionTimer -= delta;

          if (this.randomMovement.changeDirectionTimer <= 0) {
            // Choose new random direction (left/right, up/down, but no forward/back movement toward player)
            this.randomMovement.currentDirection = new THREE.Vector3(
              (Math.random() - 0.5) * 2, // left/right
              (Math.random() - 0.5) * 2, // up/down
              (Math.random() - 0.5) * 0.5 // minimal forward/back
            ).normalize();

            this.randomMovement.changeDirectionTimer = this.randomMovement.changeDirectionInterval;
          }

          // Apply movement with boundary checking
          const newX = this.mesh.position.x + this.randomMovement.currentDirection.x * this.randomMovement.speed;
          const newY = baseY + this.randomMovement.currentDirection.y * this.randomMovement.speed;
          const newZ = this.mesh.position.z + this.randomMovement.currentDirection.z * this.randomMovement.speed;

          // Boundary checking
          if (newX >= this.randomMovement.boundaryMin.x && newX <= this.randomMovement.boundaryMax.x) {
            this.mesh.position.x = newX;
          } else {
            // Reverse X direction when hitting boundary
            this.randomMovement.currentDirection.x *= -1;
          }

          if (newY >= this.randomMovement.boundaryMin.y && newY <= this.randomMovement.boundaryMax.y) {
            // For Y movement, we override the hover animation temporarily
            this.mesh.position.y = newY + Math.sin(time * 2) * 0.1; // smaller hover when moving
          } else {
            // Reverse Y direction when hitting boundary
            this.randomMovement.currentDirection.y *= -1;
          }

          if (newZ >= this.randomMovement.boundaryMin.z && newZ <= this.randomMovement.boundaryMax.z) {
            this.mesh.position.z = newZ;
          } else {
            // Reverse Z direction when hitting boundary
            this.randomMovement.currentDirection.z *= -1;
          }
        }

        // Normal rotation when not chasing
        this.mesh.rotation.y += 0.01;
      }
    }
    
    // Animate the bell (hover + glow pulse)
    if (this.bellObject && this.bellLoaded) {
      // Gentle hovering
      this.bellObject.position.y = 0.5 + Math.sin(time * 1.5) * 0.15;
      
      // Gentle rotation
      this.bellObject.rotation.y = time * 0.3;
      
      // Pulse the glow if boss is alive
      if (this.isAlive) {
        const pulseIntensity = 0.3 + Math.sin(time * 2) * 0.1;
        this.bellObject.traverse((child) => {
          if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissiveIntensity = pulseIntensity;
          }
        });
      }
    }

    // shooting cooldown
    this.shootCooldown -= delta;
    if (this.isAlive && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }

    // update projectiles
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
      
      // Age management
      proj.userData.age = (proj.userData.age || 0) + delta;
      if (proj.userData.age > (proj.userData.maxAge || 8)) {
        try { this.scene.remove(proj); } catch (e) {}
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // Remove if too far
      if (this.mesh && proj.position.distanceTo(this.mesh.position) > 200) {
        try { this.scene.remove(proj); } catch (e) {}
        this.projectiles.splice(i, 1);
      }
    }

    if (this._debugBox) {
      this._debugBox.update && this._debugBox.update();
    }
  }
}
