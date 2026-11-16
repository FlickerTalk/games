import { DAY_THEME, SCENERIES } from './art.js';

export function sceneryFor(level) {
  return SCENERIES[(Math.max(1, level) - 1) % SCENERIES.length];
}

export function groundColor(scenery, ground = DAY_THEME.ground) {
  return ground[scenery];
}
