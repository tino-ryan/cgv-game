// src/entities/kitchenGhost.js
import * as THREE from "three";
import BellboyBoss from "./bellboyBoss.js";

/**
 * KitchenGhost – a BellboyBoss that:
 *   • spawns inside the oven (pop-out animation)
 *   • shoots fire-balls (same speed / logic as bellboy)
 *   • teleports to a random safe spot every 7 s
 *   • keeps 100 HP, chase-at-50 %, death fade-out, etc.
 */
export default class KitchenGhost extends BellboyBoss {
  constructor(scene, player, hud, physics, opts = {}) {
    // BellboyBoss default values → 100 HP, 2 s shoot, 0.05 chase, …
    super(scene, player, hud, physics, { ...opts, debug: opts.debug });

    // ---- visual overrides -------------------------------------------------
    this.replaceModel();               // chef-ghost look
    this.makeFireProjectiles();        // fire-ball instead of red sphere

    // ---- spawn inside oven ------------------------------------------------
    this.ovenPos = new THREE.Vector3(0, -2, -5); // adjust to your oven centre
    this.mesh.position.copy(this.ovenPos);
    this.isSpawning = true;
    this.spawnTime = 0;

    // ---- teleport ---------------------------------------------------------
    this.teleportTimer = 0;
    this.teleportInterval = 7;         // seconds
    this.teleportRadius = 8;           // max distance from oven centre
    this.teleportHeight = 2;           // hover height after teleport

    // ---- fire-style death explosion (optional – we keep bellboy fade) ----
    this.deathExplosion = true;

    console.log("🔥 KitchenGhost ready – spawning in oven");
  }

