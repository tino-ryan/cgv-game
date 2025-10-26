import * as THREE from 'three';

let mainCharRef = null;
export function setMainCharRef(mainChar) {
  mainCharRef = mainChar;
}

// Generic glow with halo (used by all glow filters)
function applyGlow(rootMesh, bloomPass, color = 0xffffff, intensity = 0.25, haloStrength = 1.2) {
  rootMesh.traverse((m) => {
    if (m.isMesh && m.material) {
      if (!m.userData.originalMaterial) m.userData.originalMaterial = m.material.clone();
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
           diffuseColor.rgb += haloIntensity * fresnel * vec3(${(color >> 16 & 255)/255.0}, ${(color >> 8 & 255)/255.0}, ${(color & 255)/255.0}) * 1.2;
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
  applyGlow(rootMesh, bloomPass, 0x78dfff, 0.35, 0.9); // Soft, light-blue
}
export function applyEvilGlow(rootMesh, bloomPass) {
  applyGlow(rootMesh, bloomPass, 0x990000, 0.8, 1.4); // Intense dark red
}
export function applyWhiteGlow(rootMesh, bloomPass) {
  applyGlow(rootMesh, bloomPass, 0xfef8e6, 0.3, 0.9); // Soft neutral white
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

// 🟤 Cartoonish static dirt texture - Overlay with #664121 splotches
export function generateDirtTexture(width = 1024, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Clear to transparent (alpha=0)
  ctx.clearRect(0, 0, width, height);

  // Super subtle vignette
  const vignette = ctx.createRadialGradient(width / 2, height / 2, width / 4.0, width / 2, height / 2, width / 1.3);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(40,25,8,0.08)'); // Subtle edge tint
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Splotches with #664121 (RGB: 102, 65, 33), slightly more opaque
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 25 + 8; // Size 8-33
    const alpha = Math.random() * 0.15 + 0.15; // Opaque: 0.15-0.3
    ctx.fillStyle = `rgba(102, 65, 33, ${alpha})`; // #664121 brown
    ctx.beginPath();
    ctx.ellipse(x, y, size * (0.65 + Math.random() * 0.35), size, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;
  return texture;
}

// Scene filters
export function applyCleanScene(scene, renderer, sparklePass) {
  renderer.toneMappingExposure = 1.4;
  if (sparklePass) sparklePass.enabled = true;

  scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material.roughness = 0.3;
      obj.material.metalness = 0.3;
      obj.material.envMapIntensity = 1.0;
      obj.material.color = new THREE.Color(0xe6faff);
      obj.material.needsUpdate = true;
    }
  });
}

export function applyDirtyScene(scene, renderer, overlayMesh) {
  renderer.toneMappingExposure = 1.0;
  if (overlayMesh) overlayMesh.visible = true;

  scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material.roughness = 0.85;
      obj.material.metalness = 0.2;
      obj.material.envMapIntensity = 0.4;
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

export function clearScene(scene, renderer, overlayMesh, sparklePass, dynamicLight) {
  renderer.toneMappingExposure = 1.0;
  if (overlayMesh) overlayMesh.visible = false;
  if (sparklePass) sparklePass.enabled = false;
  if (dynamicLight) dynamicLight.visible = false;

  scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material.roughness = 0.4;
      obj.material.metalness = 0.5;
      obj.material.envMapIntensity = 1.0;
      obj.material.color = new THREE.Color(0xffffff);
      obj.material.needsUpdate = true;
    }
  });
}
