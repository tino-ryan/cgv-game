import * as THREE from "three";
import Player from "../entities/player.js";
import HUD from "../ui/hud.js";
import PhysicsSystem from "../systems/physics.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

export default class BathroomScene {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Initialize physics system
    this.physics = new PhysicsSystem(this.scene);

    this.bathroomModel = null;
    this.loadBathroomEnvironment();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 5, 0);

    this.scene.add(ambient, dirLight, pointLight);

    // Background
    this.scene.background = new THREE.Color(0x87ceeb);

    // HUD
    this.hud = new HUD();

    // Player
    this.player = new Player(this.scene, this.camera, this.hud);

    // CRITICAL: Enter combat mode for first-person view
    this.player.enterCombat();

    this.camera.position.y = 2.5; // <-- higher up

    this.player.loadGhost("/public/assets/models/mainchar.glb").then(() => {
      if (this.player.ghost) {
        // Position player in the bathroom
        this.player.ghost.position.set(0, 3, 10);

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

    console.log("🛁 Bathroom scene initialized in first-person mode");
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

    const mirrorGeometry = mirrorMesh.geometry.clone();
    const mirrorParent = mirrorMesh.parent;

    const mirror = new Reflector(mirrorGeometry, {
      clipBias: 0.1,
      textureWidth: window.innerWidth * window.devicePixelRatio * 0.5,
      textureHeight: window.innerHeight * window.devicePixelRatio * 0.5,
      color: 0xcccccc,
      multisample: 4,
    });

    mirror.position.copy(mirrorMesh.position);
    mirror.rotation.copy(mirrorMesh.rotation);
    mirror.scale.copy(mirrorMesh.scale);

    const originalOnBeforeRender = mirror.onBeforeRender.bind(mirror);
    mirror.onBeforeRender = function (renderer, scene, camera) {
      const originalNear = camera.near;
      const originalFar = camera.far;

      camera.near = 0.5;
      camera.far = 20;
      camera.updateProjectionMatrix();

      originalOnBeforeRender(renderer, scene, camera);

      camera.near = originalNear;
      camera.far = originalFar;
      camera.updateProjectionMatrix();
    };

    mirrorParent.remove(mirrorMesh);
    mirrorParent.add(mirror);

    this.mirror = mirror;

    console.log(
      "✅ Reflective mirror successfully added with constrained viewing!"
    );
  }

  updateWithCameraRotation(yaw, pitch) {
    const delta = this.clock.getDelta();
    const safeDelta = Math.min(delta, 0.1);

    if (this.gameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.player && this.player.update) {
      this.player.update();
    }

    this.renderer.render(this.scene, this.camera);
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
