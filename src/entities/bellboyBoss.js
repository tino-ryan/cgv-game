import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class BellboyBoss {
  constructor(scene, player, hud, physics, opts = {}) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;
    this.physics = physics;

    this.health = 200;
    this.maxHealth = 200;
    this.isAlive = true;
    this.defeated = false;
    this.defeatedHandled = false;

    this.projectiles = [];
    this.shootCooldown = 0;
    this.shootInterval = 2.0;

    // Chase mechanics
    this.isChasing = false;
    this.chaseSpeed = 0.05;
    this.minDistance = 5;
    this.chaseMessageShown = false;

    this.debug = opts.debug || false;

    // GLTF Loader for projectile models
    this.loader = new GLTFLoader();
    this.projectileModels = [];
    this.modelsLoaded = false;

    // Special bell object (not thrown)
    this.bellObject = null;
    this.bellLoaded = false;

    this.baseY = -5;

    // Load all assets
    this.loadProjectileModels();
    this.loadBellObject();
    this.createBoss();
  }

  loadProjectileModels() {
    const modelPaths = [
      "./assets/models/soap.glb",
      "./assets/models/sponge.glb",
      "./assets/models/feather_duster.glb",
      "./assets/models/cc0_-_bucket_3.glb",
      "./assets/models/low-poly_bleach_bottle.glb",
    ];

    let loadedCount = 0;

    modelPaths.forEach((path, index) => {
      this.loader.load(
        path,
        (gltf) => {
          this.projectileModels.push(gltf.scene.clone());
          loadedCount++;

          console.log(
            `🧼 Loaded projectile model ${index + 1}/${
              modelPaths.length
            }: ${path}`
          );

          if (loadedCount === modelPaths.length) {
            this.modelsLoaded = true;
            console.log("✅ All cleaning item projectiles loaded!");
          }
        },
        (xhr) => {
          if (this.debug) {
            console.log(`${path}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
          }
        },
        (error) => {
          console.error(`Error loading ${path}:`, error);
          // Fallback sphere
          const fallbackGeometry = new THREE.SphereGeometry(0.25, 12, 12);
          const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
          });
          const fallbackMesh = new THREE.Mesh(
            fallbackGeometry,
            fallbackMaterial
          );
          this.projectileModels.push(fallbackMesh);
          loadedCount++;

          if (loadedCount === modelPaths.length) {
            this.modelsLoaded = true;
            console.log(
              "⚠️ All projectile models loaded (some fallbacks used)"
            );
          }
        }
      );
    });
  }

  loadBellObject() {
    const bellPath = "./assets/models/future_10_bell_of_service/scene.gltf";

    this.loader.load(
      bellPath,
      (gltf) => {
        this.bellObject = gltf.scene;
        this.bellLoaded = true;

        this.bellObject.scale.set(0.8, 0.8, 0.8);
        this.bellObject.position.set(19, 0.5, -4);

        this.bellObject.traverse((child) => {
          if (child.isMesh) {
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
      (xhr) => {
        if (this.debug) {
          console.log(`Bell: ${(xhr.loaded / xhr.total) * 100}% loaded`);
        }
      },
      (error) => {
        console.error(`Error loading bell:`, error);
      }
    );
  }

  async createBoss() {
    try {
      console.log("Loading Bellboy boss model...");
      console.log("HUD object:", this.hud);
      console.log(
        "HUD has createBossHealthBar?",
        this.hud ? typeof this.hud.createBossHealthBar : "no hud"
      );

      const gltf = await this.loader.loadAsync("./assets/models/evilghost.glb");

      this.mesh = gltf.scene;
      this.mesh.scale.set(2, 2, 2);
      this.mesh.position.set(19, 0, -4);
      this.mesh.rotation.y = Math.PI;

      this.mesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;

          if (child.material) {
            child.material.side = THREE.FrontSide;
            child.material.needsUpdate = true;
            child.material.roughness = 0.8;
            child.material.metalness = 0.1;
          }

          if (!child.geometry.boundingSphere)
            child.geometry.computeBoundingSphere();
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        }
      });

      this.mesh.userData.isBoss = true;
      this.scene.add(this.mesh);

      if (this.debug) {
        const box = new THREE.BoxHelper(this.mesh, 0xffff00);
        this.scene.add(box);
        this._debugBox = box;
      }

      console.log("✅ Bellboy Boss loaded successfully!");

      // Create boss health bar
      console.log("About to create boss health bar...");
      if (this.hud) {
        console.log("HUD exists!");
        if (this.hud.createBossHealthBar) {
          console.log("Calling createBossHealthBar...");
          this.hud.createBossHealthBar();
          console.log("Calling updateBossHealth(100)...");
          this.hud.updateBossHealth(100);
          console.log("Boss health bar should be visible now!");
        } else {
          console.error("HUD.createBossHealthBar method not found!");
        }
      } else {
        console.error("HUD is null or undefined!");
      }
    } catch (error) {
      console.error("❌ Failed to load Bellboy Boss model:", error);
    }
  }

  shoot() {
    if (!this.player || !this.player.ghost || !this.isAlive || !this.mesh)
      return;

    let projectile;

    if (this.modelsLoaded && this.projectileModels.length > 0) {
      const randomIndex = Math.floor(
        Math.random() * this.projectileModels.length
      );
      projectile = this.projectileModels[randomIndex].clone();

      const scales = [0.2, 2, 2, 2, 0.5];
      const scale = scales[randomIndex] || 0.5;
      projectile.scale.set(scale, scale, scale);

      projectile.traverse((child) => {
        if (child.isMesh) {
          child.userData.isProjectile = true;
          if (child.geometry) {
            try {
              if (!child.geometry.boundingSphere)
                child.geometry.computeBoundingSphere();
              if (!child.geometry.boundingBox)
                child.geometry.computeBoundingBox();
            } catch (e) {}
          }
        }
      });
    } else {
      const projectileGeometry = new THREE.SphereGeometry(0.25, 12, 12);
      const projectileMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2,
      });
      projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
      projectile.userData.isProjectile = true;
    }

    const spawnPos = this.mesh.position.clone();
    spawnPos.y = this.baseY + 7;
    projectile.position.copy(spawnPos);

    const targetPos = this.player.ghost.position.clone();
    const dir = new THREE.Vector3().subVectors(targetPos, spawnPos).normalize();
    projectile.userData.velocity = dir.multiplyScalar(0.25);

    // Add rotation for visual effect
    projectile.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.1,
      y: (Math.random() - 0.5) * 0.1,
      z: (Math.random() - 0.5) * 0.1,
    };

    projectile.userData.age = 0;
    projectile.userData.maxAge = 10;

    this.projectiles.push(projectile);
    this.scene.add(projectile);

    if (this.debug) console.log("Boss shot projectile!");
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.health = Math.max(0, this.health - amount);
    console.log(`Boss took ${amount} dmg — ${this.health}/${this.maxHealth}`);

    // Update HUD health bar with percentage
    if (this.hud && this.hud.updateBossHealth) {
      const healthPercent = (this.health / this.maxHealth) * 100;
      this.hud.updateBossHealth(healthPercent);
    }

    if (this.health < this.maxHealth * 0.5 && !this.isChasing) {
      this.isChasing = true;
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

    // Remove boss health bar
    if (this.hud && this.hud.removeBossHealthBar) {
      this.hud.removeBossHealthBar();
    }

    let opacity = 1;
    const fadeOut = setInterval(() => {
      opacity -= 0.03;
      if (this.mesh) {
        this.mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = Math.max(0, opacity);
          }
        });
      }
      if (opacity <= 0) {
        clearInterval(fadeOut);
        if (this.mesh && this.scene) this.scene.remove(this.mesh);
        this.projectiles.forEach((p) => {
          try {
            this.scene.remove(p);
          } catch (e) {}
        });
        this.projectiles = [];
        if (this._debugBox) {
          try {
            this.scene.remove(this._debugBox);
          } catch (e) {}
        }
      }
    }, 40);

    // Make the bell glow brighter when boss is defeated
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
      // Update projectiles even if boss is dead
    }

    if (this.mesh) {
      this.mesh.position.y = this.baseY + Math.sin(time * 2) * 0.3;

      if (this.player && this.player.ghost) {
        const playerPos = this.player.ghost.position.clone();
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        this.mesh.rotateY(-Math.PI / 2);
      }

      if (this.isChasing && this.player && this.player.ghost) {
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
            ? this.physics.getSafeMovement(
                currentPos,
                moveVector,
                this.chaseSpeed
              )
            : moveVector.multiplyScalar(this.chaseSpeed);

          this.mesh.position.x += safeMovement.x;
          this.mesh.position.z += safeMovement.z;
        } else if (distance < this.minDistance - 1) {
          const backDirection = direction.clone().multiplyScalar(-1);
          const currentPos = new THREE.Vector3(
            this.mesh.position.x,
            0,
            this.mesh.position.z
          );

          const safeMovement = this.physics
            ? this.physics.getSafeMovement(
                currentPos,
                backDirection,
                this.chaseSpeed * 0.5
              )
            : backDirection.multiplyScalar(this.chaseSpeed * 0.5);

          this.mesh.position.x += safeMovement.x;
          this.mesh.position.z += safeMovement.z;
        }
      }
    }

    // Animate the bell (hover + glow pulse)
    if (this.bellObject && this.bellLoaded) {
      this.bellObject.position.y = 0.5 + Math.sin(time * 1.5) * 0.15;
      this.bellObject.rotation.y = time * 0.3;

      if (this.isAlive) {
        const pulseIntensity = 0.3 + Math.sin(time * 2) * 0.1;
        this.bellObject.traverse((child) => {
          if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissiveIntensity = pulseIntensity;
          }
        });
      }
    }

    this.shootCooldown -= delta;
    if (this.isAlive && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      if (proj.userData.velocity) {
        proj.position.add(proj.userData.velocity);
      }

      // Rotate projectile for visual effect
      if (proj.userData.rotationSpeed) {
        proj.rotation.x += proj.userData.rotationSpeed.x;
        proj.rotation.y += proj.userData.rotationSpeed.y;
        proj.rotation.z += proj.userData.rotationSpeed.z;
      }

      proj.userData.age = (proj.userData.age || 0) + delta;
      if (proj.userData.age > (proj.userData.maxAge || 8)) {
        try {
          this.scene.remove(proj);
        } catch (e) {}
        this.projectiles.splice(i, 1);
        continue;
      }

      if (this.mesh && proj.position.distanceTo(this.mesh.position) > 200) {
        try {
          this.scene.remove(proj);
        } catch (e) {}
        this.projectiles.splice(i, 1);
      }
    }

    if (this._debugBox) {
      this._debugBox.update && this._debugBox.update();
    }
  }
}
