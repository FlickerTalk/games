export function targetZoom({ lookAheadPx, scale, speed, minSeconds }) {
  if (speed <= 0) return 1;
  const visibleUnits = lookAheadPx / scale;
  return Math.min(1, visibleUnits / (minSeconds * speed));
}

export function nextZoom(current, target, dt, zoomInPerSecond) {
  if (target <= current) return target;
  return Math.min(target, current + zoomInPerSecond * dt);
}
