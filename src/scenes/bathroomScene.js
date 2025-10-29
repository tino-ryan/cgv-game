import * as THREE from "three";
import Player from "../entities/player.js";
import HUD from "../ui/hud.js";
import PhysicsSystem from "../systems/physics.js";
import BathroomBoss from "../entities/bathroomBoss.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class BathroomScene {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Initialize physics system
    this.physics = new PhysicsSystem(this.scene);

    this.bathroomModel = null;
    this.mirror = null;
    this.mirrorCamera = null;
    this.mirrorRenderTarget = null;

    // Boss and game state
    this.boss = null;
    this.bossSpawned = false;
    this.torchEnabled = false;
    this.torchLight = null;
    this.hitByProjectile = false;
    this.showTorchPrompt = false;

    this.loadBathroomEnvironment();

    // Dark lighting setup for boss fight
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.1); // Very dark ambient
    this.directionalLight = new THREE.DirectionalLight(0x404040, 0.2); // Dim directional
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;

    this.scene.add(this.ambientLight, this.directionalLight);

    // Dark background
    this.scene.background = new THREE.Color(0x0a0a0a);

    const TORCH_COLOR = 0xfff4da; // warm-white LED
    const TORCH_INTENSITY = 5.5;  // brighter
    const TORCH_DISTANCE  = 35;   // how far light travels
    const TORCH_ANGLE_DEG = 18;   // narrower cone for punch
    const TORCH_PENUMBRA  = 0.55; // softer edge
    const TORCH_DECAY     = 2.0;  // realistic falloff

    // Create torch light (initially off)
    this.torchLight = new THREE.SpotLight(
      TORCH_COLOR,
      TORCH_INTENSITY,
      TORCH_DISTANCE,
      THREE.MathUtils.degToRad(TORCH_ANGLE_DEG),
      TORCH_PENUMBRA,
      TORCH_DECAY
    );
    this.torchLight.visible = false;
    this.camera.add(this.torchLight);
    this.torchLight.position.set(0.6, -0.4, -1);
    this.torchLight.target.position.set(0, 0, -5);
    this.camera.add(this.torchLight.target);

    // HUD
    this.hud = new HUD();

    // Player
    this.player = new Player(this.scene, this.camera, this.hud);

    // CRITICAL: Enter combat mode for first-person view
    this.player.enterCombat();

    this.camera.position.y = 2.5; // <-- higher up

    this.player.loadGhost("/public/assets/models/mainchar.glb").then(() => {
      if (this.player.ghost) {
        // Position player higher to align with camera height (2.5)
        this.player.ghost.position.set(0, 2.5, 10);

        // Make ghost invisible in first-person
        this.player.ghost.visible = false;

        console.log("✅ Player positioned in bathroom (first-person mode)");
      }
    });

    // Load gun and attach to camera
    this.player.loadGun("/public/assets/models/gun.glb").then(() => {
      if (this.player.gun) {
        this.player.gun.visible = true;

        // Attach gun to camera so it moves with view
        this.camera.add(this.player.gun);

        // Adjust gun position relative to camera
        this.player.gun.position.set(0.6, -0.4, -0.8); // tweak as needed
        this.gun.rotation.set(-Math.PI / 1, 0, 3);

        console.log("✅ Gun loaded and attached to camera");
      }
    });

    // Global reference for debugging
    window.bathroomScene = this;

    this.gameOver = false;

    // Setup UI prompts
    this.setupUI();

    console.log("🛁 Bathroom scene initialized in first-person mode");
  }

  setupUI() {
    // Create torch prompt element
    this.torchPromptElement = document.createElement("div");
    this.torchPromptElement.id = "torch-prompt";
    this.torchPromptElement.innerHTML = "Press E to turn on torch!";
    this.torchPromptElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff6600;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      display: none;
      z-index: 1000;
      animation: pulse 1s infinite;
    `;

    // Add pulsing animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.torchPromptElement);
  }

  spawnBoss() {
    if (this.bossSpawned) return;

    console.log("🐐 Spawning Bathroom Boss...");
    this.boss = new BathroomBoss(this.scene, this.player, this.hud, this.physics);
    this.bossSpawned = true;

    // Start the sequence after a short delay
    setTimeout(() => {
      this.startBossFight();
    }, 1000);
  }

  startBossFight() {
    console.log("🔥 Boss fight started!");

    // Immediately shoot a projectile at the player to trigger the sequence
    setTimeout(() => {
      if (this.boss && this.boss.isAlive) {
        this.boss.shoot();
        console.log("💥 Boss fired initial shot!");
      }
    }, 500);
  }

  toggleTorch() {
    if (!this.torchEnabled) {
      // Turn on torch
      this.torchEnabled = true;
      this.torchLight.visible = true;
      this.showTorchPrompt = false;
      this.torchPromptElement.style.display = "none";

      // Brighten the scene slightly when torch is on
      this.ambientLight.intensity = 0.3;

      console.log("🔦 Torch enabled!");

      // Show instructions for shooting
      setTimeout(() => {
        this.showShootingInstructions();
      }, 1000);
    } else {
      // Turn off torch
      this.torchEnabled = false;
      this.torchLight.visible = false;
      this.ambientLight.intensity = 0.1;
      console.log("🔦 Torch disabled!");
    }
  }

  showShootingInstructions() {
    const instructionsElement = document.createElement("div");
    instructionsElement.innerHTML = "Left click to shoot the boss!";
    instructionsElement.style.cssText = `
      position: fixed;
      top: 70%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ffff00;
      font-size: 18px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      z-index: 1000;
    `;
    document.body.appendChild(instructionsElement);

    // Remove after 5 seconds
    setTimeout(() => {
      if (instructionsElement.parentNode) {
        instructionsElement.parentNode.removeChild(instructionsElement);
      }
    }, 5000);
  }

  handleProjectileHit() {
    if (!this.hitByProjectile) {
      this.hitByProjectile = true;

      // Player takes damage
      if (this.player && this.player.health) {
        this.player.health.takeDamage(1);
      }

      // Show torch prompt
      this.showTorchPrompt = true;
      this.torchPromptElement.style.display = "block";

      console.log("💔 Player hit by projectile! Show torch prompt.");
    }
  }

  // Handle E key press for torch
  handleInteraction() {
    if (this.showTorchPrompt && !this.torchEnabled) {
      this.toggleTorch();
    }
  }

  async loadBathroomEnvironment() {
    const loader = new GLTFLoader();

    try {
      console.log("Loading bathroom model...");
      const gltf = await loader.loadAsync("/assets/models/smallbathroom.glb");

      this.bathroomModel = gltf.scene;
      this.bathroomModel.position.set(0, 4.5, 5);
      this.bathroomModel.scale.set(4, 4, 4);
      this.scene.add(this.bathroomModel);

      console.log("✅ Bathroom model loaded. Adding collisions...");

      this.addCollisions(this.bathroomModel);
      this.setupMirror(this.bathroomModel);

      // Spawn boss after bathroom is loaded
      this.spawnBoss();
    } catch (err) {
      console.error("❌ Failed to load bathroom environment:", err);
    }
  }

  addCollisions(root) {
    let added = 0;
    let skipped = 0;
    const tempBox = new THREE.Box3();
    const size = new THREE.Vector3();

    root.traverse((child) => {
      if (child.isMesh) {
        const name = (child.name || "").toLowerCase();

        if (name.includes("sink")) {
          this.physics.addCollisionObject(child, false);
          added++;
          return;
        }

        tempBox.setFromObject(child);
        tempBox.getSize(size);

        const minSize = 0.4;
        if (size.x < minSize && size.y < minSize && size.z < minSize) {
          skipped++;
          return;
        }

        if (
          name.includes("bottle") ||
          name.includes("soap") ||
          name.includes("toothbrush") ||
          name.includes("cup") ||
          name.includes("toothpaste") ||
          name.includes("towel") ||
          name.includes("brush")
        ) {
          skipped++;
          return;
        }

        this.physics.addCollisionObject(child, false);
        added++;
      }
    });

    console.log(
      `✅ Added ${added} collision objects, skipped ${skipped} small props.`
    );
  }

  setupMirror(root) {
    const mirrorName = "defaultMaterial076";
    const mirrorMesh = root.getObjectByName(mirrorName);

    if (!mirrorMesh) {
      console.warn("⚠️ Mirror mesh not found:", mirrorName);
      return;
    }

    console.log("🪞 Mirror mesh found:", mirrorMesh.name);

    // Create render target for mirror reflection
    const renderTargetSize = 512;
    this.mirrorRenderTarget = new THREE.WebGLRenderTarget(renderTargetSize, renderTargetSize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      generateMipmaps: false, // Prevent WebGL warnings
      type: THREE.UnsignedByteType,
    });

    // Create mirror camera with wider FOV to see more
    this.mirrorCamera = new THREE.PerspectiveCamera(
      75, // Wider FOV to see more in reflection
      1, // Square aspect ratio for mirror
      0.1,
      100
    );

    // Store mirror mesh reference and position
    this.mirrorMesh = mirrorMesh;

    // Get mirror's world position and normal
    mirrorMesh.updateMatrixWorld();
    this.mirrorWorldPosition = new THREE.Vector3();
    this.mirrorWorldNormal = new THREE.Vector3(0, 0, 1);

    mirrorMesh.getWorldPosition(this.mirrorWorldPosition);
    this.mirrorWorldNormal.transformDirection(mirrorMesh.matrixWorld);

    // Create mirror material with render target texture
    const mirrorMaterial = new THREE.MeshBasicMaterial({
      map: this.mirrorRenderTarget.texture,
      transparent: true,
      opacity: 0.9,
    });

    // Apply mirror material to the mesh
    mirrorMesh.material = mirrorMaterial;

    this.mirror = mirrorMesh;

    console.log("✅ Custom mirror with render target created!");

    // Debug helper - add to global scope
    window.debugMirror = () => {
      console.log("Mirror position:", this.mirrorWorldPosition);
      console.log("Mirror normal:", this.mirrorWorldNormal);
      console.log("Camera position:", this.camera.position);
      console.log("Mirror camera position:", this.mirrorCamera.position);

      // Try different normal orientations
      const normals = [
        { name: "positive Z", vec: new THREE.Vector3(0, 0, 1) },
        { name: "negative Z", vec: new THREE.Vector3(0, 0, -1) },
        { name: "positive X", vec: new THREE.Vector3(1, 0, 0) },
        { name: "negative X", vec: new THREE.Vector3(-1, 0, 0) },
        { name: "positive Y", vec: new THREE.Vector3(0, 1, 0) },
        { name: "negative Y", vec: new THREE.Vector3(0, -1, 0) }
      ];

      console.log("Try these normals by setting window.mirrorNormal:");
      normals.forEach(n => {
        console.log(`window.mirrorNormal = new THREE.Vector3(${n.vec.x}, ${n.vec.y}, ${n.vec.z}); // ${n.name}`);
      });
    };

    // Allow runtime normal adjustment
    window.mirrorNormal = null;

    // Debug function to test mirror camera view
    window.showMirrorView = () => {
      // Temporarily switch to mirror camera view to see what it sees
      const originalCamera = this.camera;
      this.camera = this.mirrorCamera;

      setTimeout(() => {
        this.camera = originalCamera;
        console.log("Switched back to normal camera");
      }, 3000);

      console.log("Showing mirror camera view for 3 seconds...");
    };

    // Debug scene contents
    window.debugSceneObjects = () => {
      console.log("=== SCENE OBJECTS ===");
      let meshCount = 0;
      this.scene.traverse((child) => {
        if (child.isMesh) {
          meshCount++;
          console.log(`Mesh ${meshCount}: ${child.name || 'unnamed'}, visible: ${child.visible}, position:`, child.position);
          if (child.parent) {
            console.log(`  Parent: ${child.parent.name || 'unnamed'}, visible: ${child.parent.visible}`);
          }
        }
      });
      console.log(`Total meshes: ${meshCount}`);
      console.log("Player ghost:", this.player?.ghost?.visible, this.player?.ghost?.position);
      console.log("Player gun:", this.player?.gun?.visible, this.player?.gun?.position);
      console.log("Bathroom model:", this.bathroomModel?.visible, this.bathroomModel?.position);
    };
  }

  updateMirror() {
    if (!this.mirror || !this.mirrorCamera || !this.mirrorRenderTarget) return;

    // Update mirror world position and normal each frame
    this.mirror.updateMatrixWorld();
    this.mirror.getWorldPosition(this.mirrorWorldPosition);

    // Use runtime-adjustable normal or default
    if (window.mirrorNormal) {
      this.mirrorWorldNormal.copy(window.mirrorNormal);
      this.mirrorWorldNormal.transformDirection(this.mirror.matrixWorld);
    } else {
      // Most bathroom mirrors face towards positive Z in local space
      this.mirrorWorldNormal.set(0, 0, 1);
      this.mirrorWorldNormal.transformDirection(this.mirror.matrixWorld);
    }
    this.mirrorWorldNormal.normalize();

    // Manual reflection calculation
    const mirrorPlane = new THREE.Plane();
    mirrorPlane.setFromNormalAndCoplanarPoint(this.mirrorWorldNormal, this.mirrorWorldPosition);

    // Reflect camera position across the plane
    const cameraPos = this.camera.position.clone();
    const distanceToPlane = mirrorPlane.distanceToPoint(cameraPos);
    const reflectedPosition = cameraPos.clone().add(
      this.mirrorWorldNormal.clone().multiplyScalar(-2 * distanceToPlane)
    );

    // Get camera's forward direction and reflect it
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    const reflectedDirection = cameraDirection.clone().reflect(this.mirrorWorldNormal);

    // Set mirror camera position and look direction
    this.mirrorCamera.position.copy(reflectedPosition);
    this.mirrorCamera.lookAt(reflectedPosition.clone().add(reflectedDirection));

    // Copy other camera properties
    this.mirrorCamera.fov = this.camera.fov;
    this.mirrorCamera.aspect = 1;
    this.mirrorCamera.near = 0.1;
    this.mirrorCamera.far = 100;
    this.mirrorCamera.updateProjectionMatrix();

    // Store visibility states
    const visibilityStates = new Map();

    // Hide mirror and store all visibility states
    this.scene.traverse((child) => {
      if (child.visible !== undefined) {
        visibilityStates.set(child, child.visible);
        if (child === this.mirror) {
          child.visible = false;
        } else if (child === this.player?.ghost) {
          child.visible = true; // Show player in reflection
        } else if (child === this.player?.gun) {
          child.visible = true; // Show gun in reflection
        }
      }
    });

    // Clear and render to mirror
    this.renderer.setRenderTarget(this.mirrorRenderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.mirrorCamera);
    this.renderer.setRenderTarget(null);

    // Restore all visibility states
    visibilityStates.forEach((visible, child) => {
      child.visible = visible;
    });
  }

  updateWithCameraRotation(yaw, pitch) {
    const delta = this.clock.getDelta();
    const safeDelta = Math.min(delta, 0.1);
    const time = this.clock.getElapsedTime();

    if (this.gameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.player && this.player.update) {
      this.player.update();
    }

    // Update boss
    if (this.boss && this.boss.isAlive) {
      this.boss.update(safeDelta, time);
      this.checkProjectileCollisions();
    }

    // Update torch light direction
    if (this.torchEnabled && this.torchLight) {
      // Update torch target based on camera direction
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(this.camera.quaternion);
      this.torchLight.target.position.copy(this.camera.position).add(direction.multiplyScalar(10));
    }

    // Update mirror reflection
    this.updateMirror();

    this.renderer.render(this.scene, this.camera);
  }

  checkProjectileCollisions() {
    if (!this.boss || !this.player || !this.player.ghost) return;

    // Check if any boss projectiles hit the player
    this.boss.projectiles.forEach((projectile, index) => {
      const distance = projectile.position.distanceTo(this.player.ghost.position);
      if (distance < 1.0) { // Hit detection radius
        // Remove the projectile
        this.scene.remove(projectile);
        this.boss.projectiles.splice(index, 1);

        // Handle the hit
        this.handleProjectileHit();
      }
    });
  }

  update() {
    this.updateWithCameraRotation(0, 0);
  }

  getCameraSnapRotation() {
    return null;
  }

  highlightMesh(name, color = 0xff0000) {
    if (!this.bathroomModel) {
      console.warn("Bathroom model not loaded yet.");
      return;
    }

    const mesh = this.bathroomModel.getObjectByName(name);
    if (mesh) {
      console.log("Highlighting mesh:", name, mesh);
      mesh.material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
      });
    } else {
      console.warn("Mesh not found:", name);
    }
  }
}
