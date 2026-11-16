const clamp = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function progressOf(start, duration, now) {
  if (!(duration > 0)) return 1;
  return clamp((now - start) / duration);
}

export const easeInOut = (value) => 0.5 - Math.cos(clamp(value) * Math.PI) / 2;

export function along(points, progress, { hop = 0 } = {}) {
  if (points.length < 2) return { ...points[0], lift: 0, segment: 0, local: 1 };
  const legs = points.length - 1;
  const travelled = clamp(progress) * legs;
  const segment = Math.min(legs - 1, Math.floor(travelled));
  const local = travelled - segment;
  const [from, to] = [points[segment], points[segment + 1]];
  const height = typeof hop === "function" ? hop(segment) : hop;
  const lift = Math.sin(local * Math.PI) * height;
  return { x: from.x + (to.x - from.x) * local, y: from.y + (to.y - from.y) * local - lift, lift, segment, local };
}
