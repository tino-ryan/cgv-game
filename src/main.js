import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import LobbyScene from "./scenes/lobbyScene.js";

let renderer, camera, lobbyScene;
const mouseSensitivity = 0.002;

let yaw = 0;
let pitch = 0;

const yawObject = new THREE.Object3D();
const pitchObject = new THREE.Object3D();

async function init() {
  // Initialize renderer
  renderer = initRenderer();

  // Initialize camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5);

  // Set up camera hierarchy for rotation
  yawObject.add(pitchObject);
  pitchObject.add(camera);

  console.log("Renderer initialized:", renderer);
  console.log("Camera initialized:", camera);

  // Create lobby scene (includes tutorial and boss)
  lobbyScene = new LobbyScene(renderer, camera);
  lobbyScene.scene.add(yawObject);

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

    if (!lobbyScene.player.ghost) {
      lobbyScene.update();
      return;
    }

    // Update camera rotation
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;

    // Calculate movement vectors
    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    if (lobbyScene.player.combatMode) {
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
      lobbyScene.player.ghost.position.addScaledVector(moveVector, moveSpeed);

      if (!lobbyScene.player.combatMode) {
        lobbyScene.player.ghost.rotation.y =
          Math.atan2(moveVector.z, -moveVector.x) + Math.PI;
      }
    }

    // Update camera position to follow player
    yawObject.position.copy(lobbyScene.player.ghost.position);

    // Update lobby scene (tutorial, boss, etc.) - pass current yaw and pitch
    //lobbyScene.camera.rotation.y = yaw;
    //lobbyScene.camera.rotation.x = pitch;
    //lobbyScene.update();
    // FIXED: Pass the actual yaw and pitch values to the scene
    lobbyScene.updateWithCameraRotation(yaw, pitch);
  }

  animate();

  // Debug helpers
  window.enterCombat = () => lobbyScene.player.enterCombat();
  window.exitCombat = () => lobbyScene.player.exitCombat();
  window.startBoss = () => lobbyScene.startBossFight();
}

init().catch((error) => console.error("Init failed:", error));

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
