// src/systems/tutorial.js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class Tutorial {
  constructor(hud, lobbyScene, player) {
    this.hud = hud;
    this.lobbyScene = lobbyScene;
    this.scene = lobbyScene.scene;
    this.player = player;
    this.playerSpawnPos = null;
    this.phase = 0;
    this.marker = null;
    this.subgoalsUI = null;
    this.progressBar = null;
    this.progressFill = null;

    this.orbModels = []; // Array of loaded orb models
    this.modelsLoaded = false; // Track if models are loaded
    // One scale per model, matches the model's default size
    this.orbScales = [
      3.0, // model 0 (first orb)
      3.0, // model 1 (forward)
      0.2, // model 2 (left)
      3.0, // model 3 (right)
      3.0, // model 4 (back)
    ];

    // Phase 0: Looking around
    this.initialYaw = null;
    this.initialPitch = null;
    this.cameraMovementDetected = false;
    this.cameraMovementThreshold = 0.3;

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

    // Define phases
    this.phases = [
      {
        type: "look",
        msg: "Welcome to the Cozy Ghost Hotel! Let's learn the basics.",
      },
      {
        type: "firstMove",
        msg: "Pick up the bucket, this place needs a good scrub!",
        pos: new THREE.Vector3(5, 1.5, 3),
      },
      {
        type: "movementTraining",
        msg: "Excellent! Now learn all movement directions.",
      },
      {
        type: "spiritRelease",
        msg: "Click to shoot the suspicious objects and free the spirits!",
      },
    ];
  }

  start(yaw, pitch) {
    this.initialYaw = yaw;
    this.initialPitch = pitch;
    this.playerSpawnPos = this.player.ghost.position.clone();

    // Only show the welcome message here
    this.showMessage(this.phases[0].msg);

    // Start the first phase after a short delay
    setTimeout(() => {
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
        // Only show double-click message when tutorial is actually in the look phase
        if (!this.cameraMovementDetected) {
          this.showMessage(
            "Double-click to enable Look Mode, then move your mouse to look around. Press ESC to exit Look Mode.",
            "40px"
          );
        }
        break;

      case "firstMove":
        this.spawnMarker(currentPhase.pos, 0); // Use model index 0
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

  async loadOrbModels(urls) {
    const loader = new GLTFLoader();
    this.orbModels = [];

    for (const url of urls) {
      try {
        const gltf = await loader.loadAsync(url);
        const model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.orbModels.push(model);
        console.log(`✅ Loaded orb model: ${url}`);
      } catch (err) {
        console.error(`❌ Failed to load orb model: ${url}`, err);
      }
    }

    this.modelsLoaded = true;
    console.log(`✅ All orb models loaded. Total: ${this.orbModels.length}`);
  }

  startMovementTraining() {
    this.showMessage(
      this.phases[2].msg +
        " Use WASD or Arrow Keys. Try diagonal movement by pressing two keys!"
    );

    this.createSubgoalsUI(); // already creates progress bar inside

    const spawnPos = this.playerSpawnPos.clone();

    const directions = [
      { key: "forward", offset: new THREE.Vector3(0, 0, -4), modelIndex: 1 },
      { key: "left", offset: new THREE.Vector3(-4, 0, 0), modelIndex: 2 },
      { key: "right", offset: new THREE.Vector3(4, 0, 0), modelIndex: 3 },
      { key: "back", offset: new THREE.Vector3(0, 0, 4), modelIndex: 0 },
    ];

    directions.forEach((dir) => {
      let orbPos = spawnPos.clone().add(dir.offset);
      orbPos.y = 1.5;

      // Clamp to room bounds
      orbPos.x = Math.max(-20, Math.min(20, orbPos.x));
      orbPos.z = Math.max(-15, Math.min(15, orbPos.z));

      const orb = this.createOrb(orbPos, dir.modelIndex);
      orb.userData.direction = dir.key;
      this.movementOrbs.push(orb);
      this.scene.add(orb);
    });

    // Reset movementPhaseCompleted for this run
    this.movementPhaseCompleted = false;
  }

  startSpiritRelease() {
    this.showMessage(
      this.phases[3].msg + " Click your mouse/trackpad to shoot!"
    );
    this.createSpiritUI();
    this.player.enterCombat();

    const spawnPos = this.playerSpawnPos.clone(); // use spawn position

    const positions = [
      new THREE.Vector3(-4, 3.5, -6),
      new THREE.Vector3(4, 3.5, -6),
      new THREE.Vector3(-5, 3.5, 0),
      new THREE.Vector3(5, 3.5, 0),
      new THREE.Vector3(0, 3.5, -8),
    ];

    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

    positions.forEach((offset, index) => {
      let boxPos = spawnPos.clone().add(offset);

      boxPos.x = Math.max(-18, Math.min(18, boxPos.x));
      boxPos.z = Math.max(-12, Math.min(12, boxPos.z));
      boxPos.y = 3.5;

      const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      const material = new THREE.MeshStandardMaterial({
        color: colors[index],
        emissive: colors[index],
        emissiveIntensity: 0.5,
      });

      const box = new THREE.Mesh(geometry, material);
      box.position.copy(boxPos);
      box.userData.isEnemy = true;
      box.userData.isSuspicious = true;

      this.disguisedObjects.push(box);
      this.scene.add(box);
    });
  }

  createOrb(position, modelIndex) {
    let orb;

    if (this.modelsLoaded && this.orbModels[modelIndex]) {
      orb = this.orbModels[modelIndex].clone();
      orb.position.copy(position);

      const scale = this.orbScales[modelIndex] || 1.0;
      orb.scale.set(scale, scale, scale);

      // store base scale for pulsing
      orb.userData.baseScale = scale;

      orb.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.needsUpdate = true;
        }
      });
    } else {
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1,
      });
      orb = new THREE.Mesh(geometry, material);
      orb.position.copy(position);

      orb.userData.baseScale = 0.3; // store fallback scale
    }

    return orb;
  }

  spawnMarker(position, modelIndex) {
    const playerPos = this.player.ghost.position.clone();
    this.marker = this.createOrb(position, modelIndex);

    if (this.phase === 1) {
      this.marker.position.copy(playerPos);
      this.marker.position.x += 3;
      this.marker.position.z -= 5;
      this.marker.position.y = 1.5;

      this.marker.position.x = Math.max(
        -20,
        Math.min(20, this.marker.position.x)
      );
      this.marker.position.z = Math.max(
        -15,
        Math.min(15, this.marker.position.z)
      );
    }

    this.scene.add(this.marker);
  }

  createSubgoalsUI() {
    // Container for both text and progress bar
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
    this.subgoalsUI.style.width = "250px"; // fixed width for layout
    this.subgoalsUI.style.boxSizing = "border-box";

    this.subgoalsUI.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">Movement Training:</div>
      <div style="margin-bottom: 12px;">Collect all cleaning supplies!</div>
      <div style="margin-top: 8px; font-size: 14px; color: #00ffcc;">💡 Tip: Press two arrow keys together for diagonal movement</div>
    `;

    document.body.appendChild(this.subgoalsUI);

    this.createProgressBar(); // create progress bar inside container
  }

  createProgressBar() {
    this.progressBar = document.createElement("div");
    this.progressBar.style.width = "100%";
    this.progressBar.style.height = "20px";
    this.progressBar.style.background = "rgba(255,255,255,0.2)";
    this.progressBar.style.border = "2px solid white";
    this.progressBar.style.borderRadius = "10px";
    this.progressBar.style.marginTop = "10px"; // spacing below text

    this.progressFill = document.createElement("div");
    this.progressFill.style.height = "100%";
    this.progressFill.style.width = "0%";
    this.progressFill.style.background = "#00ffcc";
    this.progressFill.style.borderRadius = "8px";

    this.progressBar.appendChild(this.progressFill);
    this.subgoalsUI.appendChild(this.progressBar); // attach bar to container
  }

  updateProgressBar() {
    const collected = Object.values(this.movementProgress).filter(
      (v) => v
    ).length;
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
        this.showMessage(
          "🎉 Tutorial Complete! Get ready for the Boss Fight..."
        );

        setTimeout(() => {
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
        //this.updateSpiritRelease();
        break;
    }

    this.movementOrbs.forEach((orb) => {
      orb.rotation.y += 0.02;
      const baseScale = orb.userData.baseScale || 1.0;
      const pulseAmount = Math.sin(Date.now() * 0.003) * 0.1;
      orb.scale.setScalar(baseScale * (1 + pulseAmount));
    });

    if (this.marker) {
      this.marker.rotation.y += 0.02;
      const baseScale = this.marker.userData.baseScale || 1.5;
      const pulseAmount = Math.sin(Date.now() * 0.003) * 0.1;
      this.marker.scale.setScalar(baseScale * (1 + pulseAmount));
    }

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

    if (totalDelta > 0.01) {
      console.log(
        `Camera movement - Yaw: ${deltaYaw.toFixed(
          3
        )}, Pitch: ${deltaPitch.toFixed(3)}, Total: ${totalDelta.toFixed(
          3
        )}, Threshold: ${this.cameraMovementThreshold}`
      );
    }

    if (totalDelta > this.cameraMovementThreshold) {
      this.cameraMovementDetected = true;

      // Hide the "double-click" message
      const existing = document.getElementById("tutorialMessage");
      if (existing) existing.remove();

      // Show success message slightly lower than top
      this.showMessage(
        "Great! You've mastered looking around. Press ESC to exit Look Mode.",
        "40px"
      );

      setTimeout(() => {
        // Remove success message after 2s
        const msg = document.getElementById("tutorialMessage");
        if (msg) msg.remove();

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
    if (this.movementPhaseCompleted) return;

    for (let i = this.movementOrbs.length - 1; i >= 0; i--) {
      const orb = this.movementOrbs[i];
      const distance = player.ghost.position.distanceTo(orb.position);

      if (distance < 2.0) {
        const direction = orb.userData.direction;
        this.movementProgress[direction] = true;

        this.rewardEffect(orb.position, 0xffff00);

        // Remove orb safely
        this.scene.remove(orb);
        this.movementOrbs.splice(i, 1);

        this.updateProgressBar();

        if (this.movementOrbs.length > 0) {
          this.showMessage("Let's guide you to the next orb!");
        }
      }
    }

    // Check if all movement directions are completed
    const allCompleted = Object.values(this.movementProgress).every(
      (v) => v === true
    );

    if (allCompleted && this.movementOrbs.length === 0) {
      this.movementPhaseCompleted = true;

      this.showMessage("Great job! Time for the next challenge...");

      // Remove UI safely
      this.removeSubgoalsUI();

      // Reset movementProgress for possible future use
      Object.keys(this.movementProgress).forEach(
        (k) => (this.movementProgress[k] = false)
      );

      // Delay before starting next phase
      setTimeout(() => {
        this.phase++;
        this.executePhase(); // properly starts shooting challenge
      }, 1500);
    }
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
    const maxFrames = 60; // roughly 1 second animation at 60fps
    const animate = () => {
      t++;
      particles.children.forEach((p) => {
        p.position.x += (Math.random() - 0.5) * 0.1;
        p.position.y += 0.1;
        p.position.z += (Math.random() - 0.5) * 0.1;
      });

      if (t < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        // Safely remove and dispose particles
        this.scene.remove(particles);
        particles.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    };
    animate();
  }

  showMessage(msg, top = "20px") {
    // Remove existing message first
    const existing = document.getElementById("tutorialMessage");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.id = "tutorialMessage";
    div.innerText = msg;
    div.style.position = "absolute";
    div.style.top = top; // allows positioning higher/lower
    div.style.left = "50%";
    div.style.transform = "translateX(-50%)";
    div.style.color = "white";
    div.style.background = "rgba(0,0,0,0.7)";
    div.style.padding = "10px 20px";
    div.style.borderRadius = "10px";
    div.style.zIndex = "9999";
    div.style.fontFamily = "Arial, sans-serif";
    div.style.fontSize = "16px";

    document.body.appendChild(div);
  }
}
