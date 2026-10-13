// The flat black of a car the player has not got (the car lot's, the showroom's locked car, the model editor's Blackout view):
// one unlit material for every part, so only the shape shows.
import * as THREE from 'three';
export const SILHOUETTE = new THREE.MeshBasicMaterial({ color: 0x07080b, side: THREE.DoubleSide }); // (both sides: a car's one-sided panels, wound to face the lit side only, must not leave holes in its shape)
SILHOUETTE.userData.shared = true; // (clearGroup keeps it)
