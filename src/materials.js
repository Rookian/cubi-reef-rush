import * as THREE from 'three';

// ------------------------------------------------------------------
// Toon look that matches the 2D drawings: flat colour, one soft shadow
// band, warm dark-brown outlines.
// ------------------------------------------------------------------
export const OUTLINE = '#3B2614';

let grad = null;
export function toonGradient() {
  if (grad) return grad;
  const data = new Uint8Array([118, 118, 118, 255, 210, 210, 210, 255, 255, 255, 255, 255]);
  grad = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.generateMipmaps = false; grad.needsUpdate = true;
  return grad;
}

export function plastic(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    vertexColors: !!opts.vertexColors,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    emissive: new THREE.Color(opts.emissive ?? '#000000'),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    depthWrite: opts.depthWrite ?? true,
  });
}
export const toon = plastic;
export function fin(color, opacity = 1) {
  return new THREE.MeshToonMaterial({
    color, gradientMap: toonGradient(), side: THREE.DoubleSide,
    transparent: opacity < 1, opacity,
    emissive: new THREE.Color(color).multiplyScalar(0.25),
  });
}
export const eyeWhite = () => new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toonGradient(), emissive: new THREE.Color('#2a2a2a') });
export const pupil = () => new THREE.MeshBasicMaterial({ color: '#1F1A2E' });
export const highlight = () => new THREE.MeshBasicMaterial({ color: '#ffffff' });

// Inverted-hull outline: a back-faced copy pushed out along the normals
const hullMats = {};
export function outlineMat(thickness = 0.022, color = OUTLINE) {
  const key = thickness + color;
  if (hullMats[key]) return hullMats[key];
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uThick = { value: thickness };
    sh.vertexShader = 'uniform float uThick;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * uThick;');
  };
  m.customProgramCacheKey = () => 'hull' + key;
  return (hullMats[key] = m);
}
export function outline(mesh, thickness = 0.022, color = OUTLINE) {
  const h = new THREE.Mesh(mesh.geometry, outlineMat(thickness, color));
  h.raycast = () => {};
  mesh.add(h);
  return mesh;
}

// Gentle vertex-colour gradient
export function paintGradient(geo, top, bottom, axis = 'y', min = -0.5, max = 0.5, fn) {
  const c1 = new THREE.Color(top), c2 = new THREE.Color(bottom), c = new THREE.Color();
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = axis === 'y' ? pos.getY(i) : axis === 'z' ? pos.getZ(i) : pos.getX(i);
    const t = THREE.MathUtils.clamp((v - min) / (max - min), 0, 1);
    c.copy(c2).lerp(c1, t);
    if (fn) fn(c, i, pos);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

// Fan-shaped fin outline (XY plane, root at origin, pointing +X)
export function fanPath(len = 1, spread = 0.6, lobes = 0) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.08 * len);
  s.bezierCurveTo(len * 0.4, -spread * 0.6 * len, len * 0.9, -spread * len, len, -spread * 0.7 * len);
  if (lobes) s.quadraticCurveTo(len * 0.8, 0, len, spread * 0.7 * len);
  else s.bezierCurveTo(len * 1.12, -spread * 0.2 * len, len * 1.12, spread * 0.2 * len, len, spread * 0.7 * len);
  s.bezierCurveTo(len * 0.9, spread * len, len * 0.4, spread * 0.6 * len, 0, 0.08 * len);
  s.closePath();
  return s;
}
export function fanShape(len = 1, spread = 0.6, lobes = 0) { return new THREE.ShapeGeometry(fanPath(len, spread, lobes), 24); }

// A fin = flat toon shape + dark outline tube + a couple of lighter rays (like the 2D fins)
export function finMesh(len, spread, lobes, color, rayColor, edge = OUTLINE, edgeR = 0.014) {
  const g = new THREE.Group();
  const shape = fanPath(len, spread, lobes);
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), fin(color)));
  const pts = shape.getPoints(48).map(p => new THREE.Vector3(p.x, p.y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 140, edgeR, 6, true), new THREE.MeshBasicMaterial({ color: edge })));
  if (rayColor) {
    const rm = new THREE.MeshBasicMaterial({ color: rayColor });
    for (const a of [-0.45, 0, 0.45]) {
      const end = new THREE.Vector3(len * 0.78, Math.sin(a) * spread * len * 0.85, 0.002);
      const c = new THREE.LineCurve3(new THREE.Vector3(len * 0.12, 0, 0.002), end);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 1, edgeR * 0.55, 4), rm));
    }
  }
  return g;
}

// ------------------------------------------------------------------
// Living glow: vivid colours give off a soft light of their own (scaled by saturation, so
// rocks, sand, eyes and white stripes stay as they are), with a slow shimmer.
// ------------------------------------------------------------------
export const glowU = { uGlowT: { value: 0 }, uGlowK: { value: 0.4 } };
export function glowify(mat) {
  if (!mat || !mat.isMeshToonMaterial || mat.userData.glow || mat.userData.noGlow) return;
  mat.userData.glow = true;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
  const prevStr = prevKey === THREE.Material.prototype.customProgramCacheKey ? prev.toString() : null;
  mat.onBeforeCompile = function (sh, r) {
    prev.call(this, sh, r);
    Object.assign(sh.uniforms, glowU);
    sh.fragmentShader = 'uniform float uGlowT, uGlowK;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 gc = diffuseColor.rgb; float sat = max(gc.r, max(gc.g, gc.b)) - min(gc.r, min(gc.g, gc.b));
        totalEmissiveRadiance += gc * uGlowK * smoothstep(0.3, 0.8, sat) * (1.0 + 0.2 * sin(uGlowT * 1.3 + vViewPosition.x * 0.45 + vViewPosition.y * 0.7)); }`);
  };
  mat.customProgramCacheKey = function () { return (prevStr ?? prevKey.call(this)) + '|glow'; };
  mat.needsUpdate = true;
}
export function glowAll(obj) { obj.traverse(m => { if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(glowify); }); return obj; }
