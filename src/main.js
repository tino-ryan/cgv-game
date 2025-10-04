import * as THREE from 'three';

// === Scene Setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 12;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// === Dummy Cube (green) ===
const dummyGeo = new THREE.BoxGeometry(1, 1, 1);
const dummyMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const dummy = new THREE.Mesh(dummyGeo, dummyMat);
dummy.position.set(-5, 0, 0);
scene.add(dummy);

// === Boss Cube (red) ===
const bossGeo = new THREE.BoxGeometry(2, 2, 2);
const bossMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const boss = new THREE.Mesh(bossGeo, bossMat);
boss.position.set(5, 0, 0);
scene.add(boss);

// === Lighting ===
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);

// === Keyboard Controls for Dummy ===
const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key] = true));
window.addEventListener("keyup", (e) => (keys[e.key] = false));

function updateDummy() {
  if (keys["ArrowLeft"]) dummy.position.x -= 0.1;
  if (keys["ArrowRight"]) dummy.position.x += 0.1;
  if (keys["ArrowUp"]) dummy.position.z -= 0.1;
  if (keys["ArrowDown"]) dummy.position.z += 0.1;
}

// === Projectiles ===
let projectiles = [];
let lastAttack = 0;
const attackCooldown = 2000; // ms

function throwProjectile() {
  const geometry = new THREE.SphereGeometry(0.2, 8, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
  const projectile = new THREE.Mesh(geometry, material);

  projectile.position.copy(boss.position);

  const dir = new THREE.Vector3()
    .subVectors(dummy.position, boss.position)
    .normalize();
  projectile.userData.velocity = dir.multiplyScalar(0.1);

  scene.add(projectile);
  projectiles.push(projectile);
}

function updateProjectiles() {
  projectiles.forEach((proj, i) => {
    proj.position.add(proj.userData.velocity);

    // Collision with dummy
    if (proj.position.distanceTo(dummy.position) < 1) {
      console.log("Dummy hit!");
      scene.remove(proj);
      projectiles.splice(i, 1);
    }

    // Remove if too far
    if (proj.position.length() > 50) {
      scene.remove(proj);
      projectiles.splice(i, 1);
    }
  });
}

// === Boss AI: Respond to Dummy ===
let bossDirection = 1;

function updateBoss(time) {
  const dx = dummy.position.x - boss.position.x;
  const dz = dummy.position.z - boss.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Patrol if dummy is far
  if (dist >= 6) {
    boss.position.x += 0.05 * bossDirection;
    if (boss.position.x > 5 || boss.position.x < -5) bossDirection *= -1;
    boss.material.color.set(0xff0000); // red idle
  }

  // Chase + attack if close
  if (dist < 6) {
    boss.position.x += (dx / dist) * 0.03;
    boss.position.z += (dz / dist) * 0.03;
    boss.material.color.set(0x0000ff); // blue chasing

    if (time - lastAttack > attackCooldown) {
      throwProjectile();
      lastAttack = time;
    }
  }
}

// === Game Loop ===
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();

  updateDummy();
  updateBoss(time);
  updateProjectiles();

  renderer.render(scene, camera);
}
animate();

// === Handle window resize ===
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
