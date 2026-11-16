import { ease } from "../../../kit/src/canvas/pen.js";
import { SPRING_JUMP, diceFor, hop, startRace } from "./rules.js";
import { fromBase64url, toBase64url } from "./sha256.js";

// ms
export const TIMES = Object.freeze({ choose: 260, hop: 250, spring: 520, special: 450, bump: 420, rest: 320, roll: 520, think: 900 });

const KEY_BYTES = 48;
const LOCAL = ["flick", "pair"];
const LANDING = { spring: "spring", turbo: "turbo", puddle: "puddle", finish: "finish" };

export function freshRound({ kind, key = null, me = 0, now = 0 }) {
  return { kind, key, me, race: startRace(), dice: key ? diceFor(key, 0) : null, rolledAt: now, move: null, queue: [], picks: [] };
}

export function stagesOf(event) {
  const hops = event.landed - event.from;
  const hopped = TIMES.choose + hops * TIMES.hop;
  const special = hopped + (event.kind === "spring" ? TIMES.spring : event.kind === "plain" ? 0 : TIMES.special);
  const bumped = special + (event.bumped ? TIMES.bump : 0);
  return { hops, hopped, special, bumped, end: bumped + TIMES.rest };
}

function cuesOf(event, stages) {
  const cues = [{ at: 0, name: "pick" }];
  for (let n = 1; n <= stages.hops; n += 1) cues.push({ at: TIMES.choose + n * TIMES.hop, name: "hop", n });
  if (LANDING[event.kind]) cues.push({ at: stages.hopped, name: LANDING[event.kind] });
  if (event.bumped) cues.push({ at: stages.special, name: "bump" });
  return cues;
}

function begin(round, pick, now) {
  const { race, event } = hop(round.race, round.dice[pick]);
  const stages = stagesOf(event);
  round.move = { pick, event, after: race, start: Math.max(now, round.rolledAt + TIMES.roll), stages, cues: cuesOf(event, stages), told: 0 };
}

export function setKey(round, key, now) {
  round.key = key;
  round.dice = round.race.winner === null ? diceFor(key, round.race.turn) : null;
  round.rolledAt = now;
}

export function choose(round, pick, now) {
  round.picks.push(pick);
  if (round.move || round.queue.length) round.queue.push(pick);
  else begin(round, pick, now);
}

function land(round, race, now) {
  round.race = race;
  round.dice = race.winner === null ? diceFor(round.key, race.turn) : null;
  round.rolledAt = now;
}

export function replay(round, picks, now = 0) {
  for (const pick of picks) {
    land(round, hop(round.race, round.dice[pick]).race, now);
    round.picks.push(pick);
  }
}

export function advance(round, now) {
  const { move } = round;
  if (!move) return [];
  const t = now - move.start;
  const cues = [];
  while (move.told < move.cues.length && move.cues[move.told].at <= t) cues.push(move.cues[move.told++]);
  if (t < move.stages.end) return cues;
  const over = move.start + move.stages.end;
  round.move = null;
  land(round, move.after, over);
  if (round.dice) cues.push({ at: move.stages.end, name: "roll" });
  if (round.queue.length && round.dice) begin(round, round.queue.shift(), over);
  return cues;
}

export const turnOf = (round) => (round.move ? round.move.event.side : round.race.next);

const playing = (round, now) => (round.move && now >= round.move.start ? round.move : null);

export function canPick(round, now) {
  return !round.move && !round.queue.length && Boolean(round.dice) && round.race.winner === null && now >= round.rolledAt + TIMES.roll;
}

export function diceShown(round, now) {
  const side = turnOf(round);
  if (!round.dice) return { faces: null, state: "waiting", side, chosen: null };
  const move = playing(round, now);
  if (move) return { faces: round.dice, state: "chosen", side, chosen: move.pick };
  return { faces: round.dice, state: now < round.rolledAt + TIMES.roll ? "rolling" : "ready", side, chosen: null };
}

function moverSpot({ event, stages }, t) {
  if (t < TIMES.choose) return { square: event.from, lift: 0, state: "ready" };
  if (t < stages.hopped) {
    const hops = (t - TIMES.choose) / TIMES.hop;
    const part = hops - Math.floor(hops);
    return { square: event.from + Math.floor(hops) + ease(part), lift: Math.sin(part * Math.PI), state: "hop" };
  }
  if (event.kind === "spring" && t < stages.special) {
    const part = (t - stages.hopped) / TIMES.spring;
    return { square: event.landed + SPRING_JUMP * ease(part), lift: Math.sin(part * Math.PI) * 1.8, state: "hop" };
  }
  const state = event.won ? "cheer" : event.kind === "puddle" ? "wet" : event.bumped && t >= stages.special ? "laugh" : "idle";
  return { square: event.to, lift: 0, state };
}

function otherSpot({ event, stages }, t, square) {
  if (!event.bumped || t < stages.special) return { square, lift: 0, state: "idle" };
  if (t >= stages.bumped) return { square: event.bumped.to, lift: 0, state: "bumped" };
  const part = (t - stages.special) / TIMES.bump;
  return { square: event.bumped.from - ease(part), lift: Math.sin(part * Math.PI) * 0.4, state: "bumped" };
}

export function spotsOf(round, now) {
  const move = playing(round, now);
  return [0, 1].map((side) => {
    if (!move) return { square: round.race.at[side], lift: 0, state: round.race.winner === side ? "cheer" : "idle" };
    const t = now - move.start;
    return side === move.event.side ? moverSpot(move, t) : otherSpot(move, t, round.race.at[side]);
  });
}

export function trailOf(round, now) {
  const move = playing(round, now);
  if (!move) return null;
  const { event } = move;
  const done = Math.min(event.landed - event.from, Math.floor((now - move.start - TIMES.choose) / TIMES.hop) + 1);
  if (done < 1) return null;
  const lit = Array.from({ length: done }, (_, at) => event.from + at + 1);
  return { side: event.side, lit, active: lit.at(-1) };
}

export function savedRound(round) {
  return JSON.stringify({ v: 1, kind: round.kind, key: toBase64url(round.key), picks: round.picks.join("") });
}

export function keptRound(kept, now = 0) {
  if (kept?.v !== 1 || !LOCAL.includes(kept.kind) || typeof kept.picks !== "string" || !/^[01]*$/.test(kept.picks)) return null;
  const key = fromBase64url(kept.key);
  if (!key || key.length !== KEY_BYTES) return null;
  const round = freshRound({ kind: kept.kind, key, now });
  for (const pick of kept.picks) {
    if (round.race.winner !== null) return null;
    replay(round, [Number(pick)], now);
  }
  return round.race.winner === null ? round : null;
}
