export const EMPTY_BONUS = 50;

export const linePoints = (lines) => (10 * lines * (lines + 1)) / 2;

export function pointsFor({ tiles, lines, emptied }) {
  return tiles + linePoints(lines) + (emptied ? EMPTY_BONUS : 0);
}
