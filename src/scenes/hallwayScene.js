// src/scenes/hallwayScene.js - ENHANCED VERSION
import * as THREE from "three";
import HUD from "../ui/hud.js";
import PhysicsSystem from "../systems/physics.js";
import Inventory from "../systems/inventory.js";

export default class HallwayScene {
  constructor(renderer, camera, existingPlayer = null, playerPosition = null, cameraRotation = null) {
    this.renderer = renderer;
    this.camera = camera;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x2a1f1a, 5, 30);
    this.clock = new THREE.Clock();

    this.physics = new PhysicsSystem(this.scene);
    this.inventory = new Inventory(null);
    
    this.currentTilePair = 0;
    this.totalTilePairs = 5;
    this.tiles = [];
    this.puzzleComplete = false;
    this.isTransitioning = false;
    this.selectedSide = null;
    this.arrowIndicators = [];
    this.allowNormalMovement = false;
    
    this.spawnPosition = new THREE.Vector3(0, 1.5, 15);
    this.initialCameraRotation = cameraRotation || { yaw: 0, pitch: 0 };
    
    this.hud = (existingPlayer && existingPlayer.hud) ? existingPlayer.hud : new HUD();
    
    if (existingPlayer) {
      this.player = existingPlayer;
      
      if (this.player.ghost) {
        if (this.player.ghost.parent) {
          this.player.ghost.parent.remove(this.player.ghost);
        }
        this.scene.add(this.player.ghost);
        this.player.ghost.position.copy(this.spawnPosition);
      }
      
      if (this.player.combatMode) {
        this.player.exitCombat();
      }
      
      console.log(`✅ Player entered hallway puzzle with ${this.player.health.current} HP`);
    } else {
      console.error("❌ No player provided to HallwayScene!");
    }

    this.createHallway();
    this.createFloor();
    this.createCeiling();
    this.createTilePuzzle();
    this.createBathroomDoor();
    this.setupLighting();
    this.addAtmosphericDetails();
    this.addWindowsAndArtwork();
    this.setupArrowKeyControls();
    this.createSelectionUI();

    window.hallwayScene = this;

    console.log("🏨 Hallway Puzzle Scene initialized!");
    
