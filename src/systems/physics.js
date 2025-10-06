// src/systems/physics.js
import * as THREE from "three";

export default class PhysicsSystem {
  constructor(scene) {
    this.scene = scene;
    this.collisionObjects = [];
    this.raycaster = new THREE.Raycaster();
    this.debugEnabled = false;
    this._debugHelpers = [];

    // Collision detection parameters
    this.raycastDistance = 1.2; // Distance to check for collisions
    this.playerRadius = 0.8; // Player collision radius

    // Use 8 rays for good performance
    this.rayDirections = [
      new THREE.Vector3(1, 0, 0),   // Right
      new THREE.Vector3(-1, 0, 0),  // Left
      new THREE.Vector3(0, 0, 1),   // Back
      new THREE.Vector3(0, 0, -1),  // Forward
      new THREE.Vector3(0.707, 0, 0.707),   // Diagonal FR
      new THREE.Vector3(-0.707, 0, 0.707),  // Diagonal BR
      new THREE.Vector3(0.707, 0, -0.707),  // Diagonal FL
      new THREE.Vector3(-0.707, 0, -0.707), // Diagonal BL
    ];
  }

  // Register objects that should have collision
  addCollisionObject(object, recursive = true) {
    let count = 0;
    let skipped = 0;

    if (recursive && object.children) {
      object.traverse((child) => {
        if (child.isMesh && !child.userData.isEnemy && !child.userData.isBoss) {
          // Skip carpets/rugs - player should walk over them
          const name = (child.name || '').toLowerCase();
          if (name.includes('carpet') || name.includes('rug')) {
            console.log(`Skipping carpet: ${child.name}`);
            skipped++;
            return;
          }

          // Ensure geometry has bounding info for raycasting
          if (child.geometry) {
            if (!child.geometry.boundingSphere) {
              child.geometry.computeBoundingSphere();
            }
            if (!child.geometry.boundingBox) {
              child.geometry.computeBoundingBox();
            }
          }

          // Make sure mesh can be raycasted
          child.raycast = THREE.Mesh.prototype.raycast;

          this.collisionObjects.push(child);
          count++;
        }
      });
    } else if (object.isMesh) {
      if (object.geometry) {
        if (!object.geometry.boundingSphere) {
          object.geometry.computeBoundingSphere();
        }
        if (!object.geometry.boundingBox) {
          object.geometry.computeBoundingBox();
        }
      }

      // Skip carpets for single objects too
      const name = (object.name || '').toLowerCase();
      if (name.includes('carpet') || name.includes('rug')) {
        console.log(`Skipping carpet: ${object.name}`);
        skipped++;
        return;
      }

      object.raycast = THREE.Mesh.prototype.raycast;
      this.collisionObjects.push(object);
      count++;
    }

    console.log(`Registered ${count} collision objects, skipped ${skipped} carpets (total: ${this.collisionObjects.length})`);
  }

  // Remove collision object
  removeCollisionObject(object) {
    const index = this.collisionObjects.indexOf(object);
    if (index > -1) {
      this.collisionObjects.splice(index, 1);
    }
  }

  // Clear all collision objects
  clearCollisionObjects() {
    this.collisionObjects = [];
  }

  // Simple raycast-based collision check
  isPositionValid(position) {
    if (this.collisionObjects.length === 0) {
      return true;
    }

    const checkPosition = new THREE.Vector3(position.x, 1.0, position.z);

    // Cast rays in all directions
    for (let direction of this.rayDirections) {
      this.raycaster.set(checkPosition, direction);
      this.raycaster.far = this.playerRadius;

      const intersects = this.raycaster.intersectObjects(
        this.collisionObjects,
        false
      );

      if (intersects.length > 0 && intersects[0].distance < this.playerRadius) {
        return false;
      }
    }

    return true;
  }

  // Check collision and provide wall sliding
  checkCollision(currentPosition, moveVector) {
    if (this.collisionObjects.length === 0) {
      return { collision: false, adjustedMove: moveVector };
    }

    const checkPosition = new THREE.Vector3(currentPosition.x, 1.0, currentPosition.z);
    let hasCollision = false;
    const adjustedMove = moveVector.clone();

    // Cast rays in all directions
    for (let direction of this.rayDirections) {
      this.raycaster.set(checkPosition, direction);
      this.raycaster.far = this.raycastDistance;

      const intersects = this.raycaster.intersectObjects(
        this.collisionObjects,
        false
      );

      if (intersects.length > 0) {
        const distance = intersects[0].distance;

        if (distance < this.playerRadius) {
          hasCollision = true;

          // Remove movement component in collision direction
          const moveDot = moveVector.dot(direction);
          if (moveDot > 0) {
            adjustedMove.addScaledVector(direction, -moveDot);
          }
        }
      }
    }

    return { collision: hasCollision, adjustedMove: adjustedMove };
  }

  // Get safe movement vector (slide along walls)
  getSafeMovement(currentPosition, moveVector, moveSpeed) {
    // Debug visualization if enabled
    if (this.debugEnabled) {
      this.debugDraw(currentPosition);
    }

    const desiredPosition = currentPosition
      .clone()
      .addScaledVector(moveVector, moveSpeed);

    // Check if the desired position is valid
    if (this.isPositionValid(desiredPosition)) {
      return moveVector.clone().multiplyScalar(moveSpeed);
    }

    // If not valid, check collision and get adjusted movement
    const collisionResult = this.checkCollision(currentPosition, moveVector);

    if (collisionResult.adjustedMove.lengthSq() > 0.001) {
      // Try the adjusted movement (sliding along walls)
      const adjustedPosition = currentPosition
        .clone()
        .addScaledVector(collisionResult.adjustedMove, moveSpeed);

      if (this.isPositionValid(adjustedPosition)) {
        return collisionResult.adjustedMove.clone().multiplyScalar(moveSpeed);
      }
    }

    // If all else fails, no movement
    return new THREE.Vector3(0, 0, 0);
  }

  // Debug visualization (optional)
  debugDraw(position) {
    // Remove old debug helpers
    if (this._debugHelpers) {
      this._debugHelpers.forEach((helper) => this.scene.remove(helper));
    }
    this._debugHelpers = [];

    const playerHeight = 1.5;
    const checkPosition = new THREE.Vector3(
      position.x,
      playerHeight,
      position.z
    );

    // Draw rays
    for (let direction of this.rayDirections) {
      this.raycaster.set(checkPosition, direction);
      this.raycaster.far = this.raycastDistance;

      const intersects = this.raycaster.intersectObjects(
        this.collisionObjects,
        false
      );

      const color = intersects.length > 0 ? 0xff0000 : 0x00ff00;
      const endPoint = checkPosition
        .clone()
        .addScaledVector(direction, this.raycastDistance);

      const geometry = new THREE.BufferGeometry().setFromPoints([
        checkPosition,
        endPoint,
      ]);
      const material = new THREE.LineBasicMaterial({ color: color });
      const line = new THREE.Line(geometry, material);

      this.scene.add(line);
      this._debugHelpers.push(line);
    }
  }
}
