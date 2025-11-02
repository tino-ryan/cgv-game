// src/main.js - FINAL VERSION WITH TITLE MENU
import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import LobbyScene from "./scenes/lobbyScene.js";
import HallwayScene from "./scenes/hallwayScene.js";
import BathroomScene from "./scenes/bathroomScene.js";
import KitchenScene from "./scenes/kitchenScene.js";
import CutsceneManager from "./systems/cutsceneManager.js";
import { tutorialCutscene } from "./cutscenes/tutorialCutscene.js";
import SceneManager from "./systems/sceneManager.js";
import TitleMenu from "./scenes/titleMenu.js";
import PauseMenu from "./ui/pauseMenu.js";
import HUD from "./ui/hud.js";
import Player from "./entities/player.js";

// ===== TESTING MODE =====
const TESTING_MODE = "normal"; // "lobby" | "kitchen" | "normal"
// =======================

let renderer, camera, currentScene, sceneManager;
let lobbyScene, hallwayScene, bathroomScene, kitchenScene;
let isPaused = false;
let pauseMenu, titleMenu;

const mouseSensitivity = 0.0015;
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

  // Camera hierarchy
  yawObject.add(pitchObject);
  pitchObject.add(camera);

  console.log("Renderer initialized:", renderer);
  console.log("Camera initialized:", camera);
  console.log("Type listCommands() to see all debug commands!");

  // -----------------------------------------------------------------
  // CUTSCENE CONTAINER
  // -----------------------------------------------------------------
  const cutsceneContainer = document.createElement("div");
  cutsceneContainer.id = "cutscene-container";
  document.body.appendChild(cutsceneContainer);
  Object.assign(cutsceneContainer.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "black",
    display: "none",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "1000",
    color: "white",
    textAlign: "center",
  });

  // -----------------------------------------------------------------
  // TESTING MODE LOGIC
  // -----------------------------------------------------------------
  if (TESTING_MODE === "lobby") {
    console.log("TESTING MODE: Loading lobby scene directly");
    currentScene = new LobbyScene(renderer, camera);
    currentScene.scene.add(yawObject);
    setTimeout(() => document.body.requestPointerLock(), 100);
  } else if (TESTING_MODE === "kitchen") {
    console.log("TESTING MODE: Loading kitchen scene directly");
    const hud = new HUD();
    const player = new Player(null, camera, hud);
    await player.loadGhost("/assets/models/mainchar.glb");
    await player.loadGun("/assets/models/gun.glb");

    kitchenScene = new KitchenScene(
      renderer,
      camera,
      player,
      new THREE.Vector3(0, 0.8, 5),
      { yaw: 0, pitch: 0 }
    );
    kitchenScene.scene.add(yawObject);
    yawObject.position.set(0, 0.8, 5);
    currentScene = kitchenScene;
    window.currentSceneName = "kitchen";

    setTimeout(() => document.body.requestPointerLock(), 100);
  } else {
    // NORMAL FLOW: Title Menu → Tutorial → Lobby
    console.log("Starting with Title Menu...");
    titleMenu = new TitleMenu(() => startGameFromTitle());
  }

  // -----------------------------------------------------------------
  // POINTER LOCK
  // -----------------------------------------------------------------
  const requestLock = () => {
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
      console.log("Requesting pointer lock...");
    }
  };
  document.body.addEventListener("click", requestLock);
  document.body.addEventListener("dblclick", requestLock);

  document.addEventListener("pointerlockchange", () => {
    console.log(
      document.pointerLockElement === document.body
        ? "Pointer lock enabled"
        : "Pointer lock disabled"
    );
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.pointerLockElement === document.body) {
      document.exitPointerLock();
      if (currentScene && pauseMenu) {
        pauseMenu.pause();
      }
    }
  });

  // -----------------------------------------------------------------
  // MOUSE LOOK
  // -----------------------------------------------------------------
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === document.body) {
      yaw -= e.movementX * mouseSensitivity;
      pitch -= e.movementY * mouseSensitivity;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
  });

  // -----------------------------------------------------------------
  // KEYBOARD INPUT
  // -----------------------------------------------------------------
  const keys = {
    up: false, down: false, left: false, right: false,
    w: false, a: false, s: false, d: false,
  };

  const setKey = (key, down) => {
    switch (key) {
      case "ArrowUp": keys.up = down; break;
      case "ArrowDown": keys.down = down; break;
      case "ArrowLeft": keys.left = down; break;
      case "ArrowRight": keys.right = down; break;
      case "w": case "W": keys.w = down; break;
      case "a": case "A": keys.a = down; break;
      case "s": case "S": keys.s = down; break;
      case "d": case "D": keys.d = down; break;
    }
  };
  window.addEventListener("keydown", (e) => setKey(e.key, true));
  window.addEventListener("keyup", (e) => setKey(e.key, false));

  // -----------------------------------------------------------------
  // INTERACTION KEYS (F / E)
  // -----------------------------------------------------------------
  window.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") {
      if (currentScene === lobbyScene && lobbyScene.serviceBell) {
        lobbyScene.pickupBell();
      } else if (currentScene.handlePickup) {
        currentScene.handlePickup();
      }
    }
    if (e.key === "e" || e.key === "E") {
      if (currentScene.handleInteraction) {
        currentScene.handleInteraction();
      } else if (currentScene.inventory) {
        const item = currentScene.inventory.getSelectedItem();
        item?.onUse?.();
      }
    }
  });

  // -----------------------------------------------------------------
  // MAIN ANIMATION LOOP
  // -----------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    if (isPaused) return;

    if (!currentScene?.player?.ghost) {
      currentScene?.update?.();
      return;
    }

    // Camera snap
    const snap = currentScene.getCameraSnapRotation?.();
    if (snap) {
      yaw = snap.yaw;
      pitch = snap.pitch;
      console.log("Camera snapped to target!");
    }

    // Rotation
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;

    // Movement direction
    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    if (currentScene instanceof LobbyScene || currentScene instanceof BathroomScene || currentScene instanceof KitchenScene) {
      if (currentScene.player.combatMode) {
        yawObject.getWorldDirection(forward).negate().setY(0).normalize();
        right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize().negate();
      } else {
        forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
        right.set(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
      }
      yawObject.position.copy(currentScene.player.ghost.position);
    } else if (currentScene instanceof HallwayScene) {
      yawObject.position.copy(currentScene.player.ghost.position);
      currentScene.updateWithCameraRotation?.(yaw, pitch);
      return;
    }

    // Build move vector
    const moveSpeed = 0.1;
    let move = new THREE.Vector3();
    if (keys.up || keys.w) move.add(forward);
    if (keys.down || keys.s) move.add(forward.clone().multiplyScalar(-1));
    if (keys.left || keys.a) move.add(right.clone().multiplyScalar(-1));
    if (keys.right || keys.d) move.add(right);

    if (move.lengthSq() > 0) {
      move.normalize();
      const pos = currentScene.player.ghost.position;
      const safe = currentScene.ghostTransitionActive
        ? move.clone().multiplyScalar(moveSpeed)
        : currentScene.physics.getSafeMovement(pos, move, moveSpeed);

      currentScene.player.ghost.position.add(safe);

      if (!currentScene.player.combatMode) {
        currentScene.player.ghost.rotation.y = Math.atan2(move.z, -move.x) + Math.PI;
      }
    }

    // Scene-specific camera offset
    if (currentScene instanceof KitchenScene) {
      yawObject.position.y += 0.8;
    }
    currentScene.updateWithCameraRotation?.(yaw, pitch);
  }

  animate();
  setupDebugCommands();
  setupResizeHandler();
}

