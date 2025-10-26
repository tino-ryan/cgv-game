// src/main.js
import * as THREE from "three";
import { initRenderer } from "./core/renderer.js";
import LobbyScene from "./scenes/lobbyScene.js";
import HallwayScene from './scenes/hallwayScene.js';
import BathroomScene from './scenes/bathroomScene.js';
import CutsceneManager from "./systems/cutsceneManager.js";
import { tutorialCutscene } from "./cutscenes/tutorialCutscene.js";

let renderer, camera, currentScene, lobbyScene, hallwayScene,bathroomScene;

const mouseSensitivity = 0.002;

let yaw = 0;
let pitch = 0;

const yawObject = new THREE.Object3D();
const pitchObject = new THREE.Object3D();

async function init() {
  renderer = initRenderer();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5);

  yawObject.add(pitchObject);
  pitchObject.add(camera);

  console.log("Renderer initialized:", renderer);
  console.log("Camera initialized:", camera);

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
    display: "none",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "1000",
    color: "white",
    textAlign: "center",
  });

  const cutsceneManager = new CutsceneManager("cutscene-container");
  await cutsceneManager.play(tutorialCutscene);

  lobbyScene = new LobbyScene(renderer, camera);
  lobbyScene.scene.add(yawObject);
  currentScene = lobbyScene;

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
        if (currentScene === lobbyScene && lobbyScene.serviceBell) {
          lobbyScene.pickupBell();
        }
        break;
      case "e":
      case "E":
        const selectedItem = currentScene.inventory?.getSelectedItem();
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

