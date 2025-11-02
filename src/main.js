// src/main.js - CLEAN VERSION WITH PROPER GAME FLOW
import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import LobbyScene from "./scenes/lobbyScene.js";
import HallwayScene from './scenes/hallwayScene.js';
import BathroomScene from './scenes/bathroomScene.js';
import KitchenScene from './scenes/kitchenScene.js';
import CutsceneManager from "./systems/cutsceneManager.js";
import { tutorialCutscene } from "./cutscenes/tutorialCutscene.js";
import SceneManager from "./systems/sceneManager.js";
import TitleMenu from "./scenes/titleMenu.js";
import PauseMenu from "./ui/pauseMenu.js";

let renderer, camera, currentScene, sceneManager, lobbyScene, hallwayScene, bathroomScene, kitchenScene;

const mouseSensitivity = 0.0015;
let isPaused = false;
let pauseMenu;

let yaw = 0;
let pitch = 0;

const yawObject = new THREE.Object3D();
const pitchObject = new THREE.Object3D();

async function init() {
  renderer = initRenderer();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5);

  sceneManager = new SceneManager(renderer, camera);

  const titleMenu = new TitleMenu(sceneManager);
  sceneManager.setScene(null);

  // Set up camera hierarchy for rotation
  yawObject.add(pitchObject);
  pitchObject.add(camera);

  console.log("Renderer initialized:", renderer);
  console.log("Camera initialized:", camera);

  // Start with lobby scene after cutscene
  await startLobbyScene();

  // Setup pointer lock
  document.body.addEventListener("dblclick", () => {
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
      console.log("Requesting pointer lock...");
    }
  });

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
    if (isPaused) return;

    if (sceneManager.currentScene) {
      sceneManager.update();
      renderer.render(sceneManager.currentScene.scene, camera);
    }

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

    // Update current scene with camera rotation
    if (currentScene instanceof KitchenScene) {
      yawObject.position.copy(currentScene.player.ghost.position);
      yawObject.position.y += 0.8; // Camera at eye level for smaller player
      currentScene.updateWithCameraRotation(yaw, pitch);
    } else if (currentScene instanceof LobbyScene) {
      yawObject.position.copy(currentScene.player.ghost.position);
      currentScene.updateWithCameraRotation(yaw, pitch);
    } else if (currentScene instanceof BathroomScene) {
      currentScene.updateWithCameraRotation(yaw, pitch);
    }
  }

  pauseMenu = new PauseMenu(sceneManager, lobbyScene, (paused) => {
    isPaused = paused;
  });
  
  animate();

  // Debug functions
  window.enterCombat = () => currentScene.player.enterCombat();
  window.exitCombat = () => currentScene.player.exitCombat();
  window.startBoss = () => currentScene.startBossFight?.();
  window.toggleCollisionDebug = () => {
    if (currentScene && currentScene.physics) {
      currentScene.physics.debugEnabled = !currentScene.physics.debugEnabled;
      console.log("Collision debug:", currentScene.physics.debugEnabled ? "ON" : "OFF");
    }
  };
}

// ============================================================================
// LOBBY SCENE (Starting point with tutorial + boss)
// ============================================================================
async function startLobbyScene() {
  console.log("🏨 Starting Lobby Scene...");
  
  // Play intro cutscene
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

  // Initialize lobby
  lobbyScene = new LobbyScene(renderer, camera);
  lobbyScene.scene.add(yawObject);
  currentScene = lobbyScene;
  
  console.log("✅ Lobby Scene loaded");
}

// ============================================================================
// SCENE TRANSITIONS
// ============================================================================

// LOBBY → HALLWAY (after defeating boss and using bell)
window.transitionToHallway = () => {
  console.log("🚪 Transitioning to Hallway...");
  
  if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
    console.error("❌ Cannot transition: No valid player found");
    return;
  }
  
  const playerPosition = currentScene.player.ghost.position.clone();
  const cameraRotation = { yaw: yaw, pitch: pitch };
  
  console.log("Player position before transition:", playerPosition);
  
  // Remove yawObject from old scene
  if (currentScene.scene && yawObject.parent === currentScene.scene) {
    currentScene.scene.remove(yawObject);
  }
  
  // Reset camera position
  camera.position.set(0, 1.6, 0);
  
  // Create hallway scene
  hallwayScene = new HallwayScene(
    renderer, 
    camera, 
    currentScene.player,
    new THREE.Vector3(0, 1.6, 15), // Spawn at start of hallway
    { yaw: 0, pitch: 0 } // Face forward
  );
  
  hallwayScene.scene.add(yawObject);
  yawObject.position.set(0, 1.6, 15);
  currentScene = hallwayScene;
  
  const initialRotation = hallwayScene.getInitialCameraRotation();
  yaw = initialRotation.yaw;
  pitch = initialRotation.pitch;
  
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log("✅ Transitioned to Hallway");
};

