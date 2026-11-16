import { randomOf } from "../../../kit/src/canvas/random.js";
import { BEATS, KINDS, WAGONS, beatsOf, gapsOf, kindOf, wagonOf } from "./train.js";

export const TRIES_MOST = 24;

const LETTERS = "abcdefghijklmnopqrstuvwx";
const TRIES = new RegExp(`^S[a-x]{1,${TRIES_MOST}}$`);

function shuffled(list, random) {
  const mixed = [...list];
  for (let at = mixed.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [mixed[at], mixed[other]] = [mixed[other], mixed[at]];
  }
  return mixed;
}

function tempting(train, answers, random) {
  const countsBeats = train.wagons.some((wagon) => beatsOf(wagon) > 1);
  const otherBeats = countsBeats ? answers.flatMap((wagon) => Array.from({ length: BEATS }, (_, at) => wagonOf(kindOf(wagon), at + 1))) : [];
  const beatsSeen = countsBeats ? [1, 2, 3] : [1];
  const sameTrain = train.wagons;
  const others = Array.from({ length: KINDS }, (_, kind) => wagonOf(kind, beatsSeen[Math.floor(random() * beatsSeen.length)]));
  return [...shuffled(otherBeats, random), ...shuffled(sameTrain, random), ...shuffled(others, random), ...Array.from({ length: WAGONS }, (_, wagon) => wagon)];
}

export function candidatesFor(train, seed, count) {
  const random = randomOf(`${seed}/siding`);
  const answers = [...new Set(gapsOf(train).map((at) => train.wagons[at]))];
  const offered = [...answers];
  for (const wagon of tempting(train, answers, random)) {
    if (offered.length >= Math.max(count, answers.length)) break;
    if (!offered.includes(wagon)) offered.push(wagon);
  }
  return shuffled(offered, random);
}

export function startPuzzle(train) {
  return { train, placed: train.wagons.map((wagon, at) => (train.hidden[at] ? null : wagon)), tries: [], wrongs: 0 };
}

export const openGaps = (puzzle) => puzzle.placed.flatMap((wagon, at) => (wagon === null ? [at] : []));

export const solved = (puzzle) => puzzle.placed.every((wagon) => wagon !== null);

export function tryWagon(puzzle, wagon, gap = openGaps(puzzle)[0]) {
  if (gap === undefined || puzzle.placed[gap] !== null) return { puzzle, right: false, gap: null };
  const right = puzzle.train.wagons[gap] === wagon;
  const placed = right ? puzzle.placed.map((one, at) => (at === gap ? wagon : one)) : puzzle.placed;
  return { puzzle: { ...puzzle, placed, tries: [...puzzle.tries, wagon], wrongs: puzzle.wrongs + (right ? 0 : 1) }, right, gap };
}

export const encodeTries = (tries) => `S${tries.map((wagon) => LETTERS[wagon]).join("")}`;

export function decodeTries(code) {
  if (typeof code !== "string" || !TRIES.test(code)) return null;
  return [...code.slice(1)].map((letter) => LETTERS.indexOf(letter));
}

export function replayTries(train, tries) {
  if (!Array.isArray(tries) || tries.length > TRIES_MOST) return null;
  let puzzle = startPuzzle(train);
  for (const wagon of tries) {
    if (solved(puzzle)) return null;
    puzzle = tryWagon(puzzle, wagon).puzzle;
  }
  return solved(puzzle) ? puzzle : null;
}
