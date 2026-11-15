import { isPlain } from "./curve.js";
import { ownedLooks } from "./gifts.js";

export const PROGRESS_KEY = "progress";
export const RECORD_VERSION = 1;
export const PASS_AFTER_LOSSES = 3;

const MOST = Number.MAX_SAFE_INTEGER;

const whole = (value, least, most) => (Number.isFinite(value) && value >= least && value < most + 1 ? Math.floor(value) : least);

export function freshRecord({ gifts }) {
  return { v: RECORD_VERSION, level: 1, losses: 0, wins: 0, best: null, received: [], chosen: gifts ? gifts.looks[0] : null };
}

function parse(raw) {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readRecord(spec, raw) {
  const record = parse(raw);
  const fresh = freshRecord(spec);
  if (!isPlain(record) || record.v !== RECORD_VERSION) return fresh;
  const { gifts } = spec;
  const kept = Array.isArray(record.received) ? record.received : [];
  const received = gifts ? gifts.looks.slice(gifts.free).filter((look) => kept.includes(look)) : [];
  const owned = gifts ? ownedLooks(gifts, received) : [];
  return {
    v: RECORD_VERSION,
    level: whole(record.level, 1, MOST),
    losses: whole(record.losses, 0, PASS_AFTER_LOSSES - 1),
    wins: whole(record.wins, 0, MOST),
    best: Number.isFinite(record.best) ? record.best : null,
    received,
    chosen: owned.includes(record.chosen) ? record.chosen : fresh.chosen,
  };
}

export async function loadRecord(spec, store) {
  try {
    const raw = await store.get(PROGRESS_KEY);
    return readRecord(spec, typeof raw === "string" ? raw : null);
  } catch {
    return freshRecord(spec);
  }
}

export async function saveRecord(store, record) {
  try {
    return (await store.set(PROGRESS_KEY, JSON.stringify(record))) === true;
  } catch {
    return false;
  }
}
