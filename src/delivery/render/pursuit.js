// ---- THE POLICE PURSUIT, DRAWN (see ../pursuit.js): its two cars are traffic, drawn with the rest, so all there
// is here is their models (./pursuitModels.js), and the address-bar shortcut for a picture or a look:
//   &pursuit=3        a police pursuit set off 3 s into the run, on any level that can have one
//   &pursuitbehind=60 ...starting that far behind the player (not CONFIG.pursuit.behind)
import { Pursuit } from '../pursuit.js';
import './pursuitModels.js';

const params = new URLSearchParams(location.search);
if (params.get('pursuit') !== null) {
  Pursuit.force = { at: Number(params.get('pursuit')) || 0.1, behind: params.get('pursuitbehind') ? Number(params.get('pursuitbehind')) : undefined, anywhere: true };
}
