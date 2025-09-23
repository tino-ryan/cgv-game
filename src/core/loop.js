import * as THREE from 'three';

export function initLoop(renderer, scene, camera, controls, updateCallback) {
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    if (updateCallback) updateCallback(time);
    renderer.render(scene, camera);
  }
  animate();
}