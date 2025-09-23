import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

export async function loadAssets(scene, gltfPath) {
  const loader = new GLTFLoader();
  console.log('Loading GLTF from:', gltfPath);
  try {
    const gltf = await loader.loadAsync(gltfPath);
    
    // Compute bounding box to position the model
    const box = new Box3().setFromObject(gltf.scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    
    // Position ghost so its bottom is above the floor (y = 0)
    gltf.scene.position.y = size.y + 0.2; // Bottom at y = 0.2
    gltf.scene.position.x = center.x;
    gltf.scene.position.z = center.z;
    
    scene.add(gltf.scene);
    console.log('GLTF loaded successfully:', gltf);
    console.log('Model size:', size);
    console.log('Model center:', center);
    
    return { model: gltf.scene, center, size };
  } catch (error) {
    console.error('Error loading GLTF:', error);
    throw error;
  }
}