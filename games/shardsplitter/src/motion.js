import { piecePlaces } from "./layout.js";

export const IMPACT_MS = 180;
export const SWING_MS = 460;
export const SPLIT_MS = 450;
export const CHEER_MS = 450;
export const LEAVE_MS = 800;
export const ENTER_MS = 550;
export const TONGUE_MS = 900;
export const BELL_MS = 600;
export const FLYING_MOST = 12;

const REST = 0.7;
const WOUND = -0.1;
const DOWN = 1.8;
const STAGGER = 0.35;

const clamp = (value) => Math.min(1, Math.max(0, value));
const ease = (value) => 1 - (1 - clamp(value)) ** 3;
const mix = (from, to, amount) => from + (to - from) * amount;

function standing(field, { value, count, cap }, mood) {
  return piecePlaces(field, count).map((place) => ({ ...place, value, cap, mood }));
}

function splitting(field, round, now) {
  const { split, stand } = round;
  const amount = ease((now - split.start) / SPLIT_MS);
  const parents = piecePlaces(field, split.from.count);
  const each = split.to.count / split.from.count;
  return piecePlaces(field, split.to.count).map((place, at) => {
    const from = parents[Math.floor(at / each)];
    return { x: mix(from.x, place.x, amount), y: mix(from.y, place.y, amount), size: mix(from.size * 0.7, place.size, amount), value: split.to.value, cap: stand.cap, mood: "giggle" };
  });
}

function flying(field, jar, leave, now) {
  const shown = Math.min(leave.count, FLYING_MOST);
  const starts = piecePlaces(field, leave.parents);
  const whole = (now - leave.start) / LEAVE_MS;
  return Array.from({ length: shown }, (_, at) => {
    const from = starts[at % starts.length];
    const amount = ease((whole - (at / shown) * STAGGER) / (1 - STAGGER));
    const lift = Math.sin(amount * Math.PI) * from.size * 0.6;
    const size = mix(leave.ones ? from.size * 0.5 : from.size, jar.size * 0.4, amount);
    return { x: mix(from.x, jar.x, amount), y: mix(from.y, jar.y, amount) - lift, size, value: leave.value, shard: leave.ones, angle: amount * (at % 2 ? 2 : -2) };
  });
}

function entering(field, round, now) {
  const amount = ease((now - round.enter.start) / ENTER_MS);
  return standing(field, round.stand, "rolling").map((piece) => ({ ...piece, x: mix(field.x + field.w + piece.size, piece.x, amount) }));
}

export function sceneAt(round, field, jar, now) {
  const { stand, split, leave, enter } = round;
  if (leave && now >= leave.start) return { pieces: [], flying: now < leave.start + LEAVE_MS ? flying(field, jar, leave, now) : [] };
  if (!stand) return { pieces: [], flying: [] };
  if (split && now < split.start) return { pieces: standing(field, { ...split.from, cap: stand.cap }, "waiting"), flying: [] };
  if (split && now < split.start + SPLIT_MS) return { pieces: splitting(field, round, now), flying: [] };
  if (enter && now < enter.start + ENTER_MS) return { pieces: entering(field, round, now), flying: [] };
  const mood = now < round.tongueUntil ? "tongue" : split && now < split.start + SPLIT_MS + CHEER_MS ? "giggle" : "waiting";
  return { pieces: standing(field, stand, mood), flying: [] };
}

export const MALLET_REST = REST;

export function malletAt(swing, now) {
  const since = swing ? now - swing.start : SWING_MS + 1;
  if (since < 0 || since > SWING_MS) return { angle: REST, pose: "idle" };
  if (since < IMPACT_MS * 0.6) return { angle: mix(REST, WOUND, ease(since / (IMPACT_MS * 0.6))), pose: "idle" };
  if (since <= IMPACT_MS) return { angle: mix(WOUND, DOWN, (since - IMPACT_MS * 0.6) / (IMPACT_MS * 0.4)), pose: "idle" };
  const back = (since - IMPACT_MS) / (SWING_MS - IMPACT_MS);
  if (swing.miss) return { angle: mix(DOWN, WOUND, ease(back * 2.2)), pose: "lose" };
  return { angle: mix(DOWN, REST, ease(back)), pose: "idle" };
}
