import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import LobbyScene from "./scenes/lobbyScene.js";
import CutsceneManager from "./systems/cutsceneManager.js";
import { tutorialCutscene } from "./cutscenes/tutorialCutscene.js";

let renderer, camera, lobbyScene;
const mouseSensitivity = 0.002;

let yaw = 0;
let pitch = 0;

const yawObject = new THREE.Object3D();
const pitchObject = new THREE.Object3D();

async function init() {
  // Initialize renderer
  renderer = initRenderer();

  // Initialize camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5);

  // Set up camera hierarchy for rotation
  yawObject.add(pitchObject);
  pitchObject.add(camera);

  console.log("Renderer initialized:", renderer);
  console.log("Camera initialized:", camera);

  // Create the cutscene container overlay
  const cutsceneContainer = document.createElement("div");
  cutsceneContainer.id = "cutscene-container";
  document.body.appendChild(cutsceneContainer);

  Object.assign(cutsceneContainer.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "black",
    display: "none", // hidden by default
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "1000",
    color: "white",
    textAlign: "center",
  });

  // Create cutscene manager and play tutorial cutscene
  const cutsceneManager = new CutsceneManager("cutscene-container");

  // Play the cutscene before the game starts
  await cutsceneManager.play(tutorialCutscene);

  // Create lobby scene (includes tutorial and boss)
  lobbyScene = new LobbyScene(renderer, camera);
  lobbyScene.scene.add(yawObject);

  // Pointer Lock - activate on double-click
  document.body.addEventListener("dblclick", () => {
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
      console.log("Requesting pointer lock...");
    }
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === document.body) {
      console.log("Pointer lock enabled");
    } else {
      console.log("Pointer lock disabled");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      document.pointerLockElement === document.body
    ) {
      document.exitPointerLock();
    }
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === document.body) {
      yaw -= event.movementX * mouseSensitivity;
      pitch -= event.movementY * mouseSensitivity;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
  });

  // Keyboard controls
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    w: false,
    a: false,
    s: false,
    d: false,
  };

  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowUp":
        keys.up = true;
        break;
      case "ArrowDown":
        keys.down = true;
        break;
      case "ArrowLeft":
        keys.left = true;
        break;
      case "ArrowRight":
        keys.right = true;
        break;
      case "w":
      case "W":
        keys.w = true;
        break;
      case "a":
      case "A":
        keys.a = true;
        break;
      case "s":
      case "S":
        keys.s = true;
        break;
      case "d":
      case "D":
        keys.d = true;
        break;
      case "f":
      case "F":
        // Pickup bell
        if (lobbyScene.serviceBell) {
          lobbyScene.pickupBell();
        }
        break;
      case "e":
      case "E":
        // Use selected inventory item
        const selectedItem = lobbyScene.inventory.getSelectedItem();
        if (selectedItem && selectedItem.onUse) {
          selectedItem.onUse();
        }
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "ArrowUp":
        keys.up = false;
        break;
      case "ArrowDown":
        keys.down = false;
        break;
      case "ArrowLeft":
        keys.left = false;
        break;
      case "ArrowRight":
        keys.right = false;
        break;
      case "w":
      case "W":
        keys.w = false;
        break;
      case "a":
      case "A":
        keys.a = false;
        break;
      case "s":
      case "S":
        keys.s = false;
        break;
      case "d":
      case "D":
        keys.d = false;
        break;
    }
  });

  // Main game loop
  function animate() {
    requestAnimationFrame(animate);

    if (!lobbyScene.player.ghost) {
      lobbyScene.update();
      return;
    }

    // Check for camera snap (e.g., when boss spawns)
    const snapRotation = lobbyScene.getCameraSnapRotation();
    if (snapRotation) {
      yaw = snapRotation.yaw;
      pitch = snapRotation.pitch;
      console.log("Camera snapped to target!");
    }

    // Update camera rotation
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;

    // Calculate movement vectors
    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    if (lobbyScene.player.combatMode) {
      yawObject.getWorldDirection(forward);
      forward.negate();
      forward.y = 0;
      forward.normalize();
      right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
      right.negate();
    } else {
      forward = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
      ).normalize();
      right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
    }

    // Apply movement
    const moveSpeed = 0.1;
    let moveVector = new THREE.Vector3();
    if (keys.up || keys.w) moveVector.add(forward);
    if (keys.down || keys.s) moveVector.add(forward.clone().multiplyScalar(-1));
    if (keys.left || keys.a) moveVector.add(right.clone().multiplyScalar(-1));
    if (keys.right || keys.d) moveVector.add(right);

    if (moveVector.length() > 0) {
      moveVector.normalize();

      // Get collision-safe movement from physics system
      const currentPos = lobbyScene.player.ghost.position;
      const safeMovement = lobbyScene.physics.getSafeMovement(
        currentPos,
        moveVector,
        moveSpeed
      );

      // Apply the safe movement
      lobbyScene.player.ghost.position.add(safeMovement);

      if (!lobbyScene.player.combatMode) {
        lobbyScene.player.ghost.rotation.y =
          Math.atan2(moveVector.z, -moveVector.x) + Math.PI;
      }
    }

    // Update camera position to follow player
    yawObject.position.copy(lobbyScene.player.ghost.position);

    // Update lobby scene (tutorial, boss, etc.) - pass current yaw and pitch
    //lobbyScene.camera.rotation.y = yaw;
    //lobbyScene.camera.rotation.x = pitch;
    //lobbyScene.update();
    // FIXED: Pass the actual yaw and pitch values to the scene
    lobbyScene.updateWithCameraRotation(yaw, pitch);
  }

  animate();

  // Debug helpers
  window.enterCombat = () => lobbyScene.player.enterCombat();
  window.exitCombat = () => lobbyScene.player.exitCombat();
  window.startBoss = () => lobbyScene.startBossFight();
  window.toggleCollisionDebug = () => {
    lobbyScene.physics.debugEnabled = !lobbyScene.physics.debugEnabled;
    console.log("Collision debug:", lobbyScene.physics.debugEnabled ? "ON" : "OFF");
  };
  window.listCollisionObjects = () => {
    console.log(`Total collision objects: ${lobbyScene.physics.collisionObjects.length}`);
    lobbyScene.physics.collisionObjects.forEach((obj, i) => {
      console.log(`${i}: ${obj.name || 'unnamed'} - visible: ${obj.visible}, pos:`, obj.position);
    });
  };
  window.testRaycast = () => {
    const pos = lobbyScene.player.ghost.position;
    console.log("Testing raycast from player position:", pos);
    const raycaster = new THREE.Raycaster();
    raycaster.set(pos.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(1, 0, 0));
    raycaster.far = 5;
    const hits = raycaster.intersectObjects(lobbyScene.physics.collisionObjects, false);
    console.log(`Found ${hits.length} hits:`, hits);
  };
  window.highlightCollisionObjects = () => {
    // Remove old highlights
    if (window._collisionHighlights) {
      window._collisionHighlights.forEach(h => lobbyScene.scene.remove(h));
    }
    window._collisionHighlights = [];

    // Add box helpers to all collision objects
    lobbyScene.physics.collisionObjects.forEach(obj => {
      const box = new THREE.BoxHelper(obj, 0x00ff00);
      lobbyScene.scene.add(box);
      window._collisionHighlights.push(box);
    });
    console.log(`Highlighted ${window._collisionHighlights.length} collision objects in green`);
  };
  window.clearHighlights = () => {
    if (window._collisionHighlights) {
      window._collisionHighlights.forEach(h => lobbyScene.scene.remove(h));
      window._collisionHighlights = [];
      console.log("Cleared highlights");
    }
  };
  window.showPlayerBox = () => {
    const pos = lobbyScene.player.ghost.position;
    console.log("Player position:", pos);
    console.log("Player radius:", lobbyScene.physics.playerRadius);

    // Check what it's colliding with using sphere collision
    let collisionCount = 0;
    lobbyScene.physics.boundingBoxes.forEach((cached, i) => {
      const dx = pos.x - cached.position.x;
      const dz = pos.z - cached.position.z;
      const distSq = dx * dx + dz * dz;
      const minDist = lobbyScene.physics.playerRadius + cached.radius;
      const minDistSq = minDist * minDist;

      if (distSq < minDistSq) {
        const dist = Math.sqrt(distSq);
        console.log(`COLLISION ${i}: ${cached.mesh.name || 'unnamed'}`);
        console.log(`  Object pos: (${cached.position.x.toFixed(2)}, ${cached.position.z.toFixed(2)})`);
        console.log(`  Distance: ${dist.toFixed(2)}, Min: ${minDist.toFixed(2)}, Radius: ${cached.radius.toFixed(2)}`);
        collisionCount++;
      }
    });
    console.log(`Total collisions: ${collisionCount}`);
  };
  window.debugCollisions = () => {
    console.log("=== COLLISION DEBUG ===");
    console.log(`Total objects: ${lobbyScene.physics.boundingBoxes.length}`);
    lobbyScene.physics.boundingBoxes.forEach((cached, i) => {
      console.log(`${i}: ${cached.mesh.name || 'unnamed'} - pos: (${cached.position.x.toFixed(2)}, ${cached.position.z.toFixed(2)}), radius: ${cached.radius.toFixed(2)}`);
    });
  };
}

init().catch((error) => console.error("Init failed:", error));

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
