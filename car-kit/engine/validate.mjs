// ---- CAR KIT VALIDATOR: is a spec well formed? (no imports; Node and browser) ----------------------------------------------
// validateSpec(spec) -> { errors: [string], warnings: [string] }. Every message names where (parts[3] "bonnet") and what to do.
// The rules are FORMAT.md's; schema/car.schema.json says the same for tools that read JSON Schema.
import { ROLES, GLASS_TAGS, LAMP_TAGS, OTHER_TAGS, PROP_SLOTS, SHAPES, expandParts, expandWheels } from './build.mjs';

export const CLASSES = ['small', 'medium', 'large', 'tall', 'truck'];
const ANIM_TYPES = ['spin', 'swing', 'bob', 'shudder'];
export const MOUNT_SLOTS = ['roof', 'cargo', 'wing', 'plate-front', 'plate-rear'];

export const validateSpec = (spec) => {
  const errors = [], warnings = [];
  const err = (where, msg) => errors.push(where + ': ' + msg), warn = (where, msg) => warnings.push(where + ': ' + msg);
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const vec = (v, n) => Array.isArray(v) && v.length === n && v.every(num);
  const pos = (v) => num(v) && v > 0;
  const colour = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  const known = (obj, keys, where) => { for (const k of Object.keys(obj)) if (!k.startsWith('//') && !keys.includes(k)) warn(where, 'unknown field "' + k + '" (ignored; comments go in fields that start with "//")'); };
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return { errors: ['the spec must be a JSON object'], warnings };
  known(spec, ['format', 'id', 'name', 'class', 'description', 'livery', 'colors', 'parts', 'wheels', 'groups', 'animate', 'mounts', 'asymmetric', 'openWheels', 'noWindscreen', 'notes'], 'spec');
  if (spec.format !== 'carkit/1') err('format', 'must be "carkit/1"');
  if (typeof spec.id !== 'string' || !/^[a-z][a-z0-9-]{1,30}$/.test(spec.id)) err('id', 'must be a short lower-case id: letters, digits, dashes (e.g. "junker")');
  if (typeof spec.name !== 'string' || !spec.name.trim()) err('name', 'give the car a display name');
  if (!CLASSES.includes(spec.class)) err('class', 'must be one of ' + CLASSES.join(', ') + ' (see FORMAT.md: size classes)');
  // livery
  const L = spec.livery;
  if (!L || typeof L !== 'object') err('livery', 'needs { "good": { "body": "#rrggbb" }, "evil": { "body": "#rrggbb" } }');
  else for (const side of ['good', 'evil']) {
    if (!L[side] || typeof L[side] !== 'object') { err('livery.' + side, 'missing: { "body": "#rrggbb", "accent"?: "#rrggbb" }'); continue; }
    if (!colour(L[side].body)) err('livery.' + side + '.body', 'must be a colour "#rrggbb"');
    if (L[side].accent !== undefined && !colour(L[side].accent)) err('livery.' + side + '.accent', 'must be a colour "#rrggbb"');
    known(L[side], ['body', 'accent'], 'livery.' + side);
  }
  const customs = spec.colors || {};
  for (const [k, v] of Object.entries(customs)) {
    if (k.startsWith('//')) continue;
    if (!/^[a-z][a-z0-9-]*$/.test(k)) err('colors.' + k, 'a colour name is lower-case letters, digits and dashes');
    if (!(colour(v) || (v && typeof v === 'object' && colour(v.good) && (v.evil === undefined || colour(v.evil))))) err('colors.' + k, 'must be "#rrggbb" or { "good": "#rrggbb", "evil": "#rrggbb" }');
  }
  const roleOk = (r) => (typeof r === 'string' && (ROLES[r] || (r.startsWith('paint:') && customs[r.slice(6)] !== undefined)));
  // groups
  const groupNames = new Set();
  for (const [i, g] of (spec.groups || []).entries()) {
    const where = 'groups[' + i + ']';
    if (typeof g.name !== 'string') err(where, 'needs a name');
    else if (groupNames.has(g.name)) err(where, 'two groups are called "' + g.name + '"');
    else groupNames.add(g.name);
    if (g.pivot !== undefined && !vec(g.pivot, 3)) err(where + ' "' + g.name + '"', 'pivot must be [x, y, z] in metres');
    known(g, ['name', 'pivot', 'parent'], where);
  }
  for (const g of spec.groups || []) if (g.parent && !groupNames.has(g.parent)) err('groups "' + g.name + '"', 'parent "' + g.parent + '" is not a group');
  // parts
  if (!Array.isArray(spec.parts) || !spec.parts.length) err('parts', 'must be a list of parts (the body, glass, lamps...)');
  const partNames = new Set();
  for (const [i, p] of (spec.parts || []).entries()) {
    const where = 'parts[' + i + ']' + (p && p.name ? ' "' + p.name + '"' : '');
    if (!p || typeof p !== 'object') { err(where, 'must be an object'); continue; }
    if (typeof p.name !== 'string' || !p.name.trim()) err(where, 'needs a name (unique, e.g. "bonnet", "headlamp")');
    else if (partNames.has(p.name)) err(where, 'the name is used twice: every part needs its own name');
    else partNames.add(p.name);
    if (!roleOk(p.role)) err(where, 'role "' + p.role + '" is not one of ' + Object.keys(ROLES).join(', ') + ' or "paint:<a name in colors>"');
    if (p.role === 'tyre') err(where, 'role "tyre" is only for wheels: describe wheels in "wheels", not as parts');
    if (!SHAPES.includes(p.shape)) { err(where, 'shape must be one of ' + SHAPES.join(', ')); continue; }
    if (p.at !== undefined && !vec(p.at, 3)) err(where, 'at must be [x, y, z] in metres (x across, +x = the car\'s left; y up; z forward)');
    if (p.rot !== undefined && !vec(p.rot, 3)) err(where, 'rot must be [x, y, z] in DEGREES (applied in that order)');
    if (p.scale !== undefined && !(vec(p.scale, 3) && p.scale.every(s => Math.abs(s) > 1e-3))) err(where, 'scale must be [sx, sy, sz], none zero');
    if (p.mirror !== undefined && typeof p.mirror !== 'boolean') err(where, 'mirror must be true or false');
    if (p.mirror && p.at && Math.abs(p.at[0]) < 0.005 && p.shape !== 'panel') warn(where, 'mirrored but centred on x = 0: the two copies lie on top of each other (z-fighting); move it off the centre line or drop mirror');
    if (p.group !== undefined && !groupNames.has(p.group)) err(where, 'group "' + p.group + '" is not in "groups"');
    if (p.prop !== undefined && !PROP_SLOTS.includes(p.prop)) err(where, 'prop must be one of ' + PROP_SLOTS.join(', ') + ' (a decorative item a cosmetic can replace)');
    const tags = [...Object.keys(GLASS_TAGS), ...LAMP_TAGS, ...OTHER_TAGS];
    if (p.tag !== undefined && !tags.includes(p.tag)) err(where, 'tag "' + p.tag + '" is not one of ' + tags.join(', '));
    if (p.role === 'glass' && !GLASS_TAGS[p.tag]) err(where, 'a glass part needs a tag: windscreen, rear-window, side-window or roof-window');
    if (GLASS_TAGS[p.tag] && p.role !== 'glass') err(where, 'tag "' + p.tag + '" is for glass: give it role "glass"');
    const lampRole = { headlight: 'light-front', taillight: 'light-rear', 'brake-light': ['light-brake', 'light-rear'], indicator: ['light-indicator', 'light-rear'], 'reverse-light': 'light-reverse' }[p.tag];
    if (lampRole && ![].concat(lampRole).includes(p.role)) err(where, 'tag "' + p.tag + '" wants role ' + [].concat(lampRole).join(' or '));
    if (p.smooth !== undefined && typeof p.smooth !== 'boolean') err(where, 'smooth must be true or false');
    const axisOk = (a) => a === undefined || a === 'x' || a === 'y' || a === 'z';
    switch (p.shape) {
      case 'box': if (!(vec(p.size, 3) && p.size.every(pos))) err(where, 'box needs size [w, h, l] (across, up, along), all > 0'); break;
      case 'wedge':
        if (!(vec(p.size, 3) && p.size.every(pos))) err(where, 'wedge needs size [w, h, l], all > 0');
        for (const k of ['front', 'back', 'topWidth']) if (p[k] !== undefined && !(num(p[k]) && p[k] >= 0 && p[k] <= 1.5)) err(where, k + ' must be a share 0 to 1.5');
        if ((p.front ?? 1) === 0 && (p.back ?? 1) === 0) err(where, 'front and back both 0: the wedge is flat');
        break;
      case 'cylinder':
        if (!(pos(p.radius) || (vec(p.radii, 2) && p.radii.every(r => num(r) && r >= 0) && p.radii.some(pos)))) err(where, 'cylinder needs radius (m) or radii [r at the -axis end, r at the +axis end]');
        if (!pos(p.length)) err(where, 'cylinder needs length (m) along its axis');
        if (!axisOk(p.axis)) err(where, 'axis must be "x" (across), "y" (up) or "z" (along)');
        break;
      case 'cone':
        if (!pos(p.radius) || !pos(p.length)) err(where, 'cone needs radius and length (its tip at the +axis end)');
        if (!axisOk(p.axis)) err(where, 'axis must be "x", "y" or "z"');
        break;
      case 'sphere':
        if (!(pos(p.radius) || (vec(p.radii, 3) && p.radii.every(pos)))) err(where, 'sphere needs radius or radii [rx, ry, rz]');
        if (p.segments !== undefined && !(vec(p.segments, 2) && p.segments[0] >= 4 && p.segments[1] >= 2)) err(where, 'segments must be [around >= 4, down >= 2]');
        break;
      case 'lathe':
        if (!(Array.isArray(p.profile) && p.profile.length >= 2 && p.profile.every(q => vec(q, 2) && q[0] >= 0))) err(where, 'lathe needs profile [[radius, height], ...] (2 or more points, radius >= 0) turned about its axis');
        if (!axisOk(p.axis)) err(where, 'axis must be "x", "y" or "z"');
        break;
      case 'extrude': {
        if (!pos(p.width)) err(where, 'extrude needs width (m across the car)');
        const ok = Array.isArray(p.profile) && p.profile.length >= 3 && p.profile.every(q => Array.isArray(q) && (q.length === 2 || q.length === 3) && q.every(num));
        if (!ok) { err(where, 'extrude needs profile [[z, y], ...] or [[z, y, cornerRadius], ...]: the SIDE VIEW outline, 3 or more points in order round it'); break; }
        for (let k = 0; k < p.profile.length; k++) {
          const a = p.profile[k], b = p.profile[(k + 1) % p.profile.length];
          if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.002) err(where, 'profile points ' + k + ' and ' + ((k + 1) % p.profile.length) + ' are the same point: remove one');
        }
        if (selfCrosses(p.profile)) err(where, 'the profile crosses itself: list the points in order round the outline');
        if (p.bevel !== undefined && !(num(p.bevel) && p.bevel >= 0 && p.bevel < p.width / 2)) err(where, 'bevel must be >= 0 and under half the width');
        if (p.tumblehome !== undefined && !(num(p.tumblehome) && p.tumblehome >= 0 && p.tumblehome < 0.6)) err(where, 'tumblehome must be a number 0 to 0.6: how much narrower the top is than the bottom (0.15 = 15%), linearly');
        break;
      }
      case 'loft': {
        const S = p.sections;
        if (!(Array.isArray(S) && S.length >= 2)) { err(where, 'loft needs sections: 2 or more cross-sections along z'); break; }
        const kinds = new Set(S.map(s => (s && s.half ? 'half' : 'box')));
        if (kinds.size > 1) err(where, 'loft sections must all be the same kind: all { z, w, y0, y1 ... } or all { z, half: [...] }');
        let count = null;
        S.forEach((s, k) => {
          const w2 = where + ' section ' + k;
          if (!s || !num(s.z)) { err(w2, 'needs z (m along the car)'); return; }
          if (s.half) {
            const h = s.half;
            if (!(Array.isArray(h) && h.length >= 3 && h.every(q => vec(q, 2)))) { err(w2, 'half must be [[x, y], ...]: the +x half of the cross-section from the bottom middle (x = 0) up round to the top middle (x = 0)'); return; }
            if (Math.abs(h[0][0]) > 1e-6 || Math.abs(h[h.length - 1][0]) > 1e-6) err(w2, 'half must start and end on the centre line (x = 0)');
            if (h.some(q => q[0] < -1e-6)) err(w2, 'half points must have x >= 0 (the +x side; the -x side is mirrored)');
            if (count !== null && count !== h.length) err(w2, 'has ' + h.length + ' points; every section of a loft needs the same number (' + count + ')');
            count ??= h.length;
          } else {
            if (!pos(s.w) || !num(s.y0) || !num(s.y1) || s.y1 - s.y0 < 0.01) err(w2, 'needs w (width > 0), y0 (bottom) and y1 (top, above y0)');
            for (const k2 of ['topW', 'r', 'rTop', 'rBottom', 'x']) if (s[k2] !== undefined && !num(s[k2])) err(w2, k2 + ' must be a number');
            if (s.w < 0.02) err(w2, 'w under 2 cm: a loft cannot close to a point (end on a small section instead)');
          }
        });
        const zs = S.map(s => s?.z).filter(num);
        if (new Set(zs).size !== zs.length) err(where, 'two sections share a z: each section needs its own z');
        break;
      }
      case 'panel': {
        const two = p.plane === 'x';
        if (p.plane !== undefined && p.plane !== 'x') err(where, 'plane may only be "x" (points given as [z, y] on the flank at x = offset)');
        if (!(Array.isArray(p.points) && p.points.length >= 3 && p.points.length <= 16 && p.points.every(q => vec(q, two ? 2 : 3)))) err(where, 'panel needs points: 3 to 16 ' + (two ? '[z, y]' : '[x, y, z]') + ' in order round a flat CONVEX outline');
        if (p.thickness !== undefined && !(num(p.thickness) && p.thickness >= 0)) err(where, 'thickness must be >= 0 (0: a single sheet, for glass)');
        if (!(p.thickness > 0) && p.role !== 'glass' && p.role !== 'plate') warn(where, 'a single-sheet panel that is not glass is an open surface: give it a thickness');
        break;
      }
    }
    known(p, ['name', 'role', 'shape', 'at', 'rot', 'scale', 'mirror', 'group', 'tag', 'prop', 'smooth', 'size', 'front', 'back', 'topWidth', 'radius', 'radii', 'length', 'axis', 'segments', 'profile', 'width', 'bevel', 'curveSegments', 'tumblehome', 'sections', 'cornerSegments', 'points', 'plane', 'offset', 'thickness', 'dome', 'asymmetric', 'note'], where);
  }
  // expanded names unique (a mirrored "lamp" is "lamp L" and "lamp R")
  const expanded = expandParts(spec), seen = new Set();
  for (const e of expanded) { if (seen.has(e.name)) err('parts "' + e.name + '"', 'two parts end up with this name (a mirrored part adds " L" / " R")'); seen.add(e.name); }
  // wheels
  if (!Array.isArray(spec.wheels) || !spec.wheels.length) err('wheels', 'must list the wheels: [{ "at": [x, z], "radius": r, "width": w, "mirror": true }, ...]');
  for (const [i, w] of (spec.wheels || []).entries()) {
    const where = 'wheels[' + i + ']';
    if (!(vec(w.at, 2) || vec(w.at, 3))) err(where, 'at must be [x, z] (sitting on the ground) or [x, y, z] (the axle centre)');
    if (!pos(w.radius) || w.radius > 1) err(where, 'radius (m) must be > 0 and at most 1');
    if (!pos(w.width) || w.width > 1) err(where, 'width (m) must be > 0 and at most 1');
    if (w.hub !== undefined && !(num(w.hub) && w.hub > 0 && w.hub < 0.95)) err(where, 'hub is a share of the radius, 0 to 0.95 (default 0.55)');
    if (w.hubRole !== undefined && !roleOk(w.hubRole)) err(where, 'hubRole must be a role (default "rim")');
    if (w.axis !== undefined && w.axis !== 'x') err(where, 'axis (the spin axis) must be "x": road wheels turn about the axle across the car');
    if (w.segments !== undefined && !(Number.isInteger(w.segments) && w.segments >= 8 && w.segments <= 32)) err(where, 'segments must be a whole number 8 to 32 (16 is usual)');
    known(w, ['name', 'at', 'radius', 'width', 'hub', 'hubRole', 'axis', 'segments', 'mirror', 'note'], where);
  }
  if (Array.isArray(spec.wheels) && spec.wheels.every(w => w && (vec(w.at, 2) || vec(w.at, 3)))) {
    const n = expandWheels(spec).length;
    if (n < 4) err('wheels', n + ' wheel(s): a car needs 4 or more (use "mirror": true for a left / right pair)');
  }
  // required parts
  const P = expanded.map(e => e.part);
  if (!P.some(p => p.role === 'body')) err('parts', 'no part has role "body": the paint must go somewhere');
  if (!spec.noWindscreen && !P.some(p => p.tag === 'windscreen')) err('parts', 'no windscreen: tag the front glass "windscreen" (an open car says "noWindscreen": "why")');
  if (!P.some(p => p.tag === 'headlight')) err('parts', 'no headlights: tag the front lamp lenses "headlight" (role light-front)');
  if (!P.some(p => p.tag === 'taillight' || p.tag === 'brake-light')) err('parts', 'no tail lamps: tag the rear lamp lenses "taillight" or "brake-light" (role light-rear / light-brake)');
  if (!P.some(p => p.tag === 'side-window') && !spec.noWindscreen) warn('parts', 'no side windows tagged "side-window"');
  // animation
  const targets = new Set([...groupNames, ...partNames, ...expanded.map(e => e.name), 'shell']);
  for (const [i, a] of (spec.animate || []).entries()) {
    const where = 'animate[' + i + ']';
    if (!targets.has(a.target)) err(where, 'target "' + a.target + '" is not a group, a part or "shell"');
    if (!ANIM_TYPES.includes(a.type)) err(where, 'type must be one of ' + ANIM_TYPES.join(', '));
    if (a.axis !== undefined && !['x', 'y', 'z'].includes(a.axis)) err(where, 'axis must be "x", "y" or "z"');
    for (const k of ['speed', 'amount']) if (a[k] !== undefined && !num(a[k])) err(where, k + ' must be a number');
    known(a, ['target', 'type', 'axis', 'speed', 'amount', 'note'], where);
  }
  // mounts: roof, cargo and wing are REQUIRED (an area, or { "none": "why" }); plates optional; decals a list
  const M = spec.mounts;
  if (!M || typeof M !== 'object') err('mounts', 'required: { "roof": {...}, "cargo": {...} or { "none": "why" }, "wing": {...}, "decals": [...] } (see FORMAT.md: mounts)');
  else {
    known(M, [...MOUNT_SLOTS, 'decals'], 'mounts');
    const area = (m, where, kind) => {
      if (!m || typeof m !== 'object') { err(where, 'must be an object'); return; }
      if (m.none !== undefined) { if (typeof m.none !== 'string' || !m.none.trim()) err(where, '"none" must say why (a sentence)'); return; }
      if (!vec(m.at, 3)) err(where, 'needs at [x, y, z]: the middle of the area, ON the body surface');
      if (m.normal !== undefined && !(vec(m.normal, 3) && Math.hypot(...m.normal) > 0.5)) err(where, 'normal must be [nx, ny, nz]: the way the surface faces (out of the body)');
      if (!(vec(m.size, 2) && m.size.every(pos))) err(where, kind === 'decal' ? 'needs size [length along the car, height] (m)' : kind === 'plate' ? 'needs size [width, height] (m)' : 'needs size [width across, length along] of the free flat area (m)');
      if (kind === 'prop' && !pos(m.height)) err(where, 'needs height: the free height (m) above the area, so a prop placed there touches nothing');
      if (m.surface !== undefined && !partNames.has(m.surface) && !expanded.some(e => e.name === m.surface)) err(where, 'surface "' + m.surface + '" is not a part name');
      if (kind === 'decal' && m.side !== undefined && !['both', 'left', 'right', 'center'].includes(m.side)) err(where, 'side must be "both" (at is the +x / left one, mirrored), "left", "right" or "center" (one area across the middle: a bonnet, a roof, a tailgate)');
      if (kind === 'decal' && (m.side === 'both' || (m.side === undefined && vec(m.at, 3) && Math.abs(m.at[0]) >= 0.01)) && vec(m.at, 3) && Math.abs(m.at[0]) < 0.05) err(where, 'side "both" mirrors the area to -x, but it is on the centre line: use side "center"');
      if (kind === 'decal' && typeof m.name !== 'string') err(where, 'needs a name ("door", "quarter", "fender", "bonnet"...)');
      if (kind === 'decal' && m.u !== undefined && !(vec(m.u, 3) && Math.hypot(...m.u) > 0.5)) err(where, 'u must be [ux, uy, uz]: the direction of the decal\'s width');
      for (const k of ['maxCurve', 'maxDepth']) if (m[k] !== undefined && !(num(m[k]) && m[k] >= 0)) err(where, k + ' must be a number >= 0');
      known(m, ['at', 'normal', 'size', 'height', 'surface', 'none', 'note', 'side', 'name', 'u', 'maxCurve', 'maxDepth'], where);
    };
    for (const k of ['roof', 'cargo', 'wing']) {
      if (M[k] === undefined) err('mounts.' + k, 'required: the ' + k + ' area ({ "at", "size", "height", "surface" }) or { "none": "why" }');
      else area(M[k], 'mounts.' + k, 'prop');
    }
    for (const k of ['plate-front', 'plate-rear']) if (M[k] !== undefined) area(M[k], 'mounts.' + k, 'plate');
    if (M.decals !== undefined) {
      if (!Array.isArray(M.decals)) err('mounts.decals', 'must be a list of decal areas');
      else M.decals.forEach((d, i) => area(d, 'mounts.decals[' + i + ']', 'decal'));
    }
  }
  return { errors, warnings };
};

// does a closed polyline ([[a, b], ...]) cross itself (any two non-neighbouring edges intersect)?
const selfCrosses = (pts) => {
  const n = pts.length, P = pts.map(q => [q[0], q[1]]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    const a = P[i], b = P[(i + 1) % n], c = P[j], d = P[(j + 1) % n];
    const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
    if (((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9))) return true;
  }
  return false;
};
