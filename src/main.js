import * as THREE from 'three';
import { initRenderer } from './core/renderer.js';
import { initScene } from './core/scene.js';
import { initLoop } from './core/loop.js';
import { loadAssets } from './core/loader.js';

let renderer, scene, camera, ghost;
const moveSpeed = 0.1; // Speed for ghost movement
const cameraOffset = new THREE.Vector3(0, 1.5, 5); // Camera offset: 1.5 units up, 5 units back
let yaw = 0; // Camera yaw (Y rotation)
let pitch = 0; // Camera pitch (X rotation)
const mouseSensitivity = 0.002; // Mouse movement sensitivity
const keySensitivity = 0.01; // WASD rotation sensitivity

async function init() {
  renderer = initRenderer();
  scene = initScene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 5); // Initial position
  console.log('Renderer initialized:', renderer);
  console.log('Scene initialized:', scene);
  console.log('Camera initialized:', camera);

  // Load model and get its bounding info
  const { model, center, size } = await loadAssets(scene, '/assets/models/scene.gltf');
  ghost = model; // Store for animation and movement
  console.log('Ghost loaded:', ghost);

  // Mouse movement for camera rotation
  let isMouseDown = false;
  document.addEventListener('mousedown', (event) => {
    if (event.button === 0) isMouseDown = true; // Left mouse button
  });
  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) isMouseDown = false;
  });
  document.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
      yaw -= event.movementX * mouseSensitivity; // Adjust yaw (left/right)
      pitch += event.movementY * mouseSensitivity; // Adjust pitch (up = top view, down = bottom view)
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // Clamp pitch
    }
  });

  // Keyboard controls for ghost movement (arrow keys) and camera rotation (WASD)
  const keys = { up: false, down: false, left: false, right: false, w: false, a: false, s: false, d: false };
  window.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowUp':
        keys.up = true;
        break;
      case 'ArrowDown':
        keys.down = true;
        break;
      case 'ArrowLeft':
        keys.left = true;
        break;
      case 'ArrowRight':
        keys.right = true;
        break;
      case 'w':
        keys.w = true;
        break;
      case 'a':
        keys.a = true;
        break;
      case 's':
        keys.s = true;
        break;
      case 'd':
        keys.d = true;
        break;
    }
  });
  window.addEventListener('keyup', (event) => {
    switch (event.key) {
      case 'ArrowUp':
        keys.up = false;
        break;
      case 'ArrowDown':
        keys.down = false;
        break;
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'ArrowRight':
        keys.right = false;
        break;
      case 'w':
        keys.w = false;
        break;
      case 'a':
        keys.a = false;
        break;
      case 's':
        keys.s = false;
        break;
      case 'd':
        keys.d = false;
        break;
    }
  });

  initLoop(renderer, scene, camera, null, (time) => {
    // Animate ghost (sinusoidal floating)
    ghost.position.y = size.y + Math.sin(time) * 0.3 + 0.2; // Float above floor
    ghost.rotation.y = Math.sin(time * 0.2) * 0.5; // Gentle rotation

    // Camera rotation with WASD
    if (keys.w) pitch += keySensitivity; // Look up (toward top view)
    if (keys.s) pitch -= keySensitivity; // Look down (toward bottom view)
    if (keys.a) yaw += keySensitivity; // Look left
    if (keys.d) yaw -= keySensitivity; // Look right
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // Clamp pitch

    // Camera-relative movement for ghost
    const direction = new THREE.Vector3(
      Math.sin(yaw), // Forward direction based on yaw
      0,
      Math.cos(yaw)
    ).normalize();
    const right = new THREE.Vector3(
      Math.sin(yaw + Math.PI / 2), // Perpendicular to direction
      0,
      Math.cos(yaw + Math.PI / 2)
    ).normalize();

    // Move ghost with arrow keys
    if (keys.up) {
      ghost.position.addScaledVector(direction, moveSpeed); // Move forward
    }
    if (keys.down) {
      ghost.position.addScaledVector(direction, -moveSpeed); // Move backward
    }
    if (keys.left) {
      ghost.position.addScaledVector(right, -moveSpeed); // Move left
    }
    if (keys.right) {
      ghost.position.addScaledVector(right, moveSpeed); // Move right
    }

    // Update camera position to follow ghost
    const offset = cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    camera.position.copy(ghost.position).add(offset);
    camera.rotation.set(pitch, yaw, 0); // Apply yaw and pitch
    console.log('Camera position:', camera.position, 'Ghost position:', ghost.position, 'Pitch:', pitch, 'Yaw:', yaw);
  });
}

init().catch(error => console.error('Init failed:', error));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});