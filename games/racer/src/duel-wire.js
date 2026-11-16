import { seal, fromBase64, PROTOCOL, KV, isId } from '../../../kit/src/envelope.js';
import { VEHICLE_KINDS, VEHICLE_COLORS } from './art.js';

export const DUEL = { g: 'racer', gv: 1 };

const PLATEAU_LEVEL = 6;
const SCENERIES = 4;
const LIMITS = { distance: 5000, side: 5, speed: 60 };
const COLORS = VEHICLE_COLORS.map((entry) => entry.id);

const vehicleKind = (kind) => (VEHICLE_KINDS.includes(kind) ? kind : 'car');
const colorId = (color) => (COLORS.includes(color) ? color : COLORS[0]);
const level = (value) => (Number.isInteger(value) && value > 0 && value < 10000 ? value : 1);
const within = (value, low, high) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;

function read(data) {
  if (typeof data !== 'string' || data.length > 4096) return null;
  try {
    const message = JSON.parse(new TextDecoder().decode(fromBase64(data)));
    return message && typeof message === 'object' && !Array.isArray(message) && message.p === PROTOCOL && message.g === DUEL.g ? message : null;
  } catch {
    return null;
  }
}

export function kindOf(data) {
  return read(data)?.k ?? null;
}

export function sealAbout({ doc, who, best, kind, color }) {
  return seal({ p: PROTOCOL, kv: KV, g: DUEL.g, gv: DUEL.gv, k: 'about', doc, who, best, kind, color });
}

export function openAbout(data) {
  const message = read(data);
  if (!message || message.gv !== DUEL.gv || message.k !== 'about' || !isId(message.doc) || !isId(message.who)) return null;
  return { doc: message.doc, who: message.who, best: level(message.best), kind: vehicleKind(message.kind), color: colorId(message.color) };
}

export function checkState(state) {
  if (!state || typeof state !== 'object') return null;
  const { d, x, v } = state;
  if (!within(d, 0, LIMITS.distance) || !within(x, -LIMITS.side, LIMITS.side) || !within(v, 0, LIMITS.speed)) return null;
  return { d, x, v, k: vehicleKind(state.k), c: colorId(state.c), b: state.b === 1 ? 1 : 0 };
}

export function duelLevel({ mine, theirs, seed }) {
  const lower = Math.min(level(mine), level(theirs));
  return lower < PLATEAU_LEVEL ? lower : PLATEAU_LEVEL + (seed % SCENERIES);
}

export function seedOf(id) {
  let hash = 2166136261;
  for (const char of String(id)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return (hash % 2147483646) + 1;
}
