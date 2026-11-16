import { candidatesFor, openGaps, startPuzzle } from "./puzzle.js";
import { decodeTrain, encodeTrain } from "./train.js";

export const ARRIVE_MS = 900;
export const FLY_MS = 340;
export const WOBBLE_MS = 450;
export const BACK_MS = 380;
export const TUNE_DELAY_MS = 350;
export const LEAVE_MS = 900;
export const END_MS = 300;
export const STRUGGLE = 2;
const KEPT = ["level", "friend"];

export const roundKey = (state) => `round/${state.chat ?? "-"}`;

export function setTrain(round, at, now) {
  const train = round.trains[at];
  Object.assign(round, {
    at,
    puzzle: startPuzzle(train),
    candidates: candidatesFor(train, `${round.seed}/${at}`, round.choices),
    struggle: 0,
    phase: "arrive",
    phaseAt: now,
    flying: null,
    back: null,
    fired: 0,
  });
  return round;
}

export function freshRound({ kind, trains, maker = null, driver = "me", seed = "", choices = 4, now = 0 }) {
  const round = { kind, trains, maker, driver, seed, choices, wrongs: 0, script: null, scriptAt: 0, finished: false };
  return setTrain(round, 0, now);
}

export function savedRound(round) {
  return JSON.stringify({ v: 1, kind: round.kind, codes: round.trains.map(encodeTrain), at: round.at, wrongs: round.wrongs, maker: round.maker, seed: round.seed, choices: round.choices });
}

export function keptRound(kept, now = 0) {
  if (kept?.v !== 1 || !KEPT.includes(kept.kind) || !Array.isArray(kept.codes) || !kept.codes.length) return null;
  const trains = kept.codes.map(decodeTrain);
  if (trains.some((train) => !train)) return null;
  const whole = (value, most) => (Number.isInteger(value) && value >= 0 ? Math.min(value, most) : 0);
  const round = freshRound({
    kind: kept.kind,
    trains,
    maker: ["flick", "friend"].includes(kept.maker) ? kept.maker : null,
    seed: typeof kept.seed === "string" ? kept.seed : "",
    choices: kept.choices === 3 ? 3 : 4,
    now,
  });
  round.wrongs = whole(kept.wrongs, 99);
  return setTrain(round, whole(kept.at, trains.length - 1), now);
}

export function hintOf(round, { taught }) {
  if (!round || round.driver !== "me" || round.phase !== "solve") return null;
  const struggling = round.struggle >= STRUGGLE;
  if (taught && !struggling) return null;
  const gap = openGaps(round.puzzle)[0];
  if (gap === undefined) return null;
  return { candidate: round.candidates.indexOf(round.puzzle.train.wagons[gap]), gap, shape: struggling };
}
