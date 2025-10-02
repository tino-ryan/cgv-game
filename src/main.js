import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import { initScene } from "./core/scene.js";
import { initLoop } from "./core/loop.js";
import Player from "./entities/player.js";

let renderer, scene, camera, player;
const moveSpeed = 0.1; // Speed for ghost movement
let yaw = 0; // Camera yaw (Y rotation)
let pitch = 0; // Camera pitch (X rotation)
const mouseSensitivity = 0.002;

// Yaw/pitch containers to prevent tilt
const yawObject = new THREE.Object3D();
const pitchObject = new THREE.Object3D();

async function init() {
  renderer = initRenderer();
  scene = initScene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5); // Initial position
  console.log("Renderer initialized:", renderer);
  console.log("Scene initialized:", scene);
  console.log("Camera initialized:", camera);

  // Attach camera into yaw/pitch hierarchy
  yawObject.add(pitchObject);
  pitchObject.add(camera);
  scene.add(yawObject);

  // Create player
  player = new Player(scene, camera);

  // Load ghost and gun assets
  await player.loadGhost("/assets/models/scene.gltf");
  await player.loadGun("/assets/models/gun.glb");

  // -----------------------------
  // Pointer Lock for Camera Look
  // -----------------------------
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

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === document.body) {
      yaw -= event.movementX * mouseSensitivity;
      pitch -= event.movementY * mouseSensitivity;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // Clamp pitch
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
        keys.up = true; // CHANGE BACK
        break;
      case "ArrowDown":
        keys.down = true; // CHANGE BACK
        break;
      case "ArrowLeft":
        keys.left = true;
        break;
      case "ArrowRight":
        keys.right = true;
        break;
      case "w":
        keys.w = true;
        break;
      case "a":
        keys.a = true;
        break;
      case "s":
        keys.s = true;
        break;
      case "d":
        keys.d = true;
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "ArrowUp":
        keys.up = false; // CHANGE BACK
        break;
      case "ArrowDown":
        keys.down = false; // CHANGE BACK
        break;
      case "ArrowLeft":
        keys.left = false;
        break;
      case "ArrowRight":
        keys.right = false;
        break;
      case "w":
        keys.w = false;
        break;
      case "a":
        keys.a = false;
        break;
      case "s":
        keys.s = false;
        break;
      case "d":
        keys.d = false;
        break;
    }
  });

  // Main loop
  initLoop(renderer, scene, camera, null, (time) => {
    if (!player.ghost) return;

    // Update yaw/pitch
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;

    // Base forward/right directions
    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    // If in combat mode → use camera direction (NEGATED for correct FPS controls)
    if (player.combatMode) {
      yawObject.getWorldDirection(forward);
      forward.negate(); // NEGATE to fix inverted controls
      forward.y = 0;
      forward.normalize();
      right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
      right.negate(); // NEGATE right to fix inverted left/right
    } else {
      // Third-person mode - NEGATE to flip forward/back
      forward = new THREE.Vector3(
        -Math.sin(yaw), // ADDED NEGATIVE
        0,
        -Math.cos(yaw) // ADDED NEGATIVE
      ).normalize();
      right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
    }

    // Track movement vector
    let moveVector = new THREE.Vector3();
    if (keys.up) moveVector.add(forward);
    if (keys.down) moveVector.add(forward.clone().multiplyScalar(-1));
    if (keys.left) moveVector.add(right.clone().multiplyScalar(-1));
    if (keys.right) moveVector.add(right);

    if (moveVector.length() > 0) {
      moveVector.normalize();
      player.ghost.position.addScaledVector(moveVector, moveSpeed);

      // Rotate ghost only in third-person
      if (!player.combatMode) {
        player.ghost.rotation.y =
          Math.atan2(moveVector.z, -moveVector.x) + Math.PI;
      }
    }

    // Keep yawObject at ghost's position
    yawObject.position.copy(player.ghost.position);

    // Update player (maintains hover height)
    player.update();
  });

  // Expose combat toggle globally for testing
  window.enterCombat = () => player.enterCombat();
  window.exitCombat = () => player.exitCombat();
}

init().catch((error) => console.error("Init failed:", error));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
