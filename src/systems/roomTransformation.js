// src/systems/roomTransformation.js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class RoomTransformation {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.isTransformed = false;
  }

  async transformRoom(oldModel) {
    if (this.isTransformed) {
      console.log("Room already transformed!");
      return;
    }

    console.log("✨ Transforming room...");

    // Show transformation effect
    this.showTransformationEffect();

    // Wait for effect
    await this.sleep(1000);

    // PLACEHOLDER: Load new clean mesh
    // TODO: Replace with actual clean lobby model when available
    /*
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync("/assets/models/lobby_clean.glb");

      // Remove old model
      if (oldModel) {
        this.scene.remove(oldModel);
        // Clear old collision objects
        this.physics.clearCollisionObjects();
      }

      // Add new clean model
      const cleanModel = gltf.scene;
      cleanModel.position.set(0, 0, 0);
      cleanModel.scale.set(2.5, 2.5, 2.5);
      this.scene.add(cleanModel);

      // Register new collision objects
      this.physics.addCollisionObject(cleanModel, true);

      this.isTransformed = true;
      return cleanModel;
    } catch (err) {
      console.error("Failed to load clean lobby model:", err);
    }
    */

    // TEMPORARY: Apply visual effect to existing model to show transformation
    if (oldModel) {
      this.applyCleanEffect(oldModel);
    }

    this.isTransformed = true;
    console.log("✅ Room transformation complete!");
  }

  applyCleanEffect(model) {
    // Temporary visual effect: brighten and saturate materials
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone material to avoid affecting other instances
        child.material = child.material.clone();

        // Brighten the material
        if (child.material.color) {
          child.material.color.multiplyScalar(1.3);
        }

        // Increase emissive for a "clean" glow
        if (child.material.emissive) {
          child.material.emissive.setRGB(0.1, 0.1, 0.1);
          child.material.emissiveIntensity = 0.2;
        }

        // Increase metalness/roughness for cleaner look
        if (child.material.metalness !== undefined) {
          child.material.metalness = Math.min(1, child.material.metalness + 0.2);
        }
        if (child.material.roughness !== undefined) {
          child.material.roughness = Math.max(0, child.material.roughness - 0.3);
        }
      }
    });

    console.log("Applied temporary clean effect to existing model");
  }

  showTransformationEffect() {
    // Create flash overlay
    const flash = document.createElement("div");
    flash.style.position = "fixed";
    flash.style.top = "0";
    flash.style.left = "0";
    flash.style.width = "100%";
    flash.style.height = "100%";
    flash.style.background = "white";
    flash.style.opacity = "0";
    flash.style.zIndex = "9999";
    flash.style.pointerEvents = "none";
    flash.style.transition = "opacity 0.5s";
    document.body.appendChild(flash);

    // Flash effect
    setTimeout(() => {
      flash.style.opacity = "0.8";
    }, 10);

    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(flash);
      }, 500);
    }, 500);

    // Show transformation message
    this.showMessage("✨ The Hotel Lobby has been restored! ✨");

    // Add sparkle particles in the 3D scene
    this.createSparkleEffect();
  }

  createSparkleEffect() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < particleCount; i++) {
      // Random position in the room
      positions.push(
        (Math.random() - 0.5) * 50,
        Math.random() * 5,
        (Math.random() - 0.5) * 50
      );

      // Gold/white colors
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.1 + 0.1, 0.8, 0.7);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    // Animate particles rising and fading
    let opacity = 1;
    const animate = () => {
      const positions = particles.geometry.attributes.position.array;

      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.05; // Rise up
      }

      particles.geometry.attributes.position.needsUpdate = true;
      opacity -= 0.02;
      material.opacity = Math.max(0, opacity);

      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(particles);
        geometry.dispose();
        material.dispose();
      }
    };

    animate();
  }

  showMessage(text) {
    const message = document.createElement("div");
    message.style.position = "fixed";
    message.style.top = "40%";
    message.style.left = "50%";
    message.style.transform = "translate(-50%, -50%)";
    message.style.background = "rgba(0, 0, 0, 0.9)";
    message.style.color = "gold";
    message.style.padding = "30px 50px";
    message.style.borderRadius = "15px";
    message.style.fontSize = "32px";
    message.style.fontWeight = "bold";
    message.style.textAlign = "center";
    message.style.border = "4px solid gold";
    message.style.zIndex = "10000";
    message.style.textShadow = "2px 2px 4px black";
    message.textContent = text;
    document.body.appendChild(message);

    setTimeout(() => {
      message.style.transition = "opacity 1s";
      message.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(message);
      }, 1000);
    }, 4000);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
