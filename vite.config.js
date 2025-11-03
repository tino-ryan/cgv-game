import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Makes all paths relative - GOOD!
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    copyPublicDir: true,
  },
  publicDir: 'public',
  server: {
    port: 5173,
  },
  assetsInclude: [
    '**/*.gltf', 
    '**/*.glb', 
    '**/*.bin', 
    '**/*.png', 
    '**/*.jpg', 
    '**/*.mp3', 
    '**/*.wav'
  ],
});