import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import { initScene } from "./core/scene.js";
import { initLoop } from "./core/loop.js";
import { loadAssets } from "./core/loader.js";

let renderer, scene, camera, ghost;
const moveSpeed = 0.1; // Speed for ghost movement
const cameraOffset = new THREE.Vector3(0, 1.5, 5); // Camera offset: 1.5 units up, 5 units back
let yaw = 0; // Camera yaw (Y rotation)
let pitch = 0; // Camera pitch (X rotation)
let combatMode = false; // Are we in combat?
const mouseSensitivity = 0.002; // Mouse movement sensitivity
const keySensitivity = 0.01; // WASD rotation sensitivity

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

  // Load model and get its bounding info
  const { model, center, size } = await loadAssets(
    scene,
    "/assets/models/scene.gltf"
  );
  ghost = model; // Store for animation and movement
  console.log("Ghost loaded:", ghost);

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
      // Use yaw/pitch variables in both modes
      yaw -= event.movementX * mouseSensitivity;
      pitch -= event.movementY * mouseSensitivity;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // Clamp pitch
    }
  });

  // Keyboard controls for ghost movement (arrow keys) and camera rotation (WASD)
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
        keys.down = true;
        break;
      case "ArrowDown":
        keys.up = true;
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
        keys.down = false;
        break;
      case "ArrowDown":
        keys.up = false;
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

  function enterCombat() {
    combatMode = true;

    // Request pointer lock for first-person
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
    }

    // Move yawObject to ghost position
    yawObject.position.copy(ghost.position);

    // Reset pitch and yaw to look forward
    pitchObject.rotation.x = 0;
    yawObject.rotation.y = 0;

    // Attach camera to pitchObject at eye level
    camera.position.set(0, 1.6, 0); // typical first-person eye height
    pitchObject.add(camera);

    // Optional: hide third-person mesh or offset it
    // ghost.visible = false;

    console.log("Entered combat mode, camera now first-person");
  }

  function exitCombat() {
    combatMode = false;

    // Detach camera from pitchObject
    pitchObject.remove(camera);

    // Restore camera position behind ghost
    camera.position.copy(ghost.position).add(cameraOffset);

    // Reattach camera to scene for third-person
    scene.add(camera);

    // Optional: show ghost body again
    // ghost.visible = true;

    console.log("Exited combat mode, camera now third-person");
  }

  initLoop(renderer, scene, camera, null, (time) => {
    // Update yaw/pitch rotations
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;

    // Base forward/right directions
    // In Three.js: -Z is forward by default, +X is right
    let forward = new THREE.Vector3(
      Math.sin(yaw),
      0,
      Math.cos(yaw)
    ).normalize();
    let right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();

    // In combat (first person) recalc based on camera direction
    if (combatMode) {
      yawObject.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    }

    // Track movement vector
    let moveVector = new THREE.Vector3();

    if (keys.up) moveVector.add(forward);
    if (keys.down) moveVector.add(forward.clone().multiplyScalar(-1));
    if (keys.left) moveVector.add(right.clone().multiplyScalar(-1));
    if (keys.right) moveVector.add(right);

    if (moveVector.length() > 0) {
      moveVector.normalize();
      ghost.position.addScaledVector(moveVector, moveSpeed);

      // Only rotate ghost in 3rd person
      if (!combatMode) {
        // Fixed: swap the parameters and add PI/2 offset for proper facing
        ghost.rotation.y = Math.atan2(moveVector.z, -moveVector.x) + Math.PI;
      }
    }

    // Keep yawObject at ghost's position
    yawObject.position.copy(ghost.position);

    // Apply camera offset (only in 3rd person)
    if (!combatMode) {
      camera.position.copy(cameraOffset);
    }
  });

  // Expose combat functions globally for testing
  window.enterCombat = enterCombat;
  window.exitCombat = exitCombat;
}

init().catch((error) => console.error("Init failed:", error));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
