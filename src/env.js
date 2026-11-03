import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const WATER = new THREE.Color('#1A7EC2');

export function makeRenderer(canvas, pixelRatioCap = 1.75, alpha = false) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  r.toneMapping = THREE.NoToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

export function setupScene(renderer, { fogNear = 14, fogFar = 70 } = {}) {
  const scene = new THREE.Scene();
  scene.background = WATER.clone();
  scene.fog = new THREE.Fog(WATER, fogNear, fogFar);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;

  const hemi = new THREE.HemisphereLight('#FFFFFF', '#FFF2D8', 1.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFFFFF', 1.9);
  sun.position.set(4, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40;
  sun.shadow.bias = -0.0008; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight('#9FE6FF', 0.0); rim.position.set(-6, 4, -8); scene.add(rim);

  const bc = document.createElement('canvas'); bc.width = 4; bc.height = 256; const bg = bc.getContext('2d');
  const gr = bg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9AF0FF'); gr.addColorStop(0.22, '#35B8E8'); gr.addColorStop(0.5, '#1A7EC2'); gr.addColorStop(1, '#0F5A9C');
  bg.fillStyle = gr; bg.fillRect(0, 0, 4, 256);
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; scene.background = bt;
  const dome = null;
  return { scene, sun, dome, hemi };
}

// sand + caustics textures (procedural)
export function sandTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#F7DFA3'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const a = 0.06 + 0.06 * Math.sin(y * 0.12 + Math.sin(y * 0.031) * 3);
    g.fillStyle = `rgba(190,140,70,${a.toFixed(3)})`; g.fillRect(0, y, 512, 2);
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,245,215,.6)' : 'rgba(170,125,70,.35)'; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export function causticTexture(seed = 1) {
  const S = 256; const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  let s = seed; const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pts = []; for (let i = 0; i < 26; i++) pts.push([R() * S, R() * S]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const dx = x - px - ox, dy = y - py - oy, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const e = Math.sqrt(d2) - Math.sqrt(d1);
    const v = Math.max(0, 1 - e / 9); const b = Math.pow(v, 1.7) * 255;
    const k = (y * S + x) * 4; img.data[k] = b; img.data[k + 1] = b; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function rayTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, 256); gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c); return t;
}

export const causticClock = { value: 0 };
export function makeFloor() {
  const sand = sandTexture(); sand.repeat.set(10, 50);
  const caus = causticTexture(3); caus.repeat.set(22, 110);
  const mat = new THREE.MeshLambertMaterial({ map: sand, color: new THREE.Color('#F4E0B4'), emissive: new THREE.Color('#CFFAFF'), emissiveMap: caus, emissiveIntensity: 0.34 });
  // natural caustics: two soft light webs drift and wobble in different directions; only where they overlap
  // does light gather (like real sunlight through waves). Fades out with distance so it never reads as tiles.
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCT = causticClock;
    sh.fragmentShader = 'uniform float uCT;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `
      { vec2 u = vEmissiveMapUv;
        float a = texture2D(emissiveMap, u + vec2(sin(u.y * 1.9 + uCT * 0.7) * 0.035, uCT * 0.035)).r;
        float b = texture2D(emissiveMap, u * 0.77 + vec2(0.41 - uCT * 0.028, cos(u.x * 1.4 + uCT * 0.55) * 0.045)).r;
        float cst = min(a, b) * 1.6;
        float fade = 1.0 - smoothstep(9.0, 34.0, length(vViewPosition));
        totalEmissiveRadiance *= cst * fade; }`);
  };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 300, 1, 1), mat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -120; floor.receiveShadow = true;
  return { floor, sand, caus };
}