function animate() {
  requestAnimationFrame(animate);

  if (!currentScene.player.ghost) {
    currentScene.update();
    return;
  }

  const snapRotation = currentScene.getCameraSnapRotation?.();
  if (snapRotation) {
    yaw = snapRotation.yaw;
    pitch = snapRotation.pitch;
    console.log("Camera snapped to target!");
  }

  let forward = new THREE.Vector3();
  let right = new THREE.Vector3();

  if (currentScene instanceof LobbyScene || currentScene instanceof BathroomScene) {
    // First-person controls for LobbyScene and BathroomScene
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;
    
    if (currentScene.player.combatMode) {
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
    yawObject.position.copy(currentScene.player.ghost.position);
  } else if (currentScene instanceof HallwayScene) {
    // First-person camera for HallwayScene with conditional movement
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;
    
    // Update camera position to follow player
    yawObject.position.copy(currentScene.player.ghost.position);
    
    // Check if puzzle is complete and normal movement is allowed
    if (currentScene.allowNormalMovement) {
      forward = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
      ).normalize();
      right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
    } else {
      // During puzzle: no manual movement
      currentScene.updateWithCameraRotation(yaw, pitch);
      return;
    }
  }

  // Movement section
  const moveSpeed = 0.1;
  let moveVector = new THREE.Vector3();
  if (keys.up || keys.w) moveVector.add(forward);
  if (keys.down || keys.s) moveVector.add(forward.clone().multiplyScalar(-1));
  if (keys.left || keys.a) moveVector.add(right.clone().multiplyScalar(-1));
  if (keys.right || keys.d) moveVector.add(right);

  if (moveVector.length() > 0) {
    moveVector.normalize();
    const currentPos = currentScene.player.ghost.position;
    
    let finalMovement;
    if (currentScene.ghostTransitionActive) {
      // During ghost transition, allow free movement
      finalMovement = moveVector.clone().multiplyScalar(moveSpeed);
      console.log("👻 Ghost mode active - passing through walls");
    } else {
      // Normal collision detection
      finalMovement = currentScene.physics.getSafeMovement(
        currentPos,
        moveVector,
        moveSpeed
      );
    }
    
    currentScene.player.ghost.position.add(finalMovement);

    if (!currentScene.player.combatMode) {
      currentScene.player.ghost.rotation.y =
        Math.atan2(moveVector.z, -moveVector.x) + Math.PI;
    }
  }

  currentScene.updateWithCameraRotation(yaw, pitch);
}
  animate();

  window.enterCombat = () => currentScene.player.enterCombat();
  window.exitCombat = () => currentScene.player.exitCombat();
  window.startBoss = () => currentScene.startBossFight?.();
  window.toggleCollisionDebug = () => {
    currentScene.physics.debugEnabled = !currentScene.physics.debugEnabled;
    console.log("Collision debug:", currentScene.physics.debugEnabled ? "ON" : "OFF");
  };
  window.listCollisionObjects = () => {
    console.log(`Total collision objects: ${currentScene.physics.collisionObjects.length}`);
    currentScene.physics.collisionObjects.forEach((obj, i) => {
      console.log(`${i}: ${obj.name || 'unnamed'} - visible: ${obj.visible}, pos:`, obj.position);
    });
  };
  window.testRaycast = () => {
    const pos = currentScene.player.ghost.position;
    console.log("Testing raycast from player position:", pos);
    const raycaster = new THREE.Raycaster();
    raycaster.set(pos.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(1, 0, 0));
    raycaster.far = 5;
    const hits = raycaster.intersectObjects(currentScene.physics.collisionObjects, false);
    console.log(`Found ${hits.length} hits:`, hits);
  };
  window.highlightCollisionObjects = () => {
    if (window._collisionHighlights) {
      window._collisionHighlights.forEach(h => currentScene.scene.remove(h));
    }
    window._collisionHighlights = [];

    currentScene.physics.collisionObjects.forEach(obj => {
      const box = new THREE.BoxHelper(obj, 0x00ff00);
      currentScene.scene.add(box);
      window._collisionHighlights.push(box);
    });
    console.log(`Highlighted ${window._collisionHighlights.length} collision objects in green`);
  };
  window.clearHighlights = () => {
    if (window._collisionHighlights) {
      window._collisionHighlights.forEach(h => currentScene.scene.remove(h));
      window._collisionHighlights = [];
      console.log("Cleared highlights");
    }
  };
  window.showPlayerBox = () => {
    const pos = currentScene.player.ghost.position;
    console.log("Player position:", pos);
    console.log("Player radius:", currentScene.physics.playerRadius);

    let collisionCount = 0;
    currentScene.physics.boundingBoxes.forEach((cached, i) => {
      const dx = pos.x - cached.position.x;
      const dz = pos.z - cached.position.z;
      const distSq = dx * dx + dz * dz;
      const minDist = currentScene.physics.playerRadius + cached.radius;
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
    console.log(`Total objects: ${currentScene.physics.boundingBoxes.length}`);
    currentScene.physics.boundingBoxes.forEach((cached, i) => {
      console.log(`${i}: ${cached.mesh.name || 'unnamed'} - pos: (${cached.position.x.toFixed(2)}, ${cached.position.z.toFixed(2)}), radius: ${cached.radius.toFixed(2)}`);
    });
  };
}

init().catch((error) => console.error("Init failed:", error));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.transitionToHallway = () => {
  console.log("🚪 Transitioning to Hallway...");
  
  if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
    console.error("❌ Cannot transition: No valid player found");
    return;
  }
  
  // Save current state
  const playerPosition = currentScene.player.ghost.position.clone();
  const cameraRotation = {
    yaw: yaw,
    pitch: pitch
  };
  
  console.log("Player position before transition:", playerPosition);
  
  // Remove yawObject from current scene
  if (currentScene.scene && yawObject.parent === currentScene.scene) {
    currentScene.scene.remove(yawObject);
  }
  
  // Reset camera local position to match first-person setup
  camera.position.set(0, 1.6, 0);
  
  // Create hallway scene with existing player and camera state
  hallwayScene = new HallwayScene(
    renderer, 
    camera, 
    currentScene.player,  // Pass existing player
    playerPosition,        // Pass player position
    cameraRotation        // Pass camera rotation
  );
  
  // Add camera rig to new scene
  hallwayScene.scene.add(yawObject);
  
  // Position yawObject at player position immediately
  yawObject.position.copy(playerPosition);
  
  // Set as current scene
  currentScene = hallwayScene;
  
  // Restore camera rotation
  const initialRotation = hallwayScene.getInitialCameraRotation();
  yaw = initialRotation.yaw;
  pitch = initialRotation.pitch;
  
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log(`✅ Transitioned to hallway at position (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
  console.log(`📐 Camera rotation - Yaw: ${yaw.toFixed(2)}, Pitch: ${pitch.toFixed(2)}`);
  console.log("YawObject position:", yawObject.position);
};

// Transition to Bathroom Scene
window.transitionToBathroom = () => {
  console.log("🚿 Transitioning to Bathroom...");
  
  if (!currentScene || !currentScene.player || !currentScene.player.ghost) {
    console.error("❌ Cannot transition: No valid player found");
    return;
  }
  
  // Save current state
  const playerPosition = currentScene.player.ghost.position.clone();
  const cameraRotation = {
    yaw: yaw,
    pitch: pitch
  };
  
  console.log("Player position before transition:", playerPosition);
  
  // Remove yawObject from current scene
  if (currentScene.scene && yawObject.parent === currentScene.scene) {
    currentScene.scene.remove(yawObject);
  }
  
  // Reset camera local position for first-person
  camera.position.set(0, 1.6, 0);
  
  // Create bathroom scene with existing player and camera state
  bathroomScene = new BathroomScene(
    renderer, 
    camera, 
    currentScene.player,  // Pass existing player
    playerPosition,        // Pass player position
    cameraRotation        // Pass camera rotation
  );
  
  // Add camera rig to new scene
  bathroomScene.scene.add(yawObject);
  
  // Position yawObject at player position immediately
  yawObject.position.copy(playerPosition);
  
  // Set as current scene
  currentScene = bathroomScene;
  
  // Restore camera rotation
  const initialRotation = bathroomScene.getInitialCameraRotation();
  yaw = initialRotation.yaw;
  pitch = initialRotation.pitch;
  
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
  
  console.log(`✅ Transitioned to bathroom at position (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
  console.log(`📐 Camera rotation - Yaw: ${yaw.toFixed(2)}, Pitch: ${pitch.toFixed(2)}`);
};