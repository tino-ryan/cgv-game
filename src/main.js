// src/main.js - UPDATED WITH BETTER KITCHEN INTEGRATION & SMOOTH CONTROLS
import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import LobbyScene from "./scenes/lobbyScene.js";
import HallwayScene from './scenes/hallwayScene.js';
import BathroomScene from './scenes/bathroomScene.js';
import KitchenScene from './scenes/kitchenScene.js';
import CutsceneManager from "./systems/cutsceneManager.js";
import { tutorialCutscene } from "./cutscenes/tutorialCutscene.js";

let renderer, camera, currentScene, lobbyScene, hallwayScene, bathroomScene, kitchenScene;

const mouseSensitivity = 0.0015; // Slightly reduced for smoother aiming

let yaw = 0;
let pitch = 0;

const yawObject = new THREE.Object3D();
const pitchObject = new THREE.Object3D();

// 🆕 SCENE SELECTION MENU
function createSceneSelectionMenu() {
  const overlay = document.createElement("div");
  overlay.id = "scene-select-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.95); display: flex; flex-direction: column;
    justify-content: center; align-items: center; z-index: 10001;
    font-family: Arial, sans-serif;
  `;

  const title = document.createElement("h1");
  title.textContent = "🎮 SCENE SELECTOR";
  title.style.cssText = "color: #00ff00; font-size: 48px; margin-bottom: 40px;";
  overlay.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.textContent = "Choose a scene to test:";
  subtitle.style.cssText = "color: white; font-size: 20px; margin-bottom: 30px;";
  overlay.appendChild(subtitle);

  const scenes = [
    { name: "Lobby (Tutorial + Boss)", key: "lobby" },
    { name: "Hallway (Puzzle)", key: "hallway" },
    { name: "Bathroom (Boss Fight)", key: "bathroom" },
    { name: "Kitchen (NEW - Possessed Objects)", key: "kitchen" }
  ];

  scenes.forEach(scene => {
    const btn = document.createElement("button");
    btn.textContent = scene.name;
    btn.style.cssText = `
      padding: 15px 40px; font-size: 20px; font-weight: bold; margin: 10px;
      color: white; background: #3366cc; border: 3px solid white;
      border-radius: 10px; cursor: pointer; transition: all 0.3s;
    `;
    btn.onmouseover = () => btn.style.background = "#5588ee";
    btn.onmouseout = () => btn.style.background = "#3366cc";
    btn.onclick = () => {
      document.body.removeChild(overlay);
      startScene(scene.key);
    };
    overlay.appendChild(btn);
  });

  const skipBtn = document.createElement("button");
  skipBtn.textContent = "Skip Menu (Normal Start)";
  skipBtn.style.cssText = `
    padding: 10px 30px; font-size: 16px; margin-top: 30px;
    color: #888; background: transparent; border: 2px solid #666;
    border-radius: 5px; cursor: pointer;
  `;
  skipBtn.onclick = () => {
    document.body.removeChild(overlay);
    startScene("lobby");
  };
  overlay.appendChild(skipBtn);

  document.body.appendChild(overlay);
}

async function startScene(sceneKey) {
  console.log(`🎬 Starting scene: ${sceneKey}`);

  // Play cutscene only for lobby
  if (sceneKey === "lobby") {
    const cutsceneContainer = document.createElement("div");
    cutsceneContainer.id = "cutscene-container";
    document.body.appendChild(cutsceneContainer);
    Object.assign(cutsceneContainer.style, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: "black", display: "none", flexDirection: "column",
      alignItems: "center", justifyContent: "center", zIndex: "1000",
      color: "white", textAlign: "center",
    });
    const cutsceneManager = new CutsceneManager("cutscene-container");
    await cutsceneManager.play(tutorialCutscene);
  }

  switch (sceneKey) {
    case "lobby":
      lobbyScene = new LobbyScene(renderer, camera);
      lobbyScene.scene.add(yawObject);
      currentScene = lobbyScene;
      break;

    case "hallway":
      hallwayScene = new HallwayScene(renderer, camera, null, new THREE.Vector3(0, 1.6, 5), { yaw: 0, pitch: 0 });
      hallwayScene.scene.add(yawObject);
      yawObject.position.set(0, 1.6, 5);
      currentScene = hallwayScene;
      break;

    case "bathroom":
      bathroomScene = new BathroomScene(renderer, camera, null, new THREE.Vector3(0, 1.6, 5), { yaw: 0, pitch: 0 });
      bathroomScene.scene.add(yawObject);
      yawObject.position.set(0, 1.6, 5);
      currentScene = bathroomScene;
      break;

    case "kitchen":
      kitchenScene = new KitchenScene(renderer, camera, null, new THREE.Vector3(0, 1.6, 5), { yaw: 0, pitch: 0 });
      kitchenScene.scene.add(yawObject);
      yawObject.position.set(0, 1.6, 5);
      currentScene = kitchenScene;
      break;
  }

  console.log(`✅ Scene loaded: ${sceneKey}`);
}

async function init() {
  renderer = initRenderer();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5);

  yawObject.add(pitchObject);
  pitchObject.add(camera);

  console.log("Renderer initialized:", renderer);
  console.log("Camera initialized:", camera);

  // 🆕 SHOW SCENE SELECTION MENU
  createSceneSelectionMenu();

  // Setup pointer lock
  document.body.addEventListener("dblclick", () => {
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
      console.log("Requesting pointer lock...");
    }
  });

  // Also request on single click if not locked
  document.body.addEventListener("click", () => {
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === document.body) {
      console.log("Pointer lock enabled");
    } else {
      console.log("Pointer lock disabled");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.pointerLockElement === document.body) {
      document.exitPointerLock();
    }
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === document.body) {
      yaw -= event.movementX * mouseSensitivity;
      pitch -= event.movementY * mouseSensitivity;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
  });

  const keys = {
    up: false, down: false, left: false, right: false,
    w: false, a: false, s: false, d: false,
  };

  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowUp": keys.up = true; break;
      case "ArrowDown": keys.down = true; break;
      case "ArrowLeft": keys.left = true; break;
      case "ArrowRight": keys.right = true; break;
      case "w": case "W": keys.w = true; break;
      case "a": case "A": keys.a = true; break;
      case "s": case "S": keys.s = true; break;
      case "d": case "D": keys.d = true; break;
      case "f": case "F":
        if (currentScene === lobbyScene && lobbyScene.serviceBell) {
          lobbyScene.pickupBell();
        }
        break;
      case "e": case "E":
        const selectedItem = currentScene.inventory?.getSelectedItem();
        if (selectedItem && selectedItem.onUse) {
          selectedItem.onUse();
        }
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "ArrowUp": keys.up = false; break;
      case "ArrowDown": keys.down = false; break;
      case "ArrowLeft": keys.left = false; break;
      case "ArrowRight": keys.right = false; break;
      case "w": case "W": keys.w = false; break;
      case "a": case "A": keys.a = false; break;
      case "s": case "S": keys.s = false; break;
      case "d": case "D": keys.d = false; break;
    }
  });

  function animate() {
    requestAnimationFrame(animate);

    if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
      if (currentScene) currentScene.update();
      return;
    }

    const snapRotation = currentScene.getCameraSnapRotation?.();
    if (snapRotation) {
      yaw = snapRotation.yaw;
      pitch = snapRotation.pitch;
      console.log("Camera snapped to target!");
    }

    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    if (currentScene instanceof LobbyScene || currentScene instanceof BathroomScene || currentScene instanceof KitchenScene) {
      // First-person controls
      yawObject.rotation.y = yaw;
      pitchObject.rotation.x = pitch;
      
      if (currentScene.player.combatMode) {
        yawObject.getWorldDirection(forward);
        forward.negate();
        forward.y = 0;
        forward.normalize();
        right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        right.negate();
      } else {
        forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
        right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
      }
      yawObject.position.copy(currentScene.player.ghost.position);
    } else if (currentScene instanceof HallwayScene) {
      yawObject.rotation.y = yaw;
      pitchObject.rotation.x = pitch;
      yawObject.position.copy(currentScene.player.ghost.position);
      
      if (currentScene.allowNormalMovement) {
        forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
        right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
      } else {
        currentScene.updateWithCameraRotation(yaw, pitch);
        return;
      }
    }

    // Movement
    const moveSpeed = 0.1;
    let moveVector = new THREE.Vector3();
    if (keys.up || keys.w) moveVector.add(forward);
    if (keys.down || keys.s) moveVector.add(forward.clone().multiplyScalar(-1));
    if (keys.left || keys.a) moveVector.add(right.clone().multiplyScalar(-1));
    if (keys.right || keys.d) moveVector.add(right);

    if (moveVector.length() > 0) {
      moveVector.normalize();
      const currentPos = currentScene.player.ghost.position;
      
      let finalMovement;
      if (currentScene.ghostTransitionActive) {
        finalMovement = moveVector.clone().multiplyScalar(moveSpeed);
      } else {
        finalMovement = currentScene.physics.getSafeMovement(currentPos, moveVector, moveSpeed);
      }
      
      currentScene.player.ghost.position.add(finalMovement);

      if (!currentScene.player.combatMode) {
        currentScene.player.ghost.rotation.y = Math.atan2(moveVector.z, -moveVector.x) + Math.PI;
      }
    }

    currentScene.updateWithCameraRotation(yaw, pitch);
  }
  
  animate();

  // Debug functions
  window.enterCombat = () => currentScene.player.enterCombat();
  window.exitCombat = () => currentScene.player.exitCombat();
  window.startBoss = () => currentScene.startBossFight?.();
  window.toggleCollisionDebug = () => {
    currentScene.physics.debugEnabled = !currentScene.physics.debugEnabled;
    console.log("Collision debug:", currentScene.physics.debugEnabled ? "ON" : "OFF");
  };
}

init().catch((error) => console.error("Init failed:", error));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 🆕 TRANSITION TO KITCHEN SCENE
window.transitionToKitchen = () => {
  console.log("🍳 Transitioning to Kitchen...");
  
  if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
    console.error("❌ Cannot transition: No valid player found");
    return;
  }
  
  const playerPosition = currentScene.player.ghost.position.clone();
  const cameraRotation = { yaw: yaw, pitch: pitch };
  
  console.log("Player position before transition:", playerPosition);
  
  if (currentScene.scene && yawObject.parent === currentScene.scene) {
    currentScene.scene.remove(yawObject);
  }
  
  camera.position.set(0, 1.6, 0);
  
  kitchenScene = new KitchenScene(
    renderer, 
    camera, 
    currentScene.player,
    playerPosition,
    cameraRotation
  );
  
  kitchenScene.scene.add(yawObject);
  yawObject.position.copy(playerPosition);
  currentScene = kitchenScene;
  
  const initialRotation = kitchenScene.getInitialCameraRotation();
  yaw = initialRotation.yaw;
  pitch = initialRotation.pitch;
  
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log(`✅ Transitioned to kitchen at position (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
};

// Existing transitions
window.transitionToHallway = () => {
  console.log("🚪 Transitioning to Hallway...");
  
  if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
    console.error("❌ Cannot transition: No valid player found");
    return;
  }
  
  const playerPosition = currentScene.player.ghost.position.clone();
  const cameraRotation = { yaw: yaw, pitch: pitch };
  
  if (currentScene.scene && yawObject.parent === currentScene.scene) {
    currentScene.scene.remove(yawObject);
  }
  
  camera.position.set(0, 1.6, 0);
  
  hallwayScene = new HallwayScene(renderer, camera, currentScene.player, playerPosition, cameraRotation);
  hallwayScene.scene.add(yawObject);
  yawObject.position.copy(playerPosition);
  currentScene = hallwayScene;
  
  const initialRotation = hallwayScene.getInitialCameraRotation();
  yaw = initialRotation.yaw;
  pitch = initialRotation.pitch;
  
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log(`✅ Transitioned to hallway`);
};

window.transitionToBathroom = () => {
  console.log("🚿 Transitioning to Bathroom...");
  
  if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
    console.error("❌ Cannot transition: No valid player found");
    return;
  }
  
  const playerPosition = currentScene.player.ghost.position.clone();
  const cameraRotation = { yaw: yaw, pitch: pitch };
  
  if (currentScene.scene && yawObject.parent === currentScene.scene) {
    currentScene.scene.remove(yawObject);
  }
  
  camera.position.set(0, 1.6, 0);
  
  bathroomScene = new BathroomScene(renderer, camera, currentScene.player, playerPosition, cameraRotation);
  bathroomScene.scene.add(yawObject);
  yawObject.position.copy(playerPosition);
  currentScene = bathroomScene;
  
  const initialRotation = bathroomScene.getInitialCameraRotation();
  yaw = initialRotation.yaw;
  pitch = initialRotation.pitch;
  
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log(`✅ Transitioned to bathroom`);
};

window.transitionToNextLevel = () => {
  console.log("🎉 Kitchen complete! Transitioning to next level...");
  alert("Kitchen complete! Next level not implemented yet.");
};