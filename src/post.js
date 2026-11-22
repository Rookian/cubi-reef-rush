// Shared post-processing for the game and the review page.
// Some GPUs/drivers (Windows ANGLE, HalfFloat + MSAA targets) produce single broken pixels:
// NaN/Inf or negative values that the sRGB conversion turns into black specks, and the
// bloom smears into patterns. The passes here make the chain robust against that.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const Q = typeof location !== 'undefined' ? location.search : '';
export const POST_FLAGS = { msaa: !/[?&]nomsaa/.test(Q), fix: !/[?&]nofix/.test(Q), float: !/[?&]nofloat/.test(Q) };

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const BAD = `
  bool bad(vec3 c) { return any(isnan(c)) || any(isinf(c)) || c.r < 0.0 || c.g < 0.0 || c.b < 0.0 || c.r > 60000.0 || c.g > 60000.0 || c.b > 60000.0; }
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  // repair a pixel from its 4 neighbours: broken values (NaN/Inf/negative) always,
  // and isolated dark specks (much darker than every neighbour) when 'speck' is on
  vec3 repair(sampler2D t, vec2 uv, vec2 px, bool speck) {
    vec3 c = texture2D(t, uv).rgb;
    vec3 a = texture2D(t, uv + vec2(px.x, 0.0)).rgb, b = texture2D(t, uv - vec2(px.x, 0.0)).rgb;
    vec3 d = texture2D(t, uv + vec2(0.0, px.y)).rgb, e = texture2D(t, uv - vec2(0.0, px.y)).rgb;
    vec3 s = vec3(0.0); float n = 0.0; float mn = 1e9;
    if (!bad(a)) { s += a; n += 1.0; mn = min(mn, lum(a)); }
    if (!bad(b)) { s += b; n += 1.0; mn = min(mn, lum(b)); }
    if (!bad(d)) { s += d; n += 1.0; mn = min(mn, lum(d)); }
    if (!bad(e)) { s += e; n += 1.0; mn = min(mn, lum(e)); }
    vec3 avg = n > 0.0 ? s / n : vec3(0.0);
    if (bad(c)) return avg;
    if (speck && n > 3.5 && lum(c) < 0.4 * mn && mn > 0.02) return avg;
    return c;
  }`;

// before the bloom: kill broken pixels so the blur can't spread them
export function sanitizePass() {
  const p = new ShaderPass({ uniforms: { tDiffuse: { value: null }, px: { value: new THREE.Vector2(1, 1) } }, vertexShader: VS,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 px; varying vec2 vUv; ${BAD}
      void main() { vec4 t = texture2D(tDiffuse, vUv); gl_FragColor = vec4(repair(tDiffuse, vUv, px, false), bad(vec3(t.a)) ? 1.0 : t.a); }` });
  p.setSize = (w, h) => p.uniforms.px.value.set(1 / w, 1 / h);
  return p;
}
// last pass: repair + despeckle + linear -> sRGB (replaces OutputPass; safe pow on clamped values)
export function safeOutputPass() {
  const p = new ShaderPass({ uniforms: { tDiffuse: { value: null }, px: { value: new THREE.Vector2(1, 1) } }, vertexShader: VS,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 px; varying vec2 vUv; ${BAD}
      vec3 toSRGB(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
      void main() { gl_FragColor = vec4(toSRGB(repair(tDiffuse, vUv, px, true)), 1.0); }` });
  p.setSize = (w, h) => p.uniforms.px.value.set(1 / w, 1 / h);
  return p;
}

// composer: render -> sanitize -> bloom -> [extra passes] -> safe output
export function makeComposer(renderer, scene, camera, { strength, radius, threshold, extra = [] }) {
  const rt = new THREE.WebGLRenderTarget(16, 16, { type: POST_FLAGS.float ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: POST_FLAGS.msaa ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  if (POST_FLAGS.fix) composer.addPass(sanitizePass());
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold);
  composer.addPass(bloom);
  for (const e of extra) composer.addPass(e);
  if (POST_FLAGS.fix) composer.addPass(safeOutputPass());
  else composer.addPass(new OutputPass());
  return { composer, bloom };
}
