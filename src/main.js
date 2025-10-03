import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import { initScene } from "./core/scene.js";
import { initLoop } from "./core/loop.js";
import Player from "./entities/player.js";
import Tutorial from "./systems/tutorial.js";

let renderer, scene, camera, player, tutorial;
const moveSpeed = 0.1;
let yaw = 0;
let pitch = 0;
const mouseSensitivity = 0.002;

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
  camera.position.set(0, 2, 5);
  console.log("Renderer initialized:", renderer);
  console.log("Scene initialized:", scene);
  console.log("Camera initialized:", camera);

  yawObject.add(pitchObject);
  pitchObject.add(camera);
  scene.add(yawObject);

  player = new Player(scene, camera);

  await player.loadGhost("/assets/models/scene.gltf");
  await player.loadGun("/assets/models/gun.glb");

  // Create tutorial and link it to player
  const hud = document.getElementById("tutorial-hud");
  tutorial = new Tutorial(hud, scene, player);
  player.setTutorial(tutorial); // Important: Link tutorial to player

  tutorial.start(yaw, pitch);

  // Pointer Lock
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
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
  });

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

  let prevTime = performance.now();
  initLoop(renderer, scene, camera, null, (time) => {
    const delta = (time - prevTime) / 1000;
    prevTime = time;

    if (!player.ghost) return;

    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;

    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    if (player.combatMode) {
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

    let moveVector = new THREE.Vector3();
    if (keys.up || keys.w) moveVector.add(forward);
    if (keys.down || keys.s) moveVector.add(forward.clone().multiplyScalar(-1));
    if (keys.left || keys.a) moveVector.add(right.clone().multiplyScalar(-1));
    if (keys.right || keys.d) moveVector.add(right);

    if (moveVector.length() > 0) {
      moveVector.normalize();
      player.ghost.position.addScaledVector(moveVector, moveSpeed);

      if (!player.combatMode) {
        player.ghost.rotation.y =
          Math.atan2(moveVector.z, -moveVector.x) + Math.PI;
      }
    }

    yawObject.position.copy(player.ghost.position);
    tutorial.update(keys, player, yaw, pitch, delta);

    player.update();
  });

  window.enterCombat = () => player.enterCombat();
  window.exitCombat = () => player.exitCombat();
}

init().catch((error) => console.error("Init failed:", error));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});