export const ROOM_CHROME = 297;
const FALLBACK_SCREEN = 853;
const LOWEST = 240;
const HIGHEST = 1000;
const TALLEST_PER_WIDTH = 4 / 3;

export function roomHeight({ screenHeight, width }) {
  const guess = (screenHeight || FALLBACK_SCREEN) - ROOM_CHROME;
  const tallest = width > 0 ? Math.floor(width * TALLEST_PER_WIDTH) : HIGHEST;
  return Math.round(Math.max(LOWEST, Math.min(guess, tallest, HIGHEST)));
}