    setTimeout(() => {
      this.showPuzzleInstructions();
    }, 500);
  }

  createHallway() {
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6b5444,
      roughness: 0.85,
      metalness: 0.05
    });
    
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 6, 40),
      wallMaterial
    );
    leftWall.position.set(-5, 3, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    this.physics.addCollisionObject(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 6, 40),
      wallMaterial
    );
    rightWall.position.set(5, 3, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);
    this.physics.addCollisionObject(rightWall);

    this.addWallTrim(leftWall, rightWall);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 6, 0.5),
      wallMaterial
    );
    backWall.position.set(0, 3, 20);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    this.physics.addCollisionObject(backWall);
    
    this.createEndWall();
    this.addWallSconces();
  }
  
  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(10, 40);
    
    const floorMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.8,
      metalness: 0.1
    });
    
    const textureLoader = new THREE.TextureLoader();
    const texturePaths = [
      '/assets/textures/tiles.jpg',
      '/assets/textures/tiles.png',
      './assets/textures/tiles.jpg',
      './assets/textures/tiles.png',
      'assets/textures/tiles.jpg',
      'assets/textures/tiles.png'
    ];
    
    const tryLoadTexture = (index) => {
      if (index >= texturePaths.length) {
        console.warn('Floor tile texture not found - using fallback color');
        floorMaterial.color.setHex(0x8b7355);
        return;
      }
      
      textureLoader.load(
        texturePaths[index],
        (texture) => {
          console.log('✅ Floor tile texture loaded from:', texturePaths[index]);
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(10, 20);
          floorMaterial.map = texture;
          floorMaterial.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.log('❌ Failed to load floor texture from:', texturePaths[index]);
          tryLoadTexture(index + 1);
        }
      );
    };
    
    tryLoadTexture(0);
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    
    this.scene.add(floor);
    this.floor = floor;
    
    console.log("🟫 Floor with tile texture created");
  }

  createCeiling() {
    const ceilingGeometry = new THREE.PlaneGeometry(10, 40);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
      roughness: 0.95,
      metalness: 0.05
    });
    
    const textureLoader = new THREE.TextureLoader();
    const texturePaths = [
      '/assets/textures/ceiling.jpg',
      '/assets/textures/ceiling.png',
      './assets/textures/ceiling.jpg',
      './assets/textures/ceiling.png',
      'assets/textures/ceiling.jpg',
      'assets/textures/ceiling.png'
    ];
    
    const tryLoadTexture = (index) => {
      if (index >= texturePaths.length) {
        console.warn('Ceiling texture not found - using fallback color');
        ceilingMaterial.color.setHex(0x4a3a2a);
        return;
      }
      
      textureLoader.load(
        texturePaths[index],
        (texture) => {
          console.log('✅ Ceiling texture loaded from:', texturePaths[index]);
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(5, 20);
          ceilingMaterial.map = texture;
          ceilingMaterial.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.log('❌ Failed to load ceiling texture from:', texturePaths[index]);
          tryLoadTexture(index + 1);
        }
      );
    };
    
    tryLoadTexture(0);
    
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 6;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);
    
    // Add ceiling trim/molding
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.7
    });
    
    const leftTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 40),
      trimMaterial
    );
    leftTrim.position.set(-4.85, 5.85, 0);
    this.scene.add(leftTrim);
    
    const rightTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 40),
      trimMaterial
    );
    rightTrim.position.set(4.85, 5.85, 0);
    this.scene.add(rightTrim);
    
    console.log("🔲 Ceiling with texture created");
  }
  
  createEndWall() {
    const lastTileZ = 15.5 - ((this.totalTilePairs - 1) * 3.8);
    const endWallZ = lastTileZ - 3.8 / 2 - 7;
    
    this.endWallZ = endWallZ;
    
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6b5444,
      roughness: 0.85,
      metalness: 0.05
    });
    
    const leftSection = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 6, 0.5),
      wallMaterial
    );
    leftSection.position.set(-3.25, 3, endWallZ);
    leftSection.castShadow = true;
    leftSection.receiveShadow = true;
    this.scene.add(leftSection);
    this.physics.addCollisionObject(leftSection);
    
    const rightSection = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 6, 0.5),
      wallMaterial
    );
    rightSection.position.set(3.25, 3, endWallZ);
    rightSection.castShadow = true;
    rightSection.receiveShadow = true;
    this.scene.add(rightSection);
    this.physics.addCollisionObject(rightSection);
    
    const topSection = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.8, 0.5),
      wallMaterial
    );
    topSection.position.set(0, 5.4, endWallZ);
    topSection.castShadow = true;
    topSection.receiveShadow = true;
    this.scene.add(topSection);
  }

  addWallTrim(leftWall, rightWall) {
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.7
    });
    
    for (let z = 15; z >= -15; z -= 5) {
      const leftTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 4),
        trimMaterial
      );
      leftTrim.position.set(-4.6, 0.5, z);
      this.scene.add(leftTrim);
      
      const rightTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 4),
        trimMaterial
      );
      rightTrim.position.set(4.6, 0.5, z);
      this.scene.add(rightTrim);
    }
  }

  addWallSconces() {
    const sconceMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      emissive: 0x443322,
      emissiveIntensity: 0.2
    });
    
    for (let z = 16; z >= -8; z -= 6) {
      const leftSconce = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8),
        sconceMaterial
      );
      leftSconce.rotation.z = Math.PI / 2;
      leftSconce.position.set(-4.5, 3.5, z);
      this.scene.add(leftSconce);
      
      const rightSconce = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8),
        sconceMaterial
      );
      rightSconce.rotation.z = Math.PI / 2;
      rightSconce.position.set(4.5, 3.5, z);
      this.scene.add(rightSconce);
    }
  }

  addWindowsAndArtwork() {
    const textureLoader = new THREE.TextureLoader();
    
    // Windows on back wall
    for (let x = -3; x <= 3; x += 3) {
      const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 2.5, 0.15),
        new THREE.MeshStandardMaterial({
          color: 0x2a1a0a,
          roughness: 0.6
        })
      );
      windowFrame.position.set(x, 3.5, 19.8);
      this.scene.add(windowFrame);
      
      // Window glass with texture
      const windowMaterial = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        metalness: 0.3,
        emissive: 0x1a1a2a,
        emissiveIntensity: 0.2
      });
      
      const windowPaths = [
        '/assets/textures/window.jpg',
        '/assets/textures/window.png',
        './assets/textures/window.jpg',
        './assets/textures/window.png',
        'assets/textures/window.jpg',
        'assets/textures/window.png'
      ];
      
      textureLoader.load(
        windowPaths[0],
        (texture) => {
          windowMaterial.map = texture;
          windowMaterial.needsUpdate = true;
        },
        undefined,
        () => {
          windowMaterial.color.setHex(0x3a4a5a);
        }
      );
      
      const windowGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 2.3),
        windowMaterial
      );
      windowGlass.position.set(x, 3.5, 19.85);
      this.scene.add(windowGlass);
      
      // Window light effect
      const windowLight = new THREE.PointLight(0x6688aa, 0.5, 5);
      windowLight.position.set(x, 3.5, 19);
      this.scene.add(windowLight);
    }
    
    // Paintings/Artwork on side walls
    const artworkPositions = [
      { x: -4.7, z: 12, rotation: Math.PI / 2 },
      { x: 4.7, z: 10, rotation: -Math.PI / 2 },
      { x: -4.7, z: 4, rotation: Math.PI / 2 },
      { x: 4.7, z: 2, rotation: -Math.PI / 2 },
      { x: -4.7, z: -4, rotation: Math.PI / 2 },
      { x: 4.7, z: -6, rotation: -Math.PI / 2 }
    ];
    
    artworkPositions.forEach((pos, index) => {
      // Ornate frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 2, 0.15),
        new THREE.MeshStandardMaterial({
          color: 0x8b6914,
          roughness: 0.4,
          metalness: 0.6
        })
      );
      frame.position.set(pos.x, 3.5, pos.z);
      frame.rotation.y = pos.rotation;
      this.scene.add(frame);
      
      // Canvas with varying colors for variety
      const artColors = [0x4a2a1a, 0x2a3a4a, 0x3a1a2a, 0x1a2a1a, 0x4a3a2a, 0x2a2a3a];
      const canvas = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 1.8),
        new THREE.MeshStandardMaterial({
          color: artColors[index % artColors.length],
          emissive: artColors[index % artColors.length],
          emissiveIntensity: 0.15
        })
      );
      const offset = pos.x < 0 ? 0.05 : -0.05;
      canvas.position.set(pos.x + (pos.x < 0 ? offset : offset), 3.5, pos.z);
      canvas.rotation.y = pos.rotation;
      this.scene.add(canvas);
      
      // Add decorative border
      const borderGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.3, 1.8));
      const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 2 });
      const border = new THREE.LineSegments(borderGeometry, borderMaterial);
      canvas.add(border);
    });
  }

  addAtmosphericDetails() {
    // Hanging chains from ceiling
    for (let i = 0; i < 6; i++) {
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2, 8),
        new THREE.MeshStandardMaterial({
          color: 0x4a4a4a,
          roughness: 0.7,
          metalness: 0.8
        })
      );
      chain.position.set(
        (Math.random() - 0.5) * 8,
        5,
        Math.random() * 30 - 15
      );
      this.scene.add(chain);
    }
    
    // Warning sign near first tiles
    const warningSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xaa8800,
        emissiveIntensity: 0.3
      })
    );
    warningSign.position.set(0, 3, 17.5);
    this.scene.add(warningSign);
    
    // Floor grates
    for (let z = 16; z >= -8; z -= 10) {
      const grate = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshStandardMaterial({
          color: 0x2a2a2a,
          roughness: 0.8,
          metalness: 0.5
        })
      );
      grate.rotation.x = -Math.PI / 2;
      grate.position.set(-4, 0.01, z);
      this.scene.add(grate);
      
      const grateRight = grate.clone();
      grateRight.position.set(4, 0.01, z);
      this.scene.add(grateRight);
    }
    
    // Cobwebs
    for (let i = 0; i < 8; i++) {
      const cobweb = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          transparent: true,
          opacity: 0.3,
          roughness: 1
        })
      );
      cobweb.position.set(
        Math.random() > 0.5 ? -4.5 : 4.5,
        5.5,
        18 - Math.random() * 30
      );
      this.scene.add(cobweb);
    }
    
    // Glowing runes on tiles
    this.tiles.forEach((tile, index) => {
      if (index % 3 === 0) {
        const rune = new THREE.Mesh(
          new THREE.CircleGeometry(0.3, 6),
          new THREE.MeshBasicMaterial({
            color: 0x6666ff,
            transparent: true,
            opacity: 0.4
          })
        );
        rune.rotation.x = -Math.PI / 2;
        rune.position.set(tile.position.x, tile.position.y + 0.21, tile.position.z);
        this.scene.add(rune);
        
        const animateRune = () => {
          rune.material.opacity = 0.2 + Math.sin(Date.now() * 0.002 + index) * 0.2;
          if (!this.puzzleComplete) {
            requestAnimationFrame(animateRune);
          }
        };
        animateRune();
      }
    });
    
    // Dust particles
    this.createDustParticles();
    
    // Ceiling pipes for industrial feel
    for (let z = 15; z >= -10; z -= 8) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 10, 8),
        new THREE.MeshStandardMaterial({
          color: 0x5a5a5a,
          roughness: 0.6,
          metalness: 0.7
        })
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 5.7, z);
      this.scene.add(pipe);
    }
  }

  createDustParticles() {
    const particleCount = 50;
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 4, 4),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.3
        })
      );
      
      particle.position.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 6,
        (Math.random() - 0.5) * 40
      );
      
      particle.userData.velocity = {
        x: (Math.random() - 0.5) * 0.01,
        y: Math.random() * 0.02,
        z: (Math.random() - 0.5) * 0.01
      };
      
      particles.add(particle);
    }
    
    this.scene.add(particles);
    this.dustParticles = particles;
  }

  animateDustParticles() {
    if (!this.dustParticles) return;
    
    this.dustParticles.children.forEach(particle => {
      particle.position.x += particle.userData.velocity.x;
      particle.position.y += particle.userData.velocity.y;
      particle.position.z += particle.userData.velocity.z;
      
      if (particle.position.y > 6) particle.position.y = 0;
      if (particle.position.x > 5) particle.position.x = -5;
      if (particle.position.x < -5) particle.position.x = 5;
      if (particle.position.z > 20) particle.position.z = -20;
      if (particle.position.z < -20) particle.position.z = 20;
    });
  }

  createTilePuzzle() {
    const tileWidth = 5;
    const tileDepth = 3.8;
    const startZ = 13;
    
    const safeTiles = [
      Math.floor(Math.random() * 2),
      Math.floor(Math.random() * 2),
      Math.floor(Math.random() * 2),
      Math.floor(Math.random() * 2),
      Math.floor(Math.random() * 2)
    ];
    
    console.log("Safe tiles pattern:", safeTiles.map(s => s === 0 ? 'LEFT' : 'RIGHT'));
    
    for (let i = 0; i < this.totalTilePairs; i++) {
      const pairZ = startZ - (i * tileDepth);
      const isSafeLeft = safeTiles[i] === 0;
      
      const leftTile = this.createTile(-2.5, pairZ, tileWidth, tileDepth, isSafeLeft, i, 'left');
      this.tiles.push(leftTile);
      
      const rightTile = this.createTile(2.5, pairZ, tileWidth, tileDepth, !isSafeLeft, i, 'right');
      this.tiles.push(rightTile);
    }
    
    const lastTileZ = startZ - ((this.totalTilePairs - 1) * tileDepth);
    const endPlatformZ = lastTileZ - tileDepth / 2 - 3;
    
    const endPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.4, 4),
      new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        roughness: 0.6,
        metalness: 0.1
      })
    );
    endPlatform.position.set(0, 0.2, endPlatformZ);
    endPlatform.receiveShadow = true;
    endPlatform.castShadow = true;
    this.scene.add(endPlatform);
  }

  createTile(x, z, width, depth, isSafe, pairIndex, side) {
    const geometry = new THREE.BoxGeometry(width, 0.4, depth);
    
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.1,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    
    const textureLoader = new THREE.TextureLoader();
    const texturePaths = [
      '/assets/textures/tile_texture.jpg',
      '/assets/textures/tile_texture.png',
      './assets/textures/tile_texture.jpg',
      './assets/textures/tile_texture.png',
      'assets/textures/tile_texture.jpg',
      'assets/textures/tile_texture.png'
    ];
    
    const tryLoadTexture = (index) => {
      if (index >= texturePaths.length) {
        console.warn('Tile texture not found - using fallback color');
        material.color.setHex(0xa08870);
        return;
      }
      
      textureLoader.load(
        texturePaths[index],
        (texture) => {
          console.log('✅ Tile texture loaded from:', texturePaths[index]);
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(1, 1);
          material.map = texture;
          material.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.log('❌ Failed to load texture from:', texturePaths[index]);
          tryLoadTexture(index + 1);
        }
      );
    };
    
    tryLoadTexture(0);
    
    const tile = new THREE.Mesh(geometry, material);
    tile.position.set(x, 0.2, z);
    tile.castShadow = true;
    tile.receiveShadow = true;
    
    tile.userData = {
      isSafe: isSafe,
      pairIndex: pairIndex,
      side: side,
      activated: false,
      isSelected: false,
      originalColor: 0xffffff,
      originalEmissive: 0x000000,
      hasTexture: false
    };
    
    tile.userData.originalMaterial = material.clone();
    
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      linewidth: 2,
      transparent: true,
      opacity: 0.3
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    tile.add(edgeLines);
    
    this.scene.add(tile);
    return tile;
  }

  createBathroomDoor() {
    const doorFrame = new THREE.Group();
    
    const doorZ = this.endWallZ;
    
    const frameGeometry = new THREE.BoxGeometry(3.2, 5.2, 0.2);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3020,
      roughness: 0.6,
      metalness: 0.1
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 2.6, -0.15);
    doorFrame.add(frame);
    
    const doorPanel = new THREE.Group();
    
    const doorGeometry = new THREE.BoxGeometry(3, 5, 0.3);
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.5,
      metalness: 0.1
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.castShadow = true;
    doorPanel.add(door);
    
    const handleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xccaa66,
      roughness: 0.3,
      metalness: 0.8
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-1, 0, 0.2);
    doorPanel.add(handle);
    
    const signGeometry = new THREE.PlaneGeometry(2.5, 0.8);
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      emissive: 0x00ff00,
      emissiveIntensity: 0.4,
      roughness: 0.3
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 1.6, 0.16);
    doorPanel.add(sign);
    
    const textGeometry = new THREE.PlaneGeometry(2, 0.5);
    const textMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.9
    });
    const text = new THREE.Mesh(textGeometry, textMaterial);
    text.position.set(0, 1.6, 0.17);
    doorPanel.add(text);
    
    doorPanel.position.set(1.5, 2.5, 0);
    doorFrame.add(doorPanel);
    
    this.doorPanel = doorPanel;
    
    doorFrame.position.set(0, 0, doorZ + 0.25);
    this.scene.add(doorFrame);
    
    this.bathroomDoor = doorFrame;
    this.bathroomDoor.userData.isBathroomDoor = true;
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffddb3, 0.4);
    this.scene.add(ambient);
    
    this.ceilingLights = [];
    for (let z = 18; z >= -10; z -= 5) {
      const light = new THREE.PointLight(0xffffee, 1.8, 12);
      light.position.set(0, 5.2, z);
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.userData.baseIntensity = 1.8;
      light.userData.flickerSpeed = Math.random() * 0.5 + 0.5;
      this.scene.add(light);
      this.ceilingLights.push(light);
      
      const bulbGeometry = new THREE.SphereGeometry(0.2, 12, 12);
      const bulbMaterial = new THREE.MeshStandardMaterial({
        emissive: 0xffffdd,
        emissiveIntensity: 2,
        color: 0xffffdd
      });
      const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
      bulb.position.set(0, 5.5, z);
      this.scene.add(bulb);
    }
    
    const doorLight = new THREE.PointLight(0x44ff44, 1.5, 12);
    doorLight.position.set(0, 3, -9);
    doorLight.userData.baseIntensity = 1.5;
    this.scene.add(doorLight);
    this.doorLight = doorLight;
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(5, 8, 5);
    fillLight.castShadow = true;
    fillLight.shadow.camera.left = -10;
    fillLight.shadow.camera.right = 10;
    fillLight.shadow.camera.top = 10;
    fillLight.shadow.camera.bottom = -10;
    this.scene.add(fillLight);
    
    this.tileHighlightLights = [];
  }

  animateLighting() {
    const time = Date.now() * 0.001;
    
    this.ceilingLights?.forEach((light, index) => {
      const flicker = Math.sin(time * light.userData.flickerSpeed + index) * 0.1;
      light.intensity = light.userData.baseIntensity + flicker;
    });
    
    if (this.puzzleComplete && this.doorLight) {
      this.doorLight.intensity = this.doorLight.userData.baseIntensity + Math.sin(time * 2) * 0.5;
    }
  }

  setupArrowKeyControls() {
    this.arrowKeyHandler = (e) => {
      if (this.isTransitioning || this.puzzleComplete) return;
      
      if (e.key === 'ArrowLeft') {
        this.selectTile('left');
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        this.selectTile('right');
        e.preventDefault();
      } else if (e.code === 'Space' && this.selectedSide) {
        this.moveToSelectedTile();
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', this.arrowKeyHandler);
  }

  createSelectionUI() {
    this.selectionUI = document.createElement('div');
    this.selectionUI.style.position = 'fixed';
    this.selectionUI.style.bottom = '120px';
    this.selectionUI.style.left = '50%';
    this.selectionUI.style.transform = 'translateX(-50%)';
    this.selectionUI.style.display = 'flex';
    this.selectionUI.style.gap = '100px';
    this.selectionUI.style.zIndex = '1000';
    
    this.leftButton = document.createElement('div');
    this.leftButton.innerHTML = '◀️ LEFT';
    this.leftButton.style.cssText = `
      padding: 15px 30px;
      background: rgba(50, 50, 50, 0.8);
      color: white;
      border: 2px solid #666;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
    `;
    
    this.rightButton = document.createElement('div');
    this.rightButton.innerHTML = 'RIGHT ▶️';
    this.rightButton.style.cssText = this.leftButton.style.cssText;
    
    this.selectionUI.appendChild(this.leftButton);
    this.selectionUI.appendChild(this.rightButton);
    document.body.appendChild(this.selectionUI);
    
    this.leftButton.addEventListener('click', () => this.selectTile('left'));
    this.rightButton.addEventListener('click', () => this.selectTile('right'));
  }

  selectTile(side) {
    this.selectedSide = side;
    
    this.tiles.forEach(tile => {
      if (tile.userData.pairIndex === this.currentTilePair) {
        tile.userData.isSelected = (tile.userData.side === side);
      }
    });
    
    if (side === 'left') {
      this.leftButton.style.background = 'rgba(255, 200, 50, 0.9)';
      this.leftButton.style.borderColor = '#ffcc00';
      this.leftButton.style.transform = 'scale(1.1)';
      this.rightButton.style.background = 'rgba(50, 50, 50, 0.8)';
      this.rightButton.style.borderColor = '#666';
      this.rightButton.style.transform = 'scale(1)';
    } else {
      this.rightButton.style.background = 'rgba(255, 200, 50, 0.9)';
      this.rightButton.style.borderColor = '#ffcc00';
      this.rightButton.style.transform = 'scale(1.1)';
      this.leftButton.style.background = 'rgba(50, 50, 50, 0.8)';
      this.leftButton.style.borderColor = '#666';
      this.leftButton.style.transform = 'scale(1)';
    }
    
    this.hud.showMessage(`${side === 'left' ? '◀️ LEFT' : '▶️ RIGHT'} tile selected - Press SPACE to move`);
  }

  updateTileHighlights() {
    this.tiles.forEach(tile => {
      if (tile.userData.pairIndex === this.currentTilePair && !tile.userData.activated) {
        if (tile.userData.isSelected) {
          tile.material.color.setHex(0xffdd44);
          tile.material.emissive.setHex(0xffaa00);
          tile.material.emissiveIntensity = 0.5;
          
          const edgeLines = tile.children.find(child => child.type === 'LineSegments');
          if (edgeLines) {
            edgeLines.material.opacity = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
          }
        } else {
          tile.material.color.setHex(0xc0a890);
          tile.material.emissive.setHex(0x554433);
          tile.material.emissiveIntensity = 0.25;
          
          const edgeLines = tile.children.find(child => child.type === 'LineSegments');
          if (edgeLines) {
            edgeLines.material.opacity = 0.5;
          }
        }
      } else if (!tile.userData.activated) {
        tile.material.color.setHex(tile.userData.originalColor);
        tile.material.emissive.setHex(tile.userData.originalEmissive);
        tile.material.emissiveIntensity = 0.15;
        
        const edgeLines = tile.children.find(child => child.type === 'LineSegments');
        if (edgeLines) {
          edgeLines.material.opacity = 0.4;
        }
      }
    });
  }

  moveToSelectedTile() {
    if (!this.selectedSide || this.isTransitioning) return;
    
    const selectedTile = this.tiles.find(tile => 
      tile.userData.pairIndex === this.currentTilePair && 
      tile.userData.side === this.selectedSide
    );
    
    if (!selectedTile) return;
    
    this.isTransitioning = true;
    
    if (this.player.ghost) {
      const targetPos = selectedTile.position.clone();
      targetPos.y = 1.5;
      
      const startPos = this.player.ghost.position.clone();
      const duration = 0.6;
      const startTime = performance.now();
      
      this.createMovementTrail(startPos, targetPos);
      
      const animateMove = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        this.player.ghost.position.lerpVectors(startPos, targetPos, eased);
        
        if (progress > 0.8) {
          const bounceProgress = (progress - 0.8) / 0.2;
          this.player.ghost.position.y += Math.sin(bounceProgress * Math.PI) * 0.3;
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateMove);
        } else {
          this.stepOnTile(selectedTile);
        }
      };
      
      animateMove();
    }
  }

  createMovementTrail(start, end) {
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        const particle = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 8),
          new THREE.MeshBasicMaterial({
            color: 0xffcc66,
            transparent: true,
            opacity: 0.8
          })
        );
        
        const t = i / particleCount;
        particle.position.lerpVectors(start, end, t);
        particle.position.y = 1.5;
        this.scene.add(particle);
        
        let opacity = 0.8;
        const fadeInterval = setInterval(() => {
          opacity -= 0.05;
          particle.material.opacity = opacity;
          if (opacity <= 0) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
            clearInterval(fadeInterval);
          }
        }, 30);
      }, i * 50);
    }
  }

  stepOnTile(tile) {
    if (!tile.userData.activated) {
      tile.userData.activated = true;
      this.selectedSide = null;
      
      if (tile.userData.isSafe) {
        tile.material.color.setHex(0x00ff00);
        tile.material.emissive.setHex(0x00aa00);
        tile.material.emissiveIntensity = 0.8;
        
        this.createSuccessParticles(tile.position);
        
        this.hud.showMessage(`✅ SAFE! Progress: ${this.currentTilePair + 1}/${this.totalTilePairs}`);
        
        this.currentTilePair++;
        
        if (this.currentTilePair >= this.totalTilePairs) {
          setTimeout(() => {
            this.completePuzzle();
          }, 1500);
        } else {
          setTimeout(() => {
            this.isTransitioning = false;
            this.hud.showMessage("Choose the next tile...");
            setTimeout(() => this.hud.showMessage(""), 2000);
          }, 1200);
        }
        
      } else {
        tile.material.color.setHex(0xff0000);
        tile.material.emissive.setHex(0xaa0000);
        tile.material.emissiveIntensity = 1.0;
        
        this.shakeTile(tile);
        
        this.hud.showMessage("💀 TRAP! Wrong tile!");
        
        this.flashScreen(0xff0000);
        
        this.player.takeDamage(1);
        
        setTimeout(() => {
          if (this.player.health.current <= 0) {
            this.handlePlayerDeath();
          } else {
            this.respawnPlayer();
          }
        }, 1800);
      }
    }
  }

  createSuccessParticles(position) {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 1
        })
      );
      
      particle.position.copy(position);
      particle.position.y += 0.5;
      this.scene.add(particle);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.3 + 0.2,
        (Math.random() - 0.5) * 0.2
      );
      
      let life = 1.0;
      const animateParticle = () => {
        particle.position.add(velocity);
        velocity.y -= 0.01;
        life -= 0.02;
        particle.material.opacity = life;
        
        if (life > 0) {
          requestAnimationFrame(animateParticle);
        } else {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
        }
      };
      animateParticle();
    }
  }

  shakeTile(tile) {
    const originalY = tile.position.y;
    let shakeAmount = 0;
    
    const shake = () => {
      if (shakeAmount < 20) {
        tile.position.y = originalY + (Math.random() - 0.5) * 0.2;
        shakeAmount++;
        setTimeout(shake, 30);
      } else {
        tile.position.y = originalY;
      }
    };
    shake();
  }

  flashScreen(color) {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.background = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.6)`;
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity 0.5s';
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => document.body.removeChild(flash), 500);
    }, 100);
  }

  respawnPlayer() {
    this.isTransitioning = false;
    this.selectedSide = null;
    
    this.leftButton.style.background = 'rgba(50, 50, 50, 0.8)';
    this.leftButton.style.borderColor = '#666';
    this.leftButton.style.transform = 'scale(1)';
    this.rightButton.style.background = 'rgba(50, 50, 50, 0.8)';
    this.rightButton.style.borderColor = '#666';
    this.rightButton.style.transform = 'scale(1)';
    
    let respawnZ = 15;
    
    if (this.currentTilePair > 0) {
      const lastSuccessfulPair = this.currentTilePair - 1;
      const lastSafeTile = this.tiles.find(tile => 
        tile.userData.pairIndex === lastSuccessfulPair && 
        tile.userData.activated === true
      );
      
      if (lastSafeTile) {
        respawnZ = lastSafeTile.position.z;
      }
    }
    
    if (this.player.ghost) {
      this.player.ghost.position.set(0, 1.5, respawnZ);
    }
    
    this.hud.showMessage(`⚠️ Damaged! ${this.player.health.current} HP remaining - Continue from here!`);
    setTimeout(() => {
      this.hud.showMessage("Choose the next tile carefully...");
      setTimeout(() => this.hud.showMessage(""), 3000);
    }, 2000);
  }

  handlePlayerDeath() {
    this.hud.showMessage("💀 You ran out of health! Restarting from the beginning...");
    
    setTimeout(() => {
      this.player.health.current = this.player.health.max;
      this.player._isDead = false;
      if (this.player.hud) {
        this.player.hud.updatePlayerHearts(this.player.health.current, this.player.health.max);
      }
      
      this.currentTilePair = 0;
      this.isTransitioning = false;
      this.selectedSide = null;
      
      this.leftButton.style.background = 'rgba(50, 50, 50, 0.8)';
      this.leftButton.style.borderColor = '#666';
      this.leftButton.style.transform = 'scale(1)';
      this.rightButton.style.background = 'rgba(50, 50, 50, 0.8)';
      this.rightButton.style.borderColor = '#666';
      this.rightButton.style.transform = 'scale(1)';
      
      this.tiles.forEach((tile, index) => {
        setTimeout(() => {
          tile.userData.activated = false;
          tile.userData.isSelected = false;
          tile.material.color.setHex(tile.userData.originalColor);
          tile.material.emissive.setHex(tile.userData.originalEmissive);
          tile.material.emissiveIntensity = 0.15;
        }, index * 50);
      });
      
      if (this.player.ghost) {
        this.player.ghost.position.copy(this.spawnPosition);
      }
      
      this.hud.showMessage("Starting over with full health!");
      setTimeout(() => {
        this.hud.showMessage("Use arrow keys to choose your path...");
        setTimeout(() => this.hud.showMessage(""), 3000);
      }, 2000);
    }, 2500);
  }

  completePuzzle() {
    this.puzzleComplete = true;
    this.isTransitioning = false;
    
    this.allowNormalMovement = true;
    
    if (this.selectionUI) {
      this.selectionUI.style.display = 'none';
    }
    
    this.tiles.forEach((tile, index) => {
      setTimeout(() => {
        tile.material.color.setHex(0xffd700);
        tile.material.emissive.setHex(0xffaa00);
        tile.material.emissiveIntensity = 0.6;
      }, index * 100);
    });
    
    this.hud.showMessage("🎉 PUZZLE COMPLETE! The bathroom door is opening...");
    
    if (this.doorPanel) {
      const targetRotation = -Math.PI / 2;
      const duration = 2000;
      const startTime = performance.now();
      const startRotation = this.doorPanel.rotation.y;
      
      const animateDoor = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        
        this.doorPanel.rotation.y = startRotation + (targetRotation - startRotation) * eased;
        
        if (progress < 1) {
          requestAnimationFrame(animateDoor);
        }
      };
      
      setTimeout(animateDoor, 1000);
    }
    
    setTimeout(() => {
      this.hud.showMessage("🎮 You can now move freely! Walk forward to enter the bathroom...");
    }, 2500);
  }

  checkBathroomDoorProximity() {
    if (!this.player.ghost || !this.bathroomDoor) return;
    
    const distance = this.player.ghost.position.distanceTo(this.bathroomDoor.position);
    
    if (distance < 4) {
      this.hud.showMessage("🚪 Press E to enter the bathroom");
      
      if (!this.doorKeyListener) {
        this.doorKeyListener = (e) => {
          if (e.key === 'e' || e.key === 'E') {
            this.enterBathroom();
          }
        };
        window.addEventListener('keydown', this.doorKeyListener);
      }
    } else {
      if (this.doorKeyListener) {
        window.removeEventListener('keydown', this.doorKeyListener);
        this.doorKeyListener = null;
      }
    }
  }

  enterBathroom() {
    this.hud.showMessage("🛁 Entering the bathroom...");
    console.log("🛁 Transitioning to bathroom boss fight");
    
    if (this.doorKeyListener) {
      window.removeEventListener('keydown', this.doorKeyListener);
      this.doorKeyListener = null;
    }
    
    if (this.selectionUI && this.selectionUI.parentNode) {
      this.selectionUI.style.display = 'none';
    }
    
    const fadeOverlay = document.createElement('div');
    fadeOverlay.style.position = 'fixed';
    fadeOverlay.style.top = '0';
    fadeOverlay.style.left = '0';
    fadeOverlay.style.width = '100%';
    fadeOverlay.style.height = '100%';
    fadeOverlay.style.background = 'black';
    fadeOverlay.style.opacity = '0';
    fadeOverlay.style.transition = 'opacity 1s';
    fadeOverlay.style.zIndex = '10000';
    document.body.appendChild(fadeOverlay);
    
    setTimeout(() => {
      fadeOverlay.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
      if (window.transitionToBathroom) {
        window.transitionToBathroom();
      }
      setTimeout(() => {
        if (fadeOverlay.parentNode) {
          fadeOverlay.style.opacity = '0';
          setTimeout(() => {
            if (fadeOverlay.parentNode) {
              document.body.removeChild(fadeOverlay);
            }
          }, 1000);
        }
      }, 500);
    }, 1000);
  }

  animateTiles(delta) {
    const time = this.clock.elapsedTime;
    
    this.tiles.forEach((tile, index) => {
      if (!tile.userData.activated) {
        const baseY = 0.2;
        tile.position.y = baseY + Math.sin(time * 0.5 + index * 0.3) * 0.03;
        
        tile.rotation.y = Math.sin(time * 0.2 + index * 0.5) * 0.02;
      }
    });
    
    this.animateDustParticles();
    this.animateLighting();
  }

  showPuzzleInstructions() {
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.95), rgba(40, 30, 20, 0.95));
      color: white;
      padding: 40px;
      border-radius: 20px;
      font-size: 18px;
      text-align: center;
      z-index: 10000;
      max-width: 700px;
      border: 3px solid #8b4513;
      box-shadow: 0 0 40px rgba(139, 69, 19, 0.6);
    `;
    
    instructions.innerHTML = `
      <h2 style="color: #ffcc66; margin-top: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
        🚪 The Hallway of Choices
      </h2>
      <p style="line-height: 1.8; margin: 20px 0;">
        Before you lies a treacherous path to the bathroom.<br>
        <span style="color: #ffdd77; font-weight: bold;">5 pairs of tiles</span> stand between you and safety.
      </p>
      <div style="background: rgba(255, 255, 0, 0.1); padding: 15px; border-radius: 10px; margin: 20px 0;">
        <p style="color: #ffff00; margin: 5px 0;">⚠️ Each pair has ONE safe tile and ONE trap!</p>
        <p style="color: #ff6666; margin: 5px 0;">💔 Step on a trap = Take 1 damage</p>
        <p style="color: #ff9999; margin: 5px 0;">💀 Lose all health = Restart from beginning</p>
      </div>
      
      <div style="background: rgba(100, 200, 255, 0.1); padding: 20px; border-radius: 10px; margin: 25px 0;">
        <h3 style="color: #66ccff; margin-top: 0;">🎮 CONTROLS</h3>
        <div style="display: flex; justify-content: space-around; margin: 15px 0;">
          <div style="text-align: center;">
            <div style="font-size: 32px;">◀️</div>
            <div style="color: #66ccff;">LEFT ARROW</div>
            <div style="font-size: 12px; color: #999;">Select Left Tile</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px;">▶️</div>
            <div style="color: #66ccff;">RIGHT ARROW</div>
            <div style="font-size: 12px; color: #999;">Select Right Tile</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px;">⎵</div>
            <div style="color: #66ff66;">SPACEBAR</div>
            <div style="font-size: 12px; color: #999;">Move Forward</div>
          </div>
        </div>
      </div>
      
      <p style="margin-top: 30px; font-size: 22px; color: #ffcc66; animation: pulse 1.5s infinite;">
        <strong>Press SPACE to begin your journey</strong>
      </p>
      
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      </style>
    `;
    
    document.body.appendChild(instructions);
    
    const startPuzzle = (e) => {
      if (e.code === 'Space') {
        instructions.style.transition = 'opacity 0.5s, transform 0.5s';
        instructions.style.opacity = '0';
        instructions.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        setTimeout(() => {
          document.body.removeChild(instructions);
        }, 500);
        
        window.removeEventListener('keydown', startPuzzle);
        this.hud.showMessage("Choose your first tile using LEFT ◀️ or RIGHT ▶️ arrow");
        setTimeout(() => this.hud.showMessage(""), 4000);
      }
    };
    
    window.addEventListener('keydown', startPuzzle);
  }

  updateWithCameraRotation(yaw, pitch) {
    const delta = this.clock.getDelta();

    if (this.player) {
      this.player.update();
    }

    this.updateTileHighlights();
    this.animateTiles(delta);
    
    if (this.puzzleComplete) {
      this.checkBathroomDoorProximity();
    }

    this.renderer.render(this.scene, this.camera);
  }

  update() {
    this.updateWithCameraRotation(0, 0);
  }

  getInitialCameraRotation() {
    return this.initialCameraRotation;
  }
  
  dispose() {
    if (this.arrowKeyHandler) {
      window.removeEventListener('keydown', this.arrowKeyHandler);
    }
    if (this.doorKeyListener) {
      window.removeEventListener('keydown', this.doorKeyListener);
    }
    
    if (this.selectionUI && this.selectionUI.parentNode) {
      document.body.removeChild(this.selectionUI);
    }
    
    this.tiles.forEach(tile => {
      tile.geometry.dispose();
      tile.material.dispose();
      tile.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    
    console.log("🧹 Hallway scene cleaned up");
  }
}