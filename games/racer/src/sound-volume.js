export const DEFAULT_VOLUME = 1;
const LOW_BELOW = 0.5;

const onLine = (position) => (Number.isFinite(position) ? Math.min(1, Math.max(0, position)) : 0);

export function volumeGain(position) {
  return onLine(position) ** 2;
}

export function normalizeVolume(value) {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : DEFAULT_VOLUME;
}

export function volumeIcon(position) {
  if (onLine(position) === 0) return 'off';
  return position < LOW_BELOW ? 'low' : 'high';
}
