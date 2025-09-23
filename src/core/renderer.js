import * as THREE from 'three';

export function initRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;  // Enable shadows for later effects
  document.body.appendChild(renderer.domElement);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // Add for nicer shadows
  return renderer;
}