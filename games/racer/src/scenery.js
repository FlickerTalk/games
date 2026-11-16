import { PALETTE, SCENERIES } from './art.js';

const GROUND = { meadow: PALETTE.meadow, desert: PALETTE.desert, snow: PALETTE.snow, night: PALETTE.city };

export function sceneryFor(level) {
  return SCENERIES[(Math.max(1, level) - 1) % SCENERIES.length];
}

export function groundColor(scenery) {
  return GROUND[scenery];
}
