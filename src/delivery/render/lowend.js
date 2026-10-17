// a LOW-END device (2 cores or 2 GB or fewer): the cutscenes' lite version (render/cinequeue.js) and the turbo trail's lite variant
// (render/turbotrails.js, CHECKLIST 452) both ask this. Render-only (here, not in lite.js: src/delivery/*.js files are in the replay fingerprint).
export const lowEnd = () => typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2);
