import { VEHICLE_KINDS, VEHICLE_COLORS } from './art.js';

export const STARTER_KINDS = Object.freeze(VEHICLE_KINDS.slice(0, 5));

const GIFT = { fewestWins: 2, mostWins: 4, chance: 0.5 };
const COLORS = VEHICLE_COLORS.map((entry) => entry.id);

const known = (kinds) => (Array.isArray(kinds) ? kinds : []).filter((kind) => VEHICLE_KINDS.includes(kind));

export function normalizeProfile(raw) {
  const given = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const received = VEHICLE_KINDS.filter((kind) => STARTER_KINDS.includes(kind) || known(given.received).includes(kind));
  const wins = Math.floor(Number(given.winsSinceGift));
  const top = Math.floor(Number(given.topLevel));
  return {
    kind: received.includes(given.kind) ? given.kind : 'car',
    color: COLORS.includes(given.color) ? given.color : COLORS[0],
    received,
    winsSinceGift: Number.isFinite(wins) && wins > 0 ? wins : 0,
    topLevel: Number.isFinite(top) && top > 1 ? top : 1,
  };
}

export function noteLevel(profile, level) {
  if (level <= profile.topLevel) return false;
  profile.topLevel = level;
  return true;
}

export function chooseVehicle(profile, kind) {
  if (!profile.received.includes(kind)) return false;
  profile.kind = kind;
  return true;
}

export function chooseColor(profile, color) {
  if (!COLORS.includes(color)) return false;
  profile.color = color;
  return true;
}

export function awardWin(profile, random) {
  const waiting = VEHICLE_KINDS.filter((kind) => !profile.received.includes(kind));
  if (waiting.length === 0) return null;
  profile.winsSinceGift += 1;
  const due = profile.winsSinceGift >= GIFT.mostWins
    || (profile.winsSinceGift >= GIFT.fewestWins && random.chance(GIFT.chance));
  if (!due) return null;
  const gift = random.pick(waiting);
  profile.received = VEHICLE_KINDS.filter((kind) => kind === gift || profile.received.includes(kind));
  profile.kind = gift;
  profile.winsSinceGift = 0;
  return gift;
}
