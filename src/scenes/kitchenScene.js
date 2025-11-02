// src/scenes/kitchenScene.js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Player from "../entities/player.js";
import HUD from "../ui/hud.js";
import PhysicsSystem from "../systems/physics.js";
import Inventory from "../systems/inventory.js";
import KitchenGhost from "../entities/kitchenGhost.js";
import { level3start } from "../cutscenes/level3start.js";
import { level3PreBattle } from "../cutscenes/level3PreBattle.js";
import { level3postBattle } from "../cutscenes/level3postBattle.js";
import CutsceneManager from "../ui/cutsceneManager.js";

export default class KitchenScene {
// Replace the constructor in kitchenScene.js with this:

constructor(renderer, camera, player, playerPosition, cameraRotation) {
  this.renderer = renderer;
  this.camera = camera;
  this.scene = new THREE.Scene();
  this.clock = new THREE.Clock();

  if (player) {
    this.player = player;
    if (this.player.ghost) {
      this.player.ghost.scale.set(0.7, 0.7, 0.7);
      this.player.ghost.position.copy(playerPosition);
      this.player.ghost.position.y = 0.8;
    }
  } else {
    this.hud = new HUD();
    this.player = new Player(this.scene, this.camera, this.hud);
    this.player.loadGhost("/assets/models/mainchar.glb").then(() => {
      if (this.player.ghost) {
        this.player.ghost.scale.set(0.7, 0.7, 0.7);
        this.player.ghost.position.y = 0.8;
      }
    });
    this.player.loadGun("/assets/models/gun.glb");
  }

  this.scene.userData.player = this.player;

  this.physics = new PhysicsSystem(this.scene);
  this.inventory = new Inventory(null);
  this.ghostTransitionActive = false;

  this.initialCameraRotation = cameraRotation || { yaw: 0, pitch: 0 };

  this.boundaries = {
    minX: -9, maxX: 9, minZ: -6.5, maxZ: 6.5, minY: 0.5, maxY: 5
  };

  this.kitchenModel = null;
  this.interactiveObjects = [];
  this.possessedObjects = [];
  this.correctPossessedIndices = [];
  this.objectsDestroyed = 0;
  this.objectsToDestroy = 3;
  this.currentPhase = "intro";
  this.selectedObject = null;
  this.kitchenGhost = null;
  this.gameOver = false;
  this.clickCooldown = false;
  this.dustParticles = [];

  this.raycaster = new THREE.Raycaster();
  this.mouse = new THREE.Vector2();

  this.combatActive = false;
  this.combatTarget = null;
  this.combatTargetHealth = 3;
  this.combatMisses = 0;

  this.smokeParticles = [];
  this.steamParticles = [];

  // ————————————————————————————————————————————————————————————————
  // CUTSCENE MANAGER
  // ————————————————————————————————————————————————————————————————
  this.cutscene = new CutsceneManager("cutscene-container");

  this.setupLighting();

  // ————————————————————————————————————————————————————————————————
  // 1. INTRO CUTSCENE — runs while models load
  // ————————————————————————————————————————————————————————————————
  this.cutscene.play(level3start).then(() => {
    this.loadKitchenEnvironment().then(() => {
      this.createInteractiveObjects();
    });
  });

  this.createAmbientEffects();
  this.setupMouseInteraction();
  this.createCrosshair();

  // Start intro phase only after cutscene ends
  setTimeout(() => this.startIntroPhase(), 600);

  window.kitchenScene = this;
}

// Add this method to KitchenScene class for camera initialization:
getInitialCameraRotation() {
  return this.initialCameraRotation;
}

createCrosshair() {
  this.crosshair = document.createElement("div");
  this.crosshair.style.cssText = `
    position: fixed; 
    top: 50%; 
    left: 50%; 
    transform: translate(-50%, -50%);
    width: 4px; 
    height: 4px; 
    background: rgba(255, 255, 255, 0.8);
    border: 2px solid rgba(0, 0, 0, 0.5); 
    border-radius: 50%;
    pointer-events: none; 
    z-index: 9000;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  `;
  document.body.appendChild(this.crosshair);
}

  updateCrosshair(color, size) {
    if (!this.crosshair) return;
    this.crosshair.style.background = color;
    this.crosshair.style.width = size + 'px';
    this.crosshair.style.height = size + 'px';
    this.crosshair.style.boxShadow = `0 0 ${size * 2}px ${color}`;
  }

  setupMouseInteraction() {
    this.mouseMoveHandler = (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);

    this.clickHandler = (event) => {
      if (this.currentPhase === "investigation" && !this.clickCooldown) {
        this.clickCooldown = true;
        setTimeout(() => this.clickCooldown = false, 300);
        this.handleObjectSelection();
      }
    };
    window.addEventListener('click', this.clickHandler);
  }

setupLighting() {
  // MUCH BRIGHTER ambient light for overall visibility
  const ambient = new THREE.AmbientLight(0xffeedd, 0.6); // Increased from 0.2 to 0.6
  this.scene.add(ambient);

  // Main overhead light - MUCH BRIGHTER
  this.mainLight = new THREE.PointLight(0xffffee, 1.8, 35); // Increased intensity and range
  this.mainLight.position.set(0, 6, 0);
  this.mainLight.castShadow = true;
  this.mainLight.shadow.mapSize.width = 2048;
  this.mainLight.shadow.mapSize.height = 2048;
  this.scene.add(this.mainLight);

  // Additional overhead lights for even coverage
  const overheadLight1 = new THREE.PointLight(0xffffee, 1.2, 25);
  overheadLight1.position.set(-5, 5, 0);
  this.scene.add(overheadLight1);

  const overheadLight2 = new THREE.PointLight(0xffffee, 1.2, 25);
  overheadLight2.position.set(5, 5, 0);
  this.scene.add(overheadLight2);

  const overheadLight3 = new THREE.PointLight(0xffffee, 1.2, 25);
  overheadLight3.position.set(0, 5, -5);
  this.scene.add(overheadLight3);

  const overheadLight4 = new THREE.PointLight(0xffffee, 1.2, 25);
  overheadLight4.position.set(0, 5, 5);
  this.scene.add(overheadLight4);

  // Oven light (keep dramatic but not too dark)
  this.ovenLight = new THREE.PointLight(0xff4400, 1.2, 15);
  this.ovenLight.position.set(0, 2, -8);
  this.ovenLight.castShadow = true;
  this.scene.add(this.ovenLight);

  // Stove lights
  this.stoveLights = [];
  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(0xff7700, 1.0, 6);
    light.position.set(-6 + i * 4, 1.5, -6);
    this.stoveLights.push(light);
    this.scene.add(light);
  }

  // Fridge light
  this.fridgeLight = new THREE.PointLight(0x6699ff, 0.8, 10);
  this.fridgeLight.position.set(8, 2, -4);
  this.scene.add(this.fridgeLight);

  // Bright directional moonlight
  this.moonlight = new THREE.DirectionalLight(0x8899ff, 0.8); // Increased from 0.4
  this.moonlight.position.set(10, 15, 10);
  this.moonlight.castShadow = true;
  this.moonlight.shadow.camera.left = -20;
  this.moonlight.shadow.camera.right = 20;
  this.moonlight.shadow.camera.top = 20;
  this.moonlight.shadow.camera.bottom = -20;
  this.scene.add(this.moonlight);

  // Counter spotlights - BRIGHTER
  this.counterSpot1 = new THREE.SpotLight(0xffffff, 1.2, 15, Math.PI / 4);
  this.counterSpot1.position.set(-4, 5, -3);
  this.counterSpot1.target.position.set(-4, 1.5, -5);
  this.scene.add(this.counterSpot1, this.counterSpot1.target);

