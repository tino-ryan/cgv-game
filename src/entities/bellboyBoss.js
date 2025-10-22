import * as THREE from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class BellboyBoss {
  constructor(scene, player, hud, physics, opts = {}) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;
    this.physics = physics; // Reference to physics system

    this.health = 200;
    this.maxHealth = 200;
    this.isAlive = true;
    this.defeated = false;
    this.defeatedHandled = false;

    this.projectiles = [];
    this.shootCooldown = 0;
    this.shootInterval = 2.0; // seconds

    // Chase mechanics
    this.isChasing = false;
    this.chaseSpeed = 0.05; // Movement speed when chasing
    this.minDistance = 5; // Don't get closer than this
    this.chaseMessageShown = false;

    this.debug = opts.debug || false;

    this.loader = new GLTFLoader();

    this.baseY = -5; // starting ground height (adjust as needed)

    this.createBoss(); // async call inside
  }

  async createBoss() {
    try {
      console.log("Loading Bellboy boss model...");
      const gltf = await this.loader.loadAsync("/assets/models/evilghost.glb");

      this.mesh = gltf.scene;
      this.mesh.scale.set(2, 2, 2);
      this.mesh.position.set(19, 0, -4);
      this.mesh.rotation.y = Math.PI; // Rotate 180° so the front faces the player
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;

          // Fix weird grey lighting
          if (child.material) {
            child.material.side = THREE.FrontSide;
            child.material.needsUpdate = true;
            child.material.roughness = 0.8;
            child.material.metalness = 0.1;
          }

          // ensure bounding data exists
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
    } catch (error) {
      console.error("❌ Failed to load Bellboy Boss model:", error);
    }
  }

  shoot() {
    if (!this.player || !this.player.ghost || !this.isAlive) return;

    const projectileGeometry = new THREE.SphereGeometry(0.25, 12, 12);
    const projectileMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
    });

    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);

    // Compute spawn position (roughly head height)
    const spawnPos = this.mesh.position.clone();
    spawnPos.y = this.baseY + 7; // lift it above floor (~5 units high)
    projectile.position.copy(spawnPos);

    // Aim directly at player
    const targetPos = this.player.ghost.position.clone();
    const dir = new THREE.Vector3().subVectors(targetPos, spawnPos).normalize();

    // Set velocity toward player
    projectile.userData.velocity = dir.multiplyScalar(0.25);

    this.projectiles.push(projectile);
    this.scene.add(projectile);

    projectile.userData.age = 0;
    projectile.userData.maxAge = 10;

    if (this.debug) console.log("Boss shot projectile!");
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.health = Math.max(0, this.health - amount);
    console.log(`Boss took ${amount} dmg — ${this.health}/${this.maxHealth}`);

    // Start chasing when health drops below 50%
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

    // Fade out and remove
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
  }

  update(delta, time) {
    if (!this.isAlive) {
      // optionally update projectiles even if boss dead (they might still fly)
    }

    if (this.mesh) {
      // Hover animation
      this.mesh.position.y = this.baseY + Math.sin(time * 2) * 0.3;

      // Always face player if they exist
      if (this.player && this.player.ghost) {
        const playerPos = this.player.ghost.position.clone();
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        // Rotate 90 degrees so the model front faces player correctly
        this.mesh.rotateY(-Math.PI / 2); // adjust to -Math.PI / 2 if opposite
      }

      // Chase player if below 50% health
      if (this.isChasing && this.player && this.player.ghost) {
        const playerPos = this.player.ghost.position.clone();
        const bossPos = this.mesh.position.clone();
        bossPos.y = 0;
        playerPos.y = 0;

        const distance = bossPos.distanceTo(playerPos);
        const direction = new THREE.Vector3()
          .subVectors(playerPos, bossPos)
          .normalize();

        // Move toward player if too far
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
          // Back away if too close
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

    // shooting cooldown
    this.shootCooldown -= delta;
    if (this.isAlive && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }

    // update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.userData.velocity) {
        proj.position.add(proj.userData.velocity);
      }
      proj.userData.age = (proj.userData.age || 0) + delta;
      if (proj.userData.age > (proj.userData.maxAge || 8)) {
        try {
          this.scene.remove(proj);
        } catch (e) {}
        this.projectiles.splice(i, 1);
        continue;
      }
      // remove if far from boss origin to avoid leaks
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
