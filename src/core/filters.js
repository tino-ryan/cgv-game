import * as THREE from "three";

let mainCharRef = null;
export function setMainCharRef(mainChar) {
  mainCharRef = mainChar;
}

// Generic glow with halo (used by all glow filters)
function applyGlow(
  rootMesh,
  bloomPass,
  color = 0xffffff,
  intensity = 0.25,
  haloStrength = 1.2
) {
  rootMesh.traverse((m) => {
    if (m.isMesh && m.material) {
      if (!m.userData.originalMaterial)
        m.userData.originalMaterial = m.material.clone();
      const mat = m.material.clone();

      mat.emissive = new THREE.Color(color);
      mat.emissiveIntensity = intensity;

      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = `
          uniform float haloIntensity;
          ${shader.fragmentShader}
        `.replace(
          `#include <emissivemap_fragment>`,
          `#include <emissivemap_fragment>
           float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vec3(0.0, 0.0, 1.0))), 1.4);
           diffuseColor.rgb += haloIntensity * fresnel * vec3(${
             ((color >> 16) & 255) / 255.0
           }, ${((color >> 8) & 255) / 255.0}, ${(color & 255) / 255.0}) * 1.2;
           diffuseColor.rgb += emissive * 0.9;
          `
        );
        shader.uniforms.haloIntensity = { value: haloStrength };
      };

      m.material = mat;
      m.material.needsUpdate = true;
    }
  });

  if (bloomPass) bloomPass.strength = 0.6;
}

// Glows
export function applyGoodGlow(rootMesh, bloomPass) {
  applyGlow(rootMesh, bloomPass, 0x78dfff, 0.35, 0.9);
}
export function applyEvilGlow(rootMesh, bloomPass) {
  applyGlow(rootMesh, bloomPass, 0x990000, 0.8, 1.4);
}
export function applyWhiteGlow(rootMesh, bloomPass) {
  applyGlow(rootMesh, bloomPass, 0xfef8e6, 0.3, 0.9);
}

// Clear glow
export function clearGlow(rootMesh, bloomPass) {
  rootMesh.traverse((m) => {
    if (m.isMesh && m.userData.originalMaterial) {
      m.material = m.userData.originalMaterial;
      delete m.userData.originalMaterial;
      m.material.needsUpdate = true;
    }
  });
  if (bloomPass) bloomPass.strength = 1.0;
}