// ============================================================================
// START GAME FROM TITLE MENU
// ============================================================================
async function startGameFromTitle() {
  console.log("Starting game from title menu...");
  const cutsceneManager = new CutsceneManager("cutscene-container");
  await cutsceneManager.play(tutorialCutscene);
  await startLobbyScene();
  pauseMenu = new PauseMenu(sceneManager, null, (p) => (isPaused = p), restartCurrentLevel);
  console.log("Game started!");
}

// ============================================================================
// RESTART CURRENT LEVEL
// ============================================================================
function restartCurrentLevel() {
  console.log("Restarting current level:", window.currentSceneName);
  const sceneName = window.currentSceneName;

  if (document.pointerLockElement) document.exitPointerLock();

  switch (sceneName) {
    case "lobby": window.skipToLobby(); break;
    case "hallway": window.skipToHallway(); break;
    case "bathroom": window.skipToBathroom(); break;
    case "kitchen":
      if (currentScene?.restartKitchen) {
        currentScene.restartKitchen();
      } else {
        window.skipToKitchen();
      }
      break;
    default:
      console.log("Unknown scene, reloading...");
      window.location.reload();
  }

  if (pauseMenu) pauseMenu.resume();
}

// ============================================================================
// LOBBY SCENE
// ============================================================================
async function startLobbyScene() {
  console.log("Starting Lobby Scene...");
  lobbyScene = new LobbyScene(renderer, camera);
  lobbyScene.scene.add(yawObject);
  currentScene = lobbyScene;
  window.currentSceneName = "lobby";
  console.log("Lobby Scene loaded");
}

