// Mola cleaning station (Nusa Penida style): a bump-head sunfish hangs tilted and pale beside a reef head
// while schooling bannerfish circle it, an emperor angelfish picks at the fin edges, butterflyfish nibble
// the flanks and cleaner wrasse dart in and out of the breathing mouth. Come too close (or let a shark
// pass) and the mola flushes dark, the cleaners scatter and the big fish glides off into the blue.
import * as THREE from 'three';
import * as F3 from './fish3d.js';
import * as RS from './reefscape.js';
import { animateSchool } from './models.js';

const R = Math.random, rf = (a, b) => a + R() * (b - a);
const _v = new THREE.Vector3(), _t = new THREE.Vector3();

export function makeCleaningStation(sd = 1) {
  const g = new THREE.Group();
  const rock = RS.makeOutcrop(Math.floor(rf(1, 9999)), 0.85, "bommie"); rock.position.set(sd * 0.8, 0, 0.4); g.add(rock); rock.updateMatrix();
  // the rock's corals live in the shared coral field: hand them to the game in the station's frame
  g.userData.corals = (rock.userData.corals || []).map(c => ({ ...c, m: new THREE.Matrix4().multiplyMatrices(rock.matrix, c.m) }));
  // the mola: head toward the lane, leaning over on its side the way they present themselves to cleaners
  const holder = new THREE.Group(); holder.position.set(-sd * 1.1, 3.0, 0); g.add(holder);
  const lean = new THREE.Group(); lean.rotation.y = sd * Math.PI / 2; holder.add(lean);
  const tilt = new THREE.Group(); tilt.rotation.z = 0.5; lean.add(tilt);
  const mola = F3.makeFish3D(F3.design('Mola mola (ocean sunfish)'), 2.3); tilt.add(mola);
  const box = new THREE.Box3().setFromObject(mola), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  // spots in the mola's own frame: fin edges (angelfish), flanks (butterflyfish), mouth (wrasse)
  const L = sz.z / 2, H = sz.y / 2;
  const spots = {
    fins: [[0, H * 0.92, L * 0.25], [0, -H * 0.92, L * 0.25], [0, H * 0.7, L * 0.45], [0, -H * 0.7, L * 0.45], [0, H * 0.3, L * 0.9], [0, -H * 0.3, L * 0.9]],
    flank: [[1, 0.25 * H, 0], [1, -0.2 * H, 0.3 * L], [-1, 0.1 * H, 0.2 * L], [-1, -0.3 * H, -0.1 * L], [1, 0.4 * H, 0.45 * L], [-1, 0.35 * H, 0.5 * L]],
    mouth: [[0, 0, -L * 1.0], [0.3, 0.05 * H, -L * 0.95], [-0.3, -0.05 * H, -L * 0.95]] };
  const latX = sz.x / 2;
  const cleaners = [];
  const add = (name, size, kind, n) => { for (let i = 0; i < n; i++) { const f = F3.makeFish3D(F3.design(name), size); tilt.add(f); const cl = { f, kind, spot: 0, t: rf(0, 3), pos: new THREE.Vector3(), tgt: new THREE.Vector3(), vel: new THREE.Vector3(), out: rf(0.25, 0.5) }; pickSpot(cl); cl.pos.copy(cl.tgt); cleaners.push(cl); } };
  function spotPos(cl, out) {
    const s = spots[cl.kind][cl.spot];
    if (cl.kind === 'flank') return _t.set(s[0] * (latX + out), s[1] + c.y, s[2] + c.z);
    if (cl.kind === 'mouth') return _t.set(s[0] * 0.2, s[1] + c.y, s[2] + c.z - out * 0.6);
    return _t.set(0, s[1] + Math.sign(s[1]) * out + c.y, s[2] + c.z);
  }
  function pickSpot(cl) { cl.spot = Math.floor(R() * spots[cl.kind].length); cl.t = rf(1.5, 4); cl.tgt.copy(spotPos(cl, cl.out)); }
  add('Emperor angelfish', 0.55, 'fins', 1);
  add('Threadfin butterflyfish', 0.42, 'flank', 2);
  add('Cleaner wrasse', 0.22, 'mouth', 2);
  // the bannerfish cloud around the mola (instanced school)
  const school = F3.makeSchool3D('Schooling bannerfish', 12, 0.5); school.position.copy(holder.position); g.add(school);
  g.userData = { corals: g.userData.corals, sd, holder, tilt, mola, cleaners, school, spotPos, pickSpot, scared: 0, away: 0, t: 0 };
  return g;
}

// worldMola: world-space position of the mola (for the distance checks the game does)
export function moloPos(g, out) { return g.userData.holder.getWorldPosition(out); }

export function animateCleaningStation(g, dt, threat) {
  const u = g.userData; u.t += dt;
  if (threat && !u.scared) { u.scared = 1; u.mola.userData.mood = 1; u.cleaners.forEach(cl => { cl.vel.set(rf(-1, 1), rf(0.4, 1.2), rf(-1, 1)).normalize().multiplyScalar(rf(2.5, 4)); }); }
  F3.animateFish3D(u.mola, dt);
  if (!u.scared) {
    u.holder.position.y = 3.0 + Math.sin(u.t * 0.4) * 0.12;
    u.tilt.rotation.z = 0.5 + Math.sin(u.t * 0.27) * 0.08;
    for (const cl of u.cleaners) {
      cl.t -= dt; if (cl.t < 0) u.pickSpot(cl);
      const peck = 0.5 + 0.5 * Math.sin(u.t * (cl.kind === 'mouth' ? 5 : 3) + cl.out * 9);   // nibble in and out
      _v.copy(u.spotPos(cl, cl.out * (0.35 + 0.65 * peck)));
      cl.tgt.lerp(_v, Math.min(1, dt * 3));
      const prev = _t.copy(cl.pos); cl.pos.lerp(cl.tgt, Math.min(1, dt * 2.2));
      cl.f.position.copy(cl.pos);
      face(cl.f, prev, cl.pos, u.spotPos(cl, 0));
      F3.animateFish3D(cl.f, dt);
    }
    animateSchool(u.school, dt);
  } else {
    // startled: cleaners dash away and shrink into the blue, the mola rolls upright and glides off
    u.away += dt;
    for (const cl of u.cleaners) { const prev = _t.copy(cl.pos); cl.pos.addScaledVector(cl.vel, dt); cl.f.position.copy(cl.pos); face(cl.f, prev, cl.pos, null); cl.f.scale.multiplyScalar(Math.max(0, 1 - dt * 0.5)); F3.animateFish3D(cl.f, dt * 2.5); }
    u.school.position.y += dt * 1.2; u.school.position.x += u.sd * dt * 1.8; animateSchool(u.school, dt * 1.8);
    if (u.away > 0.6) { const k = Math.min(1, (u.away - 0.6) / 3); u.tilt.rotation.z *= 1 - dt; u.mola.userData.speed = 3.0 + 3 * k;
      u.holder.position.x += u.sd * dt * 1.4 * k; u.holder.position.z -= dt * 0.8 * k; u.holder.position.y -= dt * 0.25 * k; }
  }
}
// fish swim head-first (-z): point the head along the movement, or at the mola while hovering
const _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);
function face(f, prev, pos, look) {
  _v.subVectors(pos, prev);
  if (_v.lengthSq() < 1e-6) { if (!look) return; _v.subVectors(look, pos); }
  if (_v.lengthSq() < 1e-8) return;
  _m.lookAt(_v.normalize().negate(), new THREE.Vector3(), _up); const q = new THREE.Quaternion().setFromRotationMatrix(_m);
  f.quaternion.slerp(q, 0.15);
}
