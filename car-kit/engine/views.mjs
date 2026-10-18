// ---- CAR KIT VIEWS: every picture the renderer takes, drawn in a browser with the kit's three.js ---------------------------
// renderViews(THREE, spec, { only }) -> { images: { name: dataURL }, sheet: dataURL, order: [name] }
// The lighting is the game's: its cards (a sky light and a sun from the front right) and its road (a softer sky, a high sun).
import { buildCar, mountFrames, framePoint } from './build.mjs';

const CARD_LIGHT = (THREE, scene) => {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(3, 6, 5); scene.add(sun);
};
// the blueprint cards' five poses (lift: rad above level; angle: rad the car is turned, 0 = nose to the camera; fov; margins)
export const POSES = {
  top: { lift: 1.08, angle: Math.PI - 0.62, fov: 30, margin: 0.88 },
  hero: { lift: 0.035, angle: -0.36, fov: 40, marginX: 0.86, marginY: 0.72, shiftY: 0.05 },
  front: { lift: 0.24, angle: 0.62, fov: 28, margin: 0.88 },
  rear: { lift: 0.2, angle: Math.PI + 0.72, fov: 30, marginX: 0.86, marginY: 0.72, shiftY: 0.04 },
  side: { lift: 0.05, angle: -Math.PI / 2, fov: 16, marginX: 0.88, marginY: 0.66, shiftY: 0.04 },
};
const MOUNT_COLOURS = { roof: 0x2f7bff, cargo: 0x22c55e, wing: 0xff3b3b, 'plate-front': 0xffffff, 'plate-rear': 0xffffff, decal: 0xffd400 };