  this.counterSpot2 = new THREE.SpotLight(0xffffff, 1.2, 15, Math.PI / 4);
  this.counterSpot2.position.set(4, 5, -3);
  this.counterSpot2.target.position.set(4, 1.5, -5);
  this.scene.add(this.counterSpot2, this.counterSpot2.target);

  // Hanging lights - BRIGHTER
  this.hangingLights = [];
  for (let i = 0; i < 3; i++) {
    const light = new THREE.PointLight(0xffffdd, 0.9, 10);
    light.position.set(-5 + i * 5, 3.5, 0);
    this.hangingLights.push(light);
    this.scene.add(light);

    const bulbGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.copy(light.position);
    this.scene.add(bulb);
  }

  // Wall lights for better coverage
  const wallLight1 = new THREE.PointLight(0xffffee, 0.8, 12);
  wallLight1.position.set(-9, 3, 0);
  this.scene.add(wallLight1);

  const wallLight2 = new THREE.PointLight(0xffffee, 0.8, 12);
  wallLight2.position.set(9, 3, 0);
  this.scene.add(wallLight2);

  // Atmospheric lights (keep these subtle)
  this.atmosphericLights = [];
  const colors = [0xff0055, 0x00ff88, 0x8800ff, 0xff9900];
  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(colors[i], 0, 10);
    light.position.set(
      (Math.random() - 0.5) * 16,
      2 + Math.random() * 2,
      (Math.random() - 0.5) * 12
    );
    light.userData.targetIntensity = 0;
    light.userData.pulseSpeed = 0.5 + Math.random() * 1.5;
    this.atmosphericLights.push(light);
    this.scene.add(light);
  }

  // Add hemisphere light for natural fill lighting
  const hemiLight = new THREE.HemisphereLight(0xffffee, 0x887755, 0.4);
  this.scene.add(hemiLight);
}

  async loadKitchenEnvironment() {
    const loader = new GLTFLoader();
    this.showMessage("Loading kitchen...");
    try {
      const gltf = await loader.loadAsync("/assets/models/kitchen.glb");
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center); // move so model’s center is at (0,0,0)

      this.kitchenModel = gltf.scene;
      this.kitchenModel.scale.set(2, 2, 2);
      this.kitchenModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.scene.add(this.kitchenModel);
      this.physics.addCollisionObject(this.kitchenModel, true);
      console.log("Kitchen model loaded — ready for object placement");
      this.showMessage("Kitchen loaded!");
      setTimeout(() => this.showMessage(""), 1000);
    } catch (err) {
      console.warn("Kitchen model failed, using fallback", err);
      this.createFallbackKitchen();
    }
  }

  createFallbackKitchen() {
    const floorGeo = new THREE.PlaneGeometry(20, 15);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.9 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 0.5), wallMat);
    backWall.position.set(0, 3, -7.5);
    backWall.castShadow = backWall.receiveShadow = true;
    this.scene.add(backWall);
    this.physics.addCollisionObject(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 15), wallMat);
    leftWall.position.set(-10, 3, 0);
    leftWall.castShadow = leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    this.physics.addCollisionObject(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 15), wallMat);
    rightWall.position.set(10, 3, 0);
    rightWall.castShadow = rightWall.receiveShadow = true;
    this.scene.add(rightWall);
    this.physics.addCollisionObject(rightWall);

    const counterMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4, roughness: 0.6 });
    const leftCounter = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 2.5), counterMat);
    leftCounter.position.set(-5, 0.75, -5.75);
    leftCounter.castShadow = leftCounter.receiveShadow = true;
    this.scene.add(leftCounter);
    this.physics.addCollisionObject(leftCounter);

    const rightCounter = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 2.5), counterMat);
    rightCounter.position.set(5, 0.75, -5.75);
    rightCounter.castShadow = rightCounter.receiveShadow = true;
    this.scene.add(rightCounter);
    this.physics.addCollisionObject(rightCounter);

    const island = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 2), counterMat);
    island.position.set(0, 0.75, 2);
    island.castShadow = island.receiveShadow = true;
    this.scene.add(island);
    this.physics.addCollisionObject(island);

    const ovenBody = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 }));
    ovenBody.position.set(0, 1, -6.5);
    ovenBody.castShadow = true;
    this.scene.add(ovenBody);

    const ovenDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff3300, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 }));
    ovenDoor.position.set(0, 1, -5.9);
    this.scene.add(ovenDoor);

    this.createHangingUtensils();
  }

  createHangingUtensils() {
    const panGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const panMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 });
    for (let i = 0; i < 5; i++) {
      const pan = new THREE.Mesh(panGeo, panMat);
      pan.position.set(-6 + i * 3, 3.5, -2);
      pan.rotation.x = Math.PI / 2;
      pan.castShadow = true;
      this.scene.add(pan);
    }
  }

  createAmbientEffects() {
    for (let i = 0; i < 10; i++) {
      const steamGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
      const steam = new THREE.Mesh(steamGeo, steamMat);
      steam.position.set(-6 + Math.random() * 4, 0.5, -6 + Math.random() * 2);
      steam.userData.velocity = new THREE.Vector3(0, 0.02 + Math.random() * 0.02, 0);
      steam.userData.lifetime = Math.random() * 5;
      this.steamParticles.push(steam);
      this.scene.add(steam);
    }
    for (let i = 0; i < 30; i++) {
  const dustGeo = new THREE.SphereGeometry(0.05, 4, 4);
  const dustMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, 
    transparent: true, 
    opacity: 0.2 
  });
  const dust = new THREE.Mesh(dustGeo, dustMat);
  dust.position.set(
    (Math.random() - 0.5) * 20,
    Math.random() * 6,
    (Math.random() - 0.5) * 15
  );
  dust.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.01,
    (Math.random() - 0.5) * 0.01,
    (Math.random() - 0.5) * 0.01
  );
  this.dustParticles.push(dust);
  this.scene.add(dust);
}
  }

// ————————————————————————————————————————————————————————————————
  // ENHANCED OBJECT PLACEMENT — LOADING MODELS ONLY
  // ————————————————————————————————————————————————————————————————
