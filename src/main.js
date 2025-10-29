import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import LobbyScene from "./scenes/lobbyScene.js";
import BathroomScene from "./scenes/bathroomScene.js"; // ADD THIS
import CutsceneManager from "./systems/cutsceneManager.js";
import { tutorialCutscene } from "./cutscenes/tutorialCutscene.js";
import SceneManager from "./systems/sceneManager.js";
import TitleMenu from "./scenes/titleMenu.js";
import PauseMenu from "./ui/pauseMenu.js";

// ===== TESTING MODE =====
const TESTING_MODE = "bathroom"; // Change to: "lobby", "bathroom", or "normal"
// =======================

let renderer, camera, currentScene, sceneManager;
let isPaused = false;
let pauseMenu;
const mouseSensitivity = 0.002;

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

  // Set up camera hierarchy for rotation
  yawObject.add(pitchObject);
  pitchObject.add(camera);

  console.log("Renderer initialized:", renderer);
  console.log("Camera initialized:", camera);

  // Create the cutscene container overlay
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

  // ===== TESTING MODE LOGIC =====
  if (TESTING_MODE === "bathroom") {
    console.log("🛁 TESTING MODE: Loading bathroom scene directly");

    // Skip title menu and cutscenes, go straight to bathroom
    currentScene = new BathroomScene(renderer, camera);
    currentScene.scene.add(yawObject);

    // Set initial camera position
    yawObject.position.set(0, 2, 10);

    // Auto-enable pointer lock for testing (wait for scene to load)
    setTimeout(() => {
      console.log("Requesting pointer lock for testing...");
      document.body.requestPointerLock();
    }, 500);
  } else if (TESTING_MODE === "lobby") {
    console.log("🏨 TESTING MODE: Loading lobby scene directly");

    // Skip title menu and cutscenes, go straight to lobby
    currentScene = new LobbyScene(renderer, camera);
    currentScene.scene.add(yawObject);

    // Auto-enable pointer lock for testing
    setTimeout(() => {
      document.body.requestPointerLock();
    }, 100);
  } else {
    // Normal mode - show title menu and play cutscenes
    const titleMenu = new TitleMenu(sceneManager);
    sceneManager.setScene(null);

    const cutsceneManager = new CutsceneManager("cutscene-container");
    await cutsceneManager.play(tutorialCutscene);

    currentScene = new LobbyScene(renderer, camera);
    currentScene.scene.add(yawObject);
  }
  // ===== END TESTING MODE =====

  // Pointer Lock - activate on double-click
  document.body.addEventListener("dblclick", () => {
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
      console.log("Requesting pointer lock...");
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
    if (
      event.key === "Escape" &&
      document.pointerLockElement === document.body
    ) {
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

  // Keyboard controls
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    w: false,
    a: false,
    s: false,
    d: false,
  };

  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowUp":
        keys.up = true;
        break;
      case "ArrowDown":
        keys.down = true;
        break;
      case "ArrowLeft":
        keys.left = true;
        break;
      case "ArrowRight":
        keys.right = true;
        break;
      case "w":
      case "W":
        keys.w = true;
        break;
      case "a":
      case "A":
        keys.a = true;
        break;
      case "s":
      case "S":
        keys.s = true;
        break;
      case "d":
      case "D":
        keys.d = true;
        break;
      case "f":
      case "F":
        // Pickup bell (only in lobby)
        if (currentScene.serviceBell) {
          currentScene.pickupBell();
        }
        break;
      case "e":
      case "E":
        // Handle torch in bathroom scene or inventory in other scenes
        if (currentScene.handleInteraction) {
          currentScene.handleInteraction();
        } else if (currentScene.inventory) {
          const selectedItem = currentScene.inventory.getSelectedItem();
          if (selectedItem && selectedItem.onUse) {
            selectedItem.onUse();
          }
        }
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "ArrowUp":
        keys.up = false;
        break;
      case "ArrowDown":
        keys.down = false;
        break;
      case "ArrowLeft":
        keys.left = false;
        break;
      case "ArrowRight":
        keys.right = false;
        break;
      case "w":
      case "W":
        keys.w = false;
        break;
      case "a":
      case "A":
        keys.a = false;
        break;
      case "s":
      case "S":
        keys.s = false;
        break;
      case "d":
      case "D":
        keys.d = false;
        break;
    }
  });

  // Main game loop
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

    // Check for camera snap (e.g., when boss spawns in lobby)
    if (currentScene.getCameraSnapRotation) {
      const snapRotation = currentScene.getCameraSnapRotation();
      if (snapRotation) {
        yaw = snapRotation.yaw;
        pitch = snapRotation.pitch;
        console.log("Camera snapped to target!");
      }
    }

    // Update camera rotation
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;

    // Calculate movement vectors
    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    if (currentScene.player.combatMode) {
      yawObject.getWorldDirection(forward);
      forward.negate();
      forward.y = 0;
      forward.normalize();
      right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
      right.negate();
    } else {
      forward = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
      ).normalize();
      right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
    }

    // Apply movement
    const moveSpeed = 0.1;
    let moveVector = new THREE.Vector3();
    if (keys.up || keys.w) moveVector.add(forward);
    if (keys.down || keys.s) moveVector.add(forward.clone().multiplyScalar(-1));
    if (keys.left || keys.a) moveVector.add(right.clone().multiplyScalar(-1));
    if (keys.right || keys.d) moveVector.add(right);

    if (moveVector.length() > 0) {
      moveVector.normalize();

      const currentPos = currentScene.player.ghost.position;
      const safeMovement = currentScene.physics.getSafeMovement(
        currentPos,
        moveVector,
        moveSpeed
      );

      currentScene.player.ghost.position.add(safeMovement);

      if (!currentScene.player.combatMode) {
        currentScene.player.ghost.rotation.y =
          Math.atan2(moveVector.z, -moveVector.x) + Math.PI;
      }
    }

    // Update camera position to follow player
    yawObject.position.copy(currentScene.player.ghost.position);

    // Update current scene
    currentScene.updateWithCameraRotation(yaw, pitch);
  }

  pauseMenu = new PauseMenu(sceneManager, currentScene, (paused) => {
    isPaused = paused;
  });

  animate();

  // Debug helpers
  window.enterCombat = () => currentScene.player.enterCombat();
  window.exitCombat = () => currentScene.player.exitCombat();
  window.startBoss = () => {
    if (currentScene.startBossFight) {
      currentScene.startBossFight();
    } else {
      console.log("This scene doesn't have a boss fight");
    }
  };
  window.toggleCollisionDebug = () => {
    currentScene.physics.debugEnabled = !currentScene.physics.debugEnabled;
    console.log(
      "Collision debug:",
      currentScene.physics.debugEnabled ? "ON" : "OFF"
    );
  };
  window.switchToBathroom = () => {
    console.log("🛁 Switching to bathroom scene...");
    currentScene = new BathroomScene(renderer, camera);
    currentScene.scene.add(yawObject);
  };
  window.switchToLobby = () => {
    console.log("🏨 Switching to lobby scene...");
    currentScene = new LobbyScene(renderer, camera);
    currentScene.scene.add(yawObject);
  };
}

init().catch((error) => console.error("Init failed:", error));

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