export const renderViews = (THREE, spec, { only = null } = {}) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  const images = {}, order = [], labels = {};
  const shot = (name, label, w, h, scene, camera, bg = 0xdfe4ea) => {
    if (only && !only.includes(name)) return;
    renderer.setSize(w, h, false);
    renderer.setClearColor(bg, 1);
    if (camera.isPerspectiveCamera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
    images[name] = renderer.domElement.toDataURL('image/png');
    order.push(name); labels[name] = label;
  };
  const make = (evil = false) => { const m = buildCar(THREE, spec, { evil }); m.updateMatrixWorld(true); return m; };
  const car = make(false), evilCar = make(true);
  const box = new THREE.Box3().setFromObject(car), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  const stage = (model, extra = []) => {
    const scene = new THREE.Scene(); CARD_LIGHT(THREE, scene); scene.add(model);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0xc9ced6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; scene.add(floor);
    for (const e of extra) scene.add(e);
    return scene;
  };
  // ---- orthographic views: front, rear, left side, top ----
  const ortho = (dir, up, w, h, span) => {
    const aspect = w / h, cam = new THREE.OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, 0.1, 100);
    cam.position.copy(mid).addScaledVector(dir, 30); cam.up.copy(up); cam.lookAt(mid); cam.updateProjectionMatrix();
    return cam;
  };
  const groundLine = (len) => { const g = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, len), new THREE.MeshBasicMaterial({ color: 0xd22020 })); g.position.y = -0.006; return g; };
  const sceneA = stage(car);
  const span = Math.max(size.y, size.x) * 1.25, sspan = Math.max(size.y * 1.6, size.z / 1.5 * 1.1);
  shot('front', 'front (nose on)', 480, 320, sceneA, ortho(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), 480, 320, span));
  shot('rear', 'rear', 480, 320, sceneA, ortho(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 480, 320, span));
  shot('left', 'left side (+x), nose left', 480, 320, sceneA, ortho(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 480, 320, sspan));
  shot('right', 'right side (-x), nose right', 480, 320, sceneA, ortho(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), 480, 320, sspan));
  const topCam = () => ortho(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), 480, 320, Math.max(size.x * 1.3, size.z / 1.5 * 1.1));
  shot('top', 'top: nose right, left side (+x) at the top', 480, 320, sceneA, topCam());
  // ---- three-quarter views (perspective) ----
  const persp = (az, el, w, h, fov = 30, dist = 1, target = mid) => {
    const cam = new THREE.PerspectiveCamera(fov, w / h, 0.05, 200), d = radius / Math.sin(fov * Math.PI / 360) * 1.05 * dist;
    cam.position.set(target.x + Math.sin(az) * Math.cos(el) * d, target.y + Math.sin(el) * d, target.z + Math.cos(az) * Math.cos(el) * d);
    cam.lookAt(target); return cam;
  };
  shot('front34', 'front 3/4 (Good)', 480, 320, sceneA, persp(0.75, 0.32, 480, 320));
  shot('rear34', 'rear 3/4 (Good)', 480, 320, sceneA, persp(Math.PI + 0.75, 0.32, 480, 320));
  const sceneE = stage(evilCar);
  shot('front34-evil', 'front 3/4 (Evil livery)', 480, 320, sceneE, persp(0.75, 0.32, 480, 320));
  shot('rear34-evil', 'rear 3/4 (Evil livery)', 480, 320, sceneE, persp(Math.PI + 0.75, 0.32, 480, 320));
  // ---- the game's chase camera: 14 m behind, 11 m up, aimed 10 m ahead, a portrait phone's 88 degree lens; on a road ----
  {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc4e8);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556655, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-40, 80, -20); scene.add(sun);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 400), new THREE.MeshLambertMaterial({ color: 0x55595f })); road.rotation.x = -Math.PI / 2; road.position.z = 150; scene.add(road);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x6aa84f })); grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.01, 150); scene.add(grass);
    for (const x of [-2.33, 2.33]) for (let z = -20; z < 300; z += 9) { const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 })); dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.005, z); scene.add(dash); }
    const model = make(false); scene.add(model);
    const cam = new THREE.PerspectiveCamera(88, 360 / 640, 0.5, 700); cam.position.set(0, 11, -14); cam.lookAt(0, 0, 10);
    shot('chase', 'game chase camera (phone, actual size)', 360, 640, scene, cam);
    // (the same, the car's patch of the picture blown up 4x, pixel for pixel: what a player can read)
    if (!only || only.includes('chase-zoom')) {
      const src = renderer.domElement, c = document.createElement('canvas'); c.width = 360; c.height = 360;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      const p = new THREE.Vector3(0, size.y / 2, 0).project(cam), px = (p.x + 1) / 2 * 360, py = (1 - p.y) / 2 * 640;
      g.drawImage(src, px - 45, py - 45, 90, 90, 0, 0, 360, 360);
      images['chase-zoom'] = c.toDataURL('image/png'); order.push('chase-zoom'); labels['chase-zoom'] = 'chase camera, the car x4 (pixels)';
    }
  }
  // ---- icon (64 x 64) ----
  {
    const scene = new THREE.Scene(); CARD_LIGHT(THREE, scene); scene.add(make(false));
    shot('icon', 'icon 64 x 64', 64, 64, scene, persp(0.75, 0.35, 64, 64, 30, 0.92), 0xdfe4ea);
  }
  // ---- the blueprint card poses (framed tight, as the game's cards are) ----
  for (const [name, pose] of Object.entries(POSES)) {
    if (only && !only.includes('pose-' + name)) continue;
    const scene = new THREE.Scene(); CARD_LIGHT(THREE, scene);
    const model = make(false), holder = new THREE.Group(), turn = new THREE.Group();
    holder.position.set(-mid.x, -box.min.y, -mid.z); holder.add(model); turn.add(holder); turn.rotation.y = pose.angle; scene.add(turn);
    const w = 300, h = 400, cam = new THREE.PerspectiveCamera(pose.fov, w / h, 0.05, 1000);
    const corners = [];
    const cos = Math.cos(pose.angle), sin = Math.sin(pose.angle);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const px = x - mid.x, pz = z - mid.z; corners.push(new THREE.Vector3(px * cos + pz * sin, y - box.min.y, -px * sin + pz * cos)); }
    const target = new THREE.Vector3(0, size.y * 0.5, 0), dir = new THREE.Vector3(0, Math.sin(pose.lift), Math.cos(pose.lift)), q = new THREE.Vector3();
    const spanAt = (d) => { cam.position.copy(target).addScaledVector(dir, d); cam.lookAt(target); cam.updateMatrixWorld(true); cam.updateProjectionMatrix(); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const c of corners) { q.copy(c).applyMatrix4(cam.matrixWorldInverse); if (q.z > -cam.near) return null; q.applyMatrix4(cam.projectionMatrix); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); } return { w: (x1 - x0) / 2, h: (y1 - y0) / 2, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; };
    const m = pose.margin ?? 0.86, mx = pose.marginX ?? m, my = pose.marginY ?? m, fits = (s) => s && s.w <= mx && s.h <= my;
    let near = 0.05, far = 400; for (let i = 0; i < 28; i++) { const d = (near + far) / 2; if (fits(spanAt(d))) far = d; else near = d; }
    const s = spanAt(far);
    if (s) cam.setViewOffset(w, h, s.cx / 2 * w, -(s.cy - (pose.shiftY || 0)) / 2 * h, w, h); // (the box centred in the card)
    shot('pose-' + name, 'blueprint pose: ' + name, w, h, scene, cam, 0x1d3a66);
  }
  // ---- ground contact: each wheel's foot on the ground line (red), close up from the side ----
  {
    const scene = stage(make(false), [groundLine(30)]);
    for (const wh of car.userData.wheels) {
      const name = 'ground-' + wh.userData.wheel;
      if (only && !only.includes(name)) continue;
      if (wh.position.x < 0 && !only) continue; // (the left wheels; the right ones mirror them unless asymmetric)
      const r = wh.userData.radius, side = wh.position.x >= 0 ? 1 : -1;
      const cam = new THREE.OrthographicCamera(-r * 1.6, r * 1.6, r * 0.9, -r * 0.9, 0.1, 100);
      cam.position.set(wh.position.x + side * 20, r * 0.35, wh.position.z); cam.lookAt(wh.position.x, r * 0.35, wh.position.z); cam.updateProjectionMatrix();
      shot(name, 'ground contact ' + wh.userData.wheel + ' (red = y 0)', 320, 180, scene, cam);
    }
    const cam = new THREE.OrthographicCamera(-size.x * 0.65, size.x * 0.65, size.x * 0.3, -size.x * 0.2, 0.1, 100);
    cam.position.set(0, 0.2, 30); cam.lookAt(0, 0.2, 0); cam.updateProjectionMatrix();
    shot('ground-front', 'ground contact, from the front', 480, 200, scene, cam);
  }
  // ---- wireframe (the triangles over the solid) ----
  {
    const model = make(false), lines = new THREE.Group();
    model.traverse((n) => { if (n.isMesh) { const l = new THREE.LineSegments(new THREE.WireframeGeometry(n.geometry), new THREE.LineBasicMaterial({ color: 0x101010, transparent: true, opacity: 0.55 })); l.matrixAutoUpdate = false; l.matrix.copy(n.matrixWorld); lines.add(l); } });
    model.updateMatrixWorld(true);
    shot('wireframe', 'wireframe (every triangle)', 480, 320, stage(model, [lines]), persp(0.75, 0.32, 480, 320));
  }
  // ---- mounts: translucent boxes (roof blue, cargo green, wing red, plates white, decals yellow) and a test decal ----
  {
    const frames = mountFrames(spec), model = make(false);
    model.traverse((n) => { if (n.isMesh && n.userData.prop) n.visible = false; }); // (the slot's own props hidden, as a cosmetic would)
    model.updateMatrixWorld(true);
    const extra = [], rc = new THREE.Raycaster(), checker = checkerTexture(THREE);
    for (const f of frames) {
      const colour = MOUNT_COLOURS[f.kind === 'decal' ? 'decal' : f.slot];
      const h = f.kind === 'prop' ? f.height : 0.02;
      const geo = new THREE.BoxGeometry(f.size[0], f.size[1], h);
      const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(...f.u), new THREE.Vector3(...f.v), new THREE.Vector3(...f.n));
      geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, h / 2)).applyMatrix4(basis).translate(...f.at);
      const boxMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: f.kind === 'decal' ? 0.18 : 0.35, depthWrite: false }));
      extra.push(boxMesh, new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: colour })));
      if (f.kind === 'decal' || f.kind === 'plate') extra.push(projectDecal(THREE, model, f, rc, checker));
    }
    const s1 = stage(model, extra);
    shot('mounts-front', 'mounts + test decal, front left', 480, 320, s1, persp(0.85, 0.42, 480, 320));
    shot('mounts-rear', 'mounts + test decal, rear right', 480, 320, s1, persp(Math.PI + 0.85, 0.42, 480, 320));
    shot('mounts-top', 'mounts from above, nose right', 480, 320, s1, topCam());
    shot('decal-left', 'test decal on the left flank (undistorted squares?)', 480, 320, s1, ortho(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 480, 320, sspan));
  }
  // ---- the contact sheet: every picture, labelled ----
  const sheet = contactSheet(spec, images, order, labels);
  renderer.dispose();
  return { images, sheet, order, labels };
};

