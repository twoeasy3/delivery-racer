// The flat black of a car the player has not got (the car lot's, the showroom's locked car, the model editor's Blackout view):
// one unlit material for every part, so only the shape shows.
import * as THREE from 'three';
export const SILHOUETTE = new THREE.MeshBasicMaterial({ color: 0x07080b, side: THREE.DoubleSide }); // (both sides: a car's one-sided panels, wound to face the lit side only, must not leave holes in its shape)
SILHOUETTE.userData.shared = true; // (clearGroup keeps it)
// What a part's material becomes in a blackout. A glow on the road (the underglow: a transparent, unlit, picture-faded
// plane) keeps its own picture's fade but goes black, else it would show as a flat black rectangle; anything else is the
// plain silhouette.
const DECALS = new WeakMap();
export const silhouetteFor = (material) => {
  const m = [].concat(material)[0];
  if (!(m && m.map && m.transparent && !m.depthWrite)) return SILHOUETTE;
  if (!DECALS.has(m)) DECALS.set(m, new THREE.MeshBasicMaterial({ color: 0x07080b, map: m.map, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  DECALS.get(m).userData.shared = true;
  return DECALS.get(m);
};