async createInteractiveObjects() {
    console.log("Creating interactive objects...");

    // Define well-spaced positions across the ENTIRE kitchen
    // Adjusted for 2x scaled kitchen model
const positions = [
  { x: -6,  y: 1.5, z: -5 },   // left back counter
  { x:  6,  y: 1.5, z: -5 },   // right back counter
  { x: -8,  y: 1.5, z:  0 },   // left wall shelf
  { x:  8,  y: 1.5, z:  0 },   // right wall shelf
  { x:  0,  y: 1.5, z:  2 },   // centre island
  { x: -3,  y: 1.5, z:  4 }    // near player spawn
];

    const objectData = [
      { name: "Frying Pan", model: "/assets/models/frying_pan.glb", targetSize: 1.8, color: 0x333333 },
      { name: "Blender", model: "/assets/models/blender.glb", targetSize: 1.5, color: 0x888888 },
      { name: "Toaster", model: "/assets/models/toaster.glb", targetSize: 0.8, color: 0xcccccc },
      { name: "Knife Block", model: "/assets/models/knife_block.glb", targetSize: 1.7, color: 0x8b4513 },
      { name: "Pot of Soup", model: "/assets/models/pot.glb", targetSize: 1.8, color: 0x666666 },
      { name: "Rolling Pin", model: "/assets/models/rolling_pin_asset.glb", targetSize: 1.5, color: 0xf5deb3 }
    ];

    // Randomize which objects are possessed
    const indices = [0, 1, 2, 3, 4, 5];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this.correctPossessedIndices = indices.slice(0, 3);

    const loader = new GLTFLoader();
    
    for (let index = 0; index < objectData.length; index++) {
      const data = objectData[index];
      const pos = positions[index];
      let mesh;

      try {
        console.log(`Loading ${data.name} model...`);
        const gltf = await loader.loadAsync(data.model);
        mesh = gltf.scene;
        
        // Calculate bounding box to get actual size
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Scale to target size
        const normalizedScale = data.targetSize / maxDim;
        mesh.scale.set(normalizedScale, normalizedScale, normalizedScale);
        
        console.log(`  ${data.name}: original max dimension ${maxDim.toFixed(2)} → scaled to ${data.targetSize}`);
        
        // Ensure all children have proper materials with emissive support
        mesh.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Handle material arrays and convert to support emissive
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            const newMaterials = [];
            
            materials.forEach(oldMaterial => {
              if (oldMaterial && !oldMaterial.emissive) {
                const newMat = new THREE.MeshStandardMaterial({
                  map: oldMaterial.map,
                  color: oldMaterial.color || data.color,
                  metalness: 0.3,
                  roughness: 0.7,
                  emissive: new THREE.Color(0x000000),
                  emissiveIntensity: 0
                });
                newMaterials.push(newMat);
                if (oldMaterial.dispose) oldMaterial.dispose();
              } else if (oldMaterial && oldMaterial.emissive) {
                oldMaterial.emissive.setHex(0x000000);
                oldMaterial.emissiveIntensity = 0;
                newMaterials.push(oldMaterial);
              }
            });
            
            // Assign new materials
            if (newMaterials.length > 0) {
              child.material = newMaterials.length === 1 ? newMaterials[0] : newMaterials;
            }
          }
        });
        
        console.log(`✓ ${data.name} model loaded successfully`);
      } catch (err) {
        console.error(`Failed to load ${data.name} model:`, err);
        console.log(`Skipping ${data.name} - model file not found`);
        continue; // Skip this object if model fails to load
      }

      mesh.position.set(pos.x, pos.y, pos.z);

// src/scenes/kitchenScene.js  →  createInteractiveObjects()
mesh.userData = {
  objectName: data.name,
  objectIndex: index,
  isPossessed: this.correctPossessedIndices.includes(index),
  isInteractive: true,
  glowIntensity: 0,
  baseColor: data.color,
  originalY: mesh.position.y,
  basePosition: mesh.position.clone(),
  // -------------------------------------------------
  // HOVER-ON-CLICK (investigation phase)
  // -------------------------------------------------
  isHovering: false,          // true after the player clicks it
  hoverTargetY: mesh.position.y + 1.2,   // how high it floats
  hoverSpeed: 0.09,           // smoothness of rise/fall
  hoverWobbleFreq: 4,         // wobble frequency
  hoverWobbleAmp: 0.04        // wobble amplitude
};

      this.scene.add(mesh);
      this.interactiveObjects.push(mesh);

      console.log(`✓ ${data.name} placed at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) ${mesh.userData.isPossessed ? '[POSSESSED]' : '[NORMAL]'}`);
    }

    if (this.interactiveObjects.length === 0) {
      console.error("❌ No objects loaded! Check model paths.");
      this.showMessage("ERROR: No objects loaded!");
    } else {
      this.showMessage("All objects placed — begin investigation!");
    }
  }
// Put this **inside the KitchenScene class**, anywhere before `checkObjectRaycast`
getFirstMaterial(obj) {
  if (obj.isMesh && obj.material) return obj.material;
  if (obj.children) {
    for (const child of obj.children) {
      if (child.isMesh && child.material) return child.material;
    }
  }
  return null;
}
  // ————————————————————————————————————————————————————————————————
  // HUD MESSAGE — BELOW CROSSHAIR
  // ————————————————————————————————————————————————————————————————
  showMessage(msg) {
    const old = document.getElementById("hud-message");
    if (old) old.remove();

    if (!msg) return;

    const message = document.createElement("div");
    message.id = "hud-message";
    message.style.cssText = `
      position: fixed; bottom: 22%; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85); color: #ff6600; padding: 14px 35px;
      border-radius: 12px; font-size: 22px; font-weight: bold;
      z-index: 9998; pointer-events: none; border: 2px solid #ffaa00;
      box-shadow: 0 0 18px rgba(255,102,0,0.7); text-shadow: 0 0 8px #ff6600;
    `;
    message.textContent = msg;
    document.body.appendChild(message);

    setTimeout(() => message.remove(), 3000);
  }

  createCombatHUD() {
    this.combatHUD = document.createElement("div");
    this.combatHUD.style.cssText = `
      position: fixed; bottom: 28%; left: 50%; transform: translateX(-50%);
      color: white; font-family: 'Courier New', monospace;
      font-size: 20px; font-weight: bold; text-align: center;
      background: rgba(100, 0, 0, 0.8); padding: 12px 30px;
      border-radius: 10px; border: 2px solid #ff0000;
      z-index: 8999; pointer-events: none; min-width: 200px;
      box-shadow: 0 0 15px rgba(255, 0, 0, 0.6);
    `;
    this.updateCombatHUD();
    document.body.appendChild(this.combatHUD);
  }

  updateCombatHUD() {
    if (!this.combatHUD) return;
    const hitMarks = "●".repeat(3 - this.combatTargetHealth) + "○".repeat(this.combatTargetHealth);
    const missMarks = "●".repeat(this.combatMisses) + "○".repeat(3 - this.combatMisses);
    this.combatHUD.innerHTML = `
      <div style="color: #00ff00; margin: 4px;">HITS: ${hitMarks}</div>
      <div style="color: #ff0000; margin: 4px;">MISS: ${missMarks}</div>
    `;
  }

  // ————————————————————————————————————————————————————————————————
  // INTRO & INVESTIGATION
  // ————————————————————————————————————————————————————————————————
  startIntroPhase() {
    this.currentPhase = "intro";
    this.showMessage("You've been hit! There's something wrong here...");
    this.player.takeDamage(1);
    this.flashScreen(0xff0000, 0.8);
    this.blurScreen(true);

    setTimeout(() => {
      this.blurScreen(false);
      this.showMessage("Not everything in this kitchen is what it seems.");
      setTimeout(() => {
        this.showMessage("Find the possessed objects before it's too late!");
        setTimeout(() => {
          this.currentPhase = "investigation";
          this.createObjectiveHUD();
          this.showInvestigationInstructions();
        }, 3000);
      }, 3000);
    }, 2000);
  }

  blurScreen(enable) {
    if (enable) {
      document.body.style.filter = "blur(5px)";
      setTimeout(() => {
        document.body.style.transition = "filter 1s";
        document.body.style.filter = "blur(0px)";
      }, 100);
    } else {
      document.body.style.filter = "blur(0px)";
    }
  }

  showInvestigationInstructions() {
    const instructions = document.createElement("div");
    instructions.id = "investigation-instructions";
    instructions.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95); padding: 40px 60px;
      border: 4px solid #ff6600; border-radius: 20px;
      color: white; font-family: 'Arial Black', Arial, sans-serif;
      text-align: center; z-index: 10000;
      box-shadow: 0 0 30px rgba(255, 102, 0, 0.6);
    `;

    instructions.innerHTML = `
      <h2 style="color: #ff6600; margin-bottom: 25px; font-size: 32px; text-shadow: 0 0 10px #ff6600;">
        INVESTIGATION PHASE
      </h2>
      <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <p style="font-size: 18px; margin: 10px 0;">Aim at objects with your crosshair</p>
        <p style="font-size: 18px; margin: 10px 0;">Possessed objects will glow with purple energy</p>
        <p style="font-size: 20px; margin: 10px 0; font-weight: bold;">LEFT CLICK to select an object</p>
      </div>
      <div style="background: rgba(255, 0, 0, 0.2); padding: 15px; border-radius: 10px; border: 2px solid #ff0000;">
        <p style="font-size: 16px; color: #ff6666; margin: 0;">
          Wrong choices cost health! Choose wisely!
        </p>
        <p style="font-size: 14px; color: #ffaaaa; margin: 5px 0 0 0;">
          You must find all 3 possessed objects to proceed
        </p>
      </div>
      <button id="start-investigation" style="
        margin-top: 25px; padding: 15px 40px; font-size: 20px;
        background: linear-gradient(to bottom, #ff8800, #ff4400);
        color: white; border: none; border-radius: 10px;
        cursor: pointer; font-weight: bold;
        box-shadow: 0 4px 15px rgba(255, 68, 0, 0.5);
        transition: all 0.3s;
      ">START INVESTIGATION</button>
    `;

    document.body.appendChild(instructions);

    const btn = document.getElementById("start-investigation");
    btn.onmouseover = () => {
      btn.style.transform = "scale(1.1)";
      btn.style.boxShadow = "0 6px 20px rgba(255, 68, 0, 0.8)";
    };
    btn.onmouseout = () => {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 4px 15px rgba(255, 68, 0, 0.5)";
    };
    btn.onclick = () => {
      instructions.remove();
      if (!document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    };
  }

  createObjectiveHUD() {
    this.objectiveHUD = document.createElement("div");
    this.objectiveHUD.style.cssText = `
      position: fixed; top: 80px; left: 20px;
      color: #ffff00; font-family: Arial, sans-serif;
      font-size: 18px; font-weight: bold;
      background: rgba(0, 0, 0, 0.8); padding: 15px 25px;
      border-radius: 10px; border: 3px solid #ffaa00;
      box-shadow: 0 0 20px rgba(255, 170, 0, 0.5);
      z-index: 1000;
    `;
    this.updateObjectiveHUD();
    document.body.appendChild(this.objectiveHUD);
  }

  updateObjectiveHUD() {
    if (!this.objectiveHUD) return;
    const remaining = this.objectsToDestroy - this.objectsDestroyed;
    this.objectiveHUD.innerHTML = `
      Possessed Objects: 
      <span style="font-size: 24px; color: ${remaining > 0 ? '#ffff00' : '#00ff00'};">
        ${remaining}
      </span> remaining
    `;
  }

  flashScreen(color, duration) {
    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background-color: #${color.toString(16).padStart(6, '0')};
      opacity: 0.6; pointer-events: none; z-index: 9999;
    `;
    document.body.appendChild(flash);

    setTimeout(() => {
      flash.style.transition = "opacity 0.4s";
      flash.style.opacity = "0";
      setTimeout(() => document.body.removeChild(flash), 400);
    }, duration * 1000);
  }

  // ————————————————————————————————————————————————————————————————
  // INVESTIGATION RAYCAST
  // ————————————————————————————————————————————————————————————————
