// src/entities/wallCrawlerBoss.js
import * as THREE from "three";

export default class WallCrawlerBoss {
  constructor(scene, player, hud, physics, wallBounds, opts = {}) {
    this.scene = scene;
    this.player = player;
    this.hud = hud;
    this.physics = physics;
    this.wallBounds = wallBounds; // Object with wall definitions

    this.health = 75;
    this.maxHealth = 75;
    this.isAlive = true;
    this.defeated = false;
    this.defeatedHandled = false;

    this.projectiles = [];
    this.shootCooldown = 0;
    this.shootInterval = 1.5; // Shoots faster than lobby boss

    // Wall crawling mechanics
    this.currentWall = "north"; // Start on north wall
    this.wallPosition = 0; // Position along wall (0-1)
    this.crawlSpeed = 0.3; // Speed along wall
    this.crawlDirection = 1; // 1 or -1
    this.wallChangeTimer = 0;
    this.wallChangeCooldown = 4; // Change walls every 4 seconds

    this.debug = opts.debug || false;

    this.createBoss();
  }

  createBoss() {
    // Boss body - flatter to stick to wall
    const geometry = new THREE.BoxGeometry(1.5, 2, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x0044ff,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });

    this.mesh = new THREE.Mesh(geometry, material);

    // Add glowing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.5
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 0.4, 0.3);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 0.4, 0.3);
    this.mesh.add(rightEye);

    // Add "tiles" effect
    const tileGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x4444ff,
      emissiveIntensity: 0.3
    });

    for (let i = 0; i < 6; i++) {
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.5,
        0.3
      );
      this.mesh.add(tile);
    }

    // Make raycasting reliable
    this.mesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        try {
          if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        } catch (e) {}
        child.frustumCulled = false;
      }
    });

    this.mesh.frustumCulled = false;
    this.mesh.userData.isBoss = true;

    // Position on starting wall
    this.updatePositionOnWall();
    this.scene.add(this.mesh);

    if (this.debug) {
      const box = new THREE.BoxHelper(this.mesh, 0x00ffff);
      this.scene.add(box);
      this._debugBox = box;
    }

    console.log("Wall Crawler Boss spawned on", this.currentWall, "wall");
  }

  updatePositionOnWall() {
    const wall = this.wallBounds[this.currentWall];
    if (!wall) return;

    const pos = wall.position.clone();
    const normal = wall.normal.clone();

    // Calculate position along wall
    let tangent;
    if (this.currentWall === "north" || this.currentWall === "south") {
      // Move along X axis
      tangent = new THREE.Vector3(1, 0, 0);
      pos.x = (this.wallPosition - 0.5) * 16; // -8 to 8
    } else {
      // Move along Z axis
      tangent = new THREE.Vector3(0, 0, 1);
      pos.z = (this.wallPosition - 0.5) * 16;
    }

    // Add some vertical variation
    pos.y += Math.sin(this.wallPosition * Math.PI * 2) * 1.5;

    this.mesh.position.copy(pos);

    // Face outward from wall
    const lookTarget = pos.clone().add(normal.multiplyScalar(-1));
    this.mesh.lookAt(lookTarget);
  }

  changeWall() {
    const walls = Object.keys(this.wallBounds);
    const currentIndex = walls.indexOf(this.currentWall);
    
    // Pick a random different wall
    let newWall;
    do {
      newWall = walls[Math.floor(Math.random() * walls.length)];
    } while (newWall === this.currentWall);

    this.currentWall = newWall;
    this.wallPosition = Math.random(); // Random position on new wall
    this.crawlDirection = Math.random() > 0.5 ? 1 : -1;

    console.log("Boss moved to", this.currentWall, "wall");

    // Visual effect for wall change
    this.createTeleportEffect(this.mesh.position);
  }

  createTeleportEffect(position) {
    const particleCount = 30;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      this.scene.add(particle);
      particles.push(particle);
    }

    // Animate particles
    let alpha = 1;
    const animate = () => {
      alpha -= 0.05;
      particles.forEach(p => {
        p.position.add(p.userData.velocity);
        p.material.opacity = alpha;
        if (alpha <= 0) {
          this.scene.remove(p);
          p.geometry.dispose();
          p.material.dispose();
        }
      });
      if (alpha > 0) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  shoot() {
    if (!this.player || !this.player.ghost || !this.isAlive) return;

    const projectileGeometry = new THREE.SphereGeometry(0.2, 12, 12);
    const projectileMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0088ff,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.8
    });

    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(this.mesh.position);

    // Shoot at player with some prediction
    const targetPos = this.player.ghost.position.clone();
    
    // Simple prediction: aim slightly ahead if player is moving
    // (This makes it more challenging)
    
    const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
    projectile.userData.velocity = dir.multiplyScalar(0.3); // Faster than lobby projectiles

    this.projectiles.push(projectile);
    this.scene.add(projectile);

    projectile.userData.age = 0;
    projectile.userData.maxAge = 8;

    if (this.debug) console.log("Boss shot water projectile!");
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.health = Math.max(0, this.health - amount);
    console.log(`Wall Crawler took ${amount} dmg — ${this.health}/${this.maxHealth}`);
    
    // Flash effect when hit
    if (this.mesh.material) {
      const originalColor = this.mesh.material.emissive.getHex();
      this.mesh.material.emissive.setHex(0xffffff);
      setTimeout(() => {
        if (this.mesh.material) {
          this.mesh.material.emissive.setHex(originalColor);
        }
      }, 100);
    }

    // Speed up when damaged
    if (this.health < this.maxHealth * 0.5) {
      this.crawlSpeed = 0.5;
      this.shootInterval = 1.0;
    }
    
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.defeated = true;
    console.log("Wall Crawler Boss defeated!");

    // Create explosion effect
    this.createDeathEffect();

    // Fade out and remove
    let opacity = 1;
    const fadeOut = setInterval(() => {
      opacity -= 0.03;
      if (this.mesh && this.mesh.material) {
        this.mesh.material.transparent = true;
        this.mesh.material.opacity = Math.max(0, opacity);
        this.mesh.traverse(child => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = Math.max(0, opacity);
          }
        });
      }
      if (opacity <= 0) {
        clearInterval(fadeOut);
        if (this.mesh && this.scene) this.scene.remove(this.mesh);
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

  createDeathEffect() {
    const particleCount = 50;
    const particles = [];
    const position = this.mesh.position.clone();

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      particle.userData.rotationSpeed = new THREE.Vector3(
        Math.random() * 0.2,
        Math.random() * 0.2,
        Math.random() * 0.2
      );
      this.scene.add(particle);
      particles.push(particle);
    }

    let alpha = 1;
    const animate = () => {
      alpha -= 0.02;
      particles.forEach(p => {
        p.position.add(p.userData.velocity);
        p.userData.velocity.y -= 0.01; // Gravity
        p.rotation.x += p.userData.rotationSpeed.x;
        p.rotation.y += p.userData.rotationSpeed.y;
        p.rotation.z += p.userData.rotationSpeed.z;
        p.material.opacity = alpha;
        if (alpha <= 0) {
          this.scene.remove(p);
          p.geometry.dispose();
          p.material.dispose();
        }
      });
      if (alpha > 0) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  update(delta, time) {
    if (!this.isAlive) return;

    // Move along current wall
    this.wallPosition += this.crawlSpeed * delta * this.crawlDirection;

    // Bounce at wall edges
    if (this.wallPosition > 1 || this.wallPosition < 0) {
      this.crawlDirection *= -1;
      this.wallPosition = Math.max(0, Math.min(1, this.wallPosition));
    }

    // Change walls periodically
    this.wallChangeTimer += delta;
    if (this.wallChangeTimer >= this.wallChangeCooldown) {
      this.wallChangeTimer = 0;
      this.changeWall();
    }

    this.updatePositionOnWall();

    // Shooting cooldown
    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.userData.velocity) {
        proj.position.add(proj.userData.velocity);
        // Add slight downward arc
        proj.userData.velocity.y -= 0.002;
      }
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