// a black and white checkerboard with a red arrow toward +u (so a mirrored or stretched decal shows)
const checkerTexture = (THREE) => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 32; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; g.fillRect(i * 8, j * 8, 8, 8); }
  g.fillStyle = '#e02020'; g.beginPath(); g.moveTo(240, 32); g.lineTo(200, 12); g.lineTo(200, 52); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.anisotropy = 4;
  return t;
};
// a decal laid on the body inside a frame: a lattice cast onto the surface along -n, lifted 4 mm, its squares 1:1 in metres
const projectDecal = (THREE, model, f, rc, tex) => {
  const nu = Math.max(4, Math.round(f.size[0] / 0.05)), nv = Math.max(2, Math.round(f.size[1] / 0.05));
  const n = new THREE.Vector3(...f.n), pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const a = -1 + 2 * i / nu, b = -1 + 2 * j / nv, q = new THREE.Vector3(...framePoint(f, a, b, 0.3));
    rc.set(q, n.clone().negate()); rc.far = 0.6;
    const hit = rc.intersectObject(model, true).find(h => h.object.visible);
    const p = hit ? hit.point.clone().addScaledVector(n, 0.004) : new THREE.Vector3(...framePoint(f, a, b, 0.004));
    pos.push(p.x, p.y, p.z);
    // (u runs the frame's width; the picture's 4:1 squares repeat to keep them square on the car)
    uv.push(i / nu * (f.size[0] / f.size[1]) / 4, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i; idx.push(a, a + 1, a + nu + 2, a, a + nu + 2, a + nu + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  tex.wrapS = THREE.RepeatWrapping;
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 }));
};
// the sheet: a title, then a grid of tiles with labels
const contactSheet = (spec, images, order, labels) => {
  const cols = 5, tw = 320, th = 240, pad = 8, lab = 18, head = 40;
  const rows = Math.ceil(order.length / cols);
  const c = document.createElement('canvas'); c.width = cols * (tw + pad) + pad; c.height = head + rows * (th + lab + pad) + pad;
  const g = c.getContext('2d');
  g.fillStyle = '#20242c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#ffd23f'; g.font = 'bold 20px sans-serif'; g.fillText((spec.name || spec.id) + '  (' + spec.id + ', class ' + spec.class + ')', pad, 27);
  return Promise.all(order.map((name) => new Promise((done) => { const im = new Image(); im.onload = () => done([name, im]); im.src = images[name]; }))).then((loaded) => {
    loaded.forEach(([name, im], k) => {
      const x = pad + (k % cols) * (tw + pad), y = head + Math.floor(k / cols) * (th + lab + pad);
      g.fillStyle = '#dfe4ea'; g.fillRect(x, y + lab, tw, th);
      const s = Math.min(tw / im.width, th / im.height, name === 'icon' ? 3 : 1), w = im.width * s, h = im.height * s;
      g.imageSmoothingEnabled = name !== 'icon';
      g.drawImage(im, x + (tw - w) / 2, y + lab + (th - h) / 2, w, h);
      g.fillStyle = '#e8e8e8'; g.font = '13px sans-serif'; g.fillText(labels[name], x + 2, y + 13, tw - 4);
    });
    return c.toDataURL('image/png');
  });
};