checkObjectRaycast() {
  if (this.currentPhase !== "investigation") return;

  this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
  
  // Raycast against ALL scene objects to catch GLTF model meshes
  const intersects = this.raycaster.intersectObjects(this.scene.children, true);

  // Reset all objects first
  this.interactiveObjects.forEach(obj => {
    if (!obj.userData.isHovered) {
      obj.userData.glowIntensity = Math.max(0, obj.userData.glowIntensity - 0.1);
      
      // Reset emissive for all child meshes
      obj.traverse(child => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            if (mat.emissive) {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          });
        }
      });
    }
    obj.userData.isHovered = false;
  });

  this.selectedObject = null;

  // Find the interactive object from the intersection
  if (intersects.length > 0) {
    let targetObj = null;
    
    // Walk up the hierarchy to find the interactive root object
    for (const intersection of intersects) {
      let current = intersection.object;
      while (current && current !== this.scene) {
        if (this.interactiveObjects.includes(current)) {
          targetObj = current;
          break;
        }
        current = current.parent;
      }
      if (targetObj) break;
    }

    if (targetObj && targetObj.userData.isInteractive) {
      const obj = targetObj;
      obj.userData.isHovered = true;
      obj.userData.glowIntensity = Math.min(1.2, obj.userData.glowIntensity + 0.2);

      const emissiveColor = obj.userData.isPossessed ? 0x660066 : 0x006600;
      const crosshairColor = obj.userData.isPossessed ? '#aa66ff' : '#66ff66';

      // Apply emissive to ALL child meshes in the GLTF model
      obj.traverse(child => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            if (mat.emissive) {
              mat.emissive.setHex(emissiveColor);
              mat.emissiveIntensity = obj.userData.glowIntensity * 0.9;
            }
          });
        }
      });

      this.updateCrosshair(crosshairColor, 8);
      this.selectedObject = obj;
      this.showObjectHint(obj.userData.objectName);
    } else {
      this.hideObjectHint();
      this.updateCrosshair('rgba(255, 255, 255, 0.8)', 4);
    }
  } else {
    this.hideObjectHint();
    this.updateCrosshair('rgba(255, 255, 255, 0.8)', 4);
  }
}


showObjectHint(name) {
  let hint = document.getElementById("object-hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "object-hint";
    hint.style.cssText = `
      position: fixed; bottom: 25%; left: 50%; transform: translateX(-50%);
      color: white; font-size: 22px; font-weight: bold;
      background: rgba(0, 0, 0, 0.9); padding: 15px 30px;
      border-radius: 12px; pointer-events: none; z-index: 9998;
      border: 3px solid #ff6600;
      box-shadow: 0 0 20px rgba(255, 102, 0, 0.7);
    `;
    document.body.appendChild(hint);
  }
  hint.innerHTML = `
    <span style="color: #ffaa00;">${name}</span><br>
    <span style="font-size: 16px; color: #aaaaaa;">Click to select</span>
  `;
}

  hideObjectHint() {
    const hint = document.getElementById("object-hint");
    if (hint) hint.remove();
  }
