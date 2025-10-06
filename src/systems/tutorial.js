// src/systems/tutorial.js
import * as THREE from "three";

export default class Tutorial {
  constructor(hud, lobbyScene, player) {
    this.hud = hud;
    this.lobbyScene = lobbyScene; // Store reference to lobby scene
    this.scene = lobbyScene.scene; // Store reference to Three.js scene for adding objects
    this.player = player;
    this.phase = 0;
    this.marker = null;
    this.subgoalsUI = null;
    this.progressBar = null;
    this.progressFill = null;

    // Phase 0: Looking around
    this.initialYaw = null;
    this.initialPitch = null;
    this.cameraMovementDetected = false;
    this.cameraMovementThreshold = 0.3; // radians

    // Phase 2: Movement training
    this.movementProgress = {
      forward: false,
      left: false,
      right: false,
      back: false,
    };
    this.movementOrbs = [];

    // Phase 3: Spirit Release
    this.disguisedObjects = [];
    this.spiritsFreed = 0;
    this.totalSpirits = 5;

    // Define phases (removed "longDistance")
    this.phases = [
      { type: "look", msg: "Welcome to the Cozy Ghost Hotel! Let's learn the basics." },
      { type: "firstMove", msg: "Reach the glowing cyan orb!", pos: new THREE.Vector3(5, 1.5, 3) },
      { type: "movementTraining", msg: "Excellent! Now learn all movement directions." },
      { type: "spiritRelease", msg: "Click to shoot the suspicious objects and free the spirits!" },
    ];
  }

  start(yaw, pitch) {
    this.initialYaw = yaw;
    this.initialPitch = pitch;

    this.showMessage(this.phases[0].msg);

    setTimeout(() => {
      this.showMessage("Double-click to enable Look Mode, then move your mouse to look around. Press ESC to exit Look Mode.");
      this.executePhase();
    }, 2000);
  }

  executePhase() {
    if (this.phase >= this.phases.length) {
      this.complete();
      return;
    }

    const currentPhase = this.phases[this.phase];

    switch (currentPhase.type) {
      case "look":
        break;
      case "firstMove":
        this.spawnMarker(currentPhase.pos, 0x00ffcc);
        this.showMessage(currentPhase.msg + " Use WASD or Arrow Keys to move.");
        break;
      case "movementTraining":
        this.startMovementTraining();
        break;
      case "spiritRelease":
        this.startSpiritRelease();
        break;
    }
  }

  startMovementTraining() {
    this.showMessage(this.phases[2].msg + " Use WASD or Arrow Keys. Try diagonal movement by pressing two keys!");
    this.createSubgoalsUI();
    this.createProgressBar();

    const playerPos = this.player.ghost.position.clone();

    const directions = [
      { key: "forward", offset: new THREE.Vector3(0, 0, -5) },
      { key: "left", offset: new THREE.Vector3(-5, 0, 0) },
      { key: "right", offset: new THREE.Vector3(5, 0, 0) },
      { key: "back", offset: new THREE.Vector3(0, 0, 5) },
    ];

    directions.forEach((dir) => {
      const orbPos = playerPos.clone().add(dir.offset);
      orbPos.y = 1.5;
      const orb = this.createOrb(orbPos, 0xffff00);
      orb.userData.direction = dir.key;
      this.movementOrbs.push(orb);
      this.scene.add(orb);
    });
  }

  startSpiritRelease() {
    this.showMessage(this.phases[3].msg + " Click your mouse/trackpad to shoot!");
    this.createSpiritUI();
    this.player.enterCombat();

    const playerPos = this.player.ghost.position.clone();

    const positions = [
      new THREE.Vector3(-6, 2, -8),
      new THREE.Vector3(6, 2, -8),
      new THREE.Vector3(-8, 2, -3),
      new THREE.Vector3(8, 2, -3),
      new THREE.Vector3(0, 2, -10),
    ];

    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

    positions.forEach((offset, index) => {
      const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      const material = new THREE.MeshStandardMaterial({
        color: colors[index],
        emissive: colors[index],
        emissiveIntensity: 0.5,
      });

      const box = new THREE.Mesh(geometry, material);
      box.position.copy(playerPos).add(offset);
      box.userData.isEnemy = true;
      box.userData.isSuspicious = true;

      this.disguisedObjects.push(box);
      this.scene.add(box);
    });
  }

