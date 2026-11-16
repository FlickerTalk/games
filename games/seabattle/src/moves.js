import { parseShip, shipCells } from "./rules.js";

export const SPLASH_MS = 520;
export const BURST_AT = 260;
export const BURST_MS = 700;
export const TIP_MS = 1800;
const CUE_AT = 90;
const CUES = { m: "splash", h: "tick", s: "success" };

const clamp = (value) => Math.min(1, Math.max(0, value));

function answersComing(before, after, me) {
  const they = 1 - me;
  const found = [];
  for (let at = before.answers[they].length; at < after.answers[they].length; at += 1) {
    const answer = after.answers[they][at];
    found.push({ sea: "theirs", cell: after.shots[me][at], kind: answer[0], ship: answer[0] === "s" ? parseShip(answer.slice(1)) : null });
  }
  return found;
}

function shotsComing(before, after, me, ships) {
  const they = 1 - me;
  const fired = new Set(after.shots[they]);
  return after.shots[they].slice(before.shots[they].length).map((cell) => {
    const ship = ships.find((one) => shipCells(one).includes(cell));
    if (!ship) return { sea: "mine", cell, kind: "m", ship: null };
    const down = shipCells(ship).every((one) => fired.has(one));
    return { sea: "mine", cell, kind: down ? "s" : "h", ship: down ? ship : null };
  });
}

export function planShots(before, after, me, ships) {
  if (!before || !after || me === null || me === undefined) return [];
  const they = 1 - me;
  if (after.shots[me].length < before.shots[me].length || after.shots[they].length < before.shots[they].length) return [];
  if (after.answers[they].length < before.answers[they].length) return [];
  return [...answersComing(before, after, me), ...(ships ? shotsComing(before, after, me, ships) : [])];
}

export function effectFrame({ kind }, elapsed) {
  const sunk = kind === "s";
  const burst = sunk && elapsed >= BURST_AT && elapsed < BURST_AT + BURST_MS ? (elapsed - BURST_AT) / BURST_MS : null;
  const end = sunk ? Math.max(TIP_MS, BURST_AT + BURST_MS) : SPLASH_MS;
  return { progress: clamp(elapsed / SPLASH_MS), burst, tipping: sunk ? clamp(elapsed / TIP_MS) : 1, done: elapsed >= end };
}

export function cuesBetween(effects, from, to) {
  if (!(from < CUE_AT && CUE_AT <= to)) return [];
  return effects.filter((effect) => effect.sea === "theirs").map((effect) => CUES[effect.kind]);
}
