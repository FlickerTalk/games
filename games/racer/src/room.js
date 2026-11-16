import { ROOM_CHROME } from '../../../kit/src/stage.js';

const FALLBACK_SCREEN = 853;
const LOWEST = 300;
const HIGHEST = 1100;

export function roomHeight(screenHeight) {
  return Math.round(Math.min(HIGHEST, Math.max(LOWEST, (screenHeight || FALLBACK_SCREEN) - ROOM_CHROME)));
}