// handleObjectSelection()
handleObjectSelection() {
  if (!this.selectedObject || this.currentPhase !== "investigation") return;

  const obj = this.selectedObject;

 // ----- START HOVER IMMEDIATELY -----
 if (!obj.userData.isHovering) {
   obj.userData.isHovering = true;
   obj.userData.originalY = obj.position.y;           // keep start Y for later reset
   obj.userData.targetY   = obj.userData.hoverTargetY;
}

  if (obj.userData.isPossessed) {
    this.startObjectCombat(obj);
  } else {
    this.handleWrongChoice(obj);
  }

  this.selectedObject = null;
  this.hideObjectHint();
}

  // ————————————————————————————————————————————————————————————————
  // COMBAT
  // ————————————————————————————————————————————————————————————————
  startObjectCombat(obj) {
    this.currentPhase = "combat";
    this.combatActive = true;
    this.combatTarget = obj;
    this.combatTargetHealth = 3;
    this.combatMisses = 0;

    this.updateCrosshair('#ff0000', 10);
    window.removeEventListener('click', this.clickHandler);

    obj.userData.isLevitating = true;
    obj.userData.targetY = obj.position.y + 2.5;
    obj.userData.originalY = obj.position.y;
    this.addPossessedEyes(obj);
    this.pulseRedLighting();
    this.player.enterCombat();
    this.showMessage(`${obj.userData.objectName} is possessed! Shoot it 3 times!`);
    this.createCombatHUD();
    this.setupCombatShooting();
  }

  addPossessedEyes(obj) {
    const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 0.3, 0.45);
    obj.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 0.3, 0.45);
    obj.add(rightEye);

    const pupilGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.08);
    leftEye.add(leftPupil);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.08);
    rightEye.add(rightPupil);

    obj.userData.eyes = [leftEye, rightEye];
    obj.userData.pupils = [leftPupil, rightPupil];
  }

  pulseRedLighting() {
    this.atmosphericLights.forEach(light => {
      light.intensity = 0.8;
      light.color.setHex(0xff0000);
      setTimeout(() => {
        light.color.setHex(light.userData.originalColor || 0xff0055);
        light.intensity = 0;
      }, 500);
    });
    const original = this.mainLight.intensity;
    this.mainLight.intensity = 0.3;
    setTimeout(() => this.mainLight.intensity = original, 300);
  }

  setupCombatShooting() {
    this.originalPlayerShoot = this.player.shoot.bind(this.player);
    this.player.shoot = () => {
      if (!this.player.canShoot || !this.combatActive) return;
      this.player.canShoot = false;
      setTimeout(() => this.player.canShoot = true, this.player.shootCooldown);

      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const intersects = this.raycaster.intersectObject(this.combatTarget, true);

      if (intersects.length > 0) {
        this.combatTargetHealth--;
        this.updateCombatHUD();
        this.showFloatingText("HIT!", intersects[0].point, 0x00ff00);
        this.flashScreen(0x00ff00, 0.15);
        this.shakeObject(this.combatTarget);
        if (this.combatTargetHealth <= 0) this.defeatPossessedObject();
      } else {
        this.combatMisses++;
        this.updateCombatHUD();
        const missPos = this.combatTarget.position.clone();
        missPos.x += 2;
        this.showFloatingText("MISS!", missPos, 0xff0000);
        if (this.combatMisses >= 3) this.objectEscaped();
      }
      this.createShootTracer();
    };
  }

  showFloatingText(text, worldPosition, color) {
    const screenPos = worldPosition.clone();
    screenPos.project(this.camera);
    // Offset to upper-right to avoid blocking view
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth + 150;
    const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight - 100;

    const floatingText = document.createElement("div");
    floatingText.textContent = text;
    floatingText.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px; transform: translate(-50%, -50%);
      color: #${color.toString(16).padStart(6, '0')}; font-size: 40px; font-weight: bold;
      font-family: Arial, sans-serif; text-shadow: 3px 3px 6px rgba(0,0,0,0.9);
      pointer-events: none; z-index: 9999;
      animation: floatUpSide 1s ease-out forwards;
    `;

    const style = document.createElement('style');
    style.textContent = `@keyframes floatUpSide { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { transform: translate(-50%, -200%) scale(1.8); opacity: 0; } }`;
    if (!document.head.querySelector('style[data-float-animation]')) {
      style.setAttribute('data-float-animation', 'true');
      document.head.appendChild(style);
    }

    document.body.appendChild(floatingText);
    setTimeout(() => floatingText.remove(), 1000);
  }

  shakeObject(obj) {
    const originalPos = obj.position.clone();
    let shakeCount = 0;
    const interval = setInterval(() => {
      obj.position.x = originalPos.x + (Math.random() - 0.5) * 0.2;
      obj.position.z = originalPos.z + (Math.random() - 0.5) * 0.2;
      shakeCount++;
      if (shakeCount > 10) {
        clearInterval(interval);
        obj.position.copy(originalPos);
      }
    }, 50);
  }

  createShootTracer() {
    const gunPosition = new THREE.Vector3();
    this.player.gun.getWorldPosition(gunPosition);
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const endPoint = gunPosition.clone().add(direction.multiplyScalar(50));

    const geometry = new THREE.BufferGeometry().setFromPoints([gunPosition, endPoint]);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
      material.dispose();
    }, 100);
  }

  defeatPossessedObject() {
    if (!this.combatTarget) return;
    this.showMessage("Possessed object destroyed!");
    this.createExplosionEffect(this.combatTarget.position);
    this.scene.remove(this.combatTarget);
    this.interactiveObjects = this.interactiveObjects.filter(o => o !== this.combatTarget);
    this.combatTarget = null;
    this.combatActive = false;
    this.objectsDestroyed++;

    if (this.combatHUD) this.combatHUD.remove();
    this.player.shoot = this.originalPlayerShoot;
    this.player.exitCombat();
    this.updateCrosshair('rgba(255, 255, 255, 0.8)', 4);
    this.updateObjectiveHUD();

    setTimeout(() => {
      if (this.objectsDestroyed >= this.objectsToDestroy) {
        this.startBossPhase();
      } else {
        this.currentPhase = "investigation";
        this.showMessage(`${this.objectsToDestroy - this.objectsDestroyed} possessed objects remain!`);
        window.addEventListener('click', this.clickHandler);
      }
    }, 2000);
  }



  handleWrongChoice(obj) {
    this.showMessage(`${obj.userData.objectName} wasn't possessed!`);
    this.player.takeDamage(1);
    this.createSmokeEffect(obj.position);
    this.flashScreen(0xff0000, 0.4);
    setTimeout(() => {
      this.scene.remove(obj);
      this.interactiveObjects = this.interactiveObjects.filter(o => o !== obj);
    }, 500);
    if (this.player.health.current <= 0) this.handleGameOver();
  }

  createExplosionEffect(position) {
    const particles = [];
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.SphereGeometry(0.12, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xff6600 : i % 3 === 1 ? 0xffff00 : 0xff0000 });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      p.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.4, (Math.random() - 0.5) * 0.4);
      p.userData.gravity = -0.02;
      this.scene.add(p);
      particles.push(p);
    }
    let t = 0;
    const animate = () => {
      t++;
      particles.forEach(p => {
        p.position.add(p.userData.velocity);
        p.userData.velocity.y += p.userData.gravity;
        p.scale.multiplyScalar(0.95);
      });
      if (t < 60) requestAnimationFrame(animate);
      else particles.forEach(p => this.scene.remove(p));
    };
    animate();
  }

  createSmokeEffect(position) {
    for (let i = 0; i < 15; i++) {
      const smokeGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const smokeMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7 });
      const smoke = new THREE.Mesh(smokeGeo, smokeMat);
      smoke.position.copy(position);
      smoke.position.x += (Math.random() - 0.5) * 0.5;
      smoke.position.z += (Math.random() - 0.5) * 0.5;
      smoke.userData.lifetime = 0;
      smoke.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.02, 0.05 + Math.random() * 0.05, (Math.random() - 0.5) * 0.02);
      this.scene.add(smoke);
      this.smokeParticles.push(smoke);
    }
  }

  // ————————————————————————————————————————————————————————————————
  // BOSS FIGHT — 100% CONSISTENT WITH LOBBY
  // ————————————————————————————————————————————————————————————————