// ============================================================================
// KITCHEN TRANSITION CUTSCENE
// ============================================================================
async function showKitchenTransitionCutscene() {
  return new Promise((resolve) => {
    const cutscene = document.createElement("div");
    cutscene.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to bottom, #0a0a0a, #1a1a1a);
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      z-index: 10000; color: white; font-family: Arial, sans-serif;
      text-align: center; animation: fadeIn 0.5s;
    `;

    cutscene.innerHTML = `
      <div style="font-size: 80px; margin-bottom: 30px;">[toilet paper][sparkles]</div>
      <h2 style="font-size: 42px; color: #ffaa00; margin-bottom: 20px;">
        The Bathroom is Restored!
      </h2>
      <p style="font-size: 24px; max-width: 600px; line-height: 1.6; margin-bottom: 40px; color: #cccccc;">
        The mystical toilet paper has cleansed the haunted bathroom.
        But your journey continues...
      </p>
      <div style="font-size: 64px; margin-bottom: 20px; animation: bounce 1s infinite;">
        [frying pan]
      </div>
      <p style="font-size: 28px; color: #ff6600; font-weight: bold;">
        Entering the Kitchen...
      </p>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes bounce { 
        0%, 100% { transform: translateY(0); } 
        50% { transform: translateY(-20px); } 
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(cutscene);

    setTimeout(() => {
      cutscene.style.transition = "opacity 0.5s";
      cutscene.style.opacity = "0";
      setTimeout(() => {
        cutscene.remove();
        style.remove();
        resolve();
      }, 500);
    }, 3000);
  });
}

// ============================================================================
// SCENE TRANSITIONS
// ============================================================================
window.transitionToHallway = () => {
  if (!currentScene?.player?.ghost) return console.error("No player");
  window.currentSceneName = "hallway";
  currentScene.scene?.remove?.(yawObject);

  hallwayScene = new HallwayScene(
    renderer, camera, currentScene.player,
    new THREE.Vector3(0, 1.6, 15), { yaw: 0, pitch: 0 }
  );
  hallwayScene.scene.add(yawObject);
  yawObject.position.set(0, 1.6, 15);
  currentScene = hallwayScene;

  const initRot = hallwayScene.getInitialCameraRotation?.() ?? { yaw: 0, pitch: 0 };
  yaw = initRot.yaw;
  pitch = initRot.pitch;
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
};

window.transitionToBathroom = () => {
  if (!currentScene?.player?.ghost) return console.error("No player");
  window.currentSceneName = "bathroom";
  currentScene.dispose?.();
  currentScene.scene?.remove?.(yawObject);

  bathroomScene = new BathroomScene(
    renderer, camera, currentScene.player,
    new THREE.Vector3(0, 1.6, 5), { yaw: 0, pitch: 0 }
  );
  bathroomScene.scene.add(yawObject);
  yawObject.position.set(0, 1.6, 5);
  currentScene = bathroomScene;

  const initRot = bathroomScene.getInitialCameraRotation?.() ?? { yaw: 0, pitch: 0 };
  yaw = initRot.yaw;
  pitch = initRot.pitch;
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
};

window.transitionToKitchen = async () => {
  if (!currentScene?.player?.ghost) return console.error("No player");
  window.currentSceneName = "kitchen";

  if (document.pointerLockElement) document.exitPointerLock();
  await showKitchenTransitionCutscene();

  if (currentScene.dispose) currentScene.dispose();
  currentScene.scene?.remove?.(yawObject);

  ["inventory-ui", "pickup-prompt", "torch-prompt"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  kitchenScene = new KitchenScene(
    renderer, camera, currentScene.player,
    new THREE.Vector3(0, 0.8, 5), { yaw: 0, pitch: 0 }
  );
  kitchenScene.scene.add(yawObject);
  yawObject.position.set(0, 0.8, 5);
  currentScene = kitchenScene;

  const initRot = kitchenScene.getInitialCameraRotation?.() ?? { yaw: 0, pitch: 0 };
  yaw = initRot.yaw;
  pitch = initRot.pitch;
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;

  setTimeout(() => {
    if (!document.pointerLockElement) document.body.requestPointerLock();
  }, 500);
};

window.transitionToNextLevel = () => {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(to bottom, #001100, #003300);
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    z-index: 10000; font-family: Arial, sans-serif;
  `;
  overlay.innerHTML = `
    <h1 style="color: #00ff00; font-size: 72px; margin-bottom: 20px;">GAME COMPLETE!</h1>
    <p style="color: white; font-size: 24px; margin-bottom: 40px;">You've survived all the haunted rooms!</p>
    <button id="return-to-menu" style="
      padding: 20px 50px; font-size: 24px; font-weight: bold;
      background: linear-gradient(to bottom, #00aa00, #00ff00);
      color: white; border: none; border-radius: 12px; cursor: pointer;
    ">Return to Main Menu</button>
  `;
  document.body.appendChild(overlay);
  document.getElementById("return-to-menu")?.addEventListener("click", () => location.reload());
};

window.returnToMainMenu = () => location.reload();

// ============================================================================
// DEBUG COMMANDS
// ============================================================================
function setupDebugCommands() {
  window.enterCombat = () => currentScene.player.enterCombat();
  window.exitCombat = () => currentScene.player.exitCombat();
  window.startBoss = () => currentScene.startBossFight?.();

  window.toggleCollisionDebug = () => {
    if (currentScene?.physics) {
      currentScene.physics.debugEnabled = !currentScene.physics.debugEnabled;
      console.log("Collision debug:", currentScene.physics.debugEnabled ? "ON" : "OFF");
    }
  };

  // Level Skips
window.skipToLobby = () => {
  console.log("🎮 DEBUG: Skipping to Lobby");
  
  // Clean up current scene
  if (currentScene?.dispose) currentScene.dispose();
  if (currentScene?.scene) currentScene.scene.remove(yawObject);
  
  // Exit pointer lock
  if (document.pointerLockElement) document.exitPointerLock();
  
  // Create lobby scene
  lobbyScene = new LobbyScene(renderer, camera);
  lobbyScene.scene.add(yawObject);
  currentScene = lobbyScene;
  window.currentSceneName = "lobby";
  
  yawObject.position.set(0, 1.6, 5);
  yaw = 0;
  pitch = 0;
  
  console.log("✅ Lobby loaded");
  setTimeout(() => document.body.requestPointerLock(), 500);
};

window.skipToHallway = () => {
  console.log("🎮 DEBUG: Skipping to Hallway");
  
  // Clean up current scene
  if (currentScene?.dispose) currentScene.dispose();
  if (currentScene?.scene) currentScene.scene.remove(yawObject);
  
  // Exit pointer lock
  if (document.pointerLockElement) document.exitPointerLock();
  
  // Create player if needed
  if (!currentScene?.player) {
    const hud = new HUD();
    const player = new Player(null, camera, hud);
    player.loadGhost("/assets/models/mainchar.glb");
    player.loadGun("/assets/models/gun.glb");
    
    hallwayScene = new HallwayScene(
      renderer,
      camera,
      player,
      new THREE.Vector3(0, 1.6, 15),
      { yaw: 0, pitch: 0 }
    );
  } else {
    hallwayScene = new HallwayScene(
      renderer,
      camera,
      currentScene.player,
      new THREE.Vector3(0, 1.6, 15),
      { yaw: 0, pitch: 0 }
    );
  }
  
  hallwayScene.scene.add(yawObject);
  yawObject.position.set(0, 1.6, 15);
  currentScene = hallwayScene;
  window.currentSceneName = "hallway";
  
  const initRot = hallwayScene.getInitialCameraRotation?.() ?? { yaw: 0, pitch: 0 };
  yaw = initRot.yaw;
  pitch = initRot.pitch;
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log("✅ Hallway loaded");
  setTimeout(() => document.body.requestPointerLock(), 500);
};

window.skipToBathroom = () => {
  console.log("🎮 DEBUG: Skipping to Bathroom");
  
  // Clean up current scene
  if (currentScene?.dispose) currentScene.dispose();
  if (currentScene?.scene) currentScene.scene.remove(yawObject);
  
  // Exit pointer lock
  if (document.pointerLockElement) document.exitPointerLock();
  
  // Create player if needed
  if (!currentScene?.player) {
    const hud = new HUD();
    const player = new Player(null, camera, hud);
    player.loadGhost("/assets/models/mainchar.glb");
    player.loadGun("/assets/models/gun.glb");
    
    bathroomScene = new BathroomScene(
      renderer,
      camera,
      player,
      new THREE.Vector3(0, 1.6, 5),
      { yaw: 0, pitch: 0 }
    );
  } else {
    bathroomScene = new BathroomScene(
      renderer,
      camera,
      currentScene.player,
      new THREE.Vector3(0, 1.6, 5),
      { yaw: 0, pitch: 0 }
    );
  }
  
  bathroomScene.scene.add(yawObject);
  yawObject.position.set(0, 1.6, 5);
  currentScene = bathroomScene;
  window.currentSceneName = "bathroom";
  
  const initRot = bathroomScene.getInitialCameraRotation?.() ?? { yaw: 0, pitch: 0 };
  yaw = initRot.yaw;
  pitch = initRot.pitch;
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log("✅ Bathroom loaded");
  setTimeout(() => document.body.requestPointerLock(), 500);
};

window.skipToKitchen = () => {
  console.log("🎮 DEBUG: Skipping to Kitchen");
  
  // Clean up current scene
  if (currentScene?.dispose) currentScene.dispose();
  if (currentScene?.scene) currentScene.scene.remove(yawObject);
  
  // Exit pointer lock
  if (document.pointerLockElement) document.exitPointerLock();
  
  camera.position.set(0, 0.8, 0);
  
  // Create player if needed
  if (!currentScene?.player) {
    const hud = new HUD();
    const player = new Player(null, camera, hud);
    player.loadGhost("/assets/models/mainchar.glb");
    player.loadGun("/assets/models/gun.glb");
    
    kitchenScene = new KitchenScene(
      renderer,
      camera,
      player,
      new THREE.Vector3(0, 0.8, 5),
      { yaw: 0, pitch: 0 }
    );
  } else {
    kitchenScene = new KitchenScene(
      renderer,
      camera,
      currentScene.player,
      new THREE.Vector3(0, 0.8, 5),
      { yaw: 0, pitch: 0 }
    );
  }
  
  kitchenScene.scene.add(yawObject);
  yawObject.position.set(0, 0.8, 5);
  currentScene = kitchenScene;
  window.currentSceneName = "kitchen";
  
  const initRot = kitchenScene.getInitialCameraRotation?.() ?? { yaw: 0, pitch: 0 };
  yaw = initRot.yaw;
  pitch = initRot.pitch;
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log("✅ Kitchen loaded");
  setTimeout(() => document.body.requestPointerLock(), 500);
};

  // Reuse same pattern for skipToBathroom, skipToKitchen (omitted for brevity)
  

  window.giveHealth = (amount = 1) => {
    if (currentScene?.player) {
      currentScene.player.health.current = Math.min(
        currentScene.player.health.current + amount,
        currentScene.player.health.max
      );
      currentScene.player.hud?.updatePlayerHearts(
        currentScene.player.health.current,
        currentScene.player.health.max
      );
      console.log(`[heart] Gave ${amount} health. Current: ${currentScene.player.health.current}/${currentScene.player.health.max}`);
    }
  };

  window.fullHealth = () => {
    if (currentScene?.player) {
      currentScene.player.health.current = currentScene.player.health.max;
      currentScene.player.hud?.updatePlayerHearts(
        currentScene.player.health.current,
        currentScene.player.health.max
      );
      console.log(`[green heart] Full health restored!`);
    }
  };

  window.godMode = () => {
    if (currentScene?.player) {
      const orig = currentScene.player.takeDamage.bind(currentScene.player);
      currentScene.player.takeDamage = () => console.log("[shield] GOD MODE: Damage blocked!");
      console.log("[shield] GOD MODE ENABLED");
      window.godModeOff = () => {
        currentScene.player.takeDamage = orig;
        console.log("[shield] GOD MODE DISABLED");
      };
    }
  };

  window.killBoss = () => {
    if (currentScene?.boss) {
      currentScene.boss.health = 0;
      currentScene.boss.isAlive = false;
      console.log("[skull] Boss killed!");
    } else if (currentScene?.kitchenGhost) {
      currentScene.kitchenGhost.health = 0;
      currentScene.kitchenGhost.isAlive = false;
      console.log("[skull] Kitchen Ghost killed!");
    } else {
      console.log("No boss found");
    }
  };

  window.listCommands = () => {
    console.log(`
[game controller] ============ DEBUG CONSOLE COMMANDS ============

[map pin] LEVEL SKIP:
  skipToLobby()       - Jump to Lobby
  skipToHallway()     - Jump to Hallway  
  skipToBathroom()    - Jump to Bathroom
  skipToKitchen()     - Jump to Kitchen

[heart] PLAYER CHEATS:
  giveHealth(amount)  - Add health (default: 1)
  fullHealth()        - Restore full health
  godMode()           - Enable invincibility
  godModeOff()        - Disable invincibility

[sword] COMBAT:
  enterCombat()       - Enable combat mode
  exitCombat()        - Disable combat mode
  startBoss()         - Start boss fight
  killBoss()          - Instantly defeat boss

[tools] OTHER:
  toggleCollisionDebug() - Show/hide collision boxes
  listCommands()         - Show this help

==================================================
    `);
  };

  console.log("Debug commands loaded! Type listCommands() to see them.");
}

// ============================================================================
// RESIZE HANDLER
// ============================================================================
function setupResizeHandler() {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ============================================================================
// START GAME
// ============================================================================
init().catch(err => console.error("Game init failed:", err));