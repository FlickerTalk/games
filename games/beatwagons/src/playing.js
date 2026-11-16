import { clamp, ease } from "../../../kit/src/canvas/pen.js";
import { FLICK_PACE } from "./flick.js";
import { openGaps, solved, tryWagon } from "./puzzle.js";
import { ARRIVE_MS, BACK_MS, END_MS, FLY_MS, LEAVE_MS, TUNE_DELAY_MS, WOBBLE_MS, hintOf, roundKey, savedRound, setTrain } from "./rounds.js";
import { beatsOf } from "./train.js";
import { STEP_MS, playWagon, tuneLength, tuneOf } from "./tune.js";

const KEPT = ["level", "friend"];
const OFF_SCREEN = 90;
export const POP_MS = 700;
export const BURST_MS = 700;

export const canPlace = (round) => Boolean(round) && round.driver === "me" && round.phase === "solve" && !round.flying && !round.back;

export function keepRound(game) {
  const { state } = game;
  const { round } = state;
  if (!round || !KEPT.includes(round.kind) || round.finished) return;
  game.run(() => game.store?.set(roundKey(state), savedRound(round)));
}

function launch(game, index, gap, from = null) {
  const { round } = game.state;
  const wagon = round.candidates[index];
  const open = openGaps(round.puzzle);
  const aimed = open.includes(gap) ? gap : open[0];
  if (wagon === undefined || aimed === undefined) return false;
  round.flying = { wagon, index, gap: aimed, start: game.now(), from };
  game.state.hint = null;
  game.sound.play("pick");
  return true;
}

export function placeWagon(game, index, gap, from = null) {
  const { state } = game;
  if (!canPlace(state.round) || !launch(game, index, gap, from)) return;
  if (!state.taught) {
    state.taught = true;
    game.saveOwn();
  }
}

export function soundWagon(sound, wagon, options = {}) {
  const beats = beatsOf(wagon);
  for (let beat = 0; beat < beats; beat += 1) playWagon(sound, wagon, { ...options, delay: (beat * STEP_MS) / beats / 1000 });
}

function land(game, now) {
  const { state } = game;
  const { round } = state;
  const { wagon, index, gap } = round.flying;
  round.flying = null;
  const tried = tryWagon(round.puzzle, wagon, gap);
  round.puzzle = tried.puzzle;
  if (!tried.right) {
    round.back = { wagon, index, gap, start: now };
    round.wrongs += 1;
    round.struggle += 1;
    game.sound.play("error-soft");
    return;
  }
  soundWagon(game.sound, wagon);
  state.moments.push({ kind: "burst", gap, start: now, duration: BURST_MS });
  if (solved(round.puzzle)) Object.assign(round, { phase: "tune", phaseAt: now + TUNE_DELAY_MS, fired: 0 });
  else state.hint = hintOf(round, state);
}

function playTune(game, now) {
  const { round } = game.state;
  const { wagons } = round.puzzle.train;
  const notes = tuneOf(wagons);
  const elapsed = now - round.phaseAt;
  while (round.fired < notes.length && elapsed >= notes[round.fired].at) {
    playWagon(game.sound, wagons[notes[round.fired].index]);
    round.fired += 1;
  }
  if (elapsed < tuneLength(wagons)) return;
  Object.assign(round, { phase: "leave", phaseAt: now });
  game.sound.play("whoosh", { gain: 0.5 });
}

function nextTrain(game, now) {
  const { state } = game;
  const { round } = state;
  if (round.at + 1 >= round.trains.length) {
    round.finished = true;
    state.endAt = now + END_MS;
    return;
  }
  setTrain(round, round.at + 1, now);
  game.relayout();
  keepRound(game);
}

function scriptStep(game, now) {
  const { round } = game.state;
  const step = round.script.shift();
  const open = openGaps(round.puzzle);
  const wagon = step ? step.wagon : round.puzzle.train.wagons[open[0]];
  const index = round.candidates.indexOf(wagon);
  if (index >= 0) launch(game, index);
  round.scriptAt = now + FLICK_PACE;
}

export function startScript(game, script) {
  game.state.round.script = [...script];
}

export function frameRound(game, now) {
  const { state } = game;
  const { round } = state;
  if (!round || round.finished) return;
  if (round.phase === "arrive" && now >= round.phaseAt + ARRIVE_MS) {
    Object.assign(round, { phase: "solve", scriptAt: now + FLICK_PACE });
    state.hint = hintOf(round, state);
  }
  if (round.flying && now >= round.flying.start + FLY_MS) land(game, now);
  if (round.back && now >= round.back.start + WOBBLE_MS + BACK_MS) {
    round.back = null;
    state.hint = hintOf(round, state);
  }
  if (round.phase === "solve" && round.script && !round.flying && !round.back && now >= round.scriptAt) scriptStep(game, now);
  if (round.phase === "tune") playTune(game, now);
  if (round.phase === "leave" && now >= round.phaseAt + LEAVE_MS) nextTrain(game, now);
}

export function trainShift(round, now, width) {
  const far = width + OFF_SCREEN;
  if (round.phase === "arrive") return -(1 - ease(clamp((now - round.phaseAt) / ARRIVE_MS))) * far;
  if (round.phase === "leave") return clamp((now - round.phaseAt) / LEAVE_MS) ** 2 * far;
  return 0;
}

export function tuneAt(wagons, start, now) {
  if (now < start) return null;
  const steps = (now - start) / STEP_MS;
  return { index: Math.min(wagons.length - 1, Math.floor(steps)), within: steps >= wagons.length ? 1 : steps % 1, progress: clamp(steps / wagons.length) };
}

export function popsAt(wagons, start, now) {
  const elapsed = now - start;
  return tuneOf(wagons)
    .filter((note) => elapsed >= note.at && elapsed < note.at + POP_MS)
    .map((note) => ({ index: note.index, beat: note.beat, progress: (elapsed - note.at) / POP_MS }));
}

export const tuneNow = (round, now) => (round?.phase === "tune" ? tuneAt(round.puzzle.train.wagons, round.phaseAt, now) : null);

export const popsNow = (round, now) => (round?.phase === "tune" ? popsAt(round.puzzle.train.wagons, round.phaseAt, now) : []);
