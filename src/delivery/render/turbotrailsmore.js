// MORE TURBO TRAIL STYLES (CHECKLIST 513): eight more looks for the Trail cosmetic, drawn by render/turbotrails.js's engine exactly as the
// first seven (its particle stores, its SOURCE: the game's car or a car on show, its parent game clock: paused nothing moves or comes, half as
// far at 0.5x). Each: one fixed pool, ONE draw call, nothing allocated a frame, no light; hidden when nothing is alive. They differ from the
// first seven (cubes, flame cones, flat ribbons, speed lines, car ghosts, falling sparks, rings) in shape and in motion:
//   pixels    an 8-bit rainbow carpet: rows of six coloured blocks side by side, stepping left and right, shrinking out in steps
//   stardust  gold and white four-pointed sparkles (a star drawn in code, 64 x 64) hanging in the air round the tail, twinkling
//   bubbles   soap bubbles (a ring texture drawn in code, 64 x 64) rising and wobbling, flashing as they pop
//   leaves    autumn leaves thrown from the tail corners, tumbling and swaying down, lying on the road (lit, with a dim warm glow of their own for the night)
//   lightning short jagged bolts crackling back from the tail, a new shape every bolt, one branch each
//   comet     one bright white head behind the tail and a tapering tail of beads, white to blue to violet
//   helix     two strands of beads twisting round each other behind the car
//   chevrons  arrows stamped on the road under the car pointing the way it goes, popping in and fading where they lie
// Every random choice is made at emission or from a particle's serial, so a paused frame draws the same to the bit.
import * as THREE from 'three';

// a fixed pseudo-random number in [0, 1) for an integer (a particle's serial and a salt): the same every frame
const hash = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const RAINBOW = [0xff2a2a, 0xff9a1a, 0xffe81a, 0x3ddc3d, 0x2a8bff, 0x9a4bff].map(c => new THREE.Color(c)); // (top to bottom)
const LEAF = [0xd9541e, 0xe8a317, 0xb8321a, 0x8a5a2b, 0xc9b02a].map(c => new THREE.Color(c));
const BUBBLE = [0xaaf4ff, 0xffb8f0, 0xc9b8ff, 0xb8ffd9].map(c => new THREE.Color(c));

// (shared scratch: one set for the module, never allocated in a frame)
const M = new THREE.Matrix4(), Qa = new THREE.Quaternion(), Sc = new THREE.Vector3(), Pa = new THREE.Vector3(), Pb = new THREE.Vector3(), Pc = new THREE.Vector3(),
  N1 = new THREE.Vector3(), N2 = new THREE.Vector3(), Dd = new THREE.Vector3(), Ax = new THREE.Vector3(), cl = new THREE.Color();
const ZZ = new THREE.Vector3(0, 0, 1), UPV = new THREE.Vector3(0, 1, 0);

