import * as THREE from 'three';
import { EffectComposer } from 'three-stdlib/postprocessing/EffectComposer';
import { RenderPass } from 'three-stdlib/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three-stdlib/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three-stdlib/postprocessing/ShaderPass';
import { generateDirtTexture } from './filters.js';

export class Renderer {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true; // Keep your shadow support
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Keep soft shadows
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Required for filters
    this.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(this.renderer.domElement);

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(null, null); // Scene and camera set later
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    this.sparklePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0.0 },
        sparkleIntensity: { value: 0.8 },
        sparkleThreshold: { value: 0.4 },
        sparkleDensity: { value: 0.8 },
        sparkleSpeed: { value: 1.2 },
        gridSize: { value: 32.0 }
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float time; uniform float sparkleIntensity; uniform float sparkleThreshold; uniform float sparkleDensity; uniform float sparkleSpeed; uniform float gridSize; varying vec2 vUv;
        float hash21(vec2 p){p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y);}
        float starShape(vec2 uv,float rad){uv*=2.0; float ax=abs(uv.x); float ay=abs(uv.y); float rays=max(ax,ay); float center=smoothstep(rad,0.0,length(uv)); return clamp((1.0-pow(rays,1.3))*center,0.0,1.0);}
        void main(){vec4 base=texture2D(tDiffuse,vUv); float bright=dot(base.rgb,vec3(0.299,0.587,0.114)); vec3 outCol=base.rgb;
        if(bright>sparkleThreshold){vec2 cell=floor(vUv*gridSize); float cellRand=hash21(cell);
        if(cellRand>sparkleDensity){vec2 local=fract(vUv*gridSize)-0.5; float phase=fract(time*sparkleSpeed*(0.2+cellRand*1.5)+cellRand*7.0); float tw=abs(1.0-2.0*phase); float alpha=smoothstep(0.25,0.0,tw); float size=0.5+1.5*(1.0-tw); float s=starShape(local*size,0.35); float contribution=s*alpha*sparkleIntensity; outCol+=vec3(1.0,1.0,0.95)*contribution;}} gl_FragColor=vec4(outCol,base.a);}`
    });
    this.sparklePass.enabled = false;
    this.composer.addPass(this.sparklePass);

    // Dirt overlay
    this.overlayScene = new THREE.Scene();
    this.overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const dirtTex = generateDirtTexture();
    this.overlayMat = new THREE.MeshBasicMaterial({ 
      map: dirtTex, 
      transparent: true, 
      opacity: 0.45, 
      depthTest: false, 
      blending: THREE.NormalBlending 
    });
    this.overlayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.overlayMat);
    this.overlayMesh.visible = false;
    this.overlayScene.add(this.overlayMesh);

    // Resize handler
    window.addEventListener('resize', () => this.resize());
  }

  setSceneCamera(scene, camera) {
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  render(scene, camera, time) {
    this.sparklePass.uniforms.time.value = time;
    this.composer.render();
    this.renderer.autoClear = false;
    this.renderer.render(this.overlayScene, this.overlayCamera);
    this.renderer.autoClear = true;
  }

  getBloomPass() {
    return this.bloomPass;
  }

  getSparklePass() {
    return this.sparklePass;
  }

  getOverlayMesh() {
    return this.overlayMesh;
  }

  getRenderer() {
    return this.renderer;
  }
}
