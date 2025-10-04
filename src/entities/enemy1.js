import * as THREE from 'three';

let boss, bossDirection = 1;
let projectiles = [];
let lastAttack = 0;
const attackCooldown = 2000;

function createEnemy1() {
  const geo = new THREE.BoxGeometry(2, 2, 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  boss = new THREE.Mesh(geo, mat);
  boss.position.set(5, 0, 0);
  return boss;
}

function throwProjectile(target, scene) {
  const geo = new THREE.SphereGeometry(0.2, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffff00 });
  const proj = new THREE.Mesh(geo, mat);

  proj.position.copy(boss.position);
  const dir = new THREE.Vector3().subVectors(target.position, boss.position).normalize();
  proj.userData.velocity = dir.multiplyScalar(0.1);

  scene.add(proj);
  projectiles.push(proj);
}

function updateEnemy1(target, scene, time) {
  if (!boss) return;

  const dx = target.position.x - boss.position.x;
  const dz = target.position.z - boss.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist >= 6) {
    boss.position.x += 0.05 * bossDirection;
    if (boss.position.x > 5 || boss.position.x < -5) bossDirection *= -1;
    boss.material.color.set(0xff0000);
  }

  if (dist < 6) {
    boss.position.x += (dx / dist) * 0.03;
    boss.position.z += (dz / dist) * 0.03;
    boss.material.color.set(0x0000ff);

    if (time - lastAttack > attackCooldown) {
      throwProjectile(target, scene);
      lastAttack = time;
    }
  }

  projectiles.forEach((proj, i) => {
    proj.position.add(proj.userData.velocity);
    if (proj.position.distanceTo(target.position) < 1) {
      console.log("Dummy hit by Enemy1!");
      scene.remove(proj);
      projectiles.splice(i, 1);
    }
  });
}

export { createEnemy1, updateEnemy1 };