// ctx: render/turbotrails.js's engine: makeStore, F (fields a particle), V (the source's velocity), T (its tail), Fw, Ac (forward, across),
// P (scratch), tailAt(across, out), rnd(r), additive(opts), src() (the source being drawn)
export const moreMakers = (ctx) => {
  const { makeStore, F, V, T, Fw, Ac, P, tailAt, additive } = ctx;
  const speedOf = () => Math.hypot(V.x, V.z);
  const flatQ = () => Qa.setFromUnitVectors(ZZ, Dd.set(Fw.x, 0, Fw.z).normalize()); // (yaw to the way the car goes)
  const done = (mesh, n) => { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };

  // ---- PIXELS: a column of six blocks every `step` m the car goes (placed where it was due between frames: evenly spaced) ----
  const makePixels = (max, lite) => {
    const S = makeStore(max), ROWS = RAINBOW.length, H = 0.07, W = 0.12, step = lite ? 1.1 : 0.55, LIFE = 0.36;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), max * ROWS);
    let acc = 0;
    return {
      stores: [S], mesh,
      emit(dt) {
        const sp = Math.max(12, speedOf());
        for (acc += dt * sp / step; acc >= 1;) {
          acc -= 1;
          const lag = Math.min(dt, acc * step / sp); // (how long ago this column was due)
          tailAt(0, P);
          S.emit(P.x - V.x * 0.8 * lag, P.y - 0.25 - V.y * 0.8 * lag, P.z - V.z * 0.8 * lag, V.x * 0.2, V.y * 0.2, V.z * 0.2, LIFE - lag);
        }
      },
      draw() {
        let n = 0;
        flatQ();
        const len = step * 0.8 * 0.98; // (the gap the columns open at: 0.8 of the car's speed between them)
        for (let i = 0; i < S.max; i++) {
          if (!S.alive(i)) continue;
          const o = i * F, t = S.age(i), q = t < 0.55 ? 1 : t < 0.8 ? 0.62 : 0.3, wave = ((S.serial[i] >> 1) & 1) ? W * 0.5 : -W * 0.5;
          for (let r = 0; r < ROWS; r++) {
            const off = (r - ROWS / 2 + 0.5) * W + wave; // (the stripes side by side across the car, stepping left and right)
            M.compose(Pa.set(S.d[o] + Ac.x * off, S.d[o + 1], S.d[o + 2] + Ac.z * off), Qa, Sc.set(W * q * 0.96, H * q, len * q));
            mesh.setMatrixAt(n, M); mesh.setColorAt(n++, RAINBOW[r]);
          }
        }
        done(mesh, n);
      },
    };
  };

  // ---- STARDUST: four-pointed sparkles (a star drawn in code, 64 x 64, white: tinted) hanging in the air round the tail, twinkling ----
  let starTex = null;
  const starTexture = () => {
    if (starTex) return starTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 12); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#fff'; g.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = i % 2 ? 4 : 30; g.lineTo(32 + Math.sin(a) * rr, 32 - Math.cos(a) * rr); }
      g.closePath(); g.fill();
    }
    starTex = new THREE.CanvasTexture(c); starTex.colorSpace = THREE.SRGBColorSpace;
    return starTex;
  };
  const makeStardust = (max) => {
    const S = makeStore(max), rate = max / 0.8;
    const pos = new Float32Array(max * 3), rgb = new Float32Array(max * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(rgb, 3).setUsage(THREE.DynamicDrawUsage));
    const mesh = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.75, map: starTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const Gd = new THREE.Color(0xffd86a), Wt = new THREE.Color(0xfff6e0);
    let acc = 0;
    return {
      stores: [S], mesh,
      emit(dt, { roadY }) {
        const s = ctx.src();
        for (acc += dt * rate; acc >= 1; acc--) {
          tailAt(ctx.rnd(s.hw * 1.1), P);
          S.emit(P.x, s.pointY(roadY, 0.15 + Math.random() * (s.height || 1.4)) , P.z, V.x * 0.1 + ctx.rnd(0.4), V.y * 0.1 + ctx.rnd(0.3), V.z * 0.1 + ctx.rnd(0.4), 0.6 + Math.random() * 0.3);
        }
      },
      draw() {
        let n = 0;
        for (let i = 0; i < S.max; i++) {
          if (!S.alive(i)) continue;
          const o = i * F, t = S.age(i), id = S.serial[i], sec = S.d[o + 7] - S.d[o + 6];
          pos[n * 3] = S.d[o]; pos[n * 3 + 1] = S.d[o + 1]; pos[n * 3 + 2] = S.d[o + 2];
          const tw = 0.35 + 0.65 * hash(id * 13 + Math.floor(sec / 0.07)); // (twinkling: a new brightness every 0.07 s of its life)
          cl.copy(id % 3 ? Gd : Wt).multiplyScalar(tw * Math.min(1, t * 6) * (1 - t));
          rgb[n * 3] = cl.r; rgb[n * 3 + 1] = cl.g; rgb[n * 3 + 2] = cl.b;
          n++;
        }
        g.setDrawRange(0, n);
        g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
      },
    };
  };

  // ---- BUBBLES: points with a ring drawn in code (64 x 64, white: tinted per bubble) ----
  let ringTex = null;
  const bubbleTexture = () => {
    if (ringTex) return ringTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const r = g.createRadialGradient(32, 32, 16, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.7, 'rgba(255,255,255,0.35)'); r.addColorStop(0.92, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(22, 21, 6, 3.5, -0.7, 0, Math.PI * 2); g.fill();
    }
    ringTex = new THREE.CanvasTexture(c); ringTex.colorSpace = THREE.SRGBColorSpace;
    return ringTex;
  };
  const makeBubbles = (max) => {
    const S = makeStore(max), rate = max / 0.95;
    const pos = new Float32Array(max * 3), rgb = new Float32Array(max * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(rgb, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({ size: 0.6, map: bubbleTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Points(g, mat);
    let acc = 0;
    return {
      stores: [S], mesh,
      emit(dt) {
        for (acc += dt * rate; acc >= 1; acc--) {
          tailAt(ctx.rnd(ctx.src().hw * 0.8), P);
          S.emit(P.x, P.y + ctx.rnd(0.1), P.z, V.x * 0.25 + ctx.rnd(0.6), V.y * 0.25 + 0.5 + Math.random() * 0.8, V.z * 0.25 + ctx.rnd(0.6), 0.7 + Math.random() * 0.3, Math.random() * 6.3);
        }
      },
      draw() {
        let n = 0;
        for (let i = 0; i < S.max; i++) {
          if (!S.alive(i)) continue;
          const o = i * F, t = S.age(i), sec = S.d[o + 7] - S.d[o + 6], w = Math.sin(sec * 9 + S.d[o + 8]) * 0.12 * Math.min(1, sec * 4);
          pos[n * 3] = S.d[o] + Ac.x * w; pos[n * 3 + 1] = S.d[o + 1]; pos[n * 3 + 2] = S.d[o + 2] + Ac.z * w;
          const f = t < 0.88 ? 0.85 * Math.min(1, t * 8) : 1.6 * (1 - t) / 0.12; // (faded in; a flash as it pops)
          cl.copy(BUBBLE[S.serial[i] % BUBBLE.length]).multiplyScalar(f);
          rgb[n * 3] = cl.r; rgb[n * 3 + 1] = cl.g; rgb[n * 3 + 2] = cl.b;
          n++;
        }
        g.setDrawRange(0, n);
        g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
      },
    };
  };

  // ---- LEAVES: a flat leaf (6 triangles) per instance, lit (MeshLambert: the scene's own lights), tumbling about its own axis ----
  const leafGeometry = () => {
    const p = [0, 0, 0, 0, 0, 0.5, 0.22, 0, 0.15, 0.2, 0, -0.18, 0, 0, -0.5, -0.2, 0, -0.18, -0.22, 0, 0.15];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1]);
    g.computeVertexNormals();
    return g;
  };
  const makeLeaves = (max) => {
    const S = makeStore(max), rate = max / 0.95;
    const mesh = new THREE.InstancedMesh(leafGeometry(), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: 0x4a2410 }) /* (a dim warm glow of its own: still seen at night) */, max);
    let acc = 0;
    return {
      stores: [S], mesh, gravity: 5,
      tick(dt) { // (air drag: thrown out fast, then fluttering down slowly; on the road they come to rest where they fell)
        const fh = Math.exp(-2.2 * dt), fv = Math.exp(-1.6 * dt);
        for (let i = 0, o = 0; i < S.max; i++, o += F) if (S.d[o + 6] > 0) { S.d[o + 3] *= fh; S.d[o + 4] *= fv; S.d[o + 5] *= fh; }
      },
      emit(dt, { roadY }) {
        const hw = ctx.src().hw, floor = roadY + 0.02;
        for (acc += dt * rate; acc >= 1; acc--) {
          const side = Math.random() < 0.5 ? -1 : 1, out = side * (1 + Math.random() * 2.5);
          tailAt(side * hw * 0.8, P);
          S.emit(P.x, P.y, P.z, V.x * 0.55 + Ac.x * out, V.y * 0.5 + 1.2 + Math.random() * 1.8, V.z * 0.55 + Ac.z * out, 0.85 + Math.random() * 0.15, 0, floor);
        }
      },
      draw() {
        let n = 0;
        for (let i = 0; i < S.max; i++) {
          if (!S.alive(i)) continue;
          const o = i * F, t = S.age(i), id = S.serial[i], sec = S.d[o + 7] - S.d[o + 6];
          const air = S.d[o + 1] - S.d[o + 9] > 0.03 ? 1 : 0.15, sway = Math.sin(sec * 6 + hash(id) * 6.3) * 0.25 * Math.min(1, sec * 2) * air;
          Ax.set(hash(id * 3 + 1) - 0.5, hash(id * 3 + 2) * 0.6 + 0.2, hash(id * 3 + 3) - 0.5).normalize();
          Qa.setFromAxisAngle(Ax, hash(id * 7) * 6.3 + sec * (6 + 6 * hash(id * 5)) * air);
          const s = 0.6 * (t < 0.8 ? 1 : (1 - t) / 0.2);
          M.compose(Pa.set(S.d[o] + Ac.x * sway, S.d[o + 1], S.d[o + 2] + Ac.z * sway), Qa, Sc.set(s, s, s));
          mesh.setMatrixAt(n, M); mesh.setColorAt(n++, LEAF[id % LEAF.length]);
        }
        done(mesh, n);
      },
    };
  };

  // ---- LIGHTNING: a bolt a particle (riding along with the car), 7 jagged segments back from the tail and a 3-segment branch, each segment
  // two crossed thin quads (seen from above and from behind); its shape from its serial ----
  const SEGS = 10;
  const makeLightning = (max) => {
    const S = makeStore(max), rate = max / 0.16;
    const pos = new Float32Array(max * SEGS * 12 * 3), rgb = new Float32Array(max * SEGS * 12 * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(rgb, 3).setUsage(THREE.DynamicDrawUsage));
    const mesh = new THREE.Mesh(g, additive({ vertexColors: true, side: THREE.DoubleSide }));
    const c0 = new THREE.Color(0xd2bcff);
    let acc = 0, v = 0;
    const vert = (p, nx, ny, nz, s, f) => { const u = v * 3; pos[u] = p.x + nx * s; pos[u + 1] = p.y + ny * s; pos[u + 2] = p.z + nz * s; rgb[u] = c0.r * f; rgb[u + 1] = c0.g * f; rgb[u + 2] = c0.b * f; v++; };
    const quad = (a, b, N, w, f) => { vert(a, N.x, N.y, N.z, -w, f); vert(b, N.x, N.y, N.z, -w, f); vert(b, N.x, N.y, N.z, w, f); vert(a, N.x, N.y, N.z, -w, f); vert(b, N.x, N.y, N.z, w, f); vert(a, N.x, N.y, N.z, w, f); };
    const seg = (a, b, w, f) => {
      Dd.subVectors(b, a); if (Dd.lengthSq() < 1e-8) return;
      N1.crossVectors(Dd, UPV); if (N1.lengthSq() < 1e-8) N1.set(1, 0, 0); N1.normalize(); N2.crossVectors(Dd, N1).normalize();
      quad(a, b, N1, w, f); quad(a, b, N2, w, f);
    };
    // a point j of 6 down bolt `id` from its start (a), len m long
    const pt = (out, a, id, j, len) => { const m = j / 6, amp = 0.35 * Math.min(1, j); return out.set(a.x - Fw.x * len * m + Ac.x * (hash(id * 17 + j) - 0.5) * amp, a.y + (hash(id * 23 + j) - 0.5) * amp * 0.7, a.z - Fw.z * len * m + Ac.z * (hash(id * 17 + j) - 0.5) * amp); };
    return {
      stores: [S], mesh,
      emit(dt, { k }) {
        for (acc += dt * rate; acc >= 1; acc--) { tailAt(ctx.rnd(ctx.src().hw * 0.6), P); S.emit(P.x, P.y, P.z, V.x * 0.92, V.y * 0.92, V.z * 0.92, 0.07 + Math.random() * 0.06, 2.4 + 2.2 * Math.min(1, k)); }
      },
      draw() {
        v = 0;
        for (let i = 0; i < S.max; i++) {
          if (!S.alive(i)) continue;
          const o = i * F, t = S.age(i), id = S.serial[i], len = S.d[o + 8], f = (1 - t * 0.6) * (0.75 + 0.25 * hash(id));
          Pc.set(S.d[o], S.d[o + 1], S.d[o + 2]);
          Pa.copy(Pc);
          for (let j = 1; j <= 6; j++) { pt(Pb, Pc, id, j, len); seg(Pa, Pb, 0.035 * (1 - j / 9), f); Pa.copy(Pb); }
          pt(Pa, Pc, id, 3, len); const side = hash(id * 31) < 0.5 ? -1 : 1;
          for (let j = 1; j <= 3; j++) { Pb.set(Pa.x - Fw.x * 0.4 + Ac.x * side * 0.3, Pa.y + (hash(id * 41 + j) - 0.6) * 0.25, Pa.z - Fw.z * 0.4 + Ac.z * side * 0.3); seg(Pa, Pb, 0.022, f * 0.7); Pa.copy(Pb); }
        }
        g.setDrawRange(0, v);
        g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
      },
    };
  };

  // ---- COMET: the head (one extra instance, while the turbo runs) and the beads it sheds, slower than the car, shrinking ----
  const makeComet = (max) => {
    const S = makeStore(max), rate = max / 0.5, BACK = 0.55;
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), additive(), max + 1);
    const W = new THREE.Color(0xffffff), B = new THREE.Color(0x7fd8ff), Vi = new THREE.Color(0x5a3dff);
    let acc = 0;
    const head = (out) => { tailAt(0, out); return out.set(out.x - Fw.x * BACK, out.y, out.z - Fw.z * BACK); };
    return {
      stores: [S], mesh,
      emit(dt, { k }) { for (acc += dt * rate; acc >= 1; acc--) { head(P); S.emit(P.x + ctx.rnd(0.03), P.y + ctx.rnd(0.03), P.z + ctx.rnd(0.03), V.x * 0.72, V.y * 0.72, V.z * 0.72, 0.5, 0.2 + 0.05 * Math.min(1, k)); } },
      draw(live) {
        let n = 0;
        if (live) { head(Pa); M.makeScale(0.27, 0.27, 0.27).setPosition(Pa); mesh.setMatrixAt(n, M); mesh.setColorAt(n++, cl.setRGB(0.9, 0.95, 1)); }
        for (let i = 0; i < S.max; i++) {
          if (!S.alive(i)) continue;
          const o = i * F, t = S.age(i), r = S.d[o + 8] * Math.pow(1 - t, 1.2);
          M.makeScale(r, r, r).setPosition(S.d[o], S.d[o + 1], S.d[o + 2]);
          mesh.setMatrixAt(n, M);
          if (t < 0.3) cl.copy(W).lerp(B, t / 0.3); else cl.copy(B).lerp(Vi, (t - 0.3) / 0.7);
          mesh.setColorAt(n++, cl.multiplyScalar(0.55 * (1 - t)));
        }
        done(mesh, n);
      },
    };
  };

  // ---- HELIX: beads on two strands half a turn apart; each set off round the tail's axis by the phase it was shed at, turning on as it ages ----
  const makeHelix = (max) => {
    const S = makeStore(max), rate = max / 0.55, OMEGA = 28;
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), additive(), max);
    const A = new THREE.Color(0x8dff4a), Bc = new THREE.Color(0xff4ad2);
    let acc = 0, phase = 0, strand = 0;
    return {
      stores: [S], mesh,
      emit(dt) {
        phase = (phase + dt * OMEGA) % (Math.PI * 2);
        for (acc += dt * rate; acc >= 1; acc--) { strand = 1 - strand; tailAt(0, P); S.emit(P.x, P.y, P.z, V.x * 0.6, V.y * 0.6, V.z * 0.6, 0.55, phase + strand * Math.PI, strand); }
      },
      draw() {
        let n = 0;
        for (let i = 0; i < S.max; i++) {
          if (!S.alive(i)) continue;
          const o = i * F, t = S.age(i), sec = S.d[o + 7] - S.d[o + 6], a = S.d[o + 8] + sec * 4, r = 0.22 + 0.25 * t, ca = Math.cos(a) * r, sa = Math.sin(a) * r, s = 0.13 * (1 - 0.5 * t);
          M.makeScale(s, s, s).setPosition(S.d[o] + Ac.x * ca, S.d[o + 1] + sa, S.d[o + 2] + Ac.z * ca);
          mesh.setMatrixAt(n, M); mesh.setColorAt(n++, cl.copy(S.d[o + 9] ? Bc : A).multiplyScalar(1 - 0.8 * t));
        }
        done(mesh, n);
      },
    };
  };

  // ---- CHEVRONS: an arrow (4 triangles, flat) stamped on the road under the tail every `step` m, nearly still where it lies ----
  const chevronGeometry = () => {
    const p = [0, 0, 0.25, 0, 0, 0.09, 0.5, 0, -0.25, 0.5, 0, -0.41, -0.5, 0, -0.25, -0.5, 0, -0.41]; // (tip out, tip in, right out, right in, left out, left in)
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex([0, 2, 3, 0, 3, 1, 0, 1, 5, 0, 5, 4]);
    return g;
  };
  const makeChevrons = (max, lite) => {
    const S = makeStore(max), step = lite ? 2.4 : 1.5, LIFE = 0.55;
    const mesh = new THREE.InstancedMesh(chevronGeometry(), additive({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), max);
    const c0 = new THREE.Color(0xffb21a);
    let acc = 0;
    return {
      stores: [S], mesh,
      emit(dt, { roadY }) {
        const sp = Math.max(12, speedOf()), y = ctx.src().pointY(roadY, 0.04); // (the road under the tail; up with the car in a jump)
        for (acc += dt * sp / step; acc >= 1;) {
          acc -= 1;
          const lag = Math.min(dt, acc * step / sp);
          tailAt(0, P);
          S.emit(P.x - V.x * 0.95 * lag, y, P.z - V.z * 0.95 * lag, V.x * 0.05, V.y * 0.05, V.z * 0.05, LIFE - lag);
        }
      },
      draw() {
        let n = 0;
        flatQ();
        const w = ctx.src().hw * 1.1;
        for (let i = 0; i < S.max; i++) {
          if (!S.alive(i)) continue;
          const o = i * F, t = S.age(i), pop = t < 0.15 ? 1.35 - 0.35 * t / 0.15 : 1;
          M.compose(Pa.set(S.d[o], S.d[o + 1], S.d[o + 2]), Qa, Sc.set(w * pop, 1, 1.6 * pop));
          mesh.setMatrixAt(n, M); mesh.setColorAt(n++, cl.copy(c0).multiplyScalar(Math.pow(1 - t, 1.3) * (S.serial[i] % 3 ? 0.75 : 1)));
        }
        done(mesh, n);
      },
    };
  };

  return {
    pixels: (n, lite) => makePixels(n, lite),
    stardust: (n) => makeStardust(n),
    bubbles: (n) => makeBubbles(n),
    leaves: (n) => makeLeaves(n),
    lightning: (n) => makeLightning(n),
    comet: (n) => makeComet(n),
    helix: (n) => makeHelix(n),
    chevrons: (n, lite) => makeChevrons(n, lite),
  };
};
// the pools, full / lite (pixels: columns of six blocks; lightning: bolts of ten segments; comet: beads, plus the head)
export const MORE_POOLS = { pixels: [20, 10], stardust: [48, 24], bubbles: [40, 20], leaves: [36, 18], lightning: [6, 3], comet: [28, 14], helix: [80, 40], chevrons: [12, 8] };
