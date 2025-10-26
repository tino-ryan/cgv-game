import * as THREE from 'three';
import { RGBELoader } from 'three-stdlib/loaders/RGBELoader';

export class Scene extends THREE.Scene {
  constructor() {
    super();

    // Add a larger floor with grass texture (unchanged)
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const grassTexture = new THREE.TextureLoader().load('/assets/textures/grass.jpg');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      map: grassTexture,
      side: THREE.DoubleSide 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.add(floor);

    // Add lighting (unchanged)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.add(directionalLight);

    // Add dynamic light for applyReflectiveScene
    this.dynamicLight = new THREE.PointLight(0xffffff, 2.0, 50);
    this.dynamicLight.position.set(0, 5, 0);
    this.dynamicLight.visible = false;
    this.add(this.dynamicLight);

    // HDR environment for filters
    const pmremGenerator = new THREE.PMREMGenerator(new THREE.WebGLRenderer());
    pmremGenerator.compileEquirectangularShader();
    new RGBELoader().setPath('/assets/hdr/').load('studio_small_08.hdr', (hdrEquirect) => {
      const envMap = pmremGenerator.fromEquirectangular(hdrEquirect).texture;
      this.environment = envMap;
      this.background = new THREE.Color(0x000000);
      hdrEquirect.dispose();
      pmremGenerator.dispose();
    }, undefined, (err) => console.warn('HDR load failed:', err));
  }
}