startBossPhase() {
  this.currentPhase = "boss";
  this.showMessage("All possessed objects destroyed!");

  // ————————————————————————————————————————————————————————————————
  // 2. PRE-BATTLE CUTSCENE — runs while boss loads
  // ————————————————————————————————————————————————————————————————
  this.cutscene.play(level3PreBattle).then(() => {
    this.showMessage("You sense an evil presence from the oven...");
    this.ovenLight.intensity = 3.0;
    this.ovenLight.color.setHex(0xff0000);
    this.createRedMist();
    setTimeout(() => {
      this.showMessage("THE KITCHEN GHOST EMERGES!");
      this.spawnKitchenGhost();
    }, 3000);
  });
}
  createRedMist() {
    for (let i = 0; i < 30; i++) {
      const mistGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const mistMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.4 });
      const mist = new THREE.Mesh(mistGeo, mistMat);
      mist.position.set((Math.random() - 0.5) * 3, Math.random() * 2, -7 + Math.random() * 2);
      mist.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.02, 0.02 + Math.random() * 0.03, 0.02 + Math.random() * 0.02);
      mist.userData.lifetime = 0;
      this.scene.add(mist);
      this.smokeParticles.push(mist);
    }
  }

  spawnKitchenGhost() {
    const spawnPosition = new THREE.Vector3(0, 2, -5);
    this.kitchenGhost = new KitchenGhost(this.scene, this.player, this.hud || this.player.hud, this.physics, spawnPosition);
    this.scene.userData.kitchenGhost = this.kitchenGhost;
    this.scene.userData.kitchenScene = this;

    this.player.enterCombat();
    this.snapCameraToBoss();
    this.bossHealthFill = (this.hud || this.player.hud).createHealthBar("Kitchen Ghost", 100, "orange");
    this.showMessage("The Kitchen Ghost appears! Defeat it!");
    setTimeout(() => this.showMessage(""), 3000);

    if (this.objectiveHUD) {
      this.objectiveHUD.remove();
      this.objectiveHUD = null;
    }
  }

  updateBossHealth() {
    if (!this.bossHealthFill || !this.kitchenGhost) return;
    const percent = (this.kitchenGhost.health / this.kitchenGhost.maxHealth) * 100;
    this.bossHealthFill.style.width = percent + "%";

    if (this.kitchenGhost.isChasing && !this.kitchenGhost.chaseMessageShown) {
      this.kitchenGhost.chaseMessageShown = true;
      this.showMessage("The boss is now chasing you! Keep your distance!");
      setTimeout(() => this.showMessage(""), 3000);
    }
  }

  checkPlayerHit() {
    if (this.gameOver || !this.kitchenGhost || !this.kitchenGhost.projectiles || !this.player.ghost) return;
    if (this.player.health.current <= 0 || this.player._isDead) return;

    const playerPos = this.player.ghost.position;
    const hitRadius = 1.0;

    for (let i = this.kitchenGhost.projectiles.length - 1; i >= 0; i--) {
      const proj = this.kitchenGhost.projectiles[i];
      if (proj.position.distanceTo(playerPos) < hitRadius) {
        this.scene.remove(proj);
        this.kitchenGhost.projectiles.splice(i, 1);
        this.player.takeDamage(1);

        const flash = document.createElement("div");
        flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.3);pointer-events:none;z-index:9999;`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 200);
      }
    }
  }

handleBossDefeat() {
  if (this.kitchenGhost.defeatedHandled) return;
  this.kitchenGhost.defeatedHandled = true;

  console.log("handleBossDefeat called!");

  this.currentPhase = "complete";
  this.showMessage("VICTORY! The Kitchen Ghost has been defeated!");
  this.player.exitCombat();

  // Clean up combat UI
  if (this.bossHealthFill && this.bossHealthFill.parentElement) {
    const healthBar = this.bossHealthFill.parentElement.parentElement;
    if (healthBar && healthBar.parentElement) {
      healthBar.remove();
    }
  }

  this.ovenLight.intensity = 0.8;
  this.ovenLight.color.setHex(0xff4400);

  // ————————————————————————————————————————————————————————————————
  // 3. VICTORY CUTSCENE — runs before reward
  // ————————————————————————————————————————————————————————————————
  this.cutscene.play(level3postBattle).then(() => {
    this.showMessage("The Chef Ghost appears, freed from possession!");
    this.showChefGhostCutscene();
  });
}

  showChefGhostCutscene() {
    const cutscene = document.createElement("div");
    cutscene.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.9); display: flex;
      flex-direction: column; justify-content: center; align-items: center;
      z-index: 10000; color: white; font-family: Arial, sans-serif;
      text-align: center;
    `;

    cutscene.innerHTML = `
      <div style="font-size: 80px; margin-bottom: 20px;">👨‍🍳</div>
      <h2 style="font-size: 36px; color: #ffaa00; margin-bottom: 20px;">
        Chef Ghost
      </h2>
      <p style="font-size: 20px; max-width: 600px; line-height: 1.6; margin-bottom: 30px;">
        "Thank you for freeing me! That evil spirit had possessed my kitchen.
        Take this Stand Mixer as a token of my gratitude. It may help you on your journey..."
      </p>
      <div id="reward-animation" style="font-size: 64px; animation: bounce 1s infinite;">
        🎛️
      </div>
    `;

    document.body.appendChild(cutscene);

    setTimeout(() => {
      cutscene.remove();
      this.giveStandMixer();
    }, 5000);
  }

  giveStandMixer() {
    const mixerItem = {
      name: "Stand Mixer",
      description: "A powerful kitchen tool imbued with chef's spirit. Press E to use.",
      iconEmoji: "🎛️",
      onUse: () => {
        this.showMessage("The Stand Mixer hums with mysterious power...");
      }
    };
    this.inventory.addItem(mixerItem);
    this.showMessage("Obtained: Stand Mixer!");
    setTimeout(() => this.showVictoryScreen(), 2000);
  }

showVictoryScreen() {
  const victory = document.createElement("div");
  victory.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(to bottom, #001a00, #003300);
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    z-index: 10000; font-family: Arial, sans-serif;
  `;

  victory.innerHTML = `
    <h1 style="color: #00ff00; font-size: 72px; margin-bottom: 20px; text-shadow: 0 0 20px #00ff00;">
      KITCHEN CLEARED!
    </h1>
    <p style="color: white; font-size: 24px; margin-bottom: 40px;">
      The haunted kitchen has been restored!
    </p>
    <div style="background: rgba(0, 0, 0, 0.7); padding: 30px; border-radius: 15px; margin-bottom: 30px;">
      <p style="color: #ffaa00; font-size: 20px; margin: 10px 0;">
        Possessed Objects Destroyed: 3/3
      </p>
      <p style="color: #ffaa00; font-size: 20px; margin: 10px 0;">
        Kitchen Ghost Defeated
      </p>
      <p style="color: #00ff00; font-size: 20px; margin: 10px 0;">
        Stand Mixer Obtained
      </p>
    </div>
    <button id="continue-btn" style="
      padding: 20px 50px; font-size: 24px; font-weight: bold;
      background: linear-gradient(to bottom, #00aa00, #00ff00);
      color: white; border: none; border-radius: 12px;
      cursor: pointer; box-shadow: 0 5px 20px rgba(0, 255, 0, 0.5);
    ">CONTINUE</button>
  `;

  document.body.appendChild(victory);
  
  const continueBtn = document.getElementById("continue-btn");
  if (continueBtn) {
    continueBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("✅ Continue button clicked!");
      victory.remove();
      if (window.transitionToNextLevel) {
        window.transitionToNextLevel();
      } else {
        console.log("No transition function found");
      }
    };
  }
}

handleGameOver() {
  if (this.gameOver) return; // Prevent multiple calls
  
  this.gameOver = true;
  this.currentPhase = "gameover";
  
  console.log("💀 Game Over triggered!");
  
  // Stop all player actions
  if (this.player) {
    this.player.canShoot = false;
    if (this.player.combatMode) {
      this.player.exitCombat();
    }
  }
  
  // Dramatic screen effects
  this.flashScreen(0xff0000, 1.5);
  this.createDeathParticles();
  
  this.showMessage("You've been defeated!");
  
  // Show restart menu after delay
  setTimeout(() => {
    this.showRestartMenu();
  }, 1500);
}

// NEW: Create death particle explosion
createDeathParticles() {
  if (!this.player.ghost) return;
  const pos = this.player.ghost.position.clone();
  
  // Red explosion particles
  for (let i = 0; i < 50; i++) {
    const geo = new THREE.SphereGeometry(0.15, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ 
      color: i % 2 === 0 ? 0xff0000 : 0xffaa00 
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 0.5,
      (Math.random() - 0.5) * 0.5
    );
    p.userData.gravity = -0.015;
    p.userData.lifetime = 0;
    this.scene.add(p);
    this.smokeParticles.push(p);
  }
}

// NEW: Enhanced restart menu with stats
restartKitchen() {
  console.log("🔄 Restarting Kitchen Scene (self-contained)...");
  
  // Remove the game over overlay
  const overlay = document.getElementById("restart-menu-overlay");
  if (overlay) overlay.remove();
  
  // Reset game state flags
  this.gameOver = false;
  this.currentPhase = "intro";
  this.objectsDestroyed = 0;
  this.combatActive = false;
  this.combatTarget = null;
  this.combatTargetHealth = 3;
  this.combatMisses = 0;
  this.selectedObject = null;
  
  // Clean up UI elements
  if (this.objectiveHUD) {
    this.objectiveHUD.remove();
    this.objectiveHUD = null;
  }
  if (this.combatHUD) {
    this.combatHUD.remove();
    this.combatHUD = null;
  }
  const hint = document.getElementById("object-hint");
  if (hint) hint.remove();
  
  // Clean up boss if exists
  if (this.kitchenGhost) {
    if (this.kitchenGhost.mesh) {
      this.scene.remove(this.kitchenGhost.mesh);
    }
    if (this.kitchenGhost.projectiles) {
      this.kitchenGhost.projectiles.forEach(proj => {
        if (proj.parent) this.scene.remove(proj);
      });
    }
    this.kitchenGhost = null;
    this.scene.userData.kitchenGhost = null;
  }
  
  // Remove boss health bar
  if (this.bossHealthFill && this.bossHealthFill.parentElement) {
    const healthBar = this.bossHealthFill.parentElement.parentElement;
    if (healthBar && healthBar.parentElement) {
      healthBar.remove();
    }
    this.bossHealthFill = null;
  }
  
  // Clean up all interactive objects
  this.interactiveObjects.forEach(obj => {
    if (obj.parent) this.scene.remove(obj);
  });
  this.interactiveObjects = [];
  this.possessedObjects = [];
  this.correctPossessedIndices = [];
  
  // Clean up all particles
  this.smokeParticles.forEach(smoke => {
    if (smoke.parent) this.scene.remove(smoke);
  });
  this.smokeParticles = [];
  
  // Reset player (but don't reload models)
  if (this.player) {
    this.player.health.current = this.player.health.max;
    this.player._isDead = false;
    this.player.canShoot = true;
    
    // Reset player position
    if (this.player.ghost) {
      this.player.ghost.position.set(0, 0.8, 5);
      this.player.ghost.rotation.set(0, 0, 0);
    }
    
    // Update HUD
    if (this.player.hud) {
      this.player.hud.updatePlayerHearts(
        this.player.health.current,
        this.player.health.max
      );
    }
    
    // Exit combat mode if active
    if (this.player.combatMode) {
      this.player.exitCombat();
    }
  }
  
  // Reset lighting
  this.ovenLight.intensity = 1.2;
  this.ovenLight.color.setHex(0xff4400);
  this.mainLight.intensity = 1.8;
  
  // Reset atmospheric lights
  this.atmosphericLights.forEach(light => {
    light.intensity = 0;
    light.userData.targetIntensity = 0;
  });
  
  // Recreate interactive objects
  console.log("♻️ Recreating interactive objects...");
  this.createInteractiveObjects().then(() => {
    console.log("✅ Kitchen scene restarted!");
    
    // Restart the intro sequence
    setTimeout(() => {
      this.startIntroPhase();
    }, 500);
  });
  
  // Re-enable mouse click handler for investigation
  if (!this.clickHandler) {
    this.setupMouseInteraction();
  }
  
  // Request pointer lock
  setTimeout(() => {
    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
    }
  }, 1000);
}

// Helper methods (keep these as they are)
getDeathMessage() {
  const messages = [
    "The possessed objects were too strong!",
    "You couldn't withstand the kitchen's curse!",
    "The Kitchen Ghost's power overwhelmed you!",
    "Your investigation came to a tragic end!",
    "The haunted kitchen has claimed you!"
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

getRandomTip() {
  const tips = [
    "Hover over objects to see if they glow purple - those are possessed!",
    "Each wrong choice costs you health. Choose carefully!",
    "Missing 3 shots lets the object escape AND costs health!",
    "Destroy all 3 possessed objects to face the Kitchen Ghost!",
    "Keep your distance from the boss when it starts chasing you!",
    "Watch for the object's glow when you aim at it!"
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

// NEW: Random death messages
getDeathMessage() {
  const messages = [
    "The possessed objects were too strong!",
    "You couldn't withstand the kitchen's curse!",
    "The Kitchen Ghost's power overwhelmed you!",
    "Your investigation came to a tragic end!",
    "The haunted kitchen has claimed you!"
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// NEW: Random gameplay tips
getRandomTip() {
  const tips = [
    "Hover over objects to see if they glow purple - those are possessed!",
    "Each wrong choice costs you health. Choose carefully!",
    "Missing 3 shots lets the object escape AND costs health!",
    "Destroy all 3 possessed objects to face the Kitchen Ghost!",
    "Keep your distance from the boss when it starts chasing you!",
    "Watch for the object's glow when you aim at it!"
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}



  snapCameraToBoss() {
    if (!this.kitchenGhost || !this.player.ghost) return;
    const playerPos = this.player.ghost.position;
    const bossPos = this.kitchenGhost.mesh.position;
    const dx = bossPos.x - playerPos.x;
    const dz = bossPos.z - playerPos.z;
    const dy = bossPos.y - playerPos.y;
    const yaw = Math.atan2(-dx, -dz);
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const pitch = Math.atan2(dy, horizontalDist);
    this.cameraSnapTarget = { yaw, pitch };
    this.cameraSnapActive = true;
  }

  getCameraSnapRotation() {
    if (this.cameraSnapActive && this.cameraSnapTarget) {
      this.cameraSnapActive = false;
      return this.cameraSnapTarget;
    }
    return null;
  }

  updateDynamicLighting(time) {
    this.mainLight.intensity = 0.7 + Math.sin(time * 8 + Math.sin(time * 3)) * 0.15;
    this.ovenLight.intensity = 1.5 + Math.sin(time * 2) * 0.3;
    this.stoveLights.forEach((light, i) => {
      light.intensity = 0.8 + Math.sin(time * 10 + i * 2) * 0.4;
    });
    this.hangingLights.forEach((light, i) => {
      const sway = Math.sin(time * 1.5 + i) * 0.15;
      light.position.x = -5 + i * 5 + sway;
    });
    this.atmosphericLights.forEach((light, i) => {
      const pulse = Math.sin(time * light.userData.pulseSpeed + i * 2);
      light.intensity = Math.max(0, pulse * 0.3);
    });
    this.fridgeLight.intensity = 0.5 + Math.sin(time * 4) * 0.1;
  }
  // ---------------------------------------------------------------
// Add this helper inside KitchenScene (anywhere before updateInteractiveObjects)
// ---------------------------------------------------------------
getObjectMaterial(obj) {
  if (obj.isMesh && obj.material instanceof THREE.MeshStandardMaterial) {
    return obj.material;
  }
  if (obj.children) {
    for (const child of obj.children) {
      if (child.isMesh && child.material instanceof THREE.MeshStandardMaterial) {
        return child.material;
      }
    }
  }
  return null;
}

updateInteractiveObjects(delta, time) {
  this.interactiveObjects.forEach(obj => {
    // Combat levitation
    if (obj.userData.isLevitating) {
      obj.position.y += (obj.userData.targetY - obj.position.y) * 0.08;
      obj.rotation.y += delta * 2.5;
      obj.rotation.x = Math.sin(time * 3) * 0.3;
      obj.rotation.z = Math.cos(time * 2.5) * 0.3;
      if (obj.userData.eyes && this.player.ghost) {
        const lookTarget = this.player.ghost.position.clone();
        obj.userData.eyes.forEach(eye => eye.lookAt(lookTarget));
      }
    }
    
    // Escaping objects
    if (obj.userData.isEscaping) {
      obj.position.add(obj.userData.escapeVelocity);
      obj.userData.escapeVelocity.y -= 0.01;
      obj.rotation.y += delta * 15;
      obj.rotation.x += delta * 10;
      obj.scale.multiplyScalar(0.98);
    }
    
    // NO AUTOMATIC GLOW - objects only glow when hovered during investigation
    // This makes the game harder - player must guess!
  });
}
objectEscaped() {
  if (!this.combatTarget) return;
  
  console.log("🏃 Object escaped!");
  console.log("Was possessed:", this.combatTarget.userData.isPossessed);
  console.log("Before escape - objectsDestroyed:", this.objectsDestroyed);
  
  const wasPossessed = this.combatTarget.userData.isPossessed;
  const obj = this.combatTarget;
  
  // Visual feedback
  this.showMessage("The object escaped!");
  obj.userData.isEscaping = true;
  obj.userData.escapeVelocity = new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.5, 0.5);
  
  setTimeout(() => {
    this.scene.remove(obj);
    this.interactiveObjects = this.interactiveObjects.filter(o => o !== obj);
  }, 1500);
  
  // Clear combat state
  this.combatTarget = null;
  this.combatActive = false;
  
  if (this.combatHUD) this.combatHUD.remove();
  this.player.shoot = this.originalPlayerShoot;
  this.player.exitCombat();
  this.updateCrosshair('rgba(255, 255, 255, 0.8)', 4);
  
  // ALWAYS take damage for missing 3 times
  this.player.takeDamage(1);
  this.flashScreen(0xff0000, 0.4);
  
  // If it was possessed, count it as dealt with
  if (wasPossessed) {
    this.objectsDestroyed++;
    console.log("After escape - objectsDestroyed:", this.objectsDestroyed);
    this.updateObjectiveHUD();
  }
  
  setTimeout(() => {
    // Check health first
    if (this.player.health.current <= 0) {
      console.log("Player died!");
      this.handleGameOver();
      return;
    }
    
    // Check if all possessed objects are gone
    if (this.objectsDestroyed >= this.objectsToDestroy) {
      console.log("All possessed objects dealt with - starting boss!");
      this.startBossPhase();
    } else {
      console.log(`${this.objectsToDestroy - this.objectsDestroyed} possessed objects remain`);
      this.currentPhase = "investigation";
      this.showMessage(`${this.objectsToDestroy - this.objectsDestroyed} possessed objects remain!`);
      window.addEventListener('click', this.clickHandler);
    }
  }, 2000);
}

setupCombatShooting() {
  this.originalPlayerShoot = this.player.shoot.bind(this.player);
  this.player.shoot = () => {
    if (!this.player.canShoot || !this.combatActive) return;
    this.player.canShoot = false;
    setTimeout(() => this.player.canShoot = true, this.player.shootCooldown);

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObject(this.combatTarget, true);

    if (intersects.length > 0) {
      this.combatTargetHealth--;
      console.log("HIT! Target health:", this.combatTargetHealth);
      this.updateCombatHUD();
      this.showFloatingText("HIT!", intersects[0].point, 0x00ff00);
      this.flashScreen(0x00ff00, 0.15);
      this.shakeObject(this.combatTarget);
      if (this.combatTargetHealth <= 0) this.defeatPossessedObject();
    } else {
      this.combatMisses++;
      console.log("MISS! Total misses:", this.combatMisses);
      this.updateCombatHUD();
      const missPos = this.combatTarget.position.clone();
      missPos.x += 2;
      this.showFloatingText("MISS!", missPos, 0xff0000);
      
      // Check if 3 misses reached
      if (this.combatMisses >= 3) {
        console.log("3 MISSES - OBJECT ESCAPING!");
        this.objectEscaped();
      }
    }
    this.createShootTracer();
  };
}


  updateParticles(delta) {
    this.smokeParticles = this.smokeParticles.filter(smoke => {
      smoke.userData.lifetime += delta;
      smoke.position.add(smoke.userData.velocity);
      smoke.scale.multiplyScalar(1 + delta * 0.5);
      smoke.material.opacity -= delta * 0.5;
      if (smoke.userData.lifetime > 2 || smoke.material.opacity <= 0) {
        this.scene.remove(smoke);
        return false;
      }
      return true;
    }); 

    this.steamParticles.forEach(steam => {
      steam.position.add(steam.userData.velocity);
      steam.userData.lifetime += delta;
      if (steam.position.y > 5) {
        steam.position.y = 0.5;
        steam.position.x = -6 + Math.random() * 4;
        steam.position.z = -6 + Math.random() * 2;
        steam.userData.lifetime = 0;
      }
      steam.material.opacity = 0.3 * (1 - steam.position.y / 5);
    });
    if (this.dustParticles) {
  this.dustParticles.forEach(dust => {
    dust.position.add(dust.userData.velocity);
    
    // Wrap around boundaries
    if (dust.position.x > 10) dust.position.x = -10;
    if (dust.position.x < -10) dust.position.x = 10;
    if (dust.position.y > 6) dust.position.y = 0;
    if (dust.position.y < 0) dust.position.y = 6;
    if (dust.position.z > 7) dust.position.z = -7;
    if (dust.position.z < -7) dust.position.z = 7;
  });
}
  }

// Replace the updateWithCameraRotation function with this:
updateWithCameraRotation(yaw, pitch) {
  const delta = this.clock.getDelta();
  const time = this.clock.elapsedTime;

  if (this.gameOver) {
    this.renderer.render(this.scene, this.camera);
    return;
  }

  this.player.update();

  if (this.currentPhase === "investigation") {
    this.checkObjectRaycast();
  }

  this.updateInteractiveObjects(delta, time);
  this.updateParticles(delta);
  this.updateDynamicLighting(time);

  if (this.kitchenGhost && this.kitchenGhost.isAlive) {
    this.kitchenGhost.update(delta, time);
    this.updateBossHealth();
    this.checkPlayerHit();
  } else if (this.kitchenGhost && !this.kitchenGhost.isAlive && !this.kitchenGhost.defeatedHandled) {
    // FIXED: Boss was defeated, trigger victory
    console.log("🎉 Boss defeated - calling handleBossDefeat");
    this.handleBossDefeat();
  }

  this.renderer.render(this.scene, this.camera);
}

  update() {
    this.updateWithCameraRotation(0, 0);
  }

  cleanup() {
    if (this.mouseMoveHandler) window.removeEventListener('mousemove', this.mouseMoveHandler);
    if (this.clickHandler) window.removeEventListener('click', this.clickHandler);
    if (this.objectiveHUD) this.objectiveHUD.remove();
    if (this.combatHUD) this.combatHUD.remove();
    if (this.crosshair) this.crosshair.remove();
    const hint = document.getElementById("object-hint");
    if (hint) hint.remove();
    const instructions = document.getElementById("investigation-instructions");
    if (instructions) instructions.remove();
    console.log("Kitchen scene cleaned up");
  }
}