// ---- the amphibious tank's model (no game state here: see cars.js AMPHIBIOUS_TANK) ----------------------
// TANK RAGE on an amphibious level is in this, not the Tank: a tracked amphibious assault vehicle. A relative of
// the Tank (the same olive steel, tracks, a turret and a gun) and plainly not the same one: a boat's bow with a
// trim vane folded out ahead of it, high flat hull sides down over the tracks, a low little turret off to one
// side with a stubby gun, a ramp door and two water jets at the stern, and a pale band along the waterline.
// Front facing local +z, standing on y = 0, as a car's model. userData: body (the mesh whose material is the
// paint), pieces (its parts in the five pieces of TANK RAGE, in the order they are found: see makeTankMesh in
// render/cars.js and render/tankcorner.js), livery(evil) (its band and markings, each side's), animate(t, afloat)
// (the jets' wash, when afloat).
import * as THREE from 'three';

const box = new THREE.BoxGeometry(1, 1, 1);
// a slab of hull: its side profile ([z, y] points, anticlockwise seen from its left) as wide as `width`
const slab = (material, profile, width) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false }), material);
  mesh.rotation.y = -Math.PI / 2; // (the profile's z along the hull, its depth across it)
  mesh.position.x = width / 2;
  return mesh;
};

export const makeAmphibiousTankMesh = (color) => {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x23261c });
  const steel = new THREE.MeshLambertMaterial({ color: 0x4a4d45 });
  const band = new THREE.MeshLambertMaterial({ color: 0xd8d2b4 });
  const wash = new THREE.MeshBasicMaterial({ color: 0xeaf6fa, transparent: true, opacity: 0.75, depthWrite: false });
  const pieces = [[], [], [], [], []];
  let piece = 0;
  const into = (mesh) => { group.add(mesh); pieces[piece].push(mesh); return mesh; };
  const part = (material, w, h, l, x, y, z) => {
    const mesh = new THREE.Mesh(box, material);
    mesh.scale.set(w, h, l);
    mesh.position.set(x, y, z);
    return into(mesh);
  };
  const drum = (material, radius, length, axis, x, y, z, sides = 14) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, sides), material);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    return into(mesh);
  };
  const W = 2.5, FLOOR = 0.42, DECK = 1.82, STERN = -2.7, BOW = 2.2;
  // ---- the rear body: the back half of the hull, the ramp door in its sloping stern, the water jets
  const hull = into(slab(paint, [[STERN + 0.25, FLOOR], [0, FLOOR], [0, DECK], [STERN + 0.55, DECK], [STERN, 1.25]], W));
  const ramp = part(dark, 1.5, 1.0, 0.06, 0, 1.12, STERN + 0.2);       // the ramp door (its frame)
  ramp.rotation.x = 0.36;
  const door = part(paint, 1.3, 0.82, 0.06, 0, 1.12, STERN + 0.17);
  door.rotation.x = 0.36;
  const jets = [];
  for (const side of [-1, 1]) {
    drum(steel, 0.27, 0.5, 'z', side * 0.88, 0.72, STERN + 0.2);        // a water jet's nozzle, each side of the ramp
    drum(dark, 0.2, 0.52, 'z', side * 0.88, 0.72, STERN + 0.19);
    const jet = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.9, 10, 1, true), wash); // (and its wash, afloat)
    jet.rotation.x = Math.PI / 2;
    jet.position.set(side * 0.88, 0.62, STERN - 0.95);
    jet.visible = false;
    group.add(jet);
    jets.push(jet);
    part(band, 0.04, 0.2, 2.6, side * (W / 2 + 0.01), 1.0, -1.35);      // the waterline band, this half of it
    part(new THREE.MeshBasicMaterial({ color: 0xff2a2a }), 0.22, 0.12, 0.06, side * 0.98, 1.5, STERN + 0.36); // tail lamps
  }
  part(dark, 1.5, 0.05, 1.5, 0, DECK + 0.02, -1.55);                     // the troop hatches in the deck,
  part(steel, 0.05, 0.07, 1.5, 0, DECK + 0.05, -1.55);                   // split down the middle
  // ---- the turret hull: the deck's hatches and the ring the turret sits on
  piece = 1;
  drum(steel, 0.62, 0.14, 'y', 0.5, DECK + 0.07, 0.75, 16);              // the turret ring, off to the right
  drum(dark, 0.36, 0.12, 'y', -0.62, DECK + 0.06, 1.1);                  // the driver's hatch, front left,
  part(dark, 0.5, 0.1, 0.12, -0.62, DECK + 0.16, 1.42);                  // its vision blocks
  drum(dark, 0.34, 0.12, 'y', -0.62, DECK + 0.06, 0.1);                  // the commander's, behind it
  part(dark, 0.9, 0.06, 0.6, 0.45, DECK + 0.03, -0.35);                  // the engine's grille
  part(dark, 0.03, 1.5, 0.03, -1.05, DECK + 0.75, -2.0);                 // an aerial
  // ---- the gun turret: low and small
  piece = 2;
  drum(paint, 0.56, 0.42, 'y', 0.5, DECK + 0.35, 0.75, 10);
  part(paint, 0.62, 0.3, 0.5, 0.5, DECK + 0.33, 1.2);                    // its flat face,
  part(dark, 0.3, 0.26, 0.42, 0.98, DECK + 0.36, 1.05);                  // the launcher's box on its cheek
  drum(dark, 0.2, 0.06, 'y', 0.42, DECK + 0.58, 0.62);                   // and its hatch
  // ---- the gun barrel: a stubby one
  piece = 3;
  drum(dark, 0.085, 1.35, 'z', 0.4, DECK + 0.36, 2.0);
  drum(dark, 0.12, 0.2, 'z', 0.4, DECK + 0.36, 2.62);
  // ---- the front body: the boat's bow, the trim vane, and the running gear
  piece = 4;
  into(slab(paint, [[0, FLOOR], [BOW, FLOOR], [BOW + 1.15, 1.3], [BOW + 0.95, DECK - 0.12], [BOW + 0.2, DECK], [0, DECK]], W));
  const vane = part(band, W - 0.3, 0.06, 1.15, 0, 1.52, BOW + 1.45);     // the trim vane, folded out over the bow wave
  vane.rotation.x = -0.5;
  for (const side of [-1, 1]) {
    const strut = part(steel, 0.06, 0.06, 0.8, side * 0.8, 1.42, BOW + 1.2); // (its struts)
    strut.rotation.x = -0.25;
    part(band, 0.04, 0.2, 2.2, side * (W / 2 + 0.01), 1.0, 1.1);         // the waterline band, the front half
    part(dark, 0.5, 0.5, 4.5, side * 0.95, 0.3, -0.2);                   // the track's run, low under the hull's side,
    drum(dark, 0.3, 0.5, 'x', side * 0.95, 0.33, 2.05);                  // rounded off at each end
    drum(dark, 0.3, 0.5, 'x', side * 0.95, 0.33, -2.45);
    for (let i = 0; i < 6; i++) drum(steel, 0.22, 0.06, 'x', side * 1.21, 0.27, -2.2 + i * 0.8); // road wheels
    part(paint, 0.12, 0.34, 4.9, side * (W / 2 - 0.05), 0.6, -0.15);     // the hull's side skirt, down over the track
    part(new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), 0.2, 0.14, 0.08, side * 0.95, 1.5, BOW + 1.06); // headlights
  }
  group.userData = {
    body: hull, pieces, band,
    livery: (evil) => band.color.setHex(evil ? 0xb3261e : 0xd8d2b4), // (Evil: a red band; Good: sand)
    animate: (t, afloat) => {
      for (const [i, jet] of jets.entries()) {
        jet.visible = !!afloat;
        jet.scale.set(1 + Math.sin(t * 17 + i * 2) * 0.12, 0.9 + Math.sin(t * 23 + i) * 0.15, 1);
      }
    },
  };
  return group;
};