// Create floating dust particles system
export function createDustParticles(scene) {
  const particleCount = 500;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = Math.random() * 15;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

    velocities.push({
      x: (Math.random() - 0.5) * 0.01,
      y: Math.random() * 0.005 + 0.002,
      z: (Math.random() - 0.5) * 0.01,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(102, 65, 33, 0.8)");
  gradient.addColorStop(0.5, "rgba(102, 65, 33, 0.3)");
  gradient.addColorStop(1, "rgba(102, 65, 33, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    size: 0.15,
    map: texture,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: false,
  });

  const particles = new THREE.Points(geometry, material);
  particles.userData.velocities = velocities;
  particles.userData.isDustParticles = true;
  scene.add(particles);

  return particles;
}

// Update dust particles animation
export function updateDustParticles(particles, delta) {
  if (!particles || !particles.userData.isDustParticles) return;

  const positions = particles.geometry.attributes.position.array;
  const velocities = particles.userData.velocities;

  for (let i = 0; i < velocities.length; i++) {
    positions[i * 3] += velocities[i].x;
    positions[i * 3 + 1] += velocities[i].y;
    positions[i * 3 + 2] += velocities[i].z;

    if (positions[i * 3 + 1] > 15) {
      positions[i * 3 + 1] = 0;
    }

    if (Math.abs(positions[i * 3]) > 20) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
    }
    if (Math.abs(positions[i * 3 + 2]) > 20) {
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
  }

  particles.geometry.attributes.position.needsUpdate = true;
}

// Scene filters
export function applyCleanScene(
  scene,
  renderer,
  sparklePass,
  ambientLight,
  dirLight,
  lampLights
) {
  renderer.toneMappingExposure = 1.8; // Bright exposure
  if (sparklePass) sparklePass.enabled = true;

  // Brighter lighting for clean scene
  if (ambientLight) {
    ambientLight.intensity = 1.0;
    ambientLight.color.setHex(0xffffff);
  }
  if (dirLight) {
    dirLight.intensity = 1.5;
    dirLight.color.setHex(0xfff8e6);
  }

  // Bright warm lamp lights
  if (lampLights && lampLights.length > 0) {
    lampLights.forEach((light) => {
      light.visible = true;
      light.intensity = 2.5;
    });
  }

  scene.traverse((obj) => {
    // Skip player ghost and any object marked as protected
    if (obj.userData.isPlayerGhost || obj.userData.protectFromFilter) {
      return;
    }

    if (obj.isMesh && obj.material) {
      // Make lamps glow brightly
      if (obj.userData.isLamp && obj.material.emissive) {
        obj.material.emissiveIntensity = 0.9;
        obj.material.needsUpdate = true;
        return;
      }

      obj.material.roughness = 0.3;
      obj.material.metalness = 0.3;
      obj.material.envMapIntensity = 1.0;
      obj.material.color.setHex(0xffffff);
      obj.material.needsUpdate = true;
    }
  });
}

export function applyDirtyScene(
  scene,
  renderer,
  dustParticles,
  ambientLight,
  dirLight,
  lampLights
) {
  renderer.toneMappingExposure = 0.85;
  if (dustParticles) dustParticles.visible = true;

  // Dimmer lighting for dirty scene
  if (ambientLight) {
    ambientLight.intensity = 0.6;
    ambientLight.color.setHex(0xa89582);
  }
  if (dirLight) {
    dirLight.intensity = 0.7;
    dirLight.color.setHex(0xa89582);
  }

  // Dim warm lamp lights
  if (lampLights && lampLights.length > 0) {
    lampLights.forEach((light) => {
      light.visible = true;
      light.intensity = 1.0; // Soft warm glow
    });
  }

  scene.traverse((obj) => {
    // Skip the player ghost completely - no brown tint!
    if (obj.userData.isPlayerGhost || obj.userData.protectFromFilter) {
      return;
    }

    if (obj.isMesh && obj.material) {
      // Make lamps glow dimly
      if (obj.userData.isLamp && obj.material.emissive) {
        obj.material.emissiveIntensity = 0.4;
        obj.material.needsUpdate = true;
        return;
      }

      obj.material.roughness = 0.85;
      obj.material.metalness = 0.2;
      obj.material.envMapIntensity = 0.4;
      obj.material.color.setHex(0xa59582); // Lighter brownish for environment
      obj.material.needsUpdate = true;
    }
  });
}

export function applyReflectiveScene(scene, renderer, dynamicLight) {
  renderer.toneMappingExposure = 1.4;
  if (dynamicLight) dynamicLight.visible = true;

  scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material.roughness = 0.25;
      obj.material.metalness = 0.6;
      obj.material.envMapIntensity = 1.1;
      obj.material.needsUpdate = true;
    }
  });
}

export function clearScene(
  scene,
  renderer,
  dustParticles,
  sparklePass,
  dynamicLight,
  lampLights
) {
  renderer.toneMappingExposure = 1.0;
  if (dustParticles) dustParticles.visible = false;
  if (sparklePass) sparklePass.enabled = false;
  if (dynamicLight) dynamicLight.visible = false;

  if (lampLights && lampLights.length > 0) {
    lampLights.forEach((light) => {
      light.visible = false;
    });
  }

  scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material.roughness = 0.4;
      obj.material.metalness = 0.5;
      obj.material.envMapIntensity = 1.0;
      obj.material.color.setHex(0xffffff);
      obj.material.needsUpdate = true;
    }
  });
}