// HALLWAY → BATHROOM (after completing puzzle)
window.transitionToBathroom = () => {
  console.log("🛁 Transitioning to Bathroom...");
  
  if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
    console.error("❌ Cannot transition: No valid player found");
    return;
  }
  
  const playerPosition = currentScene.player.ghost.position.clone();
  const cameraRotation = { yaw: yaw, pitch: pitch };
  
  // Clean up hallway
  if (currentScene.dispose) {
    currentScene.dispose();
  }
  
  // Remove yawObject from old scene
  if (currentScene.scene && yawObject.parent === currentScene.scene) {
    currentScene.scene.remove(yawObject);
  }
  
  // Reset camera position
  camera.position.set(0, 1.6, 0);
  
  // Create bathroom scene
  bathroomScene = new BathroomScene(
    renderer, 
    camera, 
    currentScene.player,
    new THREE.Vector3(0, 1.6, 5), // Spawn position in bathroom
    { yaw: 0, pitch: 0 }
  );
  
  bathroomScene.scene.add(yawObject);
  yawObject.position.set(0, 1.6, 5);
  currentScene = bathroomScene;
  
  const initialRotation = bathroomScene.getInitialCameraRotation();
  yaw = initialRotation.yaw;
  pitch = initialRotation.pitch;
  
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log("✅ Transitioned to Bathroom");
};

// BATHROOM → KITCHEN (after defeating bathroom boss)
window.transitionToKitchen = () => {
  console.log("🍳 Transitioning to Kitchen...");
  
  if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
    console.error("❌ Cannot transition: No valid player found");
    return;
  }
  
  const playerPosition = currentScene.player.ghost.position.clone();
  const cameraRotation = { yaw: yaw, pitch: pitch };
  
  console.log("Player position before transition:", playerPosition);
  
  // Remove yawObject from old scene
  if (currentScene.scene && yawObject.parent === currentScene.scene) {
    currentScene.scene.remove(yawObject);
  }
  
  // Reset camera position
  camera.position.set(0, 1.6, 0);
  
  // Create kitchen scene
  kitchenScene = new KitchenScene(
    renderer, 
    camera, 
    currentScene.player,
    new THREE.Vector3(0, 0.8, 5), // Spawn in kitchen (adjusted for smaller player)
    { yaw: 0, pitch: 0 }
  );
  
  kitchenScene.scene.add(yawObject);
  yawObject.position.set(0, 0.8, 5);
  currentScene = kitchenScene;
  
  const initialRotation = kitchenScene.getInitialCameraRotation();
  yaw = initialRotation.yaw;
  pitch = initialRotation.pitch;
  
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log(`✅ Transitioned to Kitchen at position (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
};

// KITCHEN → NEXT LEVEL (placeholder for future levels)
window.transitionToNextLevel = () => {
  console.log("🎉 Kitchen complete! Game progression...");
  
  const victoryOverlay = document.createElement("div");
  victoryOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(135deg, rgba(0, 50, 0, 0.95), rgba(0, 20, 0, 0.98));
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    z-index: 10001; font-family: Arial, sans-serif; color: white; text-align: center;
  `;
  
  victoryOverlay.innerHTML = `
    <h1 style="font-size: 64px; color: #00ff00; text-shadow: 0 0 20px #00ff00; margin-bottom: 20px;">
      🎊 CONGRATULATIONS! 🎊
    </h1>
    <p style="font-size: 28px; margin: 20px 0; max-width: 800px; line-height: 1.6;">
      You've successfully cleared all available levels!
    </p>
    <div style="background: rgba(0, 0, 0, 0.5); padding: 30px; border-radius: 15px; margin: 30px;">
      <h2 style="color: #ffcc00; margin-bottom: 15px;">Achievements Unlocked:</h2>
      <p style="font-size: 20px; margin: 10px 0;">✅ Defeated the Bellboy Ghost (Lobby)</p>
      <p style="font-size: 20px; margin: 10px 0;">✅ Solved the Hallway Puzzle</p>
      <p style="font-size: 20px; margin: 10px 0;">✅ Defeated the Bathroom Boss</p>
      <p style="font-size: 20px; margin: 10px 0;">✅ Cleared the Haunted Kitchen</p>
    </div>
    <p style="font-size: 18px; color: #aaaaaa; margin-top: 30px;">
      More levels coming soon! Thank you for playing! 👻
    </p>
    <button id="return-to-menu" style="
      margin-top: 40px; padding: 20px 50px; font-size: 24px; font-weight: bold;
      background: linear-gradient(to bottom, #00aa00, #00ff00);
      color: white; border: none; border-radius: 12px; cursor: pointer;
      box-shadow: 0 5px 20px rgba(0, 255, 0, 0.5);
    ">Return to Main Menu</button>
  `;
  
  document.body.appendChild(victoryOverlay);
  
  const returnBtn = document.getElementById("return-to-menu");
  if (returnBtn) {
    returnBtn.onclick = () => {
      window.location.reload(); // Reload game to start fresh
    };
  }
};

// ============================================================================
// MAIN MENU RETURN
// ============================================================================
window.returnToMainMenu = () => {
  console.log("🏠 Returning to main menu...");
  window.location.reload();
};

// ============================================================================
// START GAME
// ============================================================================
init().catch((error) => console.error("Init failed:", error));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});