  /* --------------------------------------------------------------------- *
   *  1. Replace the bellboy box with a chef-ghost model
   * --------------------------------------------------------------------- */
  replaceModel() {
    // remove the box that BellboyBoss created
    if (this.mesh && this.mesh.parent) this.scene.remove(this.mesh);
    if (this._debugBox && this._debugBox.parent) this.scene.remove(this._debugBox);

    // ---- body (ghost chef) ---------------------------------------------
    const bodyGeo = new THREE.CylinderGeometry(0.8, 1.2, 2.5, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      emissive: 0xff6600,
      emissiveIntensity: 0.4,
    });
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);

    // ---- chef hat -------------------------------------------------------
    const hatGeo = new THREE.CylinderGeometry(0.4, 0.8, 1.2, 16);
    const hat = new THREE.Mesh(hatGeo, bodyMat);
    hat.position.y = 1.8;
    this.mesh.add(hat);

    // ---- eyes -----------------------------------------------------------
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

    // ---- angry mouth ----------------------------------------------------
    const mouthCurve = new THREE.EllipseCurve(0, 0, 0.4, 0.2, Math.PI, Math.PI * 2, false, 0);
    const mouthGeo = new THREE.BufferGeometry().setFromPoints(mouthCurve.getPoints(20));
    const mouthMat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
    const mouth = new THREE.Line(mouthGeo, mouthMat);
    mouth.position.set(0, 0, 1.05);
    mouth.rotation.x = Math.PI / 2;
    this.mesh.add(mouth);

    // ---- floating spatulas (orbiting tools) -----------------------------
    const spatulaGeo = new THREE.BoxGeometry(0.15, 0.8, 0.05);
    const spatulaMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3,
    });
    this.spatulas = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(spatulaGeo, spatulaMat);
      const a = (i / 3) * Math.PI * 2;
      s.position.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5);
      s.userData.orbitAngle = a;
      this.mesh.add(s);
      this.spatulas.push(s);
    }

 // ---- raycast / debug ------------------------------------------------
    this.mesh.traverse((c) => {
      if (c.isMesh && c.geometry) {
        try {
          if (!c.geometry.boundingSphere) c.geometry.computeBoundingSphere();
          if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
        } catch (e) {
          // ignore geometry compute errors
        }
        c.frustumCulled = false;
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
    
    console.log("🔥 Kitchen Ghost mesh created and added to scene");
  }

  /* --------------------------------------------------------------------- *
   *  2. Fire-ball projectile – same velocity / logic as bellboy
   * --------------------------------------------------------------------- */
  makeFireProjectiles() {
    // keep the original shoot() but swap the visual
    const oldShoot = this.shoot.bind(this);
    this.shoot = () => {
      if (!this.player?.ghost || !this.isAlive) return;

      const geo = new THREE.SphereGeometry(0.3, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff4400,
        emissiveIntensity: 1.5,
      });
      const proj = new THREE.Mesh(geo, mat);
      proj.position.copy(this.mesh.position);

      // flame particle inside
      const flameGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.7,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      proj.add(flame);

      const dir = new THREE.Vector3()
        .subVectors(this.player.ghost.position, this.mesh.position)
        .normalize();
      proj.userData.velocity = dir.multiplyScalar(0.25); // same as bellboy

      this.projectiles.push(proj);
      this.scene.add(proj);
      proj.userData.age = 0;
      proj.userData.maxAge = 10;

      if (this.debug) console.log("🔥 KitchenGhost fired a fireball!");
    };
  }

  /* --------------------------------------------------------------------- *
   *  3. Oven-spawn pop-out animation
   * --------------------------------------------------------------------- */
  updateSpawn(delta, time) {
    if (!this.isSpawning) return;
    this.spawnTime += delta;
    const t = Math.min(this.spawnTime / 1.2, 1); // 1.2 s total
    this.mesh.position.y = THREE.MathUtils.lerp(this.ovenPos.y, this.ovenPos.y + 2, t);
    this.mesh.scale.setScalar(THREE.MathUtils.lerp(0.1, 1, t));

    if (t >= 1) {
      this.isSpawning = false;
      this.mesh.position.y = this.ovenPos.y + 2; // final hover height
    }
  }

  /* --------------------------------------------------------------------- *
   *  4. Teleport every 7 s to a random safe spot
   * --------------------------------------------------------------------- */
  tryTeleport() {
    const attempts = 20;
    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.teleportRadius;
      const candidate = new THREE.Vector3(
        this.ovenPos.x + Math.cos(angle) * dist,
        this.ovenPos.y + this.teleportHeight,
        this.ovenPos.z + Math.sin(angle) * dist
      );

      // use physics to guarantee no wall collision
      const safe = this.physics?.isPositionSafe?.(
        candidate,
        new THREE.Vector3(1, 2, 1) // rough AABB of the ghost
      );

      if (safe ?? true) {
        this.mesh.position.copy(candidate);
        // quick fade-in effect
        this.mesh.material.opacity = 0.3;
        const fade = setInterval(() => {
          this.mesh.material.opacity = Math.min(this.mesh.material.opacity + 0.1, 0.75);
          if (this.mesh.material.opacity >= 0.75) clearInterval(fade);
        }, 50);
        break;
      }
    }
  }

  /* --------------------------------------------------------------------- *
   *  5. Death – keep bellboy fade but add a fiery burst (optional)
   * --------------------------------------------------------------------- */
  die() {
    super.die(); // bellboy fade-out + projectile cleanup

    if (this.deathExplosion) {
      // tiny firework
      for (let i = 0; i < 25; i++) {
        const pGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({
          color: i % 2 ? 0xff6600 : 0xffaa00,
        });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.copy(this.mesh.position);
        const speed = 0.08 + Math.random() * 0.12;
        const angle = (i / 25) * Math.PI * 2;
        p.userData.vel = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.random() * 0.12,
          Math.sin(angle) * speed
        );
        this.scene.add(p);

        const anim = () => {
          if (!p.parent) return;
          p.position.add(p.userData.vel);
          p.userData.vel.y -= 0.006;
          p.scale.multiplyScalar(0.94);
          if (p.scale.x > 0.05) requestAnimationFrame(anim);
          else this.scene.remove(p);
        };
        anim();
      }
    }
  }

  /* --------------------------------------------------------------------- *
   *  6. Main update – add spawn, teleport, spatula spin, fire-projectile spin
   * --------------------------------------------------------------------- */
  update(delta, time) {
    if (!this.isAlive && !this.defeatedHandled) {
      // bellboy already removes everything on death
      return;
    }

    // ---- 1. oven pop-out ------------------------------------------------
    if (this.isSpawning) {
      this.updateSpawn(delta, time);
      // still run shooting logic while hidden inside oven
    }

    // ---- 2. teleport ----------------------------------------------------
    if (this.isAlive && !this.isSpawning) {
      this.teleportTimer += delta;
      if (this.teleportTimer >= this.teleportInterval) {
        this.teleportTimer = 0;
        this.tryTeleport();
      }
    }

    // ---- 3. spatula orbit ------------------------------------------------
    if (this.spatulas) {
      this.spatulas.forEach((s) => {
        s.userData.orbitAngle += delta * 2.5;
        const a = s.userData.orbitAngle;
        s.position.x = Math.cos(a) * 1.5;
        s.position.z = Math.sin(a) * 1.5;
        s.rotation.y += delta * 6;
      });
    }

    // ---- 4. hover (same frequency as bellboy) ---------------------------
    if (this.isAlive) {
      this.mesh.position.y = this.mesh.position.y - Math.sin(time * 2) * 0.3 + Math.sin(time * 2) * 0.3; // keep bellboy hover
    }

    // ---- 5. projectile spin (fire visual) -------------------------------
    this.projectiles.forEach((p) => {
      p.rotation.x += delta * 3;
      p.rotation.y += delta * 2;
    });

    // ---- 6. let BellboyBoss handle chase / shooting / cleanup ----------
    super.update(delta, time);
  }
}