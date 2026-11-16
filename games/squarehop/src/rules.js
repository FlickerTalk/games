import { sha256, utf8 } from "./sha256.js";

export const FINISH = 30;
export const SPRING_JUMP = 3;
export const SPECIALS = Object.freeze({ 6: "spring", 11: "turbo", 16: "puddle", 23: "spring", 27: "puddle" });
export const DICE_DOMAIN = "ftgames-dice-v1";

const ZERO = new Uint8Array([0]);
const FACES = 6;
const FAIR_BYTES = 252;

export const kindOf = (square) => (square === FINISH ? "finish" : (SPECIALS[square] ?? "plain"));

export const startRace = () => ({ at: [1, 1], wait: [false, false], next: 0, turn: 0, winner: null });

const u32 = (value) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
};

export function diceFor(key, turn) {
  const first = sha256(utf8(`${DICE_DOMAIN}/out`), ZERO, u32(turn), key);
  const faces = [];
  let block = first;
  for (let counter = 1; faces.length < 2; counter += 1) {
    for (const byte of block) {
      if (byte >= FAIR_BYTES) continue;
      const face = (byte % FACES) + 1;
      if (face === faces[0]) continue;
      faces.push(face);
      if (faces.length === 2) break;
    }
    block = sha256(first, u32(counter));
  }
  return faces;
}

function nextSide(side, wait, again) {
  if (again) return side;
  const other = 1 - side;
  if (!wait[other]) return other;
  wait[other] = false;
  if (!wait[side]) return side;
  wait[side] = false;
  return other;
}

export function hop(race, die) {
  if (race.winner !== null || !Number.isInteger(die) || die < 1 || die > FACES) return null;
  const side = race.next;
  const other = 1 - side;
  const from = race.at[side];
  const landed = Math.min(FINISH, from + die);
  const kind = kindOf(landed);
  const to = kind === "spring" ? landed + SPRING_JUMP : landed;
  const at = [...race.at];
  const wait = [...race.wait];
  at[side] = to;
  const won = to === FINISH;
  const bumped = !won && at[other] === to ? { side: other, from: to, to: to - 1 } : null;
  if (bumped) at[other] = bumped.to;
  if (kind === "puddle") wait[side] = true;
  const again = kind === "turbo";
  const sat = !won && !again && race.wait[other];
  const next = won ? side : nextSide(side, wait, again);
  return {
    race: { at, wait, next, turn: race.turn + 1, winner: won ? side : null },
    event: { side, die, from, landed, kind, to, bumped, again, sat, won },
  };
}
