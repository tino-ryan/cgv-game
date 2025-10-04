import * as THREE from 'three';

let boss;
let projectiles = [];
let lastAttack = 0;
const attackCooldown = 1000; // faster

function createEnemy2() {
  const geo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
  const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
  boss = new THREE.Mesh(geo, mat);
  boss.position.set(0, 0, -5);
  return boss;
}

function throwProjectile(target, scene) {
  const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
  const proj = new THREE.Mesh(geo, mat);

  proj.position.copy(boss.position);
  const dir = new THREE.Vector3().subVectors(target.position, boss.position).normalize();
  proj.userData.velocity = dir.multiplyScalar(0.15);

  scene.add(proj);
  projectiles.push(proj);
}

function updateEnemy2(target, scene, time) {
  if (!boss) return;

  boss.material.color.set(0x00ffff);

  if (time - lastAttack > attackCooldown) {
    throwProjectile(target, scene);
    lastAttack = time;
  }

  projectiles.forEach((proj, i) => {
    proj.position.add(proj.userData.velocity);
    if (proj.position.distanceTo(target.position) < 1) {
      console.log("Dummy hit by Enemy2!");
      scene.remove(proj);
      projectiles.splice(i, 1);
    }
  });
}

export { createEnemy2, updateEnemy2 };