  createOrb(position, color) {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1,
    });
    const orb = new THREE.Mesh(geometry, material);
    orb.position.copy(position);
    return orb;
  }

  spawnMarker(position, color) {
    const playerPos = this.player.ghost.position.clone();
    this.marker = this.createOrb(position, color);

    if (this.phase === 1) {
      this.marker.position.copy(playerPos);
      this.marker.position.x += 3;
      this.marker.position.z -= 5;
      this.marker.position.y = 1.5;
    }

    this.scene.add(this.marker);
  }

  createSubgoalsUI() {
    this.subgoalsUI = document.createElement("div");
    this.subgoalsUI.style.position = "absolute";
    this.subgoalsUI.style.top = "120px";
    this.subgoalsUI.style.left = "20px";
    this.subgoalsUI.style.color = "white";
    this.subgoalsUI.style.fontFamily = "Arial, sans-serif";
    this.subgoalsUI.style.fontSize = "16px";
    this.subgoalsUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.subgoalsUI.style.padding = "15px";
    this.subgoalsUI.style.borderRadius = "8px";
    this.subgoalsUI.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">Movement Training:</div>
      <div>Collect all glowing orbs!</div>
      <div style="margin-top: 8px; font-size: 14px; color: #00ffcc;">💡 Tip: Press two arrow keys together for diagonal movement</div>
    `;
    document.body.appendChild(this.subgoalsUI);
  }

  createProgressBar() {
    this.progressBar = document.createElement("div");
    this.progressBar.style.position = "absolute";
    this.progressBar.style.top = "200px";
    this.progressBar.style.left = "20px";
    this.progressBar.style.width = "200px";
    this.progressBar.style.height = "20px";
    this.progressBar.style.background = "rgba(255,255,255,0.2)";
    this.progressBar.style.border = "2px solid white";
    this.progressBar.style.borderRadius = "10px";

    this.progressFill = document.createElement("div");
    this.progressFill.style.height = "100%";
    this.progressFill.style.width = "0%";
    this.progressFill.style.background = "#00ffcc";
    this.progressFill.style.borderRadius = "8px";

    this.progressBar.appendChild(this.progressFill);
    document.body.appendChild(this.progressBar);
  }

  updateProgressBar() {
    const collected = Object.values(this.movementProgress).filter((v) => v).length;
    const percent = (collected / 4) * 100;
    if (this.progressFill) {
      this.progressFill.style.width = percent + "%";
    }
  }

  removeProgressBar() {
    if (this.progressBar) {
      document.body.removeChild(this.progressBar);
      this.progressBar = null;
      this.progressFill = null;
    }
  }

  createSpiritUI() {
    this.subgoalsUI = document.createElement("div");
    this.subgoalsUI.style.position = "absolute";
    this.subgoalsUI.style.top = "120px";
    this.subgoalsUI.style.left = "20px";
    this.subgoalsUI.style.color = "white";
    this.subgoalsUI.style.fontFamily = "Arial, sans-serif";
    this.subgoalsUI.style.fontSize = "18px";
    this.subgoalsUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.subgoalsUI.style.padding = "15px";
    this.subgoalsUI.style.borderRadius = "8px";
    this.subgoalsUI.innerHTML = `
      <div style="font-weight: bold;">Free all trapped spirits (${this.spiritsFreed}/${this.totalSpirits})</div>
      <div style="margin-top: 8px; font-size: 14px; color: #ffff00;">🎯 Click to aim and shoot at suspicious objects!</div>
    `;
    document.body.appendChild(this.subgoalsUI);
  }

  updateSpiritUI() {
    if (this.subgoalsUI) {
      this.subgoalsUI.innerHTML = `
        <div style="font-weight: bold;">Free all trapped spirits (${this.spiritsFreed}/${this.totalSpirits})</div>
        <div style="margin-top: 8px; font-size: 14px; color: #ffff00;">🎯 Click to aim and shoot at suspicious objects!</div>
      `;
    }
  }

  removeSubgoalsUI() {
    if (this.subgoalsUI) {
      document.body.removeChild(this.subgoalsUI);
      this.subgoalsUI = null;
    }
  }

  showFloatingText(text, position) {
    const textDiv = document.createElement("div");
    textDiv.innerText = text;
    textDiv.style.position = "absolute";
    textDiv.style.color = "#00ffff";
    textDiv.style.fontSize = "24px";
    textDiv.style.fontWeight = "bold";
    textDiv.style.pointerEvents = "none";
    textDiv.style.textShadow = "2px 2px 4px black";
    textDiv.style.left = "50%";
    textDiv.style.top = "50%";
    textDiv.style.transform = "translate(-50%, -50%)";
    document.body.appendChild(textDiv);

    let opacity = 1;
    let yOffset = 0;
    const animate = () => {
      yOffset -= 2;
      opacity -= 0.02;
      textDiv.style.opacity = opacity;
      textDiv.style.top = `calc(50% + ${yOffset}px)`;

      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        document.body.removeChild(textDiv);
      }
    };
    animate();
  }

  releaseSpirit(position) {
    this.rewardEffect(position, 0x00ffff);
    this.spiritsFreed++;
    this.updateSpiritUI();
    this.showFloatingText("+1 Spirit!", position);

    if (this.spiritsFreed >= this.totalSpirits) {
      setTimeout(() => {
        this.removeSubgoalsUI();
        this.showMessage("🎉 Tutorial Complete! Get ready for the Boss Fight...");

        setTimeout(() => {
          // Notify lobby scene to start boss fight
          if (this.lobbyScene && this.lobbyScene.startBossFight) {
            this.lobbyScene.startBossFight();
          }
          this.phase++;
          this.executePhase();
        }, 3000);
      }, 500);
    }
  }

  update(keys, player, yaw, pitch, delta) {
    if (!player.ghost) return;

    const currentPhase = this.phases[this.phase];

    switch (currentPhase?.type) {
      case "look":
        this.updateLookingPhase(yaw, pitch);
        break;
      case "firstMove":
        this.updateMarkerPhase(player);
        break;
      case "movementTraining":
        this.updateMovementTraining(player);
        break;
      case "spiritRelease":
        this.updateSpiritRelease();
        break;
    }

    if (this.marker) {
      this.marker.rotation.y += 0.02;
      this.marker.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.1);
    }

    this.movementOrbs.forEach((orb) => {
      orb.rotation.y += 0.02;
      orb.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.1);
    });

    this.disguisedObjects.forEach((obj) => {
      obj.rotation.y += 0.01;
      obj.rotation.x += 0.005;
    });
  }

  updateLookingPhase(yaw, pitch) {
    if (this.cameraMovementDetected) return;

    const deltaYaw = Math.abs(yaw - this.initialYaw);
    const deltaPitch = Math.abs(pitch - this.initialPitch);
    const totalDelta = deltaYaw + deltaPitch;

    // Debug logging
    if (totalDelta > 0.01) {
      console.log(`Camera movement - Yaw: ${deltaYaw.toFixed(3)}, Pitch: ${deltaPitch.toFixed(3)}, Total: ${totalDelta.toFixed(3)}, Threshold: ${this.cameraMovementThreshold}`);
    }

    if (totalDelta > this.cameraMovementThreshold) {
      this.cameraMovementDetected = true;
      this.showMessage("Great! You've mastered looking around. Press ESC to exit Look Mode.");

      setTimeout(() => {
        this.phase++;
        this.executePhase();
      }, 2000);
    }
  }

  updateMarkerPhase(player) {
    if (!this.marker) return;

    const distance = player.ghost.position.distanceTo(this.marker.position);
    if (distance < 2.0) {
      this.rewardEffect(this.marker.position, 0xffff00);
      this.scene.remove(this.marker);
      this.marker = null;

      this.showMessage("Excellent! Movement controls mastered!");

      setTimeout(() => {
        this.phase++;
        this.executePhase();
      }, 2000);
    }
  }

  updateMovementTraining(player) {
    for (let i = this.movementOrbs.length - 1; i >= 0; i--) {
      const orb = this.movementOrbs[i];
      const distance = player.ghost.position.distanceTo(orb.position);

      if (distance < 2.0) {
        const direction = orb.userData.direction;
        this.movementProgress[direction] = true;

        this.rewardEffect(orb.position, 0xffff00);
        this.scene.remove(orb);
        this.movementOrbs.splice(i, 1);

        this.updateProgressBar();

        if (this.movementOrbs.length > 0) {
          this.showMessage("Let's guide you to the next orb!");
        }
      }
    }

    const allCompleted = Object.values(this.movementProgress).every((v) => v === true);
    if (allCompleted && this.movementOrbs.length === 0) {
      this.showMessage("Great job! Time for the next challenge...");
      this.removeSubgoalsUI();
      this.removeProgressBar();

      setTimeout(() => {
        this.phase++;
        this.executePhase();
      }, 2000);
    }
  }

  updateSpiritRelease() {
    // handled by player's shoot()
  }

  complete() {
    this.showMessage("");
  }

  rewardEffect(position, color = 0xffff00) {
    const particles = new THREE.Group();
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color: color });

    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(geometry, material);
      p.position.copy(position);
      particles.add(p);
    }

    this.scene.add(particles);

    let t = 0;
    const animate = () => {
      t += 0.05;
      particles.children.forEach((p) => {
        p.position.x += (Math.random() - 0.5) * 0.1;
        p.position.y += 0.1;
        p.position.z += (Math.random() - 0.5) * 0.1;
      });
      if (t < 20) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(particles);
      }
    };
    animate();
  }

  showMessage(msg) {
    if (this.hud && this.hud.showMessage) {
      this.hud.showMessage(msg);
    }
  }
}