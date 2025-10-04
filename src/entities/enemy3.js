import * as THREE from 'three';

let boss;
let projectiles = [];
let lastAttack = 0;
const attackCooldown = 1500;
let moveTimer = 0;

function createEnemy3() {
  const geo = new THREE.BoxGeometry(3, 3, 3);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
  boss = new THREE.Mesh(geo, mat);
  boss.position.set(0, 0, 0);
  return boss;
}

function throwProjectile(target, scene) {
  const geo = new THREE.SphereGeometry(0.3, 12, 12);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff2200 });
  const proj = new THREE.Mesh(geo, mat);

  proj.position.copy(boss.position);
  const dir = new THREE.Vector3().subVectors(target.position, boss.position).normalize();
  proj.userData.velocity = dir.multiplyScalar(0.2);

  scene.add(proj);
  projectiles.push(proj);
}

function updateEnemy3(target, scene, time) {
  if (!boss) return;

  // Random wandering
  if (time - moveTimer > 2000) {
    boss.userData.dir = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      0,
      (Math.random() - 0.5) * 0.1
    );
    moveTimer = time;
  }
  if (boss.userData.dir) {
    boss.position.add(boss.userData.dir);
  }

  if (time - lastAttack > attackCooldown) {
    throwProjectile(target, scene);
    lastAttack = time;
  }

  projectiles.forEach((proj, i) => {
    proj.position.add(proj.userData.velocity);
    if (proj.position.distanceTo(target.position) < 1) {
      console.log("Dummy hit by Enemy3!");
      scene.remove(proj);
      projectiles.splice(i, 1);
    }
  });
}

export { createEnemy3, updateEnemy3 };
