import * as THREE from "three";

export default class BellboyBoss {
  constructor(scene, player, hud, opts = {}) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;

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
    this.chaseSpeed = 0.05; // Movement speed when chasing
    this.minDistance = 5; // Don't get closer than this
    this.chaseMessageShown = false;

    this.debug = opts.debug || false;

    this.createBoss();
  }

  createBoss() {
    // Boss body
    const geometry = new THREE.BoxGeometry(2, 3, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B0000,
      emissive: 0x8B0000,
      emissiveIntensity: 0.3,
    });

    this.mesh = new THREE.Mesh(geometry, material);

    // Position boss in front of player (if available)
    if (this.player && this.player.ghost) {
      const playerPos = this.player.ghost.position.clone();
      this.mesh.position.set(playerPos.x, 1.5, playerPos.z - 10);
    } else {
      this.mesh.position.set(0, 1.5, -10);
    }

    // Add eyes as children (so raycast needs to consider children)
    const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1,
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.4, 0.5, 1.1);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.4, 0.5, 1.1);
    this.mesh.add(rightEye);

    // Make raycasting reliable: compute bounds for any child mesh
    this.mesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        try {
          if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        } catch (e) {
          // ignore geometry compute errors in case geometry is missing or nonstandard
        }
        // Avoid frustum culling surprises
        child.frustumCulled = false;
      }
    });
    // Also for top-level mesh
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

    const projectileGeometry = new THREE.SphereGeometry(0.25, 12, 12);
    const projectileMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1,
    });

    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(this.mesh.position);

    // Direction to player's ghost (world positions)
    const targetPos = this.player.ghost.position.clone();
    const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
    projectile.userData.velocity = dir.multiplyScalar(0.25);

    this.projectiles.push(projectile);
    this.scene.add(projectile);

    // small lifetime guard
    projectile.userData.age = 0;
    projectile.userData.maxAge = 10; // seconds

    // console log only in debug
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
        this.projectiles.forEach(p => {
          try { this.scene.remove(p); } catch (e) {}
        });
        this.projectiles = [];
        if (this._debugBox) {
          try { this.scene.remove(this._debugBox); } catch (e) {}
        }
      }
    }, 40);
  }

  update(delta, time) {
    if (!this.isAlive) {
      // optionally update projectiles even if boss dead (they might still fly)
    }

    if (this.mesh) {
      // Hovering animation
      this.mesh.position.y = 1.5 + Math.sin(time * 2) * 0.3;
      
      // Chase player if health is below 50%
      if (this.isChasing && this.player && this.player.ghost) {
        const playerPos = this.player.ghost.position.clone();
        const bossPos = this.mesh.position.clone();
        bossPos.y = playerPos.y; // Ignore Y for distance calculation
        playerPos.y = 0;
        bossPos.y = 0;
        const distance = bossPos.distanceTo(playerPos);
        
        // Calculate direction to player (only on XZ plane)
        const direction = new THREE.Vector3()
          .subVectors(this.player.ghost.position, this.mesh.position)
          .normalize();
        direction.y = 0; // Keep movement on ground plane
        
        // Only move if not within minimum distance
        if (distance > this.minDistance) {
          // Move towards player
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
        // Normal rotation when not chasing
        this.mesh.rotation.y += 0.01;
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
        try { this.scene.remove(proj); } catch (e) {}
        this.projectiles.splice(i, 1);
        continue;
      }
      // remove if far from boss origin to avoid leaks